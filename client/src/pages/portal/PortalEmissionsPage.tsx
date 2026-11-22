import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Leaf, TriangleAlert } from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import portalApi from '../../lib/portalApi';
import { countryName } from '../../lib/countries';
import {
  AXIS_TICK, EMISSION_NAVY, EMISSION_ORANGE, TOOLTIP_STYLE,
  formatEmission, formatNumber, formatPercent,
} from '../../components/emissions/EmissionBits';
import { presetRange } from '../../components/emissions/EmissionFilters';

export default function PortalEmissionsPage() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const initial = presetRange('this_year');
  const [from, setFrom] = useState(initial.from || '');
  const [to, setTo] = useState(initial.to || '');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    portalApi.get('/portal/emissions/summary', { params: { from: from || undefined, to: to || undefined } })
      .then((response) => setData(response.data))
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [from, to]);

  const monthly = useMemo(() => (data?.monthly || []).map((row: any) => ({ ...row, label: row.month })), [data]);
  const countryRows = useMemo(
    () => (data?.byCountry || []).map((row: any) => ({ ...row, label: countryName(row.countryCode, lang as any) || row.countryCode })),
    [data, lang],
  );

  const download = async () => {
    const response = await portalApi.get('/portal/emissions/export', {
      params: { from: from || undefined, to: to || undefined },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hapcargo-emissions.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const totals = data?.totals;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold inline-flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            {t('emissions_portal_title')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl">{t('emissions_portal_subtitle')}</p>
        </div>
        <button className="btn-secondary px-3 py-2 text-sm inline-flex items-center gap-1.5" onClick={download} disabled={!totals?.trips}>
          <Download className="w-4 h-4" />{t('emissions_portal_download')}
        </button>
      </div>

      <div className="card bg-card border border-border rounded-xl p-3 flex flex-wrap items-end gap-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {t('emissions_from')}
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block mt-1 px-2 py-1.5 bg-card border border-border rounded-lg text-xs font-normal" />
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">
          {t('emissions_to')}
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 px-2 py-1.5 bg-card border border-border rounded-lg text-xs font-normal" />
        </label>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-text-secondary">{t('loading')}</div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-rose-600">{error}</div>
      ) : !data || data.empty || !totals?.trips ? (
        <div className="card bg-card border border-border rounded-xl p-10 text-center">
          <Leaf className="w-10 h-10 mx-auto text-text-secondary opacity-40" />
          <p className="mt-3 text-sm text-text-secondary">{t('emissions_portal_empty')}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <Kpi label={t('emissions_kpi_total')} value={formatEmission(totals.wtwKg)} strong />
            <Kpi label={t('emissions_portal_monthly')} value={formatEmission(monthly[monthly.length - 1]?.wtwKg)} />
            <Kpi label={t('emissions_portal_per_trip')} value={formatEmission(totals.trips ? totals.wtwKg / totals.trips : null)} />
            <Kpi label={t('emissions_unit_g_tkm')} value={totals.gPerTonneKm != null ? formatNumber(totals.gPerTonneKm, 1) : '—'} />
            <Kpi label="TTW" value={formatEmission(totals.ttwKg)} />
            <Kpi label="WTT" value={formatEmission(totals.wttKg)} />
            <Kpi label={t('emissions_portal_distance')} value={`${formatNumber(totals.distanceKm)} km`} />
            <Kpi label={t('emissions_portal_trips')} value={formatNumber(totals.trips)} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <section className="card bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-bold mb-2">{t('emissions_portal_monthly')}</h2>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthly} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portalMonthly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={EMISSION_ORANGE} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={EMISSION_ORANGE} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgb(var(--color-border))" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} minTickGap={16} />
                    <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={46} tickFormatter={(v) => formatNumber(Number(v) / 1000, 0)} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any) => [formatEmission(Number(value)), 'WTW']} />
                    <Area type="monotone" dataKey="wtwKg" stroke={EMISSION_ORANGE} strokeWidth={2.5} fill="url(#portalMonthly)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="card bg-card border border-border rounded-xl p-4">
              <h2 className="text-sm font-bold mb-2">{t('emissions_portal_countries')}</h2>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryRows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="rgb(var(--color-border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => formatNumber(Number(v) / 1000, 0)} />
                    <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} width={90} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any) => [formatEmission(Number(value)), 'WTW']} />
                    <Bar dataKey="wtwKg" fill={EMISSION_NAVY} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="card bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold">{t('emissions_portal_trip_rows')}</h2>
              <span className="text-[10px] text-text-secondary">
                {t('emissions_portal_quality')}: {formatPercent(totals.trips ? (totals.actualQualityTrips / totals.trips) * 100 : 0)} actual
              </span>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-surface">
                  <tr className="text-[9px] uppercase tracking-wider text-text-secondary">
                    <th className="text-left px-3 py-2">{t('emissions_trip')}</th>
                    <th className="text-left px-3 py-2">{t('emissions_date')}</th>
                    <th className="text-right px-3 py-2">{t('emissions_portal_share')}</th>
                    <th className="text-right px-3 py-2">{t('emissions_distance_km')}</th>
                    <th className="text-right px-3 py-2">TTW</th>
                    <th className="text-right px-3 py-2">WTW</th>
                    <th className="text-left px-3 py-2">{t('emissions_portal_quality')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.trips || []).map((row: any) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-3 py-1.5 font-semibold">{row.tripNumber || '—'}</td>
                      <td className="px-3 py-1.5">{row.executionDate || '—'}</td>
                      <td className="px-3 py-1.5 text-right">{formatPercent(row.sharePercent, 2)}</td>
                      <td className="px-3 py-1.5 text-right">{formatNumber(row.distanceKm)}</td>
                      <td className="px-3 py-1.5 text-right">{formatEmission(row.ttwKg)}</td>
                      <td className="px-3 py-1.5 text-right font-bold text-primary">{formatEmission(row.wtwKg)}</td>
                      <td className="px-3 py-1.5">{row.dataQuality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="rounded-xl border border-border bg-surface px-4 py-3 text-[11px] text-text-secondary space-y-1">
            <div className="font-bold text-text inline-flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-primary" />{t('emissions_portal_methodology')}</div>
            <p>{data.methodology}</p>
            <p className="inline-flex items-start gap-1.5"><TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />{data.dataQualityNote}</p>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={`${strong ? 'text-lg text-primary' : 'text-sm text-text'} font-black`}>{value}</div>
    </div>
  );
}
