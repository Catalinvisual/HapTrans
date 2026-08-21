import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, BarChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Download, Euro, Wallet, Receipt, PiggyBank, AlertTriangle,
  Truck, Users, Route as RouteIcon, CalendarRange, Gauge, Coins,
} from 'lucide-react';
import api from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import toast from 'react-hot-toast';
import { exportExcel } from '../lib/exportExcel';

interface SummaryData {
  period: { from: string; to: string };
  comparison: { from: string; to: string };
  kpis: Record<string, number>;
  trends: Record<string, number | null>;
  previous: Record<string, number>;
  monthly: Array<{ month: string; label: string; year: number; revenue: number; cost: number; profit: number; km: number; trips: number; invoiced: number; collected: number }>;
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

type RangeType = 'this_month' | 'last_month' | 'last_3_months' | 'this_year' | 'last_year' | 'custom';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function TrendBadge({ value, invert = false, pct }: { value: number | null | undefined; invert?: boolean; pct: (n: number, d?: number) => string }) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  if (neutral) return <span className="text-[11px] font-semibold text-text-secondary">±0%</span>;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${good ? 'text-success' : 'text-error'}`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pct(Math.abs(value))}
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend, invert, accent, pct }: any) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider truncate">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accent}`}><Icon className="w-4 h-4" /></span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-2 flex-wrap">
        <span className="text-xl lg:text-2xl font-bold text-text leading-tight">{value}</span>
        <TrendBadge value={trend} invert={invert} pct={pct} />
      </div>
      {sub && <div className="text-[11px] text-text-secondary mt-0.5">{sub}</div>}
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
    case 'last_3_months':
      return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(new Date(now.getFullYear(), 11, 31)) };
    case 'last_year':
      return { from: iso(new Date(now.getFullYear() - 1, 0, 1)), to: iso(new Date(now.getFullYear() - 1, 11, 31)) };
    default:
      return { from: customFrom, to: customTo };
  }
}

export default function FinancialPage() {
  const { t, i18n } = useTranslation();
  const [rangeType, setRangeType] = useState<RangeType>('this_year');
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [clientId, setClientId] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => computeRange(rangeType, customFrom, customTo), [rangeType, customFrom, customTo]);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (rangeType === 'custom' && (!range.from || !range.to)) return;
    setLoading(true);
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (clientId !== 'all') params.set('clientId', clientId);
    api.get(`/financial/summary?${params.toString()}`)
      .then(r => setData(r.data))
      .catch(() => toast.error(t('fin_load_error')))
      .finally(() => setLoading(false));
  }, [range.from, range.to, clientId, rangeType, t]);

  const lang = i18n.language || 'ro';
  const money = (n: number) => `€${Math.round(Number(n) || 0).toLocaleString(lang)}`;
  const kmFmt = (n: number) => `${Math.round(Number(n) || 0).toLocaleString(lang)} km`;
  const pct = (n: number, digits = 1) => `${(Number(n) || 0).toFixed(digits)}%`;

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString(lang, { month: 'short' });
  };

  const chartData = useMemo(() => (data?.monthly ?? []).map(m => ({ ...m, name: monthLabel(m.month) })), [data, lang]);

  const periodOptions: SelectOption[] = [
    { value: 'this_month', label: t('fin_this_month') },
    { value: 'last_month', label: t('fin_last_month') },
    { value: 'last_3_months', label: t('fin_last_3_months') },
    { value: 'this_year', label: t('fin_this_year') },
    { value: 'last_year', label: t('fin_last_year') },
    { value: 'custom', label: t('fin_custom_range') },
  ];

  const clientOptions: SelectOption[] = [
    { value: 'all', label: t('fin_all_clients') },
    ...clients.map(c => ({ value: c.id, label: c.companyName || c.name || c.email || c.id })),
  ];

  const k = data?.kpis ?? {};
  const tr = data?.trends ?? {};

  const exportMonthly = async () => {
    if (!data?.monthly?.length) return;
    try {
      await exportExcel({
        filename: `raport-financiar_${range.from}_${range.to}`,
        sheetName: 'Financial',
        title: t('fin_title'),
        subtitle: `${range.from} — ${range.to}${clientId !== 'all' ? ` · ${clientOptions.find(c => c.value === clientId)?.label ?? ''}` : ''}`,
        headers: [
          { key: 'month', label: t('monthTable', 'Lună') },
          { key: 'trips', label: t('trips', 'Curse'), align: 'right' },
          { key: 'revenue', label: t('revenue', 'Venit'), align: 'right' },
          { key: 'cost', label: t('costs', 'Costuri'), align: 'right' },
          { key: 'profit', label: t('profit', 'Profit'), align: 'right' },
          { key: 'km', label: 'KM', align: 'right' },
          { key: 'invoiced', label: t('fin_invoiced'), align: 'right' },
          { key: 'collected', label: t('fin_collected'), align: 'right' },
        ],
        rows: data.monthly.map(m => ({
          month: m.month,
          trips: m.trips,
          revenue: Math.round(m.revenue),
          cost: Math.round(m.cost),
          profit: Math.round(m.profit),
          km: Math.round(m.km),
          invoiced: Math.round(m.invoiced),
          collected: Math.round(m.collected),
        })),
      });
      toast.success(t('fin_export_ok'));
    } catch {
      toast.error(t('fin_export_fail'));
    }
  };

  const maxTruckProfit = Math.max(...(data?.byTruck ?? []).map(x => x.profit), 1);
  const maxDriverProfit = Math.max(...(data?.byDriver ?? []).map(x => x.profit), 1);
  const agingMax = Math.max(...(data?.aging.buckets ?? []).map(b => b.amount), 1);
  const totals = useMemo(() => (data?.monthly ?? []).reduce((acc, m) => ({
    trips: acc.trips + m.trips, revenue: acc.revenue + m.revenue, cost: acc.cost + m.cost,
    profit: acc.profit + m.profit, km: acc.km + m.km, invoiced: acc.invoiced + m.invoiced, collected: acc.collected + m.collected,
  }), { trips: 0, revenue: 0, cost: 0, profit: 0, km: 0, invoiced: 0, collected: 0 }), [data]);

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header + filters */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
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
            <button className="btn-primary" onClick={exportMonthly} disabled={!data?.monthly?.length}>
              <Download className="w-4 h-4" />{t('fin_export')}
            </button>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-xs text-text-secondary">
          <CalendarRange className="w-3.5 h-3.5 text-primary" />
          <span>{range.from} → {range.to}</span>
          <span className="text-border">|</span>
          <span>{t('fin_vs_prev')}: {(data?.comparison ? `${new Date(data.comparison.from).toISOString().slice(0, 10)} → ${new Date(data.comparison.to).toISOString().slice(0, 10)}` : '')}</span>
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
            <KpiCard icon={Euro} label={t('totalRevenue')} value={money(k.revenue)} trend={tr.revenue} accent="bg-success/10 text-success" />
            <KpiCard icon={Wallet} label={t('totalCosts')} value={money(k.totalCost)} trend={tr.totalCost} invert accent="bg-error/10 text-error" />
            <KpiCard icon={PiggyBank} label={t('totalProfit')} value={money(k.profit)} trend={tr.profit}
              accent={`${(k.profit ?? 0) >= 0 ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}
              sub={`${t('fin_margin')}: ${pct(k.margin)}`} />
            <KpiCard icon={Receipt} label={t('fin_invoiced')} value={money(k.invoiced)} trend={tr.invoiced} accent="bg-blue-500/10 text-blue-500" />
            <KpiCard icon={Coins} label={t('fin_collected')} value={money(k.collected)} trend={tr.collected} accent="bg-emerald-500/10 text-emerald-500" />
            <KpiCard icon={AlertTriangle} label={t('fin_outstanding')} value={money(k.outstanding)}
              accent="bg-warning/10 text-warning"
              sub={`${t('overdueInvoices')}: ${money(k.overdueAmount)}`} />
            <KpiCard icon={Gauge} label={t('costPerKm')} value={`€${(k.costPerKm ?? 0).toFixed(2)}`} accent="bg-surface text-text-secondary"
              sub={`${t('fin_km_total')}: ${kmFmt(k.km)}`} />
            <KpiCard icon={RouteIcon} label={t('fin_avg_trip_value')} value={money(k.avgTripValue)} trend={tr.avgTripValue}
              accent="bg-purple-500/10 text-purple-500"
              sub={`${t('trips')}: ${Math.round(k.tripsCount ?? 0)}`} />
          </div>

          {/* Evolution + cost structure */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card xl:col-span-2">
              <h3 className="text-sm font-semibold text-text mb-4">{t('revenueVsCosts')}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={chartData} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `€${Number(v) >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" name={t('revenue')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#EF4444" name={t('costs')} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" stroke="#FF7A1A" strokeWidth={2.5} dot={{ r: 3 }} name={t('profit')} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_cost_structure')}</h3>
              {(data?.expenseBreakdown?.length ?? 0) === 0 ? (
                <div className="text-sm text-text-secondary text-center mt-16">{t('notEnoughData')}</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={data!.expenseBreakdown} dataKey="amount" nameKey="category" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
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
          </div>

          {/* Cash flow + Aging */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="card xl:col-span-2">
              <h3 className="text-sm font-semibold text-text mb-4">{t('fin_cashflow')}</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `€${Number(v) >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
                  <Tooltip formatter={(v: any) => money(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Bar dataKey="invoiced" fill="#3B82F6" name={t('fin_invoiced')} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="collected" fill="#10B981" name={t('fin_collected')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text">{t('fin_aging_title')}</h3>
                <span className="badge-warning">{money(data?.aging.totalReceivable)}</span>
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
                  <div className="text-sm text-success text-center py-8">{t('fin_no_outstanding')}</div>
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

          {/* Clients */}
          <div className="card p-0 overflow-hidden">
            <div className="p-5 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text">{t('fin_top_clients')}</h3>
              <Users className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-surface border-y border-border">
                  {[t('client', 'Client'), t('trips'), t('revenue'), t('profit'), t('fin_margin')].map(h => <th key={h} className="table-header">{h}</th>)}
                </tr></thead>
                <tbody>
                  {(data?.topClients ?? []).map(c => (
                    <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                      <td className="table-cell font-semibold">{c.name}</td>
                      <td className="table-cell">{Math.round(c.trips)}</td>
                      <td className="table-cell font-semibold text-success">{money(c.revenue)}</td>
                      <td className={`table-cell font-semibold ${c.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(c.profit)}</td>
                      <td className="table-cell"><span className={`badge ${c.margin >= 15 ? 'badge-success' : c.margin >= 5 ? 'badge-warning' : 'badge-error'}`}>{pct(c.margin)}</span></td>
                    </tr>
                  ))}
                  {(data?.topClients?.length ?? 0) === 0 && (
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
                    <div className="text-[11px] text-text-secondary mt-0.5">{money(x.revenue)} · {Math.round(x.km).toLocaleString(lang)} km · {pct(x.margin, 0)}</div>
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
                    <div className="text-[11px] text-text-secondary mt-0.5">{money(x.revenue)} · {Math.round(x.km).toLocaleString(lang)} km · {pct(x.margin, 0)}</div>
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
                      <div className="text-[11px] text-text-secondary">{r.trips} {t('trips').toLowerCase()}</div>
                    </div>
                  </div>
                ))}
                {(data?.byRoute?.length ?? 0) === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('notEnoughData')}</div>}
              </div>
            </div>
          </div>

          {/* Monthly detail table */}
          <div className="card p-0 overflow-x-auto">
            <div className="p-5 pb-3"><h3 className="text-sm font-semibold text-text">{t('fin_monthly_detail')}</h3></div>
            <table className="w-full">
              <thead><tr className="bg-surface border-y border-border">
                {[t('monthTable', 'Lună'), t('trips'), t('revenue'), t('costs'), t('profit'), 'KM', t('fin_invoiced'), t('fin_collected')].map(h => <th key={h} className="table-header">{h}</th>)}
              </tr></thead>
              <tbody>
                {(data?.monthly ?? []).map(m => (
                  <tr key={m.month} className="hover:bg-surface/60 transition-colors">
                    <td className="table-cell font-semibold capitalize">{monthLabel(m.month)} {m.year}</td>
                    <td className="table-cell">{m.trips}</td>
                    <td className="table-cell font-semibold text-success">{money(m.revenue)}</td>
                    <td className="table-cell text-error">{money(m.cost)}</td>
                    <td className={`table-cell font-semibold ${m.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(m.profit)}</td>
                    <td className="table-cell">{Math.round(m.km).toLocaleString(lang)}</td>
                    <td className="table-cell text-blue-500">{money(m.invoiced)}</td>
                    <td className="table-cell text-emerald-600">{money(m.collected)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-surface border-t-2 border-border font-bold">
                  <td className="table-cell">{t('fin_total')}</td>
                  <td className="table-cell">{totals.trips}</td>
                  <td className="table-cell text-success">{money(totals.revenue)}</td>
                  <td className="table-cell text-error">{money(totals.cost)}</td>
                  <td className={`table-cell ${totals.profit >= 0 ? 'text-success' : 'text-error'}`}>{money(totals.profit)}</td>
                  <td className="table-cell">{Math.round(totals.km).toLocaleString(lang)}</td>
                  <td className="table-cell text-blue-500">{money(totals.invoiced)}</td>
                  <td className="table-cell text-emerald-600">{money(totals.collected)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
