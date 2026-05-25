import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Plus, Pencil, Trash2, Search, ChevronDown, Scale, Layers, Download, FileText, Clock, Box, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import ExportModal from '../components/ExportModal';
import { generateInvoicePdfBase64 } from '../lib/invoicePdfGenerator';
import ConfirmModal from '../components/ConfirmModal';
import { TimePicker } from '../components/TimePicker';
import { formatDate } from '../lib/dateUtils';
import RouteCalculator from '../components/RouteCalculator';

import CustomSelect from '../components/CustomSelect';
import type { SelectOption } from '../components/CustomSelect';
import AddressAutocomplete from '../components/AddressAutocomplete';

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-gray', confirmed: 'badge-primary', in_progress: 'badge-warning',
  completed: 'badge-success', cancelled: 'badge-error', delayed: 'badge-error',
};

export default function TripsPage() {
  const { t, i18n } = useTranslation();
  const [trips, setTrips] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showExport, setShowExport] = useState(false);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const [statusCoords, setStatusCoords] = useState({ left: 0, top: 0, width: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);
  const [palletDropdownOpen, setPalletDropdownOpen] = useState(false);
  
  const [form, setForm] = useState<any>({
    clientId: '', truckId: '', driverId: '', pickupAddress: '', dropoffAddress: '',
    pickupDate: '', dropoffDate: '', price: '', estimatedCost: '', realCost: '', distanceKm: '', notes: '',
    pickupTime: '', dropoffTime: '', pallets: '', palletType: '', weightKg: '', volumeCbm: '',
    loadingReference: '', unloadingReference: '',
  });
  const [dieselPrice, setDieselPrice] = useState<number>(1.68);
  const [confirmModal, setConfirmModal] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    type: 'info',
    onConfirm: () => {},
  });

  const load = async () => {
    try {
      const [tr, cl, tk, dr, dp] = await Promise.all([
        api.get('/trips'), api.get('/clients'), api.get('/trucks'), api.get('/drivers'),
        api.get('/routing/diesel-prices').catch(() => ({ data: [] }))
      ]);
      setTrips(tr.data); setClients(cl.data); setTrucks(tk.data); setDrivers(dr.data);
      if (dp.data && dp.data.length > 0) {
        const ro = dp.data.find((p: any) => p.country === 'RO');
        if (ro) setDieselPrice(ro.price);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSmartDispatch = async () => {
    if (!form.pickupAddress) {
      toast.error(t('smartDispatchAddressError') || 'Introdu mai întâi adresa de preluare (Pickup)!');
      return;
    }
    
    // We only consider trucks that are NOT currently in a trip (or active) AND have GPS coordinates
    const availableTrucks = trucks.filter((t: any) => 
      t.status === 'active' && t.currentLat && t.currentLng
    );

    if (availableTrucks.length === 0) {
      toast.error(t('noAvailableTrucks') || 'Nu există camioane disponibile cu locație GPS cunoscută.');
      return;
    }

    setIsDispatching(true);
    const toastId = toast.loading(t('calculatingSmartDispatch') || 'Calculăm cel mai apropiat camion...');

    try {
      const geoRes = await api.get('/routing/geocode', { params: { address: form.pickupAddress } });
      const { lat: pLat, lng: pLng } = geoRes.data;

      if (!pLat || !pLng) throw new Error('Geocoding failed');

      // Helper for Haversine distance
      const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      let closestTruck = null;
      let minDistance = Infinity;

      for (const t of availableTrucks) {
        const dist = getDistance(pLat, pLng, parseFloat(t.currentLat), parseFloat(t.currentLng));
        if (dist < minDistance) {
          minDistance = dist;
          closestTruck = t;
        }
      }

      if (closestTruck) {
        setForm(prev => ({
          ...prev,
          truckId: closestTruck.id,
          driverId: closestTruck.driver?.id || prev.driverId,
        }));
        toast.success(
          `${t('smartDispatchSuccess') || 'S-a auto-selectat'} ${closestTruck.plateNumber} (aprox. ${Math.round(minDistance)} km distanță pe gol)`
        );
      }
    } catch (err) {
      toast.error(t('smartDispatchError') || 'Eroare la calcularea distanțelor.');
    } finally {
      toast.dismiss(toastId);
      setIsDispatching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = form.price === '' ? 0 : Number(form.price);
    const costNum = form.estimatedCost === '' ? 0 : Number(form.estimatedCost);

    if (priceNum > 0 && costNum > 0 && priceNum < costNum) {
      const confirmMsg = i18n.language === 'ro'
        ? `Atenție: Prețul cursei (€${priceNum}) este mai mic decât costul estimat (€${costNum})!\n\nSalvarea acestei curse va genera o pierdere de €${(costNum - priceNum).toFixed(2)} pentru companie.\n\nSigur vrei să continui?`
        : `Warning: The price (€${priceNum}) is lower than the estimated cost (€${costNum})!\n\nSaving this trip will result in a loss of €${(costNum - priceNum).toFixed(2)} for the company.\n\nAre you sure you want to continue?`;
      
      if (!window.confirm(confirmMsg)) {
        return;
      }
    }

    try {
      const data = {
        ...form,
        price: form.price === '' ? null : Number(form.price),
        estimatedCost: form.estimatedCost === '' ? null : Number(form.estimatedCost),
        realCost: form.realCost === '' ? null : Number(form.realCost),
        distanceKm: form.distanceKm === '' ? null : Number(form.distanceKm),
        pallets: form.pallets === '' ? null : Number(form.pallets),
        weightKg: form.weightKg === '' ? null : Number(form.weightKg),
        volumeCbm: form.volumeCbm === '' ? null : Number(form.volumeCbm),
      };

      if (editId) {
        await api.patch(`/trips/${editId}`, data);
        toast.success(t('tripUpdated'));
      } else {
        await api.post('/trips', data);
        toast.success(t('tripAdded'));
      }
      setShowForm(false); setEditId(null); 
      setForm({ 
        clientId:'', truckId:'', driverId:'', pickupAddress:'', dropoffAddress:'', 
        pickupDate:'', dropoffDate:'', price:'', estimatedCost:'', realCost:'', distanceKm:'', notes:'',
        pickupTime: '', dropoffTime: '', pallets: '', weightKg: '', volumeCbm: '',
        loadingReference: '', unloadingReference: '',
      });
      load();
    } catch { toast.error(t('saveError')); }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('deleteTrip') || 'Șterge cursa',
      message: t('confirm') || 'Ștergi cursa?',
      confirmText: t('delete') || 'Șterge',
      cancelText: t('cancel') || 'Anulează',
      type: 'danger',
      onConfirm: async () => {
        setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
        await api.delete(`/trips/${id}`);
        toast.success(t('tripDeleted')); load();
      }
    });
  };

  const handleGenerateInvoice = async (trip: any) => {
    const loadId = toast.loading(t('generatingInvoice'));
    try {
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const amount = Number(trip.price) || 0;
      const vatPercent = 19;
      const notes = `Invoice automatically generated for trip ${trip.pickupAddress} to ${trip.dropoffAddress}`;

      // Create invoice record on server
      const res = await api.post('/invoices', {
        clientId: trip.client?.id,
        tripId: trip.id,
        amount,
        vatPercent,
        issueDate,
        dueDate,
        status: 'sent',
        notes
      });

      const savedInvoice = res.data;

      // Combine for generating fully populated PDF on client side
      const invoiceWithFullRelations = {
        ...savedInvoice,
        client: trip.client,
        trip: trip
      };

      // Generate base64 PDF
      const base64Pdf = generateInvoicePdfBase64(invoiceWithFullRelations);

      // Save PDF to database
      await api.patch(`/invoices/${savedInvoice.id}`, { pdfData: base64Pdf });

      toast.dismiss(loadId);
      toast.success(t('invoiceGenerated'));

      // Ask user if they want to preview/download immediately using the custom ConfirmModal!
      setConfirmModal({
        isOpen: true,
        title: t('invoiceGenerated') || 'Factură generată!',
        message: t('viewInvoiceConfirm') || 'Doriți să previzualizați factura generată?',
        confirmText: t('preview') || 'Previzualizează',
        cancelText: t('close') || 'Închide',
        type: 'success',
        onConfirm: () => {
          setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
          const newTab = window.open();
          if (newTab) {
            newTab.document.write(
              `<iframe src="${base64Pdf}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`
            );
          } else {
            // Fallback to download
            const link = document.createElement("a");
            link.href = base64Pdf;
            link.download = `Factura_${savedInvoice.invoiceNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
      });
    } catch (err) {
      toast.dismiss(loadId);
      toast.error(t('invoiceGenerateError'));
    }
  };

  const handleEdit = (trip: any) => {
    setForm({ 
      clientId: trip.client?.id, 
      truckId: trip.truck?.id, 
      driverId: trip.driver?.id,
      pickupAddress: trip.pickupAddress, 
      dropoffAddress: trip.dropoffAddress,
      pickupDate: trip.pickupDate?.slice(0, 10), 
      dropoffDate: trip.dropoffDate?.slice(0, 10) || '',
      price: trip.price, 
      estimatedCost: trip.estimatedCost, 
      realCost: trip.realCost || '',
      distanceKm: trip.distanceKm, 
      notes: trip.notes || '',
      pickupTime: trip.pickupTime || '',
      dropoffTime: trip.dropoffTime || '',
      pallets: trip.pallets || '',
      palletType: trip.palletType || '',
      weightKg: trip.weightKg || '',
      volumeCbm: trip.volumeCbm || '',
      loadingReference: trip.loadingReference || '',
      unloadingReference: trip.unloadingReference || '',
      status: trip.status || 'pending',
    });
    setEditId(trip.id); setShowForm(true);
  };

  const filtered = trips.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    const query = search.toLowerCase();
    return (
      (t.client?.name || '').toLowerCase().includes(query) ||
      (t.pickupAddress || '').toLowerCase().includes(query) ||
      (t.dropoffAddress || '').toLowerCase().includes(query) ||
      (t.loadingReference || '').toLowerCase().includes(query) ||
      (t.unloadingReference || '').toLowerCase().includes(query) ||
      (t.truck?.plateNumber || '').toLowerCase().includes(query) ||
      (t.truck?.brand || '').toLowerCase().includes(query) ||
      (t.driver?.user?.name || '').toLowerCase().includes(query) ||
      (t.notes || '').toLowerCase().includes(query) ||
      (t.status || '').toLowerCase().includes(query) ||
      String(t.price || '').includes(query)
    );
  }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">{t('trips')}</h1>
          <p className="text-text-secondary text-sm">{trips.length} {t('trips').toLowerCase()}</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('addTrip')}
        </button>
      </div>

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-5 text-primary border-b border-border pb-3">
            {editId ? t('editTrip') : t('addTrip')}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Client, Truck, Driver */}
            <div>
              <label className="label font-semibold">{t('client')}</label>
              <CustomSelect
                value={form.clientId}
                onChange={val => setForm({...form, clientId: val})}
                placeholder={t('selectClient')}
                options={clients.map((c: any) => ({ value: c.id, label: c.name }))}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label font-semibold mb-0">{t('truck')}</label>
                <button 
                  type="button" 
                  onClick={handleSmartDispatch} 
                  disabled={!form.pickupAddress || isDispatching} 
                  className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-bold hover:bg-amber-100 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Zap className="w-3 h-3" /> Smart Dispatch
                </button>
              </div>
              <CustomSelect
                value={form.truckId}
                onChange={val => setForm({...form, truckId: val})}
                placeholder={t('selectTruck')}
                options={trucks.map((t: any) => ({ value: t.id, label: `${t.plateNumber} — ${t.brand} ${t.model}` }))}
              />
            </div>
            <div>
              <label className="label font-semibold">{t('driver')}</label>
              <CustomSelect
                value={form.driverId}
                onChange={val => setForm({...form, driverId: val})}
                placeholder={t('selectDriver')}
                options={drivers.map((d: any) => {
                  let color = '';
                  let disabled = false;
                  if (d.status === 'sick') { color = 'text-error'; disabled = true; }
                  else if (d.status === 'vacation') { color = 'text-warning'; disabled = true; }
                  else if (d.status === 'in_trip') { color = 'text-primary'; }
                  else if (d.status === 'off') { color = 'text-gray-500'; }

                  return {
                    value: d.id,
                    label: d.user?.name || 'Unknown',
                    color: color,
                    disabled: disabled,
                    subLabel: d.status ? t(d.status === 'in_trip' ? 'inTrip' : d.status === 'off' ? 'unavailable' : d.status) : ''
                  };
                })}
              />
            </div>
            
            {/* Addresses */}
            <div>
              <label className="label font-semibold">{t('pickupAddress')}</label>
              <AddressAutocomplete 
                value={form.pickupAddress} 
                onChange={(val) => setForm({...form, pickupAddress: val})} 
                required 
              />
            </div>
            <div>
              <label className="label font-semibold">{t('dropoffAddress')}</label>
              <AddressAutocomplete 
                value={form.dropoffAddress} 
                onChange={(val) => setForm({...form, dropoffAddress: val})} 
                required 
              />
            </div>
            <div>
              <label className="label font-semibold">{t('distance')} (km)</label>
              <input type="number" className="input" value={form.distanceKm} onChange={e => setForm({...form, distanceKm: e.target.value})} />
            </div>
            {/* ─── Route Calculator (spans full width) ─── */}
            <div className="col-span-full">
              <RouteCalculator
                pickupAddress={form.pickupAddress}
                dropoffAddress={form.dropoffAddress}
                weightKg={form.weightKg ? Number(form.weightKg) : undefined}
                dieselPricePerL={dieselPrice}
                onApply={({ distanceKm, estimatedCost }) => {
                  setForm((f: any) => ({
                    ...f,
                    distanceKm: distanceKm.toString(),
                    ...(estimatedCost !== undefined ? { estimatedCost: estimatedCost.toString() } : {}),
                  }));
                  toast.success('✅ Datele rutei au fost aplicate!');
                }}
              />
            </div>

            {/* Dates & Times */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold text-xs">{t('pickupDate')}</label>
                <Flatpickr
                  value={form.pickupDate}
                  onChange={(dates, dateStr) => setForm({...form, pickupDate: dateStr})}
                  className="input text-xs bg-white"
                  options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="label font-semibold text-xs">{t('pickupTime')}</label>
                <TimePicker
                  value={form.pickupTime}
                  onChange={(v) => setForm({...form, pickupTime: v})}
                  label={t('pickupTime')}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label font-semibold text-xs">{t('dropoffDate')}</label>
                <Flatpickr
                  value={form.dropoffDate}
                  onChange={(dates, dateStr) => setForm({...form, dropoffDate: dateStr})}
                  className="input text-xs bg-white"
                  options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: true }}
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div>
                <label className="label font-semibold text-xs">{t('dropoffTime')}</label>
                <TimePicker
                  value={form.dropoffTime}
                  onChange={(v) => setForm({...form, dropoffTime: v})}
                  label={t('dropoffTime')}
                />
              </div>
            </div>

            {/* Financial Details */}
            <div className="border-t border-dashed border-border pt-4 md:col-span-2 lg:col-span-3">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-3">{i18n.language === 'ro' ? 'Detalii Financiare' : 'Financial Details'}</span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`label font-semibold text-xs ${Number(form.price) > 0 && Number(form.estimatedCost) > 0 && Number(form.price) < Number(form.estimatedCost) ? 'text-red-600 font-bold' : ''}`}>{t('price')} (€)</label>
                  <input type="number" className={`input text-xs ${Number(form.price) > 0 && Number(form.estimatedCost) > 0 && Number(form.price) < Number(form.estimatedCost) ? 'border-red-400 focus:border-red-500 focus:ring-red-200 bg-red-50/30 font-bold text-red-700' : ''}`} value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                  {Number(form.price) > 0 && Number(form.estimatedCost) > 0 && Number(form.price) < Number(form.estimatedCost) && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800 leading-tight shadow-sm animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-red-700">{i18n.language === 'ro' ? 'Atenție: Preț sub costul estimat!' : 'Warning: Price below estimated cost!'}</div>
                        <div className="text-[11px] mt-0.5 text-red-600 font-medium">
                          {i18n.language === 'ro' ? 'Salvarea va genera o pierdere de ' : 'Saving will result in a loss of '}
                          <span className="font-bold text-red-700 text-xs">€{(Number(form.estimatedCost) - Number(form.price)).toFixed(2)}</span>.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label font-semibold text-xs">{t('estimatedCost')} (€)</label>
                  <input type="number" className="input text-xs" value={form.estimatedCost} onChange={e => setForm({...form, estimatedCost: e.target.value})} />
                </div>
                <div>
                  <label className="label font-semibold text-xs">{t('realCost')} (€)</label>
                  <input type="number" className="input text-xs" value={form.realCost} onChange={e => setForm({...form, realCost: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Optional Cargo Details (Pallets, Weight, Volume) */}
            <div className="border-t border-dashed border-border pt-4 md:col-span-2 lg:col-span-3">
              <span className="text-xs font-bold text-primary uppercase tracking-wider block mb-3">{t('cargoDetailsOptional')}</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="label text-xs flex items-center gap-1 font-semibold">
                    <Layers className="w-3.5 h-3.5 text-primary" /> {t('pallets')}
                  </label>
                  <input type="number" placeholder="ex: 33" className="input" value={form.pallets} onChange={e => setForm({...form, pallets: e.target.value})} />
                </div>
                <div>
                  <label className="label text-xs flex items-center gap-1 font-semibold">
                    <Layers className="w-3.5 h-3.5 text-primary" /> {t('palletType')}
                  </label>
                  <div className="relative">
                    <div 
                      className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-2.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-200 font-medium shadow-sm hover:border-slate-300 cursor-pointer flex justify-between items-center"
                      onClick={() => setPalletDropdownOpen(!palletDropdownOpen)}
                    >
                      <span>
                        {form.palletType === 'Euro paleti' ? t('euroPallets') :
                         form.palletType === 'Block paleti' ? t('blockPallets') :
                         form.palletType === 'Overige' ? t('otherPallets') : t('selectPalletType')}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-300 ${palletDropdownOpen ? 'rotate-180' : ''}`} />
                    </div>
                    
                    {palletDropdownOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-fade-in-up">
                        <div 
                          className="px-4 py-3 hover:bg-primary/5 cursor-pointer text-sm font-medium transition-colors text-slate-700 border-b border-slate-50"
                          onClick={() => { setForm({...form, palletType: 'Euro paleti'}); setPalletDropdownOpen(false); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            {t('euroPallets')}
                          </div>
                        </div>
                        <div 
                          className="px-4 py-3 hover:bg-primary/5 cursor-pointer text-sm font-medium transition-colors text-slate-700 border-b border-slate-50"
                          onClick={() => { setForm({...form, palletType: 'Block paleti'}); setPalletDropdownOpen(false); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                            {t('blockPallets')}
                          </div>
                        </div>
                        <div 
                          className="px-4 py-3 hover:bg-primary/5 cursor-pointer text-sm font-medium transition-colors text-slate-700"
                          onClick={() => { setForm({...form, palletType: 'Overige'}); setPalletDropdownOpen(false); }}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                            {t('otherPallets')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label text-xs flex items-center gap-1 font-semibold">
                    <Scale className="w-3.5 h-3.5 text-primary" /> {t('weightKg')}
                  </label>
                  <input type="number" placeholder="ex: 24000" className="input" value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} />
                </div>
                <div>
                  <label className="label text-xs flex items-center gap-1 font-semibold">
                    <Box className="w-3.5 h-3.5 text-primary" /> {t('volumeCbm')}
                  </label>
                  <input type="number" step="0.01" placeholder="ex: 86.5" className="input" value={form.volumeCbm} onChange={e => setForm({...form, volumeCbm: e.target.value})} />
                </div>
              </div>
            </div>

            {/* References (Loading, Unloading) */}
            <div className="border-t border-dashed border-border pt-4 md:col-span-2 lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-semibold">{t('loadingReference')}</label>
                  <input className="input" placeholder="ex: REF-12345" value={form.loadingReference || ''} onChange={e => setForm({...form, loadingReference: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="label text-xs font-semibold">{t('unloadingReference')}</label>
                  <input className="input" placeholder="ex: REF-67890" value={form.unloadingReference || ''} onChange={e => setForm({...form, unloadingReference: e.target.value.toUpperCase()})} />
                </div>
              </div>
            </div>
 
            <div className="md:col-span-2 lg:col-span-3">
              <label className="label font-semibold">{t('notes')}</label>
              <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            
            <div className="flex gap-3 md:col-span-2 lg:col-span-3 pt-3 border-t border-border mt-2">
              <button type="submit" className="btn-primary px-6 py-2.5 font-bold shadow-md shadow-primary/20">{t('save')}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary px-6 py-2.5 font-bold">{t('cancel')}</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
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
          
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full mt-3 gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar flex-nowrap w-full">
              {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    statusFilter === s 
                      ? 'bg-primary text-white shadow-sm' 
                      : 'bg-surface text-text-secondary hover:bg-orange-50 hover:text-primary'
                  }`}
                >
                  {t(s === 'all' ? 'allTrips' : s === 'in_progress' ? 'inProgress' : s)}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg ml-auto">
              {filtered.length} {t('results')}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[
                  t('created'),
                  t('client'),
                  t('pickup'),
                  t('dropoff'),
                  'ETA (Smart)',
                  t('truck'),
                  t('driver'),
                  t('cargoDetails'),
                  t('loadingReference'),
                  t('unloadingReference'),
                  t('price'),
                  t('realCost'),
                  t('profit'),
                  t('status'),
                  t('actions')
                ].map(h => (
                  <th key={h} className="table-header whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={14} className="table-cell text-center text-text-secondary py-8">{t('loading')}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={14} className="table-cell text-center text-text-secondary py-8">{t('noData')}</td></tr>
              ) : filtered.map((trip) => {
                const addedCosts = trip.costs?.reduce((s: number, c: any) => s + Number(c.amount), 0) || 0;
                const totalCost = addedCosts > 0 ? addedCosts : (Number(trip.realCost) || Number(trip.estimatedCost) || 0);
                const profit = Number(trip.price || 0) - totalCost;
                return (
                  <tr key={trip.id} className="hover:bg-surface/60 transition-colors">
                    <td className="table-cell whitespace-nowrap text-xs">
                      <div className="font-bold text-text">{trip.createdAt ? formatDate(trip.createdAt) : '—'}</div>
                      {trip.createdAt && (
                        <div className="text-[10px] text-text-secondary font-semibold flex items-center gap-0.5 mt-0.5">
                          <Clock className="w-3 h-3 text-primary" /> {new Date(trip.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </td>
                    <td className="table-cell font-bold text-text">{trip.client?.name || '—'}</td>
                    <td className="table-cell text-xs max-w-[140px] truncate">
                      <div className="font-medium text-text">{trip.pickupAddress}</div>
                      {trip.pickupTime && <span className="text-[10px] text-text-secondary">{t('hourPrefix')}: {trip.pickupTime}</span>}
                    </td>
                    <td className="table-cell text-xs max-w-[140px] truncate">
                      <div className="font-medium text-text">{trip.dropoffAddress}</div>
                      {trip.dropoffTime && <span className="text-[10px] text-text-secondary">{t('hourPrefix')}: {trip.dropoffTime}</span>}
                    </td>
                    <td className="table-cell text-xs font-semibold whitespace-nowrap">
                      {trip.distanceKm ? (
                        <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-1 rounded-md text-blue-700 border border-blue-100 w-fit" title="Calculat la 75km/h + 45min pauză (la 4.5h) + 11h repaus (la 9h)">
                          <Clock className="w-3.5 h-3.5" />
                          {(() => {
                            const d = Number(trip.distanceKm);
                            const hours = d / 75;
                            const restStops = Math.floor(hours / 4.5);
                            const nightRests = Math.floor(hours / 9);
                            const total = hours + (restStops * 0.75) + (nightRests * 11);
                            const h = Math.floor(total);
                            const m = Math.round((total - h) * 60);
                            return `${h}h ${m}m`;
                          })()}
                        </div>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="table-cell text-xs font-semibold text-text-secondary whitespace-nowrap">{trip.truck?.plateNumber || '—'}</td>
                    <td className="table-cell text-xs font-medium text-text">{trip.driver?.user?.name || '—'}</td>
                    <td className="table-cell text-xs whitespace-nowrap">
                      {(trip.pallets || trip.weightKg || trip.volumeCbm) ? (
                        <div className="space-y-0.5 text-[10px] bg-orange-50/50 p-1.5 rounded-lg border border-orange-100 max-w-[130px]">
                          {trip.pallets && <div className="text-text font-medium flex items-center gap-1"><Layers className="w-2.5 h-2.5 text-primary" /> {trip.pallets} {t('palletsLabel')}</div>}
                          {trip.weightKg && <div className="text-text font-medium flex items-center gap-1"><Scale className="w-2.5 h-2.5 text-primary" /> {trip.weightKg} kg</div>}
                          {trip.volumeCbm && <div className="text-text font-medium flex items-center gap-1"><Box className="w-2.5 h-2.5 text-primary" /> {trip.volumeCbm} m³</div>}
                        </div>
                      ) : (
                        <span className="text-text-secondary">—</span>
                      )}
                    </td>
                    <td className="table-cell text-xs font-bold text-primary whitespace-nowrap">{trip.loadingReference || '—'}</td>
                    <td className="table-cell text-xs font-bold text-primary whitespace-nowrap">{trip.unloadingReference || '—'}</td>
                    <td className="table-cell font-semibold text-success whitespace-nowrap">€{Number(trip.price || 0).toLocaleString(i18n.language)}</td>
                    <td className="table-cell whitespace-nowrap">€{totalCost.toLocaleString(i18n.language)}</td>
                    <td className={`table-cell font-bold whitespace-nowrap ${profit >= 0 ? 'text-success' : 'text-error'}`}>
                      €{profit.toLocaleString(i18n.language)}
                    </td>
                    <td className="table-cell">
                      <div className="relative group">
                        <button
                          className={`${STATUS_COLORS[trip.status] || 'badge-gray'} flex items-center justify-between gap-2 outline-none font-bold text-xs border-none hover:opacity-80 transition-opacity m-0 w-full min-w-[120px] text-left`}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setStatusCoords({
                              left: rect.left,
                              top: rect.bottom + window.scrollY,
                              width: Math.max(150, rect.width),
                            });
                            setOpenStatusId(openStatusId === trip.id ? null : trip.id);
                          }}
                          onBlur={() => setOpenStatusId(null)}
                        >
                          <span>{t(trip.status === 'in_progress' ? 'inProgress' : trip.status) || trip.status}</span>
                          <ChevronDown className="w-3 h-3 text-current opacity-70" />
                        </button>
                        {openStatusId === trip.id && typeof document !== 'undefined' && createPortal(
                          <div 
                            className="absolute z-[9999] bg-white border border-border rounded-xl shadow-xl overflow-hidden min-w-[150px] animate-fade-in"
                            style={{
                              left: statusCoords.left,
                              top: statusCoords.top,
                              width: statusCoords.width,
                            }}
                          >
                            {[
                              { value: 'pending', label: t('pending') },
                              { value: 'confirmed', label: t('confirmed') },
                              { value: 'in_progress', label: t('inProgress') },
                              { value: 'completed', label: t('completed') },
                              { value: 'cancelled', label: t('cancelled') },
                              { value: 'delayed', label: t('delayed') }
                            ].map(opt => (
                              <div 
                                key={opt.value}
                                className="px-4 py-2 text-xs font-semibold text-text hover:bg-primary/5 hover:text-primary cursor-pointer transition-colors"
                                onMouseDown={async (e) => {
                                  e.preventDefault(); // Prevent blur
                                  setOpenStatusId(null);
                                  if (opt.value === trip.status) return;
                                  try {
                                    await api.patch(`/trips/${trip.id}`, { status: opt.value });
                                    toast.success(t('statusUpdated') || 'Status actualizat');
                                    load();
                                  } catch {
                                    toast.error(t('error') || 'Eroare');
                                  }
                                }}
                              >
                                {opt.label}
                              </div>
                            ))}
                          </div>,
                          document.body
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {trip.status === 'completed' && (
                          <button onClick={() => handleGenerateInvoice(trip)} className="p-1.5 text-success hover:text-success-dark rounded-lg hover:bg-green-50 transition-all" title={t('generateInvoice') || 'Generează factură'}>
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => handleEdit(trip)} className="p-1.5 text-text-secondary hover:text-primary rounded-lg hover:bg-primary-light transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(trip.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        data={filtered}
        filename="Curse_HapTrans"
        getDateField={item => item.pickupDate || item.createdAt}
        headers={[
          { key: 'createdAt', label: 'Data Creare', transform: val => val ? formatDate(val) : '' },
          { key: 'client', label: 'Client', transform: val => val?.name || '' },
          { key: 'pickupAddress', label: 'Locatie Preluare' },
          { key: 'pickupDate', label: 'Data Preluare' },
          { key: 'pickupTime', label: 'Ora Preluare' },
          { key: 'dropoffAddress', label: 'Locatie Predare' },
          { key: 'dropoffDate', label: 'Data Predare' },
          { key: 'dropoffTime', label: 'Ora Predare' },
          { key: 'truck', label: 'Camion', transform: val => val?.plateNumber || '' },
          { key: 'driver', label: 'Sofer', transform: val => val?.user?.name || '' },
          { key: 'loadingReference', label: 'Referinta Incarcare' },
          { key: 'unloadingReference', label: 'Referinta Descarcare' },
          { key: 'pallets', label: 'Paleti' },
          { key: 'weightKg', label: 'Greutate (kg)' },
          { key: 'volumeCbm', label: 'Volum (cbm)' },
          { key: 'price', label: 'Pret (€)' },
          { key: 'realCost', label: 'Cost Real (€)' },
          { key: 'status', label: 'Status' },
          { key: 'notes', label: 'Note' },
        ]}
      />

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev: any) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
