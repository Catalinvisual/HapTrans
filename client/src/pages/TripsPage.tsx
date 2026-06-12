import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Zap, Plus, Pencil, Trash2, Search, ChevronDown, Scale, Layers, Download, FileText, Clock, Box, AlertTriangle, ScanLine, Loader2, CheckCircle2 } from 'lucide-react';
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
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [deadheadWarning, setDeadheadWarning] = useState<any>(null);
  const [invoiceLangModal, setInvoiceLangModal] = useState<any>({ isOpen: false, trip: null });
  
  const [form, setForm] = useState<any>({
    clientId: '', truckId: '', driverId: '', 
    pickupCompanyName: '', pickupAddress: '', 
    dropoffCompanyName: '', dropoffAddress: '',
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

  
  useEffect(() => {
    let active = true;
    const calcDeadhead = async () => {
      if (!form.truckId || !form.pickupAddress) {
        setDeadheadWarning(null);
        return;
      }
      const truckTrips = trips.filter(t => t.truck?.id === form.truckId && t.id !== editId).sort((a,b) => new Date(b.dropoffDate).getTime() - new Date(a.dropoffDate).getTime());
      const lastTrip = truckTrips.length > 0 ? truckTrips[0] : null;
      if (lastTrip && lastTrip.dropoffAddress) {
        try {
          const res = await api.post('/routing/calculate', {
            originAddress: lastTrip.dropoffAddress,
            destAddress: form.pickupAddress,
            weightKg: 0
          });
          if (!active) return;
          if (res.data && res.data.distanceKm && res.data.distanceKm > 10) {
            const cost = (res.data.distanceKm / 100) * 28 * dieselPrice;
            setDeadheadWarning({ dist: res.data.distanceKm, cost, from: lastTrip.dropoffAddress.split(',')[0] });
          } else {
            setDeadheadWarning(null);
          }
        } catch(e) { if(active) setDeadheadWarning(null); }
      } else {
        setDeadheadWarning(null);
      }
    };
    
    const timeoutId = setTimeout(() => {
      calcDeadhead();
    }, 500);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [form.truckId, form.pickupAddress, trips, editId, dieselPrice]);

  useEffect(() => { load(); }, []);

  const handleSmartDispatch = async () => {
    if (!form.pickupAddress) {
      toast.error(t('smartDispatchAddressError'));
      return;
    }
    
    // We only consider trucks that are NOT currently in a trip (or active) AND have GPS coordinates
    const availableTrucks = trucks.filter((t: any) => 
      t.status === 'active' && t.currentLat && t.currentLng
    );

    if (availableTrucks.length === 0) {
      toast.error(t('noAvailableTrucks'));
      return;
    }

    setIsDispatching(true);
    const toastId = toast.loading(t('calculatingSmartDispatch'));

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
          t('smartDispatchSuccessDetail', { plate: closestTruck.plateNumber, dist: Math.round(minDistance) })
        );
      }
    } catch (err) {
      toast.error(t('smartDispatchError'));
    } finally {
      toast.dismiss(toastId);
      setIsDispatching(false);
    }
  };

  const handleScanDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setIsScanLoading(true);
    setScanSuccess(false);
    const toastId = toast.loading(t('scannerTitle'));

    try {
      const res = await api.post('/trips/scan-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { parsed } = res.data;

      if (parsed) {
        let newFormState: any = {};
        setForm((prev: any) => {
          const updated = { ...prev };
          if (parsed.pickupCompanyName) updated.pickupCompanyName = parsed.pickupCompanyName;
          if (parsed.pickupAddress) updated.pickupAddress = parsed.pickupAddress;
          if (parsed.dropoffCompanyName) updated.dropoffCompanyName = parsed.dropoffCompanyName;
          if (parsed.dropoffAddress) updated.dropoffAddress = parsed.dropoffAddress;
          if (parsed.pickupDate) updated.pickupDate = parsed.pickupDate;
          if (parsed.dropoffDate) updated.dropoffDate = parsed.dropoffDate;
          if (parsed.pickupTime) updated.pickupTime = parsed.pickupTime;
          if (parsed.dropoffTime) updated.dropoffTime = parsed.dropoffTime;
          if (parsed.price) updated.price = parsed.price.toString();
          if (parsed.weightKg) updated.weightKg = parsed.weightKg.toString();
          if (parsed.pallets) updated.pallets = parsed.pallets.toString();
          if (parsed.palletType) updated.palletType = parsed.palletType;
          if (parsed.volumeCbm) updated.volumeCbm = parsed.volumeCbm.toString();
          if (parsed.loadingReference) updated.loadingReference = parsed.loadingReference;
          if (parsed.unloadingReference) updated.unloadingReference = parsed.unloadingReference;
          if (parsed.notes) updated.notes = parsed.notes;
          newFormState = updated;
          return updated;
        });
        
        setScanSuccess(true);
        toast.success(t('scannerExtracted'), { id: toastId, duration: 4000 });

        // Auto calculate distance if we have both addresses
        if (newFormState.pickupAddress && newFormState.dropoffAddress) {
          try {
            const routeRes = await api.post('/routing/calculate', {
              originAddress: newFormState.pickupAddress,
              destAddress: newFormState.dropoffAddress,
              weightKg: newFormState.weightKg ? Number(newFormState.weightKg) : 0
            });
            if (routeRes.data && routeRes.data.distanceKm) {
              setForm((prev: any) => ({ ...prev, distanceKm: routeRes.data.distanceKm.toString() }));
              toast.success(t('toast_auto_distance_success', { dist: routeRes.data.distanceKm }), { duration: 4000 });
            } else if (routeRes.data && routeRes.data.error) {
              toast.error(t('toast_auto_distance_error', { error: routeRes.data.error }), { duration: 6000 });
            }
          } catch (e) {
            console.error('Auto route calc failed', e);
          }
        }
      } else {
        const backendErr = res.data?.error || '';
        const isKeyMissing = backendErr.includes('GEMINI_API_KEY');
        toast.error(
          isKeyMissing
            ? t('toast_gemini_key_missing')
            : `${t('scannerFailed')}${backendErr ? ` (${backendErr})` : ''}`,
          { id: toastId, duration: 6000 }
        );
      }
    } catch (err) {
      toast.error(t('scannerError'), { id: toastId });
    } finally {
      setIsScanLoading(false);
      // reset input so same file can be re-uploaded
      if (scanInputRef.current) scanInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = form.price === '' ? 0 : Number(form.price);
    const costNum = form.estimatedCost === '' ? 0 : Number(form.estimatedCost);

    const performSave = async () => {
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
      } catch (err: any) {
        const msg = err.response?.data?.message;
        if (typeof msg === 'string' && msg.startsWith('err_trip_overlap:')) {
          const tripId = msg.split(':')[1];
          toast.error(t('err_trip_overlap', { id: tripId }));
        } else {
          toast.error(msg || t('saveError'));
        }
      }
    };

    const priceWarning = priceNum > 0 && costNum > 0 && priceNum < costNum;
    const marginWarning = priceNum > 0 && costNum > 0 && !priceWarning && ((priceNum - costNum) / priceNum < 0.10);
    
    const weightWarning = Number(form.weightKg) > 24000;
    const palletsWarning = Number(form.pallets) > 33;
    const volumeWarning = Number(form.volumeCbm) > 90;

    const dist = Number(form.distanceKm) || 0;
    const hasDates = form.pickupDate && form.dropoffDate;
    
    let timeWarning = false;
    let requiredHours = 0;
    let availableHours = 0;
    let minDropoffFormattedDate = '';
    let minDropoffFormattedTime = '';
    let conflictWarning = '';

    if (dist > 0 && hasDates) {
      const pStr = `${form.pickupDate}T${form.pickupTime || '00:00'}:00`;
      const dStr = `${form.dropoffDate}T${form.dropoffTime || '23:59'}:00`;
      const pDate = new Date(pStr);
      const dDate = new Date(dStr);
      
      availableHours = (dDate.getTime() - pDate.getTime()) / (1000 * 60 * 60);

      const driveHours = dist / 75;
      const restStops = Math.floor(driveHours / 4.5);
      const nightRests = Math.floor(driveHours / 9);
      requiredHours = driveHours + (restStops * 0.75) + (nightRests * 11);

      if (availableHours > 0 && requiredHours > availableHours) {
        timeWarning = true;
        const minDropoffTimestamp = pDate.getTime() + (requiredHours * 60 * 60 * 1000);
        const minDropoffDateObj = new Date(minDropoffTimestamp);
        minDropoffFormattedDate = formatDate(minDropoffDateObj.toISOString().slice(0, 10));
        minDropoffFormattedTime = minDropoffDateObj.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
      }

      // Conflict Detection (Overlap)
      const overlappingTrip = trips.find(t => {
        if (t.id === editId) return false;
        if (t.status === 'cancelled' || t.status === 'completed') return false;
        if ((t.driver?.id && t.driver.id === form.driverId) || (t.truck?.id && t.truck.id === form.truckId)) {
           const tpDate = new Date(`${t.pickupDate}T${t.pickupTime || '00:00'}:00`);
           const tdDate = new Date(`${t.dropoffDate}T${t.dropoffTime || '23:59'}:00`);
           return pDate < tdDate && tpDate < dDate; // Overlap logic
        }
        return false;
      });
      if (overlappingTrip) {
        const isDriver = overlappingTrip.driver?.id === form.driverId;
        const resourceName = isDriver ? t('driver').toLowerCase() : t('truck').toLowerCase();
        const fromCity = overlappingTrip.pickupAddress?.split(',')[0] || '';
        const toCity = overlappingTrip.dropoffAddress?.split(',')[0] || '';
        conflictWarning = t('conflict_warning_message', { resource: resourceName, from: fromCity, to: toCity }) + '\n\n';
      }
    }

    if (priceWarning || marginWarning || timeWarning || weightWarning || palletsWarning || volumeWarning || conflictWarning) {
      const texts: Record<string, any> = {
        ro: {
          priceWarn: `⚠️ Prețul cursei (€${priceNum}) este mai mic decât costul estimat (€${costNum})!\nSalvarea va genera o pierdere de €${(costNum - priceNum).toFixed(2)}.\n\n`,
          marginWarn: `⚠️ Marja de profit este sub 10%! Profit estimat: €${(priceNum - costNum).toFixed(2)}.\n\n`,
          timeWarn: `⏱️ Timp insuficient pentru livrare!\nPe baza orelor de condus și a pauzelor legale, cea mai rapidă livrare posibilă este pe:\n📅 ${minDropoffFormattedDate} la ora ${minDropoffFormattedTime}\n\n`,
          weightWarn: `⚖️ Greutatea (${form.weightKg} kg) depășește limita legală europeană de 24,000 kg!\n\n`,
          palletsWarn: `📦 Numărul de paleți (${form.pallets}) depășește capacitatea standard de 33 paleți EUR!\n\n`,
          volumeWarn: `📐 Volumul (${form.volumeCbm} m³) depășește capacitatea standard de 90 m³!\n\n`,
          sure: `Ești sigur că vrei să salvezi cursa în aceste condiții?`
        },
        en: {
          priceWarn: `⚠️ Price (€${priceNum}) is lower than estimated cost (€${costNum})!\nSaving will result in a loss of €${(costNum - priceNum).toFixed(2)}.\n\n`,
          marginWarn: `⚠️ Profit margin is below 10%! Estimated profit: €${(priceNum - costNum).toFixed(2)}.\n\n`,
          timeWarn: `⏱️ Insufficient time for delivery!\nBased on driving hours and legal rests, the earliest possible delivery is on:\n📅 ${minDropoffFormattedDate} at ${minDropoffFormattedTime}\n\n`,
          weightWarn: `⚖️ Weight (${form.weightKg} kg) exceeds European legal limit of 24,000 kg!\n\n`,
          palletsWarn: `📦 Pallet count (${form.pallets}) exceeds standard capacity of 33 EUR pallets!\n\n`,
          volumeWarn: `📐 Volume (${form.volumeCbm} m³) exceeds standard capacity of 90 m³!\n\n`,
          sure: `Are you sure you want to save the trip under these conditions?`
        },
        nl: {
          priceWarn: `⚠️ Prijs (€${priceNum}) is lager dan de geschatte kosten (€${costNum})!\nOpslaan leidt tot een verlies van €${(costNum - priceNum).toFixed(2)}.\n\n`,
          marginWarn: `⚠️ Winstmarge is lager dan 10%! Geschatte winst: €${(priceNum - costNum).toFixed(2)}.\n\n`,
          timeWarn: `⏱️ Onvoldoende tijd voor levering!\nOp basis van rijtijden en wettelijke rusttijden is de vroegst mogelijke levering op:\n📅 ${minDropoffFormattedDate} om ${minDropoffFormattedTime}\n\n`,
          weightWarn: `⚖️ Gewicht (${form.weightKg} kg) overschrijdt de Europese wettelijke limiet van 24.000 kg!\n\n`,
          palletsWarn: `📦 Aantal pallets (${form.pallets}) overschrijdt de standaardcapaciteit van 33 EUR-pallets!\n\n`,
          volumeWarn: `📐 Volume (${form.volumeCbm} m³) overschrijdt de standaardcapaciteit van 90 m³!\n\n`,
          sure: `Weet u zeker dat u de rit onder deze omstandigheden wilt opslaan?`
        },
        de: {
          priceWarn: `⚠️ Preis (€${priceNum}) ist niedriger als die geschätzten Kosten (€${costNum})!\nDas Speichern führt zu einem Verlust von €${(costNum - priceNum).toFixed(2)}.\n\n`,
          marginWarn: `⚠️ Gewinnmarge liegt unter 10%! Geschätzter Gewinn: €${(priceNum - costNum).toFixed(2)}.\n\n`,
          timeWarn: `⏱️ Unzureichende Zeit für die Lieferung!\nBasierend auf Fahrzeiten und gesetzlichen Ruhezeiten ist die frühestmögliche Lieferung am:\n📅 ${minDropoffFormattedDate} um ${minDropoffFormattedTime}\n\n`,
          weightWarn: `⚖️ Gewicht (${form.weightKg} kg) überschreitet das europäische gesetzliche Limit von 24.000 kg!\n\n`,
          palletsWarn: `📦 Anzahl der Paletten (${form.pallets}) überschreitet die Standardkapazität von 33 EUR-Paletten!\n\n`,
          volumeWarn: `📐 Volumen (${form.volumeCbm} m³) überschreitet die Standardkapazität von 90 m³!\n\n`,
          sure: `Sind Sie sicher, dass Sie die Fahrt unter diesen Bedingungen speichern möchten?`
        },
        fr: {
          priceWarn: `⚠️ Le prix (€${priceNum}) est inférieur au coût estimé (€${costNum})!\nL'enregistrement entraînera une perte de €${(costNum - priceNum).toFixed(2)}.\n\n`,
          marginWarn: `⚠️ La marge bénéficiaire est inférieure à 10 % ! Bénéfice estimé : €${(priceNum - costNum).toFixed(2)}.\n\n`,
          timeWarn: `⏱️ Temps insuffisant pour la livraison!\nSur la base des heures de conduite et des pauses légales, la livraison la plus rapide possible est le:\n📅 ${minDropoffFormattedDate} à ${minDropoffFormattedTime}\n\n`,
          weightWarn: `⚖️ Le poids (${form.weightKg} kg) dépasse la limite légale européenne de 24 000 kg!\n\n`,
          palletsWarn: `📦 Le nombre de palettes (${form.pallets}) dépasse la capacité standard de 33 palettes EUR!\n\n`,
          volumeWarn: `📐 Le volume (${form.volumeCbm} m³) dépasse la capacité standard de 90 m³!\n\n`,
          sure: `Êtes-vous sûr de vouloir enregistrer le trajet dans ces conditions ?`
        }
      };

      const langObj = texts[i18n.language] || texts['en'];
      let msg = '';
      if (conflictWarning) msg += conflictWarning; // This is raw since we only did it in Ro mostly, but we can just use the string.
      if (priceWarning) msg += langObj.priceWarn;
      if (marginWarning) msg += langObj.marginWarn;
      if (timeWarning) msg += langObj.timeWarn;
      if (weightWarning) msg += langObj.weightWarn;
      if (palletsWarning) msg += langObj.palletsWarn;
      if (volumeWarning) msg += langObj.volumeWarn;
      msg += langObj.sure;

      setConfirmModal({
        isOpen: true,
        title: t('warning') || 'Atenție!',
        message: msg,
        confirmText: t('continue') || 'Continuă',
        cancelText: t('cancel') || 'Anulează',
        type: 'warning',
        onConfirm: async () => {
          setConfirmModal((prev: any) => ({ ...prev, isOpen: false }));
          await performSave();
        }
      });
      return;
    }

    await performSave();
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
        try {
          await api.delete(`/trips/${id}`);
          toast.success(t('tripDeleted') || 'Cursa ștearsă.'); 
          load();
        } catch (err) {
          toast.error(t('error') || 'Eroare la ștergerea cursei.');
        }
      }
    });
  };

  const handleGenerateInvoice = (trip: any) => {
    setInvoiceLangModal({ isOpen: true, trip });
  };

  const executeGenerateInvoice = async (trip: any, lang: 'en' | 'nl') => {
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
      const base64Pdf = generateInvoicePdfBase64(invoiceWithFullRelations, lang);

      // Convert to File
      const arr = base64Pdf.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while(n--) { u8arr[n] = bstr.charCodeAt(n); }
      const file = new File([u8arr], `Invoice_${savedInvoice.invoiceNumber}.pdf`, { type: mime });
      
      const formData = new FormData();
      formData.append('file', file);

      // Upload PDF to Cloudinary
      const uploadRes = await api.post(`/invoices/upload-pdf/${savedInvoice.id}`, formData);
      const finalPdfUrl = uploadRes.data.pdfUrl || base64Pdf;

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
              `<iframe src="${finalPdfUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`
            );
          } else {
            // Fallback to download
            const link = document.createElement("a");
            link.href = finalPdfUrl;
            link.download = `Invoice_${savedInvoice.invoiceNumber}.pdf`;
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

      {showForm && (
        <div className="card animate-fade-in bg-white border border-border rounded-2xl p-6 shadow-md">
          <h3 className="font-bold text-lg text-text mb-4 text-primary border-b border-border pb-3">
            {editId ? t('editTrip') : t('addTrip')}
          </h3>

          {/* ─── AI Smart Scanner Banner ─── */}
          <div className={`mb-5 rounded-xl border-2 p-4 transition-all duration-500 ${
            scanSuccess 
              ? 'bg-green-50 border-green-300' 
              : 'bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                  scanSuccess ? 'bg-green-500' : 'bg-gradient-to-br from-primary to-secondary'
                }`}>
                  {isScanLoading 
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : scanSuccess 
                      ? <CheckCircle2 className="w-5 h-5 text-white" />
                      : <ScanLine className="w-5 h-5 text-white" />
                  }
                </div>
                <div>
                  <p className="font-bold text-sm text-text">
                    {scanSuccess ? t('scannerSuccessTitle') : t('scannerTitle')}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {scanSuccess 
                      ? t('scannerSuccessSubtitle')
                      : t('scannerSubtitle')
                    }
                  </p>
                </div>
              </div>
              <label className={`cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                isScanLoading 
                  ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
                  : scanSuccess
                    ? 'border-green-400 text-green-700 hover:bg-green-100'
                    : 'border-primary/40 text-primary hover:bg-primary/10'
              }`}>
                <input 
                  ref={scanInputRef}
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  onChange={handleScanDocument} 
                  disabled={isScanLoading} 
                />
                {isScanLoading 
                  ? t('scannerProcessing')
                  : scanSuccess 
                    ? t('scannerRescan')
                    : t('scannerUpload')
                }
              </label>
            </div>
          </div>

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
            
            {/* Pickup Details */}
            {/* Pickup Details */}
            <div className="border-t border-dashed border-border pt-4 md:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-bold text-primary mb-3">{t('pickup')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label text-xs font-semibold">{t('pickupCompanyName')}</label>
                  <input type="text" className="input" value={form.pickupCompanyName} onChange={e => setForm({...form, pickupCompanyName: e.target.value})} placeholder="e.g. Logistics Warehouse Ltd" />
                </div>
                <div>
                  <label className="label text-xs font-semibold">{t('pickupAddress')}</label>
                  <AddressAutocomplete 
                    value={form.pickupAddress} 
                    onChange={(val) => setForm({...form, pickupAddress: val})} 
                    required 
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">{t('loadingReference')}</label>
                  <input className="input" placeholder="e.g. REF-12345" value={form.loadingReference || ''} onChange={e => setForm({...form, loadingReference: e.target.value.toUpperCase()})} />
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="border-t border-dashed border-border pt-4 md:col-span-2 lg:col-span-3">
              <h3 className="text-sm font-bold text-primary mb-3">{t('dropoff')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label text-xs font-semibold">{t('dropoffCompanyName')}</label>
                  <input type="text" className="input" value={form.dropoffCompanyName} onChange={e => setForm({...form, dropoffCompanyName: e.target.value})} placeholder="e.g. Recipient Client Inc" />
                </div>
                <div>
                  <label className="label text-xs font-semibold">{t('dropoffAddress')}</label>
                  <AddressAutocomplete 
                    value={form.dropoffAddress} 
                    onChange={(val) => setForm({...form, dropoffAddress: val})} 
                    required 
                  />
                </div>
                <div>
                  <label className="label text-xs font-semibold">{t('unloadingReference')}</label>
                  <input className="input" placeholder="e.g. REF-67890" value={form.unloadingReference || ''} onChange={e => setForm({...form, unloadingReference: e.target.value.toUpperCase()})} />
                </div>
              </div>
            </div>
            <div>
              <label className="label font-semibold">{t('distance')}</label>
              <input type="number" className="input" value={form.distanceKm} onChange={e => setForm({...form, distanceKm: e.target.value})} />
            </div>
            {/* ─── Route Calculator (spans full width) ─── */}
            <div className="col-span-full">
              <RouteCalculator
                pickupAddress={form.pickupAddress}
                dropoffAddress={form.dropoffAddress}
                weightKg={form.weightKg ? Number(form.weightKg) : undefined}
                dieselPricePerL={dieselPrice}
                onApply={async ({ distanceKm, estimatedCost }) => {
                  let extraCost = 0;
                  if (form.driverId && form.pickupDate && form.dropoffDate) {
                    const dr = drivers.find((d: any) => d.id === form.driverId);
                    if (dr && dr.dailyRate) {
                      const pDate = new Date(`${form.pickupDate}T${form.pickupTime || '00:00'}:00`);
                      const dDate = new Date(`${form.dropoffDate}T${form.dropoffTime || '23:59'}:00`);
                      const hours = (dDate.getTime() - pDate.getTime()) / (1000 * 60 * 60);
                      const days = Math.max(1, Math.ceil(hours / 24));
                      extraCost = days * Number(dr.dailyRate);
                      if (extraCost > 0) {
                        toast.success(t('toast_driver_cost_added', { cost: extraCost.toFixed(2), days }));
                      }
                    }
                  }

                  let deadheadCost = 0;
                  let deadheadDist = 0;
                  if (form.truckId && form.pickupAddress) {
                    const truckTrips = trips.filter(t => t.truck?.id === form.truckId && t.id !== editId).sort((a,b) => new Date(b.dropoffDate).getTime() - new Date(a.dropoffDate).getTime());
                    const lastTrip = truckTrips.length > 0 ? truckTrips[0] : null;
                    if (lastTrip && lastTrip.dropoffAddress) {
                      try {
                        const res = await api.post('/routing/calculate', {
                          originAddress: lastTrip.dropoffAddress,
                          destAddress: form.pickupAddress,
                          weightKg: 0
                        });
                        if (res.data && res.data.distanceKm) {
                          deadheadDist = res.data.distanceKm;
                          // consum mediu 28L/100km pt mers pe gol
                          deadheadCost = (deadheadDist / 100) * 28 * dieselPrice; 
                          if (deadheadDist > 50) { // Doar daca e peste 50km avertizam puternic
                            toast.success(t('toast_deadhead_calculated', { dist: deadheadDist.toFixed(0), from: lastTrip.dropoffAddress.split(',')[0], cost: deadheadCost.toFixed(2) }));
                          }
                        }
                      } catch(e) {
                        console.error('Deadhead calculation failed', e);
                      }
                    }
                  }
                  
                  const finalCost = (estimatedCost || 0) + extraCost + deadheadCost;
                  setForm((f: any) => ({
                    ...f,
                    distanceKm: distanceKm.toString(),
                    ...(estimatedCost !== undefined ? { estimatedCost: finalCost.toFixed(2) } : {}),
                  }));
                  toast.success(t('toast_route_applied'));
                }}
              />
            </div>

            
              {deadheadWarning && (
                <div className="col-span-full bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 text-orange-800">
                    <AlertTriangle className="w-6 h-6 text-orange-500" />
                    <div>
                      <p className="font-bold">{t('deadhead_warning_title', { dist: Math.round(deadheadWarning.dist) })}</p>
                      <p className="text-sm opacity-90">{t('deadhead_warning_desc', { from: deadheadWarning.from, cost: deadheadWarning.cost.toFixed(2) })}</p>
                    </div>
                  </div>
                  <button type="button" className="btn-secondary py-1.5 px-3 text-sm border-orange-200 text-orange-700 hover:bg-orange-100" onClick={() => {
                    const currentEst = Number(form.estimatedCost) || 0;
                    setForm({...form, estimatedCost: (currentEst + deadheadWarning.cost).toFixed(2)});
                    setDeadheadWarning(null);
                  }}>
                    {t('deadhead_warning_btn')}
                  </button>
                </div>
              )}

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
                  <input type="number" placeholder="e.g. 33" className="input" value={form.pallets} onChange={e => setForm({...form, pallets: e.target.value})} />
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
                  <input type="number" placeholder="e.g. 24000" className="input" value={form.weightKg} onChange={e => setForm({...form, weightKg: e.target.value})} />
                </div>
                <div>
                  <label className="label text-xs flex items-center gap-1 font-semibold">
                    <Box className="w-3.5 h-3.5 text-primary" /> {t('volumeCbm')}
                  </label>
                  <input type="number" step="0.01" placeholder="e.g. 86.5" className="input" value={form.volumeCbm} onChange={e => setForm({...form, volumeCbm: e.target.value})} />
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
              <input
                className="input pl-9 py-2 text-sm"
                placeholder={t('search')}
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <CustomSelect
              className="w-40"
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={[
                { value: 'all', label: t('all') },
                { value: 'pending', label: t('pending') },
                { value: 'confirmed', label: t('confirmed') },
                { value: 'in_progress', label: t('in_progress') },
                { value: 'completed', label: t('completed') },
                { value: 'cancelled', label: t('cancelled') },
              ]}
            />
            <button onClick={() => setShowExport(true)} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-primary/20 hover:border-primary/50 text-primary transition-all">
              <Download className="w-4 h-4" /> {t('export')}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
              {filtered.length} {t('results')}
            </span>
            <button onClick={() => { setShowForm(!showForm); setEditId(null); }} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
              <Plus className="w-4 h-4" /> {t('addTrip')}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface border-b border-border">
                {[
                  t('reference'),
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
                    <td className="table-cell whitespace-nowrap text-xs font-bold text-primary">
                      {trip.referenceNumber || '—'}
                    </td>
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
                      {trip.pickupCompanyName && <div className="font-bold text-primary text-[11px] truncate mb-0.5">{trip.pickupCompanyName}</div>}
                      <div className="font-medium text-text">{trip.pickupAddress}</div>
                      {(trip.pickupDate || trip.pickupTime) && (
                        <div className="text-[10px] text-text-secondary mt-0.5">
                          {trip.pickupDate ? formatDate(trip.pickupDate) : ''}
                          {trip.pickupDate && trip.pickupTime ? ' • ' : ''}
                          {trip.pickupTime ? `${t('hourPrefix')}: ${trip.pickupTime}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-xs max-w-[140px] truncate">
                      {trip.dropoffCompanyName && <div className="font-bold text-primary text-[11px] truncate mb-0.5">{trip.dropoffCompanyName}</div>}
                      <div className="font-medium text-text">{trip.dropoffAddress}</div>
                      {(trip.dropoffDate || trip.dropoffTime) && (
                        <div className="text-[10px] text-text-secondary mt-0.5">
                          {trip.dropoffDate ? formatDate(trip.dropoffDate) : ''}
                          {trip.dropoffDate && trip.dropoffTime ? ' • ' : ''}
                          {trip.dropoffTime ? `${t('hourPrefix')}: ${trip.dropoffTime}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-xs font-semibold whitespace-nowrap">
                      {trip.status === 'completed' ? (
                        <div className="flex items-center gap-1.5 bg-green-50/80 px-2 py-1 rounded-md text-green-700 border border-green-100 w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-bold uppercase text-[10px] tracking-wider">{i18n.language === 'ro' ? 'Livrat' : 'Delivered'}</span>
                            <span className="text-[11px] font-bold opacity-90">{new Date(trip.updatedAt).toLocaleDateString('en-GB')} {new Date(trip.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      ) : trip.distanceKm ? (
                        <div className="flex flex-col gap-0.5" title="Calculat la 75km/h + 45min pauză (la 4.5h) + 11h repaus (la 9h)">
                          {(() => {
                            const d = Number(trip.distanceKm);
                            const hours = d / 75;
                            const restStops = Math.floor(hours / 4.5);
                            const nightRests = Math.floor(hours / 9);
                            const total = hours + (restStops * 0.75) + (nightRests * 11);
                            
                            if (trip.pickupDate) {
                              const pickup = new Date(`${trip.pickupDate.split('T')[0]}T${trip.pickupTime || '08:00'}:00`);
                              const arrival = new Date(pickup.getTime() + total * 60 * 60 * 1000);
                              return (
                                <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-1 rounded-md text-blue-700 border border-blue-100 w-fit">
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  <div className="flex flex-col">
                                    <span>{arrival.toLocaleDateString('en-GB')}</span>
                                    <span className="text-[10px] opacity-80">{arrival.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                              );
                            }
                            
                            const h = Math.floor(total);
                            const m = Math.round((total - h) * 60);
                            return (
                              <div className="flex items-center gap-1.5 bg-blue-50/80 px-2 py-1 rounded-md text-blue-700 border border-blue-100 w-fit">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>{`${h}h ${m}m`}</span>
                              </div>
                            );
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
                    <td className="table-cell font-semibold text-success whitespace-nowrap">
                      <div>€{Number(trip.price || 0).toLocaleString(i18n.language)}</div>
                      {trip.invoices && trip.invoices.length > 0 && (
                        <div className={`mt-1 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded inline-block ${
                          trip.invoices[0].status === 'paid' ? 'bg-green-100 text-green-800' :
                          trip.invoices[0].status === 'overdue' ? 'bg-red-100 text-red-800 animate-pulse' :
                          trip.invoices[0].status === 'sent' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {t(trip.invoices[0].status) || trip.invoices[0].status}
                        </div>
                      )}
                    </td>
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
                        {trip.trackingToken && (
                          <button
                            onClick={() => {
                              const url = `${window.location.origin.replace('5173', '3000').replace('localhost:5173', 'localhost:3000')}/track/${trip.trackingToken}`;
                              // Open website tracking URL
                              const webUrl = `https://hapcargo.ro/track/${trip.trackingToken}`;
                              // Try to copy to clipboard
                              navigator.clipboard.writeText(webUrl).then(() => {
                                toast.success('Link urmărire copiat!');
                              }).catch(() => {
                                // Fallback: open in new tab
                                window.open(webUrl, '_blank');
                              });
                            }}
                            className="p-1.5 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-all"
                            title="Copiază link urmărire client"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                          </button>
                        )}
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
        filename="Curse_HapCargo"
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

      {invoiceLangModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-2">{t('invoiceLanguageTitle') || 'Invoice Language'}</h3>
            <p className="text-sm text-text-secondary mb-6">{t('invoiceLanguageSub') || 'Choose the language for the generated PDF'}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setInvoiceLangModal({ isOpen: false, trip: null });
                  executeGenerateInvoice(invoiceLangModal.trip, 'en');
                }}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                {t('generateEn') || 'English (EN)'}
              </button>
              <button
                onClick={() => {
                  setInvoiceLangModal({ isOpen: false, trip: null });
                  executeGenerateInvoice(invoiceLangModal.trip, 'nl');
                }}
                className="w-full py-3 px-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
              >
                {t('generateNl') || 'Dutch (NL)'}
              </button>
              <button
                onClick={() => setInvoiceLangModal({ isOpen: false, trip: null })}
                className="w-full py-2 px-4 mt-2 text-text-secondary hover:text-text font-medium transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

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
