import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, BarChart, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Download, Euro, Wallet, Receipt, PiggyBank, AlertTriangle,
  Truck, Users, Route as RouteIcon, CalendarRange, Gauge, Coins, Crown, Search,
  Target, Timer, FileText, ArrowUp, ArrowDown, LoaderCircle,
} from 'lucide-react';
import api from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import toast from 'react-hot-toast';
import { exportWorkbook, formatDateExcel } from '../lib/exportExcel';
import { fmtMoney, fmtNumber, fmtPercent } from '../lib/format';

interface SeriesPoint {
  month: string; label: string; year: number;
  revenue: number; cost: number; profit: number; km: number; trips: number; invoiced: number; collected: number;
}

interface SummaryData {
  period: { from: string; to: string };
  comparison: { from: string; to: string };
  kpis: Record<string, number>;
  trends: Record<string, number | null>;
  previous: Record<string, number>;
  series: SeriesPoint[];
  previousSeries: SeriesPoint[];
  topTrips: Array<{ id: string; tripNumber?: string; route: string; truck?: string | null; driver?: string | null; status: string; date: string; revenue: number; cost: number; profit: number; km: number }>;
  paymentStats: { issuedCount: number; totalIssued: number; paidCount: number; partialCount: number; unpaidCount: number; avgPaymentDays: number | null; collectionRate: number | null };
  recentExpenses: Array<{ id: string; date: string; category: string; amount: number; description: string | null }>;
  expenseBreakdown: Array<{ category: string; amount: number; percent: number }>;
  topClients: Array<{ id: string; name: string; revenue: number; profit: number; trips: number; margin: number }>;
  byTruck: Array<{ id: string; name: string; revenue: number; cost: number; profit: number; km: number; trips: number; margin: number }>;
  byDriver: Array<{ id: string; name: string; revenue: number; cost: number; profit: number; km: number; trips: number; margin: number }>;
  byRoute: Array<{ route: string; revenue: number; profit: number; trips: number }>;
  aging: {
    totalReceivable: number; overdueAmount: number; overdueCount: number;
    buckets: Array<{ label: string; count: number; amount: number }>;
  };
}

const CAT_COLORS: Record<string, string> = {
  fuel: '#EF4444',
  toll: '#F59E0B',
  maintenance: '#3B82F6',
  salary: '#8B5CF6',
  accounting: '#14B8A6',
  other: '#94A3B8',
};

type RangeType = 'this_month' | 'last_month' | 'last_30_days' | 'last_3_months' | 'last_90_days' | 'this_year' | 'last_year' | 'last_12_months' | 'custom';
type Granularity = 'month' | 'week';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TrendBadge({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  if (neutral) return <span className="text-[11px] font-semibold text-text-secondary">±0%</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${good ? 'text-success' : 'text-error'}`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {`${fmtPercent(Math.abs(value), 1)}`}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, subExtra, trend, invert, accent }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider truncate">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2 flex-wrap">
        <span className="text-xl lg:text-2xl font-bold text-text leading-tight min-w-0 break-words">{value}</span>
        <TrendBadge value={trend} invert={invert} />
      </div>
      {(sub || subExtra) && <div className="text-[11px] text-text-secondary mt-0.5 min-w-0 break-words">{sub}{subExtra}</div>}
    </div>
  );
}

function computeRange(type: RangeType, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  switch (type) {
    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
    case 'last_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case 'last_30_days':
      return { from: iso(new Date(now.getTime() - 29 * 86400000)), to: iso(now) };
    case 'last_3_months':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
    case 'last_90_days':
      return { from: iso(new Date(now.getTime() - 89 * 86400000)), to: iso(now) };
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
    case 'last_year':
      return { from: iso(new Date(now.getFullYear() - 1, 0, 1)), to: iso(new Date(now.getFullYear() - 1, 11, 31)) };
    case 'last_12_months':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to: iso(now) };
    default:
      return { from: customFrom, to: customTo };
  }
}

function compactEur(v: number): string {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000000) return `€${fmtNumber(n / 1000000, 1)}M`;
  if (Math.abs(n) >= 1000) return `€${fmtNumber(Math.round(n / 1000))}k`;
  return `€${fmtNumber(Math.round(n))}`;
}

export default function FinancialPage() {
  const { t } = useTranslation();
  const [rangeType, setRangeType] = useState<RangeType>('last_12_months');
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [clientId, setClientId] = useState('all');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [clients, setClients] = useState<any[]>([]);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [showCumulative, setShowCumulative] = useState(false);
  const [showPrevious, setShowPrevious] = useState(true);
  const [showProjection, setShowProjection] = useState(false);

  const [target, setTarget] = useState<number>(() => Number(localStorage.getItem('fin_revenue_target')) || 0);
  const [clientSearch, setClientSearch] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'revenue' | 'profit' | 'margin' | 'trips'>('revenue');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data || [])).catch(() => {});
  }, []);

  const range = useMemo(() => computeRange(rangeType, customFrom, customTo), [rangeType, customFrom, customTo]);

  useEffect(() => {
    if (rangeType === 'custom' && (!range.from || !range.to)) return;
    setLoading(true);
    const params = new URLSearchParams({ from: range.from, to: range.to, granularity });
    if (clientId !== 'all') params.set('clientId', clientId);
    api.get(`/financial/summary?${params.toString()}`)
      .then(r => setData(r.data))
      .catch(() => toast.error(t('fin_load_error')))
      .finally(() => setLoading(false));
  }, [range.from, range.to, clientId, rangeType, granularity, t]);

  const money = (n: number) => fmtMoney(Math.round(Number(n) || 0));
  const kmFmt = (n: number) => `${fmtNumber(Math.round(Number(n) || 0))} km`;
  const pct = (n: number, digits = 1) => fmtPercent(Number(n) || 0, digits);

  const periodOptions: SelectOption[] = [
    { value: 'this_month', label: t('fin_this_month') },
    { value: 'last_month', label: t('fin_last_month') },
    { value: 'last_30_days', label: t('fin_last30d') },
    { value: 'last_3_months', label: t('fin_last_3_months') },
    { value: 'last_90_days', label: t('fin_last90d') },
    { value: 'this_year', label: t('fin_this_year') },
    { value: 'last_year', label: t('fin_last_year') },
    { value: 'last_12_months', label: t('fin_last12m') },
    { value: 'custom', label: t('fin_custom_range') },
  ];

  const clientOptions: SelectOption[] = [
    { value: 'all', label: t('fin_all_clients') },
    ...clients.map(c => ({ value: c.id, label: c.companyName || c.name || c.email || c.id })),
  ];

  const granOptions: SelectOption[] = [
    { value: 'month', label: t('fin_monthly_lbl') },
    { value: 'week', label: t('fin_weekly_lbl') },
  ];

  const k = data?.kpis ?? {};
  const tr = data?.trends ?? {};

  const chartRows = useMemo(() => {
    const rows = (data?.series ?? []).map((m, idx) => {
      const prev = data?.previousSeries?.[idx];
      return {
        ...m,
        name: m.label,
        prevRevenue: prev?.revenue ?? null,
        prevProfit: prev?.profit ?? null,
        cumProfit: undefined as number | undefined,
      };
    });
    let acc = 0;
    for (const r of rows) { acc += r.profit; r.cumProfit = acc; }
    if (showProjection && rows.length >= 2) {
      const lastN = rows.slice(-4);
      let dRev = 0, dPrf = 0;
      for (let j = 1; j < lastN.length; j++) {
        dRev += lastN[j].revenue - lastN[j - 1].revenue;
        dPrf += lastN[j].profit - lastN[j - 1].profit;
      }
      const steps = lastN.length - 1;
      const last = rows[rows.length - 1];
      rows.push({
        ...last,
        month: 'projection',
        name: '+1',
        revenue: undefined as any,
        cost: undefined as any,
        profit: undefined as any,
        revenueProj: Math.max(0, last.revenue + dRev / steps),
        profitProj: last.profit + dPrf / steps,
      } as any);
    }
    return rows;
  }, [data, showProjection]);

  const bestWorst = useMemo(() => {
    const pts = (data?.series ?? []).filter(p => p.trips > 0 || p.revenue > 0);
    if (!pts.length) return null;
    let best = pts[0], worst = pts[0];
    for (const p of pts) {
      if (p.profit > best.profit) best = p;
      if (p.profit < worst.profit) worst = p;
    }
    const avg = pts.reduce((s, p) => s + p.profit, 0) / pts.length;
    return { best, worst, avg };
  }, [data]);

  const marginValue = Math.max(0, Math.min(100, Number(k.margin) || 0));

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    const arr = (data?.topClients ?? []).filter(c => !q || c.name.toLowerCase().includes(q));
    arr.sort((a: any, b: any) => {
      const va = sortKey === 'name' ? a.name : a[sortKey];
      const vb = sortKey === 'name' ? b.name : b[sortKey];
      if (typeof va === 'string' || typeof vb === 'string') return String(va).localeCompare(String(vb)) * (sortAsc ? 1 : -1);
      return ((va as number) - (vb as number)) * (sortAsc ? 1 : -1);
    });
    return arr;
  }, [data, clientSearch, sortKey, sortAsc]);

  const maxTruckProfit = Math.max(...(data?.byTruck ?? []).map(x => x.profit), 1);
  const maxDriverProfit = Math.max(...(data?.byDriver ?? []).map(x => x.profit), 1);
  const agingMax = Math.max(...(data?.aging.buckets ?? []).map(b => b.amount), 1);

  const totals = useMemo(() => (data?.series ?? []).reduce((acc, m) => ({
    trips: acc.trips + m.trips, revenue: acc.revenue + m.revenue, cost: acc.cost + m.cost,
    profit: acc.profit + m.profit, km: acc.km + m.km, invoiced: acc.invoiced + m.invoiced, collected: acc.collected + m.collected,
  }), { trips: 0, revenue: 0, cost: 0, profit: 0, km: 0, invoiced: 0, collected: 0 }), [data]);

  const targetPct = target > 0 && data?.series?.length ? ((Number(k.revenue) || 0) / target / data.series.length) * 100 : null;

  const setTargetVal = (v: number) => {
    setTarget(v);
    localStorage.setItem('fin_revenue_target', String(v || ''));
  };

  const ps = data?.paymentStats;

  const exportFull = async () => {
    if (!data) return;
    setExporting(true);
    try {
      const label = `${range.from} — ${range.to}`;
      await exportWorkbook({
        filename: `raport-financiar-complet_${range.from}_${range.to}`,
        sheets: [
          {
            name: t('fin_title'), title: t('fin_title'),
            subtitle: `${label} · ${clientId !== 'all' ? clientOptions.find(c => c.value === clientId)?.label ?? '' : t('fin_all_clients')}`,
            headers: [
              { key: 'metric', label: t('fin_metric') },
              { key: 'value', label: t('fin_value'), align: 'right' },
              { key: 'prev', label: t('fin_prev_period'), align: 'right' },
            ],
            rows: [
              { metric: t('totalRevenue'), value: Math.round(Number(k.revenue) || 0), prev: Math.round(data.previous?.revenue ?? 0) },
              { metric: t('totalCosts'), value: Math.round(Number(k.totalCost) || 0), prev: Math.round(data.previous?.totalCost ?? 0) },
              { metric: t('totalProfit'), value: Math.round(Number(k.profit) || 0), prev: Math.round(data.previous?.profit ?? 0) },
              { metric: t('fin_margin'), value: Number((Number(k.margin) || 0).toFixed(1)), prev: Number((data.previous?.margin ?? 0).toFixed(1)) },
              { metric: t('km_total', 'KM'), value: Math.round(Number(k.km) || 0), prev: '' },
              { metric: t('costPerKm'), value: Number((Number(k.costPerKm) || 0).toFixed(2)), prev: '' },
              { metric: t('trips'), value: Math.round(Number(k.tripsCount) || 0), prev: Math.round(data.previous?.tripsCount ?? 0) },
              { metric: t('fin_invoiced'), value: Math.round(Number(k.invoiced) || 0), prev: Math.round(data.previous?.invoiced ?? 0) },
              { metric: t('fin_collected'), value: Math.round(Number(k.collected) || 0), prev: Math.round(data.previous?.collected ?? 0) },
              { metric: t('fin_outstanding'), value: Math.round(Number(k.outstanding) || 0), prev: '' },
              { metric: t('overdueInvoices'), value: Math.round(Number(k.overdueAmount) || 0), prev: '' },
            ],
          },
          {
            name: t('monthTable', 'Serii'),
            headers: [
              { key: 'label', label: t('fin_monthly_lbl') },
              { key: 'trips', label: t('trips'), align: 'right' },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'cost', label: t('costs'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
              { key: 'km', label: 'KM', align: 'right' },
              { key: 'invoiced', label: t('fin_invoiced'), align: 'right' },
              { key: 'collected', label: t('fin_collected'), align: 'right' },
            ],
            rows: (data.series ?? []).map(m => ({
              label: `${m.label} ${m.year}`, trips: m.trips, revenue: Math.round(m.revenue),
              cost: Math.round(m.cost), profit: Math.round(m.profit), km: Math.round(m.km),
              invoiced: Math.round(m.invoiced), collected: Math.round(m.collected),
            })),
          },
          {
            name: t('fin_top_clients'),
            headers: [
              { key: 'name', label: t('client', 'Client') },
              { key: 'trips', label: t('trips'), align: 'right' },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
              { key: 'margin', label: t('fin_margin'), align: 'right' },
            ],
            rows: (data.topClients ?? []).map(c => ({
              name: c.name, trips: Math.round(c.trips), revenue: Math.round(c.revenue),
              profit: Math.round(c.profit), margin: Number(c.margin.toFixed(1)),
            })),
          },
          {
            name: t('fin_by_truck'),
            headers: [
              { key: 'name', label: t('fleet', 'Flotă') },
              { key: 'trips', label: t('trips'), align: 'right' },
              { key: 'km', label: 'KM', align: 'right' },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'cost', label: t('costs'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
              { key: 'margin', label: t('fin_margin'), align: 'right' },
            ],
            rows: (data.byTruck ?? []).map(x => ({
              name: x.name, trips: x.trips, km: Math.round(x.km),
              revenue: Math.round(x.revenue), cost: Math.round(x.cost),
              profit: Math.round(x.profit), margin: Number(x.margin.toFixed(1)),
            })),
          },
          {
            name: t('fin_by_driver'),
            headers: [
              { key: 'name', label: t('drivers', 'Șoferi') },
              { key: 'trips', label: t('trips'), align: 'right' },
              { key: 'km', label: 'KM', align: 'right' },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'cost', label: t('costs'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
              { key: 'margin', label: t('fin_margin'), align: 'right' },
            ],
            rows: (data.byDriver ?? []).map(x => ({
              name: x.name, trips: x.trips, km: Math.round(x.km),
              revenue: Math.round(x.revenue), cost: Math.round(x.cost),
              profit: Math.round(x.profit), margin: Number(x.margin.toFixed(1)),
            })),
          },
          {
            name: t('topProfitableRoutes'),
            headers: [
              { key: 'route', label: t('route', 'Rută') },
              { key: 'trips', label: t('trips'), align: 'right' },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
            ],
            rows: (data.byRoute ?? []).map(r => ({ route: r.route, trips: r.trips, revenue: Math.round(r.revenue), profit: Math.round(r.profit) })),
          },
          {
            name: t('fin_top_trips'),
            headers: [
              { key: 'tripNumber', label: t('trip', 'Cursă') },
              { key: 'route', label: t('route', 'Rută') },
              { key: 'truck', label: t('truck', 'Camion') },
              { key: 'driver', label: t('driver', 'Șofer') },
              { key: 'date', label: t('date', 'Dată') },
              { key: 'revenue', label: t('revenue'), align: 'right' },
              { key: 'profit', label: t('profit'), align: 'right' },
            ],
            rows: (data.topTrips ?? []).map(x => ({
              tripNumber: x.tripNumber || x.id.slice(0, 8), route: x.route, truck: x.truck || '', driver: x.driver || '',
              date: formatDateExcel(x.date), revenue: Math.round(x.revenue), profit: Math.round(x.profit),
            })),
          },
          {
            name: t('fin_aging_title'),
            headers: [
              { key: 'bucket', label: t('fin_aging_title') },
              { key: 'count', label: t('invoices_count', 'Facturi'), align: 'right' },
              { key: 'amount', label: t('amount', 'Sumă'), align: 'right' },
            ],
            rows: (data.aging?.buckets ?? []).map(b => ({ bucket: b.label === 'current' ? t('fin_aging_current') : t(`agingBucket${b.label}`, b.label), count: b.count, amount: Math.round(b.amount) })),
          },
        ],
      });
      toast.success(t('fin_export_ok'));
    } catch {
      toast.error(t('fin_export_fail'));
    } finally {
      setExporting(false);
    }
  };

  const SortHeader = ({ label, skey }: { label: string; skey: typeof sortKey }) => (
    <th
      onClick={() => { if (sortKey === skey) setSortAsc(a => !a); else { setSortKey(skey); setSortAsc(false); } }}
      className="table-header cursor-pointer select-none hover:text-primary transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === skey && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
      </span>
    </th>
  );

  const ToggleChip = ({ active, onClick, children }: any) => (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${active ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-surface-hover text-text-secondary hover:text-text'}`}
    >
      {children}
    </button>
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header + filters */}
      <div className="card">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text">{t('fin_title')}</h1>
            <p className="text-sm text-text-secondary mt-0.5">{t('fin_subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-full sm:w-44"><CustomSelect value={rangeType} onChange={v => setRangeType(v as RangeType)} options={periodOptions} /></div>
            {rangeType === 'custom' && (
              <>
                <Flatpickr
                  value={customFrom}
                  options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', maxDate: customTo }}
                  onChange={(dates: Date[]) => dates[0] && setCustomFrom(iso(dates[0]))}
                  className="input w-32"
                  placeholder={t('fin_from')}
                />
                <Flatpickr
                  value={customTo}
                  options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd/m/Y', minDate: customFrom }}
                  onChange={(dates: Date[]) => dates[0] && setCustomTo(iso(dates[0]))}
                  className="input w-32"
                  placeholder={t('fin_to')}
                />
              </>
            )}
            <div className="w-full sm:w-52"><CustomSelect value={clientId} onChange={setClientId} options={clientOptions} /></div>
            <div className="w-full sm:w-36"><CustomSelect value={granularity} onChange={v => setGranularity(v as Granularity)} options={granOptions} /></div>
            <button className="btn-primary" onClick={exportFull} disabled={!data || exporting}>
              {exporting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}{t('fin_export_full')}
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-text-secondary">
          <CalendarRange className="w-3.5 h-3.5 text-primary" />
          <span>{range.from} → {range.to}</span>
          <span className="text-border">|</span>
          <span>{t('fin_vs_prev')}: {data?.comparison ? `${new Date(data.comparison.from).toISOString().slice(0, 10)} → ${new Date(data.comparison.to).toISOString().slice(0, 10)}` : ''}</span>
          <span className="flex items-center gap-1.5 ml-auto">
            <Target className="w-3.5 h-3.5 text-warning" />
            <span className="whitespace-nowrap">{t('fin_target_monthly')}</span>
            <input
              type="number" min={0} step={500}
              value={target || ''}
              onChange={e => setTargetVal(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0"
              className="input !py-1 !px-2 w-24 text-xs text-right"
            />
            <span className="-ml-1">€</span>
          </span>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-secondary">{t('loading')}</span>
          </div>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
            <KpiCard icon={Euro} label={t('totalRevenue')} value={money(k.revenue)} trend={tr.revenue} accent="bg-success/10 text-success"
              sub={target > 0 ? `${t('fin_of_target')} ` : undefined}
              subExtra={target > 0 ? (
                <span className="inline-flex items-center gap-1.5 align-middle">
                  <span className="inline-block w-16 h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <span className={`block h-full rounded-full ${(targetPct ?? 0) >= 100 ? 'bg-success' : (targetPct ?? 0) >= 60 ? 'bg-primary' : 'bg-warning'}`} style={{ width: `${Math.min(100, Math.max(2, targetPct ?? 0))}%` }} />
                  </span>
                  <strong className={(targetPct ?? 0) >= 100 ? 'text-success' : 'text-warning'}>{pct(targetPct ?? 0, 0)}</strong>
                </span>
              ) : undefined} />
            <KpiCard icon={Wallet} label={t('totalCosts')} value={money(k.totalCost)} trend={tr.totalCost} invert accent="bg-error/10 text-error" />
            <KpiCard icon={PiggyBank} label={t('totalProfit')} value={money(k.profit)} trend={tr.profit}
              accent={`${(k.profit ?? 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}
              sub={`${t('fin_margin')}: ${pct(k.margin)}`} />
            <KpiCard icon={Receipt} label={t('fin_invoiced')} value={money(k.invoiced)} trend={tr.invoiced} accent="bg-blue-500/10 text-blue-500"
              sub={ps ? `${ps.issuedCount} ${t('invoices_count', 'facturi')}` : undefined} />
            <KpiCard icon={Coins} label={t('fin_collected')} value={money(k.collected)} trend={tr.collected} accent="bg-emerald-500/10 text-emerald-500"
              sub={ps?.collectionRate !== null && ps?.collectionRate !== undefined ? `${t('fin_collection_rate')}: ${pct(ps.collectionRate, 0)}` : undefined} />
            <KpiCard icon={AlertTriangle} label={t('fin_outstanding')} value={money(k.outstanding)}
              accent="bg-warning/10 text-warning"
              sub={`${t('overdueInvoices')}: ${money(k.overdueAmount)}`} />
            <KpiCard icon={Timer} label={t('fin_avg_payment_days')} value={ps?.avgPaymentDays !== null && ps?.avgPaymentDays !== undefined ? `${Math.round(ps.avgPaymentDays)} ${t('fin_days')}` : '—'}
              accent="bg-purple-500/10 text-purple-500"
              sub={ps ? `${ps.paidCount} ✓ · ${ps.partialCount} ~ · ${ps.unpaidCount} ✕` : undefined} />
            <KpiCard icon={RouteIcon} label={t('fin_avg_trip_value')} value={money(k.avgTripValue)} trend={tr.avgTripValue}
              accent="bg-cyan-500/10 text-cyan-500"
              sub={`${t('costPerKm')}: ${fmtMoney(k.costPerKm ?? 0)}`} />
          </div>

          {/* Evolution + margin gauge */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card xl:col-span-2">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-sm font-semibold text-text">{t('revenueVsCosts')}</h3>
                <div className="flex gap-1.5">
                  <ToggleChip active={showPrevious} onClick={() => setShowPrevious(v => !v)}>{t('fin_vs_previous')}</ToggleChip>
                  <ToggleChip active={showCumulative} onClick={() => setShowCumulative(v => !v)}>{t('fin_cumulative')}</ToggleChip>
                  <ToggleChip active={showProjection} onClick={() => setShowProjection(v => !v)}>{t('fin_projection')}</ToggleChip>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartRows} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={compactEur} />
                  <Tooltip formatter={(v: any, name: any) => [money(Number(v)), name]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#10B981" name={t('revenue')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#EF4444" name={t('costs')} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="#FF7A1A" strokeWidth={2.5} dot={{ r: 3 }} name={t('profit')} />
                  {showCumulative && <Line type="monotone" dataKey="cumProfit" stroke="#8B5CF6" strokeWidth={2} strokeDasharray="6 3" dot={false} name={t('fin_cumulative')} />}
                  {showPrevious && <Line type="monotone" dataKey="prevProfit" stroke="#94A3B8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name={t('fin_prev_period')} />}
                  {showProjection && <Line type="monotone" dataKey="profitProj" stroke="#FF7A1A" strokeWidth={2} strokeDasharray="2 4" dot={{ r: 3 }} connectNulls name={t('fin_projection')} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Margin gauge */}
            <div className="card flex flex-col">
              <h3 className="text-sm font-semibold text-text mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-primary" />{t('fin_margin_gauge')}
              </h3>
              <div className="relative flex-1 min-h-[170px]">
                <ResponsiveContainer width="100%" height={190}>
                  <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: 'margin', value: marginValue }]} startAngle={210} endAngle={-30}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background={{ fill: 'rgba(128,128,128,0.12)' }} dataKey="value" cornerRadius={12}
                      fill={marginValue >= 15 ? '#10B981' : marginValue >= 5 ? '#F59E0B' : '#EF4444'} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pt-4">
                  <span className={`text-3xl font-extrabold ${marginValue >= 15 ? 'text-success' : marginValue >= 5 ? 'text-warning' : 'text-error'}`}>{pct(k.margin)}</span>
                  <span className="text-[11px] text-text-secondary font-medium">{t('fin_margin')}</span>
                  <span className="text-sm font-bold text-text mt-0.5">{money(k.profit)}</span>
                </div>
              </div>
              {bestWorst && (
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-success/5 border border-success/15">
                    <span className="flex items-center gap-1.5 font-semibold text-success"><Crown className="w-3.5 h-3.5" />{t('fin_best_month')}</span>
                    <span className="font-bold text-text">{bestWorst.best.label} {bestWorst.best.year} · {money(bestWorst.best.profit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-error/5 border border-error/15">
                    <span className="flex items-center gap-1.5 font-semibold text-error"><TrendingDown className="w-3.5 h-3.5" />{t('fin_worst_month')}</span>
                    <span className="font-bold text-text">{bestWorst.worst.label} {bestWorst.worst.year} · {money(bestWorst.worst.profit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs px-2 py-1 text-text-secondary">
                    <span>{t('fin_avg_monthly_profit')}</span>
                    <span className="font-bold text-text">{money(bestWorst.avg)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cost structure + cashflow + payments */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_cost_structure')}</h3>
              {(data?.expenseBreakdown?.length ?? 0) === 0 ? (
                <div className="text-sm text-text-secondary text-center mt-16">{t('notEnoughData')}</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie data={data!.expenseBreakdown} dataKey="amount" nameKey="category" innerRadius={48} outerRadius={76} paddingAngle={3} strokeWidth={0}>
                        {data!.expenseBreakdown.map(e => <Cell key={e.category} fill={CAT_COLORS[e.category] || '#94A3B8'} />)}
                      </Pie>
                      <Tooltip formatter={(v: any, name: any) => [money(Number(v)), t(`cat_${name}`, String(name))]} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-3">
                    {data!.expenseBreakdown.map(e => (
                      <div key={e.category} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-text-secondary">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ background: CAT_COLORS[e.category] || '#94A3B8' }} />
                          {t(`cat_${e.category}`, e.category)}
                        </span>
                        <span className="font-semibold text-text">{money(e.amount)} <span className="text-text-secondary font-normal">· {pct(e.percent, 0)}</span></span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm border-t border-border pt-2 mt-2">
                      <span className="font-semibold text-text">{t('fin_trip_costs')}</span>
                      <span className="font-semibold text-text">{money((k.tripCosts ?? 0))}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_cashflow')}</h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={chartRows} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={compactEur} />
                  <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="invoiced" fill="#3B82F6" name={t('fin_invoiced')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#10B981" name={t('fin_collected')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Payment performance */}
            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-3">{t('fin_payment_perf')}</h3>
              {ps ? (
                <>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="relative w-24 h-24 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'paid', value: Math.max(0, ps.paidCount) },
                              { name: 'partial', value: Math.max(0, ps.partialCount) },
                              { name: 'unpaid', value: Math.max(0, ps.unpaidCount) },
                            ]}
                            dataKey="value" innerRadius={26} outerRadius={40} paddingAngle={2} strokeWidth={0}
                          >
                            <Cell fill="#10B981" /><Cell fill="#F59E0B" /><Cell fill="#EF4444" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base font-extrabold text-text leading-none">{ps.issuedCount}</span>
                        <span className="text-[9px] text-text-secondary uppercase">{t('invoices_count', 'facturi')}</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-success" />{t('fin_paid_full')}</span><strong className="text-text">{ps.paidCount}</strong></div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-warning" />{t('fin_partial_paid')}</span><strong className="text-text">{ps.partialCount}</strong></div>
                      <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-text-secondary"><span className="w-2 h-2 rounded-full bg-error" />{t('fin_unpaid')}</span><strong className="text-text">{ps.unpaidCount}</strong></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs border-t border-border pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">{t('fin_collection_rate')}</span>
                      <strong className={((ps.collectionRate ?? 0) >= 70 ? 'text-success' : (ps.collectionRate ?? 0) >= 40 ? 'text-warning' : 'text-error')}>
                        {ps.collectionRate !== null && ps.collectionRate !== undefined ? pct(ps.collectionRate, 0) : '—'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">{t('fin_avg_payment_days')}</span>
                      <strong className="text-text">{ps.avgPaymentDays !== null && ps.avgPaymentDays !== undefined ? `${Math.round(ps.avgPaymentDays)} ${t('fin_days')}` : '—'}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-secondary">{t('fin_total_issued')}</span>
                      <strong className="text-text">{money(ps.totalIssued)}</strong>
                    </div>
                  </div>
                </>
              ) : <div className="text-sm text-text-secondary text-center py-10">{t('notEnoughData')}</div>}
            </div>
          </div>

          {/* Top trips + Aging */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card xl:col-span-2">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />{t('fin_top_trips')}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border">
                    {[t('trip', 'Cursă'), t('route', 'Rută'), t('truck', 'Camion'), t('driver', 'Șofer'), t('revenue'), t('profit')].map(h => <th key={h} className="table-header text-left">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(data?.topTrips ?? []).map(x => (
                      <tr key={x.id} className="hover:bg-surface/60 transition-colors text-sm">
                        <td className="table-cell font-semibold whitespace-nowrap">{x.tripNumber || '—'}</td>
                        <td className="table-cell max-w-[220px] truncate" title={x.route}>{x.route}</td>
                        <td className="table-cell whitespace-nowrap">{x.truck || '—'}</td>
                        <td className="table-cell whitespace-nowrap">{x.driver || '—'}</td>
                        <td className="table-cell whitespace-nowrap">{money(x.revenue)}</td>
                        <td className="table-cell"><span className={`badge ${x.profit >= 0 ? 'badge-success' : 'badge-error'}`}>{money(x.profit)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(data?.topTrips?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-6">{t('notEnoughData')}</div>}
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text">{t('fin_aging_title')}</h3>
                <span className="badge-warning">{money(data?.aging.totalReceivable ?? 0)}</span>
              </div>
              <div className="space-y-3">
                {(data?.aging.buckets ?? []).filter(b => b.count > 0).map(b => (
                  <div key={b.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-secondary font-medium">{b.label === 'current' ? t('fin_aging_current') : t(`agingBucket${b.label}`, b.label)}</span>
                      <span className="font-bold text-text">{money(b.amount)} <span className="text-text-secondary font-normal">({b.count})</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                      <div className={`h-full rounded-full ${b.label === 'current' ? 'bg-success' : b.label === '90+' ? 'bg-error' : 'bg-warning'}`}
                        style={{ width: `${Math.max(3, (b.amount / agingMax) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {(data?.aging.buckets ?? []).every(b => b.count === 0) && (
                  <div className="text-sm text-success text-center py-6">{t('fin_no_outstanding')}</div>
                )}
                {(data?.aging.overdueCount ?? 0) > 0 && (
                  <div className="mt-3 p-3 rounded-xl bg-error/5 border border-error/20 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-error shrink-0" />
                    <span className="text-xs text-text">
                      <strong className="text-error">{money(data!.aging.overdueAmount)}</strong> {t('fin_overdue_hint')} ({data!.aging.overdueCount})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clients (searchable + sortable) */}
          <div className="card p-0 overflow-hidden">
            <div className="p-5 pb-3 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-text flex items-center gap-2"><Users className="w-4 h-4 text-text-secondary" />{t('fin_top_clients')}</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={clientSearch} onChange={e => setClientSearch(e.target.value)} placeholder={t('fin_search_clients')} className="input !py-1.5 !pl-8 text-xs w-48" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-surface border-y border-border">
                  <SortHeader label={t('client', 'Client')} skey="name" />
                  <SortHeader label={t('trips')} skey="trips" />
                  <SortHeader label={t('revenue')} skey="revenue" />
                  <SortHeader label={t('profit')} skey="profit" />
                  <SortHeader label={t('fin_margin')} skey="margin" />
                </tr></thead>
                <tbody>
                  {filteredClients.map(c => (
                    <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                      <td className="table-cell font-semibold">{c.name}</td>
                      <td className="table-cell">{Math.round(c.trips)}</td>
                      <td className="table-cell font-semibold text-success">{money(c.revenue)}</td>
                      <td className={`table-cell font-semibold ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(c.profit)}</td>
                      <td className="table-cell"><span className={`badge ${c.margin >= 15 ? 'badge-success' : c.margin >= 5 ? 'badge-warning' : 'badge-error'}`}>{pct(c.margin)}</span></td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr><td colSpan={5} className="table-cell text-center text-text-secondary py-8">{t('notEnoughData')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trucks / Drivers / Routes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_by_truck')}</h3>
              <div className="space-y-3.5">
                {(data?.byTruck ?? []).slice(0, 6).map(x => (
                  <div key={x.id}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-semibold text-text flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" />{x.name}</span>
                      <span className={`font-bold ${x.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(x.profit)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (Math.max(x.profit, 0) / maxTruckProfit) * 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">{money(x.revenue)} · {kmFmt(x.km)} · {pct(x.margin, 0)}</div>
                  </div>
                ))}
                {(data?.byTruck?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('notEnoughData')}</div>}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_by_driver')}</h3>
              <div className="space-y-3.5">
                {(data?.byDriver ?? []).slice(0, 6).map(x => (
                  <div key={x.id}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span className="font-semibold text-text flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-emerald-500" />{x.name}</span>
                      <span className={`font-bold ${x.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(x.profit)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-hover overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, (Math.max(x.profit, 0) / maxDriverProfit) * 100)}%` }} />
                    </div>
                    <div className="text-[11px] text-text-secondary mt-0.5">{money(x.revenue)} · {kmFmt(x.km)} · {pct(x.margin, 0)}</div>
                  </div>
                ))}
                {(data?.byDriver?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('notEnoughData')}</div>}
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('topProfitableRoutes')}</h3>
              <div className="space-y-2.5">
                {(data?.byRoute ?? []).map((r, idx) => (
                  <div key={r.route} className="flex items-start justify-between gap-3 text-sm py-1.5 border-b border-border last:border-0">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-surface-hover flex items-center justify-center text-primary font-bold text-[11px] shrink-0">{idx + 1}</span>
                      <span className="text-text font-medium truncate" title={r.route}>{r.route}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-bold ${r.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(r.profit)}</div>
                      <div className="text-[11px] text-text-secondary">{r.trips} {t('trips').toLowerCase()} · {money(r.revenue)}</div>
                    </div>
                  </div>
                ))}
                {(data?.byRoute?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('notEnoughData')}</div>}
              </div>
            </div>
          </div>

          {/* Series detail + recent expenses */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card xl:col-span-2 p-0 overflow-hidden">
              <div className="p-5 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">{t('fin_monthly_detail')}</h3>
                <span className="text-xs text-text-secondary">{granularity === 'week' ? t('fin_weekly_lbl') : t('fin_monthly_lbl')}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="bg-surface border-y border-border">
                    {[t('monthTable', 'Lună'), t('trips'), t('revenue'), t('costs'), t('profit'), t('fin_invoiced'), t('fin_collected')].map(h => <th key={h} className="table-header">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(data?.series ?? []).map(m => (
                      <tr key={m.month} className="hover:bg-surface/60 transition-colors">
                        <td className="table-cell font-semibold whitespace-nowrap">{m.label} {m.year}</td>
                        <td className="table-cell">{m.trips}</td>
                        <td className="table-cell text-success font-semibold">{money(m.revenue)}</td>
                        <td className="table-cell text-error">{money(m.cost)}</td>
                        <td className={`table-cell font-bold ${m.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(m.profit)}</td>
                        <td className="table-cell">{money(m.invoiced)}</td>
                        <td className="table-cell">{money(m.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                      <td className="table-cell">{t('fin_total')}</td>
                      <td className="table-cell">{totals.trips}</td>
                      <td className="table-cell text-success">{money(totals.revenue)}</td>
                      <td className="table-cell text-error">{money(totals.cost)}</td>
                      <td className={`table-cell ${totals.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(totals.profit)}</td>
                      <td className="table-cell">{money(totals.invoiced)}</td>
                      <td className="table-cell">{money(totals.collected)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-text-secondary" />{t('fin_recent_expenses')}</h3>
              <div className="space-y-2">
                {(data?.recentExpenses ?? []).map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <div className="font-medium text-text truncate">{t(`cat_${e.category}`, e.category)}</div>
                      <div className="text-[11px] text-text-secondary truncate">{formatDateExcel(e.date)}{e.description ? ` · ${e.description}` : ''}</div>
                    </div>
                    <span className="font-bold text-error shrink-0">-{money(e.amount)}</span>
                  </div>
                ))}
                {(data?.recentExpenses?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-6">{t('notEnoughData')}</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
