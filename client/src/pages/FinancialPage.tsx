import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  TrendingUp, TrendingDown, Euro, Wallet, PiggyBank,
  Route as RouteIcon, FileText, LoaderCircle, AlertTriangle, Download, ArrowUpRight
} from 'lucide-react';
import api from '../lib/api';
import CustomSelect from '../components/CustomSelect';
import toast from 'react-hot-toast';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type RangeType = 'this_month' | 'last_month' | 'last_30_days' | 'last_3_months' | 'this_year' | 'last_year' | 'last_12_months' | 'custom';
type Granularity = 'month' | 'week';

const CAT_COLORS: Record<string, string> = {
  fuel: '#EF4444',
  toll: '#F59E0B',
  maintenance: '#3B82F6',
  salary: '#8B5CF6',
  accounting: '#14B8A6',
  other: '#94A3B8',
};

function TrendBadge({ value, invert = false }: { value: number | null | undefined; invert?: boolean }) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  if (neutral) return <span className="text-[11px] font-semibold text-text-secondary px-1">±0%</span>;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${good ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function KpiCard({ icon: Icon, label, value, sub, trend, invert, accent }: any) {
  return (
    <div className="card !p-5 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${accent} opacity-[0.08] group-hover:scale-150 transition-transform duration-500`} />
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>
        <span className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${accent} bg-opacity-15 backdrop-blur-md shadow-sm`}>
          <Icon className="w-5 h-5" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <span className="text-3xl font-black text-text leading-none">{value}</span>
          {sub && <p className="text-xs font-semibold text-text-secondary mt-1.5">{sub}</p>}
        </div>
        <div className="mb-1"><TrendBadge value={trend} invert={invert} /></div>
      </div>
    </div>
  );
}

export default function FinancialPage() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);

  const [rangeType, setRangeType] = useState<RangeType>('last_12_months');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(iso(new Date()));
  const [clientId, setClientId] = useState('all');

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data || [])).catch(() => {});
  }, []);

  const computeRange = () => {
    const now = new Date();
    switch (rangeType) {
      case 'this_month': return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
      case 'last_month': return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
      case 'last_30_days': return { from: iso(new Date(now.getTime() - 29 * 86400000)), to: iso(now) };
      case 'last_3_months': return { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: iso(now) };
      case 'this_year': return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
      case 'last_year': return { from: iso(new Date(now.getFullYear() - 1, 0, 1)), to: iso(new Date(now.getFullYear() - 1, 11, 31)) };
      case 'last_12_months': return { from: iso(new Date(now.getFullYear(), now.getMonth() - 11, 1)), to: iso(now) };
      default: return { from: customFrom, to: customTo };
    }
  };

  const load = (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const r = computeRange();
    const params = new URLSearchParams({ from: r.from, to: r.to, granularity });
    if (clientId !== 'all') params.set('clientId', clientId);

    api.get(`/financial/summary?${params.toString()}`)
      .then(res => setData(res.data))
      .catch(() => toast.error(t('fin_load_error')))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, [rangeType, customFrom, customTo, granularity, clientId]);

  if (loading && !data) return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-medium text-text-secondary animate-pulse">{t('loading')}</span>
      </div>
    </div>
  );

  const kpis = data?.kpis || {};
  const trends = data?.trends || {};
  const series = data?.series || [];
  const expenses = data?.expenseBreakdown || [];

  const fMoney = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
  
  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      {/* Header & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
            {t('financial')}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1">
            Comprehensive financial performance & health
            <span className={`inline-block w-2 h-2 rounded-full ml-3 shadow-sm ${refreshing ? 'bg-primary animate-pulse' : 'bg-success'}`} />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-surface/50 backdrop-blur p-2 rounded-2xl border border-border/50 shadow-sm">
          <div className="w-48">
            <CustomSelect
              value={clientId}
              onChange={setClientId}
              options={[{ value: 'all', label: t('fin_all_clients') }, ...clients.map(c => ({ value: c.id, label: c.companyName || c.name || c.email }))]}
            />
          </div>
          <div className="h-6 w-px bg-border mx-1" />
          <select value={rangeType} onChange={e => setRangeType(e.target.value as RangeType)} className="input !py-1.5 !text-sm !rounded-xl bg-white/80">
            <option value="last_30_days">{t('fin_last30d')}</option>
            <option value="last_3_months">{t('fin_last_3_months')}</option>
            <option value="this_year">{t('fin_this_year')}</option>
            <option value="last_12_months">{t('fin_last12m')}</option>
            <option value="custom">{t('fin_custom_range')}</option>
          </select>
          {rangeType === 'custom' && (
            <div className="flex items-center gap-2">
              <Flatpickr value={customFrom} onChange={d => setCustomFrom(iso(d[0]))} className="input !py-1.5 !w-28 !text-sm !rounded-xl bg-white/80" />
              <span className="text-text-secondary text-sm">-</span>
              <Flatpickr value={customTo} onChange={d => setCustomTo(iso(d[0]))} className="input !py-1.5 !w-28 !text-sm !rounded-xl bg-white/80" />
            </div>
          )}
          <div className="h-6 w-px bg-border mx-1" />
          <div className="flex bg-surface-hover rounded-xl p-0.5 border border-border/50">
            {['week', 'month'].map(g => (
              <button key={g} onClick={() => setGranularity(g as Granularity)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${granularity === g ? 'bg-white text-emerald-600 shadow-sm' : 'text-text-secondary hover:text-text'}`}>
                {g === 'week' ? t('fin_weekly_lbl') : t('fin_monthly_lbl')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard icon={Euro} label={t('fin_revenue_lbl')} value={fMoney(kpis.revenue || 0)} sub={`${fMoney(kpis.avgTripValue || 0)} avg/trip`} trend={trends.revenue} accent="bg-emerald-500 text-emerald-500" />
        <KpiCard icon={PiggyBank} label={t('fin_profit_lbl')} value={fMoney(kpis.profit || 0)} sub={`${(kpis.margin || 0).toFixed(1)}% margin`} trend={trends.profit} accent="bg-blue-500 text-blue-500" />
        <KpiCard icon={Wallet} label={t('fin_total_costs')} value={fMoney(kpis.totalCost || 0)} sub={`${fMoney(kpis.costPerKm || 0)} / km`} trend={trends.totalCost} invert accent="bg-error text-error" />
        <KpiCard icon={FileText} label="Outstanding" value={fMoney(kpis.outstanding || 0)} sub={`${kpis.overdueCount || 0} overdue invoices`} trend={null} accent="bg-purple-500 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue & Profit Trends */}
        <div className="lg:col-span-2 card !p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
          <h3 className="text-sm font-bold text-text mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Revenue & Profit Analysis
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}
                  formatter={(value: any, name: string) => [fMoney(value), name]}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Bar yAxisId="left" name="Revenue" dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" name="Cost" dataKey="cost" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.8} />
                <Line yAxisId="right" type="monotone" name="Profit" dataKey="profit" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="card !p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-error" />
          <h3 className="text-sm font-bold text-text mb-2">Cost Breakdown</h3>
          <p className="text-xs text-text-secondary mb-6">{fMoney(kpis.totalExpenses || 0)} operating expenses</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {expenses.length > 0 ? (
              <>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenses} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                        {expenses.map((e: any) => <Cell key={e.category} fill={CAT_COLORS[e.category.toLowerCase()] || CAT_COLORS.other} />)}
                      </Pie>
                      <RechartsTooltip
                        formatter={(value: any) => fMoney(value)}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-4 space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {expenses.map((e: any) => (
                    <div key={e.category} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CAT_COLORS[e.category.toLowerCase()] || CAT_COLORS.other }} />
                        <span className="font-semibold text-text capitalize">{e.category}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-text-secondary">{e.percent.toFixed(1)}%</span>
                        <span className="font-bold">{fMoney(e.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-text-secondary p-4 flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 opacity-20" />
                <span className="text-sm font-medium">No expenses logged for this period</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Clients by Profit Margin */}
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Top Clients by Margin
            </h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/50 text-[10px] uppercase font-bold text-text-secondary sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(data?.topClients || []).slice(0, 6).map((c: any, i: number) => (
                  <tr key={c.id} className="hover:bg-surface transition-colors group cursor-pointer">
                    <td className="px-4 py-3">
                      <p className="font-bold text-text flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-surface-hover flex items-center justify-center text-[10px] text-text-secondary">{i+1}</span>
                        {c.name}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-text-secondary">
                      {fMoney(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-block text-[11px] font-bold px-2 py-1 rounded-md shadow-sm ${c.margin >= 20 ? 'bg-success/10 text-success' : c.margin >= 10 ? 'bg-warning/10 text-warning' : 'bg-error/10 text-error'}`}>
                        {c.margin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {(data?.topClients?.length || 0) === 0 && (
                  <tr><td colSpan={3} className="p-6 text-center text-text-secondary text-sm">No client data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Aging */}
        <div className="card !p-0 overflow-hidden border border-purple-500/10">
          <div className="p-4 border-b border-purple-500/10 bg-purple-500/5">
            <h3 className="text-sm font-bold text-purple-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Receivables Aging
            </h3>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">Total Outstanding</p>
                <p className="text-3xl font-black text-text mt-1">{fMoney(data?.aging?.totalReceivable || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-error uppercase">Overdue</p>
                <p className="text-xl font-bold text-error mt-1">{fMoney(data?.aging?.overdueAmount || 0)}</p>
              </div>
            </div>

            <div className="space-y-4">
              {data?.aging?.buckets?.map((b: any) => {
                if (b.amount <= 0) return null;
                const isOverdue = b.label !== 'current';
                const pct = ((b.amount / (data?.aging?.totalReceivable || 1)) * 100);
                return (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className={`${isOverdue ? 'text-error' : 'text-success uppercase'}`}>{b.label === 'current' ? 'Current (Not Due)' : `${b.label} Days Overdue`}</span>
                      <span className="text-text">{fMoney(b.amount)} ({b.count})</span>
                    </div>
                    <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${isOverdue ? (b.label === '90+' ? 'bg-red-600' : 'bg-error') : 'bg-success'}`} style={{ width: `${Math.max(1, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!data?.aging?.buckets || data.aging.buckets.every((b: any) => b.amount === 0)) && (
                <div className="text-center py-6">
                  <p className="text-sm font-bold text-success">No outstanding invoices!</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
