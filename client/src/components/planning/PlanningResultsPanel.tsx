import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  List as ListIcon,
  Map as MapIcon,
  Euro,
  Clock,
  AlertTriangle,
  Leaf,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Truck,
  User,
  Box,
  Search,
  RefreshCw,
} from 'lucide-react';
import CustomSelect from '../CustomSelect';
import { appLocale, fmtMoney, fmtNumber } from '../../lib/format';
import { buildTripMetrics, costBucket, minutesBetween, nameOfDriver, toMs, toNum } from '../../lib/planningResultsMetrics';
import { planningApi } from '../../lib/planningApi';
import { emissionUnavailableKey, fuelTypeLabel } from '../../lib/truckFuel';
import { operationalStatusForDisplay } from '../../lib/operationalI18n';
import { formatAppointmentInstants, OPERATIONAL_TIME_ZONE } from '../../lib/stopAppointment';

type ViewKey = 'results' | 'route' | 'costs' | 'driver' | 'conflicts' | 'emissions';
type ExportFormat = 'xlsx' | 'csv' | 'pdf';

interface Header {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

interface ExportData {
  fileBase: string;
  headers: Header[];
  rows: Record<string, any>[];
}

const VIEWS: ViewKey[] = ['results', 'route', 'costs', 'driver', 'conflicts', 'emissions'];

/**
 * Consumption is quoted per 100 km (L/100 km), but the estimated energy on a
 * trip is a total quantity in the base unit (L, kg or kWh). Reusing the
 * consumption unit labelled 594.3 litres as "L/100 km".
 */
const energyUnit = (consumptionUnit?: string | null): string =>
  String(consumptionUnit || '').split('/')[0].trim();
const HEIGHT_KEY = 'hapcargo:planningResultsHeight';
const COLLAPSED_KEY = 'hapcargo:planningResultsCollapsed';
const VIEW_KEY = 'hapcargo:planningResultsView';
const MIN_HEIGHT = 260;
const MAX_HEIGHT = 800;
const DEFAULT_HEIGHT = 360;
// The persisted TripStatus enum. Transition aliases (in_transit, confirmed, etc.)
// are workflow inputs, not stored statuses, so they must not appear as filters.
// Canonical lifecycle codes only. Legacy workflow aliases are not operational
// states and must never appear as filters or badges.
const TRIP_STATUS_VALUES = [
  'PLANNING',
  'ACCEPTED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'LOADING',
  'EN_ROUTE_TO_DELIVERY',
  'ARRIVED_AT_DELIVERY',
  'UNLOADING',
  'COMPLETED',
  'DELAYED',
  'EXCEPTION',
  'CANCELLED',
  'DELIVERY_REJECTED',
  'PARTIALLY_REJECTED',
  'DELIVERY_EXCEPTION',
  'DELIVERY_ACCEPTED_WITH_REMARKS',
] as const;

function fmtMinutes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(Math.round(value));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
}

function fmtDateTime(value: any): string {
  const ms = toMs(value);
  if (ms === null) return '';
  return new Date(ms).toLocaleString(appLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: OPERATIONAL_TIME_ZONE,
  });
}

function fmtClock(value: any): string {
  const ms = toMs(value);
  if (ms === null) return '';
  return new Date(ms).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit', timeZone: OPERATIONAL_TIME_ZONE });
}

function fmtEtaDifference(value: any, onTime: string, unit: string): string {
  const minutes = toNum(value);
  if (minutes === null) return '';
  const rounded = Math.round(minutes);
  if (rounded === 0) return onTime;
  return `${rounded > 0 ? '+' : '-'}${Math.abs(rounded)} ${unit}`;
}

function fmtDateShort(value: any): string {
  const ms = toMs(value);
  if (ms === null) return '';
  return new Date(ms).toLocaleDateString(appLocale(), { day: '2-digit', month: 'short', year: 'numeric' });
}

function csvEscape(value: any): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function readStoredHeight(): number {
  if (typeof window === 'undefined') return DEFAULT_HEIGHT;
  try {
    const raw = Number(window.localStorage.getItem(HEIGHT_KEY));
    if (Number.isFinite(raw) && raw >= MIN_HEIGHT && raw <= MAX_HEIGHT) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_HEIGHT;
}

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function readStoredView(): ViewKey {
  if (typeof window === 'undefined') return 'results';
  try {
    const raw = window.localStorage.getItem(VIEW_KEY) as ViewKey | null;
    if (raw && VIEWS.includes(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'results';
}

export default function PlanningResultsPanel({
  boardData,
  selectedTripId,
  truckFilter,
  driverFilter,
  priorityFilter,
  searchFilter,
  from,
  to,
  onSelectTrip,
  onRefresh,
  focusSignal,
}: {
  boardData: any;
  selectedTripId: string | null;
  grouping?: 'truck' | 'driver' | 'trailer';
  truckFilter: string;
  driverFilter: string;
  priorityFilter: string;
  searchFilter: string;
  from?: string;
  to?: string;
  onSelectTrip?: (id: string) => void;
  onRefresh?: () => void | Promise<void>;
  focusSignal?: number;
}) {
  const { t } = useTranslation();

  const [view, setView] = useState<ViewKey>(readStoredView);
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);
  const [height, setHeight] = useState<number>(readStoredHeight);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [quickFilter, setQuickFilter] = useState('');
  const [statusFilterValue, setStatusFilterValue] = useState('');
  const [sortKey, setSortKey] = useState('tripNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem('hapcargo:planningResultsColumns');
      if (raw) return JSON.parse(raw);
    } catch {
      /* ignore */
    }
    return {};
  });
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [tachoByDriver, setTachoByDriver] = useState<Record<string, any>>({});
  const [tachoLoading, setTachoLoading] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');
  const [liveEtaByTrip, setLiveEtaByTrip] = useState<Record<string, any>>({});
  const [costRecalculating, setCostRecalculating] = useState(false);
  const [costNotice, setCostNotice] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(HEIGHT_KEY, String(height));
    } catch {
      /* ignore */
    }
  }, [height]);

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_KEY, view);
    } catch {
      /* ignore */
    }
  }, [view]);

  useEffect(() => {
    if (!focusSignal) return;
    setCollapsed(false);
    setView('results');
    panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusSignal]);

  // Driver hours must come from recorded tachograph activity, never from the
  // manual HOS rows (which are all zero when nobody filled them in).
  useEffect(() => {
    if (view !== 'driver') return;
    const ids = Array.from(
      new Set<string>(
        (boardData?.trips || []).flatMap((trip: any) => {
          const id = trip?.assignment?.driverId || trip?.driver?.id || trip?.truck?.driver?.id;
          return id ? [id as string] : [];
        }),
      ),
    );
    if (!ids.length) {
      setTachoByDriver({});
      return;
    }
    let cancelled = false;
    setTachoLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 86400000);
    Promise.all(
      ids.map(async (id) => {
        try {
          const data = await planningApi.getDriverActivity(id, {
            from: from.toISOString(),
            to: to.toISOString(),
          });
          return [id, data] as const;
        } catch {
          return [id, { available: false, reason: 'request_failed' }] as const;
        }
      }),
    )
      .then((entries) => {
        if (!cancelled) setTachoByDriver(Object.fromEntries(entries));
      })
      .finally(() => {
        if (!cancelled) setTachoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, boardData]);

  const startResize = (event: any) => {
    if (collapsed) return;
    event.preventDefault();
    setDragging(true);
    const startY = event.clientY;
    const startHeight = height;

    const onMove = (moveEvent: any) => {
      const next = Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, startHeight + (startY - moveEvent.clientY)));
      setHeight(next);
    };
    const finish = () => {
      setDragging(false);
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    };

    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  const trips = useMemo(() => {
    const list: any[] = boardData?.trips || [];
    const query = String(searchFilter || '').trim().toLowerCase();
    return list.filter((trip: any) => {
      const truckOk =
        !truckFilter ||
        trip?.truck?.id === truckFilter ||
        trip?.trailer?.id === truckFilter ||
        trip?.truckId === truckFilter ||
        trip?.trailerId === truckFilter;
      const driverOk =
        !driverFilter ||
        trip?.driver?.id === driverFilter ||
        trip?.truck?.driver?.id === driverFilter ||
        trip?.driverId === driverFilter;
      const priorityOk =
        !priorityFilter ||
        (trip?.orders || []).some((order: any) => String(order?.priority || '') === priorityFilter);
      const searchOk =
        !query ||
        [
          trip?.tripNumber,
          trip?.truck?.plateNumber,
          trip?.carrierTruckPlate,
          trip?.trailer?.plateNumber,
          nameOfDriver(trip?.driver || trip?.truck?.driver),
          trip?.carrierDriverName,
          ...(trip?.orders || []).flatMap((order: any) => [
            order?.orderNumber,
            order?.customerReference,
            order?.internalReference,
            order?.client?.name,
          ]),
        ].some((value) => String(value || '').toLowerCase().includes(query));
      return truckOk && driverOk && priorityOk && searchOk;
    });
  }, [boardData?.trips, truckFilter, driverFilter, priorityFilter, searchFilter]);

  const metrics = useMemo(() => trips.map(buildTripMetrics), [trips]);

  const metricById = useMemo(() => {
    const map = new Map<string, (typeof metrics)[number]>();
    for (const metric of metrics) map.set(metric.id, metric);
    return map;
  }, [metrics]);

  const quickFilteredMetrics = useMemo(() => {
    const query = quickFilter.trim().toLowerCase();
    return metrics.filter((metric) => {
      if (statusFilterValue && String(metric.status || '').toLowerCase() !== statusFilterValue.toLowerCase()) return false;
      if (!query) return true;
      return [metric.tripNumber, metric.truckPlate, metric.trailerPlate, metric.driverName, metric.status].some(
        (value) => String(value || '').toLowerCase().includes(query),
      );
    });
  }, [metrics, quickFilter, statusFilterValue]);

  const sortOptions = [
    { key: 'tripNumber', label: t('pr.trip', 'Trip') },
    { key: 'truckPlate', label: t('pr.truck', 'Truck') },
    { key: 'driverName', label: t('pr.driver', 'Driver') },
    { key: 'distanceKm', label: t('pr.distance_km', 'Distance (km)') },
    { key: 'drivingMin', label: t('pr.driving_time', 'Driving time') },
    { key: 'elapsedMin', label: t('up_elapsed_time', 'Elapsed time') },
    { key: 'toll', label: t('pr.toll', 'Toll') },
    { key: 'totalCost', label: t('pr.total_cost', 'Total cost') },
    { key: 'revenue', label: t('pr.revenue', 'Revenue') },
    { key: 'profit', label: t('pr.profit', 'Profit') },
    { key: 'utilizationPct', label: t('pr.utilization', 'Utilization') },
  ];

  const displayMetrics = useMemo(() => {
    const list = [...quickFilteredMetrics];
    list.sort((a, b) => {
      const av = (a as any)[sortKey];
      const bv = (b as any)[sortKey];
      const result =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av ?? '').localeCompare(String(bv ?? ''), appLocale());
      return sortDir === 'asc' ? result : -result;
    });
    return list;
  }, [quickFilteredMetrics, sortKey, sortDir]);

  const compareMetrics = useMemo(
    () => compareIds.map((id) => metricById.get(id)).filter(Boolean) as (typeof metrics),
    [compareIds, metricById],
  );

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((value) => value !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const selected = useMemo(() => {
    if (!selectedTripId) return null;
    return (
      metrics.find((m) => m.id === selectedTripId || (m.tripNumber && m.tripNumber === selectedTripId)) || null
    );
  }, [metrics, selectedTripId]);

  useEffect(() => {
    const id = selected?.id;
    if (view !== 'route' || !id || liveEtaByTrip[id]) return;
    let cancelled = false;
    planningApi.getTripLiveEta(id)
      .then((data) => {
        if (!cancelled) setLiveEtaByTrip((prev) => ({ ...prev, [id]: data }));
      })
      .catch(() => {
        if (!cancelled) setLiveEtaByTrip((prev) => ({ ...prev, [id]: { available: false } }));
      });
    return () => { cancelled = true; };
  }, [view, selected?.id, liveEtaByTrip]);

  const selectedLiveEta = selected ? liveEtaByTrip[selected.id] : null;
  const selectedEtaStops = useMemo(() => {
    const map = new Map<string, any>();
    for (const etaStop of selectedLiveEta?.stops || []) {
      if (etaStop?.stopId) map.set(`id:${etaStop.stopId}`, etaStop);
      if (etaStop?.sequence !== null && etaStop?.sequence !== undefined) {
        map.set(`seq:${etaStop.sequence}`, etaStop);
      }
    }
    return map;
  }, [selectedLiveEta]);
  const etaStopFor = (stop: any) =>
    selectedEtaStops.get(`id:${stop?.id}`) || selectedEtaStops.get(`seq:${stop?.sequence}`) || null;

  const routeFilteredMetrics = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    if (!query) return metrics;
    return metrics.filter((metric) =>
      [metric.tripNumber, metric.truckPlate, metric.driverName, metric.trailerPlate, metric.status].some((value) =>
        String(value || '').toLowerCase().includes(query),
      ),
    );
  }, [metrics, routeSearch]);

  const totals = useMemo(() => {
    const counts: Record<string, number> = {};
    const sum = (key: keyof (typeof metrics)[number]) => {
      let total = 0;
      let any = false;
      for (const metric of metrics) {
        const value = (metric as any)[key];
        if (typeof value === 'number' && Number.isFinite(value)) {
          total += value;
          any = true;
          counts[key as string] = (counts[key as string] || 0) + 1;
        }
      }
      return any ? total : null;
    };
    const utilValues = metrics
      .map((m) => m.utilizationPct)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    const currencies = Array.from(new Set(metrics.map((m) => m.currency).filter(Boolean)));

    const components: Record<string, number> = { fuel: 0, toll: 0, driver: 0, maintenance: 0, fixed: 0, manual: 0 };
    let estimatedComponentTrips = 0;
    let estimatedComponentsTotal = 0;
    for (const metric of metrics) {
      const breakdown = metric.estimatedBreakdown;
      if (!breakdown) continue;
      estimatedComponentTrips += 1;
      for (const key of Object.keys(components)) {
        const value = (breakdown as any)[key];
        if (typeof value === 'number' && Number.isFinite(value)) components[key] += value;
      }
      estimatedComponentsTotal = Object.values(components).reduce((sum, value) => sum + value, 0);
    }

    return {
      distance: sum('distanceKm'),
      emptyKm: sum('emptyKm'),
      elapsed: sum('elapsedMin'),
      driving: sum('drivingMin'),
      waiting: sum('waitingMin'),
      loading: sum('loadingMin'),
      unloading: sum('unloadingMin'),
      toll: sum('toll'),
      fuel: sum('fuelCost'),
      driver: sum('driverCost'),
      other: sum('otherCost'),
      recorded: sum('recordedTotal'),
      estimated: sum('estimatedCost'),
      totalCost: sum('totalCost'),
      revenue: sum('revenue'),
      profit: sum('profit'),
      utilization:
        utilValues.length > 0 ? utilValues.reduce((a, b) => a + b, 0) / utilValues.length : null,
      currency: currencies.length === 1 ? currencies[0] : currencies.length === 0 ? 'EUR' : null,
      counts,
      estimatedComponentTrips,
      estimatedComponentsTotal: estimatedComponentTrips ? Math.round(estimatedComponentsTotal * 100) / 100 : null,
      estimatedComponents: estimatedComponentTrips
        ? Object.fromEntries(Object.entries(components).map(([key, value]) => [key, Math.round(value * 100) / 100]))
        : null,
    };
  }, [metrics]);

  const partialAggregate = useMemo(
    () =>
      ['totalCost', 'revenue', 'profit'].some((key) => {
        const count = totals.counts[key] || 0;
        return count > 0 && count < metrics.length;
      }),
    [totals.counts, metrics.length],
  );

  const driverRows = useMemo(() => {
    const grouped = new Map<
      string,
      { key: string; driver: any; name: string; tripCount: number }
    >();
    for (const metric of metrics) {
      if (!metric.driverEntity && !metric.driverName) continue;
      const key = metric.driverEntity?.id || metric.driverName || metric.id;
      const existing = grouped.get(key);
      if (existing) existing.tripCount += 1;
      else
        grouped.set(key, {
          key,
          driver: metric.driverEntity,
          name: metric.driverName,
          tripCount: 1,
        });
    }
    const hosSummary = boardData?.hosSummary || {};
    return Array.from(grouped.values()).map((row) => {
      const driverId = row.driver?.id;
      const hos = driverId ? hosSummary[driverId] : null;
      return {
        ...row,
        hos,
        weekly: toNum(hos?.weeklyDriving),
        remaining: toNum(hos?.remaining),
        over: Boolean(hos?.over),
        payMode: row.driver?.payMode || '',
        payRate: toNum(row.driver?.payRate),
      };
    });
  }, [metrics, boardData?.hosSummary]);

  const conflicts = useMemo(() => {
    const tripIds = new Set(metrics.map((m) => m.id));
    const truckIds = new Set(metrics.map((m) => m.truckId).filter(Boolean));
    const driverIds = new Set(metrics.map((m) => m.driverId).filter(Boolean));
    return (boardData?.conflicts || []).filter((conflict: any) => {
      if (!conflict?.tripId && !conflict?.resourceId) return true;
      if (conflict?.tripId && tripIds.has(conflict.tripId)) return true;
      if (conflict?.resourceId && (truckIds.has(conflict.resourceId) || driverIds.has(conflict.resourceId))) {
        return true;
      }
      return false;
    });
  }, [boardData?.conflicts, metrics]);

  const tripNumberById = useMemo(() => {
    const map = new Map<string, string>();
    for (const metric of metrics) map.set(metric.id, metric.tripNumber);
    return map;
  }, [metrics]);

  const resourceLabel = useCallback(
    (id?: string) => {
      if (!id) return '';
      const byTruck = metrics.find((m) => m.truckId === id);
      if (byTruck) return byTruck.truckPlate || String(id).slice(0, 8);
      const byDriver = metrics.find((m) => m.driverId === id);
      if (byDriver) return byDriver.driverName || String(id).slice(0, 8);
      return String(id).slice(0, 8);
    },
    [metrics],
  );

  const rangeLabel = useMemo(() => {
    if (!from && !to) return t('pr.all_trips', 'All trips in range');
    const start = from ? fmtDateShort(from) : '…';
    const end = to ? fmtDateShort(to) : '…';
    return `${start} – ${end}`;
  }, [from, to, t]);

  const reportSubtitle = useCallback(
    (rowCount: number) =>
      `${t('pr.report_range', 'Range')}: ${rangeLabel} · ${t('pr.generated', 'Generated')}: ${new Date().toLocaleString(
        appLocale(),
      )} · ${rowCount} ${t('pr.rows', 'rows')}`,
    [rangeLabel, t],
  );

  const statusBadge = (raw: string) => {
    const code = operationalStatusForDisplay({ status: raw });
    const status = code.toLowerCase();
    const label = t(`operational_${code}`, code);
    const cls =
      status === 'completed'
        ? 'bg-emerald-500/15 text-emerald-600'
        : ['cancelled', 'delivery_rejected'].includes(status)
        ? 'bg-rose-500/15 text-rose-600'
        : ['delayed', 'exception', 'delivery_exception', 'partially_rejected'].includes(status)
        ? 'bg-amber-500/15 text-amber-600'
        : ['arrived_at_pickup', 'arrived_at_delivery', 'loading', 'unloading'].includes(status)
        ? 'bg-violet-500/15 text-violet-600'
        : ['en_route_to_pickup', 'en_route_to_delivery', 'accepted', 'delivery_accepted_with_remarks'].includes(status)
        ? 'bg-blue-500/15 text-blue-600'
        : 'bg-slate-500/15 text-slate-600';
    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${cls}`}>
        {label}
      </span>
    );
  };

  const levelBadge = (raw: string) => {
    const level = String(raw || '').toLowerCase();
    const label =
      level === 'blocking'
        ? t('pr.blocking', 'Blocking')
        : level === 'warning'
        ? t('pr.warning', 'Warning')
        : t('pr.info', 'Info');
    const cls =
      level === 'blocking'
        ? 'bg-rose-500/15 text-rose-600'
        : level === 'warning'
        ? 'bg-amber-500/15 text-amber-600'
        : 'bg-slate-500/15 text-slate-600';
    return (
      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide ${cls}`}>
        {label}
      </span>
    );
  };

  const np = () => <span className="italic text-text-muted/70">{t('pr.not_provided', 'Not provided')}</span>;

  const basisLabel = (basis: string) =>
    basis === 'recorded'
      ? t('up_res_basis_recorded', 'Recorded')
      : basis === 'mixed'
      ? t('up_res_basis_mixed', 'Mixed (recorded + estimated)')
      : basis === 'estimated'
      ? t('up_res_basis_estimated', 'Estimated')
      : t('up_res_basis_none', 'No cost basis');

  const basisShort = (basis: string) =>
    basis === 'recorded'
      ? t('up_res_recorded_short', 'rec.')
      : basis === 'mixed'
      ? t('up_res_mixed_short', 'mix.')
      : t('up_res_estimated_short', 'est.');

  // Assignment source is kept for validation/auditing but is never rendered as
  // a visible technical label; it is available as a subtle tooltip only.
  const assignmentTitle = (source: string) =>
    source === 'truck'
      ? t('up_res_inherited_from_truck', 'Inherited from the truck’s default assignment')
      : source === 'carrier'
      ? t('up_res_from_carrier', 'Carrier resource')
      : undefined;
  const nc = () => <span className="italic text-text-muted/70">{t('pr.not_calculated', 'Not calculated')}</span>;
  const na = () => <span className="italic text-text-muted/70">{t('pr.unavailable', 'Unavailable')}</span>;

  const moneyOr = (value: number | null, currency: string) =>
    value === null ? nc() : <span className="tabular-nums">{fmtMoney(value, currency)}</span>;

  const componentMoney = (
    value: number | null,
    basis: string,
    currency: string,
    title?: string,
  ) =>
    value === null ? (
      nc()
    ) : (
      <span className="tabular-nums" title={title}>
        {fmtMoney(value, currency)}
        {basis === 'estimated' || basis === 'mixed' ? (
          <span className="ml-1 text-[8px] font-bold uppercase tracking-wide text-text-muted">
            {basisShort(basis)}
          </span>
        ) : null}
      </span>
    );

  const totalMoney = (value: number | null) => {
    if (value === null) return <span className="text-text-muted">—</span>;
    if (totals.currency === null) {
      return <span className="italic text-text-muted/80">{t('pr.mixed_currency', 'Mixed currencies')}</span>;
    }
    return <span className="tabular-nums">{fmtMoney(value, totals.currency)}</span>;
  };

  const timeOr = (value: number | null, title?: string) =>
    value === null ? nc() : <span className="tabular-nums" title={title}>{fmtMinutes(value)}</span>;

  const renderEmpty = (message: string) => (
    <div className="h-full min-h-[120px] flex flex-col items-center justify-center gap-2 p-6 text-center text-text-secondary">
      <ListIcon className="w-6 h-6 text-text-muted" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );

  const buildExportFor = useCallback(
    (target: ViewKey): ExportData => {
      const dateTag = new Date().toISOString().slice(0, 10);
      if (target === 'results') {
        const headers: Header[] = [
          { key: 'trip', label: t('pr.trip', 'Trip') },
          { key: 'truck', label: t('pr.truck', 'Truck') },
          { key: 'trailer', label: t('pr.trailer', 'Trailer') },
          { key: 'driver', label: t('pr.driver', 'Driver') },
          { key: 'distance', label: t('pr.distance_km', 'Distance (km)'), align: 'right' },
          { key: 'elapsed', label: `${t('up_elapsed_time', 'Elapsed time')} (min)`, align: 'right' },
          { key: 'elapsedBasis', label: t('up_elapsed_basis', 'Time basis') },
          { key: 'driving', label: `${t('pr.driving_time', 'Driving time')} (min)`, align: 'right' },
          { key: 'waiting', label: `${t('pr.waiting', 'Waiting')} (min)`, align: 'right' },
          { key: 'loading', label: `${t('pr.loading', 'Loading')} (min)`, align: 'right' },
          { key: 'unloading', label: `${t('pr.unloading', 'Unloading')} (min)`, align: 'right' },
          { key: 'departure', label: t('pr.departure', 'Departure') },
          { key: 'arrival', label: t('pr.arrival', 'Arrival') },
          { key: 'toll', label: t('pr.toll', 'Toll'), align: 'right' },
          { key: 'fuel', label: t('pr.fuel', 'Fuel'), align: 'right' },
          { key: 'driverCost', label: t('pr.driver_cost', 'Driver cost'), align: 'right' },
          { key: 'other', label: t('pr.other_costs', 'Other costs'), align: 'right' },
          { key: 'totalCost', label: t('pr.total_cost', 'Total cost'), align: 'right' },
          { key: 'revenue', label: t('pr.revenue', 'Revenue'), align: 'right' },
          { key: 'profit', label: t('pr.profit', 'Profit'), align: 'right' },
          { key: 'costBasis', label: t('up_res_cost_basis', 'Cost basis') },
          { key: 'emptyKm', label: t('pr.empty_km', 'Empty km'), align: 'right' },
          { key: 'utilization', label: `${t('pr.utilization', 'Utilization')} (%)`, align: 'right' },
          { key: 'currency', label: t('pr.currency', 'Currency') },
          { key: 'status', label: t('pr.status', 'Status') },
        ];
        const rows = metrics.map((m) => ({
          trip: m.tripNumber,
          truck: m.truckPlate,
          trailer: m.trailerPlate,
          driver: m.driverName,
          distance: m.distanceKm ?? '',
          elapsed: m.elapsedMin ?? '',
          elapsedBasis: m.elapsedBasis === 'actual' ? t('up_time_actual', 'actual') : m.elapsedBasis === 'planned' ? t('up_time_planned', 'planned') : '',
          driving: m.drivingMin ?? '',
          waiting: m.waitingMin ?? '',
          loading: m.loadingMin ?? '',
          unloading: m.unloadingMin ?? '',
          departure: fmtDateTime(m.departure),
          arrival: fmtDateTime(m.arrival),
          toll: m.toll ?? '',
          fuel: m.fuelCost ?? '',
          driverCost: m.driverCost ?? '',
          other: m.otherCost ?? '',
          totalCost: m.totalCost ?? '',
          revenue: m.revenue ?? '',
          profit: m.profit ?? '',
          costBasis: m.costBasis,
          emptyKm: m.emptyKm ?? '',
          utilization: m.utilizationPct ?? '',
          currency: m.currency,
          status: t(`operational_${operationalStatusForDisplay({ status: m.status })}`, m.status || ''),
        }));
        return { fileBase: `planning-results-${dateTag}`, headers, rows };
      }

      if (target === 'route') {
        const headers: Header[] = [
          { key: 'num', label: '#', align: 'right' },
          { key: 'type', label: t('pr.type', 'Type') },
          { key: 'location', label: t('pr.location', 'Location') },
          { key: 'company', label: t('pr.company', 'Company') },
          { key: 'timeWindow', label: t('pr.time_window', 'Time window') },
          { key: 'calculatedEta', label: t('up_eta_calculated', 'Calculated ETA') },
          { key: 'plannedEta', label: t('up_eta_planned', 'Planned ETA') },
          { key: 'difference', label: t('up_eta_difference', 'Difference') },
          { key: 'ata', label: t('pr.ata', 'ATA') },
          { key: 'service', label: `${t('pr.service_time', 'Service time')} (min)`, align: 'right' },
          { key: 'distance', label: `${t('pr.distance_from_prev', 'Distance from previous stop')} (km)`, align: 'right' },
          { key: 'tasks', label: t('pr.tasks', 'Tasks') },
        ];
        if (!selected) return { fileBase: `planning-route-${dateTag}`, headers, rows: [] };
        const rows = selected.stops.map((stop: any, index: number) => {
          const type = String(stop?.type || '').toLowerCase();
          const service = minutesBetween(stop?.ata, stop?.completedAt);
          const etaStop = etaStopFor(stop);
          const planned = etaStop?.plannedEta || stop?.eta || null;
          return {
            num: index + 1,
            type:
              type === 'pickup'
                ? t('pr.pickup', 'Pickup')
                : type === 'delivery'
                ? t('pr.delivery', 'Delivery')
                : stop?.type || '',
            location: [stop?.city, stop?.address].filter(Boolean).join(', '),
            company: stop?.companyName || '',
            // A fixed appointment is one exact instant: print one time, not a
            // fabricated `08:00 – 09:00` or next-day maximum.
            timeWindow: formatAppointmentInstants(stop?.timeWindowMin, stop?.timeWindowMax, appLocale),
            calculatedEta: fmtDateTime(etaStop?.liveEta),
            plannedEta: fmtDateTime(planned),
            difference: fmtEtaDifference(
              etaStop?.deviationMin,
              t('up_eta_on_time', 'On time'),
              t('up_eta_minutes', 'min'),
            ),
            ata: fmtDateTime(stop?.ata),
            service: service ?? '',
            distance: toNum(stop?.distanceToStopKm) ?? '',
            tasks: (stop?.tasks || []).map((task: any) => task?.type || '').filter(Boolean).join(', '),
          };
        });
        return { fileBase: `planning-route-${dateTag}`, headers, rows };
      }

      if (target === 'costs') {
        const headers: Header[] = [
          { key: 'category', label: t('pr.cost_category', 'Category') },
          { key: 'type', label: t('pr.cost_type', 'Cost type') },
          { key: 'description', label: t('pr.description', 'Description') },
          { key: 'amount', label: t('pr.amount', 'Amount'), align: 'right' },
          { key: 'currency', label: t('pr.currency', 'Currency') },
          { key: 'source', label: t('pr.source', 'Source') },
        ];
        if (selected) {
          const rows: Record<string, any>[] = selected.costs.map((cost: any) => ({
            category: t(`pr.cat_${costBucket(cost)}`, costBucket(cost)),
            type: cost?.type || '',
            description: cost?.description || '',
            amount: toNum(cost?.amount) ?? '',
            currency: selected.currency,
            source: t('pr.recorded', 'Recorded'),
          }));
          if (selected.estimatedBreakdown) {
            const breakdown = selected.estimatedBreakdown;
            const componentRows: Array<
              [string, string, 'fuel' | 'toll' | 'driver' | 'maintenance' | 'fixed' | 'manual']
            > = [
              ['up_res_fuel', 'Fuel', 'fuel'],
              ['up_res_toll', 'Toll', 'toll'],
              ['up_res_driver', 'Driver', 'driver'],
              ['up_res_maintenance', 'Maintenance', 'maintenance'],
              ['up_res_fixed', 'Fixed / ownership', 'fixed'],
              ['up_res_manual', 'Manual / other', 'manual'],
            ];
            for (const [key, fallback, field] of componentRows) {
              rows.push({
                category: t(key, fallback),
                type: '',
                description: '',
                amount:
                  field === 'driver' && breakdown.driverCostSource === 'unavailable'
                    ? ''
                    : breakdown[field] ?? '',
                currency: selected.currency,
                source: t('up_res_cost_engine', 'CostEngine'),
              });
            }
          }
          if (selected.recordedTotal !== null) {
            rows.push({
              category: t('pr.recorded_costs', 'Recorded costs'),
              type: '',
              description: '',
              amount: selected.recordedTotal,
              currency: selected.currency,
              source: t('pr.recorded', 'Recorded'),
            });
          }
          rows.push({
            category: t('pr.total_cost', 'Total cost'),
            type: '',
            description: '',
            amount: selected.totalCost ?? '',
            currency: selected.currency,
            source: basisLabel(selected.costBasis),
          });
          return { fileBase: `planning-costs-${dateTag}`, headers, rows };
        }
        const currency = totals.currency || 'MIXED';
        const componentSource = t('up_res_basis_mixed', 'Mixed (recorded + estimated)');
        const rows = [
          { category: t('pr.cat_fuel', 'Fuel'), amount: totals.fuel ?? '', source: componentSource },
          { category: t('pr.cat_toll', 'Toll'), amount: totals.toll ?? '', source: componentSource },
          { category: t('pr.cat_driver', 'Driver salaries'), amount: totals.driver ?? '', source: componentSource },
          { category: t('pr.cat_other', 'Other costs'), amount: totals.other ?? '', source: componentSource },
          {
            category: t('pr.total_cost', 'Total cost'),
            amount: totals.totalCost ?? '',
            source: partialAggregate
              ? t('up_res_aggregate_partial', 'Totals include only trips with a value')
              : t('pr.total', 'Total'),
          },
        ].map((row) => ({ ...row, currency, type: '', description: '' }));
        return { fileBase: `planning-costs-${dateTag}`, headers, rows };
      }

      if (target === 'driver') {
        const headers: Header[] = [
          { key: 'driver', label: t('pr.driver', 'Driver') },
          { key: 'trips', label: t('pr.trips_assigned', 'Assigned trips'), align: 'right' },
          { key: 'daily', label: `${t('up_res_tacho_daily', "Today's driving (recorded)")} (h)`, align: 'right' },
          { key: 'weekly', label: `${t('up_res_tacho_weekly', 'Weekly driving (recorded)')} (h)`, align: 'right' },
          { key: 'remaining', label: `${t('up_res_tacho_remaining', 'Weekly remaining (recorded)')} (h)`, align: 'right' },
          { key: 'status', label: t('pr.hos_status', 'HOS status') },
          { key: 'source', label: t('up_res_tacho_source', 'Source / last record') },
          { key: 'payMode', label: t('pr.pay_mode', 'Pay mode') },
          { key: 'payRate', label: t('pr.pay_rate', 'Rate'), align: 'right' },
        ];
        const rows = driverRows.map((row) => {
          const data = row.driver?.id ? tachoByDriver[row.driver.id] : null;
          const summary = data?.summary || {};
          const available = data?.available === true;
          const daily = available ? toNum(summary.dailyDrivingSeconds) : null;
          const weekly = available ? toNum(summary.weeklyDrivingSeconds) : null;
          const remaining = available ? toNum(summary.weeklyDrivingRemainingSeconds) : null;
          const over =
            available &&
            ((weekly !== null && weekly >= 56 * 3600) || (daily !== null && daily >= 9 * 3600));
          return {
            driver: row.name,
            trips: row.tripCount,
            daily: daily === null ? '' : Math.round((daily / 3600) * 10) / 10,
            weekly: weekly === null ? '' : Math.round((weekly / 3600) * 10) / 10,
            remaining: remaining === null ? '' : Math.round((remaining / 3600) * 10) / 10,
            status: !available
              ? t('up_res_tacho_none', 'No tachograph records')
              : over
              ? t('up_res_tacho_over', 'Limit exceeded in recorded data')
              : t('up_res_tacho_within', 'No violations in recorded data'),
            source: available
              ? `${data?.source || 'tachograph'}${data?.lastRecordAt ? ` · ${fmtDateTime(data.lastRecordAt)}` : ''}`
              : '',
            payMode: row.payMode,
            payRate: row.payRate ?? '',
          };
        });
        return { fileBase: `planning-driver-hours-${dateTag}`, headers, rows };
      }

      if (target === 'conflicts') {
        const headers: Header[] = [
          { key: 'level', label: t('pr.level', 'Level') },
          { key: 'code', label: t('pr.code', 'Code') },
          { key: 'message', label: t('pr.message', 'Message') },
          { key: 'trip', label: t('pr.related_trip', 'Related trip') },
          { key: 'resource', label: t('pr.related_resource', 'Related resource') },
        ];
        const rows = conflicts.map((conflict: any) => ({
          level: conflict?.level || '',
          code: conflict?.code || '',
          message: conflict?.message || '',
          trip: conflict?.tripId ? tripNumberById.get(conflict.tripId) || conflict.tripId : '',
          resource: conflict?.resourceId ? resourceLabel(conflict.resourceId) : '',
        }));
        return { fileBase: `planning-conflicts-${dateTag}`, headers, rows };
      }

      const headers: Header[] = [
        { key: 'trip', label: t('pr.trip', 'Trip') },
        { key: 'truck', label: t('pr.truck', 'Truck') },
        { key: 'fuelType', label: t('pr.fuel_type', 'Fuel type') },
        { key: 'distance', label: t('pr.distance_km', 'Distance (km)'), align: 'right' },
        { key: 'consumption', label: t('truck_fuel_consumption', 'Consumption'), align: 'right' },
        { key: 'energy', label: t('truck_estimated_energy', 'Estimated energy'), align: 'right' },
        { key: 'factor', label: t('truck_co2_factor', 'CO₂ factor'), align: 'right' },
        { key: 'co2', label: t('pr.estimated_co2', 'Estimated CO₂ (kg)'), align: 'right' },
        { key: 'status', label: t('pr.status', 'Status') },
      ];
      const rows = metrics.map((m) => ({
        trip: m.tripNumber,
        truck: m.truckPlate,
        fuelType: m.fuelType ? fuelTypeLabel(m.fuelType, t) : '',
        distance: m.distanceKm ?? '',
        consumption: m.consumption === null ? '' : `${m.consumption} ${m.consumptionUnit || ''}`.trim(),
        energy: m.energyQuantity === null
          ? ''
          : `${fmtNumber(m.energyQuantity, 1)} ${energyUnit(m.consumptionUnit)}`.trim(),
        factor: m.emissionFactor === null || m.emissionFactor === undefined ? '' : fmtNumber(m.emissionFactor, 2),
        co2: m.co2Kg === null || m.co2Kg === undefined ? '' : fmtNumber(m.co2Kg, 1),
        status:
          m.co2Kg !== null
            ? t('pr.estimated', 'Estimated')
            : m.emissionMissing === 'fuel_type'
            ? t('up_res_fuel_type_missing', 'Fuel type not configured')
            : m.emissionMissing === 'unit'
            ? t('truck_energy_unavailable', 'Estimated energy is unavailable without a configured fuel type, consumption and distance.')
            : m.emissionMissing === 'consumption'
            ? t('up_res_consumption_missing', 'Consumption not configured')
            : m.emissionMissing === 'distance'
            ? t('up_res_distance_missing', 'Distance not calculated')
            : t(emissionUnavailableKey(m.emissionReason), 'CO₂ calculation unavailable — emission factor not configured.'),
      }));
      return { fileBase: `planning-emissions-${dateTag}`, headers, rows };
    },
    [
      conflicts,
      driverRows,
      metrics,
      resourceLabel,
      selected,
      t,
      totals.currency,
      totals.driver,
      totals.fuel,
      totals.other,
      totals.toll,
      tripNumberById,
      tachoByDriver,
      partialAggregate,
      totals.totalCost,
    ],
  );

  const currentExport = useMemo(() => buildExportFor(view), [buildExportFor, view]);
  const canExport = currentExport.rows.length > 0;

  const exportView = useCallback(
    async (format: ExportFormat) => {
      if (!currentExport.rows.length) return;
      setExporting(format);
      const { fileBase, headers, rows } = currentExport;
      const subtitle = reportSubtitle(rows.length);
      try {
        if (format === 'xlsx') {
          const { exportExcel } = await import('../../lib/exportExcel');
          await exportExcel({
            filename: `${fileBase}.xlsx`,
            sheetName: t('pr.title', 'Planning Calculation Results').slice(0, 31),
            title: t('pr.title', 'Planning Calculation Results'),
            subtitle,
            headers,
            rows,
          });
        } else if (format === 'csv') {
          const lines = [
            t('pr.title', 'Planning Calculation Results'),
            subtitle,
            '',
            headers.map((header) => csvEscape(header.label)).join(','),
            ...rows.map((row) => headers.map((header) => csvEscape(row[header.key])).join(',')),
          ];
          downloadBlob(
            new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' }),
            `${fileBase}.csv`,
          );
        } else {
          const jsPdfModule: any = await import('jspdf');
          const JsPDF = jsPdfModule.default ?? jsPdfModule;
          const autoTableModule: any = await import('jspdf-autotable');
          const autoTable = autoTableModule.default ?? autoTableModule;
          const doc = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          const pageWidth = doc.internal.pageSize.getWidth();
          doc.setFontSize(14);
          doc.setTextColor(15, 23, 42);
          doc.text(t('pr.title', 'Planning Calculation Results'), 40, 40);
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(subtitle, 40, 56, { maxWidth: pageWidth - 80 });
          const columnStyles: Record<number, any> = {};
          headers.forEach((header, index) => {
            columnStyles[index] = { halign: header.align || 'left' };
          });
          autoTable(doc, {
            startY: 72,
            head: [headers.map((header) => header.label)],
            body: rows.map((row) => headers.map((header) => (row[header.key] === null || row[header.key] === undefined ? '' : String(row[header.key])))),
            styles: { fontSize: 6.5, cellPadding: 3, overflow: 'linebreak', textColor: [30, 41, 59] },
            headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: [255, 247, 240] },
            columnStyles,
            margin: { left: 40, right: 40 },
          });
          doc.save(`${fileBase}.pdf`);
        }
      } catch (error) {
        console.error('Planning results export failed', error);
      } finally {
        setExporting(null);
      }
    },
    [currentExport, reportSubtitle, t],
  );

  const handleRecalculateCosts = useCallback(async () => {
    if (!selected || costRecalculating) return;
    setCostRecalculating(true);
    setCostNotice(null);
    try {
      await planningApi.recalculateTripCosts(selected.id);
      await onRefresh?.();
      setCostNotice(t('up_res_recalc_success', 'Costs recalculated with the CostEngine.'));
    } catch {
      setCostNotice(t('up_res_recalc_failed', 'Could not recalculate costs. Please try again.'));
    } finally {
      setCostRecalculating(false);
    }
  }, [selected, costRecalculating, onRefresh, t]);

  const viewOptions = [
    {
      value: 'results',
      label: (
        <span className="flex items-center gap-1.5">
          <ListIcon className="w-3.5 h-3.5" />
          {t('pr.results', 'Results')}
        </span>
      ),
    },
    {
      value: 'route',
      label: (
        <span className="flex items-center gap-1.5">
          <MapIcon className="w-3.5 h-3.5" />
          {t('pr.route', 'Route & Stops')}
        </span>
      ),
    },
    {
      value: 'costs',
      label: (
        <span className="flex items-center gap-1.5">
          <Euro className="w-3.5 h-3.5" />
          {t('pr.costs', 'Costs & Revenue')}
        </span>
      ),
    },
    {
      value: 'driver',
      label: (
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {t('pr.driver_hours', 'Driver Hours')}
        </span>
      ),
    },
    {
      value: 'conflicts',
      label: (
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          {t('pr.conflicts', 'Conflicts')}
        </span>
      ),
    },
    {
      value: 'emissions',
      label: (
        <span className="flex items-center gap-1.5">
          <Leaf className="w-3.5 h-3.5" />
          {t('pr.emissions', 'Emissions')}
        </span>
      ),
    },
  ];

  const thBase =
    'sticky top-0 z-10 bg-surface px-2.5 py-2 text-[9px] font-black uppercase tracking-wider text-text-secondary border-b border-border whitespace-nowrap';
  const thL = `${thBase} text-left`;
  const thR = `${thBase} text-right`;
  const td = 'px-2.5 py-1.5 whitespace-nowrap text-text-primary border-b border-border/40';
  const tdR = 'px-2.5 py-1.5 whitespace-nowrap text-right tabular-nums text-text-primary border-b border-border/40';

  const summaryCard = (label: string, value: any, tone = 'text-text-primary') => (
    <div className="rounded-xl border border-border bg-surface/60 px-3 py-2 min-w-[130px]">
      <div className="text-[9px] font-black uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={`mt-0.5 text-sm font-black tabular-nums ${tone}`}>{value}</div>
    </div>
  );

  const resultColumns = [
    { key: 'tripNumber', index: 1, label: t('pr.trip', 'Trip') },
    { key: 'truckPlate', index: 2, label: t('pr.truck', 'Truck') },
    { key: 'trailerPlate', index: 3, label: t('pr.trailer', 'Trailer') },
    { key: 'driverName', index: 4, label: t('pr.driver', 'Driver') },
    { key: 'distanceKm', index: 5, label: t('pr.distance_km', 'Distance (km)') },
    { key: 'elapsedMin', index: 6, label: t('up_elapsed_time', 'Elapsed time') },
    { key: 'drivingMin', index: 7, label: t('pr.driving_time', 'Driving time') },
    { key: 'waitingMin', index: 8, label: t('pr.waiting', 'Waiting') },
    { key: 'loadingMin', index: 9, label: t('pr.loading', 'Loading') },
    { key: 'unloadingMin', index: 10, label: t('pr.unloading', 'Unloading') },
    { key: 'departure', index: 11, label: t('pr.departure', 'Departure') },
    { key: 'arrival', index: 12, label: t('pr.arrival', 'Arrival') },
    { key: 'toll', index: 13, label: t('pr.toll', 'Toll') },
    { key: 'fuelCost', index: 14, label: t('pr.fuel', 'Fuel') },
    { key: 'driverCost', index: 15, label: t('pr.driver_cost', 'Driver cost') },
    { key: 'otherCost', index: 16, label: t('pr.other_costs', 'Other costs') },
    { key: 'totalCost', index: 17, label: t('pr.total_cost', 'Total cost') },
    { key: 'revenue', index: 18, label: t('pr.revenue', 'Revenue') },
    { key: 'profit', index: 19, label: t('pr.profit', 'Profit') },
    { key: 'emptyKm', index: 20, label: t('pr.empty_km', 'Empty km') },
    { key: 'utilizationPct', index: 21, label: t('pr.utilization', 'Utilization') },
    { key: 'status', index: 22, label: t('pr.status', 'Status') },
  ];

  const hiddenColumnCss = resultColumns
    .filter((column) => visibleColumns[column.key] === false)
    .map((column) => `.pr-results-table tr > *:nth-child(${column.index}){display:none}`)
    .join('\n');

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => {
      const next = { ...prev, [key]: prev[key] === false };
      try {
        window.localStorage.setItem('hapcargo:planningResultsColumns', JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const renderResults = () => {
    if (metrics.length === 0) return renderEmpty(t('pr.no_trips', 'No trips in range'));
    return (
      <div className="flex h-full min-h-0 flex-col">
        {hiddenColumnCss ? <style>{hiddenColumnCss}</style> : null}
        <div className="shrink-0 flex flex-wrap items-center gap-1.5 border-b border-border bg-surface/70 px-2 py-1.5">
          <input
            value={quickFilter}
            onChange={(event) => setQuickFilter(event.target.value)}
            placeholder={t('up_res_filter', 'Filter trips…')}
            className="input h-7 w-44 text-[10px]"
            aria-label={t('up_res_filter', 'Filter trips…')}
          />
          <CustomSelect
            size="sm"
            className="w-36"
            value={statusFilterValue || '__all'}
            onChange={(value) => setStatusFilterValue(value === '__all' ? '' : value)}
            options={[
              { value: '__all', label: t('up_res_all_statuses', 'All statuses') },
              ...TRIP_STATUS_VALUES.map((status) => ({ value: status, label: t(`operational_${status}`, status) })),
            ]}
            title={t('up_res_status', 'Status')}
          />
          <CustomSelect
            size="sm"
            className="w-40"
            value={sortKey}
            onChange={setSortKey}
            options={sortOptions.map((option) => ({ value: option.key, label: option.label }))}
            title={t('up_res_sort', 'Sort by')}
          />
          <button
            type="button"
            onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="btn-secondary h-7 px-2 text-[10px] font-black"
            title={sortDir === 'asc' ? t('up_res_asc', 'Ascending') : t('up_res_desc', 'Descending')}
            aria-label={sortDir === 'asc' ? t('up_res_asc', 'Ascending') : t('up_res_desc', 'Descending')}
          >
            {sortDir === 'asc' ? '\u2191' : '\u2193'}
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumns((prev) => !prev)}
              className="btn-secondary h-7 px-2 text-[10px] font-bold"
              title={t('up_res_columns', 'Columns')}
            >
              {t('up_res_columns', 'Columns')}
            </button>
            {showColumns && (
              <div className="absolute left-0 top-8 z-30 max-h-64 w-52 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {resultColumns.map((column) => (
                  <label key={column.key} className="flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-[10px] text-text-primary hover:bg-surface">
                    <input
                      type="checkbox"
                      className="checkbox"
                      checked={visibleColumns[column.key] !== false}
                      onChange={() => toggleColumn(column.key)}
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setCompareMode((prev) => !prev);
              if (compareMode) setCompareIds([]);
            }}
            className={`h-7 px-2 text-[10px] font-black rounded-lg border ${compareMode ? 'bg-primary text-white border-primary' : 'bg-card border-border text-text-secondary'}`}
            title={t('up_res_compare_hint', 'Compare mode: click up to 3 trips to compare them')}
          >
            {t('up_res_compare', 'Compare')}
          </button>
          {compareMode && (
            <span className="text-[9px] font-semibold text-primary" title={t('up_res_compare_max', 'You can compare at most 3 trips')}>
              {t('up_res_compare_hint', 'Compare mode: click up to 3 trips to compare them')} ({compareIds.length}/3)
            </span>
          )}
          {compareIds.length > 0 && (
            <button type="button" onClick={() => setCompareIds([])} className="text-[10px] font-bold text-primary hover:underline">
              {t('up_res_clear', 'Clear selection')}
            </button>
          )}
          <span className="ml-auto text-[9px] font-bold text-text-muted">
            {displayMetrics.length} / {metrics.length}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto custom-scrollbar border-b border-border bg-card/20">
        {compareMetrics.length >= 2 && (
          <div className="border-b border-border bg-primary/5 p-2">
            <table className="w-full min-w-max border-collapse text-[10px]">
              <thead>
                <tr>
                  <th className="px-2 py-1 text-left text-[9px] font-black uppercase text-text-secondary">
                    {t('up_res_compare', 'Compare')}
                  </th>
                  {compareMetrics.map((metric) => (
                    <th key={metric.id} className="px-2 py-1 text-right text-[9px] font-black text-text-primary">
                      {metric.tripNumber || metric.id.slice(0, 8)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { key: 'distanceKm', label: t('pr.distance_km', 'Distance (km)'), format: (value: any) => (value === null ? '—' : `${fmtNumber(value, 0)} km`) },
                  { key: 'elapsedMin', label: t('up_elapsed_time', 'Elapsed time'), format: (value: any) => (value === null ? '—' : fmtMinutes(value)) },
                  { key: 'drivingMin', label: t('pr.driving_time', 'Driving time'), format: (value: any) => (value === null ? '—' : fmtMinutes(value)) },
                  { key: 'toll', label: t('pr.toll', 'Toll'), format: (value: any, currency: string) => (value === null ? '—' : fmtMoney(value, currency)) },
                  { key: 'totalCost', label: t('pr.total_cost', 'Total cost'), format: (value: any, currency: string) => (value === null ? '—' : fmtMoney(value, currency)) },
                  { key: 'revenue', label: t('pr.revenue', 'Revenue'), format: (value: any, currency: string) => (value === null ? '—' : fmtMoney(value, currency)) },
                  { key: 'profit', label: t('pr.profit', 'Profit'), format: (value: any, currency: string) => (value === null ? '—' : fmtMoney(value, currency)) },
                  { key: 'utilizationPct', label: t('pr.utilization', 'Utilization'), format: (value: any) => (value === null ? '—' : `${fmtNumber(value, 0)}%`) },
                ].map((row) => (
                  <tr key={row.key} className="border-t border-border/40">
                    <td className="px-2 py-1 text-[10px] font-bold text-text-secondary">{row.label}</td>
                    {compareMetrics.map((metric) => (
                      <td key={`${row.key}-${metric.id}`} className="px-2 py-1 text-right tabular-nums text-text-primary">
                        {row.format((metric as any)[row.key], metric.currency)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {displayMetrics.length === 0 ? (
          renderEmpty(t('pr.no_trips', 'No trips in range'))
        ) : (
        <table className="pr-results-table w-full min-w-max border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={thL}>{t('pr.trip', 'Trip')}</th>
              <th className={thL}>{t('pr.truck', 'Truck')}</th>
              <th className={thL}>{t('pr.trailer', 'Trailer')}</th>
              <th className={thL}>{t('pr.driver', 'Driver')}</th>
              <th className={thR}>{t('pr.distance_km', 'Distance (km)')}</th>
              <th className={thR} title={t('up_elapsed_hint', 'Departure to arrival, including waiting, service and overnight periods.')}>{t('up_elapsed_time', 'Elapsed time')}</th>
              <th className={thR} title={t('up_res_driving_estimated_hint', 'Estimated from the planned route; not recorded tachograph driving time.')}>{t('pr.driving_time', 'Driving time')}</th>
              <th className={thR} title={t('up_res_waiting_estimated_hint', 'Planned waiting time from the route plan; not recorded waiting.')}>{t('pr.waiting', 'Waiting')}</th>
              <th className={thR} title={t('up_res_service_estimated_hint', 'Planned loading/unloading service time from the route plan; not recorded service.')}>{t('pr.loading', 'Loading')}</th>
              <th className={thR} title={t('up_res_service_estimated_hint', 'Planned loading/unloading service time from the route plan; not recorded service.')}>{t('pr.unloading', 'Unloading')}</th>
              <th className={thL}>{t('pr.departure', 'Departure')}</th>
              <th className={thL}>{t('pr.arrival', 'Arrival')}</th>
              <th className={thR}>{t('pr.toll', 'Toll')}</th>
              <th className={thR}>{t('pr.fuel', 'Fuel')}</th>
              <th className={thR}>{t('pr.driver_cost', 'Driver cost')}</th>
              <th className={thR}>{t('pr.other_costs', 'Other costs')}</th>
              <th className={thR}>{t('pr.total_cost', 'Total cost')}</th>
              <th className={thR}>{t('pr.revenue', 'Revenue')}</th>
              <th className={thR}>{t('pr.profit', 'Profit')}</th>
              <th className={thR}>{t('pr.empty_km', 'Empty km')}</th>
              <th className={thR}>{t('pr.utilization', 'Utilization')}</th>
              <th className={thL}>{t('pr.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {displayMetrics.map((m) => (
              <tr
                key={m.id}
                onClick={() => (compareMode ? toggleCompare(m.id) : onSelectTrip?.(m.id))}
                className={`cursor-pointer transition-colors ${
                  compareIds.includes(m.id)
                    ? 'bg-primary/15 ring-1 ring-inset ring-primary/30'
                    : selected?.id === m.id
                    ? 'bg-primary/10'
                    : 'hover:bg-primary/5'
                }`}
              >
                <td className={`${td} font-bold`}>{m.tripNumber || np()}</td>
                <td className={td}>{m.truckPlate || np()}</td>
                <td className={td}>
                  {m.trailerPlate ? (
                    <span title={assignmentTitle(m.trailerSource)}>{m.trailerPlate}</span>
                  ) : (
                    np()
                  )}
                </td>
                <td className={td} title={assignmentTitle(m.driverSource)}>
                  {m.driverName || np()}
                </td>
                <td className={tdR}>{m.distanceKm === null ? np() : fmtNumber(m.distanceKm, 0)}</td>
                <td
                  className={tdR}
                  title={`${t('up_elapsed_hint', 'Departure to arrival, including waiting, service and overnight periods.')} · ${m.elapsedBasis === 'actual' ? t('up_time_actual', 'actual') : t('up_time_planned', 'planned')}`}
                >
                  {timeOr(m.elapsedMin)}
                </td>
                <td className={tdR} title={m.drivingBasis === 'estimated' ? t('up_res_driving_estimated_hint', 'Estimated from the planned route; not recorded tachograph driving time.') : undefined}>
                  {timeOr(m.drivingMin)}
                </td>
                <td className={tdR} title={m.waitingBasis === 'estimated' ? t('up_res_waiting_estimated_hint', 'Planned waiting time from the route plan; not recorded waiting.') : undefined}>
                  {timeOr(m.waitingMin)}
                </td>
                <td className={tdR} title={m.loadingBasis === 'estimated' ? t('up_res_service_estimated_hint', 'Planned loading/unloading service time from the route plan; not recorded service.') : undefined}>
                  {timeOr(m.loadingMin)}
                </td>
                <td className={tdR} title={m.unloadingBasis === 'estimated' ? t('up_res_service_estimated_hint', 'Planned loading/unloading service time from the route plan; not recorded service.') : undefined}>
                  {timeOr(m.unloadingMin)}
                </td>
                <td className={td}>
                  {m.departure ? <span className="tabular-nums">{fmtDateTime(m.departure)}</span> : np()}
                </td>
                <td className={td}>
                  {m.arrival ? <span className="tabular-nums">{fmtDateTime(m.arrival)}</span> : np()}
                </td>
                <td className={tdR}>{componentMoney(m.toll, m.componentBasis.toll, m.currency)}</td>
                <td className={tdR}>{componentMoney(m.fuelCost, m.componentBasis.fuel, m.currency)}</td>
                <td
                  className={tdR}
                  title={
                    m.driverCostSource === 'unavailable'
                      ? t('up_res_driver_unavailable', 'No valid driver compensation profile')
                      : m.driverCostSource
                        ? `${t('up_res_cost_engine', 'CostEngine')} · ${m.driverCostSource}`
                        : undefined
                  }
                >
                  {componentMoney(m.driverCost, m.componentBasis.driver, m.currency)}
                </td>
                <td className={tdR}>{componentMoney(m.otherCost, m.componentBasis.other, m.currency)}</td>
                <td className={`${tdR} font-bold`}>
                  {moneyOr(m.totalCost, m.currency)}
                  {m.totalCost !== null && (
                    <span className="ml-1 text-[8px] font-bold uppercase tracking-wide text-text-muted">
                      {basisShort(m.costBasis)}
                    </span>
                  )}
                </td>
                <td className={tdR}>{moneyOr(m.revenue, m.currency)}</td>
                <td
                  className={`${tdR} font-bold ${
                    m.profit === null ? '' : m.profit < 0 ? 'text-rose-500' : 'text-emerald-600'
                  }`}
                >
                  {moneyOr(m.profit, m.currency)}
                  {m.profit !== null && (
                    <span className="ml-1 text-[8px] font-bold uppercase tracking-wide text-text-muted">
                      {basisShort(m.costBasis)}
                    </span>
                  )}
                </td>
                <td className={tdR}>
                  {m.emptyKm === null || m.emptyKm === undefined ? nc() : <span className="tabular-nums">{fmtNumber(m.emptyKm, 0)}</span>}
                </td>
                <td className={tdR}>
                  {m.utilizationPct === null ? nc() : `${fmtNumber(m.utilizationPct, 0)}%`}
                </td>
                <td className={td}>{statusBadge(m.status)}</td>
              </tr>
            ))}
            <tr className="bg-surface/80 font-bold">
              <td className={`${td} text-[10px]`}>
                {t('pr.total', 'Total')} ({displayMetrics.length})
              </td>
              <td className={td} />
              <td className={td} />
              <td className={td} />
              <td className={tdR}>{totals.distance === null ? '—' : fmtNumber(totals.distance, 0)}</td>
              <td className={tdR}>{totals.elapsed === null ? '—' : fmtMinutes(totals.elapsed)}</td>
              <td className={tdR}>{totals.driving === null ? '—' : fmtMinutes(totals.driving)}</td>
              <td className={tdR}>{totals.waiting === null ? '—' : fmtMinutes(totals.waiting)}</td>
              <td className={tdR}>{totals.loading === null ? '—' : fmtMinutes(totals.loading)}</td>
              <td className={tdR}>{totals.unloading === null ? '—' : fmtMinutes(totals.unloading)}</td>
              <td className={td} />
              <td className={td} />
              <td className={tdR}>{totalMoney(totals.toll)}</td>
              <td className={tdR}>{totalMoney(totals.fuel)}</td>
              <td className={tdR}>{totalMoney(totals.driver)}</td>
              <td className={tdR}>{totalMoney(totals.other)}</td>
              <td className={tdR}>{totalMoney(totals.totalCost)}</td>
              <td className={tdR}>{totalMoney(totals.revenue)}</td>
              <td className={tdR}>{totalMoney(totals.profit)}</td>
              <td className={tdR}>{totals.emptyKm === null ? '—' : fmtNumber(totals.emptyKm, 0)}</td>
              <td className={tdR}>
                {totals.utilization === null ? '—' : `${fmtNumber(totals.utilization, 0)}%`}
              </td>
              <td className={td} />
            </tr>
          </tbody>
        </table>
        )}
        </div>
        <div className="shrink-0 border-t border-border/60 px-2.5 py-1.5 text-[9px] leading-relaxed text-text-muted">
          {t(
            'up_res_basis_note',
            '“Est.” costs come from the CostEngine; recorded costs come from actual trip expense entries.',
          )}
          {partialAggregate
            ? ` · ${t('up_res_aggregate_partial', 'Totals include only trips with a value')} (${Math.max(totals.counts.totalCost || 0, totals.counts.revenue || 0, totals.counts.profit || 0)}/${metrics.length}).`
            : ''}
        </div>
      </div>
    );
  };

  const renderRoute = () => {
    if (!selected) {
      if (metrics.length === 0) {
        return (
          <div className="flex h-full min-h-[150px] flex-col items-center justify-center gap-2 p-6 text-center">
            <MapIcon className="h-7 w-7 text-text-muted" />
            <p className="text-xs font-black text-text-primary">{t('up_route_no_trips_title', 'No trips available')}</p>
            <p className="max-w-sm text-[10px] text-text-secondary">
              {t('up_route_no_trips_subtitle', 'Change the date range or filters to see trips.')}
            </p>
          </div>
        );
      }
      return (
        <div className="p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="text-[12px] font-black text-text-primary">{t('up_route_select_title', 'Select a trip')}</h4>
              <p className="mt-0.5 text-[10px] text-text-secondary">
                {t('up_route_select_subtitle', 'Choose a transport to open its route, stops and timings.')}
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black text-primary">
              {metrics.length} {t('pr.trips', 'Trips')}
            </span>
          </div>

          {metrics.length > 6 && (
            <div className="relative mt-2">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted" />
              <input
                value={routeSearch}
                onChange={(event) => setRouteSearch(event.target.value)}
                placeholder={t('up_route_search', 'Search trip, truck, driver or trailer…')}
                aria-label={t('up_route_search', 'Search trip, truck, driver or trailer…')}
                className="input h-7 w-full pl-7 text-[10px]"
              />
            </div>
          )}

          <div className="mt-2 grid max-h-[190px] grid-cols-1 gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar md:grid-cols-2 xl:grid-cols-3">
            {routeFilteredMetrics.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectTrip?.(m.id)}
                className="group min-w-0 rounded-lg border border-border bg-surface/60 px-2.5 py-2 text-left transition-colors hover:border-primary/60 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-black text-text-primary">
                    {m.tripNumber || m.id.slice(0, 8)}
                  </span>
                  {statusBadge(m.status)}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-text-secondary">
                  <span className="flex min-w-0 items-center gap-1" title={m.truckPlate || undefined}>
                    <Truck className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{m.truckPlate || np()}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1" title={m.driverName || undefined}>
                    <User className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{m.driverName || np()}</span>
                  </span>
                  <span className="flex min-w-0 items-center gap-1" title={m.trailerPlate || undefined}>
                    <Box className="h-2.5 w-2.5 shrink-0" />
                    <span className="truncate">{m.trailerPlate || np()}</span>
                  </span>
                  <span className="flex items-center justify-end gap-1 tabular-nums">
                    {m.distanceKm === null ? nc() : `${fmtNumber(m.distanceKm, 0)} km`}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {routeFilteredMetrics.length === 0 && (
            <p className="mt-2 text-center text-[10px] text-text-secondary">
              {t('up_route_no_match', 'No trips match this search.')}
            </p>
          )}
        </div>
      );
    }
    const stops = selected.stops;
    return (
      <div className="p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[11px]">
          <span className="font-black text-text-primary">{selected.tripNumber}</span>
          <span>
            <span className="text-text-secondary">{t('pr.truck', 'Truck')}:</span>{' '}
            {selected.truckPlate || np()}
          </span>
          <span>
            <span className="text-text-secondary">{t('pr.driver', 'Driver')}:</span>{' '}
            {selected.driverName || np()}
          </span>
          <span>
            <span className="text-text-secondary">{t('pr.distance_km', 'Distance (km)')}:</span>{' '}
            {selected.distanceKm === null ? nc() : fmtNumber(selected.distanceKm, 0)}
          </span>
          <span>
            <span className="text-text-secondary">{t('up_elapsed_time', 'Elapsed time')}:</span>{' '}
            {timeOr(
              selected.elapsedMin,
              selected.elapsedBasis === 'actual'
                ? t('up_time_actual', 'actual')
                : t('up_time_planned', 'planned'),
            )}
          </span>
          {statusBadge(selected.status)}
        </div>
        {stops.length === 0 ? (
          renderEmpty(t('pr.no_stops', 'No stops for this trip.'))
        ) : (
          <>
            {selectedLiveEta?.available && (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px]">
                <span className={`rounded px-1.5 py-0.5 font-black uppercase ${selectedLiveEta.etaType === 'live_gps' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                  {selectedLiveEta.etaType === 'live_gps'
                    ? t('up_eta_fresh', 'Live GPS')
                    : selectedLiveEta.etaType === 'stale_gps'
                      ? t('up_eta_stale_label', 'Stale GPS')
                      : t('up_eta_untimed_label', 'No GPS timestamp')}
                </span>
                <span className="text-text-secondary">
                  {selectedLiveEta.etaType === 'live_gps'
                    ? t('up_eta_live', 'Live ETA')
                    : selectedLiveEta.etaType === 'stale_gps'
                      ? t('up_eta_stale', 'GPS position is older than 15 minutes — treat this ETA as stale.')
                      : t('up_eta_untimed_note', 'Calculated from the last saved truck position. No GPS timestamp is stored, so this is not a live GPS ETA.')}
                </span>
              </div>
            )}
            <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className={thR}>#</th>
                <th className={thL}>{t('pr.type', 'Type')}</th>
                <th className={thL}>{t('pr.location', 'Location')}</th>
                <th className={thL}>{t('pr.stop', 'Stop')}</th>
                <th className={thL}>{t('pr.time_window', 'Time window')}</th>
                <th className={thL}>{t('up_eta_calculated', 'Calculated ETA')}</th>
                <th className={thL}>{t('up_eta_planned', 'Planned ETA')}</th>
                <th className={thL}>{t('up_eta_difference', 'Difference')}</th>
                <th className={thL}>{t('pr.ata', 'ATA')}</th>
                <th className={thR}>{t('pr.service_time', 'Service time')}</th>
                <th className={thR}>{t('pr.distance_from_prev', 'Distance from previous stop')}</th>
                <th className={thL}>{t('pr.tasks', 'Tasks')}</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop: any, index: number) => {
                const type = String(stop?.type || '').toLowerCase();
                const service = minutesBetween(stop?.ata, stop?.completedAt);
                const etaStop = etaStopFor(stop);
                const planned = etaStop?.plannedEta || stop?.eta || null;
                const difference = fmtEtaDifference(
                  etaStop?.deviationMin,
                  t('up_eta_on_time', 'On time'),
                  t('up_eta_minutes', 'min'),
                );
                const windowValue = formatAppointmentInstants(stop?.timeWindowMin, stop?.timeWindowMax, appLocale);
                const taskLabel = (stop?.tasks || [])
                  .map((task: any) => {
                    const taskType = String(task?.type || '').toLowerCase();
                    if (taskType === 'load') return t('pr.pickup', 'Pickup');
                    if (taskType === 'unload') return t('pr.delivery', 'Delivery');
                    return task?.type || '';
                  })
                  .filter(Boolean)
                  .join(', ');
                return (
                  <tr key={stop?.id || index} className="hover:bg-primary/5">
                    <td className={tdR}>{index + 1}</td>
                    <td className={td}>
                      {type === 'pickup'
                        ? t('pr.pickup', 'Pickup')
                        : type === 'delivery'
                        ? t('pr.delivery', 'Delivery')
                        : stop?.type || np()}
                    </td>
                    <td className={td}>{[stop?.city, stop?.address].filter(Boolean).join(', ') || np()}</td>
                    <td className={td}>{stop?.companyName || np()}</td>
                    <td className={td}>{windowValue || np()}</td>
                    <td className={td}>
                      {fmtClock(etaStop?.liveEta) ? (
                        <span className="tabular-nums font-black text-text-primary" title={fmtDateTime(etaStop?.liveEta)}>{fmtClock(etaStop?.liveEta)}</span>
                      ) : (
                        t('up_eta_no_estimate', 'No estimate')
                      )}
                    </td>
                    <td className={td}>
                      {fmtClock(planned) ? (
                        <span className="tabular-nums" title={fmtDateTime(planned)}>{fmtClock(planned)}</span>
                      ) : (
                        t('up_eta_not_planned', 'Not planned')
                      )}
                    </td>
                    <td className={`${td} font-bold ${Number(etaStop?.deviationMin) > 0 ? 'text-rose-600' : Number(etaStop?.deviationMin) === 0 ? 'text-emerald-600' : ''}`}>
                      {difference || np()}
                    </td>
                    <td className={td}>
                      {fmtDateTime(stop?.ata) ? (
                        <span className="tabular-nums">{fmtDateTime(stop?.ata)}</span>
                      ) : (
                        np()
                      )}
                    </td>
                    <td className={tdR}>{service === null ? nc() : fmtMinutes(service)}</td>
                    <td className={tdR}>
                      {toNum(stop?.distanceToStopKm) === null
                        ? np()
                        : fmtNumber(toNum(stop?.distanceToStopKm), 1)}
                    </td>
                    <td className={td}>{taskLabel || np()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>
    );
  };

  const estimatedCostRows = [
    { key: 'fuel', label: t('up_res_fuel', 'Fuel') },
    { key: 'toll', label: t('up_res_toll', 'Toll') },
    { key: 'driver', label: t('up_res_driver', 'Driver') },
    { key: 'maintenance', label: t('up_res_maintenance', 'Maintenance') },
    { key: 'fixed', label: t('up_res_fixed', 'Fixed / ownership') },
    { key: 'manual', label: t('up_res_manual', 'Manual / other') },
  ];

  const renderEstimatedBreakdown = (breakdown: any, calculatedAt?: any) => {
    if (!breakdown) {
      return (
        <p className="mb-3 rounded-xl border border-dashed border-border px-2.5 py-2 text-[10px] text-text-secondary">
          {t('up_res_breakdown_missing', 'Estimated breakdown is not available. Recalculate the trip to generate it.')}
        </p>
      );
    }
    const currency = selected?.currency || totals.currency || 'EUR';
    return (
      <div className="mb-3 overflow-x-auto rounded-xl border border-border bg-card/40">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-2.5 py-1.5">
          <span className="text-[10px] font-black text-text-primary">
            {t('up_res_estimated_breakdown', 'Estimated cost breakdown')}
          </span>
          <span className="text-[9px] text-text-muted">
            {t('up_res_cost_engine', 'CostEngine')}
            {calculatedAt ? ` · ${t('up_res_calculated_at', 'Calculated')} ${fmtDateTime(calculatedAt)}` : ''}
          </span>
        </div>
        <table className="w-full border-collapse text-[11px]">
          <tbody>
            {estimatedCostRows.map((row) => {
              const value = toNum(breakdown[row.key]);
              return (
                <tr key={row.key} className="border-b border-border/40 last:border-0">
                  <td className={td}>{row.label}</td>
                  <td className={tdR}>
                    {row.key === 'driver' && breakdown.driverCostSource === 'unavailable'
                      ? t('up_res_driver_unavailable', 'No valid driver compensation profile')
                      : row.key === 'fuel' && breakdown.fuelCostAvailable === false
                        ? t('truck_energy_unavailable', 'Fuel cost unavailable — fuel data is not configured')
                        : value === null
                          ? nc()
                          : fmtMoney(value, currency)}
                  </td>
                </tr>
              );
            })}
            <tr className="bg-surface/80 font-bold">
              <td className={td}>{t('up_res_total', 'Total')}</td>
              <td className={tdR}>
                {toNum(breakdown.total) === null ? '—' : fmtMoney(toNum(breakdown.total), currency)}
              </td>
            </tr>
          </tbody>
        </table>
        {Array.isArray(breakdown.estimatedFields) && breakdown.estimatedFields.length > 0 && (
          <p className="border-t border-border px-2.5 py-1.5 text-[9px] leading-relaxed text-amber-600">
            {t('up_res_estimated_fields', 'Calculated with default values for')}:{' '}
            {breakdown.estimatedFields.join(', ')}
          </p>
        )}
      </div>
    );
  };

  const renderCosts = () => {
    if (metrics.length === 0) return renderEmpty(t('pr.no_trips', 'No trips in range'));
    if (!selected) {
      const recorded =
        (totals.fuel ?? 0) + (totals.toll ?? 0) + (totals.driver ?? 0) + (totals.other ?? 0);
      const hasRecorded =
        totals.fuel !== null || totals.toll !== null || totals.driver !== null || totals.other !== null;
      const categories: { key: string; value: number | null }[] = [
        { key: 'cat_fuel', value: totals.fuel },
        { key: 'cat_toll', value: totals.toll },
        { key: 'cat_driver', value: totals.driver },
        { key: 'cat_other', value: totals.other },
      ];
      return (
        <div className="p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {summaryCard(t('pr.revenue', 'Revenue'), totalMoney(totals.revenue), 'text-emerald-600')}
            {summaryCard(t('up_res_cost_basis', 'Cost basis'), partialAggregate ? t('up_res_aggregate_partial', 'Totals include only trips with a value') : t('up_res_aggregate_complete', 'All trips have a value'))}
            {summaryCard(t('pr.recorded_costs', 'Recorded costs'), hasRecorded ? totalMoney(recorded) : nc())}
            {summaryCard(t('pr.estimated_cost', 'Estimated cost'), totalMoney(totals.estimated))}
            {summaryCard(t('pr.total_cost', 'Total cost'), totalMoney(totals.totalCost))}
            {summaryCard(
              t('pr.profit', 'Profit'),
              totalMoney(totals.profit),
              totals.profit !== null && totals.profit < 0 ? 'text-rose-500' : 'text-emerald-600',
            )}
          </div>
          {renderEstimatedBreakdown(
            totals.estimatedComponents
              ? { ...totals.estimatedComponents, total: totals.estimatedComponentsTotal }
              : null,
          )}
          {!hasRecorded ? (
            renderEmpty(t('pr.no_costs', 'No recorded costs.'))
          ) : (
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className={thL}>{t('pr.cost_breakdown', 'Breakdown by category')}</th>
                  <th className={thR}>{t('pr.amount', 'Amount')}</th>
                  <th className={thR}>{t('pr.share', 'Share')}</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.key} className="hover:bg-primary/5">
                    <td className={td}>{t(`pr.${category.key}`, category.key)}</td>
                    <td className={tdR}>{totalMoney(category.value)}</td>
                    <td className={tdR}>
                      {category.value === null || recorded <= 0
                        ? '—'
                        : `${fmtNumber((category.value / recorded) * 100, 1)}%`}
                    </td>
                  </tr>
                ))}
                <tr className="bg-surface/80 font-bold">
                  <td className={td}>{t('pr.total', 'Total')}</td>
                  <td className={tdR}>{totalMoney(recorded)}</td>
                  <td className={tdR}>100%</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      );
    }

    return (
      <div className="p-3">
        <div className="flex flex-wrap gap-2 mb-3">
          {summaryCard(t('pr.revenue', 'Revenue'), moneyOr(selected.revenue, selected.currency), 'text-emerald-600')}
          {summaryCard(t('up_res_cost_basis', 'Cost basis'), basisLabel(selected.costBasis))}
          {summaryCard(t('pr.recorded_costs', 'Recorded costs'), moneyOr(selected.recordedTotal, selected.currency))}
          {summaryCard(t('pr.estimated_cost', 'Estimated cost'), moneyOr(selected.estimatedCost, selected.currency))}
          {summaryCard(
            `${t('pr.total_cost', 'Total cost')} (${basisLabel(selected.costBasis)})`,
            moneyOr(selected.totalCost, selected.currency),
          )}
          {summaryCard(
            `${t('pr.profit', 'Profit')} (${basisLabel(selected.costBasis)})`,
            moneyOr(selected.profit, selected.currency),
            selected.profit !== null && selected.profit < 0 ? 'text-rose-500' : 'text-emerald-600',
          )}
        </div>
        {selected.estimatedBreakdown ? (
          renderEstimatedBreakdown(selected.estimatedBreakdown, selected.estimatedCalculatedAt)
        ) : (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border px-2.5 py-2">
            <p className="max-w-xl text-[10px] text-text-secondary">
              {t('up_res_breakdown_missing', 'Estimated breakdown is not available. Recalculate the trip to generate it.')}
            </p>
            <button
              type="button"
              onClick={handleRecalculateCosts}
              disabled={costRecalculating}
              className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2 text-[10px] font-black text-primary disabled:opacity-50"
            >
              {costRecalculating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              {costRecalculating
                ? t('up_res_recalculating', 'Recalculating…')
                : t('up_res_recalculate', 'Recalculate')}
            </button>
          </div>
        )}
        {costNotice && (
          <p className="mb-3 text-[10px] font-semibold text-text-secondary">{costNotice}</p>
        )}
        {selected.costs.length === 0 ? (
          renderEmpty(t('pr.no_costs', 'No recorded costs.'))
        ) : (
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr>
                <th className={thL}>{t('pr.cost_category', 'Category')}</th>
                <th className={thL}>{t('pr.cost_type', 'Cost type')}</th>
                <th className={thL}>{t('pr.description', 'Description')}</th>
                <th className={thR}>{t('pr.amount', 'Amount')}</th>
              </tr>
            </thead>
            <tbody>
              {selected.costs.map((cost: any, index: number) => (
                <tr key={cost?.id || index} className="hover:bg-primary/5">
                  <td className={td}>{t(`pr.cat_${costBucket(cost)}`, costBucket(cost))}</td>
                  <td className={td}>{cost?.type || np()}</td>
                  <td className={td}>{cost?.description || np()}</td>
                  <td className={tdR}>{moneyOr(toNum(cost?.amount), selected.currency)}</td>
                </tr>
              ))}
              <tr className="bg-surface/80 font-bold">
                <td className={td}>{t('pr.recorded_costs', 'Recorded costs')}</td>
                <td className={td} />
                <td className={td} />
                <td className={tdR}>{moneyOr(selected.recordedTotal, selected.currency)}</td>
              </tr>
            </tbody>
          </table>
        )}
        <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">
          {t('up_res_recorded_note', 'Recorded costs reflect the expense entries that were actually entered and may not include every cost category.')}
        </p>
      </div>
    );
  };

  const renderDriver = () => {
    if (driverRows.length === 0) return renderEmpty(t('pr.no_trips', 'No trips in range'));
    const payModeLabel = (mode: string) => {
      const key = String(mode || '').toLowerCase();
      if (!key) return '';
      return t(`up_res_pay_${key}`, key.replace(/_/g, ' '));
    };
    return (
      <div className="p-3">
        {tachoLoading && (
          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-text-secondary">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('up_res_tacho_loading', 'Loading tachograph activity…')}
          </div>
        )}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={thL}>{t('pr.driver', 'Driver')}</th>
              <th className={thR}>{t('pr.trips_assigned', 'Assigned trips')}</th>
              <th className={thR}>{t('up_res_tacho_daily', "Today's driving (recorded)")}</th>
              <th className={thR}>{t('up_res_tacho_weekly', 'Weekly driving (recorded)')}</th>
              <th className={thR}>{t('up_res_tacho_remaining', 'Weekly remaining (recorded)')}</th>
              <th className={thL}>{t('pr.hos_status', 'HOS status')}</th>
              <th className={thL}>{t('up_res_tacho_source', 'Source / last record')}</th>
              <th className={thL}>{t('pr.pay_mode', 'Pay mode')}</th>
            </tr>
          </thead>
          <tbody>
            {driverRows.map((row) => {
              const driverId = row.driver?.id || '';
              const data = driverId ? tachoByDriver[driverId] : null;
              const summary = data?.summary || {};
              const available = data?.available === true;
              const daily = available ? toNum(summary.dailyDrivingSeconds) : null;
              const weekly = available ? toNum(summary.weeklyDrivingSeconds) : null;
              const remaining = available ? toNum(summary.weeklyDrivingRemainingSeconds) : null;
              const over =
                available &&
                ((weekly !== null && weekly >= 56 * 3600) || (daily !== null && daily >= 9 * 3600));
              const partial = Boolean(data?.coverage?.partial);
              return (
                <tr key={row.key} className="hover:bg-primary/5">
                  <td className={`${td} font-bold`}>{row.name || np()}</td>
                  <td className={tdR}>{row.tripCount}</td>
                  <td className={tdR}>{daily === null ? na() : `${fmtNumber(daily / 3600, 1)} h`}</td>
                  <td className={tdR}>{weekly === null ? na() : `${fmtNumber(weekly / 3600, 1)} h`}</td>
                  <td className={tdR}>{remaining === null ? na() : `${fmtNumber(remaining / 3600, 1)} h`}</td>
                  <td className={td}>
                    {!available ? (
                      <span className="italic text-text-muted/70">
                        {tachoLoading
                          ? t('up_res_tacho_loading', 'Loading tachograph activity…')
                          : data?.reason === 'request_failed'
                          ? t('pr.unavailable', 'Unavailable')
                          : t('up_res_tacho_none', 'No tachograph records')}
                      </span>
                    ) : over ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-rose-500/15 text-rose-600">
                        {t('up_res_tacho_over', 'Limit exceeded in recorded data')}
                      </span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-emerald-500/15 text-emerald-600">
                        {t('up_res_tacho_within', 'No violations in recorded data')}
                      </span>
                    )}
                  </td>
                  <td className={td}>
                    {available ? (
                      <span className="text-[10px] text-text-secondary">
                        {data?.source || 'tachograph'}
                        {data?.lastRecordAt ? ` · ${fmtDateTime(data.lastRecordAt)}` : ''}
                        {partial ? ` · ${t('up_res_tacho_partial', 'Partial tachograph coverage')}` : ''}
                      </span>
                    ) : (
                      na()
                    )}
                  </td>
                  <td className={td}>
                    {row.payMode ? (
                      <span>
                        {payModeLabel(row.payMode)}
                        {row.payRate === null
                          ? ''
                          : ` · ${
                              String(row.payMode).toLowerCase() === 'percent'
                                ? fmtNumber(row.payRate, 2)
                                : fmtMoney(row.payRate, 'EUR')
                            } ${payModeLabel(row.payMode)}`}
                      </span>
                    ) : (
                      np()
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] leading-relaxed text-text-secondary">
          {t('up_res_tacho_note', 'HOS status uses recorded tachograph activity only. Missing records are never treated as zero driving.')}
        </p>
      </div>
    );
  };

  const renderConflicts = () => {
    if (conflicts.length === 0) return renderEmpty(t('pr.no_conflicts', 'No planning conflicts.'));
    return (
      <div className="p-3">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={thL}>{t('pr.level', 'Level')}</th>
              <th className={thL}>{t('pr.code', 'Code')}</th>
              <th className={thL}>{t('pr.message', 'Message')}</th>
              <th className={thL}>{t('pr.related_trip', 'Related trip')}</th>
              <th className={thL}>{t('pr.related_resource', 'Related resource')}</th>
            </tr>
          </thead>
          <tbody>
            {conflicts.map((conflict: any, index: number) => (
              <tr
                key={conflict?.id || index}
                onClick={() => conflict?.tripId && onSelectTrip?.(conflict.tripId)}
                className={conflict?.tripId ? 'cursor-pointer hover:bg-primary/5' : ''}
              >
                <td className={td}>{levelBadge(conflict?.level)}</td>
                <td className={td}>{conflict?.code || np()}</td>
                <td className={`${td} whitespace-normal min-w-[240px]`}>{conflict?.message || np()}</td>
                <td className={td}>
                  {conflict?.tripId ? tripNumberById.get(conflict.tripId) || conflict.tripId : '—'}
                </td>
                <td className={td}>{conflict?.resourceId ? resourceLabel(conflict.resourceId) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderEmissions = () => {
    if (metrics.length === 0) return renderEmpty(t('pr.no_trips', 'No trips in range'));
    const co2Metrics = metrics.filter((m) => m.co2Kg !== null);
    const energyByUnit = new Map<string, number>();
    for (const metric of metrics) {
      if (metric.energyQuantity === null || !metric.consumptionUnit) continue;
      energyByUnit.set(
        energyUnit(metric.consumptionUnit),
        (energyByUnit.get(energyUnit(metric.consumptionUnit)) || 0) + metric.energyQuantity,
      );
    }
    const totalCo2 = co2Metrics.reduce((sum, m) => sum + (m.co2Kg ?? 0), 0);
    const missingInputs = metrics.filter((m) => m.co2Kg === null).length;
    const emissionIssue = (m: (typeof metrics)[number]) => {
      if (m.emissionMissing === 'fuel_type') return t('up_res_fuel_type_missing', 'Fuel type not configured');
      if (m.emissionMissing === 'unit') return t('truck_energy_unavailable', 'Consumption unit is not configured');
      if (m.emissionMissing === 'consumption') return t('up_res_consumption_missing', 'Consumption not configured');
      if (m.emissionMissing === 'distance') return t('up_res_distance_missing', 'Distance not calculated');
      return t(emissionUnavailableKey(m.emissionReason), 'CO₂ calculation unavailable — emission factor not configured.');
    };
    return (
      <div className="p-3">
        <div className="flex flex-wrap gap-2 mb-3">
          {energyByUnit.size === 0 ? summaryCard(t('truck_estimated_energy', 'Estimated energy'), nc()) : null}
          {[...energyByUnit.entries()].map(([unit, total]) =>
            summaryCard(`${t('truck_estimated_energy', 'Estimated energy')} (${unit})`, fmtNumber(total, 1)),
          )}
          {summaryCard(
            t('pr.estimated_co2', 'Estimated CO₂ (kg)'),
            co2Metrics.length ? fmtNumber(totalCo2, 1) : nc(),
            'text-emerald-600',
          )}
          {summaryCard(
            `${t('pr.estimated', 'Estimated')} / ${t('pr.trips', 'Trips')}`,
            `${co2Metrics.length} / ${metrics.length}`,
          )}
        </div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              <th className={thL}>{t('pr.trip', 'Trip')}</th>
              <th className={thL}>{t('pr.truck', 'Truck')}</th>
              <th className={thL}>{t('pr.fuel_type', 'Fuel type')}</th>
              <th className={thR}>{t('pr.distance_km', 'Distance (km)')}</th>
              <th className={thR}>{t('truck_fuel_consumption', 'Consumption')}</th>
              <th className={thR}>{t('truck_estimated_energy', 'Estimated energy')}</th>
              <th className={thR}>{t('truck_co2_factor', 'CO₂ factor')}</th>
              <th className={thR}>{t('pr.estimated_co2', 'Estimated CO₂ (kg)')}</th>
              <th className={thL}>{t('pr.status', 'Status')}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr
                key={m.id}
                onClick={() => onSelectTrip?.(m.id)}
                className={`cursor-pointer transition-colors ${
                  selected?.id === m.id ? 'bg-primary/10' : 'hover:bg-primary/5'
                }`}
              >
                <td className={`${td} font-bold`}>{m.tripNumber || np()}</td>
                <td className={td}>{m.truckPlate || np()}</td>
                <td className={td}>
                  {m.fuelType ? (
                    <span className="font-semibold">{fuelTypeLabel(m.fuelType, t)}</span>
                  ) : (
                    <span className="italic text-amber-600">
                      {t('up_res_fuel_type_missing', 'Fuel type not configured')}
                    </span>
                  )}
                </td>
                <td className={tdR}>{m.distanceKm === null ? np() : fmtNumber(m.distanceKm, 0)}</td>
                <td className={tdR}>
                  {m.consumption === null || !m.consumptionUnit
                    ? nc()
                    : `${fmtNumber(m.consumption, 1)} ${m.consumptionUnit}`}
                </td>
                <td className={tdR}>
                  {m.energyQuantity === null || !m.consumptionUnit
                    ? nc()
                    : `${fmtNumber(m.energyQuantity, 1)} ${energyUnit(m.consumptionUnit)}`}
                </td>
                <td className={tdR}>
                  {m.emissionFactor === null ? na() : `${fmtNumber(m.emissionFactor, 2)} kg/${m.consumptionUnit?.split('/')[0] || 'unit'}`}
                </td>
                <td className={`${tdR} font-bold`}>{m.co2Kg === null ? nc() : fmtNumber(m.co2Kg, 1)}</td>
                <td className={`${td} whitespace-normal min-w-[240px]`}>
                  {m.co2Kg !== null ? (
                    <span className="inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wide bg-emerald-500/15 text-emerald-600">
                      {t('pr.estimated', 'Estimated')}
                    </span>
                  ) : (
                    <span className="italic text-amber-600 text-[10px]">{emissionIssue(m)}</span>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-surface/80 font-bold">
              <td className={td}>{t('pr.total', 'Total')}</td>
              <td className={td} />
              <td className={td} />
              <td className={tdR}>{totals.distance === null ? '—' : fmtNumber(totals.distance, 0)}</td>
              <td className={tdR} />
              <td className={tdR}>
                {energyByUnit.size
                  ? [...energyByUnit.entries()]
                      .map(([unit, total]) => `${fmtNumber(total, 1)} ${unit}`)
                      .join(' · ')
                  : '—'}
              </td>
              <td className={tdR} />
              <td className={tdR}>{co2Metrics.length ? fmtNumber(totalCo2, 1) : '—'}</td>
              <td className={td} />
            </tr>
          </tbody>
        </table>
        <div className="mt-2 space-y-1 text-[10px] text-text-secondary">
          <p>{t('up_res_emission_note', 'Estimated from distance × configured consumption × fuel-specific factor. Not a measured value.')}</p>
          {energyByUnit.size > 1 && (
            <p className="text-amber-600">
              {t('truck_mixed_units', 'Different consumption units are not summed.')}
            </p>
          )}
          {missingInputs > 0 && (
            <p className="text-amber-600">
              {t('up_res_emission_incomplete', 'CO₂ is not calculated for trips with missing inputs. Fuel volume is still shown when distance and consumption are configured.')}{' '}
              ({metrics.length - missingInputs}/{metrics.length})
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (view) {
      case 'route':
        return renderRoute();
      case 'costs':
        return renderCosts();
      case 'driver':
        return renderDriver();
      case 'conflicts':
        return renderConflicts();
      case 'emissions':
        return renderEmissions();
      case 'results':
      default:
        return renderResults();
    }
  };

  const exportButtonClass =
    'h-7 px-2 rounded-lg border border-border bg-surface hover:border-primary/60 hover:text-primary text-text-primary text-[10px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div
      ref={panelRef}
      className="planning-results-panel shrink-0 flex flex-col border-t-2 border-primary/30 bg-surface shadow-[0_-6px_20px_rgba(15,23,42,0.08)]"
      style={{ height: collapsed ? 48 : height, transition: dragging ? 'none' : 'height 160ms ease' }}
    >
      <div
        onPointerDown={startResize}
        role="separator"
        aria-orientation="horizontal"
        title={t('pr.resize', 'Drag to resize')}
        className={`h-1.5 w-full shrink-0 flex items-center justify-center group ${
          collapsed ? 'cursor-default' : 'cursor-row-resize'
        }`}
      >
        <GripHorizontal className="w-4 h-3 text-border group-hover:text-primary/70" />
      </div>

      <div className="h-10 shrink-0 flex items-center gap-2 px-3 border-b border-border bg-surface/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <ListIcon className="w-3.5 h-3.5" />
          </span>
          <span className="text-[12px] font-black text-text-primary truncate">
            {t('pr.title', 'Planning Calculation Results')}
          </span>
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
            {metrics.length} {t('pr.trips', 'Trips')}
          </span>
          {selected && (
            <span className="hidden md:inline text-[10px] font-semibold text-text-secondary truncate">
              · {selected.tripNumber}
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => exportView('xlsx')}
            disabled={!canExport || exporting !== null}
            title={t('pr.export_excel', 'Excel')}
            className={exportButtonClass}
          >
            {exporting === 'xlsx' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">Excel</span>
          </button>
          <button
            type="button"
            onClick={() => exportView('csv')}
            disabled={!canExport || exporting !== null}
            title={t('pr.export_csv', 'CSV')}
            className={exportButtonClass}
          >
            {exporting === 'csv' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">CSV</span>
          </button>
          <button
            type="button"
            onClick={() => exportView('pdf')}
            disabled={!canExport || exporting !== null}
            title={t('pr.export_pdf', 'PDF')}
            className={exportButtonClass}
          >
            {exporting === 'pdf' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? t('pr.expand', 'Expand') : t('pr.collapse', 'Collapse')}
            className="h-7 w-7 rounded-lg border border-border bg-surface hover:border-primary/60 hover:text-primary text-text-primary inline-flex items-center justify-center transition-colors"
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        // The six views must all be reachable: a fixed 36px strip with
        // overflow-x clipped Ore de conducere, Conflicte and Emisii on a narrow
        // panel with no visible scroll affordance, so the strip wraps instead.
        <div className="shrink-0 flex flex-wrap items-center gap-1 px-2 py-1 border-b border-border bg-surface/50">
          {viewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setView(option.value as ViewKey)}
              aria-pressed={view === option.value}
              className={`h-7 shrink-0 px-2.5 rounded-lg text-[10px] font-black border transition-colors ${
                view === option.value
                  ? 'bg-primary/10 text-primary border-primary/40'
                  : 'bg-transparent text-text-secondary border-transparent hover:bg-surface hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className={`flex-1 min-h-0 ${view === 'results' ? 'overflow-hidden' : 'overflow-auto custom-scrollbar'}`}>{renderContent()}</div>
      )}
    </div>
  );
}
