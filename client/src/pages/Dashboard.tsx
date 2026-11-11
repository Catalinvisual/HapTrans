import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, CheckCircle2, Clock,
  FileSpreadsheet, FileText, Globe, LoaderCircle, Navigation, Package, RefreshCw,
  Route as RouteIcon, Target, Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { exportDashboardExcel, exportDashboardPdf } from '../lib/dashboardExport';
import { fmtNumber, fmtPercent } from '../lib/format';
import OverviewKpi from '../components/dashboard/OverviewKpi';
import TodayBoard from '../components/dashboard/TodayBoard';
import { TrendChart, StatusDonut, CountryBars } from '../components/dashboard/DashboardCharts';
import {
  AlertsPanel, UpcomingPanel, RoutesPanel, FleetDriversPanel, UnassignedOrdersPanel, QuickActions,
} from '../components/dashboard/DashboardPanels';
import type { OverviewData } from '../components/dashboard/types';
import {
  formatLongDate, formatShortDate, formatTime,
} from '../components/dashboard/types';

type Preset = 'today' | 'week' | 'month' | 'last30' | 'custom';

const PRESETS: Array<{ id: Preset; key: string }> = [
  { id: 'today', key: 'dbd_range_today' },
  { id: 'week', key: 'dbd_range_week' },
  { id: 'month', key: 'dbd_range_month' },
  { id: 'last30', key: 'dbd_range_last30' },
  { id: 'custom', key: 'dbd_range_custom' },
];

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
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null);
  const [error, setError] = useState(false);

  const range = useMemo(() => computeRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const granularity = useMemo(() => granularityFor(range.from, range.to), [range.from, range.to]);

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
  }, [range.from, range.to, todayISO, granularity]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => load(true), 60000);
    return () => clearInterval(interval);
  }, [load]);

  // Realtime operational updates (trip status changes / delivery incidents)
  // refresh the board without a full page reload.
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

  return (
    <div className="relative space-y-5 pb-12 animate-fade-in">
      {/* Ambient orange glow, kept behind the content */}
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
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-all hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {exporting === 'xlsx'
                        ? <LoaderCircle className="h-4 w-4 animate-spin" />
                        : <FileSpreadsheet className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={!!exporting}
                      title={t('dbd_export_pdf')}
                      aria-label={t('dbd_export_pdf')}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-all hover:bg-white/20 disabled:cursor-wait disabled:opacity-60"
                    >
                      {exporting === 'pdf'
                        ? <LoaderCircle className="h-4 w-4 animate-spin" />
                        : <FileText className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => load(true)}
                      title={t('dbd_refresh')}
                      className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white transition-all hover:bg-white/20"
                    >
                      {refreshing
                        ? <LoaderCircle className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {preset === 'custom' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/20 pt-2">
                    <label className="flex flex-1 items-center gap-1.5 text-[10px] font-bold text-white/80">
                      {t('dbd_custom_from')}
                      <input
                        type="date"
                        value={customFrom}
                        onChange={(event) => setCustomFrom(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border-0 bg-white/95 px-2 py-1.5 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-white/60"
                      />
                    </label>
                    <label className="flex flex-1 items-center gap-1.5 text-[10px] font-bold text-white/80">
                      {t('dbd_custom_to')}
                      <input
                        type="date"
                        value={customTo}
                        onChange={(event) => setCustomTo(event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border-0 bg-white/95 px-2 py-1.5 text-[11px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-white/60"
                      />
                    </label>
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
                  <p className="truncate text-[9px] font-black uppercase tracking-[0.14em] text-white/70">
                    {chip.label}
                  </p>
                  <p className="text-xl font-black leading-none tabular-nums">{fmtNumber(chip.value)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {error && data && (
        <div className="flex items-center gap-2 rounded-xl border border-error/25 bg-error/10 px-3 py-2 text-xs font-semibold text-error">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t('dbd_error')}
          <button type="button" onClick={() => load(true)} className="ml-auto underline underline-offset-2">
            {t('dbd_retry')}
          </button>
        </div>
      )}

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
        <MiniStat
          icon={Target}
          label={t('dbd_kpi_ontime')}
          value={fmtPercent(k.onTimeRate || 0)}
          color="#10B981"
        />
        <MiniStat
          icon={Package}
          label={t('dbd_kpi_orders')}
          value={fmtNumber(k.ordersTotal || 0)}
          sub={`· ${fmtNumber(k.ordersDelivered || 0)} ${t('dbd_completed').toLowerCase()}`}
          color="#FF5A00"
        />
        <MiniStat
          icon={Globe}
          label={t('dbd_kpi_countries')}
          value={fmtNumber(k.countriesActive || 0)}
          color="#0EA5E9"
        />
        <MiniStat
          icon={AlertTriangle}
          label={t('dbd_kpi_incidents')}
          value={fmtNumber(k.openIncidents || 0)}
          color={(k.openIncidents || 0) > 0 ? '#EF4444' : '#94A3B8'}
        />
      </div>

      {/* ── Today's board + alerts ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <TodayBoard today={data.today} lang={lang} />
        </div>
        <AlertsPanel alerts={data.alerts} />
      </div>

      {/* ── Trend + status ───────────────────────────────────────────────── */}
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

      {/* ── Countries + fleet ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CountryBars data={data.byCountry} lang={lang} />
        </div>
        <FleetDriversPanel
          fleet={data.fleet}
          drivers={data.drivers}
          utilization={k.utilizationPct || 0}
        />
      </div>

      {/* ── Upcoming + top routes ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <UpcomingPanel upcoming={data.upcoming} lang={lang} />
        </div>
        <RoutesPanel routes={data.topRoutes} />
      </div>

      {/* ── Unassigned orders ────────────────────────────────────────────── */}
      <UnassignedOrdersPanel orders={data.unassignedOrders} lang={lang} />

      <QuickActions />
    </div>
  );
}
