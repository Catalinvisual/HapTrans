import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Truck, Search, Loader2, FileText, Trash2, Download, ExternalLink, Activity, Calendar, Coins, Route as RouteIcon, User, Send, Boxes, Gauge, Clock, Wallet, Receipt, Banknote, ArrowRight, Scale, LayoutGrid } from 'lucide-react';
import api from '../lib/api';
import { fmtNumber, fmtMoney, fmtKm, fmtPercent } from '../lib/format';
import { matchesSearch } from '../lib/search';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import KpiStrip from '../components/ui/KpiStrip';
import DetailDrawer from '../components/ui/DetailDrawer';
import type { TabDef } from '../components/ui/DetailDrawer';
import BulkBar from '../components/ui/BulkBar';
import StatusBadge from '../components/ui/StatusBadge';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import ExportModal from '../components/ExportModal';
import ActivityTimeline from '../components/ActivityTimeline';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import toast from 'react-hot-toast';

const TRIP_STATUSES = ['planning', 'planned', 'assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered', 'completed', 'closed', 'cancelled'];
const TRIP_ACTIVE = ['assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];
const TRIP_PLANNING = ['planning', 'planned'];

const tStops = (trip: any) => (trip.stops ? [...trip.stops].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0)) : []);
const tPickup = (trip: any) => { const s = tStops(trip); return s.find((x: any) => x.type === 'pickup') || s[0]; };
const tDropoff = (trip: any) => { const s = tStops(trip); return [...s].reverse().find((x: any) => x.type === 'dropoff') || s[s.length - 1]; };
const tRevenue = (trip: any) => trip.orders?.reduce((s: number, o: any) => s + Number(o.price || 0), 0) || Number(trip.price || 0);
const tCost = (trip: any) => Number(trip.estimatedCost || 0);
const tExtraCost = (trip: any) => trip.costs?.reduce((s: number, c: any) => s + Number(c.amount || 0), 0) || 0;
const tProfit = (trip: any) => {
  if (trip.estimatedProfit != null && !isNaN(Number(trip.estimatedProfit))) return Number(trip.estimatedProfit);
  return tRevenue(trip) - tCost(trip) - tExtraCost(trip);
};
const tDriverName = (trip: any) => {
  if (!trip.driver) return '—';
  const d = trip.driver;
  if (d.user?.name) return d.user.name;
  if (d.firstName) return `${d.firstName} ${d.lastName || ''}`.trim();
  return d.user?.email || d.name || '—';
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
// Turn a raw name or e-mail local part into a readable short name
// e.g. "sofer.bogdan.popa3@hapcargo.ro" -> "Bogdan P."
function humanName(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!s.includes('@')) return s;
  const parts = s
    .split('@')[0]
    .split(/[._\-+]+/)
    .map(p => p.replace(/\d+$/g, ''))
    .filter(p => p && !/^(sofer|șofer|driver|drv|user|info|contact|admin|office)$/i.test(p));
  if (parts.length === 2) return `${cap(parts[0])} ${cap(parts[1])}`;
  if (parts.length > 2) return `${cap(parts[0])} ${cap(parts[parts.length - 1]).charAt(0)}.`;
  if (parts.length === 1) return cap(parts[0]);
  return s;
}
const tDriverEmail = (trip: any) =>
  trip.driver?.user?.email || (String(trip.driver?.name || '').includes('@') ? trip.driver.name : '') || '';
const tDriverDisplay = (trip: any) => {
  const d = trip.driver;
  if (!d) return '—';
  const full = d.firstName ? `${d.firstName} ${d.lastName || ''}`.trim() : (d.user?.name || d.name || '');
  return humanName(full) || humanName(tDriverEmail(trip)) || '—';
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tWeight = (trip: any) => trip.orders?.reduce((s: number, o: any) => s + (o.cargoItems?.reduce((x: number, c: any) => x + Number(c.weightKg || 0), 0) || 0), 0) || 0;
const tPallets = (trip: any) => trip.orders?.reduce((s: number, o: any) => s + (o.cargoItems?.reduce((x: number, c: any) => x + Number(c.quantity || 1), 0) || 0), 0) || 0;
const tDeparture = (trip: any) => {
  const s = tPickup(trip);
  if (s?.timeWindowMin && !isNaN(new Date(s.timeWindowMin).getTime())) return new Date(s.timeWindowMin);
  return trip.plannedDeparture ? new Date(trip.plannedDeparture) : null;
};

function sortValue(trip: any, key: string): any {
  switch (key) {
    case 'tripNumber': return (trip.tripNumber || '').toLowerCase();
    case 'fleet': return (trip.truck?.plateNumber || '').toLowerCase();
    case 'date': { const d = tDeparture(trip); return d ? d.getTime() : 0; }
    case 'createdAt': return new Date(trip.createdAt).getTime();
    case 'distance': return Number(trip.distanceKm || 0);
    case 'weight': return tWeight(trip);
    case 'revenue': return tRevenue(trip);
    case 'cost': return tCost(trip) + tExtraCost(trip);
    case 'profit': return tProfit(trip);
    case 'status': return trip.status || '';
    default: return trip[key] ?? '';
  }
}

export default function TripsPage({ embeddedClientId }: { embeddedClientId?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({ status: 'all', truck: 'all', driver: 'all', dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [drawerTripId, setDrawerTripId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [exportRows, setExportRows] = useState<any[]>([]);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips');
      const sorted = res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTrips(sorted);
    } catch (err) {
      console.error(err);
      toast.error(t('toast_failedToLoad', 'Failed to load trips'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);




  const truckOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach(tr => { if (tr.truck?.id) map.set(tr.truck.id, (map.get(tr.truck.id) || 0) + 1); });
    return [{ value: 'all', label: t('trucks', 'Trucks') }, ...[...map.entries()].map(([id, count]) => ({ value: id, label: `${trips.find(tr => tr.truck?.id === id)?.truck?.plateNumber || id} (${count})` }))];
  }, [trips, t]);

  const driverOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, number>();
    trips.forEach(tr => { if (tr.driver?.id) map.set(tr.driver.id, (map.get(tr.driver.id) || 0) + 1); });
    return [{ value: 'all', label: t('drivers', 'Drivers') }, ...[...map.entries()].map(([id, count]) => ({ value: id, label: `${tDriverDisplay(trips.find(tr => tr.driver?.id === id) as any)} (${count})` }))];
  }, [trips, t]);

  const statusOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: t('all_statuses', 'All statuses') },
    { value: 'active', label: t('filter_active_trips', 'Active (in progress)') },
    { value: 'planning', label: t('filter_planning', 'Planning / planned') },
    ...TRIP_STATUSES.map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) })),
  ], [t]);

  const base = useMemo(() => embeddedClientId ? trips.filter(tr => tr.orders?.some((o: any) => o.client?.id === embeddedClientId) || tr.client?.id === embeddedClientId) : trips, [trips, embeddedClientId]);

  const filtered = useMemo(() => {
    return base.filter(tr => {
      if (!matchesSearch(search, tr.tripNumber, tr.truck?.plateNumber, tDriverName(tr), tPickup(tr)?.city, tDropoff(tr)?.city, tr.orders?.map((o: any) => o.orderNumber || o.referenceNumber).join(' '))) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'active' && !TRIP_ACTIVE.includes(tr.status)) return false;
        if (filters.status === 'planning' && !TRIP_PLANNING.includes(tr.status)) return false;
        if (filters.status !== 'active' && filters.status !== 'planning' && tr.status !== filters.status) return false;
      }
      if (filters.truck !== 'all' && tr.truck?.id !== filters.truck) return false;
      if (filters.driver !== 'all' && tr.driver?.id !== filters.driver) return false;
      if (filters.dateFrom || filters.dateTo) {
        const d = tDeparture(tr);
        const dateStr = d ? d.toISOString().split('T')[0] : (tr.createdAt ? new Date(tr.createdAt).toISOString().split('T')[0] : '');
        if (filters.dateFrom && dateStr && dateStr < filters.dateFrom) return false;
        if (filters.dateTo && dateStr && dateStr > filters.dateTo) return false;
      }
      return true;
    });
  }, [base, search, filters]);

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const va = sortValue(a, sort.key);
      const vb = sortValue(b, sort.key);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filtered, sort]);

  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totals = useMemo(() => ({
    distance: filtered.reduce((s, tr) => s + Number(tr.distanceKm || 0), 0),
    revenue: filtered.reduce((s, tr) => s + tRevenue(tr), 0),
    cost: filtered.reduce((s, tr) => s + tCost(tr) + tExtraCost(tr), 0),
    profit: filtered.reduce((s, tr) => s + tProfit(tr), 0),
    pallets: filtered.reduce((s, tr) => s + tPallets(tr), 0),
  }), [filtered]);

  const activeCount = base.filter(tr => TRIP_ACTIVE.includes(tr.status)).length;
  const planningCount = base.filter(tr => TRIP_PLANNING.includes(tr.status)).length;
  const completedCount = base.filter(tr => ['completed', 'closed'].includes(tr.status)).length;

  const kpiActiveKey = `${filters.status}_${filters.truck}_${filters.driver}`;
  const kpis = [
    { key: 'total', label: t('kpi_total_trips', 'Total trips'), value: base.length, icon: Truck, active: kpiActiveKey === 'all_all_all' && !search, onClick: () => setFilters({ status: 'all', truck: 'all', driver: 'all', dateFrom: '', dateTo: '' }) },
    { key: 'active', label: t('kpi_active', 'Active'), value: activeCount, color: '#6366f1', icon: Activity, active: filters.status === 'active', onClick: () => setFilters(f => ({ ...f, status: 'active' })) },
    { key: 'planning', label: t('kpi_planning', 'Planning'), value: planningCount, color: '#f59e0b', icon: Calendar, active: filters.status === 'planning', onClick: () => setFilters(f => ({ ...f, status: 'planning' })) },
    { key: 'completed', label: t('kpi_completed', 'Completed'), value: completedCount, color: '#22c55e', icon: CheckIcon, active: ['completed', 'closed'].includes(filters.status) && filters.status !== 'all', onClick: () => setFilters(f => ({ ...f, status: 'completed' })) },
    { key: 'revenue', label: t('kpi_revenue', 'Revenue'), value: fmtMoney(totals.revenue), color: '#f97316', icon: Banknote },
    { key: 'profit', label: t('kpi_profit', 'Profit'), value: fmtMoney(totals.profit), color: totals.profit >= 0 ? '#22c55e' : '#ef4444', icon: Wallet },
  ];

  const hasActiveFilters = filters.status !== 'all' || filters.truck !== 'all' || filters.driver !== 'all' || filters.dateFrom || filters.dateTo || !!search.trim();

  const handleDispatch = async (tripId: string) => {
    try {
      await api.patch(`/trips/${tripId}`, { status: 'dispatched' });
      toast.success(t('toast_cursTrimisC', 'Trip dispatched'));
      fetchTrips();
    } catch { toast.error(t('toast_eroareLaTrimi', 'Failed to dispatch')); }
  };

  const bulkSetStatus = async (status: string) => {
    if (selected.size === 0) return;
    const label = t(`status_${status}`, status.replace(/_/g, ' '));
    try {
      for (const id of selected) await api.patch(`/trips/${id}`, { status });
      toast.success(`${selected.size} ${t('trips_updated', 'trips updated')} → ${label}`);
      setSelected(new Set());
      fetchTrips();
    } catch { toast.error(t('bulk_update_error', 'Bulk update failed')); }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      for (const id of selected) await api.delete(`/trips/${id}`);
      toast.success(t('bulk_deleted', 'Deleted {n} trips', { n: selected.size }));
      setSelected(new Set());
      fetchTrips();
    } catch { toast.error(t('bulk_delete_error', 'Bulk delete failed')); }
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    try {
      await api.delete(`/trips/${tripToDelete}`);
      toast.success(t('global_delete_success', 'Deleted successfully'));
      fetchTrips();
    } catch { toast.error(t('global_delete_error', 'Failed to delete')); }
    finally { setDeleteModalOpen(false); setTripToDelete(null); }
  };

  const tripExportHeaders = [
    { key: 'tripNumber', label: 'Trip', transform: (v: any) => v || '' },
    { key: 'status', label: 'Status', transform: (v: any) => v || '' },
    { key: 'truck', label: 'Truck', transform: (_v: any, tr: any) => tr.truck?.plateNumber || '' },
    { key: 'driver', label: 'Driver', transform: (_v: any, tr: any) => tDriverName(tr) },
    { key: 'pickup', label: 'Pickup', transform: (_v: any, tr: any) => { const s = tPickup(tr); return s ? [s.address || s.companyName, s.country].filter(Boolean).join(', ') : ''; } },
    { key: 'dropoff', label: 'Dropoff', transform: (_v: any, tr: any) => { const s = tDropoff(tr); return s ? [s.address || s.companyName, s.country].filter(Boolean).join(', ') : ''; } },
    { key: 'distanceKm', label: 'Km', transform: (v: any) => Number(v || 0) },
    { key: 'pallets', label: 'Pallets', transform: (_v: any, tr: any) => tPallets(tr) },
    { key: 'weight', label: 'Weight (kg)', transform: (_v: any, tr: any) => Math.round(tWeight(tr)) },
    { key: 'revenue', label: 'Revenue', transform: (_v: any, tr: any) => Number(tRevenue(tr)) },
    { key: 'cost', label: 'Cost', transform: (_v: any, tr: any) => Number(tCost(tr) + tExtraCost(tr)) },
    { key: 'profit', label: 'Profit', transform: (_v: any, tr: any) => Number(tProfit(tr)) },
  ];

  const openExport = (rows: any[]) => {
    setExportRows(rows);
    setShowExport(true);
  };

  const columns: Column<any>[] = [
    { key: 'tripNumber', label: t('trip', 'Trip'), sortable: true, className: 'min-w-[112px]', render: tr => {
      const created = tr.createdAt && !isNaN(new Date(tr.createdAt).getTime()) ? new Date(tr.createdAt).toLocaleDateString() : '—';
      const orders = tr.orders || [];
      return (
        <div className="leading-[1.15]">
          <div className="font-bold text-primary text-[11.5px] truncate">{tr.tripNumber || tr.id.slice(0, 8)}</div>
          {orders[0] && (
            <div className="text-[9.5px] font-bold text-primary/80 truncate">
              {orders[0].orderNumber || orders[0].referenceNumber}
              {orders.length > 1 && <span className="text-text-muted font-semibold"> +{orders.length - 1}</span>}
            </div>
          )}
          <div className="text-[9.5px] text-text-secondary truncate">{created}</div>
        </div>
      );
    } },
    { key: 'fleet', label: t('fleet', 'Fleet'), sortable: true, className: 'min-w-[150px]', render: tr => {
      const name = tDriverDisplay(tr);
      const email = tDriverEmail(tr);
      return (
        <div className="leading-tight">
          <div className="flex items-center gap-1 text-[12px] min-w-0">
            <Truck className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <span className="font-semibold truncate">{tr.truck?.plateNumber || '—'}</span>
            {name && name !== '—' && (
              <>
                <span className="text-text-muted shrink-0">•</span>
                <User className="w-3 h-3 text-text-muted shrink-0" />
                <span className="truncate" title={email || name}>{name}</span>
              </>
            )}
          </div>
          {tr.trailer?.plateNumber && <div className="text-[10px] text-text-muted truncate mt-0.5">{t('trailer', 'Trailer')}: {tr.trailer.plateNumber}</div>}
        </div>
      );
    } },
    { key: 'date', label: t('departure', 'Departure'), sortable: true, className: 'min-w-[88px]', render: tr => {
      const d = tDeparture(tr);
      return <div className="leading-tight text-[11px]">
        <div className="font-semibold">{d ? d.toLocaleDateString() : '—'}</div>
        <div className="text-text-secondary">{d ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
      </div>;
    } },
    { key: 'route', label: t('route', 'Route'), className: 'min-w-[180px]', render: tr => {
      const p = tPickup(tr); const d = tDropoff(tr);
      const city = (s: any) => s?.city || s?.address?.split(',')[0] || '?';
      const country = (s: any) => (s?.country ? ` (${s.country})` : '');
      const addr = (s: any) => [s?.address, s?.city, s?.country].filter(Boolean).join(', ');
      return (
        <div className="flex items-center gap-1.5 min-w-0 text-[12px]">
          <span className="font-semibold text-blue-600 dark:text-blue-400 truncate" title={addr(p) || '—'}>{p ? city(p) : '—'}<span className="text-text-muted font-normal">{p ? country(p) : ''}</span></span>
          <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
          <span className="font-semibold text-green-600 dark:text-green-400 truncate" title={addr(d) || '—'}>{d ? city(d) : '—'}<span className="text-text-muted font-normal">{d ? country(d) : ''}</span></span>
        </div>
      );
    } },
    { key: 'weight', label: t('cargo', 'Cargo'), sortable: true, className: 'min-w-[98px]', render: tr => (
      <div className="leading-tight text-[11px]">
        <div className="font-semibold flex items-center gap-1"><Boxes className="w-3 h-3 text-text-muted" />{fmtNumber(tPallets(tr))} {t('pallets', 'pal')}</div>
        <div className="text-text-secondary flex items-center gap-1"><Scale className="w-3 h-3 text-text-muted" />{fmtNumber(Math.round(tWeight(tr)))} kg</div>
      </div>
    ) },
    { key: 'distance', label: t('km', 'Km'), sortable: true, align: 'right', className: 'min-w-[62px]', render: tr => (
      <span className="font-semibold text-[12px] whitespace-nowrap">{tr.distanceKm ? fmtKm(tr.distanceKm) : '—'}</span>
    ) },
    { key: 'revenue', label: t('revenue', 'Revenue'), sortable: true, align: 'right', className: 'min-w-[88px]', render: tr => <span className="font-semibold text-[12px] whitespace-nowrap">{fmtMoney(tRevenue(tr))}</span> },
    { key: 'cost', label: t('cost', 'Cost'), sortable: true, align: 'right', className: 'min-w-[84px]', render: tr => <span className="text-text-secondary text-[12px] whitespace-nowrap">{fmtMoney(tCost(tr) + tExtraCost(tr))}</span> },
    { key: 'profit', label: t('profit', 'Profit'), sortable: true, align: 'right', className: 'min-w-[84px]', render: tr => {
      const p = tProfit(tr);
      return <span className={`font-bold text-[12px] whitespace-nowrap ${p >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{isNaN(p) ? '—' : fmtMoney(p)}</span>;
    } },
    { key: 'status', label: t('status', 'Status'), sortable: true, className: 'min-w-[96px]', render: tr => <StatusBadge type="trip" status={tr.status} label={t(`status_${tr.status}`, tr.status.replace(/_/g, ' ')) as string} /> },
    { key: 'actions', label: '', align: 'right', className: 'min-w-[84px]', render: tr => (
      <div className="flex items-center justify-end gap-0.5">
        {tr.status === 'planning' && (
          <button onClick={e => { e.stopPropagation(); handleDispatch(tr.id); }} title={t('jsx_trimiteDispat', 'Send Dispatch')} className="p-1 rounded-md text-text-secondary hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10">
            <Send className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); navigate(`/trips/${tr.id}`); }} title={t('open_trip', 'Open trip')} className="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button onClick={e => { e.stopPropagation(); setTripToDelete(tr.id); setDeleteModalOpen(true); }} title={t('delete', 'Delete')} className="p-1 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    ) },
  ];

  const footerCells = [
    <td key="total" colSpan={4} className="px-3 py-2 text-[11px] font-bold uppercase text-text-secondary">{t('total', 'Total')} · {filtered.length} {t('trips', 'trips')}</td>,
    <td key="cargo" className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">{fmtNumber(totals.pallets)} {t('pallets', 'pal')} / {fmtNumber(Math.round(totals.distance))} km</td>,
    <td key="distance" className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">{fmtNumber(Math.round(totals.distance))} km</td>,
    <td key="revenue" className="px-3 py-2 text-right text-xs font-bold whitespace-nowrap">{fmtMoney(totals.revenue)}</td>,
    <td key="cost" className="px-3 py-2 text-right text-xs font-bold text-text-secondary whitespace-nowrap">{fmtMoney(totals.cost)}</td>,
    <td key="profit" className={`px-3 py-2 text-right text-xs font-black whitespace-nowrap ${totals.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{fmtMoney(totals.profit)}</td>,
    <td key="status" className="px-3 py-2"></td>,
    <td key="actions" className="px-3 py-2"></td>
  ];

  return (
    <div className="max-w-[1700px] mx-auto space-y-4 animate-fade-in">
      <KpiStrip items={kpis} dense />

      <div className="card p-0 overflow-hidden border border-border">
        <div className="px-2.5 py-2 border-b border-border bg-surface/30">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-[200px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder={t('search_trips', 'Search trip, truck, driver, city...')}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 pr-3 py-1.5 text-xs w-full bg-white"
              />
            </div>
            <div className="w-[128px] shrink-0"><CustomSelect size="sm" options={statusOptions} value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} /></div>
            <div className="w-[148px] shrink-0"><CustomSelect size="sm" options={truckOptions} value={filters.truck} onChange={v => setFilters(f => ({ ...f, truck: v }))} /></div>
            <div className="w-[148px] shrink-0"><CustomSelect size="sm" options={driverOptions} value={filters.driver} onChange={v => setFilters(f => ({ ...f, driver: v }))} /></div>
            <div className="relative shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <Flatpickr
                value={filters.dateFrom && filters.dateTo ? `${filters.dateFrom} to ${filters.dateTo}` : ''}
                onChange={(dates) => {
                  const [a, b] = dates as Date[];
                  setFilters(f => ({ ...f, dateFrom: a ? ymd(a) : '', dateTo: b ? ymd(b) : '' }));
                }}
                className="input pl-8 pr-3 py-1.5 text-xs w-[210px] bg-card cursor-pointer hover:border-primary/50 transition-colors"
                options={{ mode: 'range', altInput: true, altFormat: 'd M', dateFormat: 'Y-m-d', allowInput: false, showMonths: 1 }}
                placeholder={t('date_range', 'Date range')}
                title={t('date_range', 'Date range')}
              />
            </div>
            {hasActiveFilters && (
              <button onClick={() => { setFilters({ status: 'all', truck: 'all', driver: 'all', dateFrom: '', dateTo: '' }); setSearch(''); }} className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0">
                <FilterXIcon className="w-3.5 h-3.5" />{t('clear_filters', 'Clear')}
              </button>
            )}

            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
              <button onClick={() => openExport(sorted)} className="btn-secondary py-1.5 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"><Download className="w-3.5 h-3.5" />{t('export_csv', 'Export CSV')}</button>
              <button onClick={() => navigate('/planning')} className="btn-primary py-1.5 px-2.5 text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"><LayoutGrid className="w-3.5 h-3.5" />{t('go_to_planning', 'Dispatch board')}</button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          rowKey={(tr: any) => tr.id}
          onRowClick={(tr: any) => setDrawerTripId(tr.id)}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSortChange={(key, dir) => setSort({ key, dir })}
          footer={<>{footerCells}</>}
          loading={loading}
          dense
          minWidth="1100px"
          emptyState={
            <div className="p-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted"><Truck className="w-8 h-8" /></div>
              <h3 className="text-lg font-medium text-text-primary">{t('jsx_noTripsFound', 'No trips found')}</h3>
              <p className="text-text-secondary mt-1 max-w-sm text-sm">{t('jsx_noTripsMatch', 'Adjust filters or create a trip from the dispatch board.')}</p>
            </div>
          }
        />

        <div className="border-t border-border px-4 py-3">
          <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      </div>

      <BulkBar
        count={selected.size}
        onClear={() => setSelected(new Set())}
        actions={[
          { label: t('bulk_dispatch', 'Dispatch'), icon: Send, variant: 'primary', onClick: () => bulkSetStatus('dispatched') },
          { label: t('bulk_complete', 'Complete'), icon: CheckIcon, variant: 'secondary', onClick: () => bulkSetStatus('completed') },
          { label: t('bulk_cancel', 'Cancel'), icon: Activity, variant: 'secondary', onClick: () => bulkSetStatus('cancelled') },
          { label: t('bulk_export', 'Export'), icon: Download, variant: 'secondary', onClick: () => openExport(sorted.filter(tr => selected.has(tr.id))) },
          { label: t('bulk_delete', 'Delete'), icon: Trash2, variant: 'danger', onClick: () => setConfirmBulkDelete(true) },
        ]}
      />

      <ConfirmModal
        isOpen={confirmBulkDelete}
        title={t('bulk_delete_confirm_title', 'Confirm bulk delete')}
        message={t('bulk_delete_confirm_message', 'Are you sure you want to delete {{count}} selected items? This action cannot be undone.', { count: selected.size })}
        onConfirm={() => { setConfirmBulkDelete(false); bulkDelete(); }}
        onCancel={() => setConfirmBulkDelete(false)}
        type="danger"
      />

      {drawerTripId && (
        <TripDetailDrawer
          tripId={drawerTripId}
          onClose={() => setDrawerTripId(null)}
          onRefetch={fetchTrips}
        />
      )}
      <ConfirmDeleteModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setTripToDelete(null); }} onConfirm={confirmDelete} />

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={exportRows} filename="Trips_HapCargo" title="Trips" sheetName="Trips" getDateField={tr => tr.createdAt} headers={tripExportHeaders} />
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function FilterXIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
      <path d="M18 18l4 4" />
      <path d="M22 18l-4 4" />
    </svg>
  );
}

interface TripDetailDrawerProps {
  tripId: string;
  onClose: () => void;
  onRefetch?: () => void;
}

function TripDetailDrawer({ tripId, onClose, onRefetch }: TripDetailDrawerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/trips/${tripId}`);
      setTrip(res.data);
    } catch { toast.error(t('toast_failedToLoad', 'Failed to load trip')); }
    finally { setLoading(false); }
  }, [tripId, t]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!trip) return;
    api.get(`/documents/trip/${trip.id}`).then(r => setDocuments(r.data)).catch(() => setDocuments([])).finally(() => setDocsLoading(false));
  }, [trip]);

  const updateStatus = async (status: string) => {
    try {
      await api.patch(`/trips/${trip.id}`, { status });
      toast.success(t('status_updated', 'Status updated'));
      load();
      onRefetch?.();
    } catch { toast.error(t('status_update_error', 'Failed to update status')); }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('tripId', trip.id);
      fd.append('type', 'other');
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('doc_uploaded', 'Document uploaded'));
      const r = await api.get(`/documents/trip/${trip.id}`);
      setDocuments(r.data);
    } catch { toast.error(t('doc_upload_error', 'Upload failed')); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const deleteDoc = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(ds => ds.filter(d => d.id !== id));
      toast.success(t('global_delete_success', 'Deleted successfully'));
    } catch { toast.error(t('global_delete_error', 'Failed to delete')); }
  };

  const Row = ({ label, value, icon }: any) => (
    <div className="flex items-baseline gap-1.5 py-2 border-b border-border/50 last:border-0 flex-wrap">
      <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5 whitespace-nowrap">{icon}{label}:</span>
      <span className="text-[13px] font-semibold text-text-primary">{value || '—'}</span>
    </div>
  );

  if (loading || !trip) {
    return (
      <DetailDrawer open onClose={onClose} title={<span className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" />{t('trip', 'Trip')}</span>}>
        <div className="flex justify-center p-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </DetailDrawer>
    );
  }

  const revenue = tRevenue(trip);
  const cost = tCost(trip);
  const extraCost = tExtraCost(trip);
  const profit = tProfit(trip);
  const stops = tStops(trip);
  const distance = Number(trip.distanceKm || 0);

  const tabs: TabDef[] = [
    { key: 'overview', label: t('tab_overview', 'Overview'), content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StatusBadge type="trip" status={trip.status} label={t(`status_${trip.status}`, trip.status.replace(/_/g, ' ')) as string} size="md" />
          <button onClick={() => navigate(`/trips/${trip.id}`)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">{t('open_full_page', 'Open full page')} <ExternalLink className="w-3 h-3" /></button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface/40 rounded-xl p-3 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary">{t('revenue', 'Revenue')}</div>
            <div className="text-lg font-black text-primary">{fmtMoney(revenue)}</div>
          </div>
          <div className="bg-surface/40 rounded-xl p-3 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary">{t('cost', 'Cost')}</div>
            <div className="text-lg font-black text-text-primary">{fmtMoney(cost + extraCost)}</div>
          </div>
          <div className="bg-surface/40 rounded-xl p-3 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary">{t('profit', 'Profit')}</div>
            <div className={`text-lg font-black ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{isNaN(profit) ? fmtMoney(0) : fmtMoney(profit)}</div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('trip_details', 'Trip details')}</div>
          <Row icon={<Truck className="w-3 h-3" />} label={t('truck', 'Truck')} value={trip.truck?.plateNumber || '—'} />
          <Row icon={<RouteIcon className="w-3 h-3" />} label={t('trailer', 'Trailer')} value={trip.trailer?.plateNumber || '—'} />
          <Row icon={<User className="w-3 h-3" />} label={t('driver', 'Driver')} value={tDriverName(trip)} />
          <Row icon={<User className="w-3 h-3" />} label={t('dispatcher', 'Dispatcher')} value={trip.dispatcher?.name || trip.dispatcher?.email || '—'} />
          <Row icon={<Calendar className="w-3 h-3" />} label={t('planned_departure', 'Planned departure')} value={trip.plannedDeparture ? new Date(trip.plannedDeparture).toLocaleString() : '—'} />
          <Row icon={<Clock className="w-3 h-3" />} label={t('planned_arrival', 'Planned arrival')} value={trip.plannedArrival ? new Date(trip.plannedArrival).toLocaleString() : '—'} />
          <Row icon={<Activity className="w-3 h-3" />} label={t('actual_departure', 'Actual departure')} value={trip.actualDeparture ? new Date(trip.actualDeparture).toLocaleString() : '—'} />
          <Row icon={<Activity className="w-3 h-3" />} label={t('actual_arrival', 'Actual arrival')} value={trip.actualArrival ? new Date(trip.actualArrival).toLocaleString() : '—'} />
          <Row icon={<Gauge className="w-3 h-3" />} label={t('distance', 'Distance')} value={distance ? fmtKm(distance) : '—'} />
          <Row icon={<Coins className="w-3 h-3" />} label={t('tolls', 'Tolls')} value={Number(trip.tollCost || 0) ? fmtMoney(trip.tollCost) : '—'} />
          <Row icon={<Calendar className="w-3 h-3" />} label={t('created_at', 'Created')} value={trip.createdAt ? new Date(trip.createdAt).toLocaleString() : '—'} />
        </div>
      </div>
    ) },
    { key: 'route', label: t('tab_route', 'Route'), badge: stops.length, content: (
      <div>
        {stops.map((s: any, i: number) => {
          const isPickup = s.type === 'pickup';
          const isDropoff = s.type === 'dropoff';
          return (
            <div key={s.id || i} className="relative pl-7 pb-5 last:pb-0">
              {i < stops.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />}
              <div className={`absolute left-0 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black ${isPickup ? 'bg-blue-500 border-blue-600 text-white' : isDropoff ? 'bg-green-500 border-green-600 text-white' : 'bg-purple-500 border-purple-600 text-white'}`}>{i + 1}</div>
              <div className="bg-surface/40 rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold text-text-primary">{s.companyName || (isPickup ? t('pickup', 'Pickup') : isDropoff ? t('dropoff', 'Dropoff') : t('stop', 'Stop'))}</span>
                  <span className="text-[10px] font-bold uppercase text-text-secondary">{s.type}</span>
                </div>
                <div className="text-[11px] text-text-secondary mt-1">{[s.address, s.city, s.country].filter(Boolean).join(', ')}</div>
                <div className="text-[11px] font-semibold text-text-primary mt-1.5">{(s.dateFrom || '—')}{s.timeFrom ? ` ${s.timeFrom}` : ''}{s.dateTo ? ` → ${s.dateTo}${s.timeUntil ? ` ${s.timeUntil}` : ''}` : ''}</div>
                {s.contactPerson && <div className="text-[11px] text-text-secondary mt-0.5 flex items-center gap-1"><User className="w-2.5 h-2.5" />{s.contactPerson}{s.phone ? ` · ${s.phone}` : ''}</div>}
                {s.reference && <div className="text-[11px] text-text-secondary mt-0.5">Ref: {s.reference}</div>}
                {s.tasks?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.tasks.map((tk: any, j: number) => (
                      <span key={tk.id || j} className="text-[10px] bg-primary/10 text-primary font-bold px-1.5 py-px rounded">{tk.order?.orderNumber || tk.order?.referenceNumber || tk.title}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {stops.length === 0 && <div className="text-sm text-text-secondary text-center py-10">{t('no_stops', 'No stops defined')}</div>}
      </div>
    ) },
    { key: 'orders', label: t('tab_orders', 'Orders'), badge: trip.orders?.length || 0, content: (
      <div className="overflow-hidden border border-border rounded-xl">
        <table className="w-full text-left">
          <thead className="bg-surface/50 border-b border-border">
            <tr>
              <th className="table-header">{t('reference', 'Reference')}</th>
              <th className="table-header">{t('route', 'Route')}</th>
              <th className="table-header">{t('price', 'Price')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {trip.orders?.map((o: any) => {
              const os = o.stops ? [...o.stops].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0)) : [];
              const pu = os.find((x: any) => x.type === 'pickup');
              const dr = [...os].reverse().find((x: any) => x.type === 'dropoff');
              return (
                <tr key={o.id} className="hover:bg-surface/30 cursor-pointer" onClick={() => navigate(`/orders`)}>
                  <td className="px-3 py-2.5">
                    <div className="text-[12px] font-bold text-primary">{o.orderNumber || o.referenceNumber}</div>
                    <div className="text-[10px] text-text-secondary">{o.client?.name || ''}</div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-text-secondary">{pu?.city || '?'} → {dr?.city || '?'}</td>
                  <td className="px-3 py-2.5 text-right text-[12px] font-bold">{fmtMoney(o.price)}</td>
                </tr>
              );
            })}
            {(!trip.orders || trip.orders.length === 0) && <tr><td colSpan={3} className="px-3 py-8 text-center text-sm text-text-secondary">{t('no_orders', 'No orders attached')}</td></tr>}
          </tbody>
          <tfoot>
            <tr className="bg-surface/50 border-t border-border">
              <td className="px-3 py-2.5 text-[11px] font-bold uppercase text-text-secondary" colSpan={2}>{t('total_revenue', 'Total revenue')}</td>
              <td className="px-3 py-2.5 text-right text-[12px] font-black text-primary">{fmtMoney(revenue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    ) },
    { key: 'financials', label: t('tab_financials', 'Financials'), content: (
      <div className="space-y-4">
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" />{t('cost_breakdown', 'Cost breakdown')}</div>
          <Row label={t('est_cost', 'Est. cost (engine)')} value={cost ? fmtMoney(cost) : '—'} />
          <Row label={t('tolls', 'Tolls')} value={Number(trip.tollCost || 0) ? fmtMoney(trip.tollCost) : '—'} />
          {(trip.costs || []).map((c: any) => (
            <Row key={c.id} label={`${c.type || 'cost'}${c.description ? ` — ${c.description}` : ''}`} value={fmtMoney(c.amount)} />
          ))}
          <Row label={t('extra_costs_total', 'Manual costs total')} value={extraCost ? fmtMoney(extraCost) : '—'} />
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-text-secondary">{t('total_cost', 'Total cost')}</span>
            <span className="text-sm font-black">{fmtMoney(cost + extraCost)}</span>
          </div>
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1 flex items-center gap-1"><Receipt className="w-3 h-3" />{t('revenue_breakdown', 'Revenue breakdown')}</div>
          {(trip.orders || []).map((o: any) => (
            <Row key={o.id} label={o.orderNumber || o.referenceNumber || 'Order'} value={fmtMoney(o.price)} />
          ))}
          <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-text-secondary">{t('total_revenue', 'Total revenue')}</span>
            <span className="text-sm font-black text-primary">{fmtMoney(revenue)}</span>
          </div>
        </div>
        <div className={`rounded-xl p-4 border flex items-center justify-between ${profit >= 0 ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <div>
            <div className="text-[10px] font-bold uppercase text-text-secondary">{t('profit', 'Profit')}</div>
            <div className={`text-xl font-black ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{isNaN(profit) ? fmtMoney(0) : fmtMoney(profit)}</div>
          </div>
          <span className="text-[11px] text-text-secondary">{t('margin', 'Margin')}: {revenue > 0 ? fmtPercent((profit / revenue) * 100) : '—'}</span>
        </div>
        {trip.invoices?.length > 0 && (
          <div className="bg-surface/40 rounded-xl p-4 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('invoices', 'Invoices')}</div>
            {(trip.invoices || []).map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0 text-[12px]">
                <span className="font-semibold">{inv.invoiceNumber || 'Invoice'}</span>
                <span className="flex items-center gap-2"><StatusBadge type="order" status={inv.status || 'draft'} label={t(`status_${inv.status || 'draft'}`, inv.status || 'draft') as string} /><span className="font-bold">{fmtMoney(inv.total)}</span></span>
              </div>
            ))}
          </div>
        )}
      </div>
    ) },
    { key: 'documents', label: t('tab_documents', 'Documents'), badge: documents.length, content: (
      <div className="space-y-2">
        <label className={`flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-primary bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl cursor-pointer hover:bg-primary/10 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}{uploading ? t('uploading', 'Uploading...') : t('upload_document', 'Upload document')}
          <input type="file" className="hidden" onChange={uploadFile} />
        </label>
        {docsLoading ? <div className="flex justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : documents.map((d: any) => (
          <div key={d.id} className="flex items-center gap-3 bg-surface/40 rounded-xl p-3 border border-border">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-text-primary truncate">{d.originalFilename || d.fileName || 'Document'}</div>
              <div className="text-[11px] text-text-secondary">{d.documentType || d.type} · {d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : ''}</div>
            </div>
            <button onClick={() => deleteDoc(d.id)} className="p-1.5 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {!docsLoading && documents.length === 0 && <div className="text-sm text-text-secondary text-center py-6">{t('no_documents', 'No documents yet')}</div>}
      </div>
    ) },
    { key: 'timeline', label: t('tab_timeline', 'Timeline'), content: (
      <div className="py-2">
        <ActivityTimeline entityType="Trip" entityId={trip.id} />
      </div>
    ) },
  ];

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Truck className="w-4 h-4 text-primary" />{trip.tripNumber || trip.id.slice(0, 8)}</span>}
      subtitle={`${tDriverName(trip)} · ${trip.truck?.plateNumber || '—'} · ${t('created_at', 'Created')}: ${trip.createdAt ? new Date(trip.createdAt).toLocaleDateString() : '—'}`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      footer={
        <>
          {['planning', 'planned'].includes(trip.status) && (
            <button onClick={() => updateStatus('dispatched')} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
              <Send className="w-4 h-4" />{t('dispatch_trip', 'Dispatch trip')}
            </button>
          )}
          {!['completed', 'closed'].includes(trip.status) && (
            <button onClick={() => updateStatus('completed')} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
              <CheckIcon className="w-4 h-4" />{t('mark_completed', 'Mark completed')}
            </button>
          )}
          {!['cancelled', 'completed', 'closed'].includes(trip.status) && (
            <button onClick={() => updateStatus('cancelled')} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-lg border border-border text-text-secondary hover:text-red-600 hover:border-red-300 transition-colors">
              <Trash2 className="w-4 h-4" />{t('cancel_trip', 'Cancel trip')}
            </button>
          )}
        </>
      }
    />
  );
}
