import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, ClipboardList, Clock,
  FileSpreadsheet, FileText, Globe, LoaderCircle, Monitor, Navigation, Package, RefreshCw,
  Route as RouteIcon, SlidersHorizontal, Target, Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fmtNumber, fmtPercent } from '../lib/format';
import { exportDashboardExcel, exportDashboardPdf } from '../lib/dashboardExport';
import OverviewKpi from '../components/dashboard/OverviewKpi';
import TodayBoard from '../components/dashboard/TodayBoard';
import { TrendChart, StatusDonut, CountryBars } from '../components/dashboard/DashboardCharts';
import {
  AlertsPanel, UpcomingPanel, RoutesPanel, FleetDriversPanel, UnassignedOrdersPanel, QuickActions,
} from '../components/dashboard/DashboardPanels';
import FilterBar, { EMPTY_FILTERS } from '../components/dashboard/FilterBar';
import DateField from '../components/dashboard/DateField';
import type { DashboardFilterValue } from '../components/dashboard/FilterBar';
import { ReliabilityPanel, HeatmapPanel, DriverHoursPanel, TelemetryPanel } from '../components/dashboard/Insights';
import KioskMode from '../components/dashboard/KioskMode';
import HandoverModal from '../components/dashboard/HandoverModal';
import LayoutMenu from '../components/dashboard/LayoutMenu';
import type { DashboardSection } from '../components/dashboard/LayoutMenu';
import type { OverviewData, OverviewFilterOptions } from '../components/dashboard/types';
import { formatLongDate, formatShortDate, formatTime } from '../components/dashboard/types';

type Preset = 'today' | 'week' | 'month' | 'last30' | 'custom';

const PRESETS: Array<{ id: Preset; key: string }> = [
  { id: 'today', key: 'dbd_range_today' },
  { id: 'week', key: 'dbd_range_week' },
  { id: 'month', key: 'dbd_range_month' },
  { id: 'last30', key: 'dbd_range_last30' },
  { id: 'custom', key: 'dbd_range_custom' },
];

const LAYOUT_KEY = 'haptrans.dashboard.layout.v1';
const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'board', visible: true },
  { id: 'trend', visible: true },
  { id: 'geo', visible: true },
  { id: 'forward', visible: true },
  { id: 'reliability', visible: true },
  { id: 'compliance', visible: true },
  { id: 'unassigned', visible: true },
];

const EMPTY_OPTIONS: OverviewFilterOptions = { trucks: [], drivers: [], clients: [], countries: [] };

function toISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeRange(preset: Preset, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: toISO(now), to: toISO(now) };
    case 'week': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { from: toISO(start), to: toISO(end) };
    }
    case 'month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISO(start), to: toISO(end) };
    }
    case 'last30': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start.setDate(start.getDate() - 29);
      return { from: toISO(start), to: toISO(now) };
    }
    default: {
      const from = customFrom <= customTo ? customFrom : customTo;
      const to = customFrom <= customTo ? customTo : customFrom;
      return { from, to };
    }
  }
}

function granularityFor(from: string, to: string): 'day' | 'week' | 'month' {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  if (days <= 45) return 'day';
  if (days <= 180) return 'week';
  return 'month';
}

function loadLayout(): DashboardSection[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_SECTIONS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_SECTIONS;
    const known = new Set(DEFAULT_SECTIONS.map((section) => section.id));
    const restored = parsed
      .filter((section: any) => section && known.has(section.id))
      .map((section: any) => ({ id: String(section.id), visible: section.visible !== false }));
    const missing = DEFAULT_SECTIONS.filter((section) => !restored.some((item: DashboardSection) => item.id === section.id));
    return [...restored, ...missing];
  } catch {
    return DEFAULT_SECTIONS;
  }
}

function resolvedKey(day: string): string {
  return `haptrans.dashboard.resolved.${day}`;
}

function MiniStat({
  icon: Icon, label, value, sub, color,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-3.5 py-2.5 shadow-card">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}18`, color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-text-secondary">{label}</p>
        <p className="text-sm font-black leading-tight text-text tabular-nums">
          {value}
          {sub && <span className="ml-1 text-[10px] font-semibold text-text-secondary">{sub}</span>}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ro').slice(0, 2);
  const todayISO = toISO(new Date());

  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState(todayISO);
  const [customTo, setCustomTo] = useState(todayISO);
  const [filters, setFilters] = useState<DashboardFilterValue>(EMPTY_FILTERS);
  const [options, setOptions] = useState<OverviewFilterOptions>(EMPTY_OPTIONS);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<DashboardSection[]>(loadLayout);
  const [showLayout, setShowLayout] = useState(false);
  const [showKiosk, setShowKiosk] = useState(false);
  const [showHandover, setShowHandover] = useState(false);

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const granularity = useMemo(() => granularityFor(range.from, range.to), [range.from, range.to]);

  useEffect(() => {
    api.get('/dashboard/filter-options')
      .then((response) => {
        const payload = response.data || {};
        setOptions((previous) => ({
          trucks: Array.isArray(payload.trucks) && payload.trucks.length ? payload.trucks : previous.trucks,
          drivers: Array.isArray(payload.drivers) && payload.drivers.length ? payload.drivers : previous.drivers,
          clients: Array.isArray(payload.clients) && payload.clients.length ? payload.clients : previous.clients,
          countries: Array.isArray(payload.countries) && payload.countries.length ? payload.countries : previous.countries,
        }));
      })
      .catch(() => { /* filters remain optional */ });
  }, []);

  // The overview response carries the same option lists, and the loaded trips
  // are a final fallback. This keeps the filters usable even if the dedicated
  // options endpoint is unavailable on an older deployment.
  useEffect(() => {
    if (!data) return;
    const trips = [
      ...data.today.departures, ...data.today.arrivals, ...data.today.active,
      ...data.today.delayed, ...data.upcoming.trips, ...(data.delayedTrips || []),
    ];
    const trucks = new Map<string, string>();
    const drivers = new Map<string, string>();
    for (const trip of trips) {
      if (trip.truckId && trip.truckPlate) trucks.set(trip.truckId, trip.truckPlate);
      if (trip.driverId && trip.driverName) drivers.set(trip.driverId, trip.driverName);
    }
    const clients = new Map<string, string>();
    for (const order of data.unassignedOrders) {
      if (order.clientId && order.clientName) clients.set(order.clientId, order.clientName);
    }
    const incoming = data.filterOptions;
    setOptions((previous) => ({
      trucks: incoming?.trucks?.length
        ? incoming.trucks
        : trucks.size ? [...trucks.entries()].map(([id, name]) => ({ id, name })) : previous.trucks,
      drivers: incoming?.drivers?.length
        ? incoming.drivers
        : drivers.size ? [...drivers.entries()].map(([id, name]) => ({ id, name })) : previous.drivers,
      clients: incoming?.clients?.length
        ? incoming.clients
        : clients.size ? [...clients.entries()].map(([id, name]) => ({ id, name })) : previous.clients,
      countries: incoming?.countries?.length
        ? incoming.countries
        : data.byCountry.length ? data.byCountry.map((row) => row.country) : previous.countries,
    }));
  }, [data]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(resolvedKey(todayISO));
      setResolvedIds(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      setResolvedIds(new Set());
    }
  }, [todayISO]);

  useEffect(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
    } catch { /* storage disabled */ }
  }, [layout]);

  // Offer the shift handover automatically on the first dashboard visit of
  // each shift (morning / afternoon / night), once per browser and day.
  useEffect(() => {
    if (!data) return;
    const hour = new Date().getHours();
    const shift = hour < 6 ? 'night' : hour < 14 ? 'morning' : hour < 22 ? 'afternoon' : 'evening';
    const key = `haptrans.dashboard.handover.${todayISO}.${shift}`;
    try {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '1');
        setShowHandover(true);
      }
    } catch { /* storage disabled */ }
  }, [data, todayISO]);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/dashboard/overview', {
        params: {
          from: range.from,
          to: range.to,
          today: todayISO,
          granularity,
          truckId: filters.truckId || undefined,
          driverId: filters.driverId || undefined,
          clientId: filters.clientId || undefined,
          country: filters.country || undefined,
        },
      });
      setData(res.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range.from, range.to, todayISO, granularity, filters.truckId, filters.driverId, filters.clientId, filters.country]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(true), 60000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => load(true), 1200);
    };
    window.addEventListener('hapcargo:operational-update', handler as EventListener);
    return () => {
      window.removeEventListener('hapcargo:operational-update', handler as EventListener);
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  const refresh = useCallback(() => { void load(true); }, [load]);
  const closeKiosk = useCallback(() => setShowKiosk(false), []);

  const handleExport = useCallback(async (format: 'pdf' | 'xlsx') => {
    if (!data || exporting) return;
    setExporting(format);
    try {
      if (format === 'xlsx') await exportDashboardExcel(data, t, lang);
      else exportDashboardPdf(data, t, lang);
      toast.success(t('dbd_export_done'));
    } catch (err) {
      console.error('Dashboard export failed', err);
      toast.error(t('dbd_export_error'));
    } finally {
      setExporting(null);
    }
  }, [data, exporting, t, lang]);

  const resolveAlert = useCallback((id: string) => {
    setResolvedIds((previous) => {
      const next = new Set(previous);
      next.add(id);
      try {
        localStorage.setItem(resolvedKey(todayISO), JSON.stringify([...next]));
      } catch { /* storage disabled */ }
      return next;
    });
  }, [todayISO]);

  const resetResolved = useCallback(() => {
    setResolvedIds(new Set());
    try {
      localStorage.removeItem(resolvedKey(todayISO));
    } catch { /* storage disabled */ }
  }, [todayISO]);

  if (loading && !data) {
    return (
      <div className="space-y-5 pb-12">
        <div className="h-52 animate-pulse rounded-3xl bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="h-[430px] animate-pulse rounded-2xl border border-border/60 bg-card xl:col-span-2" />
          <div className="h-[430px] animate-pulse rounded-2xl border border-border/60 bg-card" />
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-card lg:col-span-2" />
          <div className="h-80 animate-pulse rounded-2xl border border-border/60 bg-card" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-sm flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-card">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error/10 text-error">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <p className="text-sm font-bold text-text">{t('dbd_error')}</p>
          <button type="button" onClick={() => load()} className="btn-primary">
            <RefreshCw className="h-4 w-4" /> {t('dbd_retry')}
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const k = data.kpis || {};
  const trends = data.trends || {};
  const counts = data.today.counts;
  const chartPoints = data.meta.chartScope === 'week' ? data.weekSeries : data.series;
  const chartGranularity = data.meta.chartScope === 'week' ? 'day' : data.meta.granularity;

  const heroChips = [
    { label: t('dbd_departures'), value: counts.departures, icon: ArrowUpRight },
    { label: t('dbd_arrivals'), value: counts.arrivals, icon: ArrowDownRight },
    { label: t('dbd_active_now'), value: counts.active, icon: Navigation },
    { label: t('dbd_delayed'), value: counts.delayed, icon: AlertTriangle },
  ];

  const sectionLabels: Record<string, string> = {
    board: t('dbd_section_board'),
    trend: t('dbd_section_trend'),
    geo: t('dbd_section_geo'),
    forward: t('dbd_section_forward'),
    reliability: t('dbd_section_reliability'),
    compliance: t('dbd_section_compliance'),
    unassigned: t('dbd_section_unassigned'),
  };

  const renderSection = (id: string) => {
    switch (id) {
      case 'board':
        return (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2"><TodayBoard today={data.today} lang={lang} /></div>
            <AlertsPanel alerts={data.alerts} resolvedIds={resolvedIds} onResolve={resolveAlert} />
          </div>
        );
      case 'trend':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TrendChart
                points={chartPoints}
                granularity={chartGranularity}
                weekly={data.meta.chartScope === 'week'}
                lang={lang}
              />
            </div>
            <StatusDonut data={data.statusDistribution} />
          </div>
        );
      case 'geo':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><CountryBars data={data.byCountry} lang={lang} /></div>
            <FleetDriversPanel fleet={data.fleet} drivers={data.drivers} utilization={k.utilizationPct || 0} />
          </div>
        );
      case 'forward':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2"><UpcomingPanel upcoming={data.upcoming} lang={lang} /></div>
            <RoutesPanel routes={data.topRoutes} />
          </div>
        );
      case 'reliability':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ReliabilityPanel data={data} lang={lang} />
            <HeatmapPanel heatmap={data.heatmap} lang={lang} />
          </div>
        );
      case 'compliance':
        return (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <DriverHoursPanel rows={data.driverHours} />
            <TelemetryPanel telemetry={data.telemetry} />
          </div>
        );
      case 'unassigned':
        return <UnassignedOrdersPanel orders={data.unassignedOrders} lang={lang} />;
      default:
        return null;
    }
  };

  const iconButton = 'flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-all hover:bg-white/20 disabled:cursor-wait disabled:opacity-60';

  return (
    <div className="relative space-y-5 pb-12 animate-fade-in">
      <div className="pointer-events-none absolute inset-x-0 -top-24 -z-10 h-72 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-10 top-10 h-52 w-52 rounded-full bg-amber-400/10 blur-3xl" />
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF5A00] via-[#FF6B14] to-[#FF9448] text-white shadow-2xl shadow-primary/25">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="pointer-events-none absolute -right-24 -top-28 h-96 w-96 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-orange-900/20 blur-3xl" />

        <div className="relative p-5 md:p-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur">
                <span className={`h-1.5 w-1.5 rounded-full bg-white ${refreshing ? 'animate-ping' : 'animate-pulse'}`} />
                {t('dbd_live')}
              </span>
              <h1 className="mt-3 text-2xl font-black tracking-tight drop-shadow-sm md:text-3xl">
                {t('dbd_title')}
              </h1>
              <p className="mt-1 max-w-xl text-[13px] font-medium text-white/85 md:text-sm">
                {t('dbd_subtitle')}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-white/80">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {preset === 'today'
                    ? formatLongDate(range.from, lang)
                    : `${formatShortDate(range.from, lang)} – ${formatShortDate(range.to, lang)}`}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {t('dbd_updated', { time: formatTime(data.meta.generatedAt, lang) })}
                </span>
              </div>
            </div>

            <div className="w-full shrink-0 xl:w-auto">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-2 backdrop-blur-md">
                <div className="flex flex-wrap items-center gap-1">
                  {PRESETS.map((item) => {
                    const active = preset === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setPreset(item.id)}
                        className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                          active
                            ? 'bg-white text-[#E64F00] shadow-md'
                            : 'text-white/85 hover:bg-white/15 hover:text-white'
                        }`}
                      >
                        {t(item.key)}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex items-center gap-1">
                    <span className="mx-0.5 h-4 w-px bg-white/25" />
                    <button
                      type="button"
                      onClick={() => handleExport('xlsx')}
                      disabled={!!exporting}
                      title={t('dbd_export_excel')}
                      aria-label={t('dbd_export_excel')}
                      className={iconButton}
                    >
                      {exporting === 'xlsx' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={!!exporting}
                      title={t('dbd_export_pdf')}
                      aria-label={t('dbd_export_pdf')}
                      className={iconButton}
                    >
                      {exporting === 'pdf' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKiosk(true)}
                      title={t('dbd_kiosk')}
                      aria-label={t('dbd_kiosk')}
                      className={iconButton}
                    >
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHandover(true)}
                      title={t('dbd_handover')}
                      aria-label={t('dbd_handover')}
                      className={iconButton}
                    >
                      <ClipboardList className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowLayout((current) => !current)}
                      title={t('dbd_layout')}
                      aria-label={t('dbd_layout')}
                      className={iconButton}
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={refresh}
                      title={t('dbd_refresh')}
                      className={iconButton}
                    >
                      {refreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {preset === 'custom' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/20 pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80">
                      {t('dbd_custom_from')}
                      <DateField value={customFrom} onChange={setCustomFrom} lang={lang} variant="hero" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/80">
                      {t('dbd_custom_to')}
                      <DateField value={customTo} onChange={setCustomTo} lang={lang} variant="hero" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {heroChips.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-2.5 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 backdrop-blur-md transition-colors hover:bg-white/15"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">
                  <chip.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-white/70">{chip.label}</p>
                  <p className="text-xl font-black leading-none tabular-nums">{fmtNumber(chip.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showLayout && (
        <div className="fixed right-4 top-24 z-[130]">
          <LayoutMenu
            sections={layout}
            labels={sectionLabels}
            onChange={setLayout}
            onReset={() => setLayout(DEFAULT_SECTIONS)}
            onClose={() => setShowLayout(false)}
          />
        </div>
      )}

      {error && data && (
        <div className="flex items-center gap-2 rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs font-semibold text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('dbd_error')}
          <button type="button" onClick={refresh} className="ml-auto underline underline-offset-2">
            {t('dbd_retry')}
          </button>
        </div>
      )}

      <FilterBar options={options} value={filters} lang={lang} onChange={setFilters} />

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
        <OverviewKpi
          icon={RouteIcon}
          label={t('dbd_trips')}
          value={fmtNumber(k.tripsTotal || 0)}
          sub={`${fmtNumber(k.avgTripKm || 0)} km ${t('dbd_avg_trip').toLowerCase()}`}
          trend={trends.tripsTotal}
          accent="#FF5A00"
          tone="primary"
        />
        <OverviewKpi
          icon={CheckCircle2}
          label={t('dbd_kpi_completed')}
          value={fmtNumber(k.tripsCompleted || 0)}
          sub={`${fmtPercent(k.onTimeRate || 0)} ${t('dbd_on_time').toLowerCase()}`}
          trend={trends.tripsCompleted}
          accent="#10B981"
          tone="success"
        />
        <OverviewKpi
          icon={AlertTriangle}
          label={t('dbd_kpi_delayed')}
          value={fmtNumber(k.tripsDelayed || 0)}
          sub={`${fmtNumber(k.avgDelayMinutes || 0)} ${t('dbd_min')} ${t('dbd_delay_avg').toLowerCase()}`}
          trend={trends.tripsDelayed}
          invert
          accent="#EF4444"
          tone="danger"
        />
        <OverviewKpi
          icon={Package}
          label={t('dbd_kpi_unassigned')}
          value={fmtNumber(k.ordersUnassigned || 0)}
          sub={`${fmtNumber(k.ordersOpen || 0)} ${t('dbd_kpi_orders').toLowerCase()}`}
          accent="#F59E0B"
          tone="warning"
        />
        <OverviewKpi
          icon={Truck}
          label={t('dbd_kpi_fleet')}
          value={`${fmtNumber(k.fleetAvailable || 0)}/${fmtNumber(k.fleetTotal || 0)}`}
          sub={`${fmtPercent(k.utilizationPct || 0, 0)} ${t('dbd_utilization').toLowerCase()}`}
          accent="#0EA5E9"
          tone="info"
        />
        <OverviewKpi
          icon={Globe}
          label={t('dbd_kpi_km')}
          value={fmtNumber(k.kmTotal || 0)}
          sub={`${fmtNumber(k.tripsTotal || 0)} ${t('dbd_trips').toLowerCase()}`}
          trend={trends.kmTotal}
          accent="#8B5CF6"
          tone="violet"
        />
      </div>

      {/* ── Secondary metrics ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniStat icon={Target} label={t('dbd_kpi_ontime')} value={fmtPercent(k.onTimeRate || 0)} color="#10B981" />
        <MiniStat
          icon={Package}
          label={t('dbd_kpi_orders')}
          value={fmtNumber(k.ordersTotal || 0)}
          sub={`· ${fmtNumber(k.ordersDelivered || 0)} ${t('dbd_completed').toLowerCase()}`}
          color="#FF5A00"
        />
        <MiniStat icon={Globe} label={t('dbd_kpi_countries')} value={fmtNumber(k.countriesActive || 0)} color="#0EA5E9" />
        <MiniStat
          icon={AlertTriangle}
          label={t('dbd_kpi_incidents')}
          value={fmtNumber(k.openIncidents || 0)}
          color={(k.openIncidents || 0) > 0 ? '#EF4444' : '#94A3B8'}
        />
      </div>

      {layout.filter((section) => section.visible).map((section) => (
        <div key={section.id}>{renderSection(section.id)}</div>
      ))}

      <QuickActions />

      {showKiosk && (
        <KioskMode
          data={data}
          lang={lang}
          onClose={closeKiosk}
          onRefresh={refresh}
        />
      )}

      {showHandover && (
        <HandoverModal
          data={data}
          lang={lang}
          resolvedIds={resolvedIds}
          onResolve={resolveAlert}
          onReset={resetResolved}
          onClose={() => setShowHandover(false)}
        />
      )}
    </div>
  );
}
