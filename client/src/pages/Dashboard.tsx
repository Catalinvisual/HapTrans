import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Truck, Route as RouteIcon, UserCheck, AlertTriangle, FileWarning, Clock,
  Wrench, Coffee, PlaneTakeoff, MapPin, ArrowRight, CircleDashed, Fuel, CalendarClock,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/dateUtils';
import DieselWidget from '../components/DieselWidget';
import { useAuthStore } from '../store/authStore';

interface TripLite {
  id: string;
  tripNumber?: string;
  status: string;
  plannedDeparture?: string;
  actualDeparture?: string;
  plannedArrival?: string;
  actualArrival?: string;
  truck?: { id: string; plateNumber: string } | null;
  driver?: { id: string; user?: { name: string } } | null;
  stops?: Array<{ id: string; city?: string; country?: string; companyName?: string; address?: string; sequence?: number; type?: string }>;
}

const ACTIVE_TRIP_STATUSES = 'planned,dispatched,assigned,driver_accepted,started,loading,driving,partially_delivered';

function sameDay(a?: string | Date, b = new Date()) {
  if (!a) return false;
  const d = new Date(a);
  return d.getDate() === b.getDate() && d.getMonth() === b.getMonth() && d.getFullYear() === b.getFullYear();
}

function stopLabel(stops: TripLite['stops'], kind: 'first' | 'last') {
  const sorted = (stops || []).slice().sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1));
  if (!sorted.length) return null;
  const s = kind === 'first' ? sorted[0] : sorted[sorted.length - 1];
  return [s.city, s.country].filter(Boolean).join(', ') || s.companyName || s.address || null;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [summary, setSummary] = useState<any>(null);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [activeTrips, setActiveTrips] = useState<TripLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [today] = useState(() => new Date());

  useEffect(() => {
    Promise.all([
      api.get('/dashboard').catch(() => null),
      api.get('/trucks/availability').catch(() => []),
      api.get('/drivers').catch(() => []),
      api.get(`/trips?status=${ACTIVE_TRIP_STATUSES}`).catch(() => []),
    ]).then(([d, tr, dr, tp]) => {
      setSummary(d?.data ?? null);
      setTrucks(Array.isArray(tr.data) ? tr.data : []);
      setDrivers(Array.isArray(dr.data) ? dr.data : []);
      setActiveTrips(Array.isArray(tp.data) ? tp.data : []);
    }).finally(() => setLoading(false));
  }, []);

  const departuresToday = useMemo(() => activeTrips.filter(x => sameDay(x.plannedDeparture, today)), [activeTrips, today]);
  const arrivalsToday = useMemo(() => activeTrips.filter(x => sameDay(x.plannedArrival, today)), [activeTrips, today]);
  const unassigned = useMemo(() => activeTrips.filter(x => !x.truck?.id || !x.driver?.id), [activeTrips]);

  const trucksInTrip = trucks.filter(x => x.status === 'in_trip');
  const trucksAvailable = trucks.filter(x => x.status === 'active');
  const trucksMaintenance = trucks.filter(x => x.status === 'maintenance');

  const driversInTrip = drivers.filter(d => d.status === 'in_trip');
  const driversAvailable = drivers.filter(d => d.status === 'available');
  const driversOff = drivers.filter(d => ['off', 'sick', 'vacation'].includes(d.status));

  const delayed = useMemo(() => activeTrips.filter(x =>
    x.plannedArrival && !x.actualArrival && new Date(x.plannedArrival).getTime() < Date.now()
  ), [activeTrips]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-secondary">{t('loading')}</span>
      </div>
    </div>
  );

  const dateStr = today.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const opStats = [
    { icon: RouteIcon, label: t('activeTrips'), value: summary?.stats?.active ?? activeTrips.length, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Truck, label: t('dash_trucks_in_trip'), value: trucksInTrip.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: CircleDashed, label: t('dash_trucks_available'), value: trucksAvailable.length, color: 'text-success', bg: 'bg-success/10' },
    { icon: UserCheck, label: t('dash_drivers_duty'), value: driversInTrip.length + driversAvailable.length, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Wrench, label: t('dash_trucks_maintenance'), value: trucksMaintenance.length, color: 'text-warning', bg: 'bg-warning/10' },
    { icon: AlertTriangle, label: t('expiringDocuments'), value: summary?.expiringDocs?.length ?? 0, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-text">{t('dash_ops_board')}</h1>
          <p className="text-sm text-text-secondary capitalize">{dateStr}</p>
        </div>
      </div>

      {/* Operational KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {opStats.map(s => (
          <div key={s.label} className="stat-card !gap-1.5">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.bg}`}><s.icon className={`w-4 h-4 ${s.color}`} /></span>
            <span className="text-2xl font-bold text-text leading-none">{s.value}</span>
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide truncate">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Diesel */}
      <DieselWidget avgConsumptionL100={32} />

      {/* Today board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <PlaneTakeoff className="w-4 h-4 text-primary" />{t('dash_departures_today')}
            <span className="badge-primary ml-auto">{departuresToday.length}</span>
          </h3>
          <div className="space-y-2">
            {departuresToday.slice(0, 6).map(x => (
              <Link to={`/trips/${x.id}`} key={x.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface transition-colors group">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">
                    {stopLabel(x.stops, 'first')} <ArrowRight className="w-3 h-3 inline text-text-secondary" /> {stopLabel(x.stops, 'last')}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {x.tripNumber} · {x.truck?.plateNumber || t('dash_no_truck')} · {x.driver?.user?.name || t('dash_no_driver')}
                  </div>
                </div>
                <span className="text-xs font-bold text-primary shrink-0">{x.plannedDeparture ? new Date(x.plannedDeparture).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              </Link>
            ))}
            {departuresToday.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{t('dash_no_departures')}</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />{t('dash_arrivals_today')}
            <span className="badge-success ml-auto">{arrivalsToday.length}</span>
          </h3>
          <div className="space-y-2">
            {arrivalsToday.slice(0, 6).map(x => (
              <Link to={`/trips/${x.id}`} key={x.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface transition-colors">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-text truncate">
                    {stopLabel(x.stops, 'first')} <ArrowRight className="w-3 h-3 inline text-text-secondary" /> {stopLabel(x.stops, 'last')}
                  </div>
                  <div className="text-[11px] text-text-secondary truncate">
                    {x.tripNumber} · {x.truck?.plateNumber || t('dash_no_truck')} · {x.driver?.user?.name || t('dash_no_driver')}
                  </div>
                </div>
                <span className="text-xs font-bold text-success shrink-0">{x.plannedArrival ? new Date(x.plannedArrival).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
              </Link>
            ))}
            {arrivalsToday.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{t('dash_no_arrivals')}</div>}
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {(unassigned.length > 0 || delayed.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {unassigned.length > 0 && (
            <div className="card border-l-4 border-warning">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <CircleDashed className="w-4 h-4 text-warning" />{t('dash_unassigned_trips')}
                <span className="badge-warning ml-auto">{unassigned.length}</span>
              </h3>
              <div className="space-y-2">
                {unassigned.slice(0, 5).map(x => (
                  <Link to={`/trips/${x.id}`} key={x.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface/70 transition-colors">
                    <span className="font-medium text-text">{x.tripNumber}</span>
                    <span className="flex gap-1.5">
                      {!x.truck?.id && <span className="badge-warning text-[10px]">{t('dash_no_truck')}</span>}
                      {!x.driver?.id && <span className="badge-error text-[10px]">{t('dash_no_driver')}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {delayed.length > 0 && (
            <div className="card border-l-4 border-error">
              <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-error" />{t('dash_delayed')}
                <span className="badge-error ml-auto">{delayed.length}</span>
              </h3>
              <div className="space-y-2">
                {delayed.slice(0, 5).map(x => (
                  <Link to={`/trips/${x.id}`} key={x.id} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-surface/70 transition-colors">
                    <span className="font-medium text-text">{x.tripNumber}</span>
                    <span className="text-[11px] text-error font-semibold flex items-center gap-1">
                      <CalendarClock className="w-3 h-3" />
                      {x.plannedArrival ? formatDate(x.plannedArrival) : ''}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fleet + Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />{t('dash_fleet_status')}
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {trucksInTrip.map(x => {
              const trip = activeTrips.find(tp => tp.truck?.id === x.id);
              return (
                <div key={x.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-surface/50">
                  <span className="font-semibold text-text">{x.plateNumber}</span>
                  <span className="text-[11px] text-text-secondary truncate max-w-[55%] text-right">
                    {trip ? `${stopLabel(trip.stops, 'first') || ''} → ${stopLabel(trip.stops, 'last') || ''}` : `— ${trip?.driver?.user?.name ?? ''}`}
                  </span>
                  <span className="badge-primary text-[10px] shrink-0">{t('status_badge_in_trip')}</span>
                </div>
              );
            })}
            {trucksAvailable.map(x => (
              <div key={x.id} className="flex items-center justify-between text-sm p-2 rounded-lg">
                <span className="font-semibold text-text">{x.plateNumber}</span>
                <span className="badge-success text-[10px]">{t('status_badge_free')}</span>
              </div>
            ))}
            {trucksMaintenance.map(x => (
              <div key={x.id} className="flex items-center justify-between text-sm p-2 rounded-lg opacity-80">
                <span className="font-semibold text-text">{x.plateNumber}</span>
                <span className="badge-warning text-[10px]">{t('dash_maintenance')}</span>
              </div>
            ))}
            {trucks.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{t('notEnoughData')}</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-purple-500" />{t('dash_drivers')}
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-xl bg-primary/5 border border-primary/15 p-2.5 text-center">
              <div className="text-lg font-bold text-primary">{driversInTrip.length}</div>
              <div className="text-[10px] font-semibold text-text-secondary uppercase">{t('status_badge_in_trip')}</div>
            </div>
            <div className="rounded-xl bg-success/5 border border-success/15 p-2.5 text-center">
              <div className="text-lg font-bold text-success">{driversAvailable.length}</div>
              <div className="text-[10px] font-semibold text-text-secondary uppercase">{t('dash_available')}</div>
            </div>
            <div className="rounded-xl bg-surface border border-border p-2.5 text-center">
              <div className="text-lg font-bold text-text-secondary">{driversOff.length}</div>
              <div className="text-[10px] font-semibold text-text-secondary uppercase flex items-center justify-center gap-1"><Coffee className="w-3 h-3" />{t('dash_off')}</div>
            </div>
          </div>
          <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {[...driversInTrip, ...driversAvailable].map(d => (
              <div key={d.id} className="flex items-center justify-between text-sm p-1.5 rounded-lg hover:bg-surface/60 transition-colors">
                <span className="font-medium text-text truncate">{d.user?.name || d.name || '—'}</span>
                <span className={`text-[10px] font-semibold ${d.status === 'in_trip' ? 'text-primary' : 'text-success'}`}>
                  {d.status === 'in_trip' ? t('status_badge_in_trip') : t('dash_available')}
                </span>
              </div>
            ))}
            {drivers.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{t('notEnoughData')}</div>}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {(summary?.expiringDocs?.length ?? 0) > 0 && (
          <div className="card border-l-4 border-warning">
            <div className="flex items-center gap-2 mb-3">
              <FileWarning className="w-5 h-5 text-warning" />
              <h3 className="font-semibold text-sm text-text">{t('expiringDocuments')} ({summary.expiringDocs.length})</h3>
            </div>
            <div className="space-y-2">
              {summary.expiringDocs.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-text font-medium">{d.title}</span>
                  <span className="badge-warning">{formatDate(d.expiryDate)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {isAdmin && (summary?.overdueInvoices?.length ?? 0) > 0 && (
          <div className="card border-l-4 border-error">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-error" />
              <h3 className="font-semibold text-sm text-text">{t('overdueInvoices')} ({summary.overdueInvoices.length})</h3>
            </div>
            <div className="space-y-2">
              {summary.overdueInvoices.slice(0, 5).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-text font-medium">{inv.invoiceNumber} — {inv.client?.name}</span>
                  <span className="badge-error">€{Number(inv.amount).toLocaleString(i18n.language)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {(summary?.expiringDocs?.length ?? 0) === 0 && (!(summary?.overdueInvoices?.length) || !isAdmin) && (
          <div className="card border-l-4 border-success lg:col-span-2">
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">{t('allClearNoAlerts')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
