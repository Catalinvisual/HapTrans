import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Truck, Route as RouteIcon, UserCheck, AlertTriangle, FileWarning, Clock,
  Wrench, Coffee, PlaneTakeoff, MapPin, ArrowRight, CircleDashed, Fuel, CalendarClock,
  Search, SlidersHorizontal,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate } from '../lib/dateUtils';
import DieselWidget from '../components/DieselWidget';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
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

const ACTIVE_TRIP_STATUSES = [
  'planning', 'planned', 'assigned', 'dispatched', 'confirmed',
  'driver_received', 'driver_accepted', 'started', 'loading',
  'driving', 'in_transit', 'partially_delivered', 'unplanned',
].join(',');

type WindowType = 'today' | 'tomorrow' | 'next7';

function sameDay(a?: string | Date, b = new Date()) {
  if (!a) return false;
  const d = new Date(a);
  return d.getDate() === b.getDate() && d.getMonth() === b.getMonth() && d.getFullYear() === b.getFullYear();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function inWindow(a?: string | Date, w: WindowType = 'today'): boolean {
  if (!a) return false;
  const d = new Date(a);
  const now = new Date();
  if (w === 'today') return sameDay(d, now);
  if (w === 'tomorrow') {
    const tmr = new Date(now);
    tmr.setDate(tmr.getDate() + 1);
    return sameDay(d, tmr);
  }
  const end = new Date(startOfDay(now));
  end.setDate(end.getDate() + 8);
  return d >= startOfDay(now) && d < end;
}

function timeVal(x: string | undefined) {
  return x ? new Date(x).getTime() : Infinity;
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
  const [refreshing, setRefreshing] = useState(false);
  const [today] = useState(() => new Date());

  const [truckFilter, setTruckFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [windowType, setWindowType] = useState<WindowType>('today');

  const load = (silent = false) => {
    if (silent) setRefreshing(true);
    Promise.all([
      api.get('/dashboard').catch(() => null),
      api.get('/trucks/availability').catch(() => null),
      api.get('/drivers').catch(() => null),
      api.get(`/trips?status=${ACTIVE_TRIP_STATUSES}`).catch(() => null),
    ]).then(([d, tr, dr, tp]: any[]) => {
      setSummary(d?.data ?? null);
      setTrucks(Array.isArray(tr?.data) ? tr.data : []);
      setDrivers(Array.isArray(dr?.data) ? dr.data : []);
      setActiveTrips(Array.isArray(tp?.data) ? tp.data : []);
    }).finally(() => {
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, []);

  const q = search.trim().toLowerCase();

  const filteredTrips = useMemo(() => activeTrips.filter(x => {
    if (truckFilter !== 'all' && x.truck?.id !== truckFilter) return false;
    if (driverFilter !== 'all' && x.driver?.id !== driverFilter) return false;
    if (q) {
      const hay = [x.tripNumber, x.truck?.plateNumber, x.driver?.user?.name, stopLabel(x.stops, 'first'), stopLabel(x.stops, 'last')]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [activeTrips, truckFilter, driverFilter, q]);

  const departuresBoard = useMemo(
    () => filteredTrips.filter(x => inWindow(x.plannedDeparture, windowType)).sort((a, b) => timeVal(a.plannedDeparture) - timeVal(b.plannedDeparture)),
    [filteredTrips, windowType],
  );
  const arrivalsBoard = useMemo(
    () => filteredTrips.filter(x => inWindow(x.plannedArrival, windowType)).sort((a, b) => timeVal(a.plannedArrival) - timeVal(b.plannedArrival)),
    [filteredTrips, windowType],
  );
  const unassigned = useMemo(() => filteredTrips.filter(x => !x.truck?.id || !x.driver?.id), [filteredTrips]);
  const delayed = useMemo(() => filteredTrips.filter(x =>
    x.plannedArrival && !x.actualArrival && new Date(x.plannedArrival).getTime() < Date.now()
  ), [filteredTrips]);

  const trucksInTrip = trucks.filter(x => x.status === 'in_trip');
  const trucksAvailable = trucks.filter(x => x.status === 'active');
  const trucksMaintenance = trucks.filter(x => x.status === 'maintenance');

  const visibleTrucks = useMemo(() => trucks.filter(x => {
    if (truckFilter !== 'all' && x.id !== truckFilter) return false;
    if (driverFilter !== 'all') {
      const trip = activeTrips.find(tp => tp.truck?.id === x.id);
      if (trip?.driver?.id !== driverFilter) return false;
    }
    if (q && !`${x.plateNumber}`.toLowerCase().includes(q)) return false;
    return true;
  }), [trucks, truckFilter, driverFilter, q, activeTrips]);

  const driversInTrip = drivers.filter(d => d.status === 'in_trip');
  const driversAvailable = drivers.filter(d => d.status === 'available');
  const driversOff = drivers.filter(d => ['off', 'sick', 'vacation'].includes(d.status));

  const visibleDrivers = useMemo(() => [...driversInTrip, ...driversAvailable, ...driversOff].filter(d => {
    if (driverFilter !== 'all' && d.id !== driverFilter) return false;
    if (q && !`${d.user?.name || d.name || ''}`.toLowerCase().includes(q)) return false;
    return true;
  }), [driversInTrip, driversAvailable, driversOff, driverFilter, q]);

  const filtersActive = truckFilter !== 'all' || driverFilter !== 'all' || q !== '';

  const truckOptions: SelectOption[] = [
    { value: 'all', label: t('dash_all_trucks') },
    ...trucks.map(x => ({ value: x.id, label: x.plateNumber })),
  ];
  const driverOptions: SelectOption[] = [
    { value: 'all', label: t('dash_all_drivers') },
    ...drivers.map(d => ({ value: d.id, label: d.user?.name || d.name || '—' })),
  ];

  const windows: Array<{ key: WindowType; label: string }> = [
    { key: 'today', label: t('dash_today') },
    { key: 'tomorrow', label: t('dash_tomorrow') },
    { key: 'next7', label: t('dash_next7') },
  ];

  const hoursLate = (x: TripLite) =>
    Math.max(1, Math.round((Date.now() - new Date(x.plannedArrival!).getTime()) / 3600000));

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
    { icon: RouteIcon, label: t('activeTrips'), value: activeTrips.length, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Truck, label: t('dash_trucks_in_trip'), value: trucksInTrip.length, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { icon: CircleDashed, label: t('dash_trucks_available'), value: trucksAvailable.length, color: 'text-success', bg: 'bg-success/10' },
    { icon: UserCheck, label: t('dash_drivers_duty'), value: driversInTrip.length + driversAvailable.length, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { icon: Wrench, label: t('dash_trucks_maintenance'), value: trucksMaintenance.length, color: 'text-warning', bg: 'bg-warning/10' },
    { icon: AlertTriangle, label: t('expiringDocuments'), value: summary?.expiringDocs?.length ?? 0, color: 'text-warning', bg: 'bg-warning/10' },
  ];

  const boardTitle = {
    dep: windowType === 'today' ? t('dash_departures_today') : t('dash_departures'),
    arr: windowType === 'today' ? t('dash_arrivals_today') : t('dash_arrivals'),
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-text">{t('dash_ops_board')}</h1>
          <p className="text-sm text-text-secondary capitalize">
            {dateStr}
            <span className={`inline-block w-1.5 h-1.5 rounded-full ml-2 align-middle ${refreshing ? 'bg-primary animate-pulse' : 'bg-success'}`} title={t('dash_autorefresh')} />
          </p>
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

      {/* Filters */}
      <div className="card !p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide shrink-0">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />{t('dash_filters')}
          </span>
          <div className="w-full lg:w-40"><CustomSelect value={truckFilter} onChange={setTruckFilter} options={truckOptions} /></div>
          <div className="w-full lg:w-48"><CustomSelect value={driverFilter} onChange={setDriverFilter} options={driverOptions} /></div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('dash_search_ph')}
              className="input !pl-9 w-full"
            />
          </div>
          <div className="flex rounded-xl bg-surface-hover p-1 shrink-0">
            {windows.map(w => (
              <button
                key={w.key}
                onClick={() => setWindowType(w.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${windowType === w.key ? 'bg-surface text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}
              >
                {w.label}
              </button>
            ))}
          </div>
          {filtersActive && (
            <button
              onClick={() => { setTruckFilter('all'); setDriverFilter('all'); setSearch(''); }}
              className="text-xs font-semibold text-primary hover:underline shrink-0"
            >
              ✕ {t('dash_filters')}
            </button>
          )}
        </div>
      </div>

      {/* Diesel */}
      <DieselWidget avgConsumptionL100={32} />

      {/* Window board */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <PlaneTakeoff className="w-4 h-4 text-primary" />{boardTitle.dep}
            <span className="badge-primary ml-auto">{departuresBoard.length}</span>
          </h3>
          <div className="space-y-2">
            {departuresBoard.slice(0, 8).map(x => (
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
            {departuresBoard.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{filtersActive ? t('dash_no_match') : t('dash_no_departures')}</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />{boardTitle.arr}
            <span className="badge-success ml-auto">{arrivalsBoard.length}</span>
          </h3>
          <div className="space-y-2">
            {arrivalsBoard.slice(0, 8).map(x => (
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
            {arrivalsBoard.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{filtersActive ? t('dash_no_match') : t('dash_no_arrivals')}</div>}
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
                      <span className="badge-error text-[10px]">+{hoursLate(x)}h</span>
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
            <span className="ml-auto text-[11px] font-semibold text-text-secondary">
              {trucksInTrip.length}/{trucks.length} {t('status_badge_in_trip').toLowerCase()}
            </span>
          </h3>
          <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {visibleTrucks.map(x => {
              const trip = activeTrips.find(tp => tp.truck?.id === x.id);
              const selected = truckFilter === x.id;
              return (
                <div
                  key={x.id}
                  onClick={() => setTruckFilter(selected ? 'all' : x.id)}
                  className={`flex items-center justify-between text-sm p-2 rounded-lg cursor-pointer transition-colors ${selected ? 'ring-1 ring-primary bg-primary/5' : x.status === 'in_trip' ? 'bg-surface/50 hover:bg-surface' : 'hover:bg-surface/60'}`}
                >
                  <span className="font-semibold text-text">{x.plateNumber}</span>
                  <span className="text-[11px] text-text-secondary truncate max-w-[55%] text-right">
                    {trip ? `${stopLabel(trip.stops, 'first') || ''} → ${stopLabel(trip.stops, 'last') || ''}${trip.driver?.user?.name ? ` · ${trip.driver.user.name}` : ''}` : ''}
                  </span>
                  <span className={`text-[10px] shrink-0 ${x.status === 'in_trip' ? 'badge-primary' : x.status === 'maintenance' ? 'badge-warning' : 'badge-success'}`}>
                    {x.status === 'in_trip' ? t('status_badge_in_trip') : x.status === 'maintenance' ? t('dash_maintenance') : t('status_badge_free')}
                  </span>
                </div>
              );
            })}
            {visibleTrucks.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{filtersActive ? t('dash_no_match') : t('notEnoughData')}</div>}
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
            {visibleDrivers.map(d => {
              const selected = driverFilter === d.id;
              return (
                <div
                  key={d.id}
                  onClick={() => setDriverFilter(selected ? 'all' : d.id)}
                  className={`flex items-center justify-between text-sm p-1.5 rounded-lg cursor-pointer transition-colors ${selected ? 'ring-1 ring-primary bg-primary/5' : 'hover:bg-surface/60'}`}
                >
                  <span className="font-medium text-text truncate">{d.user?.name || d.name || '—'}</span>
                  <span className={`text-[10px] font-semibold ${d.status === 'in_trip' ? 'text-primary' : d.status === 'available' ? 'text-success' : 'text-text-secondary'}`}>
                    {d.status === 'in_trip' ? t('status_badge_in_trip') : d.status === 'available' ? t('dash_available') : t('dash_off')}
                  </span>
                </div>
              );
            })}
            {visibleDrivers.length === 0 && <div className="text-sm text-text-secondary py-6 text-center">{filtersActive ? t('dash_no_match') : t('notEnoughData')}</div>}
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
              <Fuel className="w-5 h-5 text-error" />
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
