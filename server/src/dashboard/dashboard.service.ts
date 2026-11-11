import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TripsService } from '../trips/trips.service';
import { TrucksService } from '../trucks/trucks.service';
import { DriversService } from '../drivers/drivers.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { resolveCreatedAtExpr } from '../analytics/analytics.utils';

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

// ---------------------------------------------------------------------------
// Operational overview vocabulary (dispatcher dashboard).
// ---------------------------------------------------------------------------
const TRIP_COMPLETED_OVERVIEW = new Set(['completed', 'closed', 'delivered']);
const TRIP_ON_ROAD_OVERVIEW = new Set([
  'started', 'at_pickup', 'loading', 'driving', 'at_delivery', 'unloading',
  'partially_delivered', 'in_transit', 'active',
]);
const ORDER_DELIVERED_OVERVIEW = new Set([
  'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'closed',
]);
const ORDER_OPEN_OVERVIEW = new Set([
  'draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'dispatched',
  'received', 'pending', 'ready_for_invoice',
]);

export interface OverviewFilters {
  truckId?: string | null;
  driverId?: string | null;
  clientId?: string | null;
  country?: string | null;
}

export interface OverviewQuery extends OverviewFilters {
  from?: string;
  to?: string;
  granularity?: string;
  /** Client-local date (YYYY-MM-DD) so "today" matches the dispatcher's day. */
  today?: string;
  companyId?: string | null;
}

export interface OverviewTrip {
  id: string;
  tripNumber: string | null;
  truckId: string | null;
  driverId: string | null;
  status: string;
  operationalStatus: string | null;
  createdAt: Date | null;
  plannedDeparture: Date | null;
  plannedArrival: Date | null;
  actualDeparture: Date | null;
  actualArrival: Date | null;
  distanceKm: number;
  etaStatus: string | null;
  trafficDelay: number;
  hasOpenIncident: boolean;
  fleetType: string | null;
  carrierName: string | null;
  truckPlate: string | null;
  truckStatus: string | null;
  driverName: string | null;
  driverStatus: string | null;
  originCity: string | null;
  originCountry: string | null;
  destCity: string | null;
  destCountry: string | null;
  orderCount: number;
  deliveredOrders: number;
  delayMinutes: number;
}

export interface OverviewAlert {
  id: string;
  type: 'delay' | 'unassigned' | 'incident' | 'document';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  subtitle: string | null;
  value: number | null;
  link: string;
}

export interface OverviewClientReliability {
  id: string;
  name: string;
  total: number;
  onTime: number;
  onTimeRate: number;
  avgDelay: number;
}

export interface OverviewLaneReliability {
  from: string;
  to: string;
  trips: number;
  onTime: number;
  onTimeRate: number;
  avgDelay: number;
}

export interface OverviewDriverHour {
  driverId: string | null;
  driverName: string;
  truckId: string | null;
  truckPlate: string;
  activity: string;
  drivingRemainingMin: number;
  weeklyRemainingMin: number;
  breakInMin: number;
  updatedAt: Date | null;
}

export interface OverviewTelemetry {
  total: number;
  online: number;
  offline: number;
  noDevice: number;
  stale: Array<{ id: string; plate: string; lastSeenAt: Date | null; status: string }>;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(d: Date): Date {
  const start = startOfDay(d);
  const offset = (start.getDay() + 6) % 7; // Monday-first week
  start.setDate(start.getDate() - offset);
  return start;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function daysUntil(d: Date): number {
  return Math.ceil((startOfDay(d).getTime() - startOfDay(new Date()).getTime()) / 86400000);
}

const ISO3_TO_ISO2: Record<string, string> = {
  AFG: 'AF', ALB: 'AL', DZA: 'DZ', AND: 'AD', AGO: 'AO', ARG: 'AR', ARM: 'AM', AUS: 'AU', AUT: 'AT', AZE: 'AZ',
  BHS: 'BS', BHR: 'BH', BGD: 'BD', BRB: 'BB', BLR: 'BY', BEL: 'BE', BLZ: 'BZ', BEN: 'BJ', BTN: 'BT', BOL: 'BO',
  BIH: 'BA', BWA: 'BW', BRA: 'BR', BRN: 'BN', BGR: 'BG', BFA: 'BF', BDI: 'BI', KHM: 'KH', CMR: 'CM', CAN: 'CA',
  CPV: 'CV', CAF: 'CF', TCD: 'TD', CHL: 'CL', CHN: 'CN', COL: 'CO', COM: 'KM', COG: 'CG', COD: 'CD', CRI: 'CR',
  HRV: 'HR', CUB: 'CU', CYP: 'CY', CZE: 'CZ', DNK: 'DK', DJI: 'DJ', DMA: 'DM', DOM: 'DO', ECU: 'EC', EGY: 'EG',
  SLV: 'SV', GNQ: 'GQ', ERI: 'ER', EST: 'EE', SWZ: 'SZ', ETH: 'ET', FJI: 'FJ', FIN: 'FI', FRA: 'FR', GAB: 'GA',
  GMB: 'GM', GEO: 'GE', DEU: 'DE', GHA: 'GH', GRC: 'GR', GRD: 'GD', GTM: 'GT', GIN: 'GN', GNB: 'GW', GUY: 'GY',
  HTI: 'HT', HND: 'HN', HUN: 'HU', ISL: 'IS', IND: 'IN', IDN: 'ID', IRN: 'IR', IRQ: 'IQ', IRL: 'IE', ISR: 'IL',
  ITA: 'IT', JAM: 'JM', JPN: 'JP', JOR: 'JO', KAZ: 'KZ', KEN: 'KE', KIR: 'KI', KWT: 'KW', KGZ: 'KG', LAO: 'LA',
  LVA: 'LV', LBN: 'LB', LSO: 'LS', LBR: 'LR', LBY: 'LY', LIE: 'LI', LTU: 'LT', LUX: 'LU', MDG: 'MG', MWI: 'MW',
  MYS: 'MY', MDV: 'MV', MLI: 'ML', MLT: 'MT', MHL: 'MH', MRT: 'MR', MUS: 'MU', MEX: 'MX', FSM: 'FM', MDA: 'MD',
  MCO: 'MC', MNG: 'MN', MNE: 'ME', MAR: 'MA', MOZ: 'MZ', MMR: 'MM', NAM: 'NA', NRU: 'NR', NPL: 'NP', NLD: 'NL',
  NZL: 'NZ', NIC: 'NI', NER: 'NE', NGA: 'NG', PRK: 'KP', MKD: 'MK', NOR: 'NO', OMN: 'OM', PAK: 'PK', PLW: 'PW',
  PAN: 'PA', PNG: 'PG', PRY: 'PY', PER: 'PE', PHL: 'PH', POL: 'PL', PRT: 'PT', QAT: 'QA', ROU: 'RO', RUS: 'RU',
  RWA: 'RW', KNA: 'KN', LCA: 'LC', VCT: 'VC', WSM: 'WS', SMR: 'SM', STP: 'ST', SAU: 'SA', SEN: 'SN', SRB: 'RS',
  SYC: 'SC', SLE: 'SL', SGP: 'SG', SVK: 'SK', SVN: 'SI', SLB: 'SB', SOM: 'SO', ZAF: 'ZA', KOR: 'KR', SSD: 'SS',
  ESP: 'ES', LKA: 'LK', SDN: 'SD', SUR: 'SR', SWE: 'SE', CHE: 'CH', SYR: 'SY', TWN: 'TW', TJK: 'TJ', TZA: 'TZ',
  THA: 'TH', TLS: 'TL', TGO: 'TG', TON: 'TO', TTO: 'TT', TUN: 'TN', TUR: 'TR', TKM: 'TM', TUV: 'TV', UGA: 'UG',
  UKR: 'UA', ARE: 'AE', GBR: 'GB', USA: 'US', URY: 'UY', UZB: 'UZ', VUT: 'VU', VAT: 'VA', VEN: 'VE', VNM: 'VN',
  YEM: 'YE', ZMB: 'ZM', ZWE: 'ZW',
};

const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB', 'great britain': 'GB', 'united states of america': 'US', usa: 'US', holland: 'NL',
  'czech republic': 'CZ', macedonia: 'MK', bosnia: 'BA', 'ivory coast': 'CI', 'south korea': 'KR',
  'north korea': 'KP', russia: 'RU', 'vatican city': 'VA', uae: 'AE',
};

const ALPHA2_ALIASES: Record<string, string> = {
  FX: 'FR', // Metropolitan France; Intl displays it as France
  UK: 'GB',
};

const COUNTRY_LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'];

function countryKey(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}

let countryNameIndex: Map<string, string> | null = null;

function getCountryNameIndex(): Map<string, string> {
  if (countryNameIndex) return countryNameIndex;
  const index = new Map<string, string>();
  for (const locale of COUNTRY_LOCALES) {
    try {
      const DisplayNames = (Intl as any).DisplayNames;
      if (!DisplayNames) continue;
      const display = new DisplayNames([locale], { type: 'region' });
      for (let first = 0; first < 26; first++) {
        for (let second = 0; second < 26; second++) {
          const code = String.fromCharCode(65 + first, 65 + second);
          try {
            const name = display.of(code);
            if (name && name !== code) index.set(countryKey(name), code);
          } catch { /* invalid region code */ }
        }
      }
    } catch { /* Intl.DisplayNames unavailable */ }
  }
  countryNameIndex = index;
  return index;
}

function normalizeCountryCode(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const alpha2Alias = ALPHA2_ALIASES[upper];
  if (alpha2Alias) return alpha2Alias;
  if (/^[A-Za-z]{2}$/.test(raw)) return upper;
  const iso3 = ISO3_TO_ISO2[upper];
  if (iso3) return iso3;
  const aliased = COUNTRY_ALIASES[countryKey(raw)];
  if (aliased) return aliased;
  const byName = getCountryNameIndex().get(countryKey(raw));
  return byName ? (ALPHA2_ALIASES[byName] || byName) : null;
}

function routePlace(city: string | null | undefined, country: string | null | undefined): string {
  const parts = [city, country].map((part) => String(part ?? '').trim()).filter(Boolean);
  return parts.join(', ');
}

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

const ORDERS_SQL = (oTs: string) => `
  SELECT o.id, ${oTs} AS created_at, o.status, o."tripId", o."clientId",
    o.requested_delivery_at, o.actual_delivery_at, o.is_late, o.late_minutes,
    o."transportType" AS transport_type, o.priority,
    o.origin_country, o.destination_country, o.origin_city, o.destination_city,
    o.order_number, COALESCE(o.price::float, 0) AS price,
    c.name AS client_name
  FROM orders o
  LEFT JOIN clients c ON c.id = o."clientId"
  LEFT JOIN trips tr ON tr.id = o."tripId"
  WHERE ${oTs} BETWEEN $1 AND $2
    AND ($3::uuid IS NULL OR o."clientId" = $3)
    AND ($4::uuid IS NULL OR tr."truckId" = $4)
    AND ($5::uuid IS NULL OR tr."driverId" = $5)
  ORDER BY 2 ASC`;

const TRIPS_SQL = (tTs: string) => `
  SELECT t.id, ${tTs} AS created_at, t.status, t."truckId", t."driverId",
    t."plannedArrival", t."actualArrival",
    COALESCE(NULLIF(TRIM(t.distance_km), '')::float, t."distanceKm"::float) AS dist,
    COALESCE(NULLIF(TRIM(t.revenue_amount), '')::float, t."estimatedProfit"::float, 0) AS revenue,
    COALESCE(NULLIF(TRIM(t.cost_amount), '')::float, t."estimatedCost"::float, 0) AS cost,
    COALESCE(NULLIF(TRIM(t.margin_amount), '')::float, t."actualProfit"::float, 0) AS margin,
    t.trip_number
  FROM trips t
  WHERE ${tTs} BETWEEN $1 AND $2
    AND ($4::uuid IS NULL OR t."truckId" = $4)
    AND ($5::uuid IS NULL OR t."driverId" = $5)
    AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM orders o WHERE o."tripId" = t.id AND o."clientId" = $3))
  ORDER BY 2 ASC`;

const COUNTRY_SQL = (oTs: string) => `
  SELECT s.type, s.country, count(*)::int AS n
  FROM order_stops s
  JOIN orders o ON o.id = s."orderId"
  LEFT JOIN trips tr ON tr.id = o."tripId"
  WHERE ${oTs} BETWEEN $1 AND $2
    AND ($3::uuid IS NULL OR o."clientId" = $3)
    AND ($4::uuid IS NULL OR tr."truckId" = $4)
    AND ($5::uuid IS NULL OR tr."driverId" = $5)
    AND s.country IS NOT NULL AND s.country <> ''
  GROUP BY s.type, s.country
  ORDER BY n DESC`;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly columnCache = new Map<string, Set<string>>();

  constructor(
    @InjectDataSource() private dataSource: DataSource,
    private tripsService: TripsService,
    private trucksService: TrucksService,
    private driversService: DriversService,
    private invoicesService: InvoicesService,
    private notificationsService: NotificationsService,
  ) {}

  /** Cached information_schema probe so raw SQL tolerates both column layouts. */
  private async tableColumns(table: string): Promise<Set<string>> {
    const cached = this.columnCache.get(table);
    if (cached) return cached;
    const rows: any[] = await this.dataSource.query(
      `SELECT column_name
         FROM information_schema.columns
        WHERE table_schema = current_schema() AND table_name = $1`,
      [table],
    ).catch(() => []);
    const cols = new Set<string>(rows.map((row) => String(row.column_name)));
    this.columnCache.set(table, cols);
    return cols;
  }

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

  // =========================================================================
  // OPERATIONAL OVERVIEW — the dispatcher dashboard.
  //
  // Deliberately contains no money: revenue, cost, margin and profit live in
  // the Financial module. Everything here is countable operational work:
  // trips, orders, kilometres, delays, fleet and driver availability.
  // =========================================================================
  async getOverview(q: OverviewQuery = {}) {
    const now = new Date();
    const granularity: 'day' | 'week' | 'month' =
      q.granularity === 'week' || q.granularity === 'month' ? q.granularity : 'day';

    const to = q.to ? new Date(`${q.to}T23:59:59.999`) : endOfDay(now);
    const from = q.from ? new Date(`${q.from}T00:00:00.000`) : startOfDay(now);
    const today = q.today ? startOfDay(new Date(`${q.today}T00:00:00`)) : startOfDay(now);
    const todayEnd = endOfDay(today);
    const horizonEnd = endOfDay(addDays(today, 7));
    const weekStart = startOfWeek(today);
    const weekEnd = endOfDay(addDays(weekStart, 6));
    const companyId = q.companyId || null;
    const filters: Required<OverviewFilters> = {
      truckId: q.truckId || null,
      driverId: q.driverId || null,
      clientId: q.clientId || null,
      country: q.country ? String(q.country).toUpperCase() : null,
    };

    const spanMs = Math.max(0, to.getTime() - from.getTime());
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - spanMs);

    // When the selected range contains today, the trip window also covers the
    // current ISO week so a one-day range still has a meaningful trend chart.
    // A range entirely in the past is loaded exactly as requested.
    const includeWeek = today.getTime() >= from.getTime() && today.getTime() <= to.getTime();
    const loadFrom = includeWeek && from.getTime() > weekStart.getTime() ? weekStart : from;
    const loadTo = includeWeek && to.getTime() < weekEnd.getTime() ? weekEnd : to;

    const [windowTrips, boardTrips, unassignedOrders, unassignedCount, rangeOrders, previous, fleetRows, driverRows, truckTypeRows, expiringTruckDocs, expiringDriverDocs, clientReliability, driverHours, telemetry, filterOptions] = await Promise.all([
      this.loadOverviewTrips(loadFrom, loadTo, companyId, filters),
      this.loadOverviewBoardTrips(today, horizonEnd, companyId, filters),
      this.loadUnassignedOrders(companyId, filters.clientId),
      this.countUnassignedOrders(companyId, filters.clientId),
      this.loadOverviewOrders(from, to, companyId, filters),
      this.loadPeriodTotals(prevFrom, prevTo, companyId),
      this.loadFleetCounts(companyId),
      this.loadDriverCounts(companyId),
      this.loadTruckTypes(companyId),
      this.trucksService.getExpiringDocuments(30).catch(() => []),
      this.driversService.getExpiringDocuments(30).catch(() => ({ drivers: [], documents: [] })),
      this.loadClientReliability(from, to, companyId, filters),
      this.loadDriverHours(companyId),
      this.loadTelemetry(companyId),
      this.getFilterOptions(companyId),
    ]);

    const rangeTrips = windowTrips.filter((trip) => {
      const at = trip.plannedDeparture || trip.createdAt;
      return at && at.getTime() >= from.getTime() && at.getTime() <= to.getTime();
    });

    // ---- Range KPIs -------------------------------------------------------
    const tripsTotal = rangeTrips.length;
    const tripsCompleted = rangeTrips.filter((trip) => TRIP_COMPLETED_OVERVIEW.has(trip.status)).length;
    const tripsCancelled = rangeTrips.filter((trip) => trip.status === 'cancelled').length;
    const rangeDelayed = rangeTrips.filter(
      (trip) => !TRIP_COMPLETED_OVERVIEW.has(trip.status) && trip.status !== 'cancelled' && trip.delayMinutes > 0,
    ).length;
    const kmTotal = Math.round(rangeTrips.reduce((sum, trip) => sum + trip.distanceKm, 0));
    const completedWithTimes = rangeTrips.filter(
      (trip) => TRIP_COMPLETED_OVERVIEW.has(trip.status) && trip.actualArrival && trip.plannedArrival,
    );
    const onTimeTrips = completedWithTimes.filter(
      (trip) => trip.actualArrival!.getTime() <= trip.plannedArrival!.getTime(),
    ).length;
    const onTimeRate = completedWithTimes.length > 0 ? (onTimeTrips / completedWithTimes.length) * 100 : 0;
    const lateMinutesList = completedWithTimes
      .map((trip) => Math.max(0, (trip.actualArrival!.getTime() - trip.plannedArrival!.getTime()) / 60000))
      .filter((minutes) => minutes > 0);
    const avgDelayMinutes = lateMinutesList.length > 0
      ? Math.round(lateMinutesList.reduce((sum, minutes) => sum + minutes, 0) / lateMinutesList.length)
      : 0;

    // ---- Today's operations board ----------------------------------------
    const todayTrips = boardTrips.filter((trip) => trip.status !== 'cancelled');
    const departures = todayTrips
      .filter((trip) => trip.plannedDeparture && isSameDay(trip.plannedDeparture, today))
      .sort((a, b) => (a.plannedDeparture?.getTime() || 0) - (b.plannedDeparture?.getTime() || 0));
    const arrivals = todayTrips
      .filter((trip) => trip.plannedArrival && isSameDay(trip.plannedArrival, today))
      .sort((a, b) => (a.plannedArrival?.getTime() || 0) - (b.plannedArrival?.getTime() || 0));
    const activeNow = boardTrips
      .filter((trip) => TRIP_ON_ROAD_OVERVIEW.has(trip.status))
      .sort((a, b) => (a.plannedArrival?.getTime() || 0) - (b.plannedArrival?.getTime() || 0));
    const delayedTrips = boardTrips
      .filter((trip) => trip.delayMinutes > 0 && !TRIP_COMPLETED_OVERVIEW.has(trip.status))
      .sort((a, b) => b.delayMinutes - a.delayMinutes);
    const upcoming = boardTrips
      .filter(
        (trip) =>
          trip.plannedDeparture &&
          trip.plannedDeparture.getTime() > todayEnd.getTime() &&
          trip.plannedDeparture.getTime() <= horizonEnd.getTime() &&
          !TRIP_COMPLETED_OVERVIEW.has(trip.status) &&
          trip.status !== 'cancelled',
      )
      .sort((a, b) => (a.plannedDeparture?.getTime() || 0) - (b.plannedDeparture?.getTime() || 0));

    // ---- Bucketed series (selected range) --------------------------------
    const seriesMap = buildBuckets(from, to, granularity);
    for (const trip of rangeTrips) {
      const at = trip.plannedDeparture || trip.createdAt;
      if (!at) continue;
      const key = granularity === 'day' ? isoDay(at) : granularity === 'week' ? weekKey(at) : monthKey(at);
      const bucket = seriesMap[key];
      if (!bucket) continue;
      bucket.trips += 1;
      bucket.km += trip.distanceKm;
      if (TRIP_COMPLETED_OVERVIEW.has(trip.status)) bucket.completed += 1;
      if (trip.delayMinutes > 0) bucket.delayed += 1;
    }

    // A one-day range has a single chart point; the current week gives the
    // dispatcher the useful shape without changing the selected KPIs.
    const weekMap = buildBuckets(weekStart, weekEnd, 'day');
    for (const trip of windowTrips) {
      const at = trip.plannedDeparture || trip.createdAt;
      if (!at) continue;
      const bucket = weekMap[isoDay(at)];
      if (!bucket) continue;
      bucket.trips += 1;
      bucket.km += trip.distanceKm;
      if (TRIP_COMPLETED_OVERVIEW.has(trip.status)) bucket.completed += 1;
      if (trip.delayMinutes > 0) bucket.delayed += 1;
    }
    const series = Object.values(seriesMap).map((bucket: any) => ({
      ...bucket,
      km: Math.round(bucket.km),
    }));
    const weekSeries = Object.values(weekMap).map((bucket: any) => ({
      ...bucket,
      km: Math.round(bucket.km),
    }));

    // ---- Country workload ------------------------------------------------
    const countryMap = new Map<string, { country: string; pickups: number; deliveries: number }>();
    const touchCountry = (raw: string | null | undefined, kind: 'pickups' | 'deliveries') => {
      const code = normalizeCountryCode(raw);
      if (!code) return;
      if (!countryMap.has(code)) countryMap.set(code, { country: code, pickups: 0, deliveries: 0 });
      countryMap.get(code)![kind] += 1;
    };
    for (const trip of rangeTrips) {
      touchCountry(trip.originCountry, 'pickups');
      touchCountry(trip.destCountry, 'deliveries');
    }
    const byCountry = [...countryMap.values()]
      .map((row) => ({ ...row, total: row.pickups + row.deliveries }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);

    // ---- Status distribution --------------------------------------------
    const statusCounts = new Map<string, number>();
    for (const trip of rangeTrips) {
      statusCounts.set(trip.status, (statusCounts.get(trip.status) || 0) + 1);
    }
    const statusDistribution = [...statusCounts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // ---- Top routes ------------------------------------------------------
    const routeMap = new Map<string, { from: string; to: string; trips: number; km: number }>();
    for (const trip of rangeTrips) {
      const fromLabel = routePlace(trip.originCity, trip.originCountry);
      const toLabel = routePlace(trip.destCity, trip.destCountry);
      if (!fromLabel && !toLabel) continue;
      const key = `${fromLabel}→${toLabel}`;
      if (!routeMap.has(key)) routeMap.set(key, { from: fromLabel, to: toLabel, trips: 0, km: 0 });
      const row = routeMap.get(key)!;
      row.trips += 1;
      row.km += trip.distanceKm;
    }
    const topRoutes = [...routeMap.values()]
      .sort((a, b) => b.trips - a.trips || b.km - a.km)
      .slice(0, 6)
      .map((row) => ({ ...row, km: Math.round(row.km) }));

    // ---- Orders ----------------------------------------------------------
    const ordersTotal = rangeOrders.length;
    const ordersDelivered = rangeOrders.filter((order) => ORDER_DELIVERED_OVERVIEW.has(order.status)).length;
    const ordersOpen = rangeOrders.filter((order) => ORDER_OPEN_OVERVIEW.has(order.status)).length;
    const ordersDelayed = rangeOrders.filter((order) => order.isLate).length;

    // ---- Fleet & drivers -------------------------------------------------
    const fleetTotal = fleetRows.total || 0;
    const fleetInTrip = fleetRows.inTrip || 0;
    const fleetAvailable = fleetRows.available || 0;
    const fleetMaintenance = fleetRows.maintenance || 0;
    const fleetInactive = fleetRows.inactive || 0;
    const utilizationPct = fleetTotal > 0 ? ((fleetInTrip / fleetTotal) * 100) : 0;
    const driversTotal = driverRows.total || 0;
    const driversOnDuty = driverRows.inTrip || 0;
    const driversAvailable = driverRows.available || 0;
    const driversOff = (driverRows.off || 0) + (driverRows.vacation || 0) + (driverRows.sick || 0);

    // ---- Alerts ----------------------------------------------------------
    const alerts: OverviewAlert[] = [];
    for (const trip of delayedTrips.slice(0, 4)) {
      alerts.push({
        id: `delay_${trip.id}`,
        type: 'delay',
        severity: trip.delayMinutes >= 120 ? 'critical' : 'warning',
        title: trip.tripNumber || trip.id.slice(0, 8).toUpperCase(),
        subtitle: routePlace(trip.originCity, trip.originCountry) + ' → ' + routePlace(trip.destCity, trip.destCountry),
        value: trip.delayMinutes,
        link: `/trips?tripId=${trip.id}`,
      });
    }
    for (const order of unassignedOrders.slice(0, 3)) {
      alerts.push({
        id: `unassigned_${order.id}`,
        type: 'unassigned',
        severity: order.priority === 'critical' ? 'critical' : 'warning',
        title: order.orderNumber || order.id.slice(0, 8).toUpperCase(),
        subtitle: order.clientName || routePlace(order.originCity, order.originCountry) + ' → ' + routePlace(order.destCity, order.destCountry),
        value: null,
        link: `/orders?orderId=${order.id}`,
      });
    }
    const incidentTrips = boardTrips.filter((trip) => trip.hasOpenIncident);
    for (const trip of incidentTrips.slice(0, 3)) {
      alerts.push({
        id: `incident_${trip.id}`,
        type: 'incident',
        severity: 'critical',
        title: trip.tripNumber || trip.id.slice(0, 8).toUpperCase(),
        subtitle: routePlace(trip.originCity, trip.originCountry) + ' → ' + routePlace(trip.destCity, trip.destCountry),
        value: null,
        link: `/trips?tripId=${trip.id}`,
      });
    }
    const expiring: Array<{ id: string; title: string; expiryDate: Date; kind: string }> = [];
    for (const doc of expiringTruckDocs || []) {
      if (!doc?.expiryDate) continue;
      expiring.push({
        id: `td_${doc.id}`,
        title: `${doc.truck?.plateNumber || '—'} · ${doc.type || 'document'}`,
        expiryDate: new Date(doc.expiryDate),
        kind: 'truck',
      });
    }
    for (const doc of (expiringDriverDocs?.documents || [])) {
      if (!doc?.expiryDate) continue;
      expiring.push({
        id: `dd_${doc.id}`,
        title: `${doc.driver?.user?.name || '—'} · ${doc.type || 'document'}`,
        expiryDate: new Date(doc.expiryDate),
        kind: 'driver',
      });
    }
    for (const driver of (expiringDriverDocs?.drivers || []) as any[]) {
      const fields: Array<[string, any, string]> = [
        ['license', driver.licenseExpiry, 'license'],
        ['medical', driver.medicalExpiry, 'medical'],
        ['tacho', driver.tachoCardExpiry, 'tacho'],
      ];
      for (const [label, value, suffix] of fields) {
        if (!value) continue;
        expiring.push({
          id: `dr_${driver.id}_${suffix}`,
          title: `${driver.user?.name || '—'} · ${label}`,
          expiryDate: new Date(value),
          kind: 'driver',
        });
      }
    }
    expiring.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
    for (const doc of expiring.slice(0, 4)) {
      alerts.push({
        id: `doc_${doc.id}`,
        type: 'document',
        severity: daysUntil(doc.expiryDate) < 7 ? 'critical' : 'warning',
        title: doc.title,
        subtitle: null,
        value: daysUntil(doc.expiryDate),
        link: '/documents',
      });
    }

    // ---- Lane reliability (completed trips only) ------------------------
    const laneMap = new Map<string, { from: string; to: string; trips: number; onTime: number; delayMinutes: number }>();
    for (const trip of rangeTrips) {
      if (!trip.actualArrival || !trip.plannedArrival) continue;
      const fromLabel = routePlace(trip.originCity, trip.originCountry) || '—';
      const toLabel = routePlace(trip.destCity, trip.destCountry) || '—';
      const key = `${fromLabel}→${toLabel}`;
      if (!laneMap.has(key)) laneMap.set(key, { from: fromLabel, to: toLabel, trips: 0, onTime: 0, delayMinutes: 0 });
      const row = laneMap.get(key)!;
      const late = Math.max(0, (trip.actualArrival.getTime() - trip.plannedArrival.getTime()) / 60000);
      row.trips += 1;
      row.delayMinutes += late;
      if (late <= 0) row.onTime += 1;
    }
    const lanes: OverviewLaneReliability[] = [...laneMap.values()]
      .filter((row) => row.trips >= 2)
      .sort((a, b) => b.trips - a.trips)
      .slice(0, 6)
      .map((row) => ({
        from: row.from,
        to: row.to,
        trips: row.trips,
        onTime: row.onTime,
        onTimeRate: row.trips > 0 ? (row.onTime / row.trips) * 100 : 0,
        avgDelay: row.trips > 0 ? Math.round(row.delayMinutes / row.trips) : 0,
      }));

    // ---- Delay heatmap: weekday × 3-hour bucket ------------------------
    const heatBuckets = ['00–03', '03–06', '06–09', '09–12', '12–15', '15–18', '18–21', '21–24'];
    const heatCells = Array.from({ length: 7 }, (_, day) =>
      Array.from({ length: heatBuckets.length }, (_, bucket) => ({ day, bucket, total: 0, late: 0 })),
    ).flat();
    for (const trip of rangeTrips) {
      if (!trip.plannedDeparture) continue;
      const day = (trip.plannedDeparture.getDay() + 6) % 7;
      const bucket = Math.min(heatBuckets.length - 1, Math.floor(trip.plannedDeparture.getHours() / 3));
      const cell = heatCells[day * heatBuckets.length + bucket];
      if (!cell) continue;
      cell.total += 1;
      if (trip.delayMinutes > 0) cell.late += 1;
    }
    const heatMax = Math.max(1, ...heatCells.map((cell) => cell.late));

    // ---- Trends vs previous period --------------------------------------
    const trends = {
      tripsTotal: pctChange(tripsTotal, previous.tripsTotal),
      tripsCompleted: pctChange(tripsCompleted, previous.tripsCompleted),
      tripsDelayed: pctChange(rangeDelayed, previous.tripsDelayed),
      ordersTotal: pctChange(ordersTotal, previous.ordersTotal),
      ordersDelivered: pctChange(ordersDelivered, previous.ordersDelivered),
      kmTotal: pctChange(kmTotal, previous.kmTotal),
    };

    const mapTrip = (trip: OverviewTrip) => ({
      id: trip.id,
      tripNumber: trip.tripNumber,
      truckId: trip.truckId,
      driverId: trip.driverId,
      status: trip.status,
      operationalStatus: trip.operationalStatus,
      plannedDeparture: trip.plannedDeparture,
      plannedArrival: trip.plannedArrival,
      actualDeparture: trip.actualDeparture,
      actualArrival: trip.actualArrival,
      truckPlate: trip.truckPlate,
      driverName: trip.driverName,
      originCity: trip.originCity,
      originCountry: trip.originCountry,
      destCity: trip.destCity,
      destCountry: trip.destCountry,
      distanceKm: Math.round(trip.distanceKm),
      orderCount: trip.orderCount,
      deliveredOrders: trip.deliveredOrders,
      delayMinutes: trip.delayMinutes,
      etaStatus: trip.etaStatus,
      hasOpenIncident: trip.hasOpenIncident,
      fleetType: trip.fleetType,
      carrierName: trip.carrierName,
    });

    const upcomingDays: Array<{ date: string; count: number }> = [];
    for (let offset = 1; offset <= 7; offset++) {
      const day = addDays(today, offset);
      const key = isoDay(day);
      upcomingDays.push({
        date: key,
        count: boardTrips.filter(
          (trip) =>
            trip.plannedDeparture &&
            isoDay(trip.plannedDeparture) === key &&
            trip.status !== 'cancelled' &&
            !TRIP_COMPLETED_OVERVIEW.has(trip.status),
        ).length,
      });
    }

    return {
      meta: {
        from,
        to,
        today,
        granularity,
        generatedAt: now,
        comparison: { from: prevFrom, to: prevTo },
        chartScope: includeWeek && series.length <= 1 ? 'week' : 'range',
      },
      kpis: {
        tripsTotal,
        tripsCompleted,
        tripsCancelled,
        tripsDelayed: rangeDelayed,
        tripsOnRoad: activeNow.length,
        todayDepartures: departures.length,
        todayArrivals: arrivals.length,
        ordersTotal,
        ordersDelivered,
        ordersOpen,
        ordersUnassigned: unassignedCount,
        ordersDelayed,
        kmTotal,
        avgTripKm: tripsTotal > 0 ? Math.round(kmTotal / tripsTotal) : 0,
        onTimeRate,
        avgDelayMinutes,
        countriesActive: countryMap.size,
        fleetTotal,
        fleetInTrip,
        fleetAvailable,
        fleetMaintenance,
        fleetInactive,
        utilizationPct,
        driversTotal,
        driversOnDuty,
        driversAvailable,
        driversOff,
        expiringDocs: expiring.length,
        openIncidents: incidentTrips.length,
        driversNearLimit: driverHours.filter((row) => row.drivingRemainingMin <= 120).length,
        driversBreakDue: driverHours.filter((row) => row.breakInMin <= 30).length,
        trucksOffline: telemetry.offline,
      },
      trends,
      today: {
        date: isoDay(today),
        departures: departures.slice(0, 8).map(mapTrip),
        arrivals: arrivals.slice(0, 8).map(mapTrip),
        active: activeNow.slice(0, 8).map(mapTrip),
        delayed: delayedTrips.slice(0, 8).map(mapTrip),
        counts: {
          departures: departures.length,
          arrivals: arrivals.length,
          active: activeNow.length,
          delayed: delayedTrips.length,
        },
      },
      upcoming: {
        days: upcomingDays,
        trips: upcoming.slice(0, 8).map(mapTrip),
      },
      series,
      weekSeries,
      byCountry,
      statusDistribution,
      topRoutes,
      reliability: { clients: clientReliability, lanes },
      heatmap: { buckets: heatBuckets, cells: heatCells, max: heatMax },
      driverHours,
      telemetry,
      filterOptions,
      delayedTrips: delayedTrips.slice(0, 6).map(mapTrip),
      unassignedOrders: unassignedOrders.slice(0, 6).map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        clientId: order.clientId,
        clientName: order.clientName,
        status: order.status,
        priority: order.priority,
        transportType: order.transportType,
        originCity: order.originCity,
        originCountry: order.originCountry,
        destCity: order.destCity,
        destCountry: order.destCountry,
        createdAt: order.createdAt,
      })),
      fleet: {
        total: fleetTotal,
        inTrip: fleetInTrip,
        available: fleetAvailable,
        maintenance: fleetMaintenance,
        inactive: fleetInactive,
        byType: truckTypeRows,
      },
      drivers: {
        total: driversTotal,
        inTrip: driverRows.inTrip || 0,
        available: driverRows.available || 0,
        off: driverRows.off || 0,
        sick: driverRows.sick || 0,
        vacation: driverRows.vacation || 0,
      },
      alerts: alerts.slice(0, 10),
    };
  }

  private async loadOverviewTrips(
    from: Date,
    to: Date,
    companyId: string | null,
    filters: OverviewFilters = {},
    board = false,
  ): Promise<OverviewTrip[]> {
    const ts = await resolveCreatedAtExpr(this.dataSource, 'trips', 't');
    const tripColumns = await this.tableColumns('trips');
    const driverColumns = await this.tableColumns('drivers');
    // Production carries a legacy snake_case distance on some rows and the
    // TypeORM camelCase column on others; probe instead of assuming either.
    const distanceExpr = tripColumns.has('distance_km')
      ? `COALESCE(NULLIF(TRIM(t.distance_km), '')::float, ${tripColumns.has('distanceKm') ? 't."distanceKm"::float' : '0'}, 0)`
      : `COALESCE(${tripColumns.has('distanceKm') ? 't."distanceKm"::float' : '0'}, 0)`;
    // Driver names live on users.name; first_name/last_name only exist on some
    // legacy databases and previously made this query fail with HTTP 500.
    const driverNameExpr = driverColumns.has('first_name') || driverColumns.has('last_name')
      ? `COALESCE(u.name, NULLIF(TRIM(CONCAT_WS(' ', ${driverColumns.has('first_name') ? 'd.first_name' : 'NULL'}, ${driverColumns.has('last_name') ? 'd.last_name' : 'NULL'})), ''))`
      : `COALESCE(u.name, '')`;
    const companyFilter = tripColumns.has('companyId')
      ? `($3::uuid IS NULL OR t."companyId" IS NULL OR t."companyId" = $3)`
      : `true`;
    const activeList = [...TRIP_ON_ROAD_OVERVIEW, 'planning', 'planned', 'confirmed', 'assigned', 'dispatched', 'driver_accepted', 'driver_received', 'ready']
      .map((status) => `'${status}'`)
      .join(', ');
    const dateClause = board
      ? `(
          COALESCE(t."plannedDeparture", ${ts}) BETWEEN $1 AND $2
          OR t."plannedArrival" BETWEEN $1 AND $2
          OR t."actualDeparture" BETWEEN $1 AND $2
          OR t."actualArrival" BETWEEN $1 AND $2
          OR lower(t.status::text) IN (${activeList})
        )`
      : `COALESCE(t."plannedDeparture", ${ts}) BETWEEN $1 AND $2`;

    let rows: any[] = [];
    try {
      rows = await this.dataSource.query(
        `SELECT
           t.id,
           t."tripNumber" AS trip_number,
           t."truckId" AS truck_id,
           t."driverId" AS driver_id,
           lower(t.status::text) AS status,
           t."operationalStatus" AS operational_status,
           ${ts} AS created_at,
           t."plannedDeparture" AS planned_departure,
           t."plannedArrival" AS planned_arrival,
           t."actualDeparture" AS actual_departure,
           t."actualArrival" AS actual_arrival,
           ${distanceExpr} AS distance,
           t."etaStatus" AS eta_status,
           COALESCE(t."trafficDelayMinutes", 0)::int AS traffic_delay,
           COALESCE(t."hasOpenIncident", false) AS has_open_incident,
           t."fleetType" AS fleet_type,
           t."carrierName" AS carrier_name,
           tr."plateNumber" AS truck_plate,
           tr.status AS truck_status,
           ${driverNameExpr} AS driver_name,
           d.status AS driver_status,
           fs.city AS origin_city,
           fs.country AS origin_country,
           ls.city AS dest_city,
           ls.country AS dest_country,
           (SELECT count(*)::int FROM orders o WHERE o."tripId" = t.id) AS order_count,
           (SELECT count(*)::int FROM orders o
              WHERE o."tripId" = t.id
                AND lower(o.status::text) IN ('delivered','pod_received','ready_for_invoice','invoiced','paid','closed')
           ) AS delivered_orders
         FROM trips t
         LEFT JOIN trucks tr ON tr.id = t."truckId"
         LEFT JOIN drivers d ON d.id = t."driverId"
         LEFT JOIN users u ON u.id = d."userId"
         LEFT JOIN LATERAL (
           SELECT s.city, s.country FROM stops s WHERE s."tripId" = t.id
           ORDER BY s.sequence ASC LIMIT 1
         ) fs ON true
         LEFT JOIN LATERAL (
           SELECT s.city, s.country FROM stops s WHERE s."tripId" = t.id
           ORDER BY s.sequence DESC LIMIT 1
         ) ls ON true
         WHERE ${dateClause}
           AND ${companyFilter}
           AND ($4::uuid IS NULL OR t."truckId" = $4)
           AND ($5::uuid IS NULL OR t."driverId" = $5)
         ORDER BY COALESCE(t."plannedDeparture", ${ts}) ASC
         LIMIT 3000`,
        [from, to, companyId, filters.truckId || null, filters.driverId || null],
      );
    } catch (err: any) {
      this.logger.error(`Dashboard overview trips query failed: ${err?.message || err}`);
      return [];
    }

    const now = Date.now();
    const countryFilter = filters.country ? normalizeCountryCode(filters.country) : null;
    return rows.map((row) => {
      const plannedArrival = row.planned_arrival ? new Date(row.planned_arrival) : null;
      const actualArrival = row.actual_arrival ? new Date(row.actual_arrival) : null;
      const plannedDelay = plannedArrival && !actualArrival ? Math.max(0, (now - plannedArrival.getTime()) / 60000) : 0;
      const delayMinutes = Math.round(Math.max(plannedDelay, Number(row.traffic_delay) || 0));
      return {
        id: String(row.id),
        tripNumber: row.trip_number || null,
        truckId: row.truck_id ? String(row.truck_id) : null,
        driverId: row.driver_id ? String(row.driver_id) : null,
        status: String(row.status || 'planning'),
        operationalStatus: row.operational_status || null,
        createdAt: row.created_at ? new Date(row.created_at) : null,
        plannedDeparture: row.planned_departure ? new Date(row.planned_departure) : null,
        plannedArrival,
        actualDeparture: row.actual_departure ? new Date(row.actual_departure) : null,
        actualArrival,
        distanceKm: num(row.distance),
        etaStatus: row.eta_status || null,
        trafficDelay: Number(row.traffic_delay) || 0,
        hasOpenIncident: row.has_open_incident === true,
        fleetType: row.fleet_type || null,
        carrierName: row.carrier_name || null,
        truckPlate: row.truck_plate || null,
        truckStatus: row.truck_status || null,
        driverName: row.driver_name || null,
        driverStatus: row.driver_status || null,
        originCity: row.origin_city || null,
        originCountry: row.origin_country || null,
        destCity: row.dest_city || null,
        destCountry: row.dest_country || null,
        orderCount: Number(row.order_count) || 0,
        deliveredOrders: Number(row.delivered_orders) || 0,
        delayMinutes,
      };
    }).filter((trip) => !countryFilter
      || normalizeCountryCode(trip.originCountry) === countryFilter
      || normalizeCountryCode(trip.destCountry) === countryFilter);
  }

  private loadOverviewBoardTrips(
    today: Date,
    horizonEnd: Date,
    companyId: string | null,
    filters: OverviewFilters = {},
  ): Promise<OverviewTrip[]> {
    return this.loadOverviewTrips(today, horizonEnd, companyId, filters, true);
  }

  private async loadOverviewOrders(
    from: Date,
    to: Date,
    companyId: string | null,
    filters: OverviewFilters = {},
  ) {
    const ts = await resolveCreatedAtExpr(this.dataSource, 'orders', 'o');
    const rows: any[] = await this.dataSource.query(
      `SELECT o.id, lower(o.status::text) AS status,
              (o.is_late = true OR COALESCE(o.late_minutes, 0) > 0) AS is_late
         FROM orders o
         LEFT JOIN trips tr ON tr.id = o."tripId"
        WHERE ${ts} BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR o."companyId" IS NULL OR o."companyId" = $3)
          AND ($4::uuid IS NULL OR tr."truckId" = $4)
          AND ($5::uuid IS NULL OR tr."driverId" = $5)
          AND ($6::uuid IS NULL OR o."clientId" = $6)`,
      [from, to, companyId, filters.truckId || null, filters.driverId || null, filters.clientId || null],
    ).catch(() => []);
    return rows.map((row) => ({
      id: String(row.id),
      status: String(row.status || ''),
      isLate: row.is_late === true || String(row.is_late) === 'true',
    }));
  }

  private async loadUnassignedOrders(companyId: string | null, clientId: string | null = null) {
    const orderColumns = await this.tableColumns('orders');
    const orderNumberExpr = orderColumns.has('orderNumber')
      ? 'o."orderNumber"'
      : orderColumns.has('order_number') ? 'o.order_number' : 'NULL';
    const rows: any[] = await this.dataSource.query(
      `SELECT o.id,
              o."clientId" AS client_id,
              ${orderNumberExpr} AS order_number,
              lower(o.status::text) AS status,
              o.priority,
              o."transportType" AS transport_type,
              o."createdAt" AS created_at,
              c.name AS client_name,
              fs.city AS origin_city, fs.country AS origin_country,
              ls.city AS dest_city, ls.country AS dest_country
         FROM orders o
         LEFT JOIN clients c ON c.id = o."clientId"
         LEFT JOIN LATERAL (
           SELECT s.city, s.country FROM order_stops s WHERE s."orderId" = o.id
           ORDER BY s.sequence ASC LIMIT 1
         ) fs ON true
         LEFT JOIN LATERAL (
           SELECT s.city, s.country FROM order_stops s WHERE s."orderId" = o.id
           ORDER BY s.sequence DESC LIMIT 1
         ) ls ON true
        WHERE o."tripId" IS NULL
          AND lower(o.status::text) IN ('new','draft','planned','received','pending')
          AND ($1::uuid IS NULL OR o."companyId" IS NULL OR o."companyId" = $1)
          AND ($2::uuid IS NULL OR o."clientId" = $2)
        ORDER BY CASE lower(o.priority::text) WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
                 o."createdAt" DESC
        LIMIT 50`,
      [companyId, clientId],
    ).catch(() => []);
    return rows.map((row) => ({
      id: String(row.id),
      orderNumber: row.order_number || null,
      clientId: row.client_id ? String(row.client_id) : null,
      clientName: row.client_name || null,
      status: String(row.status || ''),
      priority: row.priority || 'normal',
      transportType: row.transport_type || null,
      originCity: row.origin_city || null,
      originCountry: row.origin_country || null,
      destCity: row.dest_city || null,
      destCountry: row.dest_country || null,
      createdAt: row.created_at ? new Date(row.created_at) : null,
    }));
  }

  private async countUnassignedOrders(companyId: string | null, clientId: string | null = null): Promise<number> {
    const [row] = await this.dataSource.query(
      `SELECT count(*)::int AS total
         FROM orders o
        WHERE o."tripId" IS NULL
          AND lower(o.status::text) IN ('new','draft','planned','received','pending')
          AND ($1::uuid IS NULL OR o."companyId" IS NULL OR o."companyId" = $1)
          AND ($2::uuid IS NULL OR o."clientId" = $2)`,
      [companyId, clientId],
    ).catch(() => [{}]);
    return Number(row?.total) || 0;
  }

  private async loadPeriodTotals(from: Date, to: Date, companyId: string | null) {
    const [tTs, oTs] = await Promise.all([
      resolveCreatedAtExpr(this.dataSource, 'trips', 't'),
      resolveCreatedAtExpr(this.dataSource, 'orders', 'o'),
    ]);
    const [tripRow] = await this.dataSource.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE lower(t.status::text) IN ('completed','closed'))::int AS completed,
              count(*) FILTER (WHERE lower(t.status::text) NOT IN ('completed','closed','cancelled')
                                 AND (
                                   (t."plannedArrival" IS NOT NULL AND t."actualArrival" IS NULL AND t."plannedArrival" < now())
                                   OR COALESCE(t."trafficDelayMinutes", 0) > 0
                                   OR lower(COALESCE(t."etaStatus", '')) IN ('late','at_risk')
                                 ))::int AS delayed,
              COALESCE(SUM(COALESCE(NULLIF(TRIM(t.distance_km), '')::float, t."distanceKm"::float, 0)), 0)::float AS km
         FROM trips t
        WHERE COALESCE(t."plannedDeparture", ${tTs}) BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR t."companyId" IS NULL OR t."companyId" = $3)`,
      [from, to, companyId],
    ).catch(() => [{}]);
    const [orderRow] = await this.dataSource.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE lower(o.status::text) IN ('delivered','pod_received','ready_for_invoice','invoiced','paid','closed'))::int AS delivered
         FROM orders o
        WHERE ${oTs} BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR o."companyId" IS NULL OR o."companyId" = $3)`,
      [from, to, companyId],
    ).catch(() => [{}]);
    return {
      tripsTotal: Number(tripRow?.total) || 0,
      tripsCompleted: Number(tripRow?.completed) || 0,
      tripsDelayed: Number(tripRow?.delayed) || 0,
      kmTotal: Math.round(Number(tripRow?.km) || 0),
      ordersTotal: Number(orderRow?.total) || 0,
      ordersDelivered: Number(orderRow?.delivered) || 0,
    };
  }

  private async loadFleetCounts(companyId: string | null) {
    const [row] = await this.dataSource.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE lower(status::text) = 'in_trip')::int AS in_trip,
              count(*) FILTER (WHERE lower(status::text) = 'active')::int AS available,
              count(*) FILTER (WHERE lower(status::text) = 'maintenance')::int AS maintenance,
              count(*) FILTER (WHERE lower(status::text) = 'inactive')::int AS inactive
         FROM trucks
        WHERE ($1::uuid IS NULL OR "companyId" IS NULL OR "companyId" = $1)`,
      [companyId],
    ).catch(() => [{}]);
    return {
      total: Number(row?.total) || 0,
      inTrip: Number(row?.in_trip) || 0,
      available: Number(row?.available) || 0,
      maintenance: Number(row?.maintenance) || 0,
      inactive: Number(row?.inactive) || 0,
    };
  }

  private async loadDriverCounts(companyId: string | null) {
    const [row] = await this.dataSource.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE lower(d.status::text) = 'in_trip')::int AS in_trip,
              count(*) FILTER (WHERE lower(d.status::text) = 'available')::int AS available,
              count(*) FILTER (WHERE lower(d.status::text) = 'off')::int AS off,
              count(*) FILTER (WHERE lower(d.status::text) = 'sick')::int AS sick,
              count(*) FILTER (WHERE lower(d.status::text) = 'vacation')::int AS vacation
         FROM drivers d
         LEFT JOIN users u ON u.id = d."userId"
        WHERE ($1::uuid IS NULL OR u."companyId" IS NULL OR u."companyId" = $1)`,
      [companyId],
    ).catch(() => [{}]);
    return {
      total: Number(row?.total) || 0,
      inTrip: Number(row?.in_trip) || 0,
      available: Number(row?.available) || 0,
      off: Number(row?.off) || 0,
      sick: Number(row?.sick) || 0,
      vacation: Number(row?.vacation) || 0,
    };
  }

  private async loadTruckTypes(companyId: string | null) {
    const rows: any[] = await this.dataSource.query(
      `SELECT COALESCE(NULLIF(TRIM("truckType"), ''), 'other') AS type, count(*)::int AS count
         FROM trucks
        WHERE ($1::uuid IS NULL OR "companyId" IS NULL OR "companyId" = $1)
        GROUP BY 1 ORDER BY 2 DESC LIMIT 6`,
      [companyId],
    ).catch(() => []);
    return rows.map((row) => ({ type: String(row.type), count: Number(row.count) || 0 }));
  }

  /** Client-level punctuality (orders with a promised and actual delivery). */
  private async loadClientReliability(
    from: Date,
    to: Date,
    companyId: string | null,
    filters: OverviewFilters = {},
  ): Promise<OverviewClientReliability[]> {
    const ts = await resolveCreatedAtExpr(this.dataSource, 'orders', 'o');
    const rows: any[] = await this.dataSource.query(
      `SELECT c.id, c.name,
              count(*)::int AS total,
              count(*) FILTER (WHERE o.actual_delivery_at <= o.requested_delivery_at)::int AS on_time,
              COALESCE(AVG(GREATEST(0, EXTRACT(EPOCH FROM (o.actual_delivery_at - o.requested_delivery_at)) / 60)), 0)::float AS avg_delay
         FROM orders o
         JOIN clients c ON c.id = o."clientId"
         LEFT JOIN trips tr ON tr.id = o."tripId"
        WHERE o.actual_delivery_at IS NOT NULL
          AND o.requested_delivery_at IS NOT NULL
          AND ${ts} BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR o."companyId" IS NULL OR o."companyId" = $3)
          AND ($4::uuid IS NULL OR tr."truckId" = $4)
          AND ($5::uuid IS NULL OR tr."driverId" = $5)
          AND ($6::uuid IS NULL OR o."clientId" = $6)
        GROUP BY c.id, c.name
        ORDER BY total DESC
        LIMIT 6`,
      [from, to, companyId, filters.truckId || null, filters.driverId || null, filters.clientId || null],
    ).catch(() => []);
    return rows.map((row) => {
      const total = Number(row.total) || 0;
      const onTime = Number(row.on_time) || 0;
      return {
        id: String(row.id),
        name: row.name || '—',
        total,
        onTime,
        onTimeRate: total > 0 ? (onTime / total) * 100 : 0,
        avgDelay: Math.round(Number(row.avg_delay) || 0),
      };
    });
  }

  /** Live tachograph driving/break counters, most urgent first. */
  private async loadDriverHours(companyId: string | null): Promise<OverviewDriverHour[]> {
    const rows: any[] = await this.dataSource.query(
      `SELECT tls.driver_id, tls.truck_id, tls.current_activity,
              tls.driving_time_remaining, tls.weekly_driving_time_remaining,
              tls.break_required_in, tls.updated_at,
              tr."plateNumber" AS truck_plate,
              COALESCE(u.name, d.id::text) AS driver_name
         FROM tachograph_live_state tls
         LEFT JOIN trucks tr ON tr.id::text = tls.truck_id
         LEFT JOIN drivers d ON d.id::text = tls.driver_id
         LEFT JOIN users u ON u.id = d."userId"
        WHERE ($1::uuid IS NULL OR tr."companyId" IS NULL OR tr."companyId" = $1)
        ORDER BY tls.driving_time_remaining ASC
        LIMIT 8`,
      [companyId],
    ).catch(() => []);
    return rows.map((row) => ({
      driverId: row.driver_id ? String(row.driver_id) : null,
      driverName: row.driver_name || '—',
      truckId: row.truck_id ? String(row.truck_id) : null,
      truckPlate: row.truck_plate || '—',
      activity: String(row.current_activity || 'UNKNOWN'),
      drivingRemainingMin: Math.round((Number(row.driving_time_remaining) || 0) / 60),
      weeklyRemainingMin: Math.round((Number(row.weekly_driving_time_remaining) || 0) / 60),
      breakInMin: Math.round((Number(row.break_required_in) || 0) / 60),
      updatedAt: row.updated_at ? new Date(row.updated_at) : null,
    }));
  }

  /** Telematics freshness for the fleet: live, stale/offline or not equipped. */
  private async loadTelemetry(companyId: string | null): Promise<OverviewTelemetry> {
    const rows: any[] = await this.dataSource.query(
      `SELECT tr.id, tr."plateNumber" AS plate,
              tr."currentPositionAt" AS current_position_at,
              dev.last_seen_at, dev.connection_status
         FROM trucks tr
         LEFT JOIN LATERAL (
           SELECT td.last_seen_at, td.connection_status
             FROM telematics_devices td
            WHERE td.truck_id = tr.id::text
            ORDER BY td.last_seen_at DESC NULLS LAST
            LIMIT 1
         ) dev ON true
        WHERE ($1::uuid IS NULL OR tr."companyId" IS NULL OR tr."companyId" = $1)`,
      [companyId],
    ).catch(() => []);

    const now = Date.now();
    const stale: OverviewTelemetry['stale'] = [];
    let online = 0;
    let noDevice = 0;
    for (const row of rows) {
      const lastSeenRaw = row.last_seen_at || row.current_position_at;
      const lastSeenAt = lastSeenRaw ? new Date(lastSeenRaw) : null;
      const status = String(row.connection_status || '').toUpperCase();
      const hasDevice = Boolean(row.last_seen_at || row.connection_status);
      const fresh = lastSeenAt ? now - lastSeenAt.getTime() < 2 * 60 * 60 * 1000 : false;
      if (!hasDevice && !row.current_position_at) {
        noDevice += 1;
        continue;
      }
      if (fresh && !['OFFLINE', 'DISCONNECTED', 'NOT_CONFIGURED'].includes(status)) {
        online += 1;
        continue;
      }
      stale.push({
        id: String(row.id),
        plate: row.plate || '—',
        lastSeenAt,
        status: status || 'NO_SIGNAL',
      });
    }
    stale.sort((a, b) => (a.lastSeenAt?.getTime() || 0) - (b.lastSeenAt?.getTime() || 0));
    return {
      total: rows.length,
      online,
      offline: stale.length,
      noDevice,
      stale: stale.slice(0, 6),
    };
  }

  /** Options for the dashboard filter bar, scoped to the caller's company. */
  async getFilterOptions(companyId: string | null) {
    // An empty string is not a valid uuid and makes every query below reject.
    const scope = companyId || null;
    const [trucks, drivers, clients, countries] = await Promise.all([
      this.dataSource.query(
        `SELECT id, "plateNumber" AS name FROM trucks
          WHERE ($1::uuid IS NULL OR "companyId" IS NULL OR "companyId" = $1)
          ORDER BY "plateNumber" ASC LIMIT 200`,
        [scope],
      ).catch(() => []),
      this.dataSource.query(
        `SELECT d.id, COALESCE(u.name, d.id::text) AS name
           FROM drivers d
           LEFT JOIN users u ON u.id = d."userId"
          WHERE ($1::uuid IS NULL OR u."companyId" IS NULL OR u."companyId" = $1)
          ORDER BY name ASC LIMIT 200`,
        [scope],
      ).catch(() => []),
      this.dataSource.query(
        `SELECT id, name FROM clients
          WHERE ($1::uuid IS NULL OR "companyId" IS NULL OR "companyId" = $1)
          ORDER BY name ASC LIMIT 200`,
        [scope],
      ).catch(() => []),
      this.dataSource.query(
        `SELECT DISTINCT upper(s.country) AS code
           FROM stops s
           JOIN trips t ON t.id = s."tripId"
          WHERE s.country IS NOT NULL AND s.country <> ''
            AND ($1::uuid IS NULL OR t."companyId" IS NULL OR t."companyId" = $1)
          ORDER BY code ASC`,
        [scope],
      ).catch(() => []),
    ]);
    return {
      trucks: trucks.map((row: any) => ({ id: String(row.id), name: row.name || '—' })),
      drivers: drivers.map((row: any) => ({ id: String(row.id), name: row.name || '—' })),
      clients: clients.map((row: any) => ({ id: String(row.id), name: row.name || '—' })),
      countries: [...new Set(
        countries
          .map((row: any) => normalizeCountryCode(String(row.code)))
          .filter((code: string | null) => Boolean(code)) as string[],
      )].sort(),
    };
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

    const [oTs, tTs] = await Promise.all([
      resolveCreatedAtExpr(this.dataSource, 'orders', 'o'),
      resolveCreatedAtExpr(this.dataSource, 'trips', 't'),
    ]);
    const [curOrders, prevOrders, curTrips, prevTrips, countryRows, truckRows, driverRows] = await Promise.all([
      this.dataSource.query(ORDERS_SQL(oTs), P),
      this.dataSource.query(ORDERS_SQL(oTs), PP),
      this.dataSource.query(TRIPS_SQL(tTs), P),
      this.dataSource.query(TRIPS_SQL(tTs), PP),
      this.dataSource.query(COUNTRY_SQL(oTs), P),
      this.dataSource.query(`SELECT id, "plateNumber" AS name FROM trucks`),
      this.dataSource.query(`SELECT d.id, COALESCE(u.name, d.id::text) AS name FROM drivers d LEFT JOIN users u ON u.id = d."userId"`),
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
      if (curMap[key]) {
        curMap[key].trips += 1;
        curMap[key].km += dist;
        curMap[key].revenue += rev;
        curMap[key].margin += mg;
      }
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
