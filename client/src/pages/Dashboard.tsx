import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts';
import {
  Truck, Route as RouteIcon, AlertTriangle, Clock, MapPin, Activity, TrendingUp, TrendingDown, Target, LoaderCircle
} from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type Granularity = 'day' | 'week' | 'month';

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

function KpiCard({ icon: Icon, label, value, trend, invert, accent }: any) {
  return (
    <div className="card !p-4 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${accent} opacity-10 group-hover:scale-150 transition-transform duration-500`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${accent} bg-opacity-15 backdrop-blur-sm`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-black text-text leading-tight">{value}</span>
        <TrendBadge value={trend} invert={invert} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);

  const [rangeType, setRangeType] = useState('this_month');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [customFrom, setCustomFrom] = useState(iso(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customTo, setCustomTo] = useState(iso(new Date()));

  const computeRange = () => {
    const now = new Date();
    switch (rangeType) {
      case 'this_month': return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(now) };
      case 'last_month': return { from: iso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
      case 'last_30_days': return { from: iso(new Date(now.getTime() - 29 * 86400000)), to: iso(now) };
      case 'this_year': return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(now) };
      default: return { from: customFrom, to: customTo };
    }
  };

  const load = (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const r = computeRange();
    const params = new URLSearchParams({ from: r.from, to: r.to, granularity });

    api.get(`/dashboard/analytics?${params.toString()}`)
      .then(res => setAnalytics(res.data))
      .catch(() => null)
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => { load(); }, [rangeType, customFrom, customTo, granularity]);

  useEffect(() => {
    const id = setInterval(() => load(true), 60000);
    return () => clearInterval(id);
  }, [rangeType, customFrom, customTo, granularity]);

  if (loading && !analytics) return (
    <div className="flex items-center justify-center h-screen -mt-20">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
        <span className="text-sm font-medium text-text-secondary animate-pulse">{t('loading')}</span>
      </div>
    </div>
  );

  const kpis = analytics?.kpis || {};
  const trends = analytics?.trends || {};
  const series = analytics?.series || [];

  const otifTrips = kpis.otifTrips?.rate || 0;
  const otifOrders = kpis.otifOrders?.rate || 0;

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-600">
            {t('dash_ops_board')}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1">
            {new Date().toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            <span className={`inline-block w-2 h-2 rounded-full ml-3 shadow-sm ${refreshing ? 'bg-primary animate-pulse' : 'bg-success'}`} />
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-surface/50 backdrop-blur p-2 rounded-2xl border border-border/50 shadow-sm">
          <select value={rangeType} onChange={e => setRangeType(e.target.value)} className="input !py-1.5 !text-sm !rounded-xl bg-white/80">
            <option value="this_month">{t('fin_this_month')}</option>
            <option value="last_month">{t('fin_last_month')}</option>
            <option value="last_30_days">{t('fin_last30d')}</option>
            <option value="this_year">{t('fin_this_year')}</option>
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
            {['day', 'week', 'month'].map(g => (
              <button key={g} onClick={() => setGranularity(g as Granularity)} className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${granularity === g ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}>
                {g === 'day' ? 'Day' : g === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard icon={RouteIcon} label={t('activeTrips')} value={kpis.tripsTotal || 0} trend={trends.tripsTotal} accent="bg-primary text-primary" />
        <KpiCard icon={Target} label={t('orders_delivered')} value={kpis.ordersDelivered || 0} trend={trends.ordersDelivered} accent="bg-success text-success" />
        <KpiCard icon={Clock} label={t('dash_delayed')} value={kpis.ordersDelayed || 0} trend={trends.ordersDelayed} invert accent="bg-error text-error" />
        <KpiCard icon={MapPin} label={t('fin_total_km')} value={(kpis.km || 0).toLocaleString()} trend={trends.km} accent="bg-blue-500 text-blue-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card !p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-purple-500" />
          <h3 className="text-sm font-bold text-text mb-6">{t('fin_activity_overview')}</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}
                />
                <Area type="monotone" name="Trips" dataKey="trips" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorTrips)" />
                <Area type="monotone" name="Orders" dataKey="orders" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card !p-5 relative overflow-hidden flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-success to-emerald-400" />
          <h3 className="text-sm font-bold text-text mb-6">OTIF Performance</h3>
          <div className="flex-1 flex flex-col justify-around">
            <div className="flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Trips OTIF</p>
                <div className="text-3xl font-black text-text">{otifTrips.toFixed(1)}%</div>
                <div className="text-xs text-text-secondary mt-1">{kpis.otifTrips?.good || 0} / {kpis.otifTrips?.arrived || 0} on time</div>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={8} data={[{ name: 'OTIF', value: otifTrips, fill: otifTrips >= 90 ? '#10B981' : otifTrips >= 75 ? '#F59E0B' : '#EF4444' }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="w-full h-px bg-border my-2" />

            <div className="flex items-center justify-between group">
              <div>
                <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Orders OTIF</p>
                <div className="text-3xl font-black text-text">{otifOrders.toFixed(1)}%</div>
                <div className="text-xs text-text-secondary mt-1">{kpis.otifOrders?.good || 0} / {kpis.otifOrders?.arrived || 0} on time</div>
              </div>
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={8} data={[{ name: 'OTIF', value: otifOrders, fill: otifOrders >= 90 ? '#3B82F6' : otifOrders >= 75 ? '#F59E0B' : '#EF4444' }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar background={{ fill: '#F3F4F6' }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card !p-5">
          <h3 className="text-sm font-bold text-text mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Operations Pipeline
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-border pb-3">
              <div>
                <p className="text-xs font-bold text-warning uppercase">To Plan</p>
                <p className="text-2xl font-black">{analytics?.pipeline?.toPlan || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-primary uppercase">In Progress</p>
                <p className="text-2xl font-black">{analytics?.pipeline?.inProgress || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-success uppercase">Delivered</p>
                <p className="text-2xl font-black">{analytics?.pipeline?.delivered || 0}</p>
              </div>
            </div>
            
            {analytics?.byCountry?.combined?.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-text-secondary uppercase mb-3">Top Countries (Activity)</p>
                <div className="space-y-3">
                  {analytics.byCountry.combined.slice(0, 4).map((c: any) => (
                    <div key={c.country} className="flex items-center gap-3">
                      <span className="w-8 text-xs font-bold text-text">{c.country}</span>
                      <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                        <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(c.count / analytics.byCountry.combined[0].count) * 100}%` }} />
                      </div>
                      <span className="text-xs font-medium text-text-secondary w-8 text-right">{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card !p-0 overflow-hidden border border-error/20 shadow-[0_4px_20px_-5px_rgba(239,68,68,0.1)]">
          <div className="bg-error/5 p-4 border-b border-error/10 flex items-center justify-between">
            <h3 className="text-sm font-bold text-error flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Action Required: Delayed
            </h3>
            <span className="badge-error px-2 py-0.5 text-xs">{analytics?.delayedOrders?.length || 0} active delays</span>
          </div>
          <div className="p-0 max-h-[280px] overflow-y-auto custom-scrollbar">
            {analytics?.delayedOrders?.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-surface/50 text-[10px] uppercase font-bold text-text-secondary sticky top-0 backdrop-blur-md">
                  <tr>
                    <th className="px-4 py-2">Order</th>
                    <th className="px-4 py-2">Route</th>
                    <th className="px-4 py-2 text-right">Delay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {analytics.delayedOrders.map((o: any, idx: number) => (
                    <tr key={idx} className="hover:bg-error/5 transition-colors group cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="font-bold text-text">{o.orderNumber}</p>
                        <p className="text-[10px] text-text-secondary">{o.client}</p>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-text-secondary">
                        {o.route || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-block bg-error text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">
                          +{Math.round(o.lateMinutes / 60)}h
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-success flex flex-col items-center">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-success" />
                </div>
                <p className="font-bold text-sm">All operations are on schedule.</p>
                <p className="text-xs text-text-secondary">No delayed orders in this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
