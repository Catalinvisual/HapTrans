// Shared shapes and formatting helpers for the dispatcher dashboard.

export interface OverviewTrip {
  id: string;
  tripNumber: string | null;
  truckId: string | null;
  driverId: string | null;
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
  clientId: string | null;
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
  filterOptions?: OverviewFilterOptions;
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

/** One canonical 2-letter code for ISO2, ISO3 and localized country names. */
export function canonicalCountryCode(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (raw.toUpperCase() === 'UK') return 'GB';
  if (/^[A-Za-z]{2}$/.test(raw)) return raw.toUpperCase();
  const iso3 = ISO3_TO_ISO2[raw.toUpperCase()];
  if (iso3) return iso3;
  const aliased = COUNTRY_ALIASES[countryKey(raw)];
  if (aliased) return aliased;
  return getCountryNameIndex().get(countryKey(raw)) || null;
}

export function countryName(code: string | null | undefined, lang: string): string {
  const raw = String(code ?? '').trim();
  if (!raw) return '—';
  const iso = canonicalCountryCode(raw);
  if (!iso) return raw;
  try {
    const DisplayNames = (Intl as any).DisplayNames;
    if (DisplayNames) {
      const name = new DisplayNames([localeFor(lang)], { type: 'region' }).of(iso);
      if (name && name !== iso) return name;
    }
  } catch { /* fall back to the code */ }
  return iso;
}

export function flagFor(code: string | null | undefined): string {
  const iso = canonicalCountryCode(code);
  if (!iso) return '';
  return String.fromCodePoint(...[...iso].map((char) => 127397 + char.charCodeAt(0)));
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
