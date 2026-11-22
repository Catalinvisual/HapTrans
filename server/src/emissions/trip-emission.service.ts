import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { FuelTransaction, TripEmissionRecord } from './emission-trip.entity';
import {
  EmissionCalculationRun, EmissionSetting, TripEmissionAllocation, TripEmissionSegment,
  VehicleEnergyConsumption,
} from './emission-trip.entity';
import { TruckEmissionProfile } from './emission-fleet.entity';
import { EmissionFactor } from './emission-geo.entity';
import { EmissionFactorService } from './emission-factor.service';
import {
  CountrySegmentMethod, EMISSION_ENGINE_VERSION, EmissionCalculationMethod, EmissionDataQuality,
  EmissionTripLifecycle, SEGMENT_RECONCILIATION_TOLERANCE_PERCENT, unitForFuel,
} from './emissions.constants';
import {
  allocateProRata, computeFuelEmissions, computeIntensity, computeSegments, hashInputs,
  haversineKm, reconcileSegments, round, tonneKilometres,
} from './emission-calculator';
import { resolveCountryCode } from './country-database';
import { normalizeTruckFuelType } from '../trucks/fuel-type';

export interface CalculateTripOptions {
  trigger?: string;
  user?: { id?: string; companyId?: string | null; role?: string } | null;
  force?: boolean;
  reason?: string | null;
  verify?: boolean;
  finalize?: boolean;
}

interface BuiltSegment {
  countryCode: string;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  method: string;
}

const UNKNOWN_COUNTRY = 'XX';

/**
 * Maintains the trip-level CO2 record.
 *
 * Fuel hierarchy (highest quality first):
 *   1. ECU/telematics or matched fuel-card transactions for the trip
 *   2. Reconciled tank-balance energy records
 *   3. Vehicle-specific declared consumption x distance
 *   4. Documented secondary default consumption
 *   5. Published per-km factor (no fuel quantity)
 * Nothing is substituted when a level is unavailable — the record says so.
 */
@Injectable()
export class TripEmissionService {
  private readonly logger = new Logger(TripEmissionService.name);

  constructor(
    @InjectRepository(Trip) private readonly trips: Repository<Trip>,
    @InjectRepository(TripEmissionRecord) private readonly records: Repository<TripEmissionRecord>,
    @InjectRepository(TripEmissionSegment) private readonly segments: Repository<TripEmissionSegment>,
    @InjectRepository(TripEmissionAllocation) private readonly allocations: Repository<TripEmissionAllocation>,
    @InjectRepository(EmissionCalculationRun) private readonly runs: Repository<EmissionCalculationRun>,
    @InjectRepository(EmissionSetting) private readonly settings: Repository<EmissionSetting>,
    @InjectRepository(TruckEmissionProfile) private readonly profiles: Repository<TruckEmissionProfile>,
    @InjectRepository(FuelTransaction) private readonly fuel: Repository<FuelTransaction>,
    @InjectRepository(VehicleEnergyConsumption) private readonly energy: Repository<VehicleEnergyConsumption>,
    private readonly factorService: EmissionFactorService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Loading ────────────────────────────────────────────────────────────────

  private async loadTrip(tripId: string): Promise<Trip> {
    const trip = await this.trips.findOne({
      where: { id: tripId },
      relations: [
        'stops', 'orders', 'orders.client', 'orders.cargoItems',
        'truck', 'trailer', 'driver', 'driver.user', 'company',
      ],
    });
    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private async loadSettings(companyId: string | null): Promise<EmissionSetting | null> {
    if (!companyId) return null;
    return this.settings.findOne({ where: { companyId } });
  }

  private async loadProfile(truckId: string | null): Promise<TruckEmissionProfile | null> {
    if (!truckId) return null;
    return this.profiles.findOne({ where: { truckId }, relations: ['documents'] });
  }

  // ── Segmentation ───────────────────────────────────────────────────────────

  /**
   * Builds country segments from the recorded stop sequence. Distances come
   * from per-stop routed distances when present, otherwise leg lengths are
   * proportional to the geodesic distance between recorded coordinates. The
   * total is scaled to the trip distance so the segments reconcile exactly;
   * the method is recorded on every segment so nobody mistakes it for a
   * geometry-resolved country split.
   */
  private buildSegments(trip: Trip, totalDistanceKm: number | null): { segments: BuiltSegment[]; method: string; flags: string[] } {
    const flags: string[] = [];
    const stops = [...(trip.stops || [])].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const orders = trip.orders || [];

    if (stops.length < 2) {
      const country =
        resolveCountryCode(stops[0]?.country) ||
        resolveCountryCode((trip.truck as any)?.registrationCountry) ||
        UNKNOWN_COUNTRY;
      flags.push('country_from_single_stop');
      return {
        segments: [{
          countryCode: country,
          distanceKm: totalDistanceKm ?? 0,
          loadedKm: totalDistanceKm ?? 0,
          emptyKm: 0,
          method: CountrySegmentMethod.STOP_SEQUENCE,
        }],
        method: CountrySegmentMethod.STOP_SEQUENCE,
        flags,
      };
    }

    const firstPickup = stops.findIndex((s) => String(s.type || '').toLowerCase() === 'pickup');
    const lastDelivery = stops.map((s) => String(s.type || '').toLowerCase()).lastIndexOf('delivery');
    const typedStops = firstPickup >= 0 && lastDelivery > firstPickup;

    const orderDistance = orders.reduce((sum, o) => sum + (Number(o.distanceKm) || 0), 0);
    const loadedRatio = totalDistanceKm && orderDistance > 0
      ? Math.min(1, orderDistance / totalDistanceKm)
      : null;

    const legs: Array<{ countryCode: string; weight: number; method: string; loaded: boolean }> = [];
    for (let i = 1; i < stops.length; i++) {
      const from = stops[i - 1];
      const to = stops[i];
      const country = resolveCountryCode(to.country) || resolveCountryCode(from.country);
      if (!country) flags.push('country_missing');
      const recorded = Number(to.distanceToStopKm);
      const geodesic = haversineKm(
        from.latitude != null && from.longitude != null ? { lat: Number(from.latitude), lng: Number(from.longitude) } : null,
        to.latitude != null && to.longitude != null ? { lat: Number(to.latitude), lng: Number(to.longitude) } : null,
      );
      const weight = recorded > 0 ? recorded : geodesic && geodesic > 0 ? geodesic : 1;
      const method = recorded > 0
        ? CountrySegmentMethod.STOP_SEQUENCE
        : geodesic && geodesic > 0
          ? CountrySegmentMethod.GEODESIC_PROPORTIONAL
          : CountrySegmentMethod.STOP_SEQUENCE;
      const loaded = typedStops
        ? i > firstPickup && i <= lastDelivery
        : loadedRatio !== null
          ? loadedRatio >= 0.5
          : true;
      legs.push({ countryCode: country || UNKNOWN_COUNTRY, weight, method, loaded });
    }

    if (flags.length) flags.push('segment_method_estimated');
    const totalWeight = legs.reduce((a, l) => a + l.weight, 0);
    const distances = totalDistanceKm && totalDistanceKm > 0 && totalWeight > 0
      ? allocateProRata(totalDistanceKm, legs.map((l) => l.weight))
      : legs.map(() => 0);

    // Merge consecutive legs in the same country so the segment list is a real
    // country breakdown, not a stop-pair list.
    const merged: BuiltSegment[] = [];
    legs.forEach((leg, i) => {
      const distance = distances[i] || 0;
      const loadedKm = leg.loaded ? distance : 0;
      const emptyKm = leg.loaded ? 0 : distance;
      const last = merged[merged.length - 1];
      if (last && last.countryCode === leg.countryCode && last.method === leg.method) {
        last.distanceKm = round(last.distanceKm + distance);
        last.loadedKm = round(last.loadedKm + loadedKm);
        last.emptyKm = round(last.emptyKm + emptyKm);
      } else {
        merged.push({
          countryCode: leg.countryCode,
          distanceKm: round(distance),
          loadedKm: round(loadedKm),
          emptyKm: round(emptyKm),
          method: leg.method,
        });
      }
    });

    return {
      segments: merged,
      method: legs.some((l) => l.method === CountrySegmentMethod.GEODESIC_PROPORTIONAL)
        ? CountrySegmentMethod.GEODESIC_PROPORTIONAL
        : CountrySegmentMethod.STOP_SEQUENCE,
      flags,
    };
  }

  // ── Energy ─────────────────────────────────────────────────────────────────

  private async resolveEnergy(trip: Trip, distanceKm: number | null, profile: TruckEmissionProfile | null, setting: EmissionSetting | null) {
    const flags: string[] = [];
    const fuelType =
      normalizeTruckFuelType(trip.truck?.fuelType) ||
      normalizeTruckFuelType(profile?.fuelType) ||
      null;
    const unit = unitForFuel(fuelType);

    const transactionTotals = await this.fuel.createQueryBuilder('f')
      .select('f.fuelType', 'fuelType')
      .addSelect('COALESCE(SUM(f.quantity), 0)', 'quantity')
      .addSelect('COUNT(*)', 'count')
      .where('f."tripId" = :tripId', { tripId: trip.id })
      .andWhere("f.status NOT IN ('rejected','duplicate')")
      .groupBy('f.fuelType')
      .getRawMany();

    if (transactionTotals.length > 0) {
      const quantity = transactionTotals.reduce((a: number, r: any) => a + Number(r.quantity || 0), 0);
      if (quantity > 0) {
        const dominant = transactionTotals.slice().sort((a: any, b: any) => Number(b.quantity) - Number(a.quantity))[0];
        if (transactionTotals.length > 1) flags.push('multiple_fuel_types_summed');
        return {
          quantity: round(quantity),
          unit: unit || 'L',
          fuelType: normalizeTruckFuelType(dominant?.fuelType) || fuelType,
          source: 'fuel_transactions',
          method: EmissionCalculationMethod.ACTUAL_FUEL,
          quality: EmissionDataQuality.ACTUAL,
          flags,
        };
      }
    }

    const energyRows = await this.energy.createQueryBuilder('e')
      .where('e."tripId" = :tripId', { tripId: trip.id })
      .getMany();
    if (energyRows.length) {
      const quantity = round(energyRows.reduce((a, r) => a + Number(r.energyQuantity || 0), 0));
      if (quantity > 0) {
        const reconciled = energyRows.every((r) => r.verificationStatus === 'verified' || r.sourceType === 'telematics' || r.sourceType === 'ecu');
        return {
          quantity,
          unit: energyRows[0].unit || unit || 'L',
          fuelType: normalizeTruckFuelType(energyRows[0].fuelType) || fuelType,
          source: energyRows[0].sourceType,
          method: EmissionCalculationMethod.ACTUAL_FUEL,
          quality: reconciled ? EmissionDataQuality.ACTUAL : EmissionDataQuality.RECONCILED,
          flags,
        };
      }
    }

    const declared = Number(profile?.declaredConsumptionPer100Km) || Number(trip.truck?.fuelConsumption) || null;
    if (declared && declared > 0 && distanceKm && distanceKm > 0 && unit) {
      flags.push('consumption_from_vehicle_profile');
      return {
        quantity: round((distanceKm * declared) / 100),
        unit,
        fuelType,
        source: 'vehicle_profile',
        method: EmissionCalculationMethod.VEHICLE_SPECIFIC_CONSUMPTION,
        quality: EmissionDataQuality.ESTIMATED,
        flags,
      };
    }

    const fallback = Number(setting?.defaultConsumptionPer100Km) || null;
    if (fallback && fallback > 0 && distanceKm && distanceKm > 0 && unit) {
      flags.push('consumption_from_company_default');
      return {
        quantity: round((distanceKm * fallback) / 100),
        unit,
        fuelType,
        source: 'company_default',
        method: EmissionCalculationMethod.SECONDARY_ESTIMATION_FACTOR,
        quality: EmissionDataQuality.ESTIMATED,
        flags,
      };
    }

    return {
      quantity: null,
      unit: unit || null,
      fuelType,
      source: 'unavailable',
      method: null,
      quality: EmissionDataQuality.MISSING,
      flags,
    };
  }

  // ── Main entry ─────────────────────────────────────────────────────────────

  async calculateForTrip(tripId: string, options: CalculateTripOptions = {}) {
    const trip = await this.loadTrip(tripId);
    const trigger = options.trigger || 'manual';
    const companyId = (trip.company as any)?.id || options.user?.companyId || null;

    const existing = await this.records.findOne({
      where: { tripId },
      relations: ['segments', 'allocations'],
    });

    if (existing?.isFinalized && !options.force) {
      await this.runs.save(this.runs.create({
        recordId: existing.id,
        tripId,
        companyId,
        trigger,
        engineVersion: EMISSION_ENGINE_VERSION,
        status: 'skipped_finalized',
        userId: options.user?.id ?? null,
        reason: options.reason || 'Finalized emission result is locked against silent recalculation.',
      }));
      return existing;
    }

    const tripDistance = Number(trip.distanceKm) || Number((trip.orders || []).reduce((a, o) => a + (Number(o.distanceKm) || 0), 0)) || null;
    const { segments: builtSegments, flags: segmentFlags } = this.buildSegments(trip, tripDistance);
    const profile = await this.loadProfile(trip.truck?.id ?? null);
    const setting = await this.loadSettings(companyId);
    const energy = await this.resolveEnergy(trip, tripDistance, profile, setting);

    const executionDate = this.executionDate(trip);
    const primaryCountry =
      builtSegments.slice().sort((a, b) => b.distanceKm - a.distanceKm)[0]?.countryCode || null;

    // Factor resolution is per country segment, falling back to GLOBAL.
    const factorCache = new Map<string, EmissionFactor | null>();
    const resolveFactor = async (country: string | null, activityType: 'fuel' | 'distance', fuelType: string) => {
      const key = `${country || 'GLOBAL'}|${activityType}|${fuelType}`;
      if (!factorCache.has(key)) {
        factorCache.set(key, await this.factorService.resolve({
          fuelType,
          countryCode: country === UNKNOWN_COUNTRY ? null : country,
          date: executionDate,
          activityType,
          dataset: setting?.defaultDataset === 'DEFRA_2026' ? null : setting?.defaultDataset,
        }));
      }
      return factorCache.get(key) ?? null;
    };

    const distanceFactorFuel = this.distanceFactorFuel(trip);
    const distanceFactor = energy.quantity === null && energy.fuelType
      ? await resolveFactor(primaryCountry, 'distance', distanceFactorFuel)
      : null;

    const flags = [...segmentFlags, ...energy.flags];
    let methodology: string = energy.method || '';
    let dataQuality: string = energy.quality;
    let lifecycle: string = EmissionTripLifecycle.PENDING_DATA;

    const segmentRows: Array<{
      countryCode: string; distanceKm: number; loadedKm: number; emptyKm: number;
      energyQuantity: number | null; ttw: number | null; wtt: number | null; wtw: number | null;
      method: string; factorSnapshot: ReturnType<EmissionFactorService['snapshot']>;
    }> = [];

    let totalTtw = 0;
    let totalWtt = 0;
    let totalWtw = 0;
    let anyWtt = false;
    let allTtw = true;

    if (energy.quantity !== null && builtSegments.length) {
      const quantities = allocateProRata(energy.quantity, builtSegments.map((s) => s.distanceKm));
      for (let i = 0; i < builtSegments.length; i++) {
        const segment = builtSegments[i];
        const factor = await resolveFactor(segment.countryCode, 'fuel', energy.fuelType || 'DIESEL');
        const computed = computeFuelEmissions(quantities[i], factor
          ? {
            ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit,
            wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit,
            co2KgPerUnit: factor.co2KgPerUnit,
          }
          : null);
        if (computed.ttwKgCo2e === null) allTtw = false;
        else totalTtw += computed.ttwKgCo2e;
        if (computed.wttKgCo2e !== null) { totalWtt += computed.wttKgCo2e; anyWtt = true; }
        if (computed.wtwKgCo2e !== null) totalWtw += computed.wtwKgCo2e;
        if (!factor) flags.push('emission_factor_missing');
        if (computed.missing.includes('wtt_factor_missing')) flags.push('wtt_factor_missing');
        segmentRows.push({
          countryCode: segment.countryCode,
          distanceKm: segment.distanceKm,
          loadedKm: segment.loadedKm,
          emptyKm: segment.emptyKm,
          energyQuantity: round(quantities[i]),
          ttw: computed.ttwKgCo2e,
          wtt: computed.wttKgCo2e,
          wtw: computed.wtwKgCo2e,
          method: segment.method,
          factorSnapshot: this.factorService.snapshot(factor),
        });
      }
    } else if (distanceFactor && builtSegments.length && tripDistance) {
      methodology = EmissionCalculationMethod.DISTANCE_EMISSION_FACTOR;
      dataQuality = EmissionDataQuality.ESTIMATED;
      flags.push('no_fuel_quantity_distance_factor_used');
      const perKm = distanceFactor.ttwKgCo2ePerUnit;
      for (const segment of builtSegments) {
        const computed = computeFuelEmissions(segment.distanceKm, { ttwKgCo2ePerUnit: perKm, wttKgCo2ePerUnit: null });
        totalTtw += computed.ttwKgCo2e || 0;
        if (computed.ttwKgCo2e === null) allTtw = false;
        segmentRows.push({
          countryCode: segment.countryCode,
          distanceKm: segment.distanceKm,
          loadedKm: segment.loadedKm,
          emptyKm: segment.emptyKm,
          energyQuantity: null,
          ttw: computed.ttwKgCo2e,
          wtt: null,
          wtw: null,
          method: segment.method,
          factorSnapshot: this.factorService.snapshot(distanceFactor),
        });
      }
    } else {
      for (const segment of builtSegments) {
        segmentRows.push({
          countryCode: segment.countryCode,
          distanceKm: segment.distanceKm,
          loadedKm: segment.loadedKm,
          emptyKm: segment.emptyKm,
          energyQuantity: null,
          ttw: null,
          wtt: null,
          wtw: null,
          method: segment.method,
          factorSnapshot: null,
        });
      }
      flags.push(
        energy.quantity === null && !distanceFactor
          ? 'no_activity_data'
          : 'emission_factor_missing',
      );
      allTtw = false;
    }

    const distanceKm = round(tripDistance || builtSegments.reduce((a, s) => a + s.distanceKm, 0));
    const loadedKm = round(segmentRows.reduce((a, s) => a + s.loadedKm, 0));
    const emptyKm = round(segmentRows.reduce((a, s) => a + s.emptyKm, 0));
    const reconciliation = reconcileSegments(segmentRows, distanceKm, SEGMENT_RECONCILIATION_TOLERANCE_PERCENT);

    const payloadKg = this.payloadKg(trip);
    const payloadTonnes = payloadKg && payloadKg > 0 ? round(payloadKg / 1000, 3) : null;
    const tkm = tonneKilometres(payloadTonnes, loadedKm);
    const ttwKg = allTtw && segmentRows.length ? round(totalTtw) : null;
    const wttKg = anyWtt ? round(totalWtt) : null;
    const wtwKg = ttwKg !== null && wttKg !== null ? round(ttwKg + wttKg) : null;
    const intensity = computeIntensity(wtwKg ?? ttwKg, distanceKm, payloadTonnes);

    if (ttwKg !== null) {
      if (!reconciliation.reconciled) lifecycle = EmissionTripLifecycle.RECONCILIATION_REQUIRED;
      else if (dataQuality === EmissionDataQuality.ACTUAL) lifecycle = EmissionTripLifecycle.PRELIMINARY;
      else lifecycle = EmissionTripLifecycle.ESTIMATED;
    }
    if (options.verify && ttwKg !== null) lifecycle = EmissionTripLifecycle.VERIFIED;
    if (options.finalize && ttwKg !== null) lifecycle = EmissionTripLifecycle.FINALIZED;

    const allocations = this.buildAllocations(trip, ttwKg, wttKg, wtwKg, builtSegments, dataQuality);

    const inputSnapshot = {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      fleetType: trip.fleetType || 'own_fleet',
      distanceKm,
      loadedKm,
      emptyKm,
      executionDate,
      energy: {
        quantity: energy.quantity,
        unit: energy.unit,
        fuelType: energy.fuelType,
        source: energy.source,
        method: methodology || energy.method,
        quality: dataQuality,
      },
      segments: segmentRows.map((s) => ({
        countryCode: s.countryCode,
        distanceKm: s.distanceKm,
        loadedKm: s.loadedKm,
        emptyKm: s.emptyKm,
        energyQuantity: s.energyQuantity,
      })),
      truck: trip.truck ? {
        id: trip.truck.id,
        plateNumber: trip.truck.plateNumber,
        fuelType: trip.truck.fuelType,
        euronorm: trip.truck.euronorm,
        fuelConsumption: trip.truck.fuelConsumption,
        axleCount: trip.truck.axleCount,
      } : null,
      profile: profile ? {
        id: profile.id,
        fuelType: profile.fuelType,
        euroClass: profile.euroClass,
        co2Class: profile.co2Class,
        declaredConsumptionPer100Km: profile.declaredConsumptionPer100Km,
        verificationStatus: profile.verificationStatus,
      } : null,
      orders: (trip.orders || []).map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        clientId: o.client?.id ?? null,
        clientName: o.client?.name ?? null,
        distanceKm: o.distanceKm != null ? Number(o.distanceKm) : null,
        weightKg: this.orderWeightKg(o),
      })),
    };

    const factorSnapshot = {
      bySegment: segmentRows.map((s, i) => ({ countryCode: s.countryCode, factor: s.factorSnapshot, index: i })),
      engineVersion: EMISSION_ENGINE_VERSION,
    };

    const resultSnapshot = {
      ttwKgCo2e: ttwKg,
      wttKgCo2e: wttKg,
      wtwKgCo2e: wtwKg,
      distanceKm,
      loadedKm,
      energyQuantity: energy.quantity,
      gPerKm: intensity.gPerKm,
      gPerTonneKm: intensity.gPerTonneKm,
      lifecycle,
      dataQuality,
      methodology,
    };

    const inputHash = hashInputs({ inputSnapshot, factorSnapshot });

    if (existing && existing.inputHash === inputHash && !options.force && !options.verify && !options.finalize) {
      await this.runs.save(this.runs.create({
        recordId: existing.id,
        tripId,
        companyId,
        trigger,
        engineVersion: EMISSION_ENGINE_VERSION,
        inputHash,
        status: 'skipped_idempotent',
        userId: options.user?.id ?? null,
        reason: options.reason || null,
      }));
      return existing;
    }

    const previousResult = existing ? {
      ttwKgCo2e: existing.ttwKgCo2e,
      wttKgCo2e: existing.wttKgCo2e,
      wtwKgCo2e: existing.wtwKgCo2e,
      lifecycle: existing.lifecycle,
      calculationCount: existing.calculationCount,
    } : null;

    const saved = await this.dataSource.transaction(async (manager) => {
      const recordRepo = manager.getRepository(TripEmissionRecord);
      const segmentRepo = manager.getRepository(TripEmissionSegment);
      const allocationRepo = manager.getRepository(TripEmissionAllocation);

      let record = existing
        ? await recordRepo.findOne({ where: { id: existing.id } })
        : recordRepo.create({ tripId });
      if (!record) record = recordRepo.create({ tripId });

      Object.assign(record, {
        companyId,
        truckId: trip.truck?.id ?? null,
        driverId: trip.driver?.id ?? null,
        trailerId: trip.trailer?.id ?? null,
        fleetType: trip.fleetType || 'own_fleet',
        lifecycle,
        methodology: methodology || EmissionCalculationMethod.SECONDARY_ESTIMATION_FACTOR,
        dataQuality,
        energySource: energy.source,
        fuelType: energy.fuelType,
        energyUnit: energy.unit,
        executionDate,
        distanceKm,
        loadedKm,
        emptyKm,
        energyQuantity: energy.quantity,
        ttwKgCo2e: ttwKg,
        wttKgCo2e: wttKg,
        wtwKgCo2e: wtwKg,
        co2Kg: null,
        gPerKm: intensity.gPerKm,
        gPerTonneKm: intensity.gPerTonneKm,
        payloadTonnes,
        tonneKm: tkm,
        segmentDistanceKm: reconciliation.segmentDistanceKm,
        reconciliation: reconciliation as unknown as Record<string, unknown>,
        energyBreakdown: {
          quantity: energy.quantity,
          unit: energy.unit,
          source: energy.source,
          method: methodology || energy.method,
          reefer: null,
          wttAvailable: wttKg !== null,
        },
        qualityFlags: Array.from(new Set(flags)),
        engineVersion: EMISSION_ENGINE_VERSION,
        inputHash,
        calculationCount: (record.calculationCount || 0) + 1,
        calculatedAt: new Date(),
        isFinalized: options.finalize === true,
        finalizedAt: options.finalize ? new Date() : record.finalizedAt,
        finalizedByUserId: options.finalize ? options.user?.id ?? null : record.finalizedByUserId,
        verifiedAt: options.verify || options.finalize ? new Date() : record.verifiedAt,
      });
      record = await recordRepo.save(record);

      await segmentRepo.delete({ recordId: record.id });
      await allocationRepo.delete({ recordId: record.id });

      if (segmentRows.length) {
        await segmentRepo.save(segmentRows.map((s, i) => segmentRepo.create({
          recordId: record!.id,
          sequence: i + 1,
          countryCode: s.countryCode,
          method: s.method,
          distanceKm: s.distanceKm,
          loadedKm: s.loadedKm,
          emptyKm: s.emptyKm,
          energyQuantity: s.energyQuantity,
          ttwKgCo2e: s.ttw,
          wttKgCo2e: s.wtt,
          wtwKgCo2e: s.wtw,
          dataQuality,
          notes: s.factorSnapshot ? `factor:${s.factorSnapshot.code}` : 'factor_missing',
        })));
      }
      if (allocations.length) {
        await allocationRepo.save(allocations.map((a) => allocationRepo.create({ ...a, recordId: record!.id })));
      }

      await manager.getRepository(EmissionCalculationRun).save(manager.getRepository(EmissionCalculationRun).create({
        recordId: record.id,
        tripId,
        companyId,
        trigger,
        engineVersion: EMISSION_ENGINE_VERSION,
        inputHash,
        inputSnapshot,
        factorSnapshot,
        resultSnapshot,
        previousResultSnapshot: previousResult,
        userId: options.user?.id ?? null,
        reason: options.reason || null,
        status: 'applied',
        countryRulesVersion: 'country-registry-1.0',
      }));

      return record;
    });

    return this.findById(saved.id);
  }

  private executionDate(trip: Trip): string | null {
    const source = trip.actualDeparture || trip.plannedDeparture || trip.createdAt;
    if (!source) return null;
    const d = new Date(source as any);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  private distanceFactorFuel(trip: Trip): string {
    const trailer = trip.trailer as any;
    const reefer = trailer && (trailer.reefer === true || trailer.isRefrigerated === true || String(trailer.type || '').toLowerCase().includes('frigo'));
    return reefer ? 'DIESEL_REEFER' : 'DIESEL';
  }

  private orderWeightKg(order: Order): number | null {
    const cargo = (order.cargoItems || []).reduce((a, c) => a + (Number(c.weightKg) || 0), 0);
    if (cargo > 0) return round(cargo, 3);
    const stopWeights = (order as any).stops?.reduce?.((a: number, s: any) => a + (Number(s.weightKg) || 0), 0);
    if (stopWeights > 0) return round(stopWeights, 3);
    return null;
  }

  private payloadKg(trip: Trip): number | null {
    const weights = (trip.orders || []).map((o) => this.orderWeightKg(o)).filter((w): w is number => w !== null);
    if (!weights.length) return null;
    return round(weights.reduce((a, b) => a + b, 0), 3);
  }

  /**
   * Allocates emissions to customers/orders by tonne-kilometres, falling back to
   * distance and only then to an equal split. The total is allocated once, so a
   * multi-customer trip can never double count.
   */
  private buildAllocations(
    trip: Trip,
    ttwKg: number | null,
    wttKg: number | null,
    wtwKg: number | null,
    segments: BuiltSegment[],
    dataQuality: string,
  ) {
    const orders = trip.orders || [];
    if (!orders.length) return [];
    const totalDistance = segments.reduce((a, s) => a + s.distanceKm, 0);

    const enriched = orders.map((o) => {
      const weightKg = this.orderWeightKg(o);
      const distance = Number(o.distanceKm) || null;
      return { order: o, weightKg, distance };
    });

    const hasWeights = enriched.every((e) => e.weightKg && e.weightKg > 0);
    const hasDistances = enriched.every((e) => e.distance && e.distance > 0);
    let basis = 'tonne_km';
    if (!hasWeights && hasDistances) basis = 'distance';
    if (!hasWeights && !hasDistances) basis = 'equal';

    const weights = enriched.map((e) => {
      if (basis === 'tonne_km') return (e.weightKg || 0) * (e.distance || totalDistance || 1);
      if (basis === 'distance') return e.distance || 0;
      return 1;
    });

    const ttwShares = ttwKg !== null ? allocateProRata(ttwKg, weights) : enriched.map(() => null);
    const wttShares = wttKg !== null ? allocateProRata(wttKg, weights) : enriched.map(() => null);
    const wtwShares = wtwKg !== null ? allocateProRata(wtwKg, weights) : enriched.map(() => null);
    const percents = allocateProRata(100, weights);
    const distanceShares = allocateProRata(totalDistance, weights);

    return enriched.map((e, i) => ({
      orderId: e.order.id,
      clientId: e.order.client?.id ?? null,
      clientName: e.order.client?.name ?? null,
      basis,
      sharePercent: round(percents[i], 4),
      distanceKm: round(distanceShares[i]),
      payloadTonnes: e.weightKg ? round(e.weightKg / 1000, 3) : null,
      tonneKm: e.weightKg && distanceShares[i] ? round((e.weightKg / 1000) * distanceShares[i], 3) : null,
      ttwKgCo2e: ttwShares[i] ?? null,
      wttKgCo2e: wttShares[i] ?? null,
      wtwKgCo2e: wtwShares[i] ?? null,
      dataQuality,
      notes: basis === 'equal' ? 'No cargo weight or order distance recorded; equal split applied.' : null,
    }));
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  async findById(id: string) {
    const record = await this.records.findOne({
      where: { id },
      relations: ['segments', 'allocations', 'trip', 'trip.truck', 'trip.driver', 'trip.driver.user'],
    });
    if (!record) throw new NotFoundException('Emission record not found');
    return record;
  }

  async findByTrip(tripId: string) {
    const record = await this.records.findOne({
      where: { tripId },
      relations: ['segments', 'allocations'],
    });
    if (!record) return null;
    return record;
  }

  async history(recordId: string) {
    return this.runs.find({ where: { recordId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async finalize(recordId: string, user: any, reason?: string) {
    const record = await this.findById(recordId);
    if (record.isFinalized) return record;
    if (record.ttwKgCo2e === null) {
      throw new BadRequestException('A record without emission figures cannot be finalized');
    }
    await this.records.update(recordId, {
      isFinalized: true,
      lifecycle: EmissionTripLifecycle.FINALIZED,
      finalizedAt: new Date(),
      finalizedByUserId: user?.id ?? null,
    });
    await this.runs.save(this.runs.create({
      recordId,
      tripId: record.tripId,
      companyId: record.companyId,
      trigger: 'finalize',
      engineVersion: EMISSION_ENGINE_VERSION,
      inputHash: record.inputHash,
      resultSnapshot: { ttwKgCo2e: record.ttwKgCo2e, wtwKgCo2e: record.wtwKgCo2e, lifecycle: 'finalized' },
      userId: user?.id ?? null,
      reason: reason || 'Emission record finalized',
      status: 'applied',
    }));
    return this.findById(recordId);
  }

  /** Recalculates trips whose data changed since the stored record. */
  async recalculateStale(limit = 100): Promise<{ processed: number; updated: number }> {
    const cutoff = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const trips = await this.trips.createQueryBuilder('t')
      .leftJoin(TripEmissionRecord, 'r', 'r."tripId" = t.id')
      .where('t."updatedAt" >= :cutoff', { cutoff })
      .andWhere('(r.id IS NULL OR (r."isFinalized" = false AND r."calculatedAt" < t."updatedAt"))')
      .orderBy('t."updatedAt"', 'DESC')
      .limit(limit)
      .getMany();
    let updated = 0;
    for (const trip of trips) {
      try {
        const before = await this.records.findOne({ where: { tripId: trip.id } });
        const after = await this.calculateForTrip(trip.id, { trigger: 'scheduler', force: true });
        if (!before || before.inputHash !== after.inputHash) updated++;
      } catch (err) {
        this.logger.warn(`Trip ${trip.id} emission recalculation failed: ${(err as Error).message}`);
      }
    }
    return { processed: trips.length, updated };
  }
}
