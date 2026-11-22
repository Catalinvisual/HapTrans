import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { TripEmissionRecord } from './emission-trip.entity';
import { TripEmissionSegment } from './emission-trip.entity';

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

/**
 * Dashboard and drill-down aggregation. Every number is derived from stored
 * trip emission records; there are no hardcoded KPIs and no demo rows.
 */
@Injectable()
export class EmissionAnalyticsService {
  constructor(
    @InjectRepository(TripEmissionRecord) private readonly records: Repository<TripEmissionRecord>,
    @InjectRepository(TripEmissionSegment) private readonly segments: Repository<TripEmissionSegment>,
  ) {}

  private applyFilters(qb: SelectQueryBuilder<any>, alias: string, f: EmissionFilters) {
    if (f.from) qb.andWhere(`${alias}."executionDate" >= :from`, { from: f.from });
    if (f.to) qb.andWhere(`${alias}."executionDate" <= :to`, { to: f.to });
    if (f.truckId) qb.andWhere(`${alias}."truckId" = :truckId`, { truckId: f.truckId });
    if (f.trailerId) qb.andWhere(`${alias}."trailerId" = :trailerId`, { trailerId: f.trailerId });
    if (f.driverId) qb.andWhere(`${alias}."driverId" = :driverId`, { driverId: f.driverId });
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

  /** Filter option sources, so dropdowns only list values that really exist. */
  async filterOptions(companyId?: string | null) {
    const trucks = await this.records.createQueryBuilder('r')
      .leftJoin('trucks', 't', 't.id = r."truckId"')
      .select('DISTINCT r."truckId"', 'id')
      .addSelect('t."plateNumber"', 'label')
      .where('r."truckId" IS NOT NULL')
      .getRawMany();
    const drivers = await this.records.createQueryBuilder('r')
      .leftJoin('drivers', 'd', 'd.id = r."driverId"')
      .leftJoin('users', 'u', 'u.id = d."userId"')
      .select('DISTINCT r."driverId"', 'id')
      .addSelect('u.name', 'label')
      .where('r."driverId" IS NOT NULL')
      .getRawMany();
    const customers = await this.records.query(
      `SELECT DISTINCT a."clientId" AS id, a."clientName" AS label
         FROM trip_emission_allocations a
         JOIN trip_emission_records r ON r.id = a."recordId"
        WHERE a."clientId" IS NOT NULL
          ${companyId ? 'AND r."companyId" = $1' : ''}
        ORDER BY a."clientName"`,
      companyId ? [companyId] : [],
    );
    const countries = await this.records.query(
      `SELECT DISTINCT s."countryCode" AS code
         FROM trip_emission_segments s
         JOIN trip_emission_records r ON r.id = s."recordId"
        ${companyId ? 'WHERE r."companyId" = $1' : ''}
        ORDER BY s."countryCode"`,
      companyId ? [companyId] : [],
    );
    const fuels = await this.records.createQueryBuilder('r')
      .select('DISTINCT r."fuelType"', 'fuelType')
      .where('r."fuelType" IS NOT NULL')
      .getRawMany();
    const range = await this.records.createQueryBuilder('r')
      .select('MIN(r."executionDate")', 'min')
      .addSelect('MAX(r."executionDate")', 'max')
      .getRawOne();
    return {
      trucks: trucks.filter((t) => t.id),
      drivers: drivers.filter((d) => d.id),
      customers: (customers as Array<{ id: string; label: string }>).filter((c) => c.id),
      countries: (countries as Array<{ code: string }>).map((c) => c.code),
      fuelTypes: (fuels as Array<{ fuelType: string }>).map((f) => f.fuelType),
      dateRange: { min: range?.min || null, max: range?.max || null },
    };
  }
}
