import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Loader2, MapPin, FileText, Trash2, Box, Download, Pencil, ExternalLink, Activity, Copy, FilterX, Coins, Weight, Boxes, BadgeEuro, ArrowRight, Flag, Phone, User } from 'lucide-react';
import api from '../lib/api';
import OrderWizard from '../components/orders/OrderWizard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Pagination from '../components/Pagination';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import PageHeader from '../components/ui/PageHeader';
import KpiStrip from '../components/ui/KpiStrip';
import DetailDrawer from '../components/ui/DetailDrawer';
import type { TabDef } from '../components/ui/DetailDrawer';
import BulkBar from '../components/ui/BulkBar';
import StatusBadge from '../components/ui/StatusBadge';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import { exportCsv } from '../lib/exportCsv';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const ORDER_STATUSES = ['draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'cancelled'];
const ORDER_FLOW: Record<string, string> = {
  draft: 'new', new: 'planned', planned: 'assigned', assigned: 'loading', loading: 'in_transit',
  in_transit: 'delivered', delivered: 'pod_received', pod_received: 'ready_for_invoice',
  ready_for_invoice: 'invoiced', invoiced: 'paid',
};

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
  const { t } = useTranslation();
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
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

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

  const advanceStatus = async (o: any) => {
    const next = ORDER_FLOW[o.status];
    if (!next) return;
    await api.patch(`/orders/${o.id}`, { status: next });
    toast.success(t('status_advanced', 'Status → {next}', { next: t(`status_${next}`, next) }));
    fetchOrders();
  };

  const handleExport = () => {
    exportCsv('orders', sorted.map(o => {
      const pickup = o.stops?.find((s: any) => s.type === 'pickup');
      const dropoff = o.stops?.find((s: any) => s.type === 'dropoff');
      return {
        'Order': o.orderNumber || o.referenceNumber || '',
        'Client': o.client?.name || '',
        'Pickup': pickup ? [pickup.city, pickup.country].filter(Boolean).join(', ') : '',
        'Dropoff': dropoff ? [dropoff.city, dropoff.country].filter(Boolean).join(', ') : '',
        'Date': pickup?.dateFrom || '',
        'Type': o.transportType || 'ftl',
        'Priority': o.priority || 'normal',
        'Weight (kg)': o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0,
        'Price': o.price || 0,
        'Status': o.status,
      };
    }));
  };

  const setStatusFilterFromKpi = (status: string) => { setFilter('status', status); setSelected(new Set()); };

  const copyTracking = async (o: any) => {
    if (!o.trip?.trackingToken) return;
    const url = `${window.location.origin}/track/${o.trip.trackingToken}`;
    try { await navigator.clipboard.writeText(url); toast.success(t('copiedToClipboard', 'Tracking link copied to clipboard!')); } catch { toast.error(t('toast_failedToCopy')); }
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
          <div className="text-[11px] text-text-secondary whitespace-nowrap">{w.toLocaleString()} kg{ldm > 0 ? ` · ${ldm.toFixed(1)} LDM` : ''}</div>
        </div>
      );
    } },
    { key: 'priority', label: t('priority', 'Priority'), render: o => {
      const p = o.priority || 'normal';
      const cls = p === 'critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' : p === 'high' ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900' : 'bg-surface text-text-secondary border-border';
      return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${cls}`}>{t(`priority_${p}`, p)}</span>;
    } },
    { key: 'price', label: t('price', 'Price'), sortable: true, align: 'right', render: o => (
      <div className="text-right font-bold text-text-primary whitespace-nowrap">€{Number(o.price || 0).toLocaleString()}</div>
    ) },
    { key: 'status', label: t('status', 'Status'), render: o => <StatusBadge status={o.status} label={t(`status_${o.status}`, o.status.replace(/_/g, ' '))} /> },
    { key: 'actions', label: t('actions', 'Actions'), align: 'right', render: o => (
      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
        {o.status === 'completed' && <button title={t('create_invoice', 'Create Invoice')} onClick={() => toast.success(t('toast_invoiceGenerat'))} className="p-1.5 rounded-md text-text-secondary hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10"><FileText className="w-4 h-4" /></button>}
        {(o.status === 'in_transit' || o.status === 'assigned') && o.trip?.trackingToken && <button title={t('tracking_link', 'Tracking Link')} onClick={() => copyTracking(o)} className="p-1.5 rounded-md text-text-secondary hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"><Copy className="w-4 h-4" /></button>}
        <button title={t('edit', 'Edit')} onClick={() => handleEdit(o.id)} className="p-1.5 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"><Pencil className="w-4 h-4" /></button>
        <button title={t('delete', 'Delete')} onClick={() => handleDeleteClick(o.id)} className="p-1.5 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="w-4 h-4" /></button>
      </div>
    ) },
  ];

  const hasActiveFilters = Object.values(filters).some(v => v !== 'all' && v !== '') || search.trim() !== '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-5 animate-fade-in">
      <PageHeader
        title={t('orders_title', 'Orders')}
        subtitle={t('orders_subtitle', 'Manage and track all transport orders in one place')}
        breadcrumb={[t('nav_operations', 'Operations'), t('orders_title', 'Orders')]}
        actions={
          <>
            <button onClick={handleExport} className="btn-secondary flex items-center gap-2"><Download className="w-4 h-4" />{t('export_csv', 'Export')}</button>
            <button onClick={handleCreate} className="btn-primary flex items-center gap-2 shadow-lg"><Plus className="w-5 h-5" />{t('addOrder', 'Create Order')}</button>
          </>
        }
      />

      <KpiStrip items={[
        { key: 'total', label: t('kpi_total', 'Total'), value: orders.length, icon: Box, color: 'text-text-primary', onClick: () => setStatusFilterFromKpi('all'), active: filters.status === 'all' },
        { key: 'planned', label: t('kpi_planned', 'Planned'), value: (statusCounts.new || 0) + (statusCounts.planned || 0), icon: Boxes, color: 'text-amber-600', onClick: () => setStatusFilterFromKpi('planned'), active: filters.status === 'planned' },
        { key: 'active', label: t('kpi_active', 'In transit'), value: (statusCounts.assigned || 0) + (statusCounts.loading || 0) + (statusCounts.in_transit || 0), icon: Activity, color: 'text-blue-600', onClick: () => setStatusFilterFromKpi('in_transit'), active: filters.status === 'in_transit' },
        { key: 'delivered', label: t('kpi_delivered', 'Delivered'), value: (statusCounts.delivered || 0) + (statusCounts.pod_received || 0), icon: Flag, color: 'text-green-600', onClick: () => setStatusFilterFromKpi('delivered'), active: filters.status === 'delivered' },
        { key: 'invoiced', label: t('kpi_invoiced', 'Invoiced'), value: (statusCounts.ready_for_invoice || 0) + (statusCounts.invoiced || 0) + (statusCounts.paid || 0), icon: BadgeEuro, color: 'text-emerald-600', onClick: () => setStatusFilterFromKpi('invoiced'), active: filters.status === 'invoiced' },
        { key: 'revenue', label: t('kpi_revenue', 'Revenue'), value: `€${totalRevenue.toLocaleString()}`, icon: Coins, color: 'text-primary' },
      ]} />

      <div className="card p-0 overflow-hidden border-border">
        <div className="p-3 border-b border-border bg-surface/30 flex flex-col xl:flex-row gap-2 xl:items-center">
          <div className="relative xl:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder', 'Search by reference, client...')} className="input pl-9 bg-white w-full text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect className="w-40" value={filters.status} onChange={v => setFilter('status', v)} options={[{ value: 'all', label: t('all_statuses', 'All statuses') }, ...ORDER_STATUSES.map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} />
            <CustomSelect className="w-48" value={filters.client} onChange={v => setFilter('client', v)} options={clientOptions} />
            <CustomSelect className="w-40" value={filters.country} onChange={v => setFilter('country', v)} options={countryOptions} />
            <CustomSelect className="w-36" value={filters.type} onChange={v => setFilter('type', v)} options={[{ value: 'all', label: t('all_types', 'All types') }, { value: 'ftl', label: 'FTL' }, { value: 'groupage', label: t('groupage', 'Groupage') }, { value: 'express', label: t('express', 'Express') }]} />
            <CustomSelect className="w-36" value={filters.priority} onChange={v => setFilter('priority', v)} options={[{ value: 'all', label: t('all_priorities', 'All priorities') }, { value: 'normal', label: t('priority_normal', 'Normal') }, { value: 'high', label: t('priority_high', 'High') }, { value: 'critical', label: t('priority_critical', 'Critical') }]} />
            <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)} className="input bg-white text-sm w-36" title={t('from_date', 'From date')} />
            <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)} className="input bg-white text-sm w-36" title={t('to_date', 'To date')} />
            {hasActiveFilters && <button onClick={() => { setSearch(''); setFilters({ status: 'all', client: 'all', country: 'all', type: 'all', priority: 'all', dateFrom: '', dateTo: '' }); }} className="p-2 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors" title={t('clear_filters', 'Clear filters')}><FilterX className="w-4 h-4" /></button>}
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
              <td className="px-3.5 py-2.5 text-right text-[12px] font-bold text-text-secondary">{totalWeight.toLocaleString()} kg</td>
              <td colSpan={4} />
              <td className="px-3.5 py-2.5 text-right text-[13px] font-black text-primary">€{totalRevenue.toLocaleString()}</td>
              <td colSpan={2} />
            </>
          }
        />

        <Pagination currentPage={currentPage} totalItems={sorted.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <CustomSelect className="w-44" value="" onChange={v => { if (v) bulkSetStatus(v); }} options={[{ value: '', label: t('bulk_change_status', 'Change status...') }, ...ORDER_STATUSES.filter(s => s !== 'cancelled').map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} />
        <button onClick={bulkDelete} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/80 hover:bg-red-500 text-white text-sm font-semibold transition-colors"><Trash2 className="w-4 h-4" />{t('delete', 'Delete')}</button>
      </BulkBar>

      <OrderWizard isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} orderId={selectedOrderId || undefined} onSaved={() => { fetchOrders(); setDrawerOrderId(selectedOrderId); setActiveTab('overview'); }} />

      <ConfirmDeleteModal isOpen={deleteModalOpen} onClose={() => { setDeleteModalOpen(false); setOrderToDelete(null); }} onConfirm={confirmDelete} />

      {drawerOrder && <OrderDetailDrawer
        order={drawerOrder}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onClose={() => setDrawerOrderId(null)}
        onEdit={id => { setDrawerOrderId(null); handleEdit(id); }}
        onDelete={id => { setDrawerOrderId(null); handleDeleteClick(id); }}
        onStatusChange={advanceStatus}
        onRefetch={fetchOrders}
        t={t}
        navigate={navigate}
      />}
    </div>
  );
}

function OrderDetailDrawer({ order, activeTab, setActiveTab, onClose, onEdit, onDelete, onStatusChange, onRefetch, t, navigate }: any) {
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
  const next = ORDER_FLOW[order.status];

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
              <div className="text-lg font-black text-primary">€{Number(order.price || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_cost', 'Est. cost')}</div>
              <div className="text-lg font-black text-text-primary">€{Number(order.estimatedCost || 0).toLocaleString()}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('est_profit', 'Est. profit')}</div>
              <div className={`text-lg font-black ${Number(order.estimatedProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>€{Number(order.estimatedProfit || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div>
          <Row icon={<MapPin className="w-3 h-3 text-blue-500" />} label={t('pickup', 'Pickup')} value={pickup ? [pickup.companyName, pickup.address, pickup.city, pickup.country].filter(Boolean).join(', ') : '—'} />
          <Row icon={<MapPin className="w-3 h-3 text-green-500" />} label={t('dropoff', 'Dropoff')} value={dropoff ? [dropoff.companyName, dropoff.address, dropoff.city, dropoff.country].filter(Boolean).join(', ') : '—'} />
          <Row icon={<User className="w-3 h-3" />} label={t('contact', 'Contact')} value={`${order.contactPerson || '—'}${order.contactPhone ? ` · ${order.contactPhone}` : ''}`} />
          <Row icon={<Boxes className="w-3 h-3" />} label={t('cargo_summary', 'Cargo')} value={`${order.cargoItems?.length || 0} ${t('items', 'items')} · ${weight.toLocaleString()} kg · ${ldm.toFixed(2)} LDM · ${volume.toFixed(1)} m³`} />
          <Row icon={<Activity className="w-3 h-3" />} label={t('equipment', 'Equipment')} value={(order.equipmentRequirements || []).map((r: string) => r.toUpperCase()).join(', ') || '—'} />
          <Row icon={<Box className="w-3 h-3" />} label={t('transport_type', 'Transport type')} value={(order.transportType || 'ftl').toUpperCase()} />
          <Row icon={<Flag className="w-3 h-3" />} label={t('priority', 'Priority')} value={t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')} />
          <Row icon={<FileText className="w-3 h-3" />} label={t('distance', 'Distance')} value={order.distanceKm ? `${Number(order.distanceKm).toLocaleString()} km` : '—'} />
        </div>
        {order.notes && <div className="bg-surface/40 rounded-xl p-3 border border-border text-[13px] text-text-primary whitespace-pre-wrap">{order.notes}</div>}
      </div>
    ) },
    { key: 'cargo', label: t('tab_cargo', 'Cargo'), badge: order.cargoItems?.length || 0, content: (
      <div className="space-y-2">
        {order.cargoItems?.map((c: any, i: number) => (
          <div key={c.id || i} className="bg-surface/40 rounded-xl p-3.5 border border-border">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold text-text-primary truncate">{c.description || 'Cargo'}</span>
              <span className="text-[11px] font-bold text-text-secondary whitespace-nowrap">x{c.quantity || 1} {c.unit}</span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-text-secondary flex-wrap">
              <span className="flex items-center gap-1"><Weight className="w-3 h-3" />{Number(c.weightKg || 0).toLocaleString()} kg</span>
              {c.ldm ? <span>{Number(c.ldm).toFixed(2)} LDM</span> : null}
              {c.volumeCbm ? <span>{Number(c.volumeCbm).toFixed(1)} m³</span> : null}
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
        <div className="bg-surface/40 rounded-xl p-4 border border-border">
          <div className="text-[10px] font-bold uppercase text-text-secondary mb-1">{t('timestamps', 'Timestamps')}</div>
          <Row label={t('created_at', 'Created')} value={order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'} />
          <Row label={t('updated_at', 'Updated')} value={order.updatedAt ? new Date(order.updatedAt).toLocaleString() : '—'} />
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
          <button onClick={() => navigate(`/orders/${order.id}`)} className="btn-secondary flex items-center gap-1.5 text-sm"><ExternalLink className="w-4 h-4" />{t('open_order', 'Open page')}</button>
          {next && <button onClick={() => onStatusChange(order)} className="btn-primary text-sm flex items-center gap-1.5"><ArrowRight className="w-4 h-4" />{t('advance_to', 'Advance → {s}', { s: t(`status_${next}`, next.replace(/_/g, ' ')) })}</button>}
          <button onClick={() => onEdit(order.id)} className="btn-secondary text-sm flex items-center gap-1.5"><Pencil className="w-4 h-4" />{t('edit', 'Edit')}</button>
          <button onClick={() => onDelete(order.id)} className="btn-secondary text-sm flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50"><Trash2 className="w-4 h-4" />{t('delete', 'Delete')}</button>
        </>
      }
    />
  );
}
