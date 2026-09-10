import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TripsService } from '../trips/trips.service';
import { TrucksService } from '../trucks/trucks.service';
import { DriversService } from '../drivers/drivers.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AnalyticsQuery {
  from?: string;
  to?: string;
  granularity?: 'day' | 'week' | 'month';
  clientId?: string;
  truckId?: string;
  driverId?: string;
}

const ORDER_DELIVERED = new Set(['delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'closed']);
const ORDER_ACTIVE = new Set(['planned', 'assigned', 'loading', 'in_transit', 'dispatched']);
const ORDER_TOPLAN = new Set(['new', 'draft', 'received', 'pending']);
const TRIP_COMPLETED = new Set(['completed', 'closed']);
const TRIP_ACTIVE = new Set([
  'planned', 'dispatched', 'assigned', 'confirmed', 'driver_received', 'driver_accepted',
  'started', 'loading', 'driving', 'in_transit', 'partially_delivered',
]);

function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isoWeek(d: Date): { year: number; week: number } {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: date.getUTCFullYear(), week };
}

function weekKey(d: Date): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function buildBuckets(from: Date, to: Date, granularity: 'day' | 'week' | 'month', extra = {}) {
  const map: Record<string, any> = {};
  if (granularity === 'day') {
    const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (cur <= to) {
      const key = isoDay(cur);
      map[key] = {
        key, label: isoDay(cur), year: cur.getFullYear(),
        orders: 0, ordersDelivered: 0, ordersDelayed: 0,
        trips: 0, tripsCompleted: 0, km: 0, revenue: 0, margin: 0, ...extra,
      };
      cur.setDate(cur.getDate() + 1);
    }
  } else if (granularity === 'week') {
    const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
    while (cur <= to) {
      const key = weekKey(cur);
      map[key] = {
        key, label: `W${String(isoWeek(cur).week).padStart(2, '0')}`, year: cur.getFullYear(),
        orders: 0, ordersDelivered: 0, ordersDelayed: 0,
        trips: 0, tripsCompleted: 0, km: 0, revenue: 0, margin: 0, ...extra,
      };
      cur.setDate(cur.getDate() + 7);
    }
  } else {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const key = monthKey(cur);
      map[key] = {
        key, label: cur.toLocaleString('ro-RO', { month: 'short' }), year: cur.getFullYear(),
        orders: 0, ordersDelivered: 0, ordersDelayed: 0,
        trips: 0, tripsCompleted: 0, km: 0, revenue: 0, margin: 0, ...extra,
      };
      cur.setMonth(cur.getMonth() + 1);
    }
  }
  return map;
}

const ORDERS_SQL = `
  SELECT o.id, o.created_at, o.status, o."tripId", o."clientId",
    o.requested_delivery_at, o.actual_delivery_at, o.is_late, o.late_minutes,
    o."transportType" AS transport_type, o.priority,
    o.origin_country, o.destination_country, o.origin_city, o.destination_city,
    o.order_number, COALESCE(o.price::float, 0) AS price,
    c.name AS client_name
  FROM orders o
  LEFT JOIN clients c ON c.id = o."clientId"
  LEFT JOIN trips tr ON tr.id = o."tripId"
  WHERE o.created_at BETWEEN $1 AND $2
    AND ($3::uuid IS NULL OR o."clientId" = $3)
    AND ($4::uuid IS NULL OR tr."truckId" = $4)
    AND ($5::uuid IS NULL OR tr."driverId" = $5)
  ORDER BY o.created_at ASC`;

const TRIPS_SQL = `
  SELECT t.id, t.created_at, t.status, t."truckId", t."driverId",
    t."plannedArrival", t."actualArrival",
    COALESCE(t.distance_km, t."distanceKm")::float AS dist,
    COALESCE(t.revenue_amount, t."estimatedProfit", 0)::float AS revenue,
    COALESCE(t.cost_amount, t."estimatedCost", 0)::float AS cost,
    COALESCE(t.margin_amount, t."actualProfit", 0)::float AS margin,
    t.trip_number
  FROM trips t
  WHERE t.created_at BETWEEN $1 AND $2
    AND ($4::uuid IS NULL OR t."truckId" = $4)
    AND ($5::uuid IS NULL OR t."driverId" = $5)
    AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = t.id AND o."clientId" = $3))
  ORDER BY t.created_at ASC`;

const COUNTRY_SQL = `
  SELECT s.type, s.country, count(*)::int AS n
  FROM order_stops s
  JOIN orders o ON o.id = s."orderId"
  LEFT JOIN trips tr ON tr.id = o."tripId"
  WHERE o.created_at BETWEEN $1 AND $2
    AND ($3::uuid IS NULL OR o."clientId" = $3)
    AND ($4::uuid IS NULL OR tr."truckId" = $4)
    AND ($5::uuid IS NULL OR tr."driverId" = $5)
    AND s.country IS NOT NULL AND s.country <> ''
  GROUP BY s.type, s.country
  ORDER BY n DESC`;

@Injectable()
export class DashboardService {
  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private tripsService: TripsService,
    private trucksService: TrucksService,
    private driversService: DriversService,
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
  ) {}

  async getSummary() {
    const [stats, monthlyProfits, trucks, overdueInvoices, expiringTruckDocs, expiringDriverDocs, allTrips] = await Promise.all([
      this.tripsService.getStats(),
      this.tripsService.getMonthlyProfits(),
      this.trucksService.findAll(),
      this.invoicesService.getOverdue(),
      this.trucksService.getExpiringDocuments(30),
      this.driversService.getExpiringDocuments(30),
      this.tripsService.findAllForDashboard(),
    ]);
    const activeTrucks = trucks.filter(t => t.status === 'active' || t.status === 'in_trip').length;

    const routeProfits: Record<string, number> = {};
    const clientProfits: Record<string, { name: string, profit: number }> = {};
    const truckProfits: Record<string, { name: string, profit: number }> = {};
    const driverProfits: Record<string, { name: string, profit: number }> = {};

    const routeLabel = (t: any): string => {
      const stops = (t.stops || []).slice().sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1));
      if (!stops.length) return t.tripNumber || 'N/A';
      const loc = (st: any) => [st.city, st.country].filter(Boolean).join(', ') || st.companyName || st.address || '—';
      return `${loc(stops[0])} ➔ ${loc(stops[stops.length - 1])}`;
    };

    allTrips.forEach(t => {
      // Using Actual Profit when available, otherwise Estimated
      const tripProfit = Number(t.actualProfit) || Number(t.estimatedProfit) || 0;

      if (tripProfit !== 0) {
        // Real route breakdown from stops (first = origin, last = destination)
        const routeKey = routeLabel(t);
        routeProfits[routeKey] = (routeProfits[routeKey] || 0) + tripProfit;

        // Per truck profit
        if (t.truck?.id) {
          if (!truckProfits[t.truck.id]) truckProfits[t.truck.id] = { name: t.truck.plateNumber || 'Camion', profit: 0 };
          truckProfits[t.truck.id].profit += tripProfit;
        }

        // Per driver profit
        if (t.driver?.id) {
          const dName = t.driver?.user?.name || 'Șofer';
          if (!driverProfits[t.driver.id]) driverProfits[t.driver.id] = { name: dName, profit: 0 };
          driverProfits[t.driver.id].profit += tripProfit;
        }

        // Per client profit: split trip profit proportionally across the trip's orders
        const orders = (t.orders || []).filter((o: any) => o.client?.id);
        if (orders.length) {
          const share = tripProfit / orders.length;
          orders.forEach((o: any) => {
            const cId = o.client.id;
            if (!clientProfits[cId]) clientProfits[cId] = { name: o.client.companyName || o.client.name || 'Client', profit: 0 };
            clientProfits[cId].profit += share;
          });
        }
      }
    });

    const profitByRoute = Object.entries(routeProfits)
      .map(([route, profit]) => ({ route, profit }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 routes

    const topClients = Object.values(clientProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 clients

    const profitByTruck = Object.values(truckProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 trucks

    const profitByDriver = Object.values(driverProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5); // top 5 drivers

    // Aggregate expiring docs
    const expiringDocs: any[] = [];
    
    // Truck docs
    expiringTruckDocs.forEach(d => {
      expiringDocs.push({
        id: `td_${d.id}`,
        title: `${d.truck?.plateNumber} — ${d.type}`,
        expiryDate: d.expiryDate
      });
    });

    // Driver docs
    if (expiringDriverDocs.documents) {
      expiringDriverDocs.documents.forEach(d => {
        expiringDocs.push({
          id: `dd_${d.id}`,
          title: `${d.driver?.user?.name} — ${d.type}`,
          expiryDate: d.expiryDate
        });
      });
    }

    // Driver specific expiries (license, medical, tacho)
    if (expiringDriverDocs.drivers) {
      const future = new Date();
      future.setDate(future.getDate() + 30);
      
      expiringDriverDocs.drivers.forEach(d => {
        if (d.licenseExpiry && new Date(d.licenseExpiry) <= future) {
          expiringDocs.push({
            id: `dl_${d.id}`,
            title: `${d.user?.name} — Permis`,
            expiryDate: d.licenseExpiry
          });
        }
        if (d.medicalExpiry && new Date(d.medicalExpiry) <= future) {
          expiringDocs.push({
            id: `dm_${d.id}`,
            title: `${d.user?.name} — Aviz Medical`,
            expiryDate: d.medicalExpiry
          });
        }
        if (d.tachoCardExpiry && new Date(d.tachoCardExpiry) <= future) {
          expiringDocs.push({
            id: `dt_${d.id}`,
            title: `${d.user?.name} — Card Tahograf`,
            expiryDate: d.tachoCardExpiry
          });
        }
      });
    }

    // Sort all by expiry date
    expiringDocs.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    for (const doc of expiringDocs) {
      await this.notificationsService.create({
        type: 'document',
        title: 'notif_doc_expiring_title',
        message: doc.title,
        relatedId: doc.id,
      });
    }

    return { stats: { ...stats, activeTrucks }, monthlyProfits, overdueInvoices, expiringDocs, profitByRoute, topClients, profitByTruck, profitByDriver };
  }

  async getAnalytics(q: AnalyticsQuery = {}) {
    const granularity: 'day' | 'week' | 'month' = q.granularity === 'day' || q.granularity === 'week' ? q.granularity : 'month';
    const now = new Date();
    const to = q.to ? new Date(q.to + 'T23:59:59.999') : now;
    const from = q.from ? new Date(q.from + 'T00:00:00.000') : (() => { const d = new Date(to); d.setDate(d.getDate() - 89); return d; })();
    const spanMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);

    const client = q.clientId || null;
    const truck = q.truckId || null;
    const driver = q.driverId || null;
    const P = [from, to, client, truck, driver];
    const PP = [prevFrom, prevTo, client, truck, driver];

    const [curOrders, prevOrders, curTrips, prevTrips, countryRows, truckRows, driverRows] = await Promise.all([
      this.dataSource.query(ORDERS_SQL, P),
      this.dataSource.query(ORDERS_SQL, PP),
      this.dataSource.query(TRIPS_SQL, P),
      this.dataSource.query(TRIPS_SQL, PP),
      this.dataSource.query(COUNTRY_SQL, P),
      this.dataSource.query(`SELECT id, "plateNumber" AS name FROM trucks`),
      this.dataSource.query(`SELECT d.id, COALESCE(u.name, concat_ws(' ', d.first_name, d.last_name)) AS name FROM drivers d LEFT JOIN users u ON u.id = d."userId"`),
    ]);

    const curMap = buildBuckets(from, to, granularity);
    const prevMap = buildBuckets(prevFrom, prevTo, granularity);

    // ---- Orders aggregation ----
    let ordersTotal = 0, ordersDelivered = 0, ordersToPlan = 0, ordersInProgress = 0, ordersCancelled = 0;
    let ordersDelayed = 0, ordersOverdueOpen = 0;
    let otifOGood = 0, otifOTotal = 0, otifOLateMin = 0, otifOLateN = 0;
    let gtv = 0;
    const byClient: Record<string, any> = {};
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const delayedOrderList: any[] = [];

    for (const o of curOrders) {
      const created = new Date(o.created_at);
      const key = granularity === 'day' ? isoDay(created) : granularity === 'week' ? weekKey(created) : monthKey(created);
      const status = (o.status || '').toLowerCase();
      const lateMin = num(o.late_minutes);
      const isDelivered = ORDER_DELIVERED.has(status);
      const isCancelled = status === 'cancelled';

      ordersTotal++;
      gtv += num(o.price);

      if (curMap[key]) curMap[key].orders += 1;
      if (isDelivered) { ordersDelivered++; if (curMap[key]) curMap[key].ordersDelivered += 1; }
      else if (isCancelled) {
        ordersCancelled++;
      } else if (ORDER_ACTIVE.has(status)) {
        ordersInProgress++;
        if (!o.tripId && ORDER_TOPLAN.has(status)) ordersToPlan++;
      } else if (ORDER_TOPLAN.has(status) && !o.tripId) {
        ordersToPlan++;
      }

      const isLate = o.is_late === true || (o.is_late && String(o.is_late) === 'true') || lateMin > 0;
      if (isLate) ordersDelayed++;
      else if (!isDelivered && !isCancelled && o.requested_delivery_at && new Date(o.requested_delivery_at).getTime() < Date.now()) {
        ordersDelayed++; ordersOverdueOpen++;
      }
      if (curMap[key] && isLate) curMap[key].ordersDelayed += 1;

      // OTIF (order landed vs promised)
      if (o.actual_delivery_at && o.requested_delivery_at) {
        otifOTotal++;
        const lateMs = new Date(o.actual_delivery_at).getTime() - new Date(o.requested_delivery_at).getTime();
        if (lateMs <= 0) otifOGood += 1;
        if (lateMs > 0) { otifOLateMin += lateMs / 60000; otifOLateN++; }
      }

      // Per client
      const cId = o.clientId;
      if (cId) {
        if (!byClient[cId]) byClient[cId] = { id: cId, name: o.client_name || '—', orders: 0, delivered: 0, delayed: 0, toPlan: 0, gtv: 0, otifGood: 0, otifTotal: 0 };
        byClient[cId].orders++;
        byClient[cId].gtv += num(o.price);
        if (isDelivered) byClient[cId].delivered++;
        if (isLate) byClient[cId].delayed++;
        if (o.actual_delivery_at && o.requested_delivery_at) {
          byClient[cId].otifTotal++;
          if (new Date(o.actual_delivery_at).getTime() <= new Date(o.requested_delivery_at).getTime()) byClient[cId].otifGood++;
        }
      }

      byType[o.transport_type || 'ftl'] = (byType[o.transport_type || 'ftl'] || 0) + 1;
      byPriority[o.priority || 'normal'] = (byPriority[o.priority || 'normal'] || 0) + 1;

      if (isLate && delayedOrderList.length < 8) {
        delayedOrderList.push({
          orderNumber: o.order_number || o.id.slice(0, 8),
          client: o.client_name || '—',
          route: `${o.origin_country || ''} → ${o.destination_country || ''}`.trim(),
          requested: o.requested_delivery_at,
          lateMinutes: lateMin,
          status,
        });
      }
    }
    delayedOrderList.sort((a, b) => b.lateMinutes - a.lateMinutes);

    // ---- Trips aggregation ----
    let tripsTotal = 0, tripsCompleted = 0, tripsActive = 0, tripsToPlan = 0, tripsCancelled = 0, tripsDelayed = 0;
    let otifTGood = 0, otifTArrived = 0, otifTLateMin = 0, otifTLateN = 0;
    let km = 0, revenue = 0, margin = 0;
    const byTruck: Record<string, any> = {};
    const byDriver: Record<string, any> = {};

    for (const t of curTrips) {
      const created = new Date(t.created_at);
      const key = granularity === 'day' ? isoDay(created) : granularity === 'week' ? weekKey(created) : monthKey(created);
      const status = (t.status || '').toLowerCase();
      const dist = num(t.dist);
      const rev = num(t.revenue);
      const mg = num(t.margin);
      const isCompleted = TRIP_COMPLETED.has(status);
      const isCancelled = status === 'cancelled';

      tripsTotal++;
      km += dist;
      revenue += rev;
      margin += mg;
      if (curMap[key]) curMap[key].trips += 1;
      if (isCompleted) { tripsCompleted++; if (curMap[key]) curMap[key].tripsCompleted += 1; }
      else if (isCancelled) tripsCancelled++;
      else if (TRIP_ACTIVE.has(status)) tripsActive++;
      if (status === 'planning' || status === 'unplanned') tripsToPlan++;

      // OTIF (trip vs planned arrival)
      if (t.plannedArrival && t.actualArrival) {
        otifTArrived++;
        const lateMs = new Date(t.actualArrival).getTime() - new Date(t.plannedArrival).getTime();
        if (lateMs <= 0) otifTGood += 1;
        else { otifTLateMin += lateMs / 60000; otifTLateN++; }
      }
      if (!isCompleted && !isCancelled && t.plannedArrival && !t.actualArrival && new Date(t.plannedArrival).getTime() < Date.now()) {
        tripsDelayed++;
      }

      if (t.truckId) {
        if (!byTruck[t.truckId]) byTruck[t.truckId] = { id: t.truckId, name: '—', trips: 0, km: 0, completed: 0, delayed: 0, margin: 0 };
        byTruck[t.truckId].trips++;
        byTruck[t.truckId].km += dist;
        byTruck[t.truckId].margin += mg;
        if (isCompleted) byTruck[t.truckId].completed++;
      }
      if (t.driverId) {
        if (!byDriver[t.driverId]) byDriver[t.driverId] = { id: t.driverId, name: '—', trips: 0, km: 0, completed: 0, delayed: 0, margin: 0 };
        byDriver[t.driverId].trips++;
        byDriver[t.driverId].km += dist;
        byDriver[t.driverId].margin += mg;
        if (isCompleted) byDriver[t.driverId].completed++;
      }
    }

    const truckNameMap: Record<string, string> = {};
    for (const r of truckRows) truckNameMap[r.id] = r.name;
    const driverNameMap: Record<string, string> = {};
    for (const r of driverRows) driverNameMap[r.id] = r.name;
    for (const k of Object.keys(byTruck)) byTruck[k].name = truckNameMap[k] || byTruck[k].name;
    for (const k of Object.keys(byDriver)) byDriver[k].name = driverNameMap[k] || byDriver[k].name;

    // ---- Previous period totals ----
    let prevOrdersTotal = 0, prevOrdersDelivered = 0, prevOrdersDelayed = 0;
    let prevTripsTotal = 0, prevTripsCompleted = 0;
    let prevOtifTArrived = 0, prevOtifTGood = 0, prevOtifOArrived = 0, prevOtifOGood = 0;
    for (const o of prevOrders) {
      prevOrdersTotal++;
      const status = (o.status || '').toLowerCase();
      if (ORDER_DELIVERED.has(status)) prevOrdersDelivered++;
      if (o.is_late === true || num(o.late_minutes) > 0) prevOrdersDelayed++;
      if (o.actual_delivery_at && o.requested_delivery_at) {
        prevOtifOArrived++;
        if (new Date(o.actual_delivery_at).getTime() <= new Date(o.requested_delivery_at).getTime()) prevOtifOGood++;
      }
      const created = new Date(o.created_at);
      const key = granularity === 'day' ? isoDay(created) : granularity === 'week' ? weekKey(created) : monthKey(created);
      if (prevMap[key]) prevMap[key].orders += 1;
      if (ORDER_DELIVERED.has(status) && prevMap[key]) prevMap[key].ordersDelivered += 1;
    }
    for (const t of prevTrips) {
      prevTripsTotal++;
      const status = (t.status || '').toLowerCase();
      if (TRIP_COMPLETED.has(status)) prevTripsCompleted++;
      if (t.plannedArrival && t.actualArrival) {
        prevOtifTArrived++;
        if (new Date(t.actualArrival).getTime() <= new Date(t.plannedArrival).getTime()) prevOtifTGood++;
      }
      const created = new Date(t.created_at);
      const key = granularity === 'day' ? isoDay(created) : granularity === 'week' ? weekKey(created) : monthKey(created);
      if (prevMap[key]) prevMap[key].trips += 1;
    }

    // ---- Country stats ----
    const pickup: Record<string, number> = {};
    const delivery: Record<string, number> = {};
    for (const r of countryRows) {
      if (r.type === 'pickup') pickup[r.country] = (pickup[r.country] || 0) + r.n;
      else delivery[r.country] = (delivery[r.country] || 0) + r.n;
    }
    const topPickup = Object.entries(pickup).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const topDelivery = Object.entries(delivery).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);
    const combined: Record<string, number> = {};
    for (const r of countryRows) combined[r.country] = (combined[r.country] || 0) + r.n;
    const topCombined = Object.entries(combined).map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 10);

    const otifTripsRate = otifTArrived > 0 ? (otifTGood / otifTArrived) * 100 : 0;
    const otifOrdersRate = otifOTotal > 0 ? (otifOGood / otifOTotal) * 100 : 0;
    const prevOtifTripsRate = prevOtifTArrived > 0 ? (prevOtifTGood / prevOtifTArrived) * 100 : null;
    const prevOtifOrdersRate = prevOtifOArrived > 0 ? (prevOtifOGood / prevOtifOArrived) * 100 : null;

    const series = Object.values(curMap).map(m => ({ ...m }));
    const previousSeries = Object.values(prevMap).map(m => ({ ...m }));
    const last = series[series.length - 1];

    const byClientArr = Object.values(byClient)
      .map((c: any) => ({ ...c, otif: c.otifTotal > 0 ? (c.otifGood / c.otifTotal) * 100 : null }))
      .sort((a: any, b: any) => b.orders - a.orders);

    const byTruckArr = Object.values(byTruck)
      .map((t: any) => ({ ...t, marginPerKm: t.km > 0 ? t.margin / t.km : 0 }))
      .sort((a: any, b: any) => b.margin - a.margin);

    const byDriverArr = Object.values(byDriver)
      .map((t: any) => ({ ...t, marginPerKm: t.km > 0 ? t.margin / t.km : 0 }))
      .sort((a: any, b: any) => b.margin - a.margin);

    return {
      period: { from, to },
      comparison: { from: prevFrom, to: prevTo },
      granularity,
      kpis: {
        ordersTotal, ordersDelivered, ordersToPlan, ordersInProgress, ordersCancelled, ordersDelayed, ordersOverdueOpen, gtv,
        tripsTotal, tripsCompleted, tripsActive, tripsToPlan, tripsCancelled, tripsDelayed,
        km, revenue, margin, avgTripKm: tripsTotal > 0 ? km / tripsTotal : 0,
        otifTrips: { good: otifTGood, arrived: otifTArrived, rate: otifTripsRate, avgLateMin: otifTLateN > 0 ? otifTLateMin / otifTLateN : 0 },
        otifOrders: { good: otifOGood, arrived: otifOTotal, rate: otifOrdersRate, avgLateMin: otifOLateN > 0 ? otifOLateMin / otifOLateN : 0 },
      },
      trends: {
        ordersTotal: pctChange(ordersTotal, prevOrdersTotal),
        ordersDelivered: pctChange(ordersDelivered, prevOrdersDelivered),
        ordersDelayed: pctChange(ordersDelayed, prevOrdersDelayed),
        tripsTotal: pctChange(tripsTotal, prevTripsTotal),
        tripsCompleted: pctChange(tripsCompleted, prevTripsCompleted),
        otifTripsRate: prevOtifTripsRate !== null ? otifTripsRate - prevOtifTripsRate : null,
        otifOrdersRate: prevOtifOrdersRate !== null ? otifOrdersRate - prevOtifOrdersRate : null,
      },
      series,
      previousSeries,
      ordersByStatus: [
        { status: 'delivered', count: ordersDelivered },
        { status: 'in_progress', count: ordersInProgress },
        { status: 'to_plan', count: ordersToPlan },
        { status: 'delayed', count: ordersDelayed },
        { status: 'cancelled', count: ordersCancelled },
      ],
      pipeline: {
        toPlan: ordersToPlan,
        inProgress: ordersInProgress,
        delivered: ordersDelivered,
        cancelled: ordersCancelled,
        total: ordersTotal,
      },
      tripsByStatus: [
        { status: 'completed', count: tripsCompleted },
        { status: 'active', count: tripsActive },
        { status: 'to_plan', count: tripsToPlan },
        { status: 'delayed', count: tripsDelayed },
        { status: 'cancelled', count: tripsCancelled },
      ],
      byCountry: { pickup: topPickup, delivery: topDelivery, combined: topCombined },
      byClient: byClientArr,
      byTruck: byTruckArr,
      byDriver: byDriverArr,
      byTransportType: Object.entries(byType).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
      byPriority: Object.entries(byPriority).map(([priority, count]) => ({ priority, count })).sort((a, b) => b.count - a.count),
      delayedOrders: delayedOrderList,
      lastSeriesPoint: last ? { label: last.label, year: last.year } : null,
    };
  }
}
