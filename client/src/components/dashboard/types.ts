// Shared shapes and formatting helpers for the dispatcher dashboard.

export interface OverviewTrip {
  id: string;
  tripNumber: string | null;
  status: string;
  operationalStatus: string | null;
  plannedDeparture: string | null;
  plannedArrival: string | null;
  actualDeparture: string | null;
  actualArrival: string | null;
  truckPlate: string | null;
  driverName: string | null;
  originCity: string | null;
  originCountry: string | null;
  destCity: string | null;
  destCountry: string | null;
  distanceKm: number;
  orderCount: number;
  deliveredOrders: number;
  delayMinutes: number;
  etaStatus: string | null;
  hasOpenIncident: boolean;
  fleetType: string | null;
  carrierName: string | null;
}

export interface OverviewSeriesPoint {
  key: string;
  label: string;
  trips: number;
  completed: number;
  delayed: number;
  km: number;
}

export interface OverviewOrder {
  id: string;
  orderNumber: string | null;
  clientName: string | null;
  status: string;
  priority: string;
  transportType: string | null;
  originCity: string | null;
  originCountry: string | null;
  destCity: string | null;
  destCountry: string | null;
  createdAt: string | null;
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
  updatedAt: string | null;
}

export interface OverviewTelemetry {
  total: number;
  online: number;
  offline: number;
  noDevice: number;
  stale: Array<{ id: string; plate: string; lastSeenAt: string | null; status: string }>;
}

export interface OverviewHeatmap {
  buckets: string[];
  cells: Array<{ day: number; bucket: number; total: number; late: number }>;
  max: number;
}

export interface OverviewFilterOptions {
  trucks: Array<{ id: string; name: string }>;
  drivers: Array<{ id: string; name: string }>;
  clients: Array<{ id: string; name: string }>;
  countries: string[];
}

export interface OverviewData {
  meta: {
    from: string;
    to: string;
    today: string;
    granularity: string;
    generatedAt: string;
    chartScope: 'range' | 'week';
  };
  kpis: Record<string, number>;
  trends: Record<string, number | null>;
  today: {
    date: string;
    departures: OverviewTrip[];
    arrivals: OverviewTrip[];
    active: OverviewTrip[];
    delayed: OverviewTrip[];
    counts: { departures: number; arrivals: number; active: number; delayed: number };
  };
  upcoming: {
    days: Array<{ date: string; count: number }>;
    trips: OverviewTrip[];
  };
  series: OverviewSeriesPoint[];
  weekSeries: OverviewSeriesPoint[];
  byCountry: Array<{ country: string; pickups: number; deliveries: number; total: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
  topRoutes: Array<{ from: string; to: string; trips: number; km: number }>;
  reliability?: {
    clients: OverviewClientReliability[];
    lanes: OverviewLaneReliability[];
  };
  heatmap?: OverviewHeatmap;
  driverHours?: OverviewDriverHour[];
  telemetry?: OverviewTelemetry;
  delayedTrips: OverviewTrip[];
  unassignedOrders: OverviewOrder[];
  fleet: {
    total: number;
    inTrip: number;
    available: number;
    maintenance: number;
    inactive: number;
    byType: Array<{ type: string; count: number }>;
  };
  drivers: {
    total: number;
    inTrip: number;
    available: number;
    off: number;
    sick: number;
    vacation: number;
  };
  alerts: OverviewAlert[];
}

export function localeFor(lang: string): string {
  switch ((lang || 'en').slice(0, 2)) {
    case 'ro': return 'ro-RO';
    case 'nl': return 'nl-NL';
    case 'de': return 'de-DE';
    case 'fr': return 'fr-FR';
    case 'es': return 'es-ES';
    case 'pl': return 'pl-PL';
    default: return 'en-GB';
  }
}

function parseDateValue(value: string | Date): Date {
  // Date-only values are parsed in the dispatcher's local day, not UTC, so a
  // booking for the 11th never renders as the 10th west of Greenwich.
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00`);
  }
  return new Date(value);
}

export function formatTime(value?: string | Date | null, lang = 'ro'): string {
  if (!value) return '—';
  const date = parseDateValue(value);
  if (isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(localeFor(lang), { hour: '2-digit', minute: '2-digit' }).format(date);
}

export function formatLongDate(value: string | Date, lang = 'ro'): string {
  const date = parseDateValue(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(lang), {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(date);
}

export function formatShortDate(value: string | Date, lang = 'ro'): string {
  const date = parseDateValue(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(lang), { day: 'numeric', month: 'short' }).format(date);
}

export function formatDayShort(value: string | Date, lang = 'ro'): string {
  const date = parseDateValue(value);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(localeFor(lang), { weekday: 'short', day: 'numeric' }).format(date);
}

/** Axis label for a series bucket key (day / ISO week / month). */
export function bucketLabel(key: string, granularity: string, lang: string, weekday = false): string {
  const locale = localeFor(lang);
  if (granularity === 'month') {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year || 2000, (month || 1) - 1, 1);
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(date);
  }
  if (granularity === 'week') {
    const week = key.split('-W')[1];
    return week ? `W${week}` : key;
  }
  const date = new Date(`${key}T00:00:00`);
  if (isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat(locale, weekday ? { weekday: 'short' } : { day: '2-digit', month: 'short' }).format(date);
}

export function countryName(code: string | null | undefined, lang: string): string {
  const raw = String(code ?? '').trim();
  if (!raw) return '—';
  const iso = raw.length === 2 ? raw.toUpperCase() : null;
  if (iso) {
    try {
      const DisplayNames = (Intl as any).DisplayNames;
      if (DisplayNames) {
        const name = new DisplayNames([localeFor(lang)], { type: 'region' }).of(iso);
        if (name && name !== iso) return name;
      }
    } catch { /* fall back to the stored value */ }
    return iso;
  }
  return raw;
}

export function flagFor(code: string | null | undefined): string {
  const raw = String(code ?? '').trim();
  if (raw.length !== 2 || !/^[A-Za-z]{2}$/.test(raw)) return '';
  const upper = raw.toUpperCase();
  return String.fromCodePoint(...[...upper].map((char) => 127397 + char.charCodeAt(0)));
}

export function routeText(
  originCity?: string | null,
  originCountry?: string | null,
  destCity?: string | null,
  destCountry?: string | null,
  lang = 'ro',
): string {
  const place = (city?: string | null, country?: string | null) => {
    const cityLabel = String(city ?? '').trim();
    if (cityLabel) return cityLabel;
    const countryLabel = countryName(country, lang);
    return countryLabel === '—' ? '' : countryLabel;
  };
  return [place(originCity, originCountry), place(destCity, destCountry)].filter(Boolean).join(' → ') || '—';
}

export function humanizeStatus(status: string): string {
  const text = String(status || '').replace(/_/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
}
