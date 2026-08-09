import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Search, Download, Trash2, Users, Percent, Calendar, FileText } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';
import ClientDetails from '../components/ClientDetails';
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';
import KpiStrip from '../components/ui/KpiStrip';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
export default function ClientsPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const {
    t
  } = useTranslation();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(formStore.clientsShowForm);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  const [form, setForm] = useState(formStore.clientsForm || {
    name: '',
    cui: '',
    address: '',
    contactName: '',
    contactEmail: '',
    phone: ''
  });
  const [editId, setEditId] = useState<string | null>(formStore.clientsEditId);
  useEffect(() => {
    formStore.setFormState('clients', {
      showForm,
      editId,
      form
    });
  }, [showForm, editId, form]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const load = () => api.get('/clients').then(r => {
    setClients(r.data);
    setLoading(false);
  });
  useEffect(() => {
    load();
  }, []);
  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!await confirmSave()) return;
    try {
      if (editId) {
        await api.patch(`/clients/${editId}`, form);
        toast.success(t('clientUpdated'));
      } else {
        await api.post('/clients', form);
        toast.success(t('clientAdded'));
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        name: '',
        cui: '',
        address: '',
        contactName: '',
        contactEmail: '',
        phone: ''
      });
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
      toast.success(t("toast_clientTersCu"));
      load();
    } catch {
      toast.error(t("toast_eroareLaTerg"));
    } finally {
      setDeleteId(null);
    }
  };
  const filtered = clients.filter(c => {
    const query = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(query) || (c.cui || '').toLowerCase().includes(query) || (c.address || '').toLowerCase().includes(query) || (c.contactName || '').toLowerCase().includes(query) || (c.contactEmail || '').toLowerCase().includes(query) || (c.phone || '').toLowerCase().includes(query);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const kpis = [
    { key: 'total', label: t('clients_total', 'Total clients'), value: clients.length, icon: Users },
    { key: 'rates', label: t('clients_with_rates', 'Clients with rates'), value: clients.filter(c => (c.rates || []).length > 0).length, color: '#f97316', icon: FileText },
    { key: 'new_month', label: t('clients_new_month', 'New this month'), value: clients.filter(c => c.createdAt && new Date(c.createdAt) >= monthStart).length, color: '#22c55e', icon: Calendar },
    { key: 'discount', label: t('clients_discount', 'With discount'), value: clients.filter(c => Number(c.discount || 0) > 0).length, color: '#6366f1', icon: Percent },
  ];
  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useShortcuts({
    'shift+n': () => {
      if (!showForm && !selectedClient) {
        setForm({
          name: '',
          cui: '',
          address: '',
          contactName: '',
          contactEmail: '',
          phone: ''
        });
        setEditId(null);
        setShowForm(true);
      }
    },
    'ctrl+s': e => {
      if (showForm) {
        handleSubmit(e);
      }
    },
    'escape': () => {
      if (showForm) {
        setShowForm(false);
      } else if (selectedClient) {
        setSelectedClient(null);
        load();
      }
    }
  });
  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: c => setSelectedClient(c),
    onDelete: c => setDeleteId(c.id),
    isActive: !showForm && !selectedClient
  });
  if (selectedClient) {
    return <ClientDetails client={selectedClient} onBack={() => {
      setSelectedClient(null);
      load();
    }} />;
  }
  return <div className="space-y-5 animate-fade-in">

      <KpiStrip items={kpis} />

      {showForm && <div className="card animate-fade-in bg-card border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editClient') || 'Editează client' : t('addClient')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Basic fields */}
            {[{
          key: 'name',
          label: t('name'),
          required: true
        }, {
          key: 'cui',
          label: t('cui') || 'CUI / VAT'
        }, {
          key: 'contactName',
          label: t('contact') || 'Contact'
        }, {
          key: 'contactEmail',
          label: t('email') || 'Email contact'
        }, {
          key: 'phone',
          label: t('phone')
        }].map(f => <div key={f.key}>
                <label className="label font-semibold">{f.label}</label>
                <input className="input" value={(form as any)[f.key]} onChange={e => setForm({
            ...form,
            [f.key]: e.target.value
          })} required={f.required} />
              </div>)}

            {/* Address — wider */}
            <div className="md:col-span-2">
              <label className="label font-semibold">{t('address')}</label>
              <AddressAutocomplete value={form.address} onChange={val => setForm({
            ...form,
            address: val
          })} placeholder="Street, No., Building..." />
            </div>

            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => {
            setShowForm(false);
            setEditId(null);
          }} className="btn-secondary px-6 py-2.5 font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>}


      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
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
            <button onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
          }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('addClient')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('name'), t('cui') || 'CUI', t('address'), t('contact') || 'Contact', t('email'), t('phone'), t('rates', 'Rates'), t('discount', 'Discount'), t('terms', 'Terms'), t('registered', 'Registered'), t('actions')].map(h => <th key={h} className="table-header whitespace-nowrap">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={11} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr> : filtered.length === 0 ? <tr><td colSpan={11} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr> : currentTableItems.map((c: any, idx: number) => <tr key={c.id} className={`hover:bg-surface/60 transition-colors cursor-pointer ${selectedRowIndex === idx ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`} onClick={e => {
              if ((e.target as HTMLElement).closest('button, select, input, a, .interactive-click')) return;
              setSelectedClient(c);
            }}>
                  <td className="table-cell font-bold text-text">{c.name}</td>
                  <td className="table-cell text-xs font-semibold text-text-secondary">{c.cui || '—'}</td>
                  <td className="table-cell text-xs max-w-[150px] truncate">{c.address || '—'}</td>
                  <td className="table-cell text-xs font-medium text-text">{c.contactName || '—'}</td>
                  <td className="table-cell text-xs text-text-secondary">{c.contactEmail || '—'}</td>
                  <td className="table-cell text-xs font-medium text-text-secondary">{c.phone || '—'}</td>
                  <td className="table-cell text-xs font-bold text-text-secondary">
                    {(c.rates || []).length > 0 ? <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">{c.rates.length} {t('rates', 'rates')}</span> : '—'}
                  </td>
                  <td className="table-cell text-xs font-semibold text-text-secondary">{Number(c.discount || 0) > 0 ? `${Number(c.discount)}%` : '—'}</td>
                  <td className="table-cell text-xs text-text-secondary">{c.paymentTerms ? `${c.paymentTerms} ${t('days', 'days')}` : '—'}</td>
                  <td className="table-cell text-xs text-text-secondary whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedClient(c)} className="btn-secondary py-1.5 px-3 text-xs font-bold bg-primary/5 text-primary hover:bg-primary/10 border-transparent">
                          {t('viewDetails', 'View Details')}
                        </button>
                        <button onClick={() => {
                    setSelectedClient(c);
                  }} className="p-1.5 text-text-secondary hover:text-primary rounded hover:bg-primary-light transition-colors" title={t('edit')}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-secondary hover:text-error rounded hover:bg-red-50 transition-colors" title={t('delete')}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Clients_HapCargo" getDateField={item => item.createdAt} headers={[{
      key: 'createdAt',
      label: 'Registration Date',
      transform: val => val ? formatDate(val) : ''
    }, {
      key: 'name',
      label: 'Client Name'
    }, {
      key: 'cui',
      label: 'CUI / VAT'
    }, {
      key: 'address',
      label: 'Address'
    }, {
      key: 'contactName',
      label: 'Contact Person'
    }, {
      key: 'contactEmail',
      label: 'Contact Email'
    }, {
      key: 'phone',
      label: 'Phone'
    }]} />
    
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
    </div>;
}
