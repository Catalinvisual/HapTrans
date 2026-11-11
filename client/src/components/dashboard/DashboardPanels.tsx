import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, CalendarDays, Check, CheckCircle2, Clock, FileText,
  Map, MapPin, Package, Route as RouteIcon, ShieldCheck, Truck,
} from 'lucide-react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtNumber, fmtPercent } from '../../lib/format';
import PanelCard from './PanelCard';
import { TripRow } from './TodayBoard';
import type { OverviewData, OverviewAlert, OverviewOrder } from './types';
import { formatDayShort, formatShortDate, humanizeStatus, routeText } from './types';

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgb(var(--color-border))',
  background: 'rgb(var(--color-card))',
  color: 'rgb(var(--color-text))',
  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)',
  fontSize: 12,
  padding: '8px 12px',
};

const AXIS_TICK = { fontSize: 10, fill: 'rgb(var(--color-text-secondary))' };

const ALERT_META: Record<OverviewAlert['type'], { icon: any; color: string }> = {
  delay: { icon: Clock, color: '#EF4444' },
  unassigned: { icon: Package, color: '#F59E0B' },
  incident: { icon: AlertTriangle, color: '#DC2626' },
  document: { icon: FileText, color: '#0EA5E9' },
};

export function AlertsPanel({
  alerts, resolvedIds = new Set(), onResolve,
}: {
  alerts: OverviewAlert[];
  resolvedIds?: Set<string>;
  onResolve?: (id: string) => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const visible = alerts.filter((alert) => !resolvedIds.has(alert.id));

  return (
    <PanelCard
      title={t('dbd_alerts_title')}
      subtitle={t('dbd_alerts_sub')}
      icon={AlertTriangle}
      className="h-full"
      bodyClassName="!p-3"
      action={
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
          visible.length > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'
        }`}>
          {visible.length}
        </span>
      }
    >
      {visible.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <ShieldCheck className="h-7 w-7" />
          </span>
          <p className="max-w-[220px] text-xs font-semibold text-text-secondary">{t('dbd_no_alerts')}</p>
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: 430 }}>
          {visible.map((alert) => {
            const meta = ALERT_META[alert.type] || ALERT_META.delay;
            const Icon = meta.icon;
            return (
              <div
                key={alert.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(alert.link)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate(alert.link);
                }}
                className="group flex w-full cursor-pointer items-start gap-2.5 rounded-xl border border-transparent p-2.5 text-left transition-all hover:border-border/70 hover:bg-surface/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ background: `${meta.color}18`, color: meta.color }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: meta.color }}>
                    {t(
                      alert.type === 'delay' ? 'dbd_alert_delay'
                        : alert.type === 'unassigned' ? 'dbd_alert_unassigned'
                          : alert.type === 'incident' ? 'dbd_alert_incident'
                            : 'dbd_alert_document',
                    )}
                  </p>
                  <p className="truncate text-xs font-bold text-text">{alert.title}</p>
                  {alert.subtitle && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-text-secondary">
                      <MapPin className="h-2.5 w-2.5 shrink-0" /> {alert.subtitle}
                    </p>
                  )}
                </div>
                {alert.value != null && (
                  <span className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-black text-text-secondary">
                    {alert.type === 'document'
                      ? t('dbd_days_left', { count: Math.max(0, alert.value) })
                      : t('dbd_late_min', { min: alert.value })}
                  </span>
                )}
                {onResolve && (
                  <button
                    type="button"
                    title={t('dbd_resolve')}
                    onClick={(event) => { event.stopPropagation(); onResolve(alert.id); }}
                    className="mt-0.5 rounded-md p-1 text-text-light transition-colors hover:bg-success/10 hover:text-success"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                )}
                <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-text-light opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

export function UpcomingPanel({ upcoming, lang }: { upcoming: OverviewData['upcoming']; lang: string }) {
  const { t } = useTranslation();
  const chartData = upcoming.days.map((day) => ({
    ...day,
    label: formatDayShort(day.date, lang),
    weekday: new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { weekday: 'short' }).format(new Date(`${day.date}T00:00:00`)),
  }));
  const total = upcoming.days.reduce((sum, day) => sum + day.count, 0);

  return (
    <PanelCard
      title={t('dbd_upcoming_title')}
      subtitle={t('dbd_upcoming_sub')}
      icon={CalendarDays}
      action={
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">
          {t('dbd_departures_count', { count: total })}
        </span>
      }
    >
      <div className="h-[110px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis dataKey="weekday" axisLine={false} tickLine={false} tick={AXIS_TICK} />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} width={30} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--color-surface))', fillOpacity: 0.6 }} />
            <Bar dataKey="count" name={t('dbd_departures')} radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell key={entry.date} fill={entry.count > 0 ? '#FF5A00' : 'rgb(var(--color-border))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2">
        {upcoming.trips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/80 bg-surface/30 p-4 text-center text-xs font-semibold text-text-secondary">
            {t('dbd_no_upcoming')}
          </div>
        ) : (
          upcoming.trips.slice(0, 4).map((trip) => <TripRow key={trip.id} trip={trip} kind="upcoming" lang={lang} />)
        )}
      </div>
    </PanelCard>
  );
}

export function RoutesPanel({ routes }: { routes: OverviewData['topRoutes'] }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...routes.map((route) => route.trips));

  return (
    <PanelCard title={t('dbd_routes_title')} subtitle={t('dbd_routes_sub')} icon={RouteIcon} className="h-full">
      {routes.length === 0 ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <MapPin className="h-5 w-5 text-text-light" />
          </span>
          <p className="text-xs font-semibold text-text-secondary">{t('dbd_no_data_msg')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route, index) => (
            <div key={`${route.from}-${route.to}-${index}`} className="group">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-black ${
                    index === 0 ? 'bg-primary text-white' : 'bg-surface text-text-secondary'
                  }`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text">{route.from || '—'}</p>
                    <p className="truncate text-[10px] font-semibold text-text-secondary">→ {route.to || '—'}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-black text-text tabular-nums">{route.trips}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-text-light">
                    {t('dbd_trips')}
                  </p>
                </div>
              </div>
              <div className="ml-7 mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.max(6, (route.trips / max) * 100)}%` }}
                  />
                </div>
                <span className="w-12 text-right text-[9px] font-bold text-text-light tabular-nums">
                  {fmtNumber(route.km)} km
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

export function FleetDriversPanel({
  fleet, drivers, utilization,
}: {
  fleet: OverviewData['fleet'];
  drivers: OverviewData['drivers'];
  utilization: number;
}) {
  const { t } = useTranslation();
  const fleetItems = [
    { key: 'inTrip', label: t('dbd_fleet_in_trip'), count: fleet.inTrip, color: '#FF5A00' },
    { key: 'available', label: t('dbd_fleet_available'), count: fleet.available, color: '#10B981' },
    { key: 'maintenance', label: t('dbd_fleet_maintenance'), count: fleet.maintenance, color: '#F59E0B' },
    { key: 'inactive', label: t('dbd_fleet_inactive'), count: fleet.inactive, color: '#94A3B8' },
  ].filter((item) => item.count > 0);
  const driverRows = [
    { label: t('dbd_driver_in_trip'), count: drivers.inTrip, color: '#FF5A00' },
    { label: t('dbd_driver_available'), count: drivers.available, color: '#10B981' },
    { label: t('dbd_driver_off'), count: drivers.off, color: '#94A3B8' },
    { label: t('dbd_driver_sick'), count: drivers.sick, color: '#EF4444' },
    { label: t('dbd_driver_vacation'), count: drivers.vacation, color: '#8B5CF6' },
  ];
  const driverTotal = Math.max(1, drivers.total);

  return (
    <PanelCard title={t('dbd_fleet_title')} subtitle={t('dbd_fleet_sub')} icon={Truck} className="h-full">
      {fleet.total === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
            <Truck className="h-5 w-5 text-text-light" />
          </span>
          <p className="text-xs font-semibold text-text-secondary">{t('dbd_no_data')}</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-[160px] w-full max-w-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={fleetItems}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={2.5}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {fleetItems.map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[22px] font-black leading-none text-text tabular-nums">{fmtPercent(utilization, 0)}</span>
              <span className="mt-0.5 max-w-[90px] text-center text-[9px] font-bold uppercase leading-tight tracking-wider text-text-secondary">
                {t('dbd_utilization')}
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {fleetItems.map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="min-w-0 flex-1 truncate font-semibold text-text-secondary">{item.label}</span>
                <span className="font-black text-text tabular-nums">{fmtNumber(item.count)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.12em] text-text-secondary">{t('dbd_drivers_title')}</h3>
          <span className="text-[10px] font-bold text-text-secondary">
            {fmtNumber(drivers.total)} {t('dbd_total').toLowerCase()}
          </span>
        </div>
        <div className="space-y-2">
          {driverRows.map((row) => (
            <div key={row.label} className="flex items-center gap-2">
              <span className="w-[86px] shrink-0 truncate text-[10px] font-semibold text-text-secondary">{row.label}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (row.count / driverTotal) * 100)}%`, background: row.color }}
                />
              </div>
              <span className="w-6 text-right text-[10px] font-black text-text tabular-nums">{fmtNumber(row.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </PanelCard>
  );
}

export function UnassignedOrdersPanel({ orders, lang }: { orders: OverviewOrder[]; lang: string }) {
  const { t } = useTranslation();
  const priorityStyle: Record<string, string> = {
    critical: 'border-error/25 bg-error/10 text-error',
    high: 'border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    normal: 'border-border/70 bg-surface text-text-secondary',
  };
  const priorityLabel = (priority: string) =>
    priority === 'critical' ? t('dbd_priority_critical') : priority === 'high' ? t('dbd_priority_high') : t('dbd_priority_normal');

  return (
    <PanelCard
      title={t('dbd_unassigned_title')}
      subtitle={t('dbd_alerts_sub')}
      icon={Package}
      action={
        <Link to="/orders" className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface px-2.5 py-1 text-[10px] font-bold text-text-secondary transition-colors hover:border-primary/40 hover:text-primary">
          {t('dbd_view_all')} <ArrowUpRight className="h-3 w-3" />
        </Link>
      }
    >
      {orders.length === 0 ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/30 p-6 text-xs font-semibold text-text-secondary">
          <CheckCircle2 className="h-4 w-4 text-success" /> {t('dbd_no_unassigned')}
        </div>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex items-start gap-3 rounded-xl border border-border/70 bg-surface/40 p-3 transition-colors hover:border-primary/30 hover:bg-card"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/orders?orderId=${order.id}`} className="block truncate text-xs font-black text-text hover:text-primary">
                    {order.orderNumber || order.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase ${priorityStyle[order.priority] || priorityStyle.normal}`}>
                    {priorityLabel(order.priority)}
                  </span>
                </div>
                <p className="truncate text-[11px] font-semibold text-text-secondary">{order.clientName || '—'}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-[10px] text-text-light">
                  <MapPin className="h-2.5 w-2.5 shrink-0" />
                  {routeText(order.originCity, order.originCountry, order.destCity, order.destCountry)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-text-light">{formatShortDate(order.createdAt || '', lang)}</p>
                <p className="text-[10px] font-bold text-text-secondary">
                  {t(`status_${order.status}`, humanizeStatus(order.status))}
                </p>
                <Link
                  to={`/planning?orderId=${order.id}`}
                  className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary transition-colors hover:bg-primary/20"
                >
                  {t('dbd_assign')} <ArrowUpRight className="h-2.5 w-2.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelCard>
  );
}

export function QuickActions() {
  const { t } = useTranslation();
  const actions = [
    { to: '/planning', label: t('dbd_open_planning'), icon: CalendarDays, color: '#FF5A00' },
    { to: '/trips', label: t('dbd_open_trips'), icon: RouteIcon, color: '#0EA5E9' },
    { to: '/orders', label: t('dbd_open_orders'), icon: Package, color: '#8B5CF6' },
    { to: '/map', label: t('dbd_open_map'), icon: Map, color: '#10B981' },
    { to: '/documents', label: t('dbd_open_documents'), icon: FileText, color: '#F59E0B' },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-3 shadow-card">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <span className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">
          {t('dbd_quick_title')}
        </span>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {actions.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="group flex items-center gap-2 rounded-xl border border-border/60 bg-surface/40 px-3 py-2 text-[11px] font-bold text-text transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:text-primary"
            >
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${action.color}18`, color: action.color }}
              >
                <action.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{action.label}</span>
              <ArrowUpRight className="ml-auto h-3 w-3 shrink-0 text-text-light opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
