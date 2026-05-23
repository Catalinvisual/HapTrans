import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, Truck, AlertTriangle, FileWarning, Clock } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../lib/api';
import { formatDate } from '../lib/dateUtils';
import DieselWidget from '../components/DieselWidget';

interface DashboardData {
  stats: { profit: number; revenue: number; totalCost: number; costPerKm: number; active: number; activeTrucks: number; tripsCount: number };
  monthlyProfits: Array<{ month: string; profit: number; totalRevenue: number; totalCost: number }>;
  overdueInvoices: any[];
  expiringDocs: any[];
  profitByRoute?: Array<{ route: string; profit: number }>;
  topClients?: Array<{ name: string; profit: number }>;
}

function StatCard({ title, value, unit, trend, color }: any) {
  const isPositive = trend >= 0;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{title}</span>
        {trend !== undefined && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-success' : 'text-error'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <div className="mt-2">
        <span className={`text-2xl font-bold ${color || 'text-text'}`}>{value}</span>
        {unit && <span className="text-sm text-text-secondary ml-1">{unit}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then((r) => { setData(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const getTranslatedMonth = (monthStr: string) => {
    const m = monthStr.toLowerCase().replace('.', '');
    const map: Record<string, string> = {
      'ian': 'jan', 'feb': 'feb', 'mar': 'mar', 'apr': 'apr', 'mai': 'may', 'iun': 'jun',
      'iul': 'jul', 'aug': 'aug', 'sep': 'sep', 'oct': 'oct', 'noi': 'nov', 'dec': 'dec'
    };
    const key = map[m] || m;
    return t(key);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-secondary">{t('loading')}</span>
      </div>
    </div>
  );

  const s = data?.stats;
  const profitColor = (s?.profit ?? 0) >= 0 ? 'text-success' : 'text-error';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('dashboard')}</h1>
        <p className="text-text-secondary text-sm mt-0.5">{t('operationalSummaryCurrentMonth')}</p>
      </div>

      {/* Diesel Prices Widget */}
      <DieselWidget avgConsumptionL100={32} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t('profit')} value={`€${(s?.profit ?? 0).toLocaleString(i18n.language)}`} color={profitColor} trend={s?.profit} />
        <StatCard title={t('revenue')} value={`€${(s?.totalRevenue ?? 0).toLocaleString(i18n.language)}`} color="text-success" />
        <StatCard title={t('activeTrips')} value={s?.active ?? 0} color="text-primary" />
        <StatCard title={t('activeTrucks')} value={s?.activeTrucks ?? 0} color="text-text" />
        <StatCard title={t('costPerKm')} value={`€${(s?.costPerKm ?? 0).toFixed(2)}`} unit="/km" />
        <StatCard title={t('totalTrips')} value={s?.tripsCount ?? 0} color="text-text" />
        <StatCard title={t('costs')} value={`€${(s?.totalCost ?? 0).toLocaleString(i18n.language)}`} color="text-error" />
        <div className="stat-card flex flex-col justify-between cursor-pointer hover:bg-warning/5 transition-colors" onClick={() => document.getElementById('expiring-docs-section')?.scrollIntoView({ behavior: 'smooth' })}>
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{t('expiringDocuments')}</span>
          <div className="flex items-center gap-2 mt-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-2xl font-bold text-warning">{data?.expiringDocs?.length ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-4">{t('profitByMonth')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.monthlyProfits ?? []}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF7A1A" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#FF7A1A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={getTranslatedMonth} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v: any) => [`€${Number(v || 0).toLocaleString(i18n.language)}`, '']} />
              <Area type="monotone" dataKey="profit" stroke="#FF7A1A" strokeWidth={2} fill="url(#profitGrad)" name={t('profit')} />
              <Area type="monotone" dataKey="totalRevenue" stroke="#16A34A" strokeWidth={2} fill="none" name={t('revenue')} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-4">{t('revenueVsCosts')}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.monthlyProfits ?? []} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={getTranslatedMonth} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
              <Tooltip formatter={(v: any) => [`€${Number(v || 0).toLocaleString(i18n.language)}`, '']} />
              <Legend />
              <Bar dataKey="totalRevenue" fill="#16A34A" name={t('revenue')} radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalCost" fill="#DC2626" name={t('costs')} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-4">Top Rute Profitabile</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.profitByRoute ?? []} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="rgba(0,0,0,0.05)" />
              <XAxis type="number" hide />
              <YAxis dataKey="route" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} formatter={(value: number) => `€${value.toLocaleString(i18n.language)}`} />
              <Bar dataKey="profit" fill="#10B981" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-4">Top Clienți (Profit)</h3>
          <div className="space-y-4 mt-2">
            {(data?.topClients ?? []).map((client, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <span className="text-sm font-medium text-text">{client.name}</span>
                </div>
                <span className="text-sm font-bold text-success">€{client.profit.toLocaleString(i18n.language)}</span>
              </div>
            ))}
            {(data?.topClients?.length ?? 0) === 0 && (
              <div className="text-sm text-text-secondary text-center mt-8">Nu există date suficiente</div>
            )}
          </div>
        </div>

        {(data?.expiringDocs?.length ?? 0) > 0 && (
          <div id="expiring-docs-section" className="card border-l-4 border-warning">
            <div className="flex items-center gap-2 mb-3">
              <FileWarning className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-sm text-text">{t('expiringDocuments')} ({data?.expiringDocs.length})</h3>
            </div>
            <div className="space-y-2">
              {data?.expiringDocs.slice(0, 4).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-text font-medium">{d.title}</span>
                  <span className="badge-warning">{formatDate(d.expiryDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(data?.overdueInvoices?.length ?? 0) > 0 && (
          <div className="card border-l-4 border-error">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-error" />
              <h3 className="font-semibold text-sm text-text">{t('overdueInvoices')} ({data?.overdueInvoices.length})</h3>
            </div>
            <div className="space-y-2">
              {data?.overdueInvoices.slice(0, 4).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-text font-medium">{inv.invoiceNumber} — {inv.client?.name}</span>
                  <span className="badge-error">€{Number(inv.amount).toLocaleString(i18n.language)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(data?.expiringDocs?.length ?? 0) === 0 && (data?.overdueInvoices?.length ?? 0) === 0 && (
          <div className="card border-l-4 border-success lg:col-span-2">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">{t('allClearNoAlerts')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
