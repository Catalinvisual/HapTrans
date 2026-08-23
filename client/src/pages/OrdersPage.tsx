import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Loader2, MapPin, FileText, Trash2, Box, Download, Pencil, ExternalLink, Activity, Copy, FilterX, Coins, Weight, Boxes, BadgeEuro, ArrowRight, Flag, Phone, User, Sparkles, Navigation } from 'lucide-react';
import api from '../lib/api';
import OrderWizard from '../components/orders/OrderWizard';
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
import ActivityTimeline from '../components/ActivityTimeline';
import ExportModal from '../components/ExportModal';
import { formatDateExcel } from '../lib/exportExcel';
import AiImportModal from '../components/AiImportModal';
import ExcelImportModal from '../components/ExcelImportModal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../store/settingsStore';
import { generateOrderPdf } from '../lib/pdfGenerator';
import { fmtMoney, fmtNumber } from '../lib/format';

const ORDER_STATUSES = ['draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'cancelled'];

function sortValue(o: any, key: string): any {
  switch (key) {
    case 'ref': return (o.orderNumber || o.referenceNumber || '').toLowerCase();
    case 'client': return (o.client?.name || '').toLowerCase();
    case 'price': return Number(o.price || 0);
    case 'weight': return o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
    case 'date': {
      const s = o.stops?.find((x: any) => x.type === 'pickup');
      return s?.dateFrom ? new Date(`${s.dateFrom}T${s.timeFrom || '00:00'}`).getTime() : 0;
    }
    case 'createdAt': return new Date(o.createdAt).getTime();
    default: return o[key] ?? '';
  }
}

export default function OrdersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<any>({ status: 'all', client: 'all', country: 'all', type: 'all', priority: 'all', dateFrom: '', dateTo: '' });
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [showAiImport, setShowAiImport] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [aiImporting, setAiImporting] = useState(false);
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const onAiFileChange = (file: File | null) => {
    setAiFile(file);
    setAiPreview(null);
  };

  const scanAiFile = async () => {
    if (!aiFile) { toast.error(t('ai_pick_file', 'Alege un document (PDF sau imagine)')); return; }
    setAiBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', aiFile);
      const r = await api.post('/orders/scan', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAiPreview(r.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('ai_scan_failed', 'Scan eșuat'));
    } finally { setAiBusy(false); }
  };

  const importAiOrder = async (indices?: number[]) => {
    if (!aiFile) return;
    setAiImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', aiFile);
      if (indices && indices.length > 0) fd.append('indices', JSON.stringify(indices));
      const r = await api.post('/orders/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const count = r.data?.created?.length || 0;
      toast.success(count === 1
        ? t('ai_imported', 'Comanda creata din document!')
        : t('ai_imported_multi', '{{count}} comenzi create din document!', { count }));
      setShowAiImport(false);
      setAiFile(null);
      setAiPreview(null);
      fetchOrders();
      if (r.data?.created?.[0]?.id) {
        setDrawerOrderId(r.data.created[0].id);
        setActiveTab('overview');
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('ai_import_failed', 'Import e?uat'));
    } finally { setAiImporting(false); }
  };

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const clientOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => { if (o.client?.id) map.set(o.client.id, (map.get(o.client.id) || 0) + 1); });
    return [{ value: 'all', label: t('all_clients', 'All clients') }, ...[...map.entries()].map(([id, count]) => ({ value: id, label: `${orders.find(o => o.client?.id === id)?.client?.name || id} (${count})` }))];
  }, [orders, t]);

  const countryOptions: SelectOption[] = useMemo(() => {
    const set = new Set<string>();
    orders.forEach(o => o.stops?.forEach((s: any) => { if (s.country) set.add(s.country); }));
    return [{ value: 'all', label: t('all_countries', 'All countries') }, ...[...set].sort().map(c => ({ value: c, label: c }))];
  }, [orders, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter(o => {
      if (q) {
        const hay = [o.orderNumber, o.referenceNumber, o.customerReference, o.client?.name, o.contactPerson, o.notes].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.status !== 'all' && o.status !== filters.status) return false;
      if (filters.client !== 'all' && o.client?.id !== filters.client) return false;
      if (filters.type !== 'all' && (o.transportType || 'ftl') !== filters.type) return false;
      if (filters.priority !== 'all' && (o.priority || 'normal') !== filters.priority) return false;
      if (filters.country !== 'all') {
        const has = (o.stops || []).some((s: any) => s.country === filters.country);
        if (!has) return false;
      }
      if (filters.dateFrom || filters.dateTo) {
        const pickup = o.stops?.find((s: any) => s.type === 'pickup');
        const d = pickup?.dateFrom || new Date(o.createdAt).toISOString().split('T')[0];
        if (filters.dateFrom && d < filters.dateFrom) return false;
        if (filters.dateTo && d > filters.dateTo) return false;
      }
      return true;
    });
  }, [orders, search, filters]);

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

  useEffect(() => { setCurrentPage(1); }, [search, filters]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const totalRevenue = filtered.reduce((s, o) => s + Number(o.price || 0), 0);
  const totalWeight = filtered.reduce((s, o) => s + (o.cargoItems?.reduce((x: number, c: any) => x + Number(c.weightKg || 0), 0) || 0), 0);

  const setFilter = (k: string, v: string) => setFilters((f: any) => ({ ...f, [k]: v }));

  const handleEdit = (id: string) => { setSelectedOrderId(id); setIsModalOpen(true); };
  const handleCreate = () => { setSelectedOrderId(null); setIsModalOpen(true); };
  const handleDeleteClick = (id: string) => { setOrderToDelete(id); setDeleteModalOpen(true); };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/orders/${orderToDelete}`);
      toast.success(t('global_delete_success', 'Deleted successfully'));
      fetchOrders();
    } catch (err) {
      toast.error(t('global_delete_error', 'Failed to delete'));
    } finally {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all([...selected].map(id => api.delete(`/orders/${id}`)));
      toast.success(t('bulk_deleted', 'Deleted {n} orders', { n: selected.size }));
      setSelected(new Set());
      fetchOrders();
    } catch (err) {
      toast.error(t('bulk_delete_error', 'Failed to delete some orders'));
    }
  };

  const bulkSetStatus = async (status: string) => {
    if (selected.size === 0 || !status) return;
    try {
      await Promise.all([...selected].map(id => api.patch(`/orders/${id}`, { status })));
      toast.success(t('bulk_status_updated', 'Status updated for {n} orders', { n: selected.size }));
      setSelected(new Set());
      fetchOrders();
    } catch (err) {
      toast.error(t('bulk_status_error', 'Failed to update status'));
    }
  };


  const orderExportHeaders = [
    { key: 'orderNumber', label: 'Order', transform: (_v: any, o: any) => o.orderNumber || o.referenceNumber || '' },
    { key: 'client', label: 'Client', transform: (_v: any, o: any) => o.client?.name || '' },
    { key: 'pickup', label: 'Pickup', transform: (_v: any, o: any) => { const p = o.stops?.find((s: any) => s.type === 'pickup'); return p ? [p.city, p.country].filter(Boolean).join(', ') : ''; } },
    { key: 'dropoff', label: 'Dropoff', transform: (_v: any, o: any) => { const d = o.stops?.find((s: any) => s.type === 'dropoff'); return d ? [d.city, d.country].filter(Boolean).join(', ') : ''; } },
    { key: 'date', label: 'Date', transform: (_v: any, o: any) => { const p = o.stops?.find((s: any) => s.type === 'pickup'); return p?.dateFrom ? formatDateExcel(p.dateFrom) : ''; } },
    { key: 'type', label: 'Type', transform: (_v: any, o: any) => o.transportType || 'ftl' },
    { key: 'priority', label: 'Priority', transform: (_v: any, o: any) => o.priority || 'normal' },
    { key: 'weight', label: 'Weight (kg)', transform: (_v: any, o: any) => o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0 },
    { key: 'price', label: 'Price', transform: (_v: any, o: any) => o.price || 0 },
    { key: 'status', label: 'Status', transform: (_v: any, o: any) => o.status },
  ];

  const setStatusFilterFromKpi = (status: string) => { setFilter('status', status); setSelected(new Set()); };

  const copyTracking = async (o: any) => {
    if (!o.trip?.trackingToken) return;
    const url = `${window.location.origin}/track/${o.trip.trackingToken}`;
    try { await navigator.clipboard.writeText(url); toast.success(t('copiedToClipboard', 'Tracking link copied to clipboard!')); } catch { toast.error(t('toast_failedToCopy')); }
  };

  const handleCreateInvoice = async (o: any) => {
    try {
      const paymentTermsDays = o.client?.paymentTermsDays || 30;
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + paymentTermsDays * 86400000).toISOString().split('T')[0];
      await api.post('/invoices', {
        clientId: o.client?.id,
        tripId: o.trip?.id || null,
        amount: Number(o.price || 0),
        fuelSurcharge: o.client?.defaultFuelSurchargePercent || 0,
        extraCosts: 0,
        tollCosts: Number(o.tollCost || 0) || 0,
        vatPercent: 19,
        vatType: 'NORMAL',
        issueDate,
        dueDate,
        notes: `Factura pentru comanda ${o.orderNumber || o.referenceNumber || ''}`.trim(),
      });
      await api.patch(`/orders/${o.id}`, { status: 'ready_for_invoice' });
      toast.success(t('toast_invoiceGenerat', 'Factură creată!'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('error', 'Eroare'));
    }
  };

  const drawerOrder = drawerOrderId ? orders.find(o => o.id === drawerOrderId) : null;

  const columns: Column<any>[] = [
    { key: 'ref', label: t('order_ref', 'Order'), sortable: true, render: o => (
      <div className="min-w-0">
        <div className="font-bold text-primary text-[13px] truncate">{o.orderNumber || o.referenceNumber || '—'}</div>
        <div className="text-[11px] text-text-secondary truncate">{o.customerReference ? `Ref: ${o.customerReference}` : o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
      </div>
    ) },
    { key: 'client', label: t('client', 'Client'), sortable: true, render: o => (
      <div className="min-w-0">
        <div className="font-semibold text-text-primary truncate">{o.client?.name || '—'}</div>
        {o.contactPhone && <div className="text-[11px] text-text-secondary flex items-center gap-1 truncate"><Phone className="w-2.5 h-2.5" />{o.contactPhone}</div>}
      </div>
    ) },
    { key: 'route', label: t('route', 'Route'), render: o => {
      const stops = [...(o.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
      const pickup = stops.find((s: any) => s.type === 'pickup');
      const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff');
      const loc = (s: any) => {
        if (!s) return 'TBD';
        const parts = [s.city, s.country].filter(Boolean);
        return parts.length ? parts.join(', ') : (s.address?.split(',')[0] || 'TBD');
      };
      return (
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary min-w-[180px]">
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate max-w-[120px]" title={loc(pickup)}>{loc(pickup)}</span>
          <ArrowRight className="w-3 h-3 shrink-0 opacity-50" />
          <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span className="truncate max-w-[120px]" title={loc(dropoff)}>{loc(dropoff)}</span>
        </div>
      );
    } },
    { key: 'date', label: t('pickup_date', 'Pickup'), sortable: true, render: o => {
      const s = o.stops?.find((x: any) => x.type === 'pickup');
      if (!s?.dateFrom) return <span className="text-text-muted">—</span>;
      return (
        <div className="text-[12px] font-semibold text-text-primary whitespace-nowrap">
          {new Date(s.dateFrom).toLocaleDateString()}
          {s.timeFrom && <span className="text-text-secondary font-medium"> {s.timeFrom}</span>}
        </div>
      );
    } },
    { key: 'type', label: t('type', 'Type'), render: o => (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${(o.transportType || 'ftl') === 'groupage' || (o.transportType || 'ftl') === 'ltl' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900' : (o.transportType || 'ftl') === 'express' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'}`}>
        {(o.transportType || 'ftl').toUpperCase()}
      </span>
    ) },
    { key: 'weight', label: t('cargo', 'Cargo'), sortable: true, align: 'right', hideBelow: 'md', render: o => {
      const w = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
      const ldm = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
      const n = o.cargoItems?.length || 0;
      return (
        <div className="text-right">
          <div className="text-[12px] font-bold text-text-primary">{n} {t('items', 'items')}</div>
          <div className="text-[11px] text-text-secondary whitespace-nowrap">{fmtNumber(w)} kg{ldm > 0 ? ` · ${fmtNumber(ldm, 1)} LDM` : ''}</div>
        </div>
      );
    } },
    { key: 'priority', label: t('priority', 'Priority'), render: o => {
      const p = o.priority || 'normal';
      const cls = p === 'critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' : p === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900' : 'bg-surface text-text-secondary border-border';
      return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${cls}`}>{t(`priority_${p}`, p) as string}</span>;
    } },
    { key: 'price', label: t('price', 'Price'), sortable: true, align: 'right', render: o => (
      <div className="text-right font-bold text-text-primary whitespace-nowrap">{fmtMoney(o.price || 0, o.currency || 'EUR')}</div>
    ) },
    { key: 'status', label: t('status', 'Status'), render: o => <StatusBadge status={o.status} label={t(`status_${o.status}`, o.status.replace(/_/g, ' ')) as string} /> },
    { key: 'actions', label: t('actions', 'Actions'), align: 'right', render: o => {
      const trip = o.trip;
      const trackingToken = trip?.trackingToken;
      const tripStatus = trip?.status || o.status;
      const isActiveTracking = ['assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'in_transit'].includes(tripStatus);
      const isDelivered = ['delivered', 'completed', 'pod_received', 'closed', 'invoiced', 'paid'].includes(tripStatus);

      return (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {o.status !== 'invoiced' && o.status !== 'paid' && o.status !== 'cancelled' && (
            <button title={t('create_invoice', 'Create Invoice')} onClick={() => handleCreateInvoice(o)} className="p-1.5 rounded-md text-text-secondary hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10">
              <FileText className="w-4 h-4" />
            </button>
          )}
          {trackingToken && (
            <button
              title={t('copy_tracking_link', 'Copy Customer Tracking Link')}
              onClick={() => copyTracking(o)}
              className="p-1.5 rounded-md text-text-secondary hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          {isActiveTracking && trip?.id && (
            <button
              title={t('live_tracking_btn', 'Live Tracking')}
              onClick={() => navigate(`/tracking?tripId=${trip.id}`)}
              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              <Navigation className="w-4 h-4 animate-pulse" />
            </button>
          )}
          {isDelivered && trip?.id && (
            <button
              title={t('view_tracking_btn', 'View Tracking')}
              onClick={() => navigate(`/tracking?tripId=${trip.id}`)}
              className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"
            >
              <Navigation className="w-4 h-4" />
            </button>
          )}
          <button title={t('edit', 'Edit')} onClick={() => handleEdit(o.id)} className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10">
            <Pencil className="w-4 h-4" />
          </button>
          <button title={t('delete', 'Delete')} onClick={() => handleDeleteClick(o.id)} className="p-1.5 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      );
    } },
  ];

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all' && v !== '') || search.trim() !== '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-fade-in">
      <KpiStrip items={[
        { key: 'total', label: t('kpi_total', 'Total'), value: orders.length, icon: Box, color: 'text-text-primary', onClick: () => setStatusFilterFromKpi('all'), active: filters.status === 'all' },
        { key: 'planned', label: t('kpi_planned', 'Planned'), value: (statusCounts.new || 0) + (statusCounts.planned || 0), icon: Boxes, color: 'text-amber-600', onClick: () => setStatusFilterFromKpi('planned'), active: filters.status === 'planned' },
        { key: 'active', label: t('kpi_active', 'In transit'), value: (statusCounts.assigned || 0) + (statusCounts.loading || 0) + (statusCounts.in_transit || 0), icon: Activity, color: 'text-blue-600', onClick: () => setStatusFilterFromKpi('in_transit'), active: filters.status === 'in_transit' },
        { key: 'delivered', label: t('kpi_delivered', 'Delivered'), value: (statusCounts.delivered || 0) + (statusCounts.pod_received || 0), icon: Flag, color: 'text-green-600', onClick: () => setStatusFilterFromKpi('delivered'), active: filters.status === 'delivered' },
        { key: 'invoiced', label: t('kpi_invoiced', 'Invoiced'), value: (statusCounts.ready_for_invoice || 0) + (statusCounts.invoiced || 0) + (statusCounts.paid || 0), icon: BadgeEuro, color: 'text-emerald-600', onClick: () => setStatusFilterFromKpi('invoiced'), active: filters.status === 'invoiced' },
        { key: 'revenue', label: t('kpi_revenue', 'Revenue'), value: fmtMoney(totalRevenue), icon: Coins, color: 'text-primary' },
      ]} />

      <div className="card p-0 overflow-hidden border-border">
        <div className="p-3 border-b border-border bg-surface/30 flex flex-col xl:flex-row gap-2 xl:items-center">
          <div className="relative xl:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder', 'Search by reference, client...')} className="input pl-9 bg-white w-full text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <CustomSelect className="w-40" value={filters.status} onChange={v => setFilter('status', v)} options={[{ value: 'all', label: t('all_statuses', 'All statuses') }, ...ORDER_STATUSES.map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} />
            <CustomSelect className="w-48" value={filters.client} onChange={v => setFilter('client', v)} options={clientOptions} />
            <CustomSelect className="w-40" value={filters.country} onChange={v => setFilter('country', v)} options={countryOptions} />
            <CustomSelect className="w-36" value={filters.type} onChange={v => setFilter('type', v)} options={[{ value: 'all', label: t('all_types', 'All types') }, { value: 'ftl', label: 'FTL' }, { value: 'groupage', label: t('transport_groupage', 'Groupage (LTL)') }, { value: 'express', label: t('express', 'Express') }]} />
            <CustomSelect className="w-36" value={filters.priority} onChange={v => setFilter('priority', v)} options={[{ value: 'all', label: t('all_priorities', 'All priorities') }, { value: 'normal', label: t('priority_normal', 'Normal') }, { value: 'high', label: t('priority_high', 'High') }, { value: 'critical', label: t('priority_critical', 'Critical') }]} />
            <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className="input bg-white text-sm w-36" title={t('from_date', 'From date')} />
            <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className="input bg-white text-sm w-36" title={t('to_date', 'To date')} />
            {hasActiveFilters && <button onClick={() => { setSearch(''); setFilters({ status: 'all', client: 'all', country: 'all', type: 'all', priority: 'all', dateFrom: '', dateTo: '' }); }} className="p-2 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title={t('clear_filters', 'Clear filters')}><FilterX className="w-4 h-4" /></button>}
          </div>
          <div className="flex items-center gap-2 shrink-0 xl:ml-auto">
            <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
            <button onClick={() => setShowAiImport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold" title="PDF / Image"><Sparkles className="w-4 h-4 text-primary" />{t('ai_import', 'Import AI')}</button>
            <button onClick={() => setShowExcelImport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold"><FileSpreadsheet className="w-4 h-4 text-emerald-500" />{t('excel_import', 'Import Excel')}</button>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold"><Download className="w-4 h-4" />{t('export_csv', 'Export')}</button>
            <button onClick={handleCreate} className="btn-primary py-2 px-3 flex items-center gap-2 text-sm font-semibold shadow-md shadow-primary/20"><Plus className="w-4 h-4" />{t('addOrder', 'Create Order')}</button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          rowKey={o => o.id}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSortChange={(key, dir) => setSort({ key, dir })}
          loading={loading}
          minWidth="1200px"
          onRowClick={o => { setDrawerOrderId(o.id); setActiveTab('overview'); }}
          emptyState={<div className="p-16 text-center flex flex-col items-center"><div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted"><Box className="w-8 h-8" /></div><h3 className="text-lg font-medium text-text-primary">{t('jsx_noOrdersFound')}</h3><p className="text-text-secondary mt-1 max-w-sm">{t('jsx_getStartedBy')}</p><button onClick={handleCreate} className="btn-secondary mt-6 flex items-center gap-2"><Plus className="w-4 h-4" />{t('jsx_createYourFir')}</button></div>}
          footer={
            <>
              <td colSpan={3} className="px-3.5 py-2.5 text-[12px] font-bold text-text-secondary uppercase tracking-wider">{t('totals', 'Totals')} · {filtered.length} {t('orders', 'orders')}</td>
              <td className="px-3.5 py-2.5 text-right text-[12px] font-bold text-text-secondary">{fmtNumber(totalWeight)} kg</td>
              <td colSpan={4} />
              <td className="px-3.5 py-2.5 text-right text-[13px] font-black text-primary">{fmtMoney(totalRevenue)}</td>
              <td colSpan={2} />
            </>
          }
        />

        <Pagination currentPage={currentPage} totalItems={sorted.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <CustomSelect className="w-44" value="" onChange={v => { if (v) bulkSetStatus(v); }} options={[{ value: '', label: t('bulk_change_status', 'Change status...') }, ...ORDER_STATUSES.filter(s => s !== 'cancelled').map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} />
        <button onClick={() => setConfirmBulkDelete(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-colors"><Trash2 className="w-4 h-4" />{t('delete', 'Delete')}</button>
      </BulkBar>

      <ConfirmModal
        isOpen={confirmBulkDelete}
        title={t('bulk_delete_confirm_title', 'Confirm bulk delete')}
        message={t('bulk_delete_confirm_message', 'Are you sure you want to delete {{count}} selected items? This action cannot be undone.', { count: selected.size })}
        onConfirm={() => { setConfirmBulkDelete(false); bulkDelete(); }}
        onCancel={() => setConfirmBulkDelete(false)}
        type="danger"
      />

      <OrderWizard isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} orderId={selectedOrderId || undefined} onSaved={() => { fetchOrders(); setDrawerOrderId(selectedOrderId); setActiveTab('overview'); }} />

      <ConfirmDeleteModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setOrderToDelete(null); }} onConfirm={confirmDelete} />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={sorted} filename="Orders_HapCargo" title="Orders" sheetName="Orders" getDateField={o => o.stops?.find((s: any) => s.type === 'pickup')?.dateFrom || o.createdAt} headers={orderExportHeaders} />

      {drawerOrder && <OrderDetailDrawer
        order={drawerOrder}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={() => setDrawerOrderId(null)}
        onEdit={id => { setDrawerOrderId(null); handleEdit(id); }}
        onDelete={id => { setDrawerOrderId(null); handleDeleteClick(id); }}
        onRefetch={fetchOrders}
        t={t}
        navigate={navigate}
      />}

      <AiImportModal
        open={showAiImport}
        onClose={() => { setShowAiImport(false); setAiFile(null); setAiPreview(null); }}
        file={aiFile}
        preview={aiPreview}
        busy={aiBusy}
        importing={aiImporting}
        onFileChange={onAiFileChange}
        onScan={scanAiFile}
        onImport={importAiOrder}
      />

      <ExcelImportModal
        open={showExcelImport}
        onClose={() => setShowExcelImport(false)}
        onImported={(count) => {
          if (count > 0) {
            toast.success(t('excel_imported_success', '{{count}} orders imported successfully', { count }));
            fetchOrders();
          }
        }}
      />
    </div>
  );
}

function OrderDetailDrawer({ order, activeTab, setActiveTab, onClose, onEdit, onDelete, t, navigate }: any) {
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (activeTab === 'documents') {
      setDocsLoading(true);
      api.get(`/documents/order/${order.id}`).then(r => setDocuments(r.data)).catch(() => setDocuments([])).finally(() => setDocsLoading(false));
    }
  }, [activeTab, order.id]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('orderId', order.id);
      fd.append('type', 'other');
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('doc_uploaded', 'Document uploaded'));
      const r = await api.get(`/documents/order/${order.id}`);
      setDocuments(r.data);
    } catch (err) {
      toast.error(t('doc_upload_error', 'Upload failed'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deleteDoc = async (id: string) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(docs => docs.filter(d => d.id !== id));
      toast.success(t('global_delete_success', 'Deleted successfully'));
    } catch { toast.error(t('global_delete_error', 'Failed to delete')); }
  };

  const stops = [...(order.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const pickup = stops.find((s: any) => s.type === 'pickup');
  const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff');
  const weight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
  const ldm = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
  const volume = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.volumeCbm || 0), 0) || 0;
  const pallets = order.cargoItems?.reduce((s: number, c: any) => s + (c.unit === 'pallet' ? (Number(c.quantity) || 0) : 0), 0) || 0;

  const Row = ({ label, value, icon }: any) => (
    <div className="flex items-baseline gap-1.5 py-2 border-b border-border/50 last:border-0 flex-wrap">
      <span className="text-xs text-text-secondary font-medium flex items-center gap-1.5 whitespace-nowrap">{icon}{label}:</span>
      <span className="text-[13px] font-semibold text-text-primary">{value || '—'}</span>
    </div>
  );

  const tabs: TabDef[] = [
    { key: 'overview', label: t('tab_overview', 'Overview'), content: (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <StatusBadge type="order" status={order.status} label={t(`status_${order.status}`, order.status.replace(/_/g, ' '))} size="md" />
          {order.trip && <button onClick={() => navigate(`/trips/${order.trip.id}`)} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">{t('open_trip', 'Open trip')} <ExternalLink className="w-3 h-3" /></button>}
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('price', 'Price')}</div>
              <div className="text-lg font-black text-primary">{fmtMoney(order.price || 0, order.currency || 'EUR')}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_cost', 'Est. cost')}</div>
              <div className="text-lg font-black text-text-primary">{fmtMoney(order.estimatedCost || 0, order.currency || 'EUR')}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_profit', 'Est. profit')}</div>
              <div className={`text-lg font-black ${Number(order.estimatedProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtMoney(order.estimatedProfit || 0, order.currency || 'EUR')}</div>
            </div>
          </div>
        </div>
        <div>
          <Row icon={<MapPin className="w-3 h-3 text-blue-500" />} label={t('pickup', 'Pickup')} value={pickup ? [pickup.companyName, pickup.address, pickup.city, pickup.country].filter(Boolean).join(', ') : '—'} />
          <Row icon={<MapPin className="w-3 h-3 text-green-500" />} label={t('dropoff', 'Dropoff')} value={dropoff ? [dropoff.companyName, dropoff.address, dropoff.city, dropoff.country].filter(Boolean).join(', ') : '—'} />
          {(() => {
            const loadRef = order.loadingReference || pickup?.reference;
            const unloadRef = order.unloadingReference || dropoff?.reference;
            return (
              <>
                <Row icon={<FileText className="w-3 h-3 text-amber-500" />} label={t('loading_reference', 'Loading ref')} value={loadRef || '—'} />
                <Row icon={<FileText className="w-3 h-3 text-violet-500" />} label={t('unloading_reference', 'Unloading ref')} value={unloadRef || '—'} />
              </>
            );
          })()}
          <Row icon={<User className="w-3 h-3" />} label={t('contact', 'Contact')} value={`${order.contactPerson || '—'}${order.contactPhone ? ` · ${order.contactPhone}` : ''}`} />
          <Row icon={<Boxes className="w-3 h-3" />} label={t('cargo_summary', 'Cargo')} value={`${order.cargoItems?.length || 0} ${t('items', 'items')} · ${pallets > 0 ? `${fmtNumber(pallets)} pal · ` : ''}${fmtNumber(weight)} kg · ${fmtNumber(ldm, 2)} LDM · ${fmtNumber(volume, 1)} m³`} />
          <Row icon={<Activity className="w-3 h-3" />} label={t('equipment', 'Equipment')} value={(order.equipmentRequirements || []).map((r: string) => r.toUpperCase()).join(', ') || '—'} />
          <Row icon={<Box className="w-3 h-3" />} label={t('transport_type', 'Transport type')} value={(order.transportType || 'ftl').toUpperCase()} />
          <Row icon={<Flag className="w-3 h-3" />} label={t('priority', 'Priority')} value={t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')} />
          <Row icon={<FileText className="w-3 h-3" />} label={t('distance', 'Distance')} value={order.distanceKm ? `${fmtNumber(order.distanceKm)} km` : '—'} />
        </div>
        {order.notes && <div className="bg-surface/40 rounded-xl p-3 border border-border text-[13px] text-text-primary whitespace-pre-wrap">{order.notes}</div>}
        <div className="mt-4">
          <ActivityTimeline entityType="Order" entityId={order.id} createdAt={order.createdAt} createdBy={order.createdBy?.name || order.createdBy?.email} />
        </div>
      </div>
    ) },
    { key: 'cargo', label: t('tab_cargo', 'Cargo'), badge: order.cargoItems?.length || 0, content: (
      <div className="space-y-2">
        {order.cargoItems?.map((c: any, i: number) => (
          <div key={c.id || i} className="bg-surface/40 rounded-xl p-3.5 border border-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-text-primary truncate">{c.description || 'Cargo'}</span>
              <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">×{fmtNumber(c.quantity || 1)} {c.unit}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-text-secondary flex-wrap">
              <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{fmtNumber(c.weightKg || 0)} kg</span>
              {c.ldm ? <span>{fmtNumber(c.ldm, 2)} LDM</span> : null}
              {c.volumeCbm ? <span>{fmtNumber(c.volumeCbm, 1)} m³</span> : null}
              {c.adrClass ? <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">ADR {c.adrClass}</span> : null}
              {c.requiresTemperatureControl ? <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">🌡 {c.temperatureMin ?? c.temperatureMax}°C</span> : null}
              {c.fragile ? <span className="text-amber-600 font-semibold">Fragile</span> : null}
            </div>
          </div>
        ))}
        {(!order.cargoItems || order.cargoItems.length === 0) && <div className="text-sm text-text-secondary text-center py-8">{t('no_cargo', 'No cargo items')}</div>}
      </div>
    ) },
    { key: 'stops', label: t('tab_stops', 'Stops'), badge: stops.length, content: (
      <div className="space-y-0">
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
              </div>
            </div>
          );
        })}
        {stops.length === 0 && <div className="text-sm text-text-secondary text-center py-8">{t('no_stops', 'No stops defined')}</div>}
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
    { key: 'notes', label: t('tab_notes', 'Notes'), content: (
      <div className="space-y-3">
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('internal_notes', 'Internal notes')}</div>
          <div className="text-[13px] text-text-primary whitespace-pre-wrap">{order.notes || '—'}</div>
        </div>
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('references', 'References')}</div>
          <Row label={t('customer_reference', 'Customer ref')} value={order.customerReference} />
          <Row label={t('internal_reference', 'Internal ref')} value={order.internalReference} />
          <Row label={t('loading_reference', 'Loading ref')} value={order.loadingReference} />
          <Row label={t('unloading_reference', 'Unloading ref')} value={order.unloadingReference} />
        </div>
      </div>
    ) },
  ];

  return (
    <DetailDrawer
      open
      onClose={onClose}
      title={<span className="flex items-center gap-2"><Box className="w-4 h-4 text-primary" />{order.orderNumber || order.referenceNumber || 'Order'}</span>}
      subtitle={`${order.client?.name || '—'} · ${t('created_at', 'Created')}: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '—'}`}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      footer={
        <>
          <button onClick={async () => {
             const company = useSettingsStore.getState().company;
             try { await generateOrderPdf(order, company); } catch (e) { toast.error(t('error_pdf', 'Failed to generate PDF')); }
          }} className="btn-secondary flex items-center gap-1.5 text-sm" title="Download PDF"><FileText className="w-4 h-4" />{t('pdf', 'PDF')}</button>
          <button onClick={() => navigate(`/orders/${order.id}`)} className="btn-secondary flex items-center gap-1.5 text-sm"><ExternalLink className="w-4 h-4" />{t('open_order', 'Open page')}</button>
          <button onClick={() => onEdit(order.id)} className="btn-secondary text-sm flex items-center gap-1.5"><Pencil className="w-4 h-4" />{t('edit', 'Edit')}</button>
          <button onClick={() => onDelete(order.id)} className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4" />{t('delete', 'Delete')}</button>
        </>
      }
    />
  );
}
