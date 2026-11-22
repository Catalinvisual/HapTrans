import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TripEmissionRecord } from './emission-trip.entity';
import { TripEmissionSegment } from './emission-trip.entity';
import { resolveCountryCode } from './country-database';

export interface EmissionFilters {
  from?: string;
  to?: string;
  country?: string;
  truckId?: string;
  trailerId?: string;
  driverId?: string;
  customerId?: string;
  fuelType?: string;
  methodology?: string;
  lifecycle?: string;
  dataQuality?: string;
  fleetType?: string;
  finalized?: string;
  boundary?: 'ttw' | 'wtt' | 'wtw';
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v) || 0);
const round = (v: number, d = 3): number => {
  const f = 10 ** d;
  return Math.round((v + Number.EPSILON) * f) / f;
};

/** Keeps one row per id and sorts by the visible label. */
function uniqueOptions(rows: Array<{ id: string | null; label: string | null }>) {
  const byId = new Map<string, { id: string; label: string }>();
  for (const row of rows || []) {
    const id = String(row?.id || '').trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, { id, label: String(row?.label || '').trim() || id });
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function uniqueCodes(values: Array<string | null | undefined>) {
  return [...new Set(values.map((v) => String(v || '').trim().toUpperCase()).filter(Boolean))].sort();
}

/**
 * Dashboard and drill-down aggregation. Every number is derived from stored
 * trip emission records; there are no hardcoded KPIs and no demo rows.
 */
@Injectable()
export class EmissionAnalyticsService {
  private readonly logger = new Logger(EmissionAnalyticsService.name);

  constructor(
    @InjectRepository(TripEmissionRecord) private readonly records: Repository<TripEmissionRecord>,
    @InjectRepository(TripEmissionSegment) private readonly segments: Repository<TripEmissionSegment>,
  ) {}

  /**
   * One broken option source must never empty every dropdown: each dimension is
   * queried on its own and a failure is logged instead of rejecting the call.
   */
  private async option<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await run();
    } catch (error) {
      this.logger.warn(
        `Emission filter option "${label}" unavailable: ${(error as Error)?.message || error}`,
      );
      return fallback;
    }
  }

  private applyFilters(qb: SelectQueryBuilder<any>, alias: string, f: EmissionFilters) {
    if (f.from) qb.andWhere(`${alias}."executionDate" >= :from`, { from: f.from });
    if (f.to) qb.andWhere(`${alias}."executionDate" <= :to`, { to: f.to });
    if (f.truckId) qb.andWhere(`${alias}."truckId" = :truckId`, { truckId: f.truckId });
    if (f.trailerId) qb.andWhere(`${alias}."trailerId" = :trailerId`, { trailerId: f.trailerId });
    if (f.driverId) {
      // Records calculated before the driver was attached carry no driverId, so
      // the driver of the trip or of the truck that pulled it counts as well.
      qb.andWhere(
        `(${alias}."driverId" = :driverId
          OR EXISTS (SELECT 1 FROM "trips" tr WHERE tr.id = ${alias}."tripId" AND tr."driverId" = :driverId)
          OR EXISTS (SELECT 1 FROM "trucks" t WHERE t.id = ${alias}."truckId" AND t."driverId" = :driverId))`,
        { driverId: f.driverId },
      );
    }
    if (f.fuelType) qb.andWhere(`${alias}."fuelType" = :fuelType`, { fuelType: f.fuelType });
    if (f.methodology) qb.andWhere(`${alias}."methodology" = :methodology`, { methodology: f.methodology });
    if (f.lifecycle) qb.andWhere(`${alias}."lifecycle" = :lifecycle`, { lifecycle: f.lifecycle });
    if (f.dataQuality) qb.andWhere(`${alias}."dataQuality" = :dataQuality`, { dataQuality: f.dataQuality });
    if (f.fleetType) qb.andWhere(`${alias}."fleetType" = :fleetType`, { fleetType: f.fleetType });
    if (f.finalized === 'true') qb.andWhere(`${alias}."isFinalized" = true`);
    if (f.finalized === 'false') qb.andWhere(`${alias}."isFinalized" = false`);
    if (f.country) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM "trip_emission_segments" s WHERE s."recordId" = ${alias}.id AND s."countryCode" = :country)`,
        { country: String(f.country).toUpperCase() },
      );
    }
    if (f.customerId) {
      qb.andWhere(
        `EXISTS (SELECT 1 FROM "trip_emission_allocations" a WHERE a."recordId" = ${alias}.id AND a."clientId" = :customerId)`,
        { customerId: f.customerId },
      );
    }
    return qb;
  }

  private base(alias: string, f: EmissionFilters, companyId?: string | null) {
    const qb = this.records.createQueryBuilder(alias);
    if (companyId) qb.andWhere(`${alias}."companyId" = :companyId`, { companyId });
    return this.applyFilters(qb, alias, f);
  }

  async overview(f: EmissionFilters, companyId?: string | null) {
    const totalsRaw = await this.base('r', f, companyId)
      .select([
        'COUNT(*) AS trips',
        'COALESCE(SUM(r."wtwKgCo2e"),0) AS wtw',
        'COALESCE(SUM(r."ttwKgCo2e"),0) AS ttw',
        'COALESCE(SUM(r."wttKgCo2e"),0) AS wtt',
        'COALESCE(SUM(r."distanceKm"),0) AS distance',
        'COALESCE(SUM(r."loadedKm"),0) AS loaded',
        'COALESCE(SUM(r."emptyKm"),0) AS empty',
        'COALESCE(SUM(r."energyQuantity"),0) AS energy',
        'COALESCE(SUM(r."tonneKm"),0) AS tonnekm',
        `COALESCE(SUM(CASE WHEN r."isFinalized" THEN 1 ELSE 0 END),0) AS finalized`,
        `COALESCE(SUM(CASE WHEN r."lifecycle" = 'verified' OR r."lifecycle" = 'finalized' THEN 1 ELSE 0 END),0) AS verified`,
        `COALESCE(SUM(CASE WHEN r."lifecycle" = 'estimated' OR r."lifecycle" = 'preliminary' THEN 1 ELSE 0 END),0) AS estimated`,
        `COALESCE(SUM(CASE WHEN r."lifecycle" = 'pending_data' OR r."ttwKgCo2e" IS NULL THEN 1 ELSE 0 END),0) AS missing`,
        `COALESCE(SUM(CASE WHEN r."lifecycle" = 'reconciliation_required' THEN 1 ELSE 0 END),0) AS reconciliation`,
        `COALESCE(SUM(CASE WHEN r."dataQuality" = 'actual' THEN 1 ELSE 0 END),0) AS actualQuality`,
        `COALESCE(SUM(CASE WHEN r."fleetType" <> 'own_fleet' THEN COALESCE(r."wtwKgCo2e",0) ELSE 0 END),0) AS subcontractor`,
        `COALESCE(SUM(CASE WHEN r."fleetType" = 'own_fleet' THEN COALESCE(r."wtwKgCo2e",0) ELSE 0 END),0) AS ownFleet`,
      ])
      .getRawOne();

    const trips = num(totalsRaw?.trips);
    const wtw = num(totalsRaw?.wtw);
    const ttw = num(totalsRaw?.ttw);
    const wtt = num(totalsRaw?.wtt);
    const distance = num(totalsRaw?.distance);
    const loaded = num(totalsRaw?.loaded);
    const empty = num(totalsRaw?.empty);
    const energy = num(totalsRaw?.energy);
    const tonneKm = num(totalsRaw?.tonnekm);
    const missing = num(totalsRaw?.missing);
    const primaryBoundary = f.boundary === 'ttw' ? ttw : f.boundary === 'wtt' ? wtt : wtw;

    const daily = await this.base('r', f, companyId)
      .select('r."executionDate"', 'bucket')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(r."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(r."distanceKm"),0)', 'distance')
      .addSelect('COUNT(*)', 'trips')
      .andWhere('r."executionDate" IS NOT NULL')
      .groupBy('r."executionDate"')
      .orderBy('r."executionDate"', 'ASC')
      .getRawMany();

    const monthly = await this.base('r', f, companyId)
      .select(`to_char(date_trunc('month', r."executionDate"), 'YYYY-MM')`, 'bucket')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(r."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(r."distanceKm"),0)', 'distance')
      .addSelect('COUNT(*)', 'trips')
      .andWhere('r."executionDate" IS NOT NULL')
      .groupBy('bucket')
      .orderBy('bucket', 'ASC')
      .getRawMany();

    const country = await this.countryBreakdown(f, companyId);
    const truck = await this.truckBreakdown(f, companyId);
    const driver = await this.driverBreakdown(f, companyId);
    const customer = await this.customerBreakdown(f, companyId);
    const fuel = await this.base('r', f, companyId)
      .select(`COALESCE(r."fuelType", 'UNKNOWN')`, 'fuelType')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(r."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(r."energyQuantity"),0)', 'energy')
      .addSelect('COUNT(*)', 'trips')
      .groupBy(`COALESCE(r."fuelType", 'UNKNOWN')`)
      .orderBy('wtw', 'DESC')
      .getRawMany();

    const lifecycle = await this.base('r', f, companyId)
      .select('r."lifecycle"', 'lifecycle')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .groupBy('r."lifecycle"')
      .getRawMany();

    const methodology = await this.base('r', f, companyId)
      .select('r."methodology"', 'methodology')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .groupBy('r."methodology"')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      period: { from: f.from || null, to: f.to || null },
      boundary: f.boundary || 'wtw',
      kpis: {
        totalCo2eKg: round(primaryBoundary),
        ttwKg: round(ttw),
        wttKg: round(wtt),
        wtwKg: round(wtw),
        distanceKm: round(distance),
        loadedKm: round(loaded),
        emptyKm: round(empty),
        energyQuantity: round(energy),
        gPerKm: distance > 0 ? round((primaryBoundary * 1000) / distance, 2) : null,
        gPerTonneKm: tonneKm > 0 ? round((primaryBoundary * 1000) / tonneKm, 2) : null,
        trips,
        verifiedTrips: num(totalsRaw?.verified),
        estimatedTrips: num(totalsRaw?.estimated),
        pendingTrips: missing,
        finalizedTrips: num(totalsRaw?.finalized),
        actualQualityTrips: num(totalsRaw?.actualQuality),
        reconciliationTrips: num(totalsRaw?.reconciliation),
        missingDataPercent: trips > 0 ? round((missing / trips) * 100, 1) : null,
        emptyRunningPercent: distance > 0 ? round((empty / distance) * 100, 1) : null,
        ownFleetKg: round(num(totalsRaw?.ownFleet)),
        subcontractorKg: round(num(totalsRaw?.subcontractor)),
        hasWtt: wtt > 0,
      },
      series: {
        daily: daily.map((d) => ({
          date: d.bucket,
          wtwKg: round(num(d.wtw)),
          ttwKg: round(num(d.ttw)),
          distanceKm: round(num(d.distance)),
          trips: num(d.trips),
        })),
        monthly: monthly.map((d) => ({
          month: d.bucket,
          wtwKg: round(num(d.wtw)),
          ttwKg: round(num(d.ttw)),
          distanceKm: round(num(d.distance)),
          trips: num(d.trips),
        })),
      },
      byCountry: country,
      byTruck: truck,
      byDriver: driver,
      byCustomer: customer,
      byFuelType: fuel.map((r) => ({
        fuelType: r.fuelType,
        wtwKg: round(num(r.wtw)),
        ttwKg: round(num(r.ttw)),
        energyQuantity: round(num(r.energy)),
        trips: num(r.trips),
      })),
      byLifecycle: lifecycle.map((r) => ({ lifecycle: r.lifecycle, count: num(r.count), wtwKg: round(num(r.wtw)) })),
      byMethodology: methodology.map((r) => ({ methodology: r.methodology, count: num(r.count), wtwKg: round(num(r.wtw)) })),
      loadedVsEmpty: { loadedKm: round(loaded), emptyKm: round(empty) },
      generatedAt: new Date().toISOString(),
    };
  }

  async countryBreakdown(f: EmissionFilters, companyId?: string | null) {
    const qb = this.segments.createQueryBuilder('s')
      .innerJoin(TripEmissionRecord, 'r', 'r.id = s."recordId"')
      .select('s."countryCode"', 'countryCode')
      .addSelect('COALESCE(SUM(s."distanceKm"),0)', 'distance')
      .addSelect('COALESCE(SUM(s."loadedKm"),0)', 'loaded')
      .addSelect('COALESCE(SUM(s."emptyKm"),0)', 'empty')
      .addSelect('COALESCE(SUM(s."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(s."wttKgCo2e"),0)', 'wtt')
      .addSelect('COALESCE(SUM(s."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(s."energyQuantity"),0)', 'energy')
      .addSelect('COUNT(DISTINCT s."recordId")', 'trips')
      .groupBy('s."countryCode"')
      .orderBy('wtw', 'DESC');
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    this.applyFilters(qb, 'r', f);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      countryCode: r.countryCode,
      distanceKm: round(num(r.distance)),
      loadedKm: round(num(r.loaded)),
      emptyKm: round(num(r.empty)),
      ttwKg: round(num(r.ttw)),
      wttKg: round(num(r.wtt)),
      wtwKg: round(num(r.wtw)),
      energyQuantity: round(num(r.energy)),
      trips: num(r.trips),
    }));
  }

  private async truckBreakdown(f: EmissionFilters, companyId?: string | null) {
    const qb = this.records.createQueryBuilder('r')
      .leftJoin('trucks', 't', 't.id = r."truckId"')
      .select(`COALESCE(t."plateNumber", 'Unassigned')`, 'label')
      .addSelect('r."truckId"', 'id')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(r."distanceKm"),0)', 'distance')
      .addSelect('COALESCE(SUM(r."emptyKm"),0)', 'empty')
      .addSelect('COUNT(*)', 'trips')
      .groupBy('t."plateNumber"')
      .addGroupBy('r."truckId"')
      .orderBy('wtw', 'DESC');
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    this.applyFilters(qb, 'r', f);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      wtwKg: round(num(r.wtw)),
      distanceKm: round(num(r.distance)),
      emptyKm: round(num(r.empty)),
      trips: num(r.trips),
    }));
  }

  private async driverBreakdown(f: EmissionFilters, companyId?: string | null) {
    const qb = this.records.createQueryBuilder('r')
      .leftJoin('drivers', 'd', 'd.id = r."driverId"')
      .leftJoin('users', 'u', 'u.id = d."userId"')
      .select(`COALESCE(u.name, 'Unassigned')`, 'label')
      .addSelect('r."driverId"', 'id')
      .addSelect('COALESCE(SUM(r."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(r."distanceKm"),0)', 'distance')
      .addSelect('COALESCE(SUM(r."emptyKm"),0)', 'empty')
      .addSelect('COUNT(*)', 'trips')
      .groupBy('u.name')
      .addGroupBy('r."driverId"')
      .orderBy('wtw', 'DESC');
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    this.applyFilters(qb, 'r', f);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      wtwKg: round(num(r.wtw)),
      distanceKm: round(num(r.distance)),
      emptyKm: round(num(r.empty)),
      trips: num(r.trips),
    }));
  }

  private async customerBreakdown(f: EmissionFilters, companyId?: string | null) {
    const qb = this.records.createQueryBuilder('r')
      .innerJoin('trip_emission_allocations', 'a', 'a."recordId" = r.id')
      .select(`COALESCE(a."clientName", 'Unknown customer')`, 'label')
      .addSelect('a."clientId"', 'id')
      .addSelect('COALESCE(SUM(a."wtwKgCo2e"),0)', 'wtw')
      .addSelect('COALESCE(SUM(a."ttwKgCo2e"),0)', 'ttw')
      .addSelect('COALESCE(SUM(a."distanceKm"),0)', 'distance')
      .addSelect('COUNT(DISTINCT r.id)', 'trips')
      .groupBy('a."clientName"')
      .addGroupBy('a."clientId"')
      .orderBy('wtw', 'DESC');
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    this.applyFilters(qb, 'r', f);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      id: r.id,
      label: r.label,
      wtwKg: round(num(r.wtw)),
      ttwKg: round(num(r.ttw)),
      distanceKm: round(num(r.distance)),
      trips: num(r.trips),
    }));
  }

  async tripRows(f: EmissionFilters, companyId?: string | null, limit = 500) {
    const qb = this.records.createQueryBuilder('r')
      .leftJoin('trips', 't', 't.id = r."tripId"')
      .leftJoin('trucks', 'tr', 'tr.id = r."truckId"')
      .select([
        'r.id AS id',
        'r."tripId" AS "tripId"',
        't."tripNumber" AS "tripNumber"',
        'tr."plateNumber" AS "plateNumber"',
        'r."executionDate" AS "executionDate"',
        'r.lifecycle AS lifecycle',
        'r."dataQuality" AS "dataQuality"',
        'r.methodology AS methodology',
        'r."distanceKm" AS "distanceKm"',
        'r."loadedKm" AS "loadedKm"',
        'r."emptyKm" AS "emptyKm"',
        'r."ttwKgCo2e" AS "ttwKg"',
        'r."wttKgCo2e" AS "wttKg"',
        'r."wtwKgCo2e" AS "wtwKg"',
        'r."energyQuantity" AS "energyQuantity"',
        'r."fuelType" AS "fuelType"',
        'r."fleetType" AS "fleetType"',
        'r."gPerTonneKm" AS "gPerTonneKm"',
        'r.reconciliation AS reconciliation',
      ])
      .orderBy('r."executionDate"', 'DESC')
      .limit(limit);
    if (companyId) qb.andWhere('r."companyId" = :companyId', { companyId });
    this.applyFilters(qb, 'r', f);
    const rows = await qb.getRawMany();
    return rows.map((r) => ({
      ...r,
      distanceKm: round(num(r.distanceKm)),
      loadedKm: round(num(r.loadedKm)),
      emptyKm: round(num(r.emptyKm)),
      ttwKg: r.ttwKg === null ? null : round(num(r.ttwKg)),
      wttKg: r.wttKg === null ? null : round(num(r.wttKg)),
      wtwKg: r.wtwKg === null ? null : round(num(r.wtwKg)),
      energyQuantity: r.energyQuantity === null ? null : round(num(r.energyQuantity)),
      gPerTonneKm: r.gPerTonneKm === null ? null : round(num(r.gPerTonneKm), 2),
    }));
  }

  /**
   * Filter option sources.
   *
   * A dropdown lists a value when it exists in the company's own data. Emission
   * records are the first source, but a record calculated before a truck, driver
   * or customer was attached carries no id for it, so each dimension falls back
   * to the real fleet/customer master data instead of showing an empty list.
   */
  async filterOptions(companyId?: string | null) {
    const company = companyId || null;
    const inCompany = (qb: SelectQueryBuilder<any>, alias: string) =>
      company ? qb.andWhere(`${alias}."companyId" = :companyId`, { companyId: company }) : qb;

    const trucks = await this.option('trucks', async () => {
      const rows = await inCompany(
        this.records.createQueryBuilder('r')
          .leftJoin('trucks', 't', 't.id = r."truckId"')
          .select('DISTINCT r."truckId"', 'id')
          .addSelect('t."plateNumber"', 'label')
          .where('r."truckId" IS NOT NULL'),
        'r',
      ).orderBy('t."plateNumber"', 'ASC').getRawMany();
      if (rows.length) return rows;
      return inCompany(
        this.records.manager.createQueryBuilder()
          .select('t.id', 'id')
          .addSelect('t."plateNumber"', 'label')
          .from('trucks', 't')
          .where('t."plateNumber" IS NOT NULL'),
        't',
      ).orderBy('t."plateNumber"', 'ASC').limit(500).getRawMany();
    }, [] as Array<{ id: string | null; label: string | null }>);

    const drivers = await this.option('drivers', async () => {
      // A driver can be attached to the emission record, to its trip or to the
      // truck that pulled it, and older records were calculated before any of
      // that. Every source is read and merged, so one missing link (or a driver
      // without a linked user account) can never empty the list.
      const label = 'COALESCE(u.name, u.email, d.phone)';
      const grouped = (qb: SelectQueryBuilder<any>, key: string) =>
        qb.groupBy(key).addGroupBy('u.name').addGroupBy('u.email').addGroupBy('d.phone');

      const fromRecords = await inCompany(
        grouped(
          this.records.createQueryBuilder('r')
            .leftJoin('drivers', 'd', 'd.id = r."driverId"')
            .leftJoin('users', 'u', 'u.id = d."userId"')
            .select('r."driverId"', 'id')
            .addSelect(label, 'label')
            .where('r."driverId" IS NOT NULL'),
          'r."driverId"',
        ),
        'r',
      ).getRawMany();

      const fromTrips = await inCompany(
        grouped(
          this.records.manager.createQueryBuilder()
            .select('tr."driverId"', 'id')
            .addSelect(label, 'label')
            .from('trips', 'tr')
            .innerJoin('drivers', 'd', 'd.id = tr."driverId"')
            .leftJoin('users', 'u', 'u.id = d."userId"')
            .where('tr."driverId" IS NOT NULL'),
          'tr."driverId"',
        ),
        'tr',
      ).getRawMany();

      const fromTrucks = await inCompany(
        grouped(
          this.records.manager.createQueryBuilder()
            .select('t."driverId"', 'id')
            .addSelect(label, 'label')
            .from('trucks', 't')
            .innerJoin('drivers', 'd', 'd.id = t."driverId"')
            .leftJoin('users', 'u', 'u.id = d."userId"')
            .where('t."driverId" IS NOT NULL'),
          't."driverId"',
        ),
        't',
      ).getRawMany();

      const fromMaster = await inCompany(
        grouped(
          this.records.manager.createQueryBuilder()
            .select('d.id', 'id')
            .addSelect(label, 'label')
            .from('drivers', 'd')
            .leftJoin('users', 'u', 'u.id = d."userId"')
            .where('d.id IS NOT NULL'),
          'd.id',
        ),
        'u',
      ).limit(500).getRawMany();

      return [
        ...(fromRecords as Array<{ id: string | null; label: string | null }>),
        ...(fromTrips as Array<{ id: string | null; label: string | null }>),
        ...(fromTrucks as Array<{ id: string | null; label: string | null }>),
        ...(fromMaster as Array<{ id: string | null; label: string | null }>),
      ];
    }, [] as Array<{ id: string | null; label: string | null }>);

    const customers = await this.option('customers', async () => {
      const rows = await inCompany(
        this.records.createQueryBuilder('r')
          .innerJoin('trip_emission_allocations', 'a', 'a."recordId" = r.id')
          .select('DISTINCT a."clientId"', 'id')
          .addSelect('a."clientName"', 'label')
          .where('a."clientId" IS NOT NULL'),
        'r',
      ).orderBy('a."clientName"', 'ASC').getRawMany();
      if (rows.length) return rows;
      return inCompany(
        this.records.manager.createQueryBuilder()
          .select('c.id', 'id')
          .addSelect('c.name', 'label')
          .from('clients', 'c')
          .where('c.name IS NOT NULL'),
        'c',
      ).orderBy('c.name', 'ASC').limit(500).getRawMany();
    }, [] as Array<{ id: string | null; label: string | null }>);

    const countries = await this.option('countries', async () => {
      const rows = await inCompany(
        this.segments.createQueryBuilder('s')
          .innerJoin(TripEmissionRecord, 'r', 'r.id = s."recordId"')
          .select('DISTINCT s."countryCode"', 'code')
          .where('s."countryCode" IS NOT NULL'),
        'r',
      ).orderBy('s."countryCode"', 'ASC').getRawMany();
      const fromSegments = rows.map((row: { code: string }) => row.code);
      if (fromSegments.length) return uniqueCodes(fromSegments);
      // Records without country segments still belong to trips whose stops know
      // their country; resolve those to ISO codes instead of an empty list.
      const stopRows = await inCompany(
        this.records.createQueryBuilder('r')
          .innerJoin('trips', 'tr', 'tr.id = r."tripId"')
          .innerJoin('stops', 'st', 'st."tripId" = tr.id')
          .select('DISTINCT st."country"', 'country')
          .where('st."country" IS NOT NULL'),
        'r',
      ).getRawMany();
      return uniqueCodes(
        (stopRows as Array<{ country: string }>).map((row) => resolveCountryCode(row.country)),
      );
    }, [] as string[]);

    const fuels = await this.option('fuelTypes', async () => {
      // The records carry the fuel they were calculated with; the fleet can
      // already have trucks running on another energy source that no record
      // covers yet. Both are shown, deduplicated and normalised to the code the
      // trip records store (DIESEL, HVO, LNG, CNG, ELECTRIC, ...).
      const rows = await inCompany(
        this.records.createQueryBuilder('r')
          .select('DISTINCT UPPER(r."fuelType")', 'fuelType')
          .where('r."fuelType" IS NOT NULL'),
        'r',
      ).getRawMany();
      const fleetRows = await inCompany(
        this.records.manager.createQueryBuilder()
          .select('DISTINCT UPPER(t."fuelType")', 'fuelType')
          .from('trucks', 't')
          .where('t."fuelType" IS NOT NULL'),
        't',
      ).getRawMany();
      return [...new Set(
        [...(rows as Array<{ fuelType: string }>), ...(fleetRows as Array<{ fuelType: string }>)]
          .map((row) => String(row.fuelType || '').trim().toUpperCase())
          .filter(Boolean),
      )].sort();
    }, [] as string[]);

    const range = await this.option('dateRange', async () => inCompany(
      this.records.createQueryBuilder('r')
        .select('MIN(r."executionDate")', 'min')
        .addSelect('MAX(r."executionDate")', 'max'),
      'r',
    ).getRawOne(), {} as { min?: string | null; max?: string | null });

    return {
      trucks: uniqueOptions(trucks),
      drivers: uniqueOptions(drivers),
      customers: uniqueOptions(customers),
      countries,
      fuelTypes: fuels,
      dateRange: { min: range?.min || null, max: range?.max || null },
    };
  }
}
