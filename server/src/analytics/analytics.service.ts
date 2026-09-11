import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Repository } from 'typeorm';
import { AnalyticsTarget } from './target.entity';
import { SavedView } from './saved-view.entity';
import { AnalyticsFilters } from './filters.dto';
import {
  num, round2, pctChange, isoDay, weekKey, monthKey, bucketKeyForDate,
  buildBuckets, parseRange, isoDaysBetween, isOnTime, Granularity, PeriodRange,
} from './analytics.utils';
import {
  tripRevenue, tripDirectCost, tripProfit, tripDistance, DEFAULT_COST_PER_KM,
} from './financial-calculator';
import {
  OtifService, ORDER_DELIVERED, ORDER_ACTIVE, TRIP_COMPLETED, TRIP_ACTIVE,
} from './otif.service';
import { KPI_DEFINITIONS } from './kpi-definitions';
import { UserRole } from '../users/user.entity';

interface SqlFilters {
  clauses: string[];
  params: any[];
}

function numParam(v: string | undefined | null): string | null {
  if (!v || v === 'all' || v === 'undefined') return null;
  return v;
}

// ---------------------------------------------------------------------------
// Builds trippable WHERE clauses for the trips query. Parameter ordering is
// shared between the trips and orders queries so both stay consistent.
// ---------------------------------------------------------------------------
class WhereBuilder {
  clauses: string[] = [];
  params: any[] = [];
  private readonly prefix: string;

  constructor(prefix: string, from: Date, to: Date, f: AnalyticsFilters, companyId?: string | null) {
    this.prefix = prefix;
    this.add(`${prefix}.created_at BETWEEN $${this.push(from.toISOString())} AND $${this.push(to.toISOString())}`);
    if (companyId) this.add(`${prefix}."companyId" = $${this.push(companyId)}`);
  }

  private push(v: any): number {
    this.params.push(v);
    return this.params.length;
  }

  private add(clause: string) { this.clauses.push(clause); }

  applyOrderFilters(f: AnalyticsFilters) {
    const clientId = numParam(f.clientId);
    const orderStatus = numParam(f.orderStatus);
    const origin = numParam(f.origin);
    const destination = numParam(f.destination);
    const country = numParam(f.country);
    const o = this.prefix;
    if (clientId) this.add(`${o}."clientId" = $${this.push(clientId)}`);
    if (orderStatus) this.add(`${o}.status = $${this.push(orderStatus)}`);
    if (origin) {
      this.add(`((${o}.origin_country ILIKE $${this.push(`%${origin}%`)}) OR (${o}.origin_city ILIKE $${this.push(`%${origin}%`)}))`);
    }
    if (destination) {
      this.add(`((${o}.destination_country ILIKE $${this.push(`%${destination}%`)}) OR (${o}.destination_city ILIKE $${this.push(`%${destination}%`)}))`);
    }
    if (country) {
      this.add(`((${o}.origin_country ILIKE $${this.push(`%${country}%`)}) OR (${o}.destination_country ILIKE $${this.push(`%${country}%`)}))`);
    }
  }

  /** Conditions applied to the trips query that mirror the order-level filters
   *  so the trip set matches the filtered order set. */
  applyTripExistenceFilters(f: AnalyticsFilters) {
    const clientId = numParam(f.clientId);
    const orderStatus = numParam(f.orderStatus);
    const origin = numParam(f.origin);
    const destination = numParam(f.destination);
    const country = numParam(f.country);
    const t = this.prefix;
    if (clientId) this.add(`EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = ${t}.id AND o."clientId" = $${this.push(clientId)})`);
    if (orderStatus) this.add(`EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = ${t}.id AND o.status = $${this.push(orderStatus)})`);
    if (origin) {
      this.add(`EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = ${t}.id AND (o.origin_country ILIKE $${this.push(`%${origin}%`)} OR o.origin_city ILIKE $${this.push(`%${origin}%`)}))`);
    }
    if (destination) {
      this.add(`EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = ${t}.id AND (o.destination_country ILIKE $${this.push(`%${destination}%`)} OR o.destination_city ILIKE $${this.push(`%${destination}%`)}))`);
    }
    if (country) {
      this.add(`EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = ${t}.id AND (o.origin_country ILIKE $${this.push(`%${country}%`)} OR o.destination_country ILIKE $${this.push(`%${country}%`)}))`);
    }
  }

  applyTripFilters(f: AnalyticsFilters) {
    const truck = numParam(f.truckId);
    const driver = numParam(f.driverId);
    const trailer = numParam(f.trailerId);
    const tripStatus = numParam(f.tripStatus);
    const t = this.prefix;
    if (truck) this.add(`${t}."truckId" = $${this.push(truck)}`);
    if (driver) this.add(`${t}."driverId" = $${this.push(driver)}`);
    if (trailer) this.add(`${t}."trailerId" = $${this.push(trailer)}`);
    if (tripStatus) this.add(`${t}.status = $${this.push(tripStatus)}`);
  }

  whereSql(): string {
    return this.clauses.length ? `WHERE ${this.clauses.join(' AND ')}` : '';
  }
}

export interface TripRow {
  id: string;
  created_at: Date;
  status: string;
  truckId: string | null;
  driverId: string | null;
  trailerId: string | null;
  distance: number;
  rev_fallback: number;
  cost_fallback: number;
  truck_cost_per_km: number | null;
  truck_plate: string | null;
  truck_status: string | null;
  driver_name: string | null;
  driver_status: string | null;
  trailer_plate: string | null;
  plannedArrival: Date | null;
  actualArrival: Date | null;
  plannedDeparture: Date | null;
  actualDeparture: Date | null;
  order_count: number;
  order_revenue: number;
  manual_cost: number;
  delivered_in_trip: number;
  late_in_trip: number;
  partial_trip: boolean;
  bp: string | null; // first stop label
  bpCity: string | null;
  bpCountry: string | null;
  dp: string | null; // last stop label
  dpCity: string | null;
  dpCountry: string | null;
  /** Raw trip_costs rows attached at load time (analytics.service.ts loadPeriod). */
  costs?: Array<{ type?: string; category?: string; description?: string | null; amount?: number | string | null }>;
}

export interface OrderRow {
  id: string;
  order_number: string | null;
  status: string;
  created_at: Date;
  requested_delivery_at: Date | string | null;
  actual_delivery_at: Date | string | null;
  is_late: boolean | string | null;
  late_minutes: number | null;
  clientId: string | null;
  client_name: string | null;
  tripId: string | null;
  price: number;
  origin_country: string | null;
  destination_country: string | null;
  origin_city: string | null;
  destination_city: string | null;
  has_pod?: boolean;
}

const ORDERS_SELECT = `
  SELECT o.id, o.order_number, o.status, o.created_at,
    o.requested_delivery_at, o.actual_delivery_at, o.is_late, o.late_minutes,
    o."clientId", o."tripId", COALESCE(o.price::float, 0) AS price,
    o.origin_country, o.destination_country, o.origin_city, o.destination_city,
    c.name AS client_name,
    EXISTS (SELECT 1 FROM documents d WHERE d."orderId" = o.id AND lower(d."documentType"::text) = 'pod') AS has_pod
  FROM orders o
  LEFT JOIN clients c ON c.id = o."clientId"
`;

const TRIPS_SELECT = `
  SELECT
    t.id, t.created_at, t.status, t."truckId", t."driverId", t."trailerId",
    COALESCE(t.distance_km, t."distanceKm")::float AS distance,
    COALESCE(t.revenue_amount, t."estimatedProfit", 0)::float AS rev_fallback,
    COALESCE(t.cost_amount, t."estimatedCost", 0)::float AS cost_fallback,
    tr."costPerKm"::float AS truck_cost_per_km,
    tr."plateNumber" AS truck_plate,
    tr.status AS truck_status,
    u.name AS driver_name,
    d.status AS driver_status,
    tl."plateNumber" AS trailer_plate,
    t."plannedArrival", t."actualArrival", t."plannedDeparture", t."actualDeparture",
    (SELECT count(*)::int FROM orders o WHERE o."tripId" = t.id) AS order_count,
    (SELECT COALESCE(sum(o.price::float), 0) FROM orders o WHERE o."tripId" = t.id) AS order_revenue,
    (SELECT COALESCE(sum(tc.amount::float), 0) FROM trip_costs tc WHERE tc."tripId" = t.id) AS manual_cost,
    (SELECT count(*)::int FROM orders o WHERE o."tripId" = t.id AND lower(o.status::text) IN ('delivered','pod_received','ready_for_invoice','invoiced','paid','closed')) AS delivered_in_trip,
    (SELECT count(*)::int FROM orders o WHERE o."tripId" = t.id AND (o.is_late = true OR (o.is_late IS NOT NULL AND o.is_late::text = 'true') OR COALESCE(o.late_minutes,0) > 0)) AS late_in_trip,
    (t.status = 'partially_delivered') AS partial_trip,
    first_stop.city AS bp_city, first_stop.country AS bp_country,
    last_stop.city AS dp_city, last_stop.country AS dp_country
  FROM trips t
  LEFT JOIN trucks tr ON tr.id = t."truckId"
  LEFT JOIN drivers d ON d.id = t."driverId"
  LEFT JOIN users u ON u.id = d."userId"
  LEFT JOIN trailers tl ON tl.id = t."trailerId"
  LEFT JOIN LATERAL (
    SELECT s.city, s.country FROM stops s WHERE s."tripId" = t.id
    ORDER BY s.sequence ASC LIMIT 1
  ) first_stop ON true
  LEFT JOIN LATERAL (
    SELECT s.city, s.country FROM stops s WHERE s."tripId" = t.id
    ORDER BY s.sequence DESC LIMIT 1
  ) last_stop ON true
`;

const CARRIER_COST_TYPES = ['carrier', 'subcontractor', 'external', 'subcontract'];

function isCarrierCost(c: { type?: string; category?: string; description?: string | null }): string | null {
  const t = String(c.type || '').toLowerCase();
  const cat = String(c.category || '').toLowerCase();
  if (CARRIER_COST_TYPES.includes(t) || CARRIER_COST_TYPES.includes(cat)) {
    return String(c.description || 'Subcontractor').trim() || 'Subcontractor';
  }
  return null;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsTarget) private targetsRepo: Repository<AnalyticsTarget>,
    @InjectRepository(SavedView) private viewsRepo: Repository<SavedView>,
    private dataSource: DataSource,
    private otif: OtifService,
  ) {}

  // =========================================================================
  // EXECUTIVE CONTROL CENTER
  // =========================================================================
  async getExecutive(f: AnalyticsFilters, user?: { role?: UserRole; companyId?: string | null }) {
    const granularity: Granularity = f.granularity === 'day' || f.granularity === 'week' ? f.granularity : 'month';
    const { period, previous } = parseRange(f.from, f.to, granularity === 'month' ? 3 : 2);
    const companyId = user?.companyId || null;
    const otif = this.otif; // canonical service instance

    const [cur, prev, trucks, targets] = await Promise.all([
      this.loadPeriod(period, f, companyId),
      this.loadPeriod(previous, f, companyId),
      this.loadTruckFleet(f, companyId),
      this.loadTargets(companyId),
    ]);

    // ---- Operations KPIs ----
    const op = this.computeOperationsKpis(cur.orders, cur.trips);

    // ---- Service KPIs ----
    const otifOrders = otif.otif(cur.orders);
    const otdOrders = otif.otd(cur.orders);
    const otpStats = otif.otp(cur.pickupStops);
    const tripsOT = otif.tripsOnTime(cur.trips);
    const prevOtifOrders = otif.otif(prev.orders);
    const prevOtdOrders = otif.otd(prev.orders);

    const pendingDeliveries = cur.orders.filter((o: any) =>
      (ORDER_ACTIVE.has(String(o.status).toLowerCase())) && !ORDER_DELIVERED.has(String(o.status).toLowerCase())).length;
    const lateDeliveries = cur.orders.filter((o: any) =>
      ORDER_DELIVERED.has(String(o.status).toLowerCase()) &&
      (o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0)).length;
    const deliveredOrders = cur.orders.filter((o: any) => ORDER_DELIVERED.has(String(o.status).toLowerCase())).length;
    const podPct = deliveredOrders > 0
      ? (cur.orders.filter((o: any) => ORDER_DELIVERED.has(String(o.status).toLowerCase()) && o.has_pod).length / deliveredOrders) * 100
      : null;

    // ---- Financial KPIs (period) ----
    const fin = this.aggregatePeriodFinancials(cur.trips);
    const prevFin = this.aggregatePeriodFinancials(prev.trips);

    // ---- Fleet KPIs ----
    const fleet = this.computeFleetKpis(cur.trips, trucks);

    // ---- Trend & comparison ----
    const prevOps = this.computeOperationsKpis(prev.orders, prev.trips);

    // ---- Bucketed series ----
    const curMap = buildBuckets(period.from, period.to, granularity);
    const prevMap = buildBuckets(previous.from, previous.to, granularity);
    this.fillSeries(curMap, cur);
    this.fillSeries(prevMap, prev);
    // pickup series (needs pickup rows per bucket)
    for (const s of cur.pickupStops) {
      if (s.dateFrom) {
        const key = bucketKeyForDate(new Date(s.dateFrom + 'T00:00:00'), granularity);
        if (curMap[key]) curMap[key].pickups = (curMap[key].pickups || 0) + 1;
      }
    }
    const previousPickupsArr = this.countPickupsByBucket(prev.pickupStops, previous, granularity);

    // ---- Distribution ----
    const orderStatusDistribution = this.orderStatusDistribution(cur.orders);
    const tripStatusDistribution = this.tripStatusDistribution(cur.trips);

    // ---- Customer analytics ----
    const customerTable = this.computeCustomerTable(cur.trips, cur.orders);
    const routes = this.computeRoutes(cur.trips);
    const fleetUtil = this.computeFleetTable(cur.trips, trucks);
    const drivers = this.computeDriverTable(cur.trips);
    const carriers = this.computeCarrierTable(cur.trips);

    // ---- Exceptions ----
    const exceptions = await this.computeExceptions(f, period, cur, companyId);

    const revenue = fin.revenue;
    const km = fin.km;

    const prevFleetKpis = this.computeFleetKpis(prev.trips, trucks);

    return {
      meta: {
        generatedAt: new Date(),
        granularity,
        period: { from: period.from, to: period.to },
        comparison: { from: previous.from, to: previous.to },
      },
      kpis: {
        operations: {
          ordersTotal: op.ordersTotal,
          openOrders: op.openOrders,
          activeTrips: op.activeTrips,
          completedTrips: op.completedTrips,
          deliveries: deliveredOrders,
          pendingDeliveries,
          exceptionsCount: exceptions.length,
          unassignedOrders: op.unassignedOrders,
        },
        service: {
          otif: { ...otifOrders },
          otd: { ...otdOrders },
          otp: { ...otpStats },
          otifTrips: { rate: tripsOT.rate, good: tripsOT.good, total: tripsOT.total, avgLateMinutes: tripsOT.avgLateMinutes },
          lateDeliveries,
          lateDeliveryPct: deliveredOrders > 0 ? (lateDeliveries / deliveredOrders) * 100 : null,
          avgDelayMinutes: otdOrders.avgLateMinutes,
          podCompletionPct: podPct,
        },
        fleet: {
          utilizationPct: fleet.utilizationPct,
          availableTrucks: fleet.available,
          totalTrucks: fleet.total,
          inMaintenance: fleet.inMaintenance,
          loadedKm: fleet.loadedKm,
          emptyKm: fleet.emptyKm,
          deadheadPct: fleet.deadheadPct,
          avgFuelConsumption: fleet.avgFuelConsumption,
        },
        financial: {
          revenue, transportCost: fin.cost, grossProfit: fin.profit,
          grossMargin: fin.margin, revenuePerKm: fin.revenuePerKm,
          costPerKm: fin.costPerKm, profitPerKm: fin.profitPerKm,
        },
      },
      trends: {
        ordersTotal: pctChange(op.ordersTotal, prevOps.ordersTotal),
        openOrders: pctChange(op.openOrders, prevOps.openOrders),
        activeTrips: pctChange(op.activeTrips, prevOps.activeTrips),
        completedTrips: pctChange(op.completedTrips, prevOps.completedTrips),
        deliveries: pctChange(deliveredOrders, prevOps.delivered),
        otif: prevOtifOrders.total > 0 ? otifOrders.rate - prevOtifOrders.rate : null,
        otd: prevOtdOrders.total > 0 ? otdOrders.rate - prevOtdOrders.rate : null,
        lateDeliveries: pctChange(lateDeliveries, prev.orders.filter((o: any) =>
          ORDER_DELIVERED.has(String(o.status).toLowerCase()) &&
          (o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0)).length),
        revenue: pctChange(fin.revenue, prevFin.revenue),
        transportCost: pctChange(fin.cost, prevFin.cost),
        grossProfit: pctChange(fin.profit, prevFin.profit),
        grossMargin: prevFin.margin !== 0 ? fin.margin - prevFin.margin : null,
        km: pctChange(fin.km, prevFin.km),
        revenuePerKm: pctChange(fin.revenuePerKm, prevFin.revenuePerKm,),
        costPerKm: pctChange(fin.costPerKm, prevFin.costPerKm),
        profitPerKm: pctChange(fin.profitPerKm, prevFin.profitPerKm),
        loadedKm: pctChange(fleet.loadedKm, prevFleetKpis.loadedKm),
        emptyKm: pctChange(fleet.emptyKm, prevFleetKpis.emptyKm),
        deadheadPct: prevFleetKpis.loadedKm + prevFleetKpis.emptyKm > 0 && fleet.deadheadPct != null && prevFleetKpis.deadheadPct != null
          ? fleet.deadheadPct - prevFleetKpis.deadheadPct : null,
      },
      previous: {
        kpis: {
          operations: {
            ordersTotal: prevOps.ordersTotal, openOrders: prevOps.openOrders,
            activeTrips: prevOps.activeTrips, completedTrips: prevOps.completedTrips,
            deliveries: prevOps.delivered, unassignedOrders: prevOps.unassignedOrders,
          },
          service: { otif: { rate: prevOtifOrders.rate, good: prevOtifOrders.good, total: prevOtifOrders.total } },
          financial: { revenue: prevFin.revenue, transportCost: prevFin.cost, grossProfit: prevFin.profit, grossMargin: prevFin.margin },
        },
      },
      targets: targets.map(t => ({ id: t.id, key: t.key, label: t.label, section: t.section, value: num(t.value), unit: t.unit })),
      series: Object.values(curMap).map((m: any) => ({ ...m, profit: m.profit, margin: m.revenue > 0 ? round2((m.profit / m.revenue) * 100) : 0 })),
      previousSeries: Object.values(prevMap).map((m: any) => ({ ...m, profit: m.profit })),
      orderStatusDistribution,
      tripStatusDistribution,
      byCountry: this.countryStats(cur.orders),
      customers: customerTable,
      topCustomersRevenue: customerTable.slice().sort((a, b) => b.revenue - a.revenue).slice(0, f.limit ? num(f.limit) : 10).map(c => ({ id: c.id, name: c.name, revenue: c.revenue, margin: c.margin, otif: c.otif })),
      topCustomersProfit: customerTable.slice().sort((a, b) => b.profit - a.profit).slice(0, 10).map(c => ({ id: c.id, name: c.name, profit: c.profit, margin: c.margin })),
      worstMarginCustomers: customerTable.filter(c => c.revenue > 0).sort((a, b) => a.margin - b.margin).slice(0, 10),
      routes,
      fleet: {
        utilization: {
          totalKm: fleet.loadedKm + fleet.emptyKm,
          loadedKm: fleet.loadedKm,
          emptyKm: fleet.emptyKm,
          deadheadPct: fleet.deadheadPct,
          utilizationPct: fleet.utilizationPct,
        },
        trucks: fleetUtil,
      },
      drivers,
      carriers,
      exceptions,
      delayedOrders: cur.orders
        .filter((o: any) => o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0)
        .sort((a: any, b: any) => num(b.late_minutes) - num(a.late_minutes))
        .slice(0, 10)
        .map((o: any) => ({
          id: o.id, orderNumber: o.order_number, client: o.client_name,
          route: `${o.origin_country || ''} → ${o.destination_country || ''}`.trim(),
          requested: o.requested_delivery_at, lateMinutes: num(o.late_minutes), status: o.status,
        })),
    };
  }

  // =========================================================================
  // FINANCIAL INTELLIGENCE
  // =========================================================================
  async getFinancial(f: AnalyticsFilters, user?: { role?: UserRole; companyId?: string | null }) {
    const granularity: Granularity = f.granularity === 'month' || f.granularity === 'day' ? f.granularity : 'month';
    const { period, previous } = parseRange(f.from, f.to, 12);
    const companyId = user?.companyId || null;

    const [cur, prev, invoicesNow, expensesNow, targets, settlements] = await Promise.all([
      this.loadPeriod(period, f, companyId),
      this.loadPeriod(previous, f, companyId),
      this.loadInvoices(f, companyId),
      this.loadExpenses(period, f, companyId),
      this.loadTargets(companyId),
      this.loadSettlements(companyId),
    ]);

    const op = this.computeOperationsKpis(cur.orders, cur.trips);
    const deliveredOrders = (cur.orders as any[]).filter((o: any) => ORDER_DELIVERED.has(String(o.status).toLowerCase())).length;

    // Period invoices (issued in period) for invoiced/collected
    let invoiced = 0, collected = 0, paidAmount = 0, issuedCount = 0, totalIssued = 0, paidFullCount = 0, partialCount = 0, unpaidCount = 0;
    let sumDays = 0, daysCount = 0;
    for (const i of (invoicesNow.invoices || []) as any[]) {
      if (String(i.status).toLowerCase() === 'cancelled') continue;
      const amount = num(i.total) || num(i.amount);
      const paid = ((i.payments || []) as any[]).reduce((s: any, p: any) => s + num(p.amount), 0);
      if (paid <= 0) unpaidCount++;
      else if (paid < amount - 0.01) partialCount++;
      else { paidFullCount++; paidAmount += amount; }
      const payDates = ((i.payments || []) as any[]).map((p: any) => new Date(p.date || 0).getTime()).filter((x: any) => !isNaN(x)).sort((a: any, b: any) => a - b);
      if (payDates.length && i.issue_date) {
        const d = Math.max(0, Math.round((payDates[0] - new Date(i.issue_date).getTime()) / 86400000));
        sumDays += d; daysCount++;
      }
    }
    for (const i of (cur.invoices || []) as any[]) {
      if (String(i.status).toLowerCase() === 'cancelled') continue;
      invoiced += num(i.total) || num(i.amount);
    }
    for (const i of (cur.invoices || []) as any[]) {
      for (const p of (i.payments || []) as any[]) {
        if (this.inRange(p.date, period)) collected += num(p.amount);
      }
    }
    issuedCount = ((cur.invoices || []) as any[]).filter((i: any) => String(i.status).toLowerCase() !== 'cancelled').length;
    totalIssued = invoiced;

    // Financial KPIs (real expenses added at company level only)
    const tripFin = this.aggregatePeriodFinancials(cur.trips);
    const prevTripFin = this.aggregatePeriodFinancials(prev.trips);
    let operatingExpenses = 0;
    const expenseByCat: Record<string, number> = {};
    const tripCostByCat: Record<string, number> = {};
    for (const e of cur.expenses) {
      const amt = num(e.amount);
      operatingExpenses += amt;
      expenseByCat[e.category] = (expenseByCat[e.category] || 0) + amt;
    }
    for (const t of cur.trips) {
      // Re-derive manual cost per category from the trips' cost rows
      this.accumulateTripCosts(t, tripCostByCat);
    }

    const totalCost = tripFin.cost + operatingExpenses;
    const profit = tripFin.revenue - totalCost;
    const km = tripFin.km;

    // ---- Aging (receivables, always "now") ----
    const aging = this.computeAging(invoicesNow.invoices);

    // ---- Payables (AP) ----
    const payables = this.computePayables(cur.trips, invoicesNow.invoices, expensesNow, settlements, companyId);

    // ---- Cash flow ----
    const cashflow = this.computeCashflow(f, period, invoicesNow, payables, settlements, companyId);

    // ---- Profitability ----
    const profitability = {
      customers: this.computeCustomerTable(cur.trips, cur.orders),
      routes: this.computeRoutes(cur.trips),
      vehicles: this.computeFleetTable(cur.trips, await this.loadTruckFleet(f, companyId)),
      carriers: this.computeCarrierTable(cur.trips),
      drivers: this.computeDriverTable(cur.trips),
    };

    // ---- Trends ----
    const prevOps = this.computeOperationsKpis(prev.orders, prev.trips);
    let prevExpenses = 0;
    for (const e of prev.expenses) prevExpenses += num(e.amount);
    const prevTotalCost = prevTripFin.cost + prevExpenses;
    const prevProfit = prevTripFin.revenue - prevTotalCost;

    // ---- Series ----
    const curMap = buildBuckets(period.from, period.to, granularity as any);
    const prevMap = buildBuckets(previous.from, previous.to, granularity as any);
    this.fillSeries(curMap, cur);
    this.fillSeries(prevMap, prev);
    for (const i of invoicesNow.invoices) {
      if (String(i.status).toLowerCase() === 'cancelled') continue;
      const idate = i.issue_date || i.createdAt;
      for (const p of paramsRangeKeys(idate, curMap)) curMap[p].invoiced += num(i.total) || num(i.amount);
      for (const pay of i.payments || []) {
        if (this.inRange(pay.date, period)) {
          const key = bucketKeyForDate(new Date(pay.date), granularity as any);
          if (curMap[key]) curMap[key].collected += num(pay.amount);
        }
      }
    }

    const costBreakdown = this.mergeCostBreakdown(tripCostByCat, expenseByCat);

    const receivableAging = aging;
    const receivablesTrend = this.receivablesTrend(invoicesNow.invoices);

    return {
      meta: {
        generatedAt: new Date(),
        granularity,
        period: { from: period.from, to: period.to },
        comparison: { from: previous.from, to: previous.to },
      },
      kpis: {
        revenue: tripFin.revenue,
        transportCost: tripFin.cost,
        operatingExpenses,
        totalCost,
        grossProfit: profit,
        grossMargin: tripFin.revenue > 0 ? round2((profit / tripFin.revenue) * 100) : 0,
        revenuePerKm: km > 0 ? round2(tripFin.revenue / km) : 0,
        costPerKm: km > 0 ? round2(totalCost / km) : 0,
        profitPerKm: km > 0 ? round2(profit / km) : 0,
        accountsReceivable: aging.totalOutstanding,
        overdueReceivables: aging.overdueAmount,
        accountsPayable: payables.total,
        overduePayables: payables.overdue,
        unbilledRevenue: Math.max(0, tripFin.revenue - invoiced),
        pendingCarrierCosts: payables.carrierCosts,
        invoiced, collected, issuedCount, totalIssued,
        avgPaymentDays: daysCount > 0 ? round2(sumDays / daysCount) : null,
        collectionRate: totalIssued > 0 ? round2((paidAmount / totalIssued) * 100) : null,
        openOrders: op.openOrders, activeTrips: op.activeTrips, completedTrips: op.completedTrips,
        deliveries: deliveredOrders,
      },
      trends: {
        revenue: pctChange(tripFin.revenue, prevTripFin.revenue),
        transportCost: pctChange(tripFin.cost, prevTripFin.cost),
        totalCost: pctChange(totalCost, prevTotalCost),
        operatingExpenses: pctChange(operatingExpenses, prevExpenses),
        grossProfit: pctChange(profit, prevProfit),
        grossMargin: prevTripFin.revenue > 0 ? round2((profit / tripFin.revenue) * 100) - round2((prevProfit / prevTripFin.revenue) * 100) : null,
        revenuePerKm: pctChange(km > 0 ? tripFin.revenue / km : 0, prevTripFin.km > 0 ? prevTripFin.revenue / prevTripFin.km : 0),
        costPerKm: pctChange(km > 0 ? totalCost / km : 0, prevTripFin.km > 0 ? prevTotalCost / prevTripFin.km : 0),
        profitPerKm: pctChange(km > 0 ? profit / km : 0, prevTripFin.km > 0 ? prevProfit / prevTripFin.km : 0),
        invoiced: pctChange(invoiced, prevSeriesTotal(prevMap, 'invoiced')),
        collected: pctChange(collected, prevSeriesTotal(prevMap, 'collected')),
        km: pctChange(km, prevTripFin.km),
        trips: pctChange(cur.trips.length, prev.trips.length),
        orders: pctChange(cur.orders.length, prev.orders.length),
      },
      previous: {
        revenue: prevTripFin.revenue, transportCost: prevTripFin.cost, totalCost: prevTotalCost,
        profit: prevProfit, margin: prevTripFin.revenue > 0 ? round2((prevProfit / prevTripFin.revenue) * 100) : 0,
        km: prevTripFin.km,
      },
      series: Object.values(curMap).map((m: any) => ({ ...m, profit: round2(m.revenue - m.cost), margin: m.revenue > 0 ? round2(((m.revenue - m.cost) / m.revenue) * 100) : 0 })),
      previousSeries: Object.values(prevMap).map((m: any) => ({ ...m, profit: round2(m.revenue - m.cost), margin: m.revenue > 0 ? round2(((m.revenue - m.cost) / m.revenue) * 100) : 0 })),
      paymentStats: {
        issuedCount, totalIssued, paidFullCount, partialCount, unpaidCount,
        avgPaymentDays: daysCount > 0 ? round2(sumDays / daysCount) : null,
        collectionRate: totalIssued > 0 ? round2((paidAmount / totalIssued) * 100) : null,
      },
      costBreakdown,
      profitability,
      receivables: {
        totalOutstanding: aging.totalOutstanding,
        overdueAmount: aging.overdueAmount,
        overdueCount: aging.overdueCount,
        buckets: aging.buckets,
        openInvoices: aging.openInvoices.slice(0, 200),
        trend: receivablesTrend,
      },
      payables: {
        total: payables.total,
        overdue: payables.overdue,
        carrierCosts: payables.carrierCosts,
        items: payables.items,
      },
      cashflow,
      targets: targets.map(td => ({ id: td.id, key: td.key, label: td.label, section: td.section, value: num(td.value), unit: td.unit })),
    };
  }

  // =========================================================================
  // Drill-down & analytic tables
  // =========================================================================
  async getCustomers(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    return {
      period,
      customers: this.computeCustomerTable(data.trips, data.orders),
    };
  }

  async getCustomerDetail(id: string, f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const f2: AnalyticsFilters = { ...f, clientId: id };
    const data = await this.loadPeriod(period, f2, user?.companyId || null);
    const rows = await this.dataSource.query(
      `SELECT o.id, o.order_number, o.status, o.created_at, o.requested_delivery_at, o.actual_delivery_at,
        o.is_late, o.late_minutes, o."tripId", COALESCE(o.price::float,0) AS price,
        o.origin_city, o.destination_city, o.origin_country, o.destination_country,
        c.name AS client_name
       FROM orders o LEFT JOIN clients c ON c.id = o."clientId"
       WHERE o."clientId" = $1 AND o.created_at BETWEEN $2 AND $3
       ORDER BY o.created_at DESC LIMIT 500`,
      [id, period.from, period.to],
    );
    const otifGood = ((data.orders || []) as any[]).filter((o: any) => isOnTime(o.actual_delivery_at, o.requested_delivery_at)).length;
    const delivered = ((data.orders || []) as any[]).filter((o: any) => ORDER_DELIVERED.has(String(o.status).toLowerCase())).length;
    const invoiced = (await this.dataSource.query(
      `SELECT COALESCE(sum(COALESCE(i.total,i.amount)::float),0) AS total FROM invoices i
       WHERE i."clientId" = $1 AND i.status <> 'cancelled' AND i.issue_date IS NOT NULL AND i.issue_date BETWEEN $2 AND $3`,
      [id, period.from, period.to],
    ))[0]?.total || 0;
    return {
      period,
      customer: { id },
      kpis: {
        orders: data.orders.length,
        delivered,
        otif: data.orders.length ? round2((otifGood / data.orders.length) * 100) : null,
        revenue: tripRevenueArr(data.trips),
        cost: tripCostArr(data.trips),
        profit: tripProfitArr(data.trips),
        trips: data.trips.length,
        invoiced,
      },
      orders: rows,
    };
  }

  async getRoutes(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    return { period, routes: this.computeRoutes(data.trips) };
  }

  async getFleet(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    const trucks = await this.loadTruckFleet(f, user?.companyId || null);
    return {
      period,
      utilization: this.computeFleetKpis(data.trips, trucks),
      trucks: this.computeFleetTable(data.trips, trucks),
    };
  }

  async getTruckDetail(id: string, f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, { ...f, truckId: id }, user?.companyId || null);
    const trips = data.trips.map(t => this.tripFinancialsRow(t));
    const agg = this.sumRows(trips);
    return {
      period,
      truck: { id },
      kpis: {
        revenue: agg.revenue, cost: agg.cost, profit: agg.profit, margin: agg.margin,
        km: agg.km, trips: data.trips.length, loadedKm: agg.loadedKm, emptyKm: agg.emptyKm,
        costPerKm: agg.km > 0 ? round2(agg.cost / agg.km) : 0,
        revenuePerKm: agg.km > 0 ? round2(agg.revenue / agg.km) : 0,
        profitPerKm: agg.km > 0 ? round2(agg.profit / agg.km) : 0,
      },
      trips,
    };
  }

  async getDrivers(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    return { period, drivers: this.computeDriverTable(data.trips) };
  }

  async getDriverDetail(id: string, f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, { ...f, driverId: id }, user?.companyId || null);
    const trips = data.trips.map(t => this.tripFinancialsRow(t));
    const agg = this.sumRows(trips);
    return {
      period,
      driver: { id },
      kpis: {
        trips: data.trips.length, km: agg.km, revenue: agg.revenue, cost: agg.cost,
        profit: agg.profit, margin: agg.margin,
        deliveries: ((data.orders || []) as any[]).filter((o: any) => ORDER_DELIVERED.has(String(o.status).toLowerCase())).length,
        otif: this.otifPct(data.orders),
      },
      trips,
    };
  }

  async getCarriers(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    return { period, carriers: this.computeCarrierTable(data.trips) };
  }

  async getCarrierDetail(id: string, f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 3);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    const name = decodeURIComponent(id);
    const trips = data.trips.filter(t => (t.costs || []).some(c => isCarrierCost(c) === name));
    const rows = trips.map(t => this.tripFinancialsRow(t));
    const agg = this.sumRows(rows);
    let carrierCost = 0;
    for (const t of trips) {
      for (const c of t.costs || []) {
        if (isCarrierCost(c) === name) carrierCost += num(c.amount);
      }
    }
    return {
      period,
      carrier: { name },
      kpis: {
        trips: trips.length, revenue: agg.revenue, profit: agg.profit, margin: agg.margin,
        km: agg.km, carrierCost, costPerKm: agg.km > 0 ? round2(carrierCost / agg.km) : 0,
        otif: this.otifPct(data.orders),
      },
      trips: rows,
    };
  }

  async getExceptions(f: AnalyticsFilters, user?: any) {
    const { period } = parseRange(f.from, f.to, 1);
    const data = await this.loadPeriod(period, f, user?.companyId || null);
    const exceptions = await this.computeExceptions(f, period, data, user?.companyId || null);
    return { period, exceptions };
  }

  // =========================================================================
  // Targets & saved views
  // =========================================================================
  async getTargets(companyId?: string | null) {
    const targets = await this.loadTargets(companyId);
    return targets.map(t => ({ id: t.id, key: t.key, label: t.label, section: t.section, value: num(t.value), unit: t.unit, active: t.active }));
  }

  async saveTargets(items: Array<{ id?: string; key: string; label?: string; section?: string; value: number; unit?: string }>, companyId?: string | null) {
    const results: AnalyticsTarget[] = [];
    for (const it of items || []) {
      if (!it.key) continue;
      let entity: AnalyticsTarget | null = null;
      if (it.id) entity = await this.targetsRepo.findOne({ where: { id: it.id } });
      if (!entity) entity = await this.targetsRepo.findOne({ where: { key: it.key, companyId: companyId || null } as any });
      if (entity) {
        entity.value = num(it.value);
        entity.label = it.label ?? entity.label;
        entity.section = it.section ?? entity.section;
        entity.unit = it.unit ?? entity.unit;
        results.push(await this.targetsRepo.save(entity));
      } else {
        results.push(await this.targetsRepo.save(this.targetsRepo.create({
          companyId: companyId || null,
          key: it.key,
          label: it.label ?? null,
          section: it.section ?? null,
          value: num(it.value),
          unit: it.unit || '%',
        })));
      }
    }
    return results.map(t => ({ id: t.id, key: t.key, label: t.label, section: t.section, value: num(t.value), unit: t.unit }));
  }

  async resetTargets(companyId?: string | null) {
    await this.targetsRepo.delete({ companyId: companyId || null } as any);
    return { ok: true };
  }

  async getViews(page: string, user?: any) {
    const q: any = {};
    if (user?.companyId) q.companyId = user.companyId;
    else q.companyId = null;
    if (user?.id) q.userId = user.id;
    q.page = page || 'dashboard';
    return this.viewsRepo.find({ where: q, order: { createdAt: 'ASC' } });
  }

  async createView(body: { name: string; page?: string; filters?: any }, user?: any) {
    const view = await this.viewsRepo.save(this.viewsRepo.create({
      companyId: user?.companyId || null,
      userId: user?.id || null,
      name: body.name,
      page: body.page || 'dashboard',
      filters: body.filters || {},
    }));
    return view;
  }

  async updateView(id: string, body: { name?: string; filters?: any; isDefault?: boolean }, user?: any) {
    const view = await this.viewsRepo.findOne({ where: { id } });
    if (!view) throw new NotFoundException('Saved view not found');
    if (body.name !== undefined) view.name = body.name;
    if (body.filters !== undefined) view.filters = body.filters;
    if (body.isDefault !== undefined) {
      if (body.isDefault) await this.viewsRepo.update({ page: view.page, userId: user?.id || null }, { isDefault: false });
      view.isDefault = body.isDefault;
    }
    return this.viewsRepo.save(view);
  }

  async deleteView(id: string) {
    await this.viewsRepo.delete({ id });
    return { ok: true };
  }

  getKpiDefinitions() {
    return KPI_DEFINITIONS;
  }

  // =========================================================================
  // Internal computation helpers
  // =========================================================================
  private inRange(d: Date | string | null | undefined, r: PeriodRange): boolean {
    if (!d) return false;
    const t = new Date(d).getTime();
    return !isNaN(t) && t >= r.from.getTime() && t <= r.to.getTime();
  }

  private async loadPeriod(r: PeriodRange, f: AnalyticsFilters, companyId?: string | null) {
    const orderW = new WhereBuilder('o', r.from, r.to, f, companyId);
    orderW.applyOrderFilters(f);
    const orders = await this.dataSource.query(
      `${ORDERS_SELECT} ${orderW.whereSql()}`,
      orderW.params,
    );

    const tripW = new WhereBuilder('t', r.from, r.to, f, companyId);
    tripW.applyTripExistenceFilters(f);
    tripW.applyTripFilters(f);
    const trips = await this.dataSource.query(
      `${TRIPS_SELECT} ${tripW.whereSql()}`,
      tripW.params,
    );
    // Load raw cost rows only for trips that need per-category or carrier breakdown
    const tripIds = trips.map((t: any) => t.id);
    let costs: any[] = [];
    if (tripIds.length) {
      costs = await this.dataSource.query(
        `SELECT tc."tripId", tc.type, tc.category, tc.description, COALESCE(tc.amount::float,0) AS amount FROM trip_costs tc WHERE tc."tripId" = ANY($1)`,
        [tripIds],
      );
    }
    const costByTrip: Record<string, any[]> = {};
    for (const c of costs) {
      if (!costByTrip[c.tripId]) costByTrip[c.tripId] = [];
      costByTrip[c.tripId].push(c);
    }
    for (const t of trips) (t as any).costs = costByTrip[t.id] || [];

    const tripsFiltered = trips as TripRow[];

    // pickups for OTP + series
    const pkW = new WhereBuilder('o', r.from, r.to, f, companyId);
    pkW.applyOrderFilters(f);
    const pickupStops = await this.dataSource.query(
      `SELECT s."orderId", s.dateFrom, s.timeFrom, o.status, o.is_late, o.late_minutes
       FROM order_stops s
       JOIN orders o ON o.id = s."orderId"
       WHERE s.type = 'pickup' AND s.dateFrom IS NOT NULL AND s.dateFrom BETWEEN $1 AND $2 ${
        f.clientId ? 'AND o."clientId" = $3' : ''
       }`,
      f.clientId ? [r.from, r.to, f.clientId] : [r.from, r.to],
    );

    // Trip stops for OTP (delivery windows already covered by order rows)
    const stopsW = new WhereBuilder('st', r.from, r.to, f, companyId);
    stopsW.applyTripFilters(f);
    const tripStopRows = tripIds.length
      ? await this.dataSource.query(
        `SELECT st."tripId", st.type, st."timeWindowMax", st.ata, st."etaStatus", st.status, st."sequence"
         FROM stops st WHERE st."tripId" = ANY($1)`,
        [tripIds],
      )
      : [];
    const pickupStopRows = tripStopRows
      .filter((s: any) => String(s.type).toLowerCase() === 'pickup');

    // invoices (issued within range) for financial aggregates
    const invoices = await this.loadPeriodInvoices(r, f, companyId);
    const expenses = await this.loadExpenses(r, f, companyId);

    return { orders, trips: tripsFiltered, pickupStops, tripStops: pickupStopRows, invoices, expenses, costs };
  }

  private async loadPeriodInvoices(r: PeriodRange, f: AnalyticsFilters, companyId?: string | null) {
    const params: any[] = [r.from, r.to];
    let where = `i.issue_date IS NOT NULL AND i.issue_date BETWEEN $1 AND $2`;
    if (f.clientId) { params.push(f.clientId); where += ` AND i."clientId" = $${params.length}`; }
    if (companyId) { params.push(companyId); where += ` AND i."companyId" = $${params.length}`; }
    const rows = await this.dataSource.query(
      `SELECT i.id, i."invoiceNumber", i.status, i.issue_date, i.due_date, i."clientId",
        COALESCE(i.total, i.amount, 0)::float AS total, c.name AS client_name,
        COALESCE((SELECT COALESCE(sum(p.amount::float),0) FROM payments p WHERE p."invoiceId" = i.id),0)::float AS paid, 0::int AS seed
       FROM invoices i LEFT JOIN clients c ON c.id = i."clientId"
       WHERE ${where}`,
      params,
    );
    for (const row of rows) {
      const payRows = await this.dataSource.query(
        `SELECT id, date, COALESCE(amount::float,0) AS amount, method, status, reference FROM payments WHERE "invoiceId" = $1`,
        [row.id],
      );
      row.payments = payRows;
    }
    return rows;
  }

  private async loadExpenses(r: PeriodRange, f: AnalyticsFilters, companyId?: string | null) {
    const params: any[] = [r.from, r.to];
    let where = `e.date BETWEEN $1 AND $2`;
    if (companyId) { params.push(companyId); where += ` AND e."companyId" = $${params.length}`; }
    return this.dataSource.query(
      `SELECT e.id, e.date, e.category, COALESCE(e.amount::float,0) AS amount, e.description, e.currency
       FROM expenses e WHERE ${where} ORDER BY e.date DESC`,
      params,
    );
  }

  private async loadInvoices(f: AnalyticsFilters, companyId?: string | null) {
    const params: any[] = [];
    let where = `1=1`;
    if (f.clientId) { params.push(f.clientId); where += ` AND i."clientId" = $${params.length}`; }
    if (companyId) { params.push(companyId); where += ` AND i."companyId" = $${params.length}`; }
    const rows = await this.dataSource.query(
      `SELECT i.id, i."invoiceNumber", i.status, i.issue_date, i.due_date, i."clientId",
        COALESCE(i.total, i.amount, 0)::float AS total, c.name AS client_name,
        COALESCE((SELECT COALESCE(sum(p.amount::float),0) FROM payments p WHERE p."invoiceId" = i.id),0)::float AS paid
       FROM invoices i LEFT JOIN clients c ON c.id = i."clientId"
       WHERE ${where} AND i.status <> 'cancelled'`,
      params,
    );
    for (const row of rows) {
      row.payments = await this.dataSource.query(
        `SELECT id, date, COALESCE(amount::float,0) AS amount, method, status, reference FROM payments WHERE "invoiceId" = $1`,
        [row.id],
      );
    }
    return { invoices: rows };
  }

  private async loadTruckFleet(f: AnalyticsFilters, companyId?: string | null) {
    const params: any[] = [];
    let where = `1=1`;
    if (companyId) { params.push(companyId); where += ` AND t."companyId" = $${params.length}`; }
    return this.dataSource.query(
      `SELECT t.id, t."plateNumber", t.brand, t.model, t.status, t."fuelConsumption"::float AS fuel_consumption,
        t."costPerKm"::float AS cost_per_km, t."nextMaintenanceMileage"::float AS next_maintenance
       FROM trucks t WHERE ${where} ORDER BY t."plateNumber"`,
      params,
    );
  }

  private async loadSettlements(companyId?: string | null) {
    const params: any[] = [];
    let where = `1=1`;
    if (companyId) { params.push(companyId); where += ` AND (s."companyId" IS NULL OR s."companyId" = $${params.length})`; }
    return this.dataSource.query(
      `SELECT s.id, s.driver_id, s.driver_name, s.status, s.month, s.year, s.net_pay::float AS net_pay, s.gross_pay::float AS gross_pay,
        COALESCE(s.advances::float,0) AS advances
       FROM settlements s WHERE ${where}`,
      params,
    );
  }

  private async loadTargets(companyId?: string | null): Promise<AnalyticsTarget[]> {
    return this.targetsRepo.find({ where: { companyId: companyId || null } as any });
  }

  private computeOperationsKpis(orders: OrderRow[], trips: TripRow[]) {
    let ordersTotal = 0, openOrders = 0, unassignedOrders = 0;
    for (const o of orders) {
      ordersTotal++;
      const st = String(o.status).toLowerCase();
      if (!ORDER_DELIVERED.has(st) && st !== 'cancelled') openOrders++;
      if (!o.tripId && (st === 'new' || st === 'draft' || st === 'received' || st === 'pending')) unassignedOrders++;
    }
    let activeTrips = 0, completedTrips = 0;
    for (const t of trips) {
      const st = String(t.status).toLowerCase();
      if (TRIP_COMPLETED.has(st)) completedTrips++;
      else if (TRIP_ACTIVE.has(st)) activeTrips++;
    }
    const delivered = orders.filter(o => ORDER_DELIVERED.has(String(o.status).toLowerCase())).length;
    return { ordersTotal, openOrders, unassignedOrders, activeTrips, completedTrips, delivered };
  }

  private aggregatePeriodFinancials(trips: TripRow[]) {
    let revenue = 0, cost = 0, km = 0;
    for (const t of trips as any) {
      revenue += tripRevenue(t);
      cost += tripDirectCost(t);
      km += tripDistance(t);
    }
    revenue = round2(revenue);
    cost = round2(cost);
    const profit = round2(revenue - cost);
    return {
      revenue, cost, profit,
      margin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
      km,
      revenuePerKm: km > 0 ? round2(revenue / km) : 0,
      costPerKm: km > 0 ? round2(cost / km) : 0,
      profitPerKm: km > 0 ? round2(profit / km) : 0,
      avgTripValue: trips.length > 0 ? round2(revenue / trips.length) : 0,
    };
  }

  private computeFleetKpis(trips: TripRow[], trucks: any[]) {
    let loadedKm = 0, emptyKm = 0;
    for (const t of trips) {
      if (num(t.order_count) > 0) loadedKm += num(t.distance);
      else emptyKm += num(t.distance);
    }
    const total = trucks.length;
    const available = trucks.filter((tr: any) => tr.status === 'active').length;
    const inTrip = trucks.filter((tr: any) => tr.status === 'in_trip').length;
    const inMaintenance = trucks.filter((tr: any) => tr.status === 'maintenance').length;
    const utilizationPct = total > 0 ? Math.round(((available + inTrip) / total) * 100) : null;
    const totalKm = loadedKm + emptyKm;
    const deadheadPct = totalKm > 0 ? round2((emptyKm / totalKm) * 100) : null;
    const fc = trucks.filter((tr: any) => num(tr.fuel_consumption) > 0).map((tr: any) => num(tr.fuel_consumption));
    const avgFuelConsumption = fc.length ? round2(fc.reduce((a, b) => a + b, 0) / fc.length) : null;
    return { loadedKm: round2(loadedKm), emptyKm: round2(emptyKm), utilizationPct, available, inTrip, inMaintenance, total, deadheadPct, avgFuelConsumption };
  }

  private computeFleetTable(trips: TripRow[], trucks: any[]) {
    const byTruck: Record<string, any> = {};
    for (const t of trips) {
      if (!t.truckId) continue;
      if (!byTruck[t.truckId]) {
        byTruck[t.truckId] = {
          id: t.truckId, name: t.truck_plate || '—', revenue: 0, cost: 0, profit: 0,
          km: 0, emptyKm: 0, loadedKm: 0, trips: 0, manualCost: 0,
        };
      }
      const row = byTruck[t.truckId];
      row.revenue += tripRevenue(t);
      row.cost += tripDirectCost(t);
      row.profit += tripProfit(t);
      row.km += tripDistance(t);
      if (num(t.order_count) > 0) row.loadedKm += num(t.distance);
      else row.emptyKm += num(t.distance);
      row.trips += 1;
      row.manualCost += (t.costs || []).reduce((s, c: any) => s + num(c.amount), 0);
    }
    const truckMap: Record<string, any> = {};
    for (const tr of trucks) truckMap[tr.id] = tr;
    return Object.values(byTruck)
      .map((t: any) => {
        const truck = truckMap[t.id];
        return {
          ...t,
          status: truck?.status || null,
          fuelConsumption: num(truck?.fuel_consumption),
          revenuePerKm: t.km > 0 ? round2(t.revenue / t.km) : 0,
          costPerKm: t.km > 0 ? round2(t.cost / t.km) : 0,
          profitPerKm: t.km > 0 ? round2(t.profit / t.km) : 0,
          margin: t.revenue > 0 ? round2((t.profit / t.revenue) * 100) : 0,
        };
      })
      .sort((a: any, b: any) => b.profit - a.profit);
  }

  private computeCustomerTable(trips: TripRow[], orders: OrderRow[]) {
    const customers: Record<string, any> = {};
    const orderByTrip: Record<string, OrderRow[]> = {};
    for (const o of orders) {
      if (!o.tripId) continue;
      if (!orderByTrip[o.tripId]) orderByTrip[o.tripId] = [];
      orderByTrip[o.tripId].push(o);
    }
    for (const t of trips) {
      const rev = tripRevenue(t);
      const cost = tripDirectCost(t);
      const trpOrders = orderByTrip[t.id] || [];
      const share = trpOrders.length > 0 ? trpOrders.length : 1;
      const seen = new Set<string>();
      for (const o of trpOrders) {
        if (!o.clientId || seen.has(o.clientId)) continue;
        seen.add(o.clientId);
        if (!customers[o.clientId]) customers[o.clientId] = {
          id: o.clientId, name: o.client_name || '—', orders: 0, trips: 0,
          revenue: 0, cost: 0, profit: 0, km: 0, lateDeliveries: 0, otifGood: 0, otifTotal: 0,
        };
        const c = customers[o.clientId];
        c.orders++;
        c.trips += 1 / share;
        c.revenue += rev / (share * (new Set(trpOrders.map((x: any) => x.clientId)).size || 1));
        c.cost += cost / (share * (new Set(trpOrders.map((x: any) => x.clientId)).size || 1));
        c.km += tripDistance(t) / share;
      }
    }
    // per-order service metrics (independent of attribution sharing)
    for (const o of orders) {
      if (!o.clientId) continue;
      const st = String(o.status).toLowerCase();
      const late = o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0;
      if (ORDER_DELIVERED.has(st)) {
        if (!customers[o.clientId]) customers[o.clientId] = { id: o.clientId, name: o.client_name || '—', orders: 0, trips: 0, revenue: 0, cost: 0, profit: 0, km: 0, lateDeliveries: 0, otifGood: 0, otifTotal: 0 };
        if (!customers[o.clientId].disDelivered) customers[o.clientId].disDelivered = 0;
        customers[o.clientId].disDelivered += 1;
        if (late) customers[o.clientId].lateDeliveries += 1;
        if (o.actual_delivery_at && o.requested_delivery_at) {
          customers[o.clientId].otifTotal += 1;
          if (isOnTime(o.actual_delivery_at, o.requested_delivery_at)) customers[o.clientId].otifGood += 1;
        }
      }
    }
    return Object.values(customers)
      .map((c: any) => ({
        id: c.id, name: c.name, orders: c.orders, trips: round2(c.trips),
        revenue: round2(c.revenue), cost: round2(c.cost), profit: round2(c.profit),
        margin: c.revenue > 0 ? round2((c.profit / c.revenue) * 100) : 0,
        km: round2(c.km),
        revenuePerKm: c.km > 0 ? round2(c.revenue / c.km) : 0,
        costPerKm: c.km > 0 ? round2(c.cost / c.km) : 0,
        profitPerKm: c.km > 0 ? round2(c.profit / c.km) : 0,
        otif: c.otifTotal > 0 ? round2((c.otifGood / c.otifTotal) * 100) : null,
        lateDeliveries: c.lateDeliveries,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  private computeRoutes(trips: TripRow[]) {
    const routes: Record<string, any> = {};
    for (const t of trips) {
      const bp = [t.bpCity, t.bpCountry].filter(Boolean).join(', ') || '—';
      const dp = [t.dpCity, t.dpCountry].filter(Boolean).join(', ') || '—';
      const key = `${bp} → ${dp}`;
      if (!routes[key]) routes[key] = { route: key, trips: 0, revenue: 0, cost: 0, profit: 0, km: 0, emptyKm: 0, deliveries: 0, lateDeliveries: 0 };
      const r = routes[key];
      r.trips += 1;
      r.revenue += tripRevenue(t);
      r.cost += tripDirectCost(t);
      r.profit += tripProfit(t);
      r.km += tripDistance(t);
      if (num(t.order_count) === 0) r.emptyKm += num(t.distance);
      r.deliveries += num(t.delivered_in_trip);
      r.lateDeliveries += num(t.late_in_trip);
    }
    return Object.values(routes)
      .map((r: any) => ({
        ...r,
        revenue: round2(r.revenue), cost: round2(r.cost), profit: round2(r.profit),
        margin: r.revenue > 0 ? round2((r.profit / r.revenue) * 100) : 0,
        km: round2(r.km), emptyKm: round2(r.emptyKm),
        costPerKm: r.km > 0 ? round2(r.cost / r.km) : 0,
        revenuePerKm: r.km > 0 ? round2(r.revenue / r.km) : 0,
        profitPerKm: r.km > 0 ? round2(r.profit / r.km) : 0,
        otif: r.deliveries > 0 ? round2(((r.deliveries - r.lateDeliveries) / r.deliveries) * 100) : null,
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  private computeDriverTable(trips: TripRow[]) {
    const byDriver: Record<string, any> = {};
    for (const t of trips) {
      if (!t.driverId) continue;
      if (!byDriver[t.driverId]) byDriver[t.driverId] = { id: t.driverId, name: t.driver_name || '—', trips: 0, km: 0, revenue: 0, cost: 0, profit: 0, deliveries: 0, lateDeliveries: 0 };
      const d = byDriver[t.driverId];
      d.trips += 1;
      d.km += tripDistance(t);
      d.revenue += tripRevenue(t);
      d.cost += tripDirectCost(t);
      d.profit += tripProfit(t);
      d.deliveries += num(t.delivered_in_trip);
      d.lateDeliveries += num(t.late_in_trip);
    }
    return Object.values(byDriver)
      .map((d: any) => ({
        ...d,
        km: round2(d.km), revenue: round2(d.revenue), cost: round2(d.cost), profit: round2(d.profit),
        margin: d.revenue > 0 ? round2((d.profit / d.revenue) * 100) : 0,
        revenuePerKm: d.km > 0 ? round2(d.revenue / d.km) : 0,
        costPerKm: d.km > 0 ? round2(d.cost / d.km) : 0,
        profitPerKm: d.km > 0 ? round2(d.profit / d.km) : 0,
        otif: d.deliveries > 0 ? round2(((d.deliveries - d.lateDeliveries) / d.deliveries) * 100) : null,
      }))
      .sort((a, b) => b.profit - a.profit);
  }

  private computeCarrierTable(trips: TripRow[]) {
    const carriers: Record<string, any> = {};
    for (const t of trips) {
      const names = new Set<string>();
      let carrierCost = 0;
      for (const c of (t.costs || [])) {
        const name = isCarrierCost(c);
        if (name) { names.add(name); carrierCost += num(c.amount); }
      }
      if (names.size === 0) continue;
      for (const name of names) {
        if (!carriers[name]) carriers[name] = { id: encodeURIComponent(name), name, trips: 0, revenue: 0, cost: 0, profit: 0, km: 0, carrierCost: 0, deliveries: 0, lateDeliveries: 0, claims: 0 };
        const c = carriers[name];
        c.trips += 1;
        c.revenue += tripRevenue(t);
        c.cost += tripDirectCost(t);
        c.profit += tripProfit(t);
        c.km += tripDistance(t);
        c.carrierCost += carrierCost;
        c.deliveries += num(t.delivered_in_trip);
        c.lateDeliveries += num(t.late_in_trip);
      }
    }
    return Object.values(carriers)
      .map((c: any) => ({
        ...c,
        revenue: round2(c.revenue), cost: round2(c.cost), profit: round2(c.profit),
        carrierCost: round2(c.carrierCost), km: round2(c.km),
        marginImpact: c.revenue > 0 ? round2((c.profit / c.revenue) * 100) : 0,
        costPerKm: c.km > 0 ? round2(c.carrierCost / c.km) : 0,
        otif: c.deliveries > 0 ? round2(((c.deliveries - c.lateDeliveries) / c.deliveries) * 100) : null,
      }))
      .sort((a, b) => b.carrierCost - a.carrierCost);
  }

  private orderStatusDistribution(orders: OrderRow[]) {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const st = String(o.status || 'unknown').toLowerCase();
      counts[st] = (counts[st] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }

  private tripStatusDistribution(trips: TripRow[]) {
    const counts: Record<string, number> = {};
    for (const t of trips) {
      const st = String(t.status || 'unknown').toLowerCase();
      counts[st] = (counts[st] || 0) + 1;
    }
    return Object.entries(counts).map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count);
  }

  private countryStats(orders: OrderRow[]) {
    const pickup: Record<string, number> = {};
    const delivery: Record<string, number> = {};
    const combined: Record<string, number> = {};
    for (const o of orders) {
      if (o.origin_country) {
        pickup[o.origin_country] = (pickup[o.origin_country] || 0) + 1;
        combined[o.origin_country] = (combined[o.origin_country] || 0) + 1;
      }
      if (o.destination_country) {
        delivery[o.destination_country] = (delivery[o.destination_country] || 0) + 1;
        combined[o.destination_country] = (combined[o.destination_country] || 0) + 1;
      }
    }
    const top = (m: Record<string, number>, n: number) =>
      Object.entries(m).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, n);
    return { pickup: top(pickup, 10), delivery: top(delivery, 10), combined: top(combined, 10) };
  }

  private fillSeries(map: Record<string, any>, data: { trips: TripRow[]; orders: OrderRow[]; invoices?: any; expenses?: any }, granularity: Granularity = 'month') {
    for (const t of data.trips) {
      const key = bucketKeyForDate(new Date(t.created_at), granularity);
      if (!map[key]) continue;
      const rev = tripRevenue(t);
      const cost = tripDirectCost(t);
      map[key].revenue += rev;
      map[key].cost += cost;
      map[key].km += tripDistance(t);
      map[key].trips += 1;
      if (TRIP_COMPLETED.has(String(t.status).toLowerCase())) map[key].tripsCompleted += 1;
      else if (TRIP_ACTIVE.has(String(t.status).toLowerCase())) map[key].tripsActive += 1;
    }
    for (const o of data.orders) {
      const key = bucketKeyForDate(new Date(o.created_at), granularity);
      if (!map[key]) continue;
      map[key].orders += 1;
      const st = String(o.status).toLowerCase();
      if (ORDER_DELIVERED.has(st)) {
        map[key].ordersDelivered += 1;
        if (o.actual_delivery_at && o.requested_delivery_at) {
          map[key].otifTotal += 1;
          if (isOnTime(o.actual_delivery_at, o.requested_delivery_at)) map[key].otifGood += 1;
        }
      }
      if (o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0) map[key].ordersDelayed += 1;
    }
    for (const e of data.expenses || []) {
      const key = bucketKeyForDate(new Date(e.date || 0), granularity);
      if (map[key]) {
        map[key].expenses = (map[key].expenses || 0) + num(e.amount);
        map[key].cost += num(e.amount);
      }
    }
  }

  private countPickupsByBucket(rows: any[], range: PeriodRange, granularity: Granularity): Record<string, number> {
    const out: Record<string, number> = {};
    for (const s of rows) {
      if (!s.dateFrom) continue;
      const key = bucketKeyForDate(new Date(s.dateFrom + 'T00:00:00'), granularity);
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }

  private accumulateTripCosts(t: TripRow, out: Record<string, number>) {
    for (const c of (t.costs || [])) {
      const cat = String(c.category || c.type || 'other').toLowerCase();
      out[cat] = (out[cat] || 0) + num(c.amount);
    }
  }

  private mergeCostBreakdown(tripCostByCat: Record<string, number>, expenseByCat: Record<string, number>) {
    const map: Record<string, number> = {};
    const revTrip: Record<string, string> = {
      fuel: 'fuel', toll: 'toll', maintenance: 'maintenance', salary: 'driver', carriers: 'carrier',
    };
    for (const [k, v] of Object.entries(tripCostByCat)) {
      const norm = revTrip[k] || 'other';
      map[norm] = (map[norm] || 0) + v;
    }
    for (const [k, v] of Object.entries(expenseByCat)) {
      const norm = revTrip[k] || 'other';
      map[norm] = (map[norm] || 0) + v;
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount: round2(amount), percent: total > 0 ? round2((amount / total) * 100) : 0 }))
      .filter(x => x.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  private computeAging(invoices: any[]) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const bucketOf = (dueDate: Date | null): string => {
      if (!dueDate) return 'current';
      const due = new Date(dueDate); due.setHours(0, 0, 0, 0);
      const diff = Math.floor((today.getTime() - due.getTime()) / 86400000);
      if (diff <= 0) return 'current';
      if (diff <= 30) return '1-30';
      if (diff <= 60) return '31-60';
      if (diff <= 90) return '61-90';
      return '90+';
    };
    const buckets: Record<string, { count: number; amount: number }> = {
      current: { count: 0, amount: 0 }, '1-30': { count: 0, amount: 0 }, '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 }, '90+': { count: 0, amount: 0 },
    };
    let totalOutstanding = 0, overdueAmount = 0, overdueCount = 0;
    const openInvoices: any[] = [];
    for (const inv of invoices || []) {
      if (String(inv.status).toLowerCase() === 'cancelled' || String(inv.status).toLowerCase() === 'paid') continue;
      const amount = num(inv.total) || num(inv.amount);
      const paid = num(inv.paid);
      const remaining = Math.max(0, amount - paid);
      if (remaining <= 0) continue;
      const b = bucketOf(inv.due_date);
      buckets[b].count += 1;
      buckets[b].amount += remaining;
      totalOutstanding += remaining;
      if (b !== 'current') { overdueAmount += remaining; overdueCount += 1; }
      const due = inv.due_date ? new Date(inv.due_date) : null;
      const daysOverdue = due ? isoDaysBetween(due, today) : 0;
      openInvoices.push({
        id: inv.id, invoiceNumber: inv.invoiceNumber, clientId: inv.clientId, client: inv.client_name || '—',
        issueDate: inv.issue_date, dueDate: inv.due_date, amount, paid, outstanding: remaining,
        daysOverdue: b === 'current' ? 0 : daysOverdue, status: inv.status,
      });
    }
    return {
      totalOutstanding, overdueAmount, overdueCount,
      buckets: ['current', '1-30', '31-60', '61-90', '90+'].map(k => ({ label: k, ...buckets[k] })),
      openInvoices,
    };
  }

  private receivablesTrend(invoices: any[]) {
    const map: Record<string, any> = {};
    const cur = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
      const key = monthKey(d);
      map[key] = { label: `${d.getMonth() + 1}/'${String(d.getFullYear()).slice(2)}`, invoiced: 0, collected: 0, outstanding: 0 };
    }
    for (const inv of invoices || []) {
      if (String(inv.status).toLowerCase() === 'cancelled') continue;
      const idate = inv.issue_date ? new Date(inv.issue_date) : null;
      if (idate) {
        const key = monthKey(idate);
        if (map[key]) map[key].invoiced += num(inv.total) || num(inv.amount);
      }
      for (const p of inv.payments || []) {
        const pdate = p.date ? new Date(p.date) : null;
        if (pdate) {
          const key = monthKey(pdate);
          if (map[key]) map[key].collected += num(p.amount);
        }
      }
    }
    for (const m of Object.values(map)) {
      (m as any).outstanding = round2((m as any).invoiced - (m as any).collected);
    }
    return Object.values(map);
  }

  private computePayables(trips: TripRow[], tripCostsFromInvoices: any, expenses: any[], settlements: any[], companyId?: string | null) {
    // AP = carrier/subcontractor trip costs (unpaid) + driver settlements not yet paid.
    let carrierCosts = 0;
    const carrierItems: Record<string, { description: string; amount: number; tripId: string | null; date: string | null; status: string }> = {};
    for (const t of trips) {
      for (const c of (t.costs || [])) {
        const name = isCarrierCost(c);
        if (name) {
          const amt = num(c.amount);
          carrierCosts += amt;
          const key = `${name}-${t.id}`;
          carrierItems[key] = {
            description: name, amount: amt, tripId: t.id,
            date: new Date(t.created_at).toISOString(), status: 'unpaid',
          };
        }
      }
    }
    let settlementPay = 0;
    let settlementItems: any[] = [];
    for (const s of settlements || []) {
      const net = num(s.net_pay) || 0;
      if (String(s.status).toLowerCase() !== 'paid' && net > 0) {
        settlementPay += net;
        settlementItems.push({ description: `Settlement ${s.driver_name || ''} ${s.month || ''}/${s.year || ''}`.trim(), amount: net, date: null, status: s.status });
      }
    }
    const total = round2(carrierCosts + settlementPay);
    return {
      total,
      carrierCosts: round2(carrierCosts),
      overdue: 0,
      items: [...Object.values(carrierItems).map(i => ({ ...i, amount: round2(i.amount) })), ...settlementItems].sort((a, b) => b.amount - a.amount),
    };
  }

  private computeCashflow(f: AnalyticsFilters, period: PeriodRange, invoices: any, payables: any, settlements: any, companyId?: string | null) {
    // Opening balance: cumulative collected vs paid-out before the period start.
    let incomingReceived = 0, outgoingActual = 0;
    for (const inv of invoices?.invoices || []) {
      for (const p of inv.payments || []) {
        if (this.inRange(p.date, period)) incomingReceived += num(p.amount);
      }
    }
    for (const s of settlements || []) {
      if (String(s.status).toLowerCase() === 'paid') outgoingActual += num(s.net_pay) || 0;
    }
    // expected incoming = outstanding receivables (AR) due
    const expectedIncoming = this.computeAging(invoices?.invoices || []).totalOutstanding;
    const expectedOutgoing = payables.total;
    const opening = 0; // no bank/accounting integration yet — documented limitation
    const closing = round2(opening + incomingReceived - outgoingActual + expectedIncoming - expectedOutgoing);
    // projection across next 3 months
    const projection: any[] = [];
    const cur = new Date(period.from);
    for (let i = 0; i < 3; i++) {
      const dues = this.computeAging(invoices?.invoices || []).openInvoices;
      projection.push({
        period: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
        expectedIncoming: round2(expectedIncoming / 3),
        expectedOutgoing: round2(expectedOutgoing / 3),
        balance: 0,
      });
      cur.setMonth(cur.getMonth() + 1);
    }
    return {
      methods: ['operational_cash_in', 'operational_cash_out', 'ar_expected', 'ap_expected'],
      openingBalance: opening,
      actualIncoming: round2(incomingReceived),
      actualOutgoing: round2(outgoingActual),
      expectedIncoming: round2(expectedIncoming),
      expectedOutgoing: round2(expectedOutgoing),
      projectedBalance: closing,
      projection,
    };
  }

  private tripFinancialsRow(t: TripRow) {
    const revenue = tripRevenue(t);
    const cost = tripDirectCost(t);
    const profit = tripProfit(t);
    const km = tripDistance(t);
    return {
      id: t.id, status: t.status, tripNumber: null, date: t.created_at,
      truck: t.truck_plate, driver: t.driver_name, km: round2(km),
      loadedKm: num(t.order_count) > 0 ? round2(km) : 0, emptyKm: num(t.order_count) === 0 ? round2(km) : 0,
      revenue, cost: round2(cost), profit: round2(profit),
      margin: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    };
  }

  private sumRows(rows: any[]) {
    let revenue = 0, cost = 0, profit = 0, km = 0;
    for (const r of rows) {
      revenue += r.revenue; cost += r.cost; profit += r.profit; km += r.km;
    }
    return {
      revenue: round2(revenue), cost: round2(cost), profit: round2(profit),
      margin: revenue > 0 ? round2((profit / revenue) * 100) : 0, km: round2(km),
      loadedKm: round2(rows.reduce((s, r) => s + r.loadedKm, 0)),
      emptyKm: round2(rows.reduce((s, r) => s + r.emptyKm, 0)),
    };
  }

  private otifPct(orders: OrderRow[]): number | null {
    let total = 0, good = 0;
    for (const o of orders) {
      if (ORDER_DELIVERED.has(String(o.status).toLowerCase()) && o.actual_delivery_at && o.requested_delivery_at) {
        total++;
        if (isOnTime(o.actual_delivery_at, o.requested_delivery_at)) good++;
      }
    }
    return total > 0 ? round2((good / total) * 100) : null;
  }

  // =========================================================================
  // Exceptions center
  // =========================================================================
  private async computeExceptions(f: AnalyticsFilters, period: PeriodRange, data: any, companyId?: string | null) {
    const exceptions: any[] = [];
    const now = new Date();
    const orders: OrderRow[] = data.orders;
    const trips: TripRow[] = data.trips;

    const push = (e: any) => { if (e) exceptions.push(e); };

    // 1. Unassigned orders (still to be planned)
    for (const o of orders) {
      const st = String(o.status).toLowerCase();
      if (!o.tripId && (st === 'new' || st === 'draft' || st === 'received' || st === 'pending')) {
        push({
          id: `uo-${o.id}`, type: 'unassigned_order', severity: 'medium',
          timestamp: o.created_at, client: o.client_name, clientId: o.clientId,
          orderId: o.id, orderNumber: o.order_number, tripId: null, vehicleId: null, driverId: null,
          status: st, message: `order ${o.order_number || ''} not yet assigned to a trip`,
        });
      }
    }

    // 2. Late deliveries
    for (const o of orders) {
      const st = String(o.status).toLowerCase();
      const late = o.is_late === true || String(o.is_late) === 'true' || num(o.late_minutes) > 0;
      if (ORDER_DELIVERED.has(st) && late) {
        const trip = trips.find(t => t.id === o.tripId) || null;
        push({
          id: `ld-${o.id}`, type: 'late_delivery', severity: 'high',
          timestamp: o.actual_delivery_at || o.created_at,
          client: o.client_name, clientId: o.clientId, orderId: o.id, orderNumber: o.order_number,
          tripId: o.tripId, vehicleId: trip?.truckId || null, driverId: trip?.driverId || null,
          status: st, lateMinutes: num(o.late_minutes),
          message: `delivery ${num(o.late_minutes)} min late`,
        });
      }
    }

    // 3. Overdue open orders (promised but not delivered)
    for (const o of orders) {
      const st = String(o.status).toLowerCase();
      if (ORDER_DELIVERED.has(st) || st === 'cancelled') continue;
      if (o.requested_delivery_at && new Date(o.requested_delivery_at).getTime() < now.getTime()) {
        const mins = Math.round((now.getTime() - new Date(o.requested_delivery_at).getTime()) / 60000);
        const trip = trips.find(t => t.id === o.tripId) || null;
        push({
          id: `oo-${o.id}`, type: 'overdue_open_order', severity: 'high',
          timestamp: o.requested_delivery_at, client: o.client_name, clientId: o.clientId,
          orderId: o.id, orderNumber: o.order_number, tripId: o.tripId,
          vehicleId: trip?.truckId || null, driverId: trip?.driverId || null,
          status: st, lateMinutes: mins, message: `delivery deadline exceeded by ${Math.round(mins / 60)}h`,
        });
      }
    }

    // 4. Delayed trips (planned arrival passed, not completed)
    for (const t of trips) {
      const st = String(t.status).toLowerCase();
      if (TRIP_COMPLETED.has(st) || st === 'cancelled') continue;
      if (t.plannedArrival && !t.actualArrival && new Date(t.plannedArrival).getTime() < now.getTime()) {
        const mins = Math.round((now.getTime() - new Date(t.plannedArrival).getTime()) / 60000);
        push({
          id: `dt-${t.id}`, type: 'trip_delayed', severity: 'high',
          timestamp: t.plannedArrival, client: null, clientId: null, orderId: null,
          orderNumber: null, tripId: t.id, vehicleId: t.truckId, driverId: t.driverId,
          status: st, lateMinutes: mins, message: `trip arrival overdue by ${Math.round(mins / 60)}h`,
        });
      }
    }

    // 5. ETA breaches at stop level
    for (const s of data.tripStops || []) {
      if (s.etaStatus === 'delayed' && s.status === 'pending') {
        push({
          id: `eta-${s.tripId}-${s.sequence}`, type: 'eta_breach', severity: 'medium',
          timestamp: s.eta, client: null, clientId: null, orderId: null, orderNumber: null,
          tripId: s.tripId, vehicleId: null, driverId: null, status: 'pending',
          message: 'stop ETA breached (delayed)',
        });
      }
    }

    // 6. Negative-margin completed trips
    for (const t of trips) {
      if (TRIP_COMPLETED.has(String(t.status).toLowerCase()) && tripProfit(t) < 0) {
        push({
          id: `neg-${t.id}`, type: 'negative_margin', severity: 'medium',
          timestamp: t.created_at, client: null, clientId: null, orderId: null, orderNumber: null,
          tripId: t.id, vehicleId: t.truckId, driverId: t.driverId, status: t.status,
          amount: round2(tripProfit(t)), message: `trip margin is negative (${round2(tripProfit(t))} €)`,
        });
      }
    }

    // 7. Missing POD on delivered orders
    let podMissing = 0;
    for (const o of orders) {
      if (ORDER_DELIVERED.has(String(o.status).toLowerCase()) && !o.has_pod) {
        podMissing++;
        if (exceptions.length < 400) push({
          id: `pod-${o.id}`, type: 'missing_pod', severity: 'low',
          timestamp: o.actual_delivery_at || o.created_at, client: o.client_name, clientId: o.clientId,
          orderId: o.id, orderNumber: o.order_number, tripId: o.tripId,
          vehicleId: null, driverId: null, status: o.status, message: 'delivered order has no POD document',
        });
      }
    }
    const _podCount = podMissing;

    // 8. Customer SLA breaches (OTIF below company service target / 90%)
    const customerTable = this.computeCustomerTable(trips, orders);
    for (const c of customerTable) {
      if (c.otif !== null && c.revenue > 0 && c.otif < 90) {
        push({
          id: `sla-${c.id}`, type: 'customer_sla_breach', severity: 'medium',
          timestamp: null, client: c.name, clientId: c.id, orderId: null, orderNumber: null,
          tripId: null, vehicleId: null, driverId: null, status: 'active',
          otif: c.otif, message: `customer OTIF below 90% target (${round2(c.otif)}%)`,
        });
      }
    }

    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return exceptions
      .sort((a: any, b: any) => {
        const d = (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9);
        return d !== 0 ? d : new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      })
      .slice(0, f.limit ? num(f.limit) : 200);
  }
}

function tripRevenueArr(trips: TripRow[]) { return round2(trips.reduce((s, t) => s + tripRevenue(t), 0)); }
function tripCostArr(trips: TripRow[]) { return round2(trips.reduce((s, t) => s + tripDirectCost(t), 0)); }
function tripProfitArr(trips: TripRow[]) { return round2(trips.reduce((s, t) => s + tripProfit(t), 0)); }

function paramsRangeKeys(d: any, map: Record<string, any>): string[] {
  const date = d ? new Date(d) : null;
  if (!date) return Object.keys(map);
  const key = bucketKeyForDate(date, 'month');
  return map[key] ? [key] : [];
}

function prevSeriesTotal(prevMap: Record<string, any>, field: string): number {
  return Object.values(prevMap).reduce((s: number, m: any) => s + num(m[field]), 0);
}