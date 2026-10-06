import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import PortalOrderDrawer from '../../components/orders/PortalOrderDrawer';
import { Plus, Search, MapPin, ArrowRight, Box, Boxes, Activity, Flag, BadgeEuro, FilterX } from 'lucide-react';
import portalApi from '../../lib/portalApi';
import { fmtMoney, fmtNumber } from '../../lib/format';
import { matchesSearch } from '../../lib/search';
import CustomSelect from '../../components/CustomSelect';
import Pagination from '../../components/Pagination';
import DataTable from '../../components/ui/DataTable';
import type { Column } from '../../components/ui/DataTable';
import KpiStrip from '../../components/ui/KpiStrip';
import StatusBadge from '../../components/ui/StatusBadge';
import OrderWizard from '../../components/orders/OrderWizard';

const ORDER_STATUSES = ['draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'cancelled'];

function sortValue(o: any, key: string): any {
  switch (key) {
    case 'ref': return (o.orderNumber || '').toLowerCase();
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

export default function PortalOrdersPage() {
  const { t } = useTranslation();
  const [drawerOrderId, setDrawerOrderId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequest, setShowRequest] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const res = await portalApi.get('/portal/orders');
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setCurrentPage(1); }, [search, status]);

  const filtered = useMemo(() => orders.filter(o => {
    if (!matchesSearch(search, o.orderNumber, o.internalReference, o.customerReference, o.stops?.map((s: any) => `${s.city || ''} ${s.address || ''}`).join(' '))) return false;
    if (status === 'plannedGroup') return ['new', 'planned'].includes(o.status);
    if (status === 'activeGroup') return ['assigned', 'loading', 'in_transit'].includes(o.status);
    if (status === 'deliveredGroup') return ['delivered', 'pod_received'].includes(o.status);
    if (status === 'invoicedGroup') return ['ready_for_invoice', 'invoiced', 'paid'].includes(o.status);
    if (status !== 'all') return o.status === status;
    return true;
  }), [orders, search, status]);

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
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    orders.forEach(o => { c[o.status] = (c[o.status] || 0) + 1; });
    return c;
  }, [orders]);

  const loc = (s: any) => {
    if (!s) return 'TBD';
    const parts = [s.city, s.country].filter(Boolean);
    return parts.length ? parts.join(', ') : (s.address?.split(',')[0] || 'TBD');
  };

  const columns: Column<any>[] = [
    { key: 'ref', label: t('order_ref', 'Order'), sortable: true, render: o => (
      <div className="min-w-0">
        <div className="font-bold text-primary text-[13px] truncate">{o.orderNumber || '—'}</div>
        <div className="text-[11px] text-text-secondary truncate">{o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB') : ''}</div>
      </div>
    ) },
    { key: 'route', label: t('route', 'Route'), render: o => {
      const stops = [...(o.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
      const pickup = stops.find((s: any) => s.type === 'pickup');
      const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff');
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
    { key: 'type', label: t('type', 'Type'), render: o => {
      const tp = o.transportType || 'ftl';
      const cls = tp === 'groupage' || tp === 'ltl' ? 'bg-orange-100 text-orange-700 border-orange-200' : tp === 'express' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-blue-100 text-blue-700 border-blue-200';
      return <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${cls}`}>{tp.toUpperCase()}</span>;
    } },
    { key: 'weight', label: t('cargo', 'Cargo'), sortable: true, align: 'right', hideBelow: 'md', render: o => {
      const w = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
      const ldm = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
      return (
        <div className="text-right">
          <div className="text-[12px] font-bold text-text-primary">{o.cargoItems?.length || 0} {t('items', 'items')}</div>
          <div className="text-[11px] text-text-secondary whitespace-nowrap">{fmtNumber(w)} kg{ldm > 0 ? ` · ${fmtNumber(ldm, 1)} LDM` : ''}</div>
        </div>
      );
    } },
    { key: 'price', label: t('price', 'Price'), sortable: true, align: 'right', render: o => (
      <div className="text-right font-bold text-text-primary whitespace-nowrap">{o.price ? fmtMoney(o.price, o.currency || 'EUR') : '—'}</div>
    ) },
    { key: 'status', label: t('status', 'Status'), render: o => <StatusBadge status={o.status} label={t(`status_${o.status}`, String(o.status || '').replace(/_/g, ' ')) as string} /> },
  ];

  const hasActiveFilters = status !== 'all' || search.trim() !== '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 animate-fade-in">
      <KpiStrip items={[
        { key: 'total', label: t('kpi_total', 'Total'), value: orders.length, icon: Box, color: 'text-text-primary', onClick: () => setStatus('all'), active: status === 'all' },
        { key: 'planned', label: t('kpi_planned', 'Planned'), value: (counts.new || 0) + (counts.planned || 0), icon: Boxes, color: 'text-amber-600', onClick: () => setStatus('plannedGroup'), active: status === 'plannedGroup' },
        { key: 'active', label: t('kpi_active', 'In transit'), value: (counts.assigned || 0) + (counts.loading || 0) + (counts.in_transit || 0), icon: Activity, color: 'text-blue-600', onClick: () => setStatus('activeGroup'), active: status === 'activeGroup' },
        { key: 'delivered', label: t('kpi_delivered', 'Delivered'), value: (counts.delivered || 0) + (counts.pod_received || 0), icon: Flag, color: 'text-green-600', onClick: () => setStatus('deliveredGroup'), active: status === 'deliveredGroup' },
        { key: 'invoiced', label: t('kpi_invoiced', 'Invoiced'), value: (counts.ready_for_invoice || 0) + (counts.invoiced || 0) + (counts.paid || 0), icon: BadgeEuro, color: 'text-emerald-600', onClick: () => setStatus('invoicedGroup'), active: status === 'invoicedGroup' },
      ]} />

      <div className="card p-0 overflow-hidden border-border">
        <div className="p-3 border-b border-border bg-surface/30">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px] max-w-[16rem] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder', 'Search by reference, city...')} className="input pl-9 bg-white w-full text-sm" />
            </div>
            <CustomSelect className="w-40 shrink-0" value={ORDER_STATUSES.includes(status) ? status : 'all'} onChange={v => setStatus(v)} options={[{ value: 'all', label: t('all_statuses', 'All statuses') }, ...ORDER_STATUSES.map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} />
            {hasActiveFilters && <button onClick={() => { setSearch(''); setStatus('all'); }} className="p-2 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 transition-colors shrink-0" title={t('clear_filters', 'Clear filters')}><FilterX className="w-4 h-4" /></button>}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              <span className="text-xs text-text-secondary font-medium whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
              <button onClick={() => setShowRequest(true)} className="btn-primary py-2 px-3 flex items-center gap-2 text-sm font-semibold shadow-md shadow-primary/20 whitespace-nowrap"><Plus className="w-4 h-4" />{t('addOrder', 'Create Order')}</button>
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          rowKey={o => o.id}
          sortKey={sort.key}
          sortDir={sort.dir}
          onSortChange={(key, dir) => setSort({ key, dir })}
          loading={loading}
          minWidth="900px"
          onRowClick={o => setDrawerOrderId(o.id)}
          emptyState={<div className="p-16 text-center flex flex-col items-center"><div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted"><Box className="w-8 h-8" /></div><h3 className="text-lg font-medium text-text-primary">{t('jsx_noOrdersFound')}</h3><button onClick={() => setShowRequest(true)} className="btn-secondary mt-6 flex items-center gap-2"><Plus className="w-4 h-4" />{t('addOrder', 'Create Order')}</button></div>}
        />

        <Pagination currentPage={currentPage} totalItems={sorted.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <OrderWizard isPortal={true} isOpen={showRequest} onClose={() => setShowRequest(false)} onSaved={fetchOrders} />
      {drawerOrderId && orders.find(o => o.id === drawerOrderId) && (
        <PortalOrderDrawer order={orders.find(o => o.id === drawerOrderId)} onClose={() => setDrawerOrderId(null)} />
      )}
    </div>
  );
}