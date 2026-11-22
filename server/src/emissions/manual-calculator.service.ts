import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Truck } from '../trucks/truck.entity';
import { TruckEmissionProfile } from './emission-fleet.entity';
import { EmissionFactorService } from './emission-factor.service';
import { EmissionCalculationMethod, EMISSION_ENGINE_VERSION, unitForFuel } from './emissions.constants';
import {
  allocateProRata, computeFuelEmissions, computeIntensity, computeSegments, reconcileSegments,
  round, tonneKilometres,
} from './emission-calculator';
import { resolveCountryCode } from './country-database';
import { normalizeTruckFuelType } from '../trucks/fuel-type';
import { EmissionSimulation } from './emission-report.entity';

export interface ManualSegmentInput {
  countryCode: string;
  distanceKm: number;
}

export interface ManualScenarioInput {
  name?: string;
  truckId?: string | null;
  /** External vehicle when no fleet truck is selected. */
  externalVehicle?: {
    label?: string;
    fuelType: string;
    consumptionPer100Km?: number | null;
    euroClass?: string | null;
  } | null;
  fuelType?: string | null;
  distanceKm?: number | null;
  segments?: ManualSegmentInput[];
  /** Actual measured fuel/energy quantity for the distance, when known. */
  fuelQuantity?: number | null;
  consumptionPer100Km?: number | null;
  cargoWeightKg?: number | null;
  customers?: number | null;
  methodology?: string | null;
  reefer?: { energyQuantity?: number | null; unit?: string | null; fuelType?: string | null } | null;
  countryCode?: string | null;
  /** Explicit factors used by an advanced user; recorded in the result. */
  factorOverrides?: Array<{ countryCode: string; ttwKgCo2ePerUnit: number | null; wttKgCo2ePerUnit: number | null; unit: string; note?: string }> | null;
}

@Injectable()
export class ManualCalculatorService {
  constructor(
    @InjectRepository(Truck) private readonly trucks: Repository<Truck>,
    @InjectRepository(TruckEmissionProfile) private readonly profiles: Repository<TruckEmissionProfile>,
    @InjectRepository(EmissionSimulation) private readonly simulations: Repository<EmissionSimulation>,
    private readonly factors: EmissionFactorService,
  ) {}

  async calculate(input: ManualScenarioInput) {
    const segments = this.normaliseSegments(input);
    if (!input.truckId && !input.externalVehicle?.fuelType && !input.fuelType) {
      throw new BadRequestException('Select a truck or provide an external vehicle fuel type');
    }

    let truck: Truck | null = null;
    let profile: TruckEmissionProfile | null = null;
    if (input.truckId) {
      truck = await this.trucks.findOne({ where: { id: input.truckId } });
      if (!truck) throw new NotFoundException('Truck not found');
      profile = await this.profiles.findOne({ where: { truckId: input.truckId } });
    }

    const fuelType =
      normalizeTruckFuelType(input.fuelType) ||
      normalizeTruckFuelType(input.externalVehicle?.fuelType) ||
      normalizeTruckFuelType(profile?.fuelType) ||
      normalizeTruckFuelType(truck?.fuelType) ||
      null;
    if (!fuelType) throw new BadRequestException('Fuel or energy type is required');
    const unit = unitForFuel(fuelType);
    if (!unit) throw new BadRequestException('This fuel type has no configured activity unit');

    const totalDistance = round(segments.reduce((a, s) => a + s.distanceKm, 0));
    const consumption =
      input.consumptionPer100Km ??
      input.externalVehicle?.consumptionPer100Km ??
      (profile?.declaredConsumptionPer100Km ?? null) ??
      (truck?.fuelConsumption != null ? Number(truck.fuelConsumption) : null);

    let quantity = input.fuelQuantity != null ? Number(input.fuelQuantity) : null;
    let methodology = input.methodology || '';
    if (quantity === null || !Number.isFinite(quantity) || quantity <= 0) {
      quantity = null;
      if (consumption && consumption > 0) {
        quantity = round((totalDistance * consumption) / 100);
        methodology = methodology || EmissionCalculationMethod.VEHICLE_SPECIFIC_CONSUMPTION;
      }
    }
    if (!methodology) methodology = quantity !== null ? EmissionCalculationMethod.ACTUAL_FUEL : EmissionCalculationMethod.MANUAL_CALCULATION;

    const countryFactorCache = new Map<string, any>();
    const overrides = new Map((input.factorOverrides || []).map((o) => [String(o.countryCode).toUpperCase(), o]));
    for (const segment of segments) {
      if (!countryFactorCache.has(segment.countryCode)) {
        const override = overrides.get(segment.countryCode);
        if (override) {
          countryFactorCache.set(segment.countryCode, {
            code: `override_${segment.countryCode}`,
            ttwKgCo2ePerUnit: override.ttwKgCo2ePerUnit,
            wttKgCo2ePerUnit: override.wttKgCo2ePerUnit,
            datasetVersion: 'manual_override',
            source: override.note || 'Manual factor override',
            energyUnit: override.unit,
          });
        } else {
          const factor = await this.factors.resolve({
            fuelType,
            countryCode: segment.countryCode,
            date: new Date().toISOString().slice(0, 10),
          });
          countryFactorCache.set(segment.countryCode, factor
            ? {
              code: factor.code,
              ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit,
              wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit,
              datasetVersion: factor.datasetVersion,
              source: factor.source,
              energyUnit: factor.energyUnit,
            }
            : null);
        }
      }
    }

    const segmentResults: Array<{
      countryCode: string; distanceKm: number; energyQuantity: number | null;
      ttwKgCo2e: number | null; wttKgCo2e: number | null; wtwKgCo2e: number | null;
      factor: any;
    }> = [];

    const quantities = quantity !== null ? allocateProRata(quantity, segments.map((s) => s.distanceKm)) : segments.map(() => null);
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const factor = countryFactorCache.get(segment.countryCode);
      const computed = computeFuelEmissions(quantities[i], factor
        ? { ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit, wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit }
        : null);
      segmentResults.push({
        countryCode: segment.countryCode,
        distanceKm: segment.distanceKm,
        energyQuantity: quantities[i] ?? null,
        ttwKgCo2e: computed.ttwKgCo2e,
        wttKgCo2e: computed.wttKgCo2e,
        wtwKgCo2e: computed.wtwKgCo2e,
        factor,
      });
    }

    const ttw = segmentResults.every((s) => s.ttwKgCo2e !== null)
      ? round(segmentResults.reduce((a, s) => a + (s.ttwKgCo2e || 0), 0))
      : null;
    const wttValues = segmentResults.filter((s) => s.wttKgCo2e !== null);
    const wtt = wttValues.length === segmentResults.length ? round(wttValues.reduce((a, s) => a + (s.wttKgCo2e || 0), 0)) : null;
    const wtw = ttw !== null && wtt !== null ? round(ttw + wtt) : null;

    const payloadTonnes = input.cargoWeightKg && input.cargoWeightKg > 0 ? round(input.cargoWeightKg / 1000, 3) : null;
    const tkm = tonneKilometres(payloadTonnes, totalDistance);
    const intensity = computeIntensity(wtw ?? ttw, totalDistance, payloadTonnes);
    const reconciliation = reconcileSegments(segmentResults, totalDistance, 0.5);

    let reefer: any = null;
    if (input.reefer?.energyQuantity && input.reefer.energyQuantity > 0) {
      const reeferFuel = normalizeTruckFuelType(input.reefer.fuelType) || 'DIESEL';
      const factor = await this.factors.resolve({ fuelType: reeferFuel, countryCode: segments[0]?.countryCode });
      const reeferEmissions = computeFuelEmissions(Number(input.reefer.energyQuantity), factor
        ? { ttwKgCo2ePerUnit: factor.ttwKgCo2ePerUnit, wttKgCo2ePerUnit: factor.wttKgCo2ePerUnit }
        : null);
      reefer = {
        fuelType: reeferFuel,
        unit: input.reefer.unit || unitForFuel(reeferFuel),
        quantity: Number(input.reefer.energyQuantity),
        ttwKgCo2e: reeferEmissions.ttwKgCo2e,
        wttKgCo2e: reeferEmissions.wttKgCo2e,
        wtwKgCo2e: reeferEmissions.wtwKgCo2e,
        factor: factor ? { code: factor.code, source: factor.source, dataset: factor.datasetVersion } : null,
        includedInTotal: false,
      };
    }

    const customers = Math.max(1, Number(input.customers) || 1);
    const missing = segmentResults
      .filter((s) => s.ttwKgCo2e === null)
      .map((s) => `emission_factor_or_activity_missing:${s.countryCode}`);

    return {
      engineVersion: EMISSION_ENGINE_VERSION,
      methodology,
      simulated: true,
      vehicle: {
        truckId: truck?.id ?? null,
        label: truck ? `${truck.plateNumber} · ${truck.brand} ${truck.model}` : input.externalVehicle?.label || 'External vehicle',
        fuelType,
        unit,
        consumptionPer100Km: consumption,
      },
      distanceKm: totalDistance,
      energyQuantity: quantity,
      cargoTonnes: payloadTonnes,
      tonneKm: tkm,
      ttwKgCo2e: ttw,
      wttKgCo2e: wtt,
      wtwKgCo2e: wtw,
      co2ePerKm: intensity.gPerKm,
      co2ePerTonneKm: intensity.gPerTonneKm,
      perCustomer: customers > 1 && (wtw ?? ttw) !== null
        ? round((wtw ?? ttw)! / customers)
        : null,
      customers,
      segments: segmentResults,
      reconciliation,
      reefer,
      missing,
      dataQuality: missing.length === 0 && quantity !== null ? 'estimated_from_input' : 'missing_data',
      note: 'A simulation. It is not counted as company emissions and does not create a trip record.',
    };
  }

  async compare(scenarios: ManualScenarioInput[]) {
    if (!Array.isArray(scenarios) || scenarios.length < 2) {
      throw new BadRequestException('At least two scenarios are required for a comparison');
    }
    if (scenarios.length > 10) throw new BadRequestException('At most 10 scenarios can be compared');
    const results = [];
    for (const scenario of scenarios) results.push(await this.calculate(scenario));
    const baseline = results[0];
    return results.map((r, i) => ({
      ...r,
      differenceVsFirstPercent:
        i === 0 || !baseline.wtwKgCo2e || !r.wtwKgCo2e
          ? null
          : round(((r.wtwKgCo2e - baseline.wtwKgCo2e) / baseline.wtwKgCo2e) * 100, 2),
    }));
  }

  async saveSimulation(input: ManualScenarioInput, result: any, user: any) {
    return this.simulations.save(this.simulations.create({
      companyId: user?.companyId ?? null,
      name: input.name || `Simulation ${new Date().toISOString().slice(0, 10)}`,
      input: input as unknown as Record<string, unknown>,
      result,
      engineVersion: EMISSION_ENGINE_VERSION,
      createdByUserId: user?.id ?? null,
    }));
  }

  listSimulations(user: any) {
    const qb = this.simulations.createQueryBuilder('s').orderBy('s."createdAt"', 'DESC').limit(100);
    if (user?.companyId) qb.andWhere('s."companyId" = :companyId', { companyId: user.companyId });
    else qb.andWhere('s."createdByUserId" = :userId', { userId: user?.id });
    return qb.getMany();
  }

  private normaliseSegments(input: ManualScenarioInput): Array<{ countryCode: string; distanceKm: number }> {
    const fromInput = (input.segments || [])
      .map((s) => ({ countryCode: resolveCountryCode(s.countryCode), distanceKm: Number(s.distanceKm) }))
      .filter((s): s is { countryCode: string; distanceKm: number } => !!s.countryCode && Number.isFinite(s.distanceKm) && s.distanceKm > 0);

    if (fromInput.length) {
      const total = Number(input.distanceKm);
      const sum = fromInput.reduce((a, s) => a + s.distanceKm, 0);
      if (Number.isFinite(total) && total > 0) {
        const difference = Math.abs(total - sum);
        if (difference > Math.max(1, total * 0.005)) {
          throw new BadRequestException(
            `Country distances add up to ${sum.toFixed(1)} km but the distance entered is ${total.toFixed(1)} km. They must match within 0.5%.`,
          );
        }
      }
      return fromInput.map((s) => ({ countryCode: s.countryCode, distanceKm: round(s.distanceKm) }));
    }

    const total = Number(input.distanceKm);
    if (!Number.isFinite(total) || total <= 0) {
      throw new BadRequestException('Distance or at least one country segment is required');
    }
    const country = resolveCountryCode(input.countryCode) || 'XX';
    return [{ countryCode: country, distanceKm: round(total) }];
  }
}
