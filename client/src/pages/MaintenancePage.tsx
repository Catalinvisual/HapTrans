import { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';

export default function MaintenancePage() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ truckId: '', type: 'preventive', description: '', scheduledDate: '', cost: '', serviceProvider: '', notes: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);

  const load = async () => {
    const [r, tr] = await Promise.all([api.get('/maintenance'), api.get('/trucks')]);
    setRecords(r.data); setTrucks(tr.data); setLoading(false);
  };
  useEffect(() => { load(); }, []);

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
    if (isPastDate(form.scheduledDate)) {
      toast.error(getErrorMessage());
      return;
    }
    try { 
      const dataToSubmit = {
        ...form,
        cost: form.cost === '' ? null : Number(form.cost)
      };
      await api.post('/maintenance', dataToSubmit); 
      toast.success(t('maintenanceAdded')); 
      setShowForm(false); 
      load(); 
    }
    catch { toast.error(t('error')); }
  };

  const STATUS = { scheduled:'badge-primary', in_progress:'badge-warning', done:'badge-success' };
  const filtered = records.filter(r => (r.truck?.plateNumber || '').toLowerCase().includes(search.toLowerCase()) || (r.description || '').toLowerCase().includes(search.toLowerCase()));

  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useShortcuts({
    'shift+n': () => {
      if (!showForm) {
        setForm({ truckId: '', type: 'preventive', description: '', scheduledDate: '', cost: '', serviceProvider: '', notes: '' });
        setShowForm(true);
      }
    },
    'ctrl+s': (e) => {
      if (showForm) handleSubmit(e);
    },
    'escape': () => {
      if (showForm) setShowForm(false);
    }
  });

  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: (r) => {}, // not implemented in maintenance
    onDelete: (r) => {}, // not implemented delete in this file?
    isActive: !showForm
  });

  return (
    <div className="space-y-5 animate-fade-in">
      {showForm && (
        <div className="card animate-fade-in">
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
                placeholder="DD/MM/YYYY" 
              />
              {isPastDate(form.scheduledDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div><label className="label">{t('costs')} (€)</label><input type="number" className="input" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} /></div>
            <div><label className="label">{t('service')}</label><input className="input" value={form.serviceProvider} onChange={e => setForm({...form, serviceProvider: e.target.value})} /></div>
            <div className="flex gap-3 col-span-2 lg:col-span-3">
              <button type="submit" className="btn-primary">{t('save')}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9 py-2 text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} /></div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 px-4 font-semibold"><Plus className="w-4 h-4 mr-1" /> {t('addMaintenance')}</button>
        </div>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-surface border-b border-border">
            {[t('truck'), t('type'), t('description'), t('planned'), t('costs'), t('service'), t('status'), t('actions')].map(h => <th key={h} className="table-header">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              : currentTableItems.map((r: any, idx: number) => (
              <tr key={r.id} 
                  className={`hover:bg-surface/60 transition-colors cursor-pointer ${selectedRowIndex === idx ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`}>
                <td className="table-cell font-semibold">{r.truck?.plateNumber}</td>
                <td className="table-cell capitalize">{r.type}</td>
                <td className="table-cell">{r.description}</td>
                <td className="table-cell text-xs">{formatDate(r.scheduledDate)}</td>
                <td className="table-cell">{r.cost ? `€${Number(r.cost).toLocaleString(i18n.language)}` : '—'}</td>
                <td className="table-cell text-xs">{r.serviceProvider || '—'}</td>
                <td className="table-cell"><span className={(STATUS as any)[r.status] || 'badge-gray'}>{getTranslatedStatus(r.status)}</span></td>
                <td className="table-cell">
                  <CustomSelect className="w-32 text-xs" value={r.status} onChange={async val => { await api.patch(`/maintenance/${r.id}`, { status: val }); toast.success(t('statusUpdated')); load(); }} options={[
                    { value: 'scheduled', label: getTranslatedStatus('scheduled'), color: 'text-primary' },
                    { value: 'in_progress', label: getTranslatedStatus('in_progress'), color: 'text-warning' },
                    { value: 'done', label: getTranslatedStatus('done'), color: 'text-success' },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
        <Pagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
    </div>
  );
}
