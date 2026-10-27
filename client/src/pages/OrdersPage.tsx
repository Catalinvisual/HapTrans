import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Loader2, MapPin, FileText, Trash2, Box, Pencil, ExternalLink, Activity, Copy, FilterX, Coins, Boxes, BadgeEuro, ArrowRight, Flag, Phone, User, Navigation, Calendar, Sparkles, UploadCloud, X } from 'lucide-react';
import api from '../lib/api';
import OrderWizard from '../components/orders/OrderWizard';
import OrderDetailDrawer from '../components/orders/OrderDetailDrawer';
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
import ExcelIcon from '../components/icons/ExcelIcon';
import ImportIcon from '../components/icons/ImportIcon';
import PalletIcon from '../components/icons/PalletIcon';
import WeightKgIcon from '../components/icons/WeightKgIcon';
import { formatDateExcel } from '../lib/exportExcel';
import AiImportModal from '../components/AiImportModal';
import ExcelImportModal from '../components/ExcelImportModal';
import AdrBadge from '../components/common/AdrBadge';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore, getCompanySettings } from '../store/settingsStore';
import { generateOrderPdf } from '../lib/pdfGenerator';
import { generateInvoicePdfBase64 } from '../lib/invoicePdfGenerator';
import { getCleanInvoiceFilename } from '../lib/filenameUtils';
import { archiveAndDownloadPdf } from '../lib/pdfArchiveHelper';
import { fmtMoney, fmtNumber } from '../lib/format';
import { countryIso } from '../lib/countries';
import { matchesSearch } from '../lib/search';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

const ORDER_STATUSES = ['draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'cancelled'];

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
  const [showImportMenu, setShowImportMenu] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setShowImportMenu(false);
      }
    };
    if (showImportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showImportMenu]);
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
    return orders.filter(o => {
      if (!matchesSearch(search, o.orderNumber, o.referenceNumber, o.customerReference, o.client?.name, o.contactPerson, o.notes)) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'plannedGroup' && !['new', 'planned'].includes(o.status)) return false;
        else if (filters.status === 'activeGroup' && !['assigned', 'loading', 'in_transit'].includes(o.status)) return false;
        else if (filters.status === 'deliveredGroup' && !['delivered', 'pod_received'].includes(o.status)) return false;
        else if (filters.status === 'invoicedGroup' && !['ready_for_invoice', 'invoiced', 'paid'].includes(o.status)) return false;
        else if (!['plannedGroup', 'activeGroup', 'deliveredGroup', 'invoicedGroup'].includes(filters.status) && o.status !== filters.status) return false;
      }
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
    const clientId = o.client?.id || o.clientId || (typeof o.client === 'string' ? o.client : null);
    if (!clientId) {
      toast.error(t('order_needs_client', 'Comanda trebuie să aibă un client selectat înainte de facturare. Editează comanda și alege un client.'));
      return;
    }

    const loadId = toast.loading(t('archivingToNasLoading', 'Se generează PDF-ul...'));
    try {
      const paymentTermsDays = o.client?.paymentTermsDays || 30;
      const issueDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + paymentTermsDays * 86400000).toISOString().split('T')[0];
      const price = Number(o.price || 0);
      const fuelSurcharge = Number(o.client?.defaultFuelSurchargePercent || 0);
      const fuelCost = fuelSurcharge > 0 ? Number(((price * fuelSurcharge) / 100).toFixed(2)) : 0;
      const tollCosts = Number(o.tollCost || o.tollCosts || 0) || 0;
      const subtotal = Math.round((price + fuelCost + tollCosts) * 100) / 100;
      const vatPercent = 19;
      const vatAmount = Math.round(((subtotal * vatPercent) / 100) * 100) / 100;
      const total = Math.round((subtotal + vatAmount) * 100) / 100;

      const res = await api.post('/invoices', {
        clientId,
        tripId: o.trip?.id || null,
        amount: price,
        fuelSurcharge,
        extraCosts: 0,
        tollCosts,
        vatPercent,
        vatType: 'NORMAL',
        subtotal,
        vatAmount,
        total,
        status: 'approved',
        issueDate,
        dueDate,
        notes: `Factura pentru comanda ${o.orderNumber || o.referenceNumber || ''}`.trim(),
      });
      const savedInvoice = res.data;

      // Generate invoice PDF
      const lang = (i18n.language === 'ro' ? 'en' : (i18n.language as any)) || 'en';
      try {
        const base64Pdf = await generateInvoicePdfBase64(savedInvoice, lang);
        const arr = base64Pdf.split(',');
        const mime = arr[0]?.match(/:(.*?);/)?.[1] || 'application/pdf';
        const bstr = atob(arr[1] || '');
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const invNum = (savedInvoice?.invoiceNumber || `INV-${o.orderNumber || o.id}`).trim();
        const cleanFileName = getCleanInvoiceFilename(invNum, o.client?.name);
        const file = new File([u8arr], cleanFileName, { type: mime });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company', JSON.stringify(getCompanySettings()));
        await api.post(`/invoices/upload-pdf/${savedInvoice.id}`, formData);
      } catch (pdfErr: any) {
        console.warn('PDF upload failed, invoice record is preserved:', pdfErr);
        toast.error((t('invoicePdfWarning', 'Factura a fost creată, dar generarea automată a PDF-ului a eșuat:') + ' ' + (pdfErr?.message || 'Eroare PDF')), { duration: 5000 });
      }

      await api.patch(`/orders/${o.id}`, { status: 'invoiced' });
      await fetchOrders();
      toast.dismiss(loadId);
      toast.success(t('toast_invoiceGenerat', 'Factură generată cu succes! Redirecționare către Facturi...'));
      setTimeout(() => {
        navigate('/invoices');
      }, 500);
    } catch (err: any) {
      toast.dismiss(loadId);
      toast.error(err?.response?.data?.message || t('error', 'Eroare la generarea facturii'));
    }
  };

  const drawerOrder = drawerOrderId ? orders.find(o => o.id === drawerOrderId) : null;

  const columns: Column<any>[] = [
    { key: 'ref', label: t('order_ref', 'Order'), sortable: true, width: '150px', render: o => {
      const created = o.createdAt ? new Date(o.createdAt) : null;
      const isAdr = o.isAdr || (o.adrStatus && o.adrStatus !== 'none') || o.cargoItems?.some((c: any) => c.isAdr || c.adrClass || c.unNumber);
      return (
        <div className="min-w-0 leading-tight space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-primary text-[13px] truncate">{o.orderNumber || o.referenceNumber || '—'}</span>
            {isAdr && (
              <AdrBadge
                status={o.adrStatus}
                points={o.adrTotalPoints}
                exemptionType={o.adrExemptionApplied}
                unNumber={o.cargoItems?.find((c: any) => c.unNumber)?.unNumber}
              />
            )}
          </div>
          <div className="text-[11px] text-text-secondary truncate" title={created ? created.toLocaleString('en-GB') : ''}>
            {created ? created.toLocaleDateString('en-GB') : ''}
          </div>
        </div>
      );
    } },
    { key: 'client', label: t('client', 'Client'), sortable: true, render: o => (
      <div className="min-w-0 flex items-center gap-1">
        <span className="font-semibold text-text-primary truncate" title={o.client?.name || ''}>{o.client?.name || '—'}</span>
        {o.contactPhone && <span className="shrink-0 text-text-muted" title={o.contactPhone}><Phone className="w-3 h-3" /></span>}
      </div>
    ) },
    { key: 'route', label: t('route', 'Route'), render: o => {
      const stops = [...(o.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
      const pickup = stops.find((s: any) => s.type === 'pickup');
      const dropoff = [...stops].reverse().find((s: any) => s.type === 'dropoff');
      const loc = (s: any) => {
        if (!s) return 'TBD';
        const city = s.city || s.address?.split(',')[0] || 'TBD';
        const iso = countryIso(s.country);
        return iso ? `${city} (${iso})` : city;
      };
      const full = (s: any) => (s ? [s.address, s.city, s.country].filter(Boolean).join(', ') : 'TBD');
      return (
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-text-secondary min-w-[170px]">
          <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className="truncate max-w-[110px]" title={full(pickup)}>{loc(pickup)}</span>
          <ArrowRight className="w-3 h-3 shrink-0 opacity-50" />
          <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span className="truncate max-w-[110px]" title={full(dropoff)}>{loc(dropoff)}</span>
        </div>
      );
    } },
    { key: 'date', label: t('pickup_date', 'Pickup'), sortable: true, width: '105px', render: o => {
      const s = o.stops?.find((x: any) => x.type === 'pickup');
      if (!s?.dateFrom) return <span className="text-text-muted">—</span>;
      return (
        <div className="text-[12px] font-semibold text-text-primary whitespace-nowrap">
          {new Date(s.dateFrom).toLocaleDateString()}
          {s.timeFrom && <span className="text-text-secondary font-medium"> {s.timeFrom}</span>}
        </div>
      );
    } },
    { key: 'type', label: t('type', 'Type'), width: '76px', render: o => (
      <span className={`px-1.5 py-px text-[9.5px] font-bold rounded border ${(o.transportType || 'ftl') === 'groupage' || (o.transportType || 'ftl') === 'ltl' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900' : (o.transportType || 'ftl') === 'express' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' : 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'}`}>
        {(o.transportType || 'ftl').toUpperCase()}
      </span>
    ) },
    { key: 'weight', label: t('cargo', 'Cargo'), sortable: true, align: 'left', hideBelow: 'md', width: '150px', render: o => {
      const w = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
      const ldm = o.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
      const n = o.cargoItems?.length || 0;
      const parts = [
        `${n} ${t('items', 'items')}`,
        w > 0 ? `${fmtNumber(w / 1000, 1)}t` : null,
        ldm > 0 ? `${fmtNumber(ldm, 1)} LDM` : null,
      ].filter(Boolean);
      return <span className="text-[12px] font-semibold text-text-primary whitespace-nowrap">{parts.join(' • ')}</span>;
    } },
    { key: 'priority', label: t('priority', 'Priority'), width: '84px', render: o => {
      const p = o.priority || 'normal';
      if (p === 'normal') return <span className="text-[11px] text-text-muted font-semibold">{t('priority_normal', 'Normal')}</span>;
      const cls = p === 'critical' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900';
      return <span className={`px-1.5 py-px text-[9.5px] font-bold uppercase rounded border ${cls}`}>{t(`priority_${p}`, p) as string}</span>;
    } },
    { key: 'price', label: t('price', 'Price'), sortable: true, align: 'right', width: '104px', render: o => (
      <div className="text-right font-bold text-text-primary whitespace-nowrap">{fmtMoney(o.price || 0, o.currency || 'EUR')}</div>
    ) },
    { key: 'status', label: t('status', 'Status'), width: '120px', render: o => <StatusBadge status={o.status} label={t(`status_${o.status}`, o.status.replace(/_/g, ' ')) as string} /> },
    { key: 'actions', label: t('actions', 'Actions'), align: 'right', sticky: 'right', width: '150px', render: o => {
      const trip = o.trip;
      const trackingToken = trip?.trackingToken;
      const tripStatus = trip?.status || o.status;
      const isActiveTracking = ['assigned', 'dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'in_transit'].includes(tripStatus);
      const isDelivered = ['delivered', 'completed', 'pod_received', 'closed', 'invoiced', 'paid'].includes(tripStatus);

      return (
        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          {o.status !== 'invoiced' && o.status !== 'paid' && o.status !== 'cancelled' ? (
            <button title={t('create_invoice', 'Generează factură')} onClick={() => handleCreateInvoice(o)} className="p-1 rounded-md text-text-secondary hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10">
              <FileText className="w-3.5 h-3.5" />
            </button>
          ) : (o.status === 'invoiced' || o.status === 'paid') ? (
            <button title={t('view_invoice', 'Vezi Factura în pagina Facturi')} onClick={() => navigate('/invoices')} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
              <FileText className="w-3.5 h-3.5" />
            </button>
          ) : null}
          {trackingToken && (
            <button
              title={t('copy_tracking_link', 'Copy Customer Tracking Link')}
              onClick={() => copyTracking(o)}
              className="p-1 rounded-md text-text-secondary hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {isActiveTracking && trip?.id && (
            <button
              title={t('live_tracking_btn', 'Live Tracking')}
              onClick={() => navigate(`/tracking?tripId=${trip.id}`)}
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              <Navigation className="w-3.5 h-3.5 animate-pulse" />
            </button>
          )}
          {isDelivered && trip?.id && (
            <button
              title={t('view_tracking_btn', 'View Tracking')}
              onClick={() => navigate(`/tracking?tripId=${trip.id}`)}
              className="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
          )}
          <button title={t('edit', 'Edit')} onClick={() => handleEdit(o.id)} className="p-1 rounded-md text-text-secondary hover:text-primary hover:bg-primary/10">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button title={t('delete', 'Delete')} onClick={() => handleDeleteClick(o.id)} className="p-1 rounded-md text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10">
            <Trash2 className="w-3.5 h-3.5" />
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
        { key: 'planned', label: t('kpi_planned', 'Planned'), value: (statusCounts.new || 0) + (statusCounts.planned || 0), icon: Boxes, color: 'text-amber-600', onClick: () => setStatusFilterFromKpi('plannedGroup'), active: filters.status === 'plannedGroup' },
        { key: 'active', label: t('kpi_active', 'In transit'), value: (statusCounts.assigned || 0) + (statusCounts.loading || 0) + (statusCounts.in_transit || 0), icon: Activity, color: 'text-blue-600', onClick: () => setStatusFilterFromKpi('activeGroup'), active: filters.status === 'activeGroup' },
        { key: 'delivered', label: t('kpi_delivered', 'Delivered'), value: (statusCounts.delivered || 0) + (statusCounts.pod_received || 0), icon: Flag, color: 'text-green-600', onClick: () => setStatusFilterFromKpi('deliveredGroup'), active: filters.status === 'deliveredGroup' },
        { key: 'invoiced', label: t('kpi_invoiced', 'Invoiced'), value: (statusCounts.ready_for_invoice || 0) + (statusCounts.invoiced || 0) + (statusCounts.paid || 0), icon: BadgeEuro, color: 'text-emerald-600', onClick: () => setStatusFilterFromKpi('invoicedGroup'), active: filters.status === 'invoicedGroup' },
        { key: 'revenue', label: t('kpi_revenue', 'Revenue'), value: fmtMoney(totalRevenue), icon: Coins, color: 'text-primary' },
      ]} dense />

      <div className="card p-0 overflow-hidden border-border">
        <div className="px-2.5 py-2 border-b border-border bg-surface/30">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative w-[200px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('searchPlaceholder', 'Search by reference, client...')} className="input pl-8 pr-3 py-1.5 text-xs w-full bg-white" />
            </div>
            <div className="w-[120px] shrink-0"><CustomSelect size="sm" title={t('status', 'Status')} value={filters.status} onChange={v => setFilter('status', v)} options={[{ value: 'all', label: t('status', 'Status') }, ...ORDER_STATUSES.map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g, ' ')) }))]} /></div>
            <div className="w-[140px] shrink-0"><CustomSelect size="sm" title={t('client', 'Client')} value={filters.client} onChange={v => setFilter('client', v)} options={clientOptions.map((o, i) => i === 0 ? { ...o, label: t('client', 'Client') } : o)} /></div>
            <div className="w-[120px] shrink-0"><CustomSelect size="sm" title={t('country', 'Country')} value={filters.country} onChange={v => setFilter('country', v)} options={countryOptions.map((o, i) => i === 0 ? { ...o, label: t('country', 'Country') } : o)} /></div>
            <div className="w-[96px] shrink-0"><CustomSelect size="sm" title={t('type', 'Type')} value={filters.type} onChange={v => setFilter('type', v)} options={[{ value: 'all', label: t('type', 'Type') }, { value: 'ftl', label: 'FTL' }, { value: 'groupage', label: t('transport_groupage', 'Groupage (LTL)') }, { value: 'express', label: t('express', 'Express') }]} /></div>
            <div className="w-[116px] shrink-0"><CustomSelect size="sm" title={t('priority', 'Priority')} value={filters.priority} onChange={v => setFilter('priority', v)} options={[{ value: 'all', label: t('priority', 'Priority') }, { value: 'normal', label: t('priority_normal', 'Normal') }, { value: 'high', label: t('priority_high', 'High') }, { value: 'critical', label: t('priority_critical', 'Critical') }]} /></div>
            <div className="relative shrink-0">
              <Calendar className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <Flatpickr
                value={filters.dateFrom && filters.dateTo ? `${filters.dateFrom} to ${filters.dateTo}` : ''}
                onChange={(dates) => {
                  const [a, b] = dates as Date[];
                  setFilters((f: any) => ({ ...f, dateFrom: a ? ymd(a) : '', dateTo: b ? ymd(b) : '' }));
                }}
                className="input pl-8 pr-3 py-1.5 text-xs w-[190px] bg-card cursor-pointer hover:border-primary/50 transition-colors"
                options={{ mode: 'range', altInput: true, altFormat: 'd M', dateFormat: 'Y-m-d', allowInput: false, showMonths: 1 }}
                placeholder={t('date_range', 'Date range')}
                title={t('date_range', 'Date range')}
              />
            </div>
            {hasActiveFilters && <button onClick={() => { setSearch(''); setFilters({ status: 'all', client: 'all', country: 'all', type: 'all', priority: 'all', dateFrom: '', dateTo: '' }); }} className="p-1.5 rounded-lg text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0" title={t('clear_filters', 'Clear filters')}><FilterX className="w-4 h-4" /></button>}

            <div className="flex items-center gap-1.5 ml-auto shrink-0">
              <span className="text-[11px] text-text-secondary font-medium whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
              <div className="relative shrink-0 flex items-center" ref={importMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowImportMenu((v) => !v)}
                  className="p-1 hover:opacity-85 hover:scale-110 active:scale-95 transition-transform duration-150 shrink-0 cursor-pointer flex items-center justify-center"
                  title={t('import', 'Import')}
                >
                  <ImportIcon className="w-8 h-8" />
                </button>

                {showImportMenu && (
                  <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl p-1.5 min-w-[150px] animate-fade-in flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportMenu(false);
                        setShowAiImport(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text hover:bg-surface hover:text-primary rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                      <span className="whitespace-nowrap">{t('ai_import', 'Import AI')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowImportMenu(false);
                        setShowExcelImport(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-text hover:bg-surface hover:text-primary rounded-lg transition-colors text-left cursor-pointer"
                    >
                      <ExcelIcon className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap">{t('excel_import', 'Import Excel')}</span>
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowExport(true)}
                className="p-1 hover:opacity-85 hover:scale-110 active:scale-95 transition-transform duration-150 shrink-0 cursor-pointer flex items-center justify-center"
                title={t('export_csv', 'Export Excel')}
              >
                <ExcelIcon className="w-8 h-8" />
              </button>
              <button onClick={handleCreate} className="btn-primary py-1.5 px-2.5 flex items-center gap-1.5 text-xs font-semibold shadow-md shadow-primary/20 whitespace-nowrap"><Plus className="w-3.5 h-3.5" />{t('addOrder', 'Create Order')}</button>
            </div>
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
          dense
          minWidth="1040px"
          onRowClick={o => { setDrawerOrderId(o.id); setActiveTab('overview'); }}
          emptyState={<div className="p-16 text-center flex flex-col items-center"><div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted"><Box className="w-8 h-8" /></div><h3 className="text-lg font-medium text-text-primary">{t('jsx_noOrdersFound')}</h3><p className="text-text-secondary mt-1 max-w-sm">{t('jsx_getStartedBy')}</p><button onClick={handleCreate} className="btn-secondary mt-6 flex items-center gap-2"><Plus className="w-4 h-4" />{t('jsx_createYourFir')}</button></div>}
          footer={
            <>
              <td colSpan={3} className="px-3 py-2 text-[12px] font-bold text-text-secondary uppercase tracking-wider">{t('totals', 'Totals')} · {filtered.length} {t('orders', 'orders')}</td>
              <td />
              <td />
              <td className="px-3 py-2 text-right text-[12px] font-bold text-text-secondary whitespace-nowrap"><span className="inline-flex items-center gap-1 justify-end"><WeightKgIcon className="w-3.5 h-3.5" />{fmtNumber(totalWeight)} kg</span></td>
              <td />
              <td className="px-3 py-2 text-right text-[13px] font-black text-primary whitespace-nowrap">{fmtMoney(totalRevenue)}</td>
              <td />
              <td />
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

