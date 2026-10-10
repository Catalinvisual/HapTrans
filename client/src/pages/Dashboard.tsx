import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import {
  Truck, Route as RouteIcon, AlertTriangle, Clock, Target, LoaderCircle,
  Package, Wallet, CheckCircle2, Gauge, Zap, Flame, CircleDollarSign,
  Activity, ArrowUpRight, TrendingUp, FileSpreadsheet, Globe, Map
} from 'lucide-react';
import api from '../lib/api';
import { fmtMoney, fmtNumber, fmtPercent, fmtKm } from '../lib/format';
import AnalyticsToolbar, { computeRange } from '../components/analytics/AnalyticsToolbar';
import type { Granularity } from '../components/analytics/AnalyticsToolbar';
import KpiCard from '../components/analytics/KpiCard';
import ProgressRing from '../components/analytics/ProgressRing';
import EmptyState from '../components/analytics/EmptyState';
import ReportsPanel from '../components/analytics/ReportsPanel';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [reportsOpen, setReportsOpen] = useState(false);

  const now = new Date();
  const [rangeType, setRangeType] = useState('this_month');
  const [customFrom, setCustomFrom] = useState(now.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  const load = (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    const r = computeRange(rangeType, customFrom, customTo);
    const params = new URLSearchParams({ from: r.from, to: r.to });
    api.get(`/analytics/executive?${params.toString()}`)
      .then(res => setAnalytics(res.data))
      .catch(() => null)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, [rangeType, customFrom, customTo]);

  useEffect(() => {
    const id = setInterval(() => load(true), 60000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeType, customFrom, customTo]);

  if (loading && !analytics) return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-medium text-text-secondary animate-pulse">{t('loading')}</span>
      </div>
    </div>
  );

  const kpis = analytics?.kpis || {};
  const ops = kpis.operations || {};
  const svc = kpis.service || {};
  const fleet = kpis.fleet || {};
  const fin = kpis.financial || {};
  const trends = analytics?.trends || {};
  const series = analytics?.series || [];
  const distO = analytics?.orderStatusDistribution || [];
  const distT = analytics?.tripStatusDistribution || [];
  const customers = analytics?.topCustomersRevenue || [];
  const routes = analytics?.routes || [];
  const countries = analytics?.byCountry?.combined || [];
  const meta = analytics?.meta || {};
  const periodLabel =
    typeof meta.period === 'string'
      ? (meta.period as string)
      : (() => {
          const p = (meta.period || {}) as { from?: string; to?: string };
          const fmt = (d?: string) =>
            d
              ? new Date(d).toLocaleDateString(i18n.language, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : null;
          const from = fmt(p.from);
          const to = fmt(p.to);
          if (from && to) return `${from} – ${to}`;
          if (from) return from;
          return new Date().toLocaleDateString(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        })();

  const maxDist = Math.max(...distO.map((d: any) => d.count || 0), 1);

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            {t('dash_ops_board')}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1 flex items-center gap-2">
            {periodLabel}
            <span className={`inline-block w-2 h-2 rounded-full shadow-sm ${refreshing ? 'bg-primary animate-pulse' : 'bg-success'}`} />
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button onClick={() => setReportsOpen(true)} className="btn-primary !px-3 !py-2 text-xs shrink-0">
            <FileSpreadsheet className="w-4 h-4 mr-1.5" /> {t('rp_export_label')}
          </button>
          <AnalyticsToolbar
            rangeType={rangeType} onRangeType={setRangeType}
            customFrom={customFrom} customTo={customTo}
            onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
            onRefresh={() => load(true)} refreshing={refreshing}
          />
        </div>
      </div>

      <ReportsPanel open={reportsOpen} onClose={() => setReportsOpen(false)} />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard icon={Package} label={t('an_orders_total')} value={fmtNumber(ops.ordersTotal || 0)} trend={trends.ordersTotal} accent="bg-primary text-primary" />
        <KpiCard icon={Clock} label={t('an_open_orders')} value={fmtNumber(ops.openOrders || 0)} trend={trends.openOrders} accent="bg-blue-500 text-blue-500" />
        <KpiCard icon={Truck} label={t('an_active_trips')} value={fmtNumber(ops.activeTrips || 0)} trend={trends.activeTrips} accent="bg-cyan-500 text-cyan-500" />
        <KpiCard icon={CheckCircle2} label={t('an_completed_trips')} value={fmtNumber(ops.completedTrips || 0)} trend={trends.completedTrips} accent="bg-success text-success" />
        <KpiCard icon={AlertTriangle} label={t('an_exceptions')} value={fmtNumber(ops.exceptionsCount || 0)} trend={trends.exceptionsCount} invert accent="bg-error text-error" />
        <Link to="/trips" className="card !p-4 flex items-center justify-between hover:border-primary/50 group bg-gradient-to-br from-surface to-surface-hover backdrop-blur-md">
          <div>
            <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-2">{t('an_view_trips')}</span>
            <span className="text-sm font-black text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              <RouteIcon className="w-4 h-4" /> {t('an_operations')}
            </span>
          </div>
          <ArrowUpRight className="w-5 h-5 text-text-secondary group-hover:text-primary" />
        </Link>
      </div>

      {/* Row 2: Status Distributions (Full Width) */}
      <div className="card !p-5 relative overflow-hidden backdrop-blur-md bg-surface/80 border border-border/50 shadow-xl mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-bold text-text mb-5 flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" /> {t('an_order_status_dist')}
            </h3>
            {distO.length ? (
              <div className="space-y-3">
                {distO.slice(0, 8).map((d: any) => {
                  const rawVal = String(d.status || d.name || '');
                  const statusKey = rawVal.toLowerCase().replace(/[\s-]+/g, '_');
                  return (
                    <div key={d.status || d.name} className="flex items-center gap-3">
                      <span className="w-32 text-xs font-bold text-text capitalize truncate">{t(`status_${statusKey}`, rawVal.replace(/_/g, ' '))}</span>
                      <div className="flex-1 h-2.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${((d.count || 0) / maxDist) * 100}%`, background: 'linear-gradient(90deg,#6366F1,#3B82F6)' }} />
                      </div>
                      <span className="text-xs font-medium text-text-secondary w-10 text-right">{fmtNumber(d.count || 0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState icon={Package} title={t('an_no_data')} message={t('an_no_data_msg')} />}
          </div>
          
          <div>
            <h3 className="text-sm font-bold text-text mb-5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> {t('an_trip_status_dist')}
            </h3>
            {distT.length ? (
              <div className="space-y-3">
                {distT.slice(0, 8).map((d: any, i: number) => {
                  const rawVal = String(d.status || d.name || '');
                  const statusKey = rawVal.toLowerCase().replace(/[\s-]+/g, '_');
                  return (
                    <div key={d.status || d.name} className="flex items-center gap-3">
                      <span className="w-32 text-xs font-bold text-text capitalize truncate">{t(`status_${statusKey}`, rawVal.replace(/_/g, ' '))}</span>
                      <div className="flex-1 h-2.5 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${((d.count || 0) / maxDist) * 100}%`, background: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][i % 5] }} />
                      </div>
                      <span className="text-xs font-medium text-text-secondary w-10 text-right">{fmtNumber(d.count || 0)}</span>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyState icon={Truck} title={t('an_no_data')} message={t('an_no_data_msg')} />}
          </div>
        </div>
      </div>

      {/* Row 3: Service Quality & Fleet Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <div className="lg:col-span-2 card !p-5 relative overflow-hidden flex flex-col backdrop-blur-md bg-surface/80 border border-border/50 shadow-xl">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success to-emerald-400" />
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-success" /> {t('an_service_quality')}
          </h3>
          <div className="flex-1 grid grid-cols-4 gap-2 place-items-center">
            <ProgressRing value={svc.otif?.rate ?? 0} label="OTIF" caption={`${svc.otif?.good || 0}/${svc.otif?.total || 0}`} />
            <ProgressRing value={svc.otd?.rate ?? 0} label="OTD" caption={`${svc.otd?.good || 0}/${svc.otd?.total || 0}`} />
            <ProgressRing value={svc.otp?.rate ?? 0} label="OTP" caption={`${svc.otp?.good || 0}/${svc.otp?.total || 0}`} />
            <ProgressRing value={svc.podCompletionPct ?? 0} label="POD" caption={fmtPercent(svc.podCompletionPct ?? 0)} />
          </div>
          <div className="mt-4 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between"><span className="text-text-secondary">{t('an_late_deliveries')}</span><b>{fmtNumber(svc.lateDeliveries || 0)}</b></div>
            <div className="flex justify-between"><span className="text-text-secondary">{t('an_avg_delay')}</span><b>{fmtNumber(svc.avgDelayMinutes || 0)} min</b></div>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <KpiCard icon={Gauge} label={t('an_fleet_util')} value={fmtPercent(fleet.utilizationPct ?? 0)} trend={trends.utilizationPct} accent="bg-indigo-500 text-indigo-500" />
          <KpiCard icon={AlertTriangle} label={t('an_deadhead')} value={fmtPercent(fleet.deadheadPct ?? 0)} trend={trends.deadheadPct} invert accent="bg-error text-error" />
        </div>
      </div>

      {/* Row 4: Rides Per Country */}
      <div className="grid grid-cols-1 gap-6">
        <div className="card !p-5 relative overflow-hidden backdrop-blur-md bg-surface/80 border border-border/50 shadow-xl">
           <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" /> {t('an_rides_per_country', 'Rides Per Country')}
          </h3>
          <div className="h-[300px]">
            {countries.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" strokeOpacity={0.2} />
                  <XAxis dataKey="country" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: 13 }} />
                  <Bar dataKey="count" name={t('an_rides', 'Rides')} radius={[4, 4, 0, 0]}>
                    {countries.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={Map} title={t('an_no_data')} message={t('an_no_data_msg')} />}
          </div>
        </div>
      </div>
    </div>
  );
}