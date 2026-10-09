import { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Trash2, Paperclip, FileText, X, Wrench, Clock, CalendarCheck, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import { fmtMoney } from '../lib/format';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import { matchesSearch } from '../lib/search';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import { useSaveConfirm } from '../components/SaveConfirmProvider';

export default function MaintenancePage() {
  const confirmSave = useSaveConfirm();

  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [truckFilter, setTruckFilter] = useState('all');
  const [form, setForm] = useState({ truckId: '', type: 'preventive', description: '', scheduledDate: '', partsCost: '', laborCost: '', odometerKm: '', cost: '', serviceProvider: '', notes: '' });
  const [attForm, setAttForm] = useState({ name: '', fileUrl: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  const load = async () => {
    const [r, tr] = await Promise.all([api.get('/maintenance'), api.get('/trucks')]);
    setRecords(r.data); setTrucks(tr.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ truckId: '', type: 'preventive', description: '', scheduledDate: '', partsCost: '', laborCost: '', odometerKm: '', cost: '', serviceProvider: '', notes: '' });

  const startEdit = (r: any) => {
    setEditId(r.id);
    setForm({
      truckId: r.truck?.id || '',
      type: r.type || 'preventive',
      description: r.description || '',
      scheduledDate: r.scheduledDate ? String(r.scheduledDate).slice(0, 10) : '',
      partsCost: r.partsCost != null ? String(r.partsCost) : '',
      laborCost: r.laborCost != null ? String(r.laborCost) : '',
      odometerKm: r.odometerKm != null ? String(r.odometerKm) : '',
      cost: r.cost != null ? String(r.cost) : '',
      serviceProvider: r.serviceProvider || '',
      notes: r.notes || '',
    });
    setShowForm(true);
  };

  const getTranslatedStatus = (status: string) => {
    const map: Record<string, string> = {
      'scheduled': 'pending',
      'in_progress': 'inProgress',
      'done': 'completed'
    };
    const key = map[status] || status;
    return t(key);
  };

  const isPastDate = (val: string) => {
    if (!val) return false;
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
    if (isPastDate(form.scheduledDate)) {
      toast.error(getErrorMessage());
      return;
    }
    try {
      const dataToSubmit = {
        ...form,
        partsCost: form.partsCost === '' ? null : Number(form.partsCost),
        laborCost: form.laborCost === '' ? null : Number(form.laborCost),
        odometerKm: form.odometerKm === '' ? null : Number(form.odometerKm),
        cost: form.cost === '' ? null : Number(form.cost)
      };
      if (editId) {
        await api.patch(`/maintenance/${editId}`, dataToSubmit);
        toast.success(t('maintenanceUpdated', 'Întreținere actualizată cu succes'));
      } else {
        await api.post('/maintenance', dataToSubmit);
        toast.success(t('maintenanceAdded'));
      }
      setShowForm(false);
      setEditId(null);
      resetForm();
      load();
    }
    catch { toast.error(t('error')); }
  };

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/maintenance/${deleteId}`);
      toast.success(t('maintenanceDeleted', 'Întreținere ștearsă'));
      load();
    } catch {
      toast.error(t('error'));
    } finally {
      setDeleteId(null);
    }
  };

  const addAttachment = async () => {
    if (!editId || !attForm.name.trim()) {
      toast.error(t('attNameRequired', 'Completează numele atașamentului'));
      return;
    }
    try {
      await api.post(`/maintenance/${editId}/attachments`, { name: attForm.name.trim(), fileUrl: attForm.fileUrl.trim() || null });
      setAttForm({ name: '', fileUrl: '' });
      toast.success(t('attAdded', 'Atașament adăugat'));
      load();
    } catch { toast.error(t('error')); }
  };

  const removeAttachment = async (attId: string) => {
    try {
      await api.delete(`/maintenance/attachments/${attId}`);
      load();
    } catch { toast.error(t('error')); }
  };

  const editingRecord = records.find(r => r.id === editId) || null;

  const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
    inspection: { label: 'Inspecție', cls: 'bg-amber-500/10 text-amber-700' },
    preventive: { label: 'Preventivă', cls: 'bg-blue-500/10 text-blue-700' },
    corrective: { label: 'Corectivă', cls: 'bg-red-500/10 text-red-700' },
  };

  const STATUS_DOT: Record<string, string> = {
    scheduled: '#94A3B8',
    in_progress: '#F59E0B',
    done: '#10B981',
  };

  const totalCost = records.reduce((s: number, r: any) => s + Number(r.cost != null ? r.cost : ((Number(r.partsCost) || 0) + (Number(r.laborCost) || 0))), 0);
  const inProgressCount = records.filter(r => r.status === 'in_progress').length;
  const plannedCount = records.filter(r => r.status === 'scheduled').length;
  const overdueCount = records.filter(r => r.status !== 'done' && isPastDate(r.scheduledDate)).length;

  const filtered = records.filter(r => {
    const matchTruck = truckFilter === 'all' || (r.truck?.id === truckFilter);
    const matchType = typeFilter === 'all' || r.type === typeFilter;
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchSearch = matchesSearch(search, r.truck?.plateNumber, r.description, r.serviceProvider);
    return matchTruck && matchType && matchStatus && matchSearch;
  });

  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useShortcuts({
    'shift+n': () => {
      if (!showForm) {
        setEditId(null);
        resetForm();
        setShowForm(true);
      }
    },
    'ctrl+s': (e) => {
      if (showForm) handleSubmit(e);
    },
    'escape': () => {
      if (showForm) { setShowForm(false); setEditId(null); }
      if (deleteId) setDeleteId(null);
    }
  });

  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: (r) => startEdit(r),
    onDelete: (r) => setDeleteId(r.id),
    isActive: !showForm && !deleteId
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {showForm && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-text-primary flex items-center gap-2">{editId ? <Pencil className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-primary" />} {editId ? t('editMaintenance', 'Editează întreținerea') : t('addMaintenance')}</h3>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="label">{t('truck')}</label>
              <CustomSelect value={form.truckId} onChange={val => setForm({...form, truckId: val})} placeholder={t('selectTruck')} options={trucks.map((t: any) => ({ value: t.id, label: t.plateNumber }))} />
            </div>
            <div><label className="label">{t('type')}</label>
              <CustomSelect value={form.type} onChange={val => setForm({...form, type: val})} options={[
                { value: 'preventive', label: t('maintenance_preventive') || 'Preventivă' },
                { value: 'corrective', label: t('maintenance_corrective') || 'Corectivă' },
                { value: 'inspection', label: t('maintenance_inspection') || 'Inspecție' },
              ]} />
            </div>
            <div><label className="label">{t('description')}</label><input className="input" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
            <div>
              <label className="label">{t('planned')}</label>
              <Flatpickr 
                value={form.scheduledDate} 
                onChange={(dates, dateStr) => setForm({...form, scheduledDate: dateStr})} 
                onClick={(e) => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                onFocus={(e) => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                className={`input bg-card ${isPastDate(form.scheduledDate) ? 'border-red-500 text-red-600 bg-red-50/20' : ''}`} 
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false, minDate: 'today' }} 
                placeholder={t('date_format_hint', 'DD/MM/YYYY')} 
              />
              {isPastDate(form.scheduledDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div><label className="label">{t('costs')} (€)</label><input type="number" className="input" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} /></div>
            <div><label className="label">{t('partsCost', 'Piese (€)')}</label><input type="number" className="input" value={form.partsCost} onChange={e => setForm({...form, partsCost: e.target.value})} /></div>
            <div><label className="label">{t('laborCost', 'Manoperă (€)')}</label><input type="number" className="input" value={form.laborCost} onChange={e => setForm({...form, laborCost: e.target.value})} /></div>
            <div><label className="label">{t('odometerKm', 'Kilometraj (km)')}</label><input type="number" className="input" value={form.odometerKm} onChange={e => setForm({...form, odometerKm: e.target.value})} /></div>
            <div><label className="label">{t('service')}</label><input className="input" value={form.serviceProvider} onChange={e => setForm({...form, serviceProvider: e.target.value})} /></div>
            <div className="col-span-2 lg:col-span-3"><label className="label">{t('notes')}</label><input className="input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder={t('notesPlaceholder', 'Observații opționale...')} /></div>
            {editId && (
              <div className="col-span-2 lg:col-span-3 bg-surface/60 rounded-xl p-3 space-y-2 border border-border">
                <div className="text-xs font-bold text-text-secondary flex items-center gap-1"><Paperclip className="w-3.5 h-3.5" /> {t('attachments', 'Atașamente')}</div>
                <div className="flex gap-2">
                  <input className="input flex-1" placeholder={t('attName', 'Nume (factură, poze...)')} value={attForm.name} onChange={e => setAttForm({...attForm, name: e.target.value})} />
                  <input className="input flex-1" placeholder={t('attUrl', 'URL / cale fișier')} value={attForm.fileUrl} onChange={e => setAttForm({...attForm, fileUrl: e.target.value})} />
                  <button type="button" onClick={addAttachment} className="btn-primary px-3" title={t('addAttachmentBtn', 'Adaugă')}><Plus className="w-4 h-4" /></button>
                </div>
                <div className="space-y-1">
                  {(editingRecord?.attachments || []).length === 0 ? (
                    <div className="text-xs text-text-secondary italic">{t('noAttachments', 'Niciun atașament')}</div>
                  ) : (editingRecord?.attachments || []).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-card rounded-lg px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-2 font-medium"><FileText className="w-3.5 h-3.5 text-primary" /> {a.name}</span>
                      <button type="button" onClick={() => removeAttachment(a.id)} className="p-1 text-text-secondary hover:text-red-500 transition-colors" title={t('delete', 'Șterge')}><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 col-span-2 lg:col-span-3">
              <button type="submit" className="btn-primary">{t('save')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); resetForm(); }} className="btn-secondary">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}
      <KpiStrip dense items={[
        { key: 'total', label: 'COST TOTAL MENTENANȚĂ', value: fmtMoney(totalCost), icon: Wrench, color: 'text-primary' },
        { key: 'inProgress', label: 'ÎN CURS', value: inProgressCount, icon: Clock, color: 'text-warning' },
        { key: 'planned', label: 'PLANIFICATE', value: plannedCount, icon: CalendarCheck, color: 'text-blue-600' },
        { key: 'overdue', label: 'DEPAȘITE / URGENTE', value: overdueCount, icon: AlertTriangle, color: 'text-error' },
      ]} />

      <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
        <div className="relative w-[220px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input className="input !pl-8 !py-1.5 !text-xs h-8 w-full" placeholder={t('searchMaintenance', 'Caută camion, descriere sau service...')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <CustomSelect size="sm" className="w-[150px] shrink-0" value={truckFilter} onChange={setTruckFilter} options={[
          { value: 'all', label: t('allTrucks', 'Toate camioanele') },
          ...trucks.map((t: any) => ({ value: t.id, label: t.plateNumber })),
        ]} />
        <CustomSelect size="sm" className="w-[120px] shrink-0" value={typeFilter} onChange={setTypeFilter} options={[
          { value: 'all', label: t('allTypes', 'Toate tipurile') },
          { value: 'inspection', label: 'Inspecție' },
          { value: 'preventive', label: 'Preventivă' },
          { value: 'corrective', label: 'Corectivă' },
        ]} />
        <CustomSelect size="sm" className="w-[130px] shrink-0" value={statusFilter} onChange={setStatusFilter} options={[
          { value: 'all', label: t('allStatuses', 'Toate statusurile') },
          { value: 'scheduled', label: getTranslatedStatus('scheduled'), color: STATUS_DOT.scheduled },
          { value: 'in_progress', label: getTranslatedStatus('in_progress'), color: STATUS_DOT.in_progress },
          { value: 'done', label: getTranslatedStatus('done'), color: STATUS_DOT.done },
        ]} />
        <span className="text-[10px] font-bold text-text-secondary uppercase bg-surface px-2 py-1.5 rounded-lg border border-border/50 shrink-0">
          {filtered.length} {t('records')}
        </span>
        <div className="flex-1" />
        <button onClick={() => { setShowForm(!showForm); if (showForm) { setEditId(null); resetForm(); } }} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> {t('addMaintenance')}
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataTable
          dense
          minWidth="1080px"
          loading={loading}
          rowKey={(r: any) => r.id}
          data={currentTableItems}
          emptyState={<div className="p-12 text-center text-sm text-text-secondary">{t('noResults', 'Niciun rezultat')}</div>}
          onRowClick={(r: any) => startEdit(r)}
          columns={[
            { key: 'truck', label: 'CAMION & TIP', align: 'left', render: (r: any) => (
              <div className="flex items-center gap-2">
                <span className="font-bold text-[13px] text-text whitespace-nowrap">{r.truck?.plateNumber || '—'}</span>
                {(TYPE_BADGE[r.type] || TYPE_BADGE.preventive) && <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${(TYPE_BADGE[r.type] || TYPE_BADGE.preventive).cls}`}>{(TYPE_BADGE[r.type] || TYPE_BADGE.preventive).label}</span>}
              </div>
            ) },
            { key: 'description', label: 'DESCRIERE & SERVICE', align: 'left', render: (r: any) => (
              <div>
                <p className="font-semibold text-[12.5px] text-text truncate max-w-[280px]">{r.description || '—'}</p>
                <p className="text-[10px] text-text-secondary mt-0.5 truncate max-w-[280px]">{r.serviceProvider || '—'}</p>
              </div>
            ) },
            { key: 'date', label: 'DATA PLANIFICATĂ', align: 'center', render: (r: any) => (
              <div className="flex items-center justify-center gap-1.5">
                <span className={`text-xs whitespace-nowrap ${r.status !== 'done' && isPastDate(r.scheduledDate) ? 'text-error font-bold' : ''}`}>{formatDate(r.scheduledDate)}</span>
                {r.status !== 'done' && isPastDate(r.scheduledDate) && <span className="text-xs" title="Depășită">⚠️</span>}
              </div>
            ) },
            { key: 'costs', label: 'COSTURI', align: 'right', render: (r: any) => {
              const costVal = Number(r.cost ?? ((Number(r.partsCost) || 0) + (Number(r.laborCost) || 0)));
              return (
                <div className="text-right">
                  <p className="font-bold text-[12.5px] text-text whitespace-nowrap">{costVal ? fmtMoney(costVal) : '—'}</p>
                  {(r.partsCost != null || r.laborCost != null) && <p className="text-[10px] text-text-secondary mt-0.5 whitespace-nowrap">Piese: {fmtMoney(r.partsCost)} • Manoperă: {fmtMoney(r.laborCost)}</p>}
                </div>
              );
            } },
            { key: 'status', label: 'STATUS & ACȚIUNI', align: 'right', sticky: 'right', width: '170px', render: (r: any) => (
              <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                <CustomSelect size="sm" className="w-[104px]" value={r.status} onChange={async val => { await api.patch(`/maintenance/${r.id}`, { status: val }); toast.success(t('statusUpdated')); load(); }} options={[
                  { value: 'scheduled', label: getTranslatedStatus('scheduled'), color: STATUS_DOT.scheduled },
                  { value: 'in_progress', label: getTranslatedStatus('in_progress'), color: STATUS_DOT.in_progress },
                  { value: 'done', label: getTranslatedStatus('done'), color: STATUS_DOT.done },
                ]} />
                <button onClick={() => startEdit(r)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary/10 transition-colors" title={t('edit', 'Edit')}><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteId(r.id)} className="p-1.5 text-text-secondary hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors" title={t('delete', 'Delete')}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ) },
          ]}
        />
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
    </div>
  );
}
