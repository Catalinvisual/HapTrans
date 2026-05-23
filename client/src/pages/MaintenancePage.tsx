import { useEffect, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import CustomSelect from '../components/CustomSelect';

export default function MaintenancePage() {
  const { t, i18n } = useTranslation();
  const [records, setRecords] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ truckId: '', type: 'preventive', description: '', scheduledDate: '', cost: '', serviceProvider: '', notes: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
  const filtered = records.filter(r => r.truck?.plateNumber?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('maintenance')}</h1>
          <p className="text-text-secondary text-sm">{records.length} {t('recordsCount')}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary"><Plus className="w-4 h-4" /> {t('addMaintenance')}</button>
      </div>
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
            <div><label className="label">{t('planned')}</label><Flatpickr value={form.scheduledDate} onChange={(dates, dateStr) => setForm({...form, scheduledDate: dateStr})} className="input bg-white" options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }} placeholder="DD/MM/YYYY" /></div>
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
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} /></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full">
          <thead><tr className="bg-surface border-b border-border">
            {[t('truck'), t('type'), t('description'), t('planned'), t('costs'), t('service'), t('status'), t('actions')].map(h => <th key={h} className="table-header">{h}</th>)}
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              : filtered.map(r => (
              <tr key={r.id} className="hover:bg-surface/60 transition-colors">
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
      </div>
    </div>
  );
}
