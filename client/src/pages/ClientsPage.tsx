import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Search, Download, Trash2, Users, Percent, Calendar, FileText, Eye } from 'lucide-react';
import AddressAutocomplete from '../components/AddressAutocomplete';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';
import { matchesSearch } from '../lib/search';
import ClientDetails from '../components/ClientDetails';
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
import { useSettingsStore } from '../store/settingsStore';
import { generateClientPdf } from '../lib/pdfGenerator';
export default function ClientsPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const {
    t
  } = useTranslation();
  const company = useSettingsStore(s => s.company);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(formStore.clientsShowForm);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
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
  const filtered = clients.filter(c => matchesSearch(search, c.name, c.cui, c.address, c.contactName, c.contactEmail, c.phone)).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const kpis = [
    { key: 'total', label: t('clients_total', 'Total clients'), value: clients.length, icon: Users },
    { key: 'rates', label: t('clients_with_rates', 'Clients with rates'), value: clients.filter(c => (c.rates || []).length > 0).length, color: '#f97316', icon: FileText },
    { key: 'new_month', label: t('clients_new_month', 'New this month'), value: clients.filter(c => c.createdAt && new Date(c.createdAt) >= monthStart).length, color: '#22c55e', icon: Calendar },
    { key: 'discount', label: t('clients_discount', 'With discount'), value: clients.filter(c => Number(c.discount || 0) > 0).length, color: '#6366f1', icon: Percent },
  ];
  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const columns: Column<any>[] = [
    {
      key: 'client', label: t('name') + ' / CUI', width: '260px',
      render: c => (
        <div className="leading-tight min-w-0">
          <div className="font-bold text-[13px] text-text-primary truncate">{c.name}</div>
          <div className="text-[11px] text-text-secondary">CUI: {c.cui || '—'}</div>
        </div>
      ),
    },
    {
      key: 'address', label: t('address'),
      render: c => <div className="text-xs text-text-secondary max-w-[220px] truncate" title={c.address || ''}>{c.address || '—'}</div>,
    },
    {
      key: 'contact', label: t('contact') || 'Contact',
      render: c => {
        const email = c.contactEmail;
        return (
          <div className="leading-tight min-w-0" title={email || undefined}>
            <div className="text-xs font-semibold text-text-primary truncate">👤 {c.contactName || '—'}</div>
            {(c.phone || email) && (
              <div className="text-[11px] text-text-secondary truncate">
                {c.phone ? '📞 ' + c.phone : ''}{c.phone && email ? ' • ' : ''}{email ? '📧 ' + email : ''}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'terms', label: t('terms', 'Terms') || 'Terms', align: 'center',
      render: c => {
        const rates = (c.rates || []).length;
        const disc = Number(c.discount || 0);
        const terms = c.paymentTerms;
        if (!rates && !disc && !terms) return <span className="text-xs text-text-muted">—</span>;
        const parts: string[] = [];
        if (rates) parts.push(rates + ' ' + (rates > 1 ? t('tariffs', 'tarife') : t('tariff', 'tarif')));
        if (disc) parts.push((t('discount', 'Discount') || 'Discount') + ': ' + disc + '%');
        if (terms) parts.push(terms + ' ' + t('days', 'zile'));
        return <span className="text-xs font-semibold text-text-primary whitespace-nowrap">🏷️ {parts.join(' • ')}</span>;
      },
    },
    {
      key: 'registered', label: t('registered', 'Registered'), align: 'center',
      render: c => <span className="text-xs text-text-secondary whitespace-nowrap">{c.createdAt ? formatDate(c.createdAt) : '—'}</span>,
      hideBelow: 'md',
    },
    {
      key: 'actions', label: t('actions'), align: 'right', sticky: 'right', width: '110px',
      render: c => (
        <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
          <button onClick={() => setSelectedClient(c)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('viewDetails', 'View Details')}><Eye className="w-3.5 h-3.5" /></button>
          <button onClick={async () => { try { await generateClientPdf(c, company); } catch (err) { toast.error(t('error_pdf', 'Failed to generate PDF')); } }} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('pdf', 'Download PDF')}><FileText className="w-3.5 h-3.5" /></button>
          <button onClick={() => setSelectedClient(c)} className="p-1 text-text-secondary hover:text-primary rounded-lg hover:bg-surface transition-colors" title={t('edit')}><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleDelete(c.id)} className="p-1 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-colors" title={t('delete')}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];
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
  return <div className="space-y-4 animate-fade-in">

      <KpiStrip dense items={kpis} />

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
              <button type="submit" className="btn-primary !px-4 !py-1.5 text-sm font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => {
            setShowForm(false);
            setEditId(null);
          }} className="btn-secondary !px-4 !py-1.5 text-sm font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>}


      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="px-2.5 py-2 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
            <div className="relative w-[220px] shrink-0">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input className="input pl-8 pr-3 py-1.5 text-xs w-full" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={() => setShowExport(true)} className="btn-secondary px-2 py-1.5 flex items-center text-xs font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all" title={t('export')}>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-text-secondary whitespace-nowrap">{filtered.length} {t('results')}</span>
            <button onClick={() => {
            setShowForm(!showForm);
            setEditId(null);
          }} className="btn-primary px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> {t('addClient')}
            </button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={currentTableItems}
          rowKey={(c: any) => c.id}
          minWidth="880px"
          loading={loading}
          dense
          onRowClick={(c: any) => setSelectedClient(c)}
          emptyState={
            <div className="p-16 text-center">
              <Users className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
              <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData')}</h3>
              <p className="text-text-secondary">{t('noResult') || 'No clients found. Add a new one.'}</p>
            </div>
          }
        />
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Clients_HapCargo" title="Clients" sheetName="Clients" getDateField={item => item.createdAt} headers={[{
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
