const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'client/src/pages/TrucksPage.tsx');

const content = `import { useSaveConfirm } from "../components/SaveConfirmProvider";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, Search, AlertCircle, Download, Truck as TruckIcon, Info, Users, ExternalLink, Settings, Battery, CheckCircle2, ChevronRight, Fuel, Wrench, Settings2 } from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import toast from 'react-hot-toast';
import ExportModal from '../components/ExportModal';
import { formatDate } from '../lib/dateUtils';
import { useFormStore } from '../store/formStore';
import Pagination from '../components/Pagination';

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
  { id: 'adr', label: 'feat_adr', default: 'ADR', icon: AlertCircle },
  { id: 'lift', label: 'feat_lift', default: 'Lift Hidraulic', icon: ChevronRight },
  { id: 'gps', label: 'feat_gps', default: 'GPS Track', icon: Info },
  { id: 'mega', label: 'truck_type_mega', default: 'Mega', icon: TruckIcon },
  { id: 'frigo', label: 'truck_type_frigo', default: 'Frigo', icon: Battery }
];

export default function TrucksPage() {
  const confirmSave = useSaveConfirm();
  const formStore = useFormStore();
  const { t } = useTranslation();
  
  const [trucks, setTrucks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(formStore.trucksShowForm);
  const [search, setSearch] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [drivers, setDrivers] = useState<any[]>([]);
  
  const initialForm = {
    plateNumber: '', brand: '', model: '', year: '',
    truckType: 'tautliner', euronorm: 'Euro 6', features: [] as string[],
    maxWeightKg: '', maxPallets: '', maxLdm: '', maxVolumeCbm: '', payloadCapacity: '',
    costPerKm: '', fuelConsumption: '', totalMileage: '', nextMaintenanceMileage: '', driverId: ''
  };
  
  const [form, setForm] = useState(formStore.trucksForm || initialForm);
  const [editId, setEditId] = useState<string | null>(formStore.trucksEditId);

  useEffect(() => {
    formStore.setFormState('trucks', { showForm, editId, form });
  }, [showForm, editId, form]);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(\`/trucks/\${deleteId}\`);
      toast.success(t('truckDeleted', 'Camion șters cu succes'));
      load();
    } catch {
      toast.error(t('error', 'Eroare'));
    } finally {
      setDeleteId(null);
    }
  };

  const load = () => {
    setLoading(true);
    Promise.all([api.get('/trucks'), api.get('/drivers')])
      .then(([trucksRes, driversRes]) => {
        setTrucks(trucksRes.data);
        setDrivers(driversRes.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
      };

      if (editId) {
        await api.patch(\`/trucks/\${editId}\`, payload);
        toast.success(t('truckUpdated', 'Camion actualizat'));
      } else {
        await api.post('/trucks', payload);
        toast.success(t('truckAdded', 'Camion adăugat'));
      }
      setShowForm(false);
      setEditId(null);
      setForm(initialForm);
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('saveError', 'Eroare la salvare'));
    }
  };

  const filtered = trucks.filter(t => {
    const q = search.toLowerCase();
    return (t.plateNumber || '').toLowerCase().includes(q) 
      || (t.brand || '').toLowerCase().includes(q) 
      || (t.model || '').toLowerCase().includes(q) 
      || (t.truckType || '').toLowerCase().includes(q);
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const openEdit = (truck: any) => {
    setForm({
      plateNumber: truck.plateNumber || '', brand: truck.brand || '', model: truck.model || '', year: truck.year || '',
      truckType: truck.truckType || 'tautliner', euronorm: truck.euronorm || 'Euro 6', features: truck.features || [],
      maxWeightKg: truck.maxWeightKg || '', maxPallets: truck.maxPallets || '', maxLdm: truck.maxLdm || '', maxVolumeCbm: truck.maxVolumeCbm || '',
      payloadCapacity: truck.payloadCapacity || '', costPerKm: truck.costPerKm || '', fuelConsumption: truck.fuelConsumption || '',
      totalMileage: truck.totalMileage || '', nextMaintenanceMileage: truck.nextMaintenanceMileage || '', driverId: truck.driver?.id || ''
    });
    setEditId(truck.id);
    setShowForm(true);
  };

  const toggleFeature = (id: string) => {
    const feats = form.features || [];
    setForm({ ...form, features: feats.includes(id) ? feats.filter((f: string) => f !== id) : [...feats, id] });
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-10">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9 py-2 text-sm w-full" placeholder={t('search', 'Caută camion...')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-3 flex items-center gap-2 text-sm font-semibold">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">{t('export', 'Export')}</span>
          </button>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-3 py-1.5 rounded-lg border border-border">
            {filtered.length} {t('results', 'rezultate')}
          </span>
          <button onClick={() => { setForm(initialForm); setShowForm(true); setEditId(null); }} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm font-semibold shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" /> {t('addTruck', 'Adaugă Camion')}
          </button>
        </div>
      </div>

      {/* Form Drawer / Modal */}
      {showForm && (
        <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden relative">
          <div className="bg-surface/50 border-b border-border px-6 py-4 flex items-center justify-between">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-primary" />
              {editId ? t('editTruck', 'Editează Camion') : t('addTruck', 'Adaugă Camion')}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-5">
              {/* Secțiunea 1: Identificare */}
              <div className="xl:col-span-4 pb-2 mb-2 border-b border-border/50">
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Info className="w-4 h-4"/> 1. Identificare & Alocare</h4>
              </div>
              <div>
                <label className="label font-semibold">{t('plateNumber', 'Număr Înmatriculare')} <span className="text-red-500">*</span></label>
                <input type="text" className="input uppercase" value={form.plateNumber} onChange={e => setForm({...form, plateNumber: e.target.value.toUpperCase()})} required autoFocus />
              </div>
              <div><label className="label font-semibold">{t('brand', 'Marca')} <span className="text-red-500">*</span></label><input type="text" className="input" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} required /></div>
              <div><label className="label font-semibold">{t('model', 'Model')} <span className="text-red-500">*</span></label><input type="text" className="input" value={form.model} onChange={e => setForm({...form, model: e.target.value})} required /></div>
              <div><label className="label font-semibold">{t('year', 'An')} </label><input type="number" className="input" value={form.year} onChange={e => setForm({...form, year: e.target.value})} /></div>
              <div className="xl:col-span-2">
                <label className="label font-semibold">{t('driver', 'Șofer Alocat')}</label>
                <select className="input" value={form.driverId} onChange={e => setForm({...form, driverId: e.target.value})}>
                  <option value="">{t('no_driver', 'Fără șofer')}</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.user?.name || 'Șofer'}</option>)}
                </select>
              </div>

              {/* Secțiunea 2: Specificații Tehnice */}
              <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Settings2 className="w-4 h-4"/> 2. Specificații Tehnice</h4>
              </div>
              <div>
                <label className="label font-semibold">{t('truckType', 'Tip Camion')}</label>
                <select className="input" value={form.truckType} onChange={e => setForm({...form, truckType: e.target.value})}>
                  {TRUCK_TYPES.map(tOption => <option key={tOption.value} value={tOption.value}>{t(tOption.label, tOption.default)}</option>)}
                </select>
              </div>
              <div>
                <label className="label font-semibold">{t('euronorm', 'Normă Poluare')}</label>
                <select className="input" value={form.euronorm} onChange={e => setForm({...form, euronorm: e.target.value})}>
                  {EURONORMS.map(en => <option key={en} value={en}>{en}</option>)}
                </select>
              </div>
              <div className="xl:col-span-2">
                <label className="label font-semibold">{t('features', 'Dotări Speciale')}</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {FEATURES.map(feat => {
                    const active = form.features?.includes(feat.id);
                    return (
                      <button type="button" key={feat.id} onClick={() => toggleFeature(feat.id)} className={\`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 \${active ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-surface border-border text-text-secondary hover:border-text-muted'}\`}>
                        <feat.icon className="w-3.5 h-3.5" />
                        {t(feat.label, feat.default)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Secțiunea 3: Capacitate de Încărcare */}
              <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><TruckIcon className="w-4 h-4"/> 3. Capacitate de Încărcare</h4>
              </div>
              <div><label className="label font-semibold">{t('maxWeightKg', 'Max Greutate (kg)')}</label><input type="number" className="input" value={form.maxWeightKg} onChange={e => setForm({...form, maxWeightKg: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('payloadCapacity', 'Capacitate Utilă (kg)')}</label><input type="number" className="input" value={form.payloadCapacity} onChange={e => setForm({...form, payloadCapacity: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('maxPallets', 'Max Paleți')}</label><input type="number" className="input" value={form.maxPallets} onChange={e => setForm({...form, maxPallets: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('maxLdm', 'Max LDM')}</label><input type="number" step="0.1" className="input" value={form.maxLdm} onChange={e => setForm({...form, maxLdm: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('maxVolumeCbm', 'Max Volum (m³)')}</label><input type="number" className="input" value={form.maxVolumeCbm} onChange={e => setForm({...form, maxVolumeCbm: e.target.value})} /></div>
              <div className="xl:col-span-3"></div>

              {/* Secțiunea 4: Costuri & Mentenanță */}
              <div className="xl:col-span-4 pb-2 mb-2 mt-4 border-b border-border/50">
                <h4 className="text-sm font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Fuel className="w-4 h-4"/> 4. Costuri & Mentenanță</h4>
              </div>
              <div><label className="label font-semibold">{t('costPerKm', 'Cost per km (€)')}</label><input type="number" step="0.01" className="input" value={form.costPerKm} onChange={e => setForm({...form, costPerKm: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('fuelConsumption', 'Consum (l/100km)')}</label><input type="number" step="0.1" className="input" value={form.fuelConsumption} onChange={e => setForm({...form, fuelConsumption: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('totalMileage', 'Kilometraj Total')}</label><input type="number" className="input" value={form.totalMileage} onChange={e => setForm({...form, totalMileage: e.target.value})} /></div>
              <div><label className="label font-semibold">{t('nextMaintenanceMileage', 'Următoarea Revizie (km)')}</label><input type="number" className="input" value={form.nextMaintenanceMileage} onChange={e => setForm({...form, nextMaintenanceMileage: e.target.value})} /></div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-border bg-surface/30 -mx-6 -mb-6 px-6 py-4 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary px-6 py-2.5 font-bold">{t('cancel', 'Anulează')}</button>
              <button type="submit" className="btn-primary px-8 py-2.5 font-bold shadow-md shadow-primary/20">{t('save', 'Salvează')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Truck Cards */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>
      ) : currentItems.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center shadow-sm">
          <TruckIcon className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-bold text-text-primary mb-1">{t('noData', 'Nu există date')}</h3>
          <p className="text-text-secondary">{t('noResult', 'Niciun camion găsit. Adaugă unul nou.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {currentItems.map(truck => {
            const hasMaintenanceWarning = truck.totalMileage && truck.nextMaintenanceMileage && (truck.nextMaintenanceMileage - truck.totalMileage <= 3000);
            
            return (
              <div key={truck.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all hover:border-primary/30 flex flex-col group">
                
                {/* Header */}
                <div className="p-5 border-b border-border bg-surface/30 relative">
                  <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(truck)} className="p-1.5 bg-white dark:bg-gray-800 text-text-secondary hover:text-primary border border-border rounded-md shadow-sm">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(truck.id)} className="p-1.5 bg-white dark:bg-gray-800 text-text-secondary hover:text-red-500 border border-border rounded-md shadow-sm">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                      <TruckIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-text-primary tracking-tight">{truck.plateNumber}</h3>
                      <p className="text-xs font-semibold text-text-secondary">{truck.brand} {truck.model} {truck.year ? \`• \${truck.year}\` : ''}</p>
                    </div>
                  </div>

                  {/* Features & Types badges */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {TRUCK_TYPES.find(t => t.value === (truck.truckType || 'tautliner'))?.default || 'Tautliner'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 border border-gray-200">
                      {truck.euronorm || 'Euro 6'}
                    </span>
                    {truck.features?.includes('adr') && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">ADR</span>}
                    {truck.features?.includes('frigo') && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">Frigo</span>}
                    {truck.features?.includes('mega') && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Mega</span>}
                    {truck.features?.includes('lift') && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">Lift</span>}
                  </div>
                </div>

                {/* Specs Body */}
                <div className="p-5 flex-1">
                  
                  {/* Capacity Bars */}
                  <div className="space-y-3 mb-5">
                    <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1"><PackageIcon className="w-3 h-3"/> Capacitate Maximă</h4>
                    
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-text-secondary mb-1">
                        <span>Greutate</span>
                        <span className="text-text-primary">{(truck.payloadCapacity || truck.maxWeightKg || 24000).toLocaleString()} kg</span>
                      </div>
                      <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden"><div className="h-full bg-primary/40 rounded-full w-full"></div></div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-text-secondary mb-1">
                          <span>Volum LDM</span>
                          <span className="text-text-primary">{truck.maxLdm || 13.6} m</span>
                        </div>
                        <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden"><div className="h-full bg-green-500/40 rounded-full w-full"></div></div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-semibold text-text-secondary mb-1">
                          <span>Paleți</span>
                          <span className="text-text-primary">{truck.maxPallets || 33}</span>
                        </div>
                        <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden"><div className="h-full bg-orange-500/40 rounded-full w-full"></div></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border/50">
                    <div className="bg-surface/50 rounded-xl p-3 flex flex-col justify-center items-center text-center border border-border/50">
                      <Fuel className="w-4 h-4 text-text-secondary mb-1" />
                      <span className="text-[10px] text-text-secondary font-semibold uppercase">{t('fuelConsumption', 'Consum')}</span>
                      <span className="font-bold text-sm text-text-primary">{truck.fuelConsumption ? \`\${truck.fuelConsumption} L\` : '-'}</span>
                    </div>
                    <div className="bg-surface/50 rounded-xl p-3 flex flex-col justify-center items-center text-center border border-border/50">
                      <Battery className="w-4 h-4 text-text-secondary mb-1" />
                      <span className="text-[10px] text-text-secondary font-semibold uppercase">{t('costPerKm', 'Cost / km')}</span>
                      <span className="font-bold text-sm text-text-primary">{truck.costPerKm ? \`€\${truck.costPerKm}\` : '-'}</span>
                    </div>
                  </div>

                </div>

                {/* Footer Info */}
                <div className="px-5 py-3 border-t border-border bg-surface/30 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Users className="w-3.5 h-3.5 text-text-muted" />
                    {truck.driver ? <span className="text-primary">{truck.driver.user?.name}</span> : <span className="text-text-muted italic">{t('no_driver', 'Fără șofer')}</span>}
                  </div>
                  {hasMaintenanceWarning && (
                    <div className="flex items-center gap-1 font-bold text-red-500" title="Revizie necesară în curând!">
                      <Wrench className="w-3.5 h-3.5" /> Atenție revizie
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      )}

      <ExportModal isOpen={showExport} onClose={() => setShowExport(false)} data={filtered} filename="Trucks_HapCargo" getDateField={item => item.createdAt} headers={[
        { key: 'plateNumber', label: 'License Plate' },
        { key: 'brand', label: 'Brand' },
        { key: 'truckType', label: 'Type' },
        { key: 'euronorm', label: 'Euronorm' },
        { key: 'maxWeightKg', label: t('maxWeightKg', 'Max Weight (kg)') },
        { key: 'maxPallets', label: t('maxPallets', 'Max Pallets') },
        { key: 'costPerKm', label: 'Cost/Km (€)' },
      ]} />
    
      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={executeDelete} type="danger" />
    </div>
  );
}

const PackageIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);
`;

fs.writeFileSync(pagePath, content, 'utf8');
console.log('TrucksPage rewritten successfully');
