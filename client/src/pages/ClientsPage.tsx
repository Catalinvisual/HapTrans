import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Search, Download, Trash2 } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';

export default function ClientsPage() {
  const { t } = useTranslation();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  
  const [form, setForm] = useState({ name: '', cui: '', address: '', contactName: '', contactEmail: '', phone: '' });
  const [editId, setEditId] = useState<string | null>(null);

  const load = () => api.get('/clients').then(r => { setClients(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) { await api.patch(`/clients/${editId}`, form); toast.success(t('clientUpdated')); }
      else { await api.post('/clients', form); toast.success(t('clientAdded')); }
      setShowForm(false); setEditId(null); setForm({ name: '', cui: '', address: '', contactName: '', contactEmail: '', phone: '' });
      load();
      } catch {
 toast.error(t('error'));
      } finally {
        setDeleteId(null);
      }
  };

  
  const handleDelete = (id: string) => setDeleteId(id);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/clients/${deleteId}`);
      toast.success('Client șters cu succes!');
      load();
    } catch {
      toast.error('Eroare la ștergerea clientului.');
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = clients.filter(c => {
    const query = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(query) ||
      (c.cui || '').toLowerCase().includes(query) ||
      (c.address || '').toLowerCase().includes(query) ||
      (c.contactName || '').toLowerCase().includes(query) ||
      (c.contactEmail || '').toLowerCase().includes(query) ||
      (c.phone || '').toLowerCase().includes(query)
    );
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="space-y-5 animate-fade-in">

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editClient') || 'Editează client' : t('addClient')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Basic fields */}
            {[
              { key: 'name',         label: t('name'),             required: true },
              { key: 'cui',          label: t('cui') || 'CUI / VAT' },
              { key: 'contactName',  label: t('contact') || 'Contact' },
              { key: 'contactEmail', label: t('email') || 'Email contact' },
              { key: 'phone',        label: t('phone') },
            ].map(f => (
              <div key={f.key}>
                <label className="label font-semibold">{f.label}</label>
                <input
                  className="input"
                  value={(form as any)[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  required={f.required}
                />
              </div>
            ))}

            {/* Address — wider */}
            <div className="md:col-span-2">
              <label className="label font-semibold">{t('address')}</label>
              <AddressAutocomplete
                value={form.address}
                onChange={val => setForm({ ...form, address: val })}
                placeholder="Street, No., Building..."
              />
            </div>

            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary px-6 py-2.5 font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}


      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input className="input pl-9 py-2 text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all">
              <Download className="w-4 h-4" /> {t('export')}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
              {filtered.length} {t('results')}
            </span>
            <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('addClient')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('name'), t('cui') || 'CUI', t('address'), t('contact') || 'Contact', t('email'), t('phone'), t('actions')].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-surface/60 transition-colors">
                  <td className="table-cell font-bold text-text">{c.name}</td>
                  <td className="table-cell text-xs font-semibold text-text-secondary">{c.cui || '—'}</td>
                  <td className="table-cell text-xs max-w-[150px] truncate">{c.address || '—'}</td>
                  <td className="table-cell text-xs font-medium text-text">{c.contactName || '—'}</td>
                  <td className="table-cell text-xs text-text-secondary">{c.contactEmail || '—'}</td>
                  <td className="table-cell text-xs font-medium text-text-secondary">{c.phone || '—'}</td>
                  <td className="table-cell">
                    <button onClick={() => { setForm({ name: c.name, cui: c.cui, address: c.address, contactName: c.contactName, contactEmail: c.contactEmail, phone: c.phone }); setEditId(c.id); setShowForm(true); }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-error/10 transition-all ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={filtered}
        filename="Clienti_HapTrans"
        getDateField={item => item.createdAt}
        headers={[
          { key: 'createdAt', label: 'Data Inregistrare', transform: val => val ? formatDate(val) : '' },
          { key: 'name', label: 'Nume Client' },
          { key: 'cui', label: 'CUI / VAT' },
          { key: 'address', label: 'Adresa' },
          { key: 'contactName', label: 'Persoana Contact' },
          { key: 'contactEmail', label: 'Email Contact' },
          { key: 'phone', label: 'Telefon' },
        ]}
      />
    
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirmDelete')}
      />
    </div>
  );
}
