import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, AlertCircle, Download } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';
import { useShortcuts } from '../hooks/useShortcuts';
import { useTableShortcuts } from '../hooks/useTableShortcuts';
export default function TrucksPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const {
    t
  } = useTranslation();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(formStore.trucksShowForm);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [form, setForm] = useState(formStore.trucksForm || {
    plateNumber: '',
    brand: '',
    model: '',
    year: '',
    payloadCapacity: '',
    fuelConsumption: '',
    totalMileage: '',
    nextMaintenanceMileage: '',
    driverId: ''
  });
  const [editId, setEditId] = useState<string | null>(formStore.trucksEditId);
  const [selectedRowIndex, setSelectedRowIndex] = useState(-1);
  useEffect(() => {
    formStore.setFormState('trucks', {
      showForm,
      editId,
      form
    });
  }, [showForm, editId, form]);
  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/trucks/${deleteId}`);
      toast.success(t('truckDeleted'));
      load();
    } catch {
      toast.error(t('error') || 'Error');
    } finally {
      setDeleteId(null);
    }
  };
  const load = () => {
    api.get('/trucks').then(r => {
      setTrucks(r.data);
      setLoading(false);
    });
    api.get('/drivers').then(r => setDrivers(r.data));
  };
  useEffect(() => {
    load();
  }, []);
  const handleSubmit = async (e?: any) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/trucks/${editId}`, form);
        toast.success(t('truckUpdated'));
      } else {
        await api.post('/trucks', form);
        toast.success(t('truckAdded'));
      }
      setShowForm(false);
      setEditId(null);
      setForm({
        plateNumber: '',
        brand: '',
        model: '',
        year: '',
        payloadCapacity: '',
        fuelConsumption: '',
        totalMileage: '',
        nextMaintenanceMileage: '',
        driverId: ''
      });
      load();
    } catch {
      toast.error(t('saveError'));
    }
  };
  const filtered = trucks.filter(t => {
    const query = search.toLowerCase();
    return (t.plateNumber || '').toLowerCase().includes(query) || (t.brand || '').toLowerCase().includes(query) || (t.model || '').toLowerCase().includes(query) || (t.year || '').toString().includes(query) || (t.status || '').toLowerCase().includes(query);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const currentTableItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  useShortcuts({
    'shift+n': () => {
      if (!showForm) {
        setForm({
          plateNumber: '',
          brand: '',
          model: '',
          year: '',
          payloadCapacity: '',
          fuelConsumption: '',
          totalMileage: '',
          nextMaintenanceMileage: '',
          driverId: ''
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
      }
    }
  });
  useTableShortcuts({
    items: currentTableItems,
    selectedIndex: selectedRowIndex,
    setSelectedIndex: setSelectedRowIndex,
    onOpen: truck => {
      setForm({
        plateNumber: truck.plateNumber,
        brand: truck.brand,
        model: truck.model,
        year: truck.year,
        payloadCapacity: truck.payloadCapacity,
        fuelConsumption: truck.fuelConsumption,
        totalMileage: truck.totalMileage || '',
        nextMaintenanceMileage: truck.nextMaintenanceMileage || '',
        driverId: truck.driver?.id || ''
      });
      setEditId(truck.id);
      setShowForm(true);
    },
    onDelete: truck => setDeleteId(truck.id),
    isActive: !showForm
  });
  const statusBadge = (s: string) => ({
    active: 'badge-success',
    in_trip: 'badge-primary',
    maintenance: 'badge-warning',
    inactive: 'badge-gray'
  })[s] || 'badge-gray';
  return <div className="space-y-5 animate-fade-in">

      {showForm && <div className="card animate-fade-in bg-card border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editTruck') || 'Editează camion' : t('addTruck')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[{
          key: 'plateNumber',
          label: t('plateNumber'),
          required: true
        }, {
          key: 'brand',
          label: t('brand'),
          required: true
        }, {
          key: 'model',
          label: t('model'),
          required: true
        }, {
          key: 'year',
          label: t('year'),
          type: 'number'
        }, {
          key: 'payloadCapacity',
          label: t('capacity') + ' (t)',
          type: 'number'
        }, {
          key: 'fuelConsumption',
          label: t('consumption') + ' (l/100km)',
          type: 'number'
        }].map(f => <div key={f.key}>
                <label className="label font-semibold">{f.label}</label>
                <input type={f.type || 'text'} className="input" value={(form as any)[f.key] || ''} onChange={e => {
            let val = e.target.value;
            if (f.key === 'plateNumber') val = val.toUpperCase();
            setForm({
              ...form,
              [f.key]: val
            });
          }} required={f.required} autoFocus={f.key === 'plateNumber'} />
              </div>)}
            <div>
              <label className="label font-semibold">{t('driver', 'Șofer')}</label>
              <select className="input" value={(form as any).driverId || ''} onChange={e => setForm({
            ...form,
            driverId: e.target.value
          })}>
                <option value="">{t('no_driver', 'Fără șofer')}</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.user?.name || 'Șofer'}</option>)}
              </select>
            </div>
            <div className="flex gap-3 col-span-1 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">{t('saveBtn', 'Salvează')}</button>
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
            setForm({
              plateNumber: '',
              brand: '',
              model: '',
              year: '',
              payloadCapacity: '',
              fuelConsumption: '',
              totalMileage: '',
              nextMaintenanceMileage: '',
              driverId: ''
            });
            setShowForm(true);
            setEditId(null);
          }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('addTruck')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[t('plateNumber'), t('brand'), t('model'), t('year'), t('driver', 'Șofer'), t('capacity'), t('consumption'), t('maintenance'), t('status'), t('documents'), t('actions')].map(h => <th key={h} className={`table-header ${h === t('actions') ? 'text-right pr-4' : ''}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="table-cell text-center py-8 text-text-secondary">{t('loading')}</td></tr> : filtered.length === 0 ? <tr><td colSpan={9} className="table-cell text-center py-8 text-text-secondary">{t('noData')}</td></tr> : currentTableItems.map((truck: any, idx: number) => <tr key={truck.id} className={`hover:bg-surface/60 transition-colors cursor-pointer ${selectedRowIndex === idx ? 'bg-primary/5 ring-1 ring-inset ring-primary' : ''}`} onClick={e => {
              if ((e.target as HTMLElement).closest('button, select, input, a, .interactive-click')) return;
              setForm({
                plateNumber: truck.plateNumber,
                brand: truck.brand,
                model: truck.model,
                year: truck.year,
                payloadCapacity: truck.payloadCapacity,
                fuelConsumption: truck.fuelConsumption,
                totalMileage: truck.totalMileage || '',
                nextMaintenanceMileage: truck.nextMaintenanceMileage || '',
                driverId: truck.driver?.id || ''
              });
              setEditId(truck.id);
              setShowForm(true);
            }}>
                  <td className="table-cell font-bold text-primary">{truck.plateNumber}</td>
                  <td className="table-cell font-medium text-text">{truck.brand}</td>
                  <td className="table-cell text-text">{truck.model}</td>
                  <td className="table-cell text-text-secondary">{truck.year || '—'}</td>
                  <td className="table-cell text-text-secondary">
                    {truck.driver?.user?.name ? <span className="font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">{truck.driver.user.name}</span> : <span className="text-xs text-text-secondary italic">{t('no_driver', 'Fără șofer')}</span>}
                  </td>
                  <td className="table-cell text-text-secondary">{truck.payloadCapacity ? `${truck.payloadCapacity}t` : '—'}</td>
                  <td className="table-cell text-text-secondary">{truck.fuelConsumption ? `${truck.fuelConsumption}l` : '—'}</td>
                  <td className="table-cell">
                    {truck.totalMileage && truck.nextMaintenanceMileage ? (() => {
                  const current = Number(truck.totalMileage);
                  const threshold = Number(truck.nextMaintenanceMileage);
                  const diff = threshold - current;
                  const isOverdue = diff <= 0;
                  const isWarning = diff > 0 && diff <= 3000;
                  return <div className={`flex flex-col text-xs font-semibold ${isOverdue ? 'text-error' : isWarning ? 'text-warning' : 'text-text-secondary'}`}>
                          <div className="flex items-center gap-1">
                            {isOverdue || isWarning ? <AlertCircle className="w-3 h-3" /> : null}
                            {current.toLocaleString()} km
                          </div>
                          <div className="text-[10px] opacity-80 font-normal">{t('maintenanceAt') || 'Revizie la:'} {threshold.toLocaleString()} km</div>
                        </div>;
                })() : <span className="text-xs text-text-light">—</span>}
                  </td>
                  <td className="table-cell"><span className={statusBadge(truck.status)}>{t(truck.status)}</span></td>
                  <td className="table-cell">
                    {truck.documents?.length > 0 ? <div className="flex items-center gap-1 text-xs">
                        <span className="badge-gray">{truck.documents.length} {t('documents').toLowerCase()}</span>
                        {truck.documents.some((d: any) => new Date(d.expiryDate) < new Date(Date.now() + 30 * 86400000)) && <AlertCircle className="w-4 h-4 text-warning animate-pulse" />}
                      </div> : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-end gap-1 pr-2">
                      <button onClick={() => {
                    setForm({
                      plateNumber: truck.plateNumber,
                      brand: truck.brand,
                      model: truck.model,
                      year: truck.year,
                      payloadCapacity: truck.payloadCapacity,
                      fuelConsumption: truck.fuelConsumption,
                      totalMileage: truck.totalMileage || '',
                      nextMaintenanceMileage: truck.nextMaintenanceMileage || '',
                      driverId: truck.driver?.id || ''
                    });
                    setEditId(truck.id);
                    setShowForm(true);
                  }} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(truck.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Trucks_HapCargo" getDateField={item => item.createdAt} headers={[{
      key: 'createdAt',
      label: 'Registration Date',
      transform: val => val ? formatDate(val) : ''
    }, {
      key: 'plateNumber',
      label: 'License Plate'
    }, {
      key: 'brand',
      label: 'Brand'
    }, {
      key: 'model',
      label: 'Model'
    }, {
      key: 'year',
      label: t('year')
    }, {
      key: 'payloadCapacity',
      label: `${t('capacity')} (t)`
    }, {
      key: 'fuelConsumption',
      label: `${t('consumption')} (l/100km)`
    }, {
      key: 'status',
      label: 'Status'
    }]} />
    
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
    </div>;
}