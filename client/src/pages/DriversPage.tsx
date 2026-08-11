import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, Download, User, Phone, FileText, Calendar, Key, Mail, Truck as TruckIcon, Coins, AlertCircle, BadgeCheck, CalendarDays, Save } from 'lucide-react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import KpiStrip from '../components/ui/KpiStrip';
import DetailDrawer from '../components/ui/DetailDrawer';
import type { TabDef } from '../components/ui/DetailDrawer';
import BulkBar from '../components/ui/BulkBar';
import ExportModal from '../components/ExportModal';
import { formatDateExcel } from '../lib/exportExcel';

const STATUS_COLORS: Record<string, string> = {
  available: 'text-success',
  in_trip: 'text-primary',
  off: 'text-text-secondary',
  sick: 'text-error',
  vacation: 'text-warning'
};
const STATUS_LABELS: Record<string, string> = {
  available: 'available',
  in_trip: 'inTrip',
  off: 'unavailable',
  sick: 'sick',
  vacation: 'vacation'
};
const STATUS_OPTIONS: SelectOption[] = [
  { value: 'available', label: 'available' },
  { value: 'in_trip', label: 'inTrip' },
  { value: 'off', label: 'unavailable' },
  { value: 'sick', label: 'sick' },
  { value: 'vacation', label: 'vacation' },
];
const DRIVER_ACTIVE = ['available', 'in_trip'];

export default function DriversPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const { t, i18n } = useTranslation();
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(formStore.driversShowForm);
  const [editId, setEditId] = useState<string | null>(formStore.driversEditId);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [filters, setFilters] = useState<any>({ status: 'all' });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drawerDriverId, setDrawerDriverId] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const fpOptions = useMemo(() => ({
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    allowInput: false,
    minDate: 'today'
  }), []);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);

  const [form, setForm] = useState(formStore.driversForm || {
    name: '',
    email: '',
    password: '',
    phone: '',
    licenseNumber: '',
    dailyRate: '',
    grossSalary: '',
    licenseExpiry: '',
    medicalExpiry: '',
    tachoCardExpiry: '',
    status: 'available',
    truckId: ''
  });
  useEffect(() => {
    formStore.setFormState('drivers', { showForm, editId, form });
  }, [showForm, editId, form]);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/drivers');
      setDrivers(r.data);
    } catch (err) {
      toast.error(t("toast_eroareLaNcR"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadTrucks = useCallback(async () => {
    try {
      const r = await api.get('/trucks');
      setTrucks(r.data);
    } catch (err) {}
  }, []);
  useEffect(() => {
    loadDrivers();
    loadTrucks();
  }, [loadDrivers, loadTrucks]);

  const isExpiringSoon = (date: string) => date && new Date(date) < new Date(Date.now() + 30 * 86400000);
  const isExpired = (date: string) => date && new Date(date) < new Date();
  const docState = (date: string) => isExpired(date) ? 'expired' : isExpiringSoon(date) ? 'soon' : 'ok';

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm({ ...form, password: pass });
    toast.success(t('passwordGenerated'));
  };
  const isPastDate = (val: string) => {
    if (editId || !val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };
  const getErrorMessage = () => {
    const lg = i18n?.language || 'en';
    if (lg === 'ro') return 'Data nu poate fi în trecut.';
    if (lg === 'nl') return 'Datum mag niet in het verleden liggen.';
    if (lg === 'de') return 'Datum darf nicht in der Vergangenheit liegen.';
    if (lg === 'fr') return 'La date ne peut pas être dans le passé.';
    if (lg === 'es') return 'La fecha no puede estar en el pasado.';
    if (lg === 'pl') return 'Data nie może być w przeszłości.';
    return 'Date cannot be in the past.';
  };
  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!await confirmSave()) return;
    if (isPastDate(form.licenseExpiry) || isPastDate(form.medicalExpiry) || isPastDate(form.tachoCardExpiry)) {
      toast.error(getErrorMessage());
      return;
    }
    try {
      if (editId) {
        await api.patch(`/drivers/${editId}`, form);
        toast.success(t("toast_OferActualiza"));
      } else {
        if (!form.email || !form.password) {
          toast.error(t("toast_emailulIParo"));
          return;
        }
        await api.post('/drivers', form);
        toast.success(t("toast_OferCreatCu"));
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        name: '', email: '', password: '', phone: '',
        licenseNumber: '', dailyRate: '', grossSalary: '',
        licenseExpiry: '', medicalExpiry: '', tachoCardExpiry: '',
        status: 'available', truckId: ''
      });
      loadDrivers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Eroare la salvare.';
      toast.error(msg);
    }
  };
  const handleEdit = (d: any) => {
    setForm({
      name: d.user?.name || '',
      email: d.user?.email || '',
      password: '',
      phone: d.phone || '',
      licenseNumber: d.licenseNumber || '',
      dailyRate: d.dailyRate || d.user?.dailyRate || '',
      grossSalary: d.grossSalary || d.user?.grossSalary || '',
      licenseExpiry: d.licenseExpiry ? d.licenseExpiry.slice(0, 10) : '',
      medicalExpiry: d.medicalExpiry ? d.medicalExpiry.slice(0, 10) : '',
      tachoCardExpiry: d.tachoCardExpiry ? d.tachoCardExpiry.slice(0, 10) : '',
      status: d.status || 'available',
      truckId: d.trucks?.[0]?.id || ''
    });
    setEditId(d.id);
    setShowForm(true);
  };
  const handleDelete = (id: string) => setDeleteId(id);
  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/drivers/${deleteId}`);
      toast.success(t('success') || 'Șoferul a fost șters!');
      loadDrivers();
    } catch (err) {
      toast.error(t('error') || 'Eroare la ștergerea șoferului.');
    } finally {
      setDeleteId(null);
    }
  };

  const setDriverStatus = async (d: any, val: string) => {
    try {
      await api.patch(`/drivers/${d.id}`, { status: val });
      toast.success(t('statusUpdated'));
      loadDrivers();
    } catch {
      toast.error(t('error'));
    }
  };

  const filtered = useMemo(() => drivers.filter(d => {
    if (filters.status === 'off') {
      if (!['off', 'sick', 'vacation'].includes(d.status)) return false;
    } else if (filters.status !== 'all' && d.status !== filters.status) return false;
    const query = search.toLowerCase();
    return (d.user?.name || '').toLowerCase().includes(query) || (d.user?.email || '').toLowerCase().includes(query) || (d.licenseNumber || '').toLowerCase().includes(query) || (d.phone || '').toLowerCase().includes(query) || (d.status || '').toLowerCase().includes(query);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()), [drivers, search, filters]);

  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useShortcuts({
    'shift+n': () => {
      if (!showForm) {
        setForm({
          name: '', email: '', password: '', phone: '', licenseNumber: '',
          licenseExpiry: '', medicalExpiry: '', tachoCardExpiry: '',
          status: 'available', truckId: ''
        });
        setEditId(null);
        setShowForm(true);
      }
    },
    'ctrl+s': e => { if (showForm) handleSubmit(e); },
    'escape': () => { if (showForm) setShowForm(false); }
  });
  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: d => setDrawerDriverId(d.id),
    onDelete: d => handleDelete(d.id),
    isActive: !showForm
  });

  const statusOptions = useMemo<SelectOption[]>(() => [
    { value: 'all', label: t('all_statuses', 'All statuses') },
    ...STATUS_OPTIONS.map(s => ({ value: s.value, label: t(s.label, s.value.replace(/_/g, ' ')) })),
  ], [t]);

  const availCount = drivers.filter(d => d.status === 'available').length;
  const inTripCount = drivers.filter(d => d.status === 'in_trip').length;
  const offCount = drivers.filter(d => ['off', 'sick', 'vacation'].includes(d.status)).length;
  const docDates = (d: any) => [d.licenseExpiry, d.medicalExpiry, d.tachoCardExpiry].filter(Boolean);
  const expiredCount = drivers.filter(d => docDates(d).some(dt => isExpired(dt))).length;
  const soonCount = drivers.filter(d => docDates(d).some(dt => !isExpired(dt) && isExpiringSoon(dt))).length;

  const kpis = [
    { key: 'total', label: t('kpi_drivers_total', 'Total drivers'), value: drivers.length, icon: User, active: filters.status === 'all' && !search, onClick: () => setFilters({ status: 'all' }) },
    { key: 'available', label: t('kpi_drivers_available', 'Available'), value: availCount, color: '#22c55e', icon: BadgeCheck, active: filters.status === 'available', onClick: () => setFilters({ status: 'available' }) },
    { key: 'in_trip', label: t('kpi_drivers_in_trip', 'In trip'), value: inTripCount, color: '#6366f1', icon: CalendarDays, active: filters.status === 'in_trip', onClick: () => setFilters({ status: 'in_trip' }) },
    { key: 'off', label: t('kpi_drivers_off', 'Off / leave'), value: offCount, color: '#f59e0b', icon: TruckIcon, active: ['off', 'sick', 'vacation'].includes(filters.status), onClick: () => setFilters(f => ({ ...f, status: 'off' })) },
    { key: 'expired', label: t('kpi_drivers_expiring', 'Docs expired'), value: expiredCount, color: expiredCount > 0 ? '#ef4444' : '#22c55e', icon: AlertCircle },
    { key: 'soon', label: t('kpi_drivers_expiring_soon', 'Expiring in 30d'), value: soonCount, color: soonCount > 0 ? '#f59e0b' : '#22c55e', icon: Calendar },
  ];

  const setBulkStatus = async (status: string) => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.patch(`/drivers/${id}`, { status })));
      toast.success(`${ids.length} ${t('drivers_updated', 'drivers updated')}`);
      setSelected(new Set());
      loadDrivers();
    } catch {
      toast.error(t('bulk_update_error', 'Bulk update failed'));
    }
  };
  const bulkDelete = async () => {
    const ids = [...selected];
    try {
      await Promise.all(ids.map(id => api.delete(`/drivers/${id}`)));
      toast.success(`${ids.length} ${t('drivers_updated', 'drivers deleted')}`);
      setSelected(new Set());
      loadDrivers();
    } catch {
      toast.error(t('bulk_delete_error', 'Bulk delete failed'));
    }
  };

  const driverAssignedTruck = (d: any) => d.trucks?.[0] || trucks.find(tr => tr.driver?.id === d.id);

  const expDateCell = (date: string) => {
    if (!date) return <span className="text-xs text-text-muted">—</span>;
    const st = docState(date);
    return (
      <span className={`flex items-center gap-1 text-xs font-semibold whitespace-nowrap ${st === 'expired' ? 'text-error' : st === 'soon' ? 'text-warning' : 'text-success'}`}>
        {(st !== 'ok') && <AlertCircle className="w-3.5 h-3.5" />}
        {formatDate(date)}
      </span>
    );
  };

  const columns: Column<any>[] = [
    {
      key: 'name', label: t('name', 'Name'), width: '200px',
      render: d => (
        <div>
          <div className="font-bold text-text-primary flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><User className="w-3 h-3" /></span>
            {d.user?.name || '—'}
          </div>
          <div className="text-[11px] text-text-secondary">{d.user?.email || ''}</div>
        </div>
      ),
    },
    {
      key: 'phone', label: t('phone', 'Phone'),
      render: d => d.phone ? <span className="text-xs font-medium text-text-secondary whitespace-nowrap">{d.phone}</span> : <span className="text-xs text-text-muted">—</span>,
      hideBelow: 'md',
    },
    {
      key: 'license', label: t('licenseNumber', 'License'),
      render: d => <span className="text-xs font-semibold text-text-secondary">{d.licenseNumber || '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'truck', label: t('truck', 'Truck'),
      render: d => {
        const tr = driverAssignedTruck(d);
        return tr ? <span className="text-xs font-semibold text-primary whitespace-nowrap">{tr.plateNumber}</span> : <span className="text-xs text-text-muted italic">{t('no_truck', 'Free')}</span>;
      },
      hideBelow: 'lg',
    },
    {
      key: 'dailyRate', label: t('dailyAllowance', 'Daily'), align: 'right',
      render: d => <span className="text-xs font-semibold text-text-secondary">{(d.user?.dailyRate || d.dailyRate) ? `€${Number(d.user?.dailyRate ?? d.dailyRate).toFixed(2)}` : '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'grossSalary', label: t('grossSalary', 'Gross'), align: 'right',
      render: d => <span className="text-xs font-bold text-text-primary">{(d.user?.grossSalary || d.grossSalary) ? `€${Number(d.user?.grossSalary ?? d.grossSalary).toFixed(2)}` : '—'}</span>,
      hideBelow: 'lg',
    },
    {
      key: 'licenseExpiry', label: t('expLicense', 'License exp.'), render: d => expDateCell(d.licenseExpiry),
    },
    {
      key: 'medicalExpiry', label: t('expMedical', 'Medical exp.'), render: d => expDateCell(d.medicalExpiry), hideBelow: 'md',
    },
    {
      key: 'tachoExpiry', label: t('expTacho', 'Tacho exp.'), render: d => expDateCell(d.tachoCardExpiry), hideBelow: 'md',
    },
    {
      key: 'docs', label: t('documents', 'Docs'), align: 'center',
      render: d => <span className="text-xs font-semibold">{d.documents?.length || 0}</span>,
      hideBelow: 'xl',
    },
    {
      key: 'status', label: t('status', 'Status'),
      render: d => (
        <div onClick={e => e.stopPropagation()}>
          <CustomSelect className="w-36 text-xs" value={d.status || 'available'} onChange={val => setDriverStatus(d, val)} options={STATUS_OPTIONS.map(s => ({ value: s.value, label: t(s.label, s.value.replace(/_/g, ' ')), color: STATUS_COLORS[s.value] }))} />
        </div>
      ),
    },
    {
      key: 'actions', label: t('actions', 'Actions'), align: 'right',
      render: d => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => handleEdit(d)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('edit', 'Edit')}><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleDelete(d.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];

  const footerCells = [
    <td key="name" colSpan={4} className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-text-secondary">{filtered.length} {t('results', 'results')}</td>,
    <td key="daily" className="px-3.5 py-2 text-right text-xs font-bold text-text-primary">{filtered.some(d => (d.user?.dailyRate || d.dailyRate)) ? `€${filtered.reduce((s, d) => s + Number((d.user?.dailyRate ?? d.dailyRate) || 0), 0).toFixed(0)}/zi` : '—'}</td>,
    <td key="gross" className="px-3.5 py-2 text-right text-xs font-bold text-text-primary">{filtered.some(d => (d.user?.grossSalary || d.grossSalary)) ? `€${filtered.reduce((s, d) => s + Number((d.user?.grossSalary ?? d.grossSalary) || 0), 0).toLocaleString()}/lună` : '—'}</td>,
    <td key="exp1" className="px-3.5 py-2 text-center text-xs font-bold">{filtered.filter(d => isExpired(d.licenseExpiry)).length ? <span className="text-red-500">{filtered.filter(d => isExpired(d.licenseExpiry)).length} {t('expired', 'expired')}</span> : '—'}</td>,
    <td key="exp2" className="px-3.5 py-2 text-center text-xs font-bold">{filtered.filter(d => isExpired(d.medicalExpiry)).length ? <span className="text-red-500">{filtered.filter(d => isExpired(d.medicalExpiry)).length} {t('expired', 'expired')}</span> : '—'}</td>,
    <td key="exp3" className="px-3.5 py-2 text-center text-xs font-bold">{filtered.filter(d => isExpired(d.tachoCardExpiry)).length ? <span className="text-red-500">{filtered.filter(d => isExpired(d.tachoCardExpiry)).length} {t('expired', 'expired')}</span> : '—'}</td>,
    <td key="docs" className="px-3.5 py-2 text-center text-xs font-bold text-text-primary">{filtered.reduce((s, d) => s + (d.documents?.length || 0), 0)}</td>,
    <td key="status" className="px-3.5 py-2" />,
    <td key="actions" className="px-3.5 py-2" />,
  ];

  const drawerDriver = drawerDriverId ? drivers.find(d => d.id === drawerDriverId) : null;

  
  const [hosRows, setHosRows] = useState<any[]>([]);
  const [hosSummary, setHosSummary] = useState<any>(null);
  const [loadingHos, setLoadingHos] = useState(false);
  const [hosForm, setHosForm] = useState<any>({ id: null, date: new Date().toISOString().slice(0, 10), drivingHours: '', workHours: '', breakMinutes: '', notes: '' });

  const loadHos = async (driverId: string) => {
    setLoadingHos(true);
    try {
      const res = await api.get('/drivers/' + driverId + '/hos');
      setHosRows(res.data.rows || []);
      setHosSummary(res.data.summary);
    } catch { /* ignore */ } finally {
      setLoadingHos(false);
    }
  };
  useEffect(() => {
    if (drawerDriver?.id) loadHos(drawerDriver.id);
  }, [drawerDriver?.id]);

  const saveHosEntry = async () => {
    if (!drawerDriver?.id || !hosForm.date) return;
    try {
      await api.post('/drivers/' + drawerDriver.id + '/hos', {
        date: hosForm.date,
        drivingHours: Number(hosForm.drivingHours || 0),
        workHours: Number(hosForm.workHours || 0),
        breakMinutes: Number(hosForm.breakMinutes || 0),
        notes: hosForm.notes,
      });
      toast.success(t('hos_saved', 'HOS salvat'));
      setHosForm({ id: null, date: new Date().toISOString().slice(0, 10), drivingHours: '', workHours: '', breakMinutes: '', notes: '' });
      loadHos(drawerDriver.id);
    } catch {
      toast.error(t('hos_save_error', 'Eroare la salvare HOS'));
    }
  };

  const deleteHosEntry = async (id: string) => {
    try {
      await api.delete('/drivers/hos/' + id);
      toast.success(t('hos_deleted', 'Înregistrare ștearsă'));
      if (drawerDriver?.id) loadHos(drawerDriver.id);
    } catch {
      toast.error(t('hos_delete_error', 'Eroare la ștergere'));
    }
  };

  const hosToday = hosRows.length ? hosRows[hosRows.length - 1] : null;

const tabs: TabDef[] = drawerDriver ? [
    {
      key: 'overview', label: t('tab_overview', 'Overview'),
      content: (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-surface/50 rounded-xl border border-border">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary"><User className="w-6 h-6" /></div>
            <div>
              <div className="font-black text-lg text-text-primary">{drawerDriver.user?.name || '—'}</div>
              <div className="text-sm text-text-secondary">{drawerDriver.user?.email}{drawerDriver.phone ? ` · ${drawerDriver.phone}` : ''}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary">{t('licenseNumber', 'License')}</div><div className="text-sm font-bold mt-0.5">{drawerDriver.licenseNumber || '—'}</div></div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary">{t('assigned_truck', 'Assigned truck')}</div><div className="text-sm font-bold mt-0.5 text-primary">{driverAssignedTruck(drawerDriver)?.plateNumber || t('no_truck', 'Free')}</div></div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[['licenseExpiry', t('expLicense', 'License')], ['medicalExpiry', t('expMedical', 'Medical')], ['tachoCardExpiry', t('expTacho', 'Tacho')]].map(([fld, label]) => (
              <div key={fld as string} className="bg-surface/50 rounded-xl p-3 border border-border">
                <div className="text-[10px] font-bold uppercase text-text-secondary">{label}</div>
                <div className={`text-sm font-bold mt-0.5 ${docState(drawerDriver[fld]) === 'expired' ? 'text-error' : docState(drawerDriver[fld]) === 'soon' ? 'text-warning' : 'text-text-primary'}`}>{drawerDriver[fld] ? formatDate(drawerDriver[fld]) : '—'}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-text-secondary flex items-center gap-1"><Mail className="w-3 h-3" />{t('created_at', 'Registered')}: {formatDate(drawerDriver.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'salary', label: t('tab_salary', 'Salary'),
      content: (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Coins className="w-3 h-3" />{t('grossSalary', 'Gross salary')}</div><div className="text-2xl font-black mt-0.5">{drawerDriver.user?.grossSalary || drawerDriver.grossSalary ? `€${Number(drawerDriver.user?.grossSalary ?? drawerDriver.grossSalary).toLocaleString()}` : '—'}</div></div>
          <div className="bg-surface/50 rounded-xl p-3 border border-border"><div className="text-[10px] font-bold uppercase text-text-secondary flex items-center gap-1"><Coins className="w-3 h-3" />{t('dailyAllowance', 'Daily allowance')}</div><div className="text-2xl font-black mt-0.5">{drawerDriver.user?.dailyRate || drawerDriver.dailyRate ? `€${Number(drawerDriver.user?.dailyRate ?? drawerDriver.dailyRate).toFixed(2)}` : '—'}</div></div>
        </div>
      ),
    },
    {
      key: 'documents', label: t('tab_documents', 'Documents'), badge: drawerDriver.documents?.length || 0,
      content: drawerDriver.documents?.length ? (
        <div className="space-y-2">
          {drawerDriver.documents.map((doc: any) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-surface/50 rounded-xl border border-border">
              <div>
                <div className="text-sm font-bold text-text-primary">{doc.documentType || doc.type || 'Document'}</div>
                <div className="text-[11px] text-text-secondary">{doc.fileName}{doc.expiryDate ? ` · ${formatDate(doc.expiryDate)}` : ''}</div>
              </div>
              {doc.expiryDate && <span className={`text-[11px] font-bold ${new Date(doc.expiryDate) < new Date() ? 'text-red-500' : new Date(doc.expiryDate) < new Date(Date.now() + 30 * 86400000) ? 'text-amber-600' : 'text-green-600'}`}>{t('expired', 'Expired')}</span>}
            </div>
          ))}
        </div>
      ) : <div className="text-sm text-text-secondary p-4 text-center">{t('no_documents', 'No documents yet')}</div>,
    },
    {
      key: 'hos', label: t('hos_tab', 'HOS'), badge: hosSummary?.overDaily ? hosSummary.overDaily : 0,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('hos_driving_today', 'Conducere azi')}</div>
              <div className="text-2xl font-black mt-0.5">{hosToday ? hosToday.drivingHours + 'h' : '—'}</div>
              {hosToday && Number(hosToday.drivingHours) > hosSummary?.maxDaily && <div className="text-[11px] font-bold text-red-500">{t('hos_over_daily', 'Depășire zi')}</div>}
            </div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('hos_work_today', 'Muncă azi')}</div>
              <div className="text-2xl font-black mt-0.5">{hosToday ? hosToday.workHours + 'h' : '—'}</div>
            </div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border">
              <div className="text-[10px] font-bold uppercase text-text-secondary">{t('hos_weekly', 'Săptămâna')}</div>
              <div className="text-2xl font-black mt-0.5">{hosSummary ? hosSummary.weeklyDriving + 'h' : '—'}</div>
              <div className="text-[11px] text-text-secondary">{t('hos_weekly_left', 'rămas')}: {hosSummary ? hosSummary.weeklyRemaining + 'h' : '—'}</div>
            </div>
          </div>

          <div className="bg-surface/50 rounded-xl p-3 border border-border space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-text-secondary">{t('hos_add_entry', 'Adaugă / editează zi')}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input type="date" className="input" value={hosForm.date} onChange={e => setHosForm({ ...hosForm, date: e.target.value })} />
              <input type="number" step="0.5" min="0" className="input" placeholder={t('hos_driving', 'Conducere (h)')} value={hosForm.drivingHours} onChange={e => setHosForm({ ...hosForm, drivingHours: e.target.value })} />
              <input type="number" step="0.5" min="0" className="input" placeholder={t('hos_work', 'Muncă (h)')} value={hosForm.workHours} onChange={e => setHosForm({ ...hosForm, workHours: e.target.value })} />
              <input type="number" step="5" min="0" className="input" placeholder={t('hos_break', 'Pauză (min)')} value={hosForm.breakMinutes} onChange={e => setHosForm({ ...hosForm, breakMinutes: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder={t('hos_notes', 'Note')} value={hosForm.notes} onChange={e => setHosForm({ ...hosForm, notes: e.target.value })} />
              <button className="btn-primary text-sm" onClick={() => saveHosEntry()}><Save className="w-4 h-4 inline mr-1" />{t('save', 'Salvează')}</button>
            </div>
          </div>

          {loadingHos ? <p className="text-text-secondary py-4">...</p> : hosRows.length === 0 ? <p className="text-text-secondary py-4 text-center">{t('hos_no_entries', 'Nicio înregistrare HOS')}</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-border">
                    <th className="table-header">{t('date', 'Data')}</th>
                    <th className="table-header">{t('hos_driving', 'Conducere')}</th>
                    <th className="table-header">{t('hos_work', 'Muncă')}</th>
                    <th className="table-header">{t('hos_break', 'Pauză')}</th>
                    <th className="table-header">{t('hos_notes', 'Note')}</th>
                    <th className="table-header">{t('actions', 'Acțiuni')}</th>
                  </tr>
                </thead>
                <tbody>
                  {hosRows.map(r => (
                    <tr key={r.id} className="border-b border-border hover:bg-surface/50">
                      <td className="p-3 font-semibold">{formatDate(r.date)}</td>
                      <td className="p-3">{Number(r.drivingHours || 0) > hosSummary?.maxDaily ? <span className="text-red-500 font-bold">{r.drivingHours}h</span> : <span>{r.drivingHours}h</span>}</td>
                      <td className="p-3">{r.workHours}h</td>
                      <td className="p-3">{r.breakMinutes}min</td>
                      <td className="p-3 text-text-secondary">{r.notes || '—'}</td>
                      <td className="p-3 flex justify-end gap-1">
                        <button onClick={() => { setHosForm({ id: r.id, date: r.date, drivingHours: r.drivingHours, workHours: r.workHours, breakMinutes: r.breakMinutes, notes: r.notes || '' }); }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('edit', 'Edit')}><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deleteHosEntry(r.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ),
    },

  ] : [];

  return (
    <div className="space-y-4 animate-fade-in max-w-[1600px] mx-auto pb-10">

      <KpiStrip items={kpis} />

      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="p-3 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[300px]">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input className="input pl-9 py-2 text-sm w-full" placeholder={t('search_drivers', 'Search driver, email, license...')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <CustomSelect className="w-40" value={filters.status} onChange={v => setFilters({ status: v })} options={statusOptions} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
              {filtered.length} {t('results', 'results')}
            </span>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold">
              <Download className="w-4 h-4" /> {t('export', 'Export')}
            </button>
            <button onClick={() => { setEditId(null); setForm({ name: '', email: '', password: '', phone: '', licenseNumber: '', dailyRate: '', grossSalary: '', licenseExpiry: '', medicalExpiry: '', tachoCardExpiry: '', status: 'available', truckId: '' }); setShowForm(true); }} className="btn-primary flex items-center gap-2 py-2 px-3 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('addDriver', 'Add Driver')}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentTableItems}
          rowKey={(d: any) => d.id}
          minWidth="1150px"
          loading={loading}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          onRowClick={(d: any) => setDrawerDriverId(d.id)}
          footer={<>{footerCells}</>}
          highlightRow={(d: any) => docDates(d).some(dt => isExpired(dt)) ? 'bg-red-50/40 dark:bg-red-950/20' : ''}
          emptyState={
            <div className="p-16 text-center">
              <User className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData', 'No data')}</h3>
              <p className="text-text-secondary">{t('noResult', 'No drivers found. Add a new one.')}</p>
            </div>
          }
        />
      </div>

      {filtered.length > itemsPerPage && (
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      )}

      <BulkBar count={selected.size} onClear={() => setSelected(new Set())}>
        <button onClick={() => setBulkStatus('available')} className="px-3 py-1 rounded-lg bg-green-500/90 hover:bg-green-500 text-white text-xs font-bold transition-colors">{t('available', 'Available')}</button>
        <button onClick={() => setBulkStatus('off')} className="px-3 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-500 text-white text-xs font-bold transition-colors">{t('unavailable', 'Off duty')}</button>
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
        open={!!drawerDriver}
        onClose={() => setDrawerDriverId(null)}
        title={drawerDriver?.user?.name || ''}
        subtitle={drawerDriver?.user?.email || ''}
        tabs={tabs}
      />

      {showForm && <div className="card animate-fade-in bg-card border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editDriver') : t('addDriver')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Name */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <User className="w-4 h-4 text-primary" /> {t('name')}
              </label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('name')} required />
            </div>

            {/* Email */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Mail className="w-4 h-4 text-primary" /> {t('email')}
              </label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="driver@company.com" required />
            </div>

            {/* Password */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Key className="w-4 h-4 text-primary" /> {editId ? t('newPasswordOptional') || 'New Password (Optional)' : t('password')}
              </label>
              <div className="relative">
                <input type="text" className="input pr-10" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={editId ? t('leaveBlankToKeepUnchanged') || 'Leave blank' : '••••••••'} required={!editId} />
                <button type="button" onClick={generatePassword} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:text-primary-dark rounded transition-colors" title={t('generatePasswordBtn') || 'Generate password'}>
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Phone className="w-4 h-4 text-primary" /> {t('phone')}
              </label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" />
            </div>

            {/* License Number */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <FileText className="w-4 h-4 text-primary" /> {t('licenseNumber')}
              </label>
              <input className="input" value={form.licenseNumber} onChange={e => setForm({ ...form, licenseNumber: e.target.value })} placeholder="ID-123456..." />
            </div>

            {/* Daily Rate */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <span className="w-4 h-4 text-primary font-bold text-center">€</span> {t('dailyAllowance') || 'Daily allowance (€/day)'}
              </label>
              <input type="number" className="input" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: e.target.value })} placeholder="e.g. 55" />
            </div>

            {/* Gross Salary */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <span className="w-4 h-4 text-primary font-bold text-center">€</span> {t('grossSalary') || 'Gross salary (€/month)'}
              </label>
              <input type="number" className="input" value={form.grossSalary} onChange={e => setForm({ ...form, grossSalary: e.target.value })} placeholder="e.g. 2500" />
            </div>

            {/* Status Selection */}
            <div>
              <label className="label font-semibold">{t('status')}</label>
              <CustomSelect value={form.status} onChange={val => setForm({ ...form, status: val })} options={STATUS_OPTIONS.map(s => ({ value: s.value, label: t(s.label), color: STATUS_COLORS[s.value] }))} />
            </div>

            {/* Truck Assignment */}
            <div>
              <label className="label font-semibold">{t('truck', 'Truck')}</label>
              <select className="input" value={form.truckId} onChange={e => setForm({ ...form, truckId: e.target.value })}>
                <option value="">{t('no_truck', 'No truck (free)')}</option>
                {trucks.map(tr => <option key={tr.id} value={tr.id}>{tr.plateNumber} {tr.brand}</option>)}
              </select>
            </div>

            {/* Document Expirations */}
            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('licenseExpiry')}
              </label>
              <Flatpickr type="hidden" value={form.licenseExpiry} onChange={(dates, dateStr) => setForm({ ...form, licenseExpiry: dateStr })} onClick={e => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} onFocus={e => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} className={`input bg-card ${isPastDate(form.licenseExpiry) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} options={fpOptions} placeholder="DD/MM/YYYY" />
              {isPastDate(form.licenseExpiry) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>

            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('medicalExpiry')}
              </label>
              <Flatpickr type="hidden" value={form.medicalExpiry} onChange={(dates, dateStr) => setForm({ ...form, medicalExpiry: dateStr })} onClick={e => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} onFocus={e => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} className={`input bg-card ${isPastDate(form.medicalExpiry) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} options={fpOptions} placeholder="DD/MM/YYYY" />
              {isPastDate(form.medicalExpiry) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>

            <div>
              <label className="label font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4 text-primary" /> {t('tachoCardExpiry')}
              </label>
              <Flatpickr type="hidden" value={form.tachoCardExpiry} onChange={(dates, dateStr) => setForm({ ...form, tachoCardExpiry: dateStr })} onClick={e => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} onFocus={e => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }} className={`input bg-card ${isPastDate(form.tachoCardExpiry) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} options={fpOptions} placeholder="DD/MM/YYYY" />
              {isPastDate(form.tachoCardExpiry) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>

            {/* Actions */}
            <div className="flex gap-3 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">
                {t('save')}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary px-6 py-2.5 font-bold">
                {t('cancel')}
              </button>
            </div>
          </form>
        </div>}

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Drivers_HapCargo" title="Drivers" sheetName="Drivers" getDateField={d => d.createdAt} headers={[
        { key: 'name', label: 'Name', transform: (_v: any, d: any) => d.user?.name || '' },
        { key: 'email', label: 'Email', transform: (_v: any, d: any) => d.user?.email || '' },
        { key: 'phone', label: 'Phone', transform: (v: any) => v || '' },
        { key: 'licenseNumber', label: 'License Number', transform: (v: any) => v || '' },
        { key: 'truck', label: 'Truck', transform: (_v: any, d: any) => driverAssignedTruck(d)?.plateNumber || '' },
        { key: 'grossSalary', label: 'Gross Salary', transform: (_v: any, d: any) => d.user?.grossSalary ?? d.grossSalary },
        { key: 'dailyRate', label: 'Daily Rate', transform: (_v: any, d: any) => d.user?.dailyRate ?? d.dailyRate },
        { key: 'licenseExpiry', label: 'License Expiry', transform: (v: any) => v ? formatDateExcel(v) : '' },
        { key: 'medicalExpiry', label: 'Medical Expiry', transform: (v: any) => v ? formatDateExcel(v) : '' },
        { key: 'tachoCardExpiry', label: 'Tacho Expiry', transform: (v: any) => v ? formatDateExcel(v) : '' },
        { key: 'status', label: 'Status', transform: (v: any) => v || '' },
      ]} />
    </div>
  );
}
