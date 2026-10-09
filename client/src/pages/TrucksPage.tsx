import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Download, Truck as TruckIcon, Info, Users, Wrench, Fuel, Battery, Gauge, Boxes, Coins, CalendarDays, CheckCircle2, Settings2, AlertTriangle, User, Mail, Weight, Eye } from 'lucide-react';
import api from '../lib/api';
import { fmtNumber, fmtMoney, fmtKm } from '../lib/format';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import { useFormStore } from '../store/formStore';
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
import { useSettingsStore } from '../store/settingsStore';
import { generateTruckPdf } from '../lib/pdfGenerator';
import { matchesSearch } from '../lib/search';
import { FileText, Calendar, Clock } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import ActivityTimeline from '../components/ActivityTimeline';

const TRUCK_TYPES = [
  { value: 'tautliner', label: 'truck_type_tautliner', default: 'Prelată (Tautliner)' },
  { value: 'frigo', label: 'truck_type_frigo', default: 'Frigorific (Frigo)' },
  { value: 'flatbed', label: 'truck_type_flatbed', default: 'Platformă (Flatbed)' },
  { value: 'mega', label: 'truck_type_mega', default: 'Mega Trailer' },
  { value: 'box', label: 'truck_type_box', default: 'Duba (Box)' },
  { value: 'isoterm', label: 'truck_type_isoterm', default: 'Izoterm' },
  { value: 'other', label: 'truck_type_other', default: 'Altul' }
];

const EURONORMS = ['Euro 3', 'Euro 4', 'Euro 5', 'Euro 6'];
const FEATURES = [
  { id: 'adr', label: 'feat_adr', default: 'ADR', icon: AlertTriangle },
  { id: 'lift', label: 'feat_lift', default: 'Lift Hidraulic', icon: Info },
  { id: 'gps', label: 'feat_gps', default: 'GPS Track', icon: Gauge },
  { id: 'mega', label: 'truck_type_mega', default: 'Mega', icon: Boxes },
  { id: 'frigo', label: 'truck_type_frigo', default: 'Frigo', icon: Battery }
];
const TRUCK_DOC_TYPES = [
  { value: 'apk', label: 'doc_apk', default: 'APK / ITP' },
  { value: 'insurance', label: 'doc_insurance', default: 'Asigurare' },
  { value: 'vignet', label: 'doc_vignet', default: 'Vignet / Tolvignette' },
  { value: 'tir_card', label: 'doc_tir_card', default: 'TIR-caart' },
  { value: 'cmr', label: 'doc_cmr', default: 'CMR' },
  { value: 'other', label: 'doc_other', default: 'Altul' },
];
const TRUCK_STATUSES: SelectOption[] = [
  { value: 'active', label: 'truck_status_active' },
  { value: 'in_trip', label: 'truck_status_in_trip' },
  { value: 'maintenance', label: 'truck_status_maintenance' },
  { value: 'inactive', label: 'truck_status_inactive' },
];

const truckTypeLabel = (truck: any, t: any) => {
  const opt = TRUCK_TYPES.find(o => o.value === (truck.truckType || 'tautliner'));
  return t(opt?.label || 'truck_type_tautliner') || opt?.default || 'Tautliner';
};
const maintWarning = (truck: any) => {
  const next = Number(truck.nextMaintenanceMileage ?? 0);
  const total = Number(truck.totalMileage ?? 0);
  return !!next && total > 0 && (next - total) <= 3000;
};
const maintOverdue = (truck: any) => {
  const next = Number(truck.nextMaintenanceMileage ?? 0);
  const total = Number(truck.totalMileage ?? 0);
  return !!next && total > next;
};
const capLetter = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
function humanName(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (!s.includes('@')) return s;
  const parts = s
    .split('@')[0]
    .split(/[._\-+]+/)
    .map(p => p.replace(/\d+$/g, ''))
    .filter(p => p && !/^(sofer|șofer|driver|drv|user|info|contact|admin|office)$/i.test(p));
  if (parts.length === 2) return `${capLetter(parts[0])} ${capLetter(parts[1])}`;
  if (parts.length > 2) return `${capLetter(parts[0])} ${capLetter(parts[parts.length - 1]).charAt(0)}.`;
  if (parts.length === 1) return capLetter(parts[0]);
  return s;
}
const driverEmail = (d: any) => d?.user?.email || (String(d?.name || '').includes('@') ? d.name : '') || '';
const driverName = (d: any) => {
  const raw = d?.user?.name || d?.name || '';
  if (raw && !String(raw).includes('@')) return raw;
  const mail = driverEmail(d);
  return mail ? humanName(mail) : '—';
};

export default function TrucksPage() {
  const navigate = useNavigate();
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const { t, i18n } = useTranslation();
  const company = useSettingsStore(s => s.company);

  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [showForm, setShowForm] = useState(formStore.trucksShowForm);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({ status: 'all', type: 'all' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerTruckId, setDrawerTruckId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState('overview');
  const [showExport, setShowExport] = useState(false);
  const [docForm, setDocForm] = useState({ type: 'apk', documentNumber: '', expiryDate: '' });

  const [searchParams] = useSearchParams();
  const highlightParam = searchParams.get('highlight');
  const returnToTrip = searchParams.get('returnToTrip');

  const fpOptions = useMemo(() => ({
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    allowInput: false,
    minDate: 'today'
  }), []);

  const initialForm = {
    plateNumber: '', brand: '', model: '', year: '',
    truckType: 'tautliner', euronorm: 'Euro 6', features: [] as string[],
    maxWeightKg: '', maxPallets: '', maxLdm: '', maxVolumeCbm: '', payloadCapacity: '',
    costPerKm: '', fuelConsumption: '', totalMileage: '', nextMaintenanceMileage: '', driverId: '', trailerId: '', status: 'active'
  };

  const [form, setForm] = useState(formStore.trucksForm || initialForm);
  const [editId, setEditId] = useState<string | null>(formStore.trucksEditId);

  useEffect(() => {
    formStore.setFormState('trucks', { showForm, editId, form });
  }, [showForm, editId, form]);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/trucks/${deleteId}`);
      toast.success(t('truckDeleted', 'Camion șters cu succes'));
      load();
    } catch {
      toast.error(t('error', 'Eroare'));
    } finally {
      setDeleteId(null);
    }
  };

  const saveTruckDoc = async (truckId: string) => {
    if (!docForm.type || !docForm.expiryDate) {
      toast.error(t('doc_error', 'Completează tipul și data de expirare'));
      return;
    }
    try {
      await api.post('/trucks/' + truckId + '/documents', {
        type: docForm.type,
        documentNumber: docForm.documentNumber,
        expiryDate: docForm.expiryDate,
      });
      toast.success(t('doc_added', 'Document adăugat'));
      setDocForm({ type: 'apk', documentNumber: '', expiryDate: '' });
      load();
    } catch {
      toast.error(t('doc_error_save', 'Eroare la salvarea documentului'));
    }
  };

  const deleteTruckDoc = async (docId: string) => {
    try {
      await api.delete('/trucks/documents/' + docId);
      toast.success(t('doc_deleted', 'Document șters'));
      load();
    } catch {
      toast.error(t('doc_error_delete', 'Eroare la ștergere'));
    }
  };

  const isDocExpired = (d: any) => !!d.expiryDate && new Date(d.expiryDate) < new Date();
  const isDocExpiringSoon = (d: any) => !!d.expiryDate && !isDocExpired(d) && new Date(d.expiryDate) < new Date(Date.now() + 30 * 86400000);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([api.get('/trucks'), api.get('/drivers'), api.get('/trailers')])
      .then(([trucksRes, driversRes, trailersRes]) => {
        setTrucks(trucksRes.data);
        setDrivers(driversRes.data);
        setTrailers(trailersRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e?: any) => {
    if (e?.preventDefault) e.preventDefault();
    if (!await confirmSave()) return;
    try {
      const payload = {
        ...form,
        maxWeightKg: form.maxWeightKg ? Number(form.maxWeightKg) : null,
        maxPallets: form.maxPallets ? Number(form.maxPallets) : null,
        maxLdm: form.maxLdm ? Number(form.maxLdm) : null,
        maxVolumeCbm: form.maxVolumeCbm ? Number(form.maxVolumeCbm) : null,
        payloadCapacity: form.payloadCapacity ? Number(form.payloadCapacity) : null,
        costPerKm: form.costPerKm ? Number(form.costPerKm) : null,
        fuelConsumption: form.fuelConsumption ? Number(form.fuelConsumption) : null,
        totalMileage: form.totalMileage ? Number(form.totalMileage) : null,
        nextMaintenanceMileage: form.nextMaintenanceMileage ? Number(form.nextMaintenanceMileage) : null,
        year: form.year ? Number(form.year) : null,
        trailerId: form.trailerId || null,
      };

      if (editId) {
        await api.patch(`/trucks/${editId}`, payload);
        toast.success(t('truckUpdated', 'Camion actualizat'));
      } else {
        await api.post('/trucks', payload);
        toast.success(t('truckAdded', 'Camion adăugat'));
      }
      setShowForm(false);
      setEditId(null);
      setForm(initialForm);
      load();
      if (returnToTrip) {
        navigate(`/planning?openTrip=${encodeURIComponent(returnToTrip)}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('saveError', 'Eroare la salvare'));
    }
  };

  const typeOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: t('all_types', 'All types') },
    ...TRUCK_TYPES.map(o => ({ value: o.value, label: t(o.label) || o.default })),
  ], [t]);

  const statusOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: t('all_statuses', 'All statuses') },
    ...TRUCK_STATUSES.map(s => ({ value: s.value, label: t(s.label as string, s.value.replace(/_/g, ' ')) as string })),
  ], [t]);

  const trailerOptions: SelectOption[] = useMemo(() => [
    { value: '', label: t('no_trailer', 'No trailer') },
    ...trailers.map(tr => {
      const assignedTruck = trucks.find(t => t.trailer?.id === tr.id && t.id !== editId);
      return {
        value: tr.id,
        label: tr.plateNumber,
        subLabel: assignedTruck ? `${t('assigned_to', 'Atribuit la')} ${assignedTruck.plateNumber}` : undefined,
        disabled: !!assignedTruck,
      };
    }),
  ], [trailers, trucks, editId, t]);

  const filtered = useMemo(() => {
    return trucks.filter(tr => {
      if (filters.status !== 'all' && tr.status !== filters.status) return false;
      if (filters.type !== 'all' && (tr.truckType || 'tautliner') !== filters.type) return false;
      return matchesSearch(search, tr.plateNumber, tr.brand, tr.model, tr.truckType, tr.euronorm, driverName(tr.driver));
    });
  }, [trucks, search, filters]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), [filtered]);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const inTripCount = trucks.filter(tr => tr.status === 'in_trip').length;
  const availCount = trucks.filter(tr => tr.status === 'active').length;
  const maintCount = trucks.filter(tr => maintOverdue(tr) || maintWarning(tr)).length;
  const withCost = trucks.filter(tr => Number(tr.costPerKm || 0) > 0);
  const avgCost = withCost.length ? withCost.reduce((s, tr) => s + Number(tr.costPerKm), 0) / withCost.length : 0;
  const kpiActiveKey = `${filters.status}_${filters.type}`;

  const kpis = [
    { key: 'total', label: t('kpi_trucks_total', 'Total trucks'), value: trucks.length, icon: TruckIcon, active: kpiActiveKey === 'all_all' && !search, onClick: () => setFilters({ status: 'all', type: 'all' }) },
    { key: 'in_trip', label: t('kpi_trucks_in_trip', 'In trip'), value: inTripCount, color: '#6366f1', icon: CalendarDays, active: filters.status === 'in_trip', onClick: () => setFilters({ status: 'in_trip', type: 'all' }) },
    { key: 'available', label: t('kpi_trucks_available', 'Available'), value: availCount, color: '#22c55e', icon: CheckCircle2, active: filters.status === 'active', onClick: () => setFilters({ status: 'active', type: 'all' }) },
    { key: 'maintenance', label: t('kpi_trucks_maintenance', 'Service due'), value: maintCount, color: maintCount > 0 ? '#ef4444' : '#22c55e', icon: Wrench, onClick: () => setFilters(f => ({ ...f, status: 'maintenance' })) },
    { key: 'avg_cost', label: t('kpi_trucks_avg_cost', 'Avg cost/km'), value: avgCost ? fmtMoney(avgCost) : '—', color: '#f97316', icon: Coins },
  ];

  const setBulkStatus = async (status: string) => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.patch(`/trucks/${id}`, { status })));
      toast.success(`${ids.length} ${t('trucks_updated', 'trucks updated')}`);
      setSelected(new Set());
      load();
    } catch {
      toast.error(t('bulk_update_error', 'Bulk update failed'));
    }
  };
  const bulkDelete = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.delete(`/trucks/${id}`)));
      toast.success(`${ids.length} ${t('trucks_updated', 'trucks deleted')}`);
      setSelected(new Set());
      load();
    } catch {
      toast.error(t('bulk_delete_error', 'Bulk delete failed'));
    }
  };

  const openEdit = (truck: any) => {
    setForm({
      plateNumber: truck.plateNumber || '', brand: truck.brand || '', model: truck.model || '', year: truck.year || '',
      truckType: truck.truckType || 'tautliner', euronorm: truck.euronorm || 'Euro 6', features: truck.features || [],
      maxWeightKg: truck.maxWeightKg || '', maxPallets: truck.maxPallets || '', maxLdm: truck.maxLdm || '', maxVolumeCbm: truck.maxVolumeCbm || '',
      payloadCapacity: truck.payloadCapacity || '', costPerKm: truck.costPerKm || '', fuelConsumption: truck.fuelConsumption || '',
      totalMileage: truck.totalMileage || '', nextMaintenanceMileage: truck.nextMaintenanceMileage || '', driverId: truck.driver?.id || '',
      trailerId: truck.trailer?.id || '', status: truck.status || 'active'
    });
    setEditId(truck.id);
    setShowForm(true);
  };

  useEffect(() => {
    const editIdParam = searchParams.get('editId') || searchParams.get('edit');
    const searchParam = searchParams.get('search');
    if (searchParam && !search) {
      setSearch(searchParam);
    }
    if ((editIdParam || searchParam) && trucks.length > 0) {
      const tr = trucks.find(t => (editIdParam && t.id === editIdParam) || (searchParam && t.plateNumber?.toLowerCase().includes(searchParam.toLowerCase())));
      if (tr) {
        openEdit(tr);
      }
    }
  }, [trucks, searchParams]);

  const toggleFeature = (id: string) => {
    const feats = form.features || [];
    setForm({ ...form, features: feats.includes(id) ? feats.filter((f: string) => f !== id) : [...feats, id] });
  };

  const drawerTruck = drawerTruckId ? trucks.find(tr => tr.id === drawerTruckId) : null;

  const columns: Column<any>[] = [
    {
      key: 'vehicle', label: t('vehicle', 'Vehicle'), width: '220px',
      render: tr => (
        <div>
          <div className="font-bold text-text-primary flex items-center gap-2">
            <TruckIcon className="w-3.5 h-3.5 text-primary" />{tr.plateNumber}
            {tr.trailer && (
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold px-1.5 py-0.2 rounded-md" title={`${t('trailer', 'Trailer')}: ${tr.trailer.plateNumber}`}>
                +{tr.trailer.plateNumber}
              </span>
            )}
          </div>
          <div className="text-[11px] text-text-secondary">{tr.brand} {tr.model}{tr.year ? ` · ${tr.year}` : ''}</div>
        </div>
      ),
    },
    {
      key: 'type', label: t('truckType', 'Type'),
      render: tr => (
        <div>
          <div className="text-xs font-semibold">{truckTypeLabel(tr, t)}</div>
          <div className="text-[11px] text-text-secondary">{tr.euronorm || 'Euro 6'}</div>
        </div>
      ),
      hideBelow: 'md',
    },
    {
      key: 'driver', label: t('driver', 'Driver'),
      render: tr => {
        if (!tr.driver) return <span className="text-xs text-text-muted italic">— {t('unassigned', 'Unassigned')}</span>;
        const email = driverEmail(tr.driver);
        return (
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-primary min-w-0" title={email || driverName(tr.driver)}>
            <User className="w-3 h-3 text-text-muted shrink-0" />
            <span className="truncate">{driverName(tr.driver)}</span>
            {email && <Mail className="w-3 h-3 text-text-muted/60 shrink-0" />}
          </span>
        );
      },
      hideBelow: 'lg',
    },
    {
      key: 'status', label: t('status', 'Status'),
      render: tr => <StatusBadge type="fleet" status={tr.status || 'active'} label={t(`truck_status_${tr.status || 'active'}`, (tr.status || 'active').replace(/_/g, ' ')) as string} />,
    },
    {
      key: 'capacity', label: t('capacity_specs', 'Capacity & specs'), align: 'right', width: '140px',
      render: tr => {
        const w = Number(tr.payloadCapacity || tr.maxWeightKg || 0);
        const pallets = Number(tr.maxPallets || 0);
        const ldm = Number(tr.maxLdm || 0);
        return (
          <div className="text-right leading-tight">
            <div className="text-[12px] font-bold text-text-primary flex items-center justify-end gap-1">
              <Weight className="w-3 h-3 text-text-muted" />{w ? `${fmtNumber(w / 1000, 1)}t` : '—'}
            </div>
            <div className="text-[11px] text-text-secondary flex items-center justify-end gap-1 whitespace-nowrap">
              <Boxes className="w-3 h-3 text-text-muted" />{pallets ? `${pallets} plt` : '—'}{ldm ? ` • ${fmtNumber(ldm, 1)} LDM` : ''}
            </div>
          </div>
        );
      },
    },
    {
      key: 'fuel', label: t('fuel_consumption', 'Fuel'), align: 'right',
      render: tr => <span className="text-xs font-semibold">{Number(tr.fuelConsumption || 0) ? `${tr.fuelConsumption} L/100` : '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'cost', label: t('cost_km', 'Cost/km'), align: 'right',
      render: tr => <span className="text-xs font-bold text-primary">{Number(tr.costPerKm || 0) ? fmtMoney(Number(tr.costPerKm)) : '—'}</span>,
    },
    {
      key: 'service', label: t('next_service', 'Next service'), width: '170px',
      render: tr => {
        // 1. Check if an APK document exists
        const apkDoc = (tr.documents || []).find((d: any) => d.type === 'apk');
        if (apkDoc?.expiryDate) {
          const daysLeft = Math.ceil((new Date(apkDoc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          const barColor = daysLeft <= 0 || daysLeft < 15 ? 'bg-red-500 animate-pulse' : daysLeft < 30 ? 'bg-amber-500' : 'bg-green-500/60';
          const pct = Math.max(0, Math.min(100, Math.round((daysLeft / 365) * 100)));
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <div className="w-10 bg-surface h-1 rounded-full overflow-hidden shrink-0">
                <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct || 100}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-text-secondary">APK {new Date(apkDoc.expiryDate).toLocaleDateString(i18n.language || 'en-GB')}</span>
              {daysLeft <= 0 ? (
                <span className="text-red-500 font-bold text-[11px]">{t('service_overdue', 'Overdue')}</span>
              ) : (
                <span className={daysLeft < 15 ? 'text-red-500 font-bold text-[11px]' : daysLeft < 30 ? 'text-amber-600 font-semibold text-[11px]' : 'text-green-600 font-semibold text-[11px]'}>
                  {daysLeft}d
                </span>
              )}
            </div>
          );
        }

        // 2. Fall back to mileage-based next service
        const next = Number(tr.nextMaintenanceMileage || 0);
        const total = Number(tr.totalMileage || 0);
        if (!next) return <span className="text-xs text-text-muted">—</span>;
        const left = next - total;
        const pct = next > 0 ? Math.min(100, Math.max(0, Math.round((total / next) * 100))) : 0;
        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <div className="w-10 bg-surface h-1 rounded-full overflow-hidden shrink-0">
              <div className={`h-full rounded-full ${left <= 0 ? 'bg-red-500' : left <= 3000 ? 'bg-amber-500' : 'bg-green-500/60'}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-semibold text-text-secondary">{fmtKm(total)}</span>
            {left <= 0 ? <span className="text-red-500 font-bold text-[11px]">{t('service_overdue', 'Overdue')}</span> : left <= 3000 ? <span className="text-amber-600 text-[11px]">{t('service_in', 'in')} {fmtKm(left)}</span> : null}
          </div>
        );
      },
    },
    {
      key: 'docs', label: t('documents', 'Docs'), align: 'center',
      render: tr => {
        const expired = (tr.documents || []).filter((d: any) => isDocExpired(d));
        const soon = (tr.documents || []).filter((d: any) => isDocExpiringSoon(d));
        return (
          <div className="flex items-center justify-center gap-1.5">
            {expired.length > 0 && <span title={t('doc_expired', 'Expirat') as string}><AlertTriangle className="w-3.5 h-3.5 text-red-500" /></span>}
            {soon.length > 0 && <span title={t('doc_expiring', 'Expiră curând') as string}><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
            <span className="text-xs font-semibold">{tr.documents?.length || 0}</span>
          </div>
        );
      },
      hideBelow: 'lg',
    },
    {
      key: 'actions', label: t('actions', 'Actions'), align: 'right', sticky: 'right', width: '150px',
      render: tr => (
        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={async (e) => {
             e.stopPropagation();
             try { await generateTruckPdf(tr, company); } catch (err) { toast.error(t('error_pdf', 'Failed to generate PDF')); }
          }} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('pdf', 'Download PDF')}>
            <FileText className="w-3 h-3" />
          </button>
          <button onClick={() => setDrawerTruckId(tr.id)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('details', 'Details')}><Eye className="w-3 h-3" /></button>
          <button onClick={() => openEdit(tr)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('edit', 'Edit')}><Pencil className="w-3 h-3" /></button>
          <button onClick={() => setDeleteId(tr.id)} className="p-1 text-text-secondary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Delete')}><Trash2 className="w-3 h-3" /></button>
        </div>
      ),
    },
  ];

  const footerCells = [
    <td key="vehicle" colSpan={4} className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary">{filtered.length} {t('results', 'results')}</td>,
    <td key="capacity" className="px-3 py-2 text-right text-xs font-bold text-text-primary whitespace-nowrap">{filtered.length ? `${fmtNumber(Math.round(filtered.reduce((s, tr) => s + Number(tr.payloadCapacity || tr.maxWeightKg || 0), 0) / filtered.length) / 1000, 1)}t` : '—'} · {filtered.reduce((s, tr) => s + Number(tr.maxPallets || 0), 0) || 0} plt</td>,
    <td key="fuel" className="px-3 py-2 text-right text-xs font-bold text-text-primary">—</td>,
    <td key="cost" className="px-3 py-2 text-right text-xs font-bold text-primary whitespace-nowrap">{avgCost ? fmtMoney(avgCost) : '—'}</td>,
    <td key="service" className="px-3 py-2" />,
    <td key="docs" className="px-3 py-2 text-center text-xs font-bold text-text-primary">{filtered.reduce((s, tr) => s + (tr.documents?.length || 0), 0)}</td>,
    <td key="actions" className="px-3 py-2" />,
  ];

  const tabs: TabDef[] = drawerTruck ? [
    {
      key: 'overview', label: t('tab_overview', 'Overview'),
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-surface/50 rounded-xl border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><TruckIcon className="w-6 h-6" /></div>
            <div>
              <div className="font-black text-lg text-text-primary">{drawerTruck.plateNumber}</div>
              <div className="text-sm text-text-secondary">{drawerTruck.brand} {drawerTruck.model}{drawerTruck.year ? ` · ${drawerTruck.year}` : ''}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary">{t('truckType', 'Type')}</div><div className="text-sm font-bold mt-0.5">{truckTypeLabel(drawerTruck, t)}</div></div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary">{t('euronorm', 'Euronorm')}</div><div className="text-sm font-bold mt-0.5">{drawerTruck.euronorm || 'Euro 6'}</div></div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge type="fleet" status={drawerTruck.status || 'active'} label={t(`truck_status_${drawerTruck.status || 'active'}`, (drawerTruck.status || 'active').replace(/_/g, ' ')) as string} size="md" />
            {(drawerTruck.features || []).map((f: string) => (
              <span key={f} className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-text-secondary uppercase">{t(`feat_${f}`, f)}</span>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold uppercase text-text-secondary mb-1 flex items-center gap-1"><Users className="w-3 h-3" />{t('driver', 'Driver')}</div>
              {drawerTruck.driver ? <div className="text-sm font-bold text-text-primary">{driverName(drawerTruck.driver)}</div> : <div className="text-sm text-text-muted italic">{t('no_driver_assigned', 'No driver assigned')}</div>}
            </div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold uppercase text-text-secondary mb-1 flex items-center gap-1"><TruckIcon className="w-3 h-3" />{t('trailer', 'Trailer')}</div>
              {drawerTruck.trailer ? <div className="text-sm font-bold text-text-primary">{drawerTruck.trailer.plateNumber}</div> : <div className="text-sm text-text-muted italic">{t('no_trailer_assigned', 'No trailer assigned')}</div>}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-border/60 grid grid-cols-2 gap-3 text-xs text-text-secondary">
            <div className="flex items-start gap-2 bg-surface/30 p-2.5 rounded-xl border border-border/40">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary mt-0.5 shrink-0">
                <CalendarDays className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">{t('created_at', 'Created')}</div>
                <div className="font-semibold text-text-primary mt-0.5">{formatDate(drawerTruck.createdAt)}</div>
              </div>
            </div>
            <div className="flex items-start gap-2 bg-surface/30 p-2.5 rounded-xl border border-border/40">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-text-secondary tracking-wider">{t('last_updated', 'Last updated')}</div>
                <div className="font-semibold text-text-primary mt-0.5">{formatDate(drawerTruck.updatedAt)}</div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'activity', label: t('tab_activity', 'Activity'),
      content: <ActivityTimeline entityType="Truck" entityId={drawerTruck.id} />
    },
    {
      key: 'specs', label: t('tab_specs', 'Specifications'),
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Boxes className="w-3 h-3" />{t('payload', 'Payload')}</div><div className="text-lg font-black mt-0.5">{fmtNumber(Number(drawerTruck.payloadCapacity || drawerTruck.maxWeightKg || 0))} <span className="text-xs text-text-secondary">kg</span></div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Boxes className="w-3 h-3" />{t('maxPallets', 'Pallets')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.maxPallets || '—'}</div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Gauge className="w-3 h-3" />{t('maxLdm', 'LDM')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.maxLdm ? `${drawerTruck.maxLdm} m` : '—'}</div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Boxes className="w-3 h-3" />{t('maxVolumeCbm', 'Volume')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.maxVolumeCbm ? `${drawerTruck.maxVolumeCbm} m³` : '—'}</div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Fuel className="w-3 h-3" />{t('fuel_consumption', 'Fuel')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.fuelConsumption ? `${drawerTruck.fuelConsumption} L/100km` : '—'}</div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Coins className="w-3 h-3" />{t('cost_km', 'Cost/km')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.costPerKm ? fmtMoney(Number(drawerTruck.costPerKm)) : '—'}</div></div>
        </div>
      ),
    },
    {
      key: 'maintenance', label: t('tab_maintenance', 'Maintenance'),
      content: (
        <div className="space-y-4">
          {maintOverdue(drawerTruck) || maintWarning(drawerTruck) ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-900 flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{maintOverdue(drawerTruck) ? t('service_overdue', 'Maintenance overdue') : t('service_due', 'Maintenance due soon')}
            </div>
          ) : null}
          <div className="bg-surface/50 rounded-xl p-4 border border-border">
            <div className="text-[10px] font-bold uppercase text-text-secondary mb-1 flex items-center gap-1"><Gauge className="w-3 h-3" />{t('mileage', 'Mileage')}</div>
            <div className="text-2xl font-black text-text-primary">{fmtNumber(Number(drawerTruck.totalMileage || 0))} <span className="text-xs text-text-secondary">km</span></div>
            {(() => {
              const apkDoc = (drawerTruck.documents || []).find((d: any) => d.type === 'apk');
              if (apkDoc?.expiryDate) {
                const daysLeft = Math.ceil((new Date(apkDoc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const barColor = daysLeft <= 0 || daysLeft < 15 ? 'bg-red-500 animate-pulse' : daysLeft < 30 ? 'bg-amber-500' : 'bg-green-500/80';
                const pct = Math.max(0, Math.min(100, Math.round((daysLeft / 365) * 100)));
                return (
                  <>
                    <div className="mt-3 text-[10px] font-bold uppercase text-text-secondary mb-1">
                      {t('next_service', 'Next service')} (APK): {new Date(apkDoc.expiryDate).toLocaleDateString(i18n.language || 'en-GB')} 
                      {daysLeft <= 0 ? (
                        <span className="text-red-500 font-bold ml-1">({t('service_overdue', 'Overdue')})</span>
                      ) : (
                        <span className={daysLeft < 15 ? 'text-red-500 font-bold ml-1' : 'ml-1'}>({daysLeft} days left)</span>
                      )}
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct || 100}%` }} />
                    </div>
                  </>
                );
              }

              const next = Number(drawerTruck.nextMaintenanceMileage || 0);
              const total = Number(drawerTruck.totalMileage || 0);
              const left = next - total;
              const barColor = left <= 0 ? 'bg-red-500' : left <= 3000 ? 'bg-amber-500' : 'bg-green-500/80';
              const pct = next > 0 ? Math.min(100, Math.max(0, Math.round((total / next) * 100))) : 0;
              return (
                <>
                  <div className="mt-3 text-[10px] font-bold uppercase text-text-secondary mb-1">{t('next_service', 'Next service')}: {fmtKm(next)}</div>
                  <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                </>
              );
            })()}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Fuel className="w-3 h-3" />{t('fuel_consumption', 'Fuel')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.fuelConsumption ? `${drawerTruck.fuelConsumption} L` : '—'}</div></div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Coins className="w-3 h-3" />{t('cost_km', 'Cost/km')}</div><div className="text-lg font-black mt-0.5">{drawerTruck.costPerKm ? fmtMoney(Number(drawerTruck.costPerKm)) : '—'}</div></div>
          </div>
        </div>
      ),
    },
    {
      key: 'documents', label: t('tab_documents', 'Documents'), badge: drawerTruck.documents?.length || 0,
      content: (
        <div className="space-y-3">
          <div className="bg-surface/50 rounded-xl p-3 border border-border space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{t('add_document', 'Add Document')}</div>
            <CustomSelect className="w-full" value={docForm.type} onChange={v => setDocForm({ ...docForm, type: v })} options={TRUCK_DOC_TYPES.map(dt => ({ value: dt.value, label: t(dt.label) || dt.default }))} />
            <input className="input" placeholder={t('document_number', 'Document number')} value={docForm.documentNumber} onChange={e => setDocForm({ ...docForm, documentNumber: e.target.value })} />
            
            <div className="relative">
              <Calendar className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
              <Flatpickr 
                value={docForm.expiryDate} 
                onChange={(_, dateStr) => setDocForm({ ...docForm, expiryDate: dateStr })} 
                className="input pl-9 w-full bg-card" 
                options={fpOptions} 
                placeholder={t('expiry_date', 'Expiry Date (DD/MM/YYYY)')} 
              />
            </div>
            
            <button className="btn-primary w-full text-sm" onClick={() => saveTruckDoc(drawerTruck.id)}><Plus className="w-3.5 h-3.5 inline mr-1" />{t('save', 'Save')}</button>
          </div>
          {drawerTruck.documents?.length ? (
            <div className="space-y-2">
              {drawerTruck.documents.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl border border-border">
                  <div>
                    <div className="text-sm font-bold text-text-primary">{t(`doc_${d.type || 'other'}`, d.type || 'Document') as string}</div>
                    <div className="text-[11px] text-text-secondary">{(d.documentNumber || '—')}{d.expiryDate ? ` · ${formatDate(d.expiryDate)}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.expiryDate && <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${isDocExpired(d) ? 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400' : isDocExpiringSoon(d) ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'}`}>{isDocExpired(d) ? t('doc_expired', 'Expirat') : isDocExpiringSoon(d) ? t('doc_expiring', 'Expiră curând') : t('doc_valid', 'Valid')}</span>}
                    <button onClick={() => deleteTruckDoc(d.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-text-secondary p-4 text-center">{t('no_documents', 'Niciun document')}</div>}
        </div>
      ),
    },
    {
      key: 'telematics',
      label: t('tab_telematics', 'Telematică & Tahograf'),
      content: (
        <div className="space-y-4">
          {/* Telematics Header */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/60 border border-border">
            <div>
              <div className="text-[10px] font-black uppercase text-text-secondary tracking-wider">Status Conexiune CAN-bus</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE (Test Simulator / FMS)
                </span>
              </div>
            </div>
            <button
              onClick={async () => {
                try {
                  const res = await api.post('/telematics/test-connection', {
                    provider: 'test_simulator',
                    truckId: drawerTruck.id,
                  });
                  if (res.data.success) {
                    toast.success(res.data.message || 'Conexiune validă!');
                  } else {
                    toast.error(res.data.message || 'Conexiune eșuată');
                  }
                } catch (e) {
                  toast.error('Eroare la testarea conexiunii');
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition-all"
            >
              Test Connection
            </button>
          </div>

          {/* Device & Tachograph Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-surface/50 border border-border space-y-1">
              <div className="text-[10px] font-black uppercase text-text-secondary">Dispozitiv Telematic</div>
              <div className="font-black text-sm text-text-primary">TEL-{drawerTruck.plateNumber.replace(/\s+/g, '')}</div>
              <div className="text-xs text-text-secondary">Tip: OBD-II / FMS Gateway</div>
            </div>
            <div className="p-3.5 rounded-2xl bg-surface/50 border border-border space-y-1">
              <div className="text-[10px] font-black uppercase text-text-secondary">Tahograf Digital</div>
              <div className="font-black text-sm text-text-primary">VDO DTCO 4.1b</div>
              <div className="text-xs text-emerald-600 font-bold">Smart Tachograph Gen 2</div>
            </div>
          </div>

          {/* Live Telemetry */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl bg-surface/40 border border-border">
              <div className="text-[10px] font-bold text-text-secondary uppercase">Viteză Live</div>
              <div className="text-base font-black text-text-primary mt-0.5">82 km/h</div>
            </div>
            <div className="p-3 rounded-xl bg-surface/40 border border-border">
              <div className="text-[10px] font-bold text-text-secondary uppercase">Activitate</div>
              <div className="text-base font-black text-emerald-600 mt-0.5">DRIVING</div>
            </div>
            <div className="p-3 rounded-xl bg-surface/40 border border-border">
              <div className="text-[10px] font-bold text-text-secondary uppercase">Pauză în</div>
              <div className="text-base font-black text-amber-600 mt-0.5">2h 15m</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 font-medium flex items-center justify-between">
            <span>Card Șofer: <strong className="text-slate-900">E123456789000100 (Valid)</strong></span>
            <button
              onClick={() => navigate('/telematics/simulator')}
              className="text-primary font-bold hover:underline"
            >
              Deschide în Simulator →
            </button>
          </div>
        </div>
      ),
    },
] : [];

  return (
    <div className="space-y-4 animate-fade-in max-w-[1600px] mx-auto pb-10">
      <KpiStrip items={kpis} dense />

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-2.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
            <div className="relative w-[200px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input className="input pl-8 pr-3 py-1.5 text-xs w-full" placeholder={t('search_trucks', 'Search truck, driver...')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="w-[130px] shrink-0"><CustomSelect size="sm" title={t('status', 'Status')} value={filters.status} onChange={v => setFilters(f => ({ ...f, status: v }))} options={statusOptions.map((o, i) => i === 0 ? { ...o, label: t('status', 'Status') } : o)} /></div>
            <div className="w-[130px] shrink-0"><CustomSelect size="sm" title={t('truckType', 'Type')} value={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} options={typeOptions.map((o, i) => i === 0 ? { ...o, label: t('truckType', 'Type') } : o)} /></div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-1.5 px-2 flex items-center text-xs font-semibold" title={t('export', 'Export')}>
              <Download className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => { setForm(initialForm); setShowForm(true); setEditId(null); }} className="btn-primary py-1.5 px-2.5 flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shadow-md shadow-primary/20">
              <Plus className="w-3.5 h-3.5" /> {t('addTruck', 'Add Truck')}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={paginated}
          rowKey={(tr: any) => tr.id}
          minWidth="1040px"
          dense
          loading={loading}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          onRowClick={(tr: any) => setDrawerTruckId(tr.id)}
          footer={<>{footerCells}</>}
          highlightRow={(tr: any) => maintOverdue(tr) ? 'bg-red-50/40 dark:bg-red-950/20' : ''}
          emptyState={
            <div className="p-16 text-center">
              <TruckIcon className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData', 'No data')}</h3>
              <p className="text-text-secondary">{t('noResult', 'No trucks found. Add a new one.')}</p>
            </div>
          }
        />
      </div>

      {filtered.length > itemsPerPage && (
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      )}

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button onClick={() => setBulkStatus('maintenance')} className="px-3 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-xs font-bold transition-colors"><Wrench className="w-3.5 h-3.5 inline mr-1" />{t('bulk_set_maintenance', 'Service')}</button>
        <button onClick={() => setBulkStatus('active')} className="px-3 py-1 rounded-lg bg-green-500/90 hover:bg-green-500 text-white text-xs font-bold transition-colors"><CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />{t('bulk_set_active', 'Active')}</button>
        <button onClick={() => setConfirmBulkDelete(true)} className="px-3 py-1 rounded-lg bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold transition-colors"><Trash2 className="w-3.5 h-3.5 inline mr-1" />{t('delete', 'Delete')}</button>
      </BulkBar>

      <ConfirmModal
        isOpen={confirmBulkDelete}
        title={t('bulk_delete_confirm_title', 'Confirm bulk delete')}
        message={t('bulk_delete_confirm_message', 'Are you sure you want to delete {{count}} selected items? This action cannot be undone.', { count: selected.size })}
        onConfirm={() => { setConfirmBulkDelete(false); bulkDelete(); }}
        onCancel={() => setConfirmBulkDelete(false)}
        type="danger"
      />

      <DetailDrawer
        open={!!drawerTruck}
        onClose={() => { setDrawerTruckId(null); setDrawerTab('overview'); }}
        title={drawerTruck?.plateNumber || ''}
        subtitle={drawerTruck ? `${drawerTruck.brand} ${drawerTruck.model}` : ''}
        tabs={tabs}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        headerRight={
          drawerTruck ? (
            <button className="btn-secondary px-3 py-1.5 text-xs flex items-center gap-1.5" onClick={() => { setDrawerTruckId(null); openEdit(drawerTruck); }}>
              <Pencil className="w-3.5 h-3.5" /> {t('edit', 'Edit')}
            </button>
          ) : null
        }
      />

      <DetailDrawer
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditId(null);
          if (returnToTrip) {
            navigate(`/planning?openTrip=${encodeURIComponent(returnToTrip)}`);
          }
        }}
        title={
          <span className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-primary" />
            {editId ? t('editTruck', 'Edit Truck') : t('addTruck', 'Add Truck')}
          </span>
        }
        footer={
          <div className="flex gap-3 justify-end w-full">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
                if (returnToTrip) {
                  navigate(`/planning?openTrip=${encodeURIComponent(returnToTrip)}`);
                }
              }}
              className="btn-secondary !px-4 !py-1.5 text-sm font-bold"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button type="button" onClick={handleSubmit} className="btn-primary !px-4 !py-1.5 text-sm font-bold shadow-md shadow-primary/20">{t('save', 'Save')}</button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5">
            <div className="xl:col-span-4 pb-2 mb-2 border-b border-border/50">
              <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Info className="w-4 h-4"/>{t('section_identification') || '1. Identification & Allocation'}</h4>
            </div>
            <div>
              <label className="label font-semibold">{t('plateNumber', 'License Plate')} <span className="text-red-500">*</span></label>
              <input type="text" className="input uppercase" value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value.toUpperCase()})} required autoFocus />
            </div>
            <div><label className="label font-semibold">{t('brand', 'Brand')} <span className="text-red-500">*</span></label><input type="text" className="input" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} required /></div>
            <div><label className="label font-semibold">{t('model', 'Model')} <span className="text-red-500">*</span></label><input type="text" className="input" value={form.model} onChange={e => setForm({...form, model: e.target.value})} required /></div>
            <div><label className="label font-semibold">{t('year', 'Year')} </label><input type="number" className="input" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
            <div className="xl:col-span-2">
                <label className="label">{t('driver', 'Driver')}</label>
                <CustomSelect value={form.driverId} onChange={val => setForm({ ...form, driverId: val })} options={[{ value: '', label: t('no_driver', 'No driver') }, ...drivers.map(dr => ({ value: dr.id, label: driverName(dr) }))]} />
            </div>
              
            <div className="xl:col-span-2">
                <label className="label">{t('trailer', 'Trailer')}</label>
                <CustomSelect value={form.trailerId} onChange={val => setForm({ ...form, trailerId: val })} options={trailerOptions} />
            </div>
            <div className={`transition-all ${highlightParam === 'status' ? 'p-3 rounded-2xl bg-orange-500/10 border-2 border-orange-500 ring-4 ring-orange-500/30 animate-pulse shadow-lg shadow-orange-500/20' : ''}`}>
              <div className="flex items-center justify-between mb-1">
                <label className="label font-semibold mb-0">{t('status', 'Status')}</label>
                {highlightParam === 'status' && (
                  <span className="text-[10px] font-black uppercase text-orange-600 bg-orange-500/20 px-2 py-0.5 rounded-full animate-bounce">
                    ⚠️ Conflict Target
                  </span>
                )}
              </div>
              <CustomSelect value={form.status || 'active'} onChange={v => setForm({...form, status: v})} options={TRUCK_STATUSES.map(st => ({ value: st.value, label: t(st.label as string, st.value) as string }))} />
            </div>

            <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
              <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Settings2 className="w-4 h-4"/>{t('section_tech_specs') || '2. Technical Specs'}</h4>
            </div>
            <div>
              <label className="label font-semibold">{t('truckType', 'Truck Type')}</label>
              <CustomSelect value={form.truckType} onChange={v => setForm({...form, truckType: v})} options={TRUCK_TYPES.map(tOption => ({ value: tOption.value, label: t(tOption.label) || tOption.default }))} />
            </div>
            <div>
              <label className="label font-semibold">{t('euronorm', 'Euronorm')}</label>
              <CustomSelect value={form.euronorm} onChange={v => setForm({...form, euronorm: v})} options={EURONORMS.map(en => ({ value: en, label: en }))} />
            </div>
            <div className="xl:col-span-2">
              <label className="label font-semibold">{t('features', 'Features')}</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {FEATURES.map(feat => {
                  const active = form.features?.includes(feat.id);
                  return (
                    <button type="button" key={feat.id} onClick={() => toggleFeature(feat.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${active ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-secondary hover:border-text-muted'}`}>
                      <feat.icon className="w-3.5 h-3.5" />
                      {t(feat.label) || feat.default}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
              <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Boxes className="w-4 h-4"/>{t('section_capacity') || '3. Load Capacity'}</h4>
            </div>
            <div><label className="label font-semibold">{t('maxWeightKg', 'Max Weight (kg)')}</label><input type="number" className="input" value={form.maxWeightKg} onChange={e => setForm({...form, maxWeightKg: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('payloadCapacity', 'Payload Capacity (kg)')}</label><input type="number" className="input" value={form.payloadCapacity} onChange={e => setForm({...form, payloadCapacity: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('maxPallets', 'Max Pallets')}</label><input type="number" className="input" value={form.maxPallets} onChange={e => setForm({...form, maxPallets: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('maxLdm', 'Max LDM')}</label><input type="number" step="0.1" className="input" value={form.maxLdm} onChange={e => setForm({...form, maxLdm: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('maxVolumeCbm', 'Max Volume (m³)')}</label><input type="number" className="input" value={form.maxVolumeCbm} onChange={e => setForm({...form, maxVolumeCbm: e.target.value})} /></div>
            <div className="xl:col-span-3"></div>

            <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
              <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Fuel className="w-4 h-4"/>{t('section_costs') || '4. Costs & Maintenance'}</h4>
            </div>
            <div><label className="label font-semibold">{t('costPerKm', 'Cost per km (€)')}</label><input type="number" step="0.01" className="input" value={form.costPerKm} onChange={e => setForm({...form, costPerKm: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('fuelConsumption', 'Consumption (l/100km)')}</label><input type="number" step="0.1" className="input" value={form.fuelConsumption} onChange={e => setForm({...form, fuelConsumption: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('totalMileage', 'Total Mileage')}</label><input type="number" className="input" value={form.totalMileage} onChange={e => setForm({...form, totalMileage: e.target.value})} /></div>
            <div><label className="label font-semibold">{t('nextMaintenanceMileage', 'Next Maintenance (km)')}</label><input type="number" className="input" value={form.nextMaintenanceMileage} onChange={e => setForm({...form, nextMaintenanceMileage: e.target.value})} /></div>
          </div>
        </form>
      </DetailDrawer>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Trucks_HapCargo" title="Trucks" sheetName="Trucks" getDateField={tr => tr.createdAt} headers={[
        { key: 'plateNumber', label: 'Plate Number', transform: (v: any) => v || '' },
        { key: 'brand', label: 'Brand', transform: (v: any) => v || '' },
        { key: 'model', label: 'Model', transform: (v: any) => v || '' },
        { key: 'truckType', label: 'Type', transform: (_v: any, tr: any) => truckTypeLabel(tr, t) },
        { key: 'euronorm', label: 'Euronorm', transform: (v: any) => v || '' },
        { key: 'driver', label: 'Driver', transform: (_v: any, tr: any) => driverName(tr.driver) },
        { key: 'status', label: 'Status', transform: (v: any) => v || '' },
        { key: 'payload', label: 'Payload (kg)', transform: (_v: any, tr: any) => tr.payloadCapacity || tr.maxWeightKg },
        { key: 'maxPallets', label: 'Max Pallets', transform: (v: any) => v || '' },
        { key: 'costPerKm', label: 'Cost per km', transform: (v: any) => v || '' },
      ]} />
    </div>
  );
}
