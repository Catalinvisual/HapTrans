import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Wallet, PiggyBank, LoaderCircle, AlertTriangle, ArrowUpRight, FileText, Landmark, Banknote, CalendarClock, Receipt
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { fmtMoney, fmtNumber, fmtPercent } from '../lib/format';
import AnalyticsToolbar, { computeRange } from '../components/analytics/AnalyticsToolbar';
import type { Granularity } from '../components/analytics/AnalyticsToolbar';
import KpiCard from '../components/analytics/KpiCard';
import ReportTable from '../components/analytics/ReportTable';
import type { ReportColumn } from '../components/analytics/ReportTable';
import EmptyState from '../components/analytics/EmptyState';
import { useAuthStore } from '../store/authStore';

const BUCKET_LABELS: Record<string, string> = {
  current: 'agingBucketcurrent',
  '1-30': 'agingBucket1-30',
  '31-60': 'agingBucket31-60',
  '61-90': 'agingBucket61-90',
  '90+': 'agingBucket90+',
};

const CAT_COLORS: Record<string, string> = {
  fuel: '#EF4444',
  toll: '#F59E0B',
  maintenance: '#3B82F6',
  salary: '#8B5CF6',
  accounting: '#14B8A6',
  admin: '#6366F1',
  depreciation: '#EC4899',
  insurance: '#06B6D4',
  carrier: '#F97316',
  other: '#94A3B8',
};

function costColor(cat: string): string {
  return CAT_COLORS[String(cat).toLowerCase()] || CAT_COLORS.other;
}

export default function FinancialPage() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const now = new Date();
  const [rangeType, setRangeType] = useState('last_12_months');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [customFrom, setCustomFrom] = useState(now.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  useEffect(() => {
    if (user && user.role !== 'admin') {
      toast.error(t('forbidden'));
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    const r = computeRange(rangeType, customFrom, customTo);
    const params = new URLSearchParams({ from: r.from, to: r.to, granularity });
    api.get(`/analytics/financial?${params.toString()}`)
      .then(res => setData(res.data))
      .catch(() => toast.error(t('an_fin_load_error')))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, [rangeType, customFrom, customTo, granularity]);

  const k = data?.kpis || {};
  const tr = data?.trends || {};
  const series = data?.series || [];
  const costBreakdown = data?.costBreakdown || [];
  const recv = data?.receivables || {};
  const pay = data?.payables || {};
  const cash = data?.cashflow || {};
  const prof = data?.profitability || {};

  const customerCols: ReportColumn[] = [
    { key: 'name', label: t('an_customer') },
    { key: 'orders', label: t('an_orders'), align: 'right', type: 'number' },
    { key: 'revenue', label: t('an_revenue'), align: 'right', type: 'currency' },
    { key: 'profit', label: t('an_profit'), align: 'right', type: 'currency' },
    { key: 'margin', label: t('an_margin'), align: 'right', type: 'percent' },
    { key: 'otif', label: t('an_otif'), align: 'right', type: 'percent' },
  ];
  const routeCols: ReportColumn[] = [
    { key: 'route', label: t('an_route') },
    { key: 'trips', label: t('an_trips'), align: 'right', type: 'number' },
    { key: 'km', label: t('an_km'), align: 'right', type: 'number' },
    { key: 'revenue', label: t('an_revenue'), align: 'right', type: 'currency' },
    { key: 'profit', label: t('an_profit'), align: 'right', type: 'currency' },
    { key: 'margin', label: t('an_margin'), align: 'right', type: 'percent' },
  ];
  const vehicleCols: ReportColumn[] = [
    { key: 'name', label: t('an_vehicle') },
    { key: 'trips', label: t('an_trips'), align: 'right', type: 'number' },
    { key: 'km', label: t('an_km'), align: 'right', type: 'number' },
    { key: 'revenue', label: t('an_revenue'), align: 'right', type: 'currency' },
    { key: 'profit', label: t('an_profit'), align: 'right', type: 'currency' },
    { key: 'margin', label: t('an_margin'), align: 'right', type: 'percent' },
  ];
  const carrierCols: ReportColumn[] = [
    { key: 'name', label: t('an_carrier') },
    { key: 'trips', label: t('an_trips'), align: 'right', type: 'number' },
    { key: 'carrierCost', label: t('an_carrier_cost'), align: 'right', type: 'currency' },
    { key: 'revenue', label: t('an_revenue'), align: 'right', type: 'currency' },
    { key: 'marginImpact', label: t('an_margin'), align: 'right', type: 'percent' },
  ];
  const driverCols: ReportColumn[] = [
    { key: 'name', label: t('an_driver') },
    { key: 'trips', label: t('an_trips'), align: 'right', type: 'number' },
    { key: 'km', label: t('an_km'), align: 'right', type: 'number' },
    { key: 'revenue', label: t('an_revenue'), align: 'right', type: 'currency' },
    { key: 'profit', label: t('an_profit'), align: 'right', type: 'currency' },
    { key: 'margin', label: t('an_margin'), align: 'right', type: 'percent' },
  ];
  const invoiceCols: ReportColumn[] = [
    { key: 'invoiceNumber', label: t('an_invoice') },
    { key: 'client', label: t('an_customer') },
    { key: 'dueDate', label: t('an_due_date'), type: 'date' },
    { key: 'outstanding', label: t('an_outstanding'), align: 'right', type: 'currency' },
    { key: 'daysOverdue', label: t('an_days_overdue'), align: 'right', type: 'number' },
  ];

  // useMemo must be declared before any conditional returns (Rules of Hooks)
  const cashflowSummary = useMemo(() => [
    { label: t('an_cash_opening'), value: cash.openingBalance ?? 0 },
    { label: t('an_cash_received'), value: cash.actualIncoming ?? 0 },
    { label: t('an_cash_paid'), value: cash.actualOutgoing ?? 0 },
    { label: t('an_cash_expected_in'), value: cash.expectedIncoming ?? 0 },
    { label: t('an_cash_expected_out'), value: cash.expectedOutgoing ?? 0 },
    { label: t('an_cash_closing'), value: cash.projectedBalance ?? 0 },
  ], [cash, t]);

  const maxBucket = Math.max(...(recv.buckets || []).map((b: any) => b.amount || 0), 1);

  if (loading && !data) return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-medium text-text-secondary animate-pulse">{t('loading')}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-teal-600">
            {t('financial')}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1 flex items-center gap-2">
            {t('fin_subtitle')}
            <span className={`inline-block w-2 h-2 rounded-full shadow-sm ${refreshing ? 'bg-primary animate-pulse' : 'bg-success'}`} />
          </p>
        </div>
        <AnalyticsToolbar
          rangeType={rangeType} onRangeType={setRangeType}
          customFrom={customFrom} customTo={customTo}
          onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          granularity={granularity} onGranularity={setGranularity}
          onRefresh={() => load(true)} refreshing={refreshing}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <KpiCard icon={Wallet} label={t('an_revenue')} value={fmtMoney(k.revenue || 0)} trend={tr.revenue} accent="bg-emerald-500 text-emerald-500" />
        <KpiCard icon={Banknote} label={t('an_transport_cost')} value={fmtMoney(k.transportCost || 0)} trend={tr.transportCost} invert accent="bg-error text-error" />
        <KpiCard icon={PiggyBank} label={t('an_gross_profit')} value={fmtMoney(k.grossProfit || 0)} trend={tr.grossProfit} accent="bg-blue-500 text-blue-500" />
        <KpiCard icon={Receipt} label={t('an_gross_margin')} value={fmtPercent(k.grossMargin || 0)} trend={tr.grossMargin} trendSuffix="pp" accent="bg-indigo-500 text-indigo-500" />
        <KpiCard icon={Landmark} label={t('an_op_expenses')} value={fmtMoney(k.operatingExpenses || 0)} trend={tr.operatingExpenses} invert accent="bg-warning text-warning" />
        <KpiCard icon={Wallet} label={t('an_total_cost')} value={fmtMoney(k.totalCost || 0)} trend={tr.totalCost} invert accent="bg-purple-500 text-purple-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card !p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
          <h3 className="text-sm font-bold text-text mb-6 flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-emerald-500" /> {t('fin_metric')}
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} tickFormatter={v => fmtNumber(v)} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 13 }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}
                  formatter={(value: any, name: string) => [fmtMoney(value), name]}
                />
                <Bar yAxisId="left" name={t('an_revenue')} dataKey="revenue" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar yAxisId="left" name={t('an_transport_cost')} dataKey="cost" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.8} />
                <Line yAxisId="left" type="monotone" name={t('an_gross_profit')} dataKey="profit" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card !p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-error" />
          <h3 className="text-sm font-bold text-text mb-2">{t('an_cost_breakdown')}</h3>
          <p className="text-xs text-text-secondary mb-4">{fmtMoney(k.totalCost || 0)}</p>
          {costBreakdown.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={costBreakdown} dataKey="amount" nameKey="category" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4}>
                      {costBreakdown.map((e: any) => <Cell key={e.category} fill={costColor(e.category)} />)}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: any) => fmtMoney(value)}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-3 space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {costBreakdown.map((e: any) => (
                  <div key={e.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: costColor(e.category) }} />
                      <span className="font-semibold text-text capitalize">{e.category}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-text-secondary">{fmtPercent(e.percent ?? 0)}</span>
                      <span className="font-bold">{fmtMoney(e.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState icon={FileText} title={t('an_no_cost_data')} message={t('an_no_cost_data_msg')} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card !p-0 overflow-hidden border border-purple-500/10">
          <div className="p-4 border-b border-purple-500/10 bg-purple-500/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-500" /> {t('an_receivables')}
            </h3>
            <span className="text-xs font-bold text-error">{fmtNumber(recv.overdueCount || 0)} {t('an_overdue')}</span>
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase">{t('an_total_outstanding')}</p>
                <p className="text-2xl font-black text-text mt-1">{fmtMoney(recv.totalOutstanding || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-error uppercase">{t('an_overdue')}</p>
                <p className="text-xl font-bold text-error mt-1">{fmtMoney(recv.overdueAmount || 0)}</p>
              </div>
            </div>
            <div className="space-y-4">
              {(recv.buckets || []).map((b: any) => {
                if (!b.amount) return null;
                const overdue = b.label !== 'current';
                const pct = ((b.amount || 0) / maxBucket) * 100;
                return (
                  <div key={b.label}>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className={`${overdue ? 'text-error' : 'text-success uppercase'}`}>{t(BUCKET_LABELS[b.label] || 'rb_unknown', b.label)}</span>
                      <span className="text-text">{fmtMoney(b.amount)} ({fmtNumber(b.count)})</span>
                    </div>
                    <div className="w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${overdue ? (b.label === '90+' ? 'bg-red-600' : 'bg-error') : 'bg-success'}`} style={{ width: `${Math.max(1, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              {(!recv.buckets || recv.buckets.every((b: any) => !b.amount)) && (
                <div className="text-center py-6">
                  <p className="text-sm font-bold text-success">{t('an_no_outstanding')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card !p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Landmark className="w-4 h-4 text-cyan-500" /> {t('an_cashflow')}
            </h3>
            <span className="text-[11px] text-text-secondary">{t('an_cash_note')}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {cashflowSummary.map(cs => (
              <div key={cs.label} className="bg-surface/60 border border-border rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary truncate">{cs.label}</div>
                <div className="text-sm font-black text-text mt-1">{fmtMoney(cs.value)}</div>
              </div>
            ))}
          </div>
          {cash.projection?.length > 0 && (
            <ReportTable
              columns={[
                { key: 'period', label: t('an_period') },
                { key: 'expectedIncoming', label: t('an_cash_expected_in'), align: 'right', type: 'currency' },
                { key: 'expectedOutgoing', label: t('an_cash_expected_out'), align: 'right', type: 'currency' },
              ]}
              rows={cash.projection}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30 flex items-center justify-between">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" /> {t('an_profit_by_customer')}
            </h3>
          </div>
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            <ReportTable columns={customerCols} rows={(prof.customers || []).slice(0, 30)} />
          </div>
        </div>
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-500" /> {t('an_profit_by_route')}
            </h3>
          </div>
          <div className="max-h-[380px] overflow-y-auto custom-scrollbar">
            <ReportTable columns={routeCols} rows={(prof.routes || []).slice(0, 30)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" /> {t('an_profit_by_vehicle')}
            </h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <ReportTable columns={vehicleCols} rows={(prof.vehicles || []).slice(0, 20)} />
          </div>
        </div>
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-500" /> {t('an_profit_by_carrier')}
            </h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <ReportTable columns={carrierCols} rows={(prof.carriers || []).slice(0, 20)} />
          </div>
        </div>
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Wallet className="w-4 h-4 text-indigo-500" /> {t('an_profit_by_driver')}
            </h3>
          </div>
          <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
            <ReportTable columns={driverCols} rows={(prof.drivers || []).slice(0, 20)} />
          </div>
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-surface/30 flex items-center justify-between">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-error" /> {t('an_receivables_open_invoices')}
          </h3>
          <span className="text-xs font-bold text-text-secondary">{fmtNumber((recv.openInvoices || []).length)}</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          <ReportTable columns={invoiceCols} rows={recv.openInvoices || []} />
        </div>
      </div>

      <div className="card !p-0 overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-surface/30">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyan-500" /> {t('an_payables')} — {fmtMoney(pay.total || 0)}
          </h3>
        </div>
        <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
          <ReportTable
            columns={[
              { key: 'description', label: t('an_payable_desc') },
              { key: 'tripId', label: t('an_trip_id'), align: 'right' },
              { key: 'date', label: t('an_date'), type: 'date' },
              { key: 'status', label: t('an_status') },
              { key: 'amount', label: t('an_amount'), align: 'right', type: 'currency' },
            ]}
            rows={pay.items || []}
          />
        </div>
      </div>
    </div>
  );
}