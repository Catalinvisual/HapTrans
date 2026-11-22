import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity, AlertTriangle, ArrowDownToLine, CircleDollarSign, Gauge, Leaf, Route,
  Truck, UserRound, Users, Flame, TrendingDown,
} from 'lucide-react';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import emissionsApi from '../../lib/emissionsApi';
import type { EmissionFiltersState, EmissionOverview } from '../../lib/emissionsApi';
import { countryName } from '../../lib/countries';
import {
  AXIS_TICK, EMISSION_AMBER, EMISSION_BLUE, EMISSION_GREY, EMISSION_NAVY, EMISSION_ORANGE,
  EmissionBadge, Panel, StateBlock, TOOLTIP_STYLE, formatEmission, formatNumber, formatPercent,
} from './EmissionBits';
import EmissionFilters, { type FilterOptions } from './EmissionFilters';

export default function OverviewTab({
  filters, onFiltersChange, options,
}: {
  filters: EmissionFiltersState;
  onFiltersChange: (next: EmissionFiltersState) => void;
  options: FilterOptions;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const [data, setData] = useState<EmissionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    emissionsApi.overview(filters)
      .then(setData)
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    emissionsApi.overview(filters, controller.signal)
      .then(setData)
      .catch((err) => {
        if (err?.code === 'ERR_CANCELED') return;
        setError(err?.response?.data?.message || t('emissions_error'));
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const k = data?.kpis;
  const empty = !loading && !error && !!data && data.kpis.trips === 0;

  const kpis = [
    { key: 'total', label: t('emissions_kpi_total'), value: formatEmission(k?.totalCo2eKg), icon: Leaf, color: 'text-primary' },
    { key: 'ttw', label: t('emissions_kpi_ttw'), value: formatEmission(k?.ttwKg), icon: Flame, color: 'text-primary' },
    { key: 'wtt', label: t('emissions_kpi_wtt'), value: formatEmission(k?.wttKg), icon: ArrowDownToLine, color: 'text-blue-500' },
    { key: 'wtw', label: t('emissions_kpi_wtw'), value: formatEmission(k?.wtwKg), icon: Activity, color: 'text-primary' },
    { key: 'per_km', label: t('emissions_kpi_per_km'), value: k?.gPerKm != null ? `${formatNumber(k.gPerKm, 1)} g` : '—', icon: Gauge, color: 'text-text' },
    { key: 'per_tkm', label: t('emissions_kpi_per_tonne_km'), value: k?.gPerTonneKm != null ? `${formatNumber(k.gPerTonneKm, 1)} g` : '—', icon: TrendingDown, color: 'text-text' },
    { key: 'trips', label: t('emissions_kpi_trips'), value: formatNumber(k?.trips), icon: Route, color: 'text-text' },
    { key: 'verified', label: t('emissions_kpi_verified'), value: formatNumber(k?.verifiedTrips), icon: Activity, color: 'text-emerald-600' },
    { key: 'estimated', label: t('emissions_kpi_estimated'), value: formatNumber(k?.estimatedTrips), icon: AlertTriangle, color: 'text-amber-600' },
    { key: 'missing', label: t('emissions_kpi_missing'), value: formatPercent(k?.missingDataPercent), icon: AlertTriangle, color: 'text-rose-600' },
    { key: 'fuel', label: t('emissions_kpi_fuel'), value: formatNumber(k?.energyQuantity, 1), icon: Flame, color: 'text-text' },
    { key: 'empty', label: t('emissions_kpi_empty_km'), value: `${formatNumber(k?.emptyKm)} km`, icon: Route, color: 'text-text' },
    { key: 'empty_pct', label: t('emissions_kpi_empty_percent'), value: formatPercent(k?.emptyRunningPercent), icon: TrendingDown, color: 'text-amber-600' },
    { key: 'own', label: t('emissions_kpi_own_fleet'), value: formatEmission(k?.ownFleetKg), icon: Truck, color: 'text-text' },
    { key: 'sub', label: t('emissions_kpi_subcontractor'), value: formatEmission(k?.subcontractorKg), icon: Users, color: 'text-text' },
    { key: 'finalized', label: t('emissions_kpi_finalized'), value: formatNumber(k?.finalizedTrips), icon: CircleDollarSign, color: 'text-emerald-600' },
  ];

  const monthly = (data?.series.monthly || []).map((m) => ({ ...m, label: m.month }));
  const countryRows = (data?.byCountry || []).slice(0, 12).map((c) => ({
    ...c,
    label: countryName(c.countryCode, lang as any) || c.countryCode,
  }));
  const truckRows = (data?.byTruck || []).slice(0, 10);
  const fuelRows = (data?.byFuelType || []).filter((f) => f.wtwKg > 0);
  const customerRows = (data?.byCustomer || []).slice(0, 8);

  return (
    <div className="space-y-3">
      <EmissionFilters value={filters} onChange={onFiltersChange} options={options} />

      <StateBlock loading={loading} error={error} onRetry={load} empty={empty}>
        {empty ? null : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-1.5">
              {kpis.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.key} className="bg-card border border-border rounded-lg px-2.5 py-2 shadow-sm">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary truncate">{item.label}</span>
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                    </div>
                    <div className={`text-[15px] font-black leading-tight mt-0.5 ${item.color}`}>{item.value}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <Panel title={t('emissions_chart_monthly')} icon={Activity} className="xl:col-span-2">
                {monthly.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-xs text-text-secondary">{t('emissions_empty')}</div>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthly} margin={{ top: 6, right: 8, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="emMonthly" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={EMISSION_ORANGE} stopOpacity={0.32} />
                            <stop offset="100%" stopColor={EMISSION_ORANGE} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgb(var(--color-border))" strokeOpacity={0.55} />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} dy={6} minTickGap={12} />
                        <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} width={44} tickFormatter={(v) => formatNumber(Number(v) / 1000, 0)} />
                        <Tooltip
                          contentStyle={TOOLTIP_STYLE}
                          formatter={(value: any, name: any) => [formatEmission(Number(value)), name === 'wtwKg' ? 'WTW' : name === 'ttwKg' ? 'TTW' : name]}
                        />
                        <Area type="monotone" dataKey="wtwKg" name="wtwKg" stroke={EMISSION_ORANGE} strokeWidth={2.5} fill="url(#emMonthly)" dot={false} />
                        <Area type="monotone" dataKey="ttwKg" name="ttwKg" stroke={EMISSION_NAVY} strokeWidth={1.8} fill="transparent" strokeDasharray="4 4" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <Panel title={t('emissions_chart_fuel')} icon={Flame}>
                {fuelRows.length === 0 ? (
                  <div className="h-[240px] flex items-center justify-center text-xs text-text-secondary">{t('emissions_empty')}</div>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={fuelRows} dataKey="wtwKg" nameKey="fuelType" innerRadius={48} outerRadius={78} paddingAngle={2}>
                          {fuelRows.map((row, index) => (
                            <Cell key={row.fuelType} fill={[EMISSION_ORANGE, EMISSION_NAVY, EMISSION_BLUE, EMISSION_AMBER, EMISSION_GREY][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any, name: any) => [formatEmission(Number(value)), String(name)]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <Panel title={t('emissions_chart_country')} icon={Route}>
                {countryRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>
                ) : (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={countryRows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="rgb(var(--color-border))" strokeOpacity={0.55} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => formatNumber(Number(v) / 1000, 0)} />
                        <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} width={90} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any) => [formatEmission(Number(value)), 'WTW']} />
                        <Bar dataKey="wtwKg" fill={EMISSION_ORANGE} radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>

              <Panel title={t('emissions_chart_truck')} icon={Truck}>
                {truckRows.length === 0 ? (
                  <div className="py-6 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>
                ) : (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={truckRows} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="rgb(var(--color-border))" strokeOpacity={0.55} />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={AXIS_TICK} tickFormatter={(v) => formatNumber(Number(v) / 1000, 0)} />
                        <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={AXIS_TICK} width={90} />
                        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: any) => [formatEmission(Number(value)), 'WTW']} />
                        <Bar dataKey="wtwKg" fill={EMISSION_NAVY} radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
              <Panel title={t('emissions_chart_driver')} icon={UserRound}>
                {data?.byDriver?.length ? (
                  <ul className="divide-y divide-border">
                    {data.byDriver.slice(0, 8).map((row) => (
                      <li key={row.id || row.label} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="truncate text-text">{row.label}</span>
                        <span className="font-bold text-primary whitespace-nowrap ml-2">{formatEmission(row.wtwKg)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="py-4 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>}
              </Panel>

              <Panel title={t('emissions_chart_customer')} icon={Users}>
                {customerRows.length ? (
                  <ul className="divide-y divide-border">
                    {customerRows.map((row) => (
                      <li key={row.id || row.label} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="truncate text-text">{row.label}</span>
                        <span className="font-bold text-primary whitespace-nowrap ml-2">{formatEmission(row.wtwKg)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="py-4 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>}
              </Panel>

              <Panel title={t('emissions_chart_lifecycle')} icon={Activity}>
                {data?.byLifecycle?.length ? (
                  <ul className="space-y-1.5">
                    {data.byLifecycle.map((row) => (
                      <li key={row.lifecycle} className="flex items-center justify-between gap-2 text-xs">
                        <EmissionBadge status={row.lifecycle} />
                        <span className="text-text-secondary">{t('emissions_trips', 'Trips')}: <b className="text-text">{row.count}</b></span>
                        <span className="font-bold text-text whitespace-nowrap">{formatEmission(row.wtwKg)}</span>
                      </li>
                    ))}
                  </ul>
                ) : <div className="py-4 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>}
              </Panel>
            </div>

            <Panel title={t('emissions_chart_loaded_empty')} icon={Route}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase font-bold text-text-secondary">{t('emissions_distance_km')} · loaded</div>
                  <div className="text-lg font-black text-primary">{formatNumber(data?.loadedVsEmpty.loadedKm)} km</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-text-secondary">{t('emissions_kpi_empty_km')}</div>
                  <div className="text-lg font-black text-amber-600">{formatNumber(data?.loadedVsEmpty.emptyKm)} km</div>
                </div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-surface overflow-hidden flex">
                {(() => {
                  const loaded = Number(data?.loadedVsEmpty.loadedKm || 0);
                  const empty = Number(data?.loadedVsEmpty.emptyKm || 0);
                  const total = loaded + empty || 1;
                  return (
                    <>
                      <div style={{ width: `${(loaded / total) * 100}%` }} className="bg-primary" />
                      <div style={{ width: `${(empty / total) * 100}%` }} className="bg-amber-500" />
                    </>
                  );
                })()}
              </div>
            </Panel>
          </>
        )}
      </StateBlock>
    </div>
  );
}
