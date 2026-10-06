import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Box, MapPin, FileText, ChevronDown, Calculator, Fuel, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import AddressAutocomplete from '../AddressAutocomplete';
import CompanyAutocomplete from '../CompanyAutocomplete';
import CustomDatePicker from '../CustomDatePicker';
interface OrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  orderId?: string | null;
  initialStep?: number;
  highlightSection?: string | null;
  isPortal?: boolean;
}
const STEPS = [{
  id: 'general',
  titleKey: 'stepGeneral',
  fallbackTitle: 'General Info',
  icon: FileText
}, {
  id: 'route',
  titleKey: 'stepRoute',
  fallbackTitle: 'Pickup & Delivery',
  icon: MapPin
}, {
  id: 'cargo',
  titleKey: 'stepCargo',
  fallbackTitle: 'Cargo Items',
  icon: Box
}];
interface SelectOpt {
  value: string;
  label: string;
}
function ModalSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  id
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOpt[];
  placeholder?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({
    top: 0,
    left: 0,
    width: 0
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node) && dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const dropdownHeight = Math.min(250, options.length * 40 + 8); // cap height estimate at 250px since we might have scrollbar
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceAbove = r.top;
      let top = r.bottom + 4;
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        // Position above the button, ensuring we account for actual dropdown max height
        top = r.top - dropdownHeight - 4;
      }
      setDropPos({
        top,
        left: r.left,
        width: r.width
      });
    }
    setOpen(p => !p);
  };
  const selected = options.find(o => o.value === value);
  return <>
      <button id={id} type="button" ref={btnRef} onClick={toggle} className="input w-full flex items-center justify-between cursor-pointer hover:border-primary/60 transition-colors text-left">
        <span className={selected ? 'text-text font-medium' : 'text-text-secondary'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-secondary flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(<div ref={dropRef} className="fixed z-[25000] bg-card border border-border rounded-xl shadow-2xl overflow-hidden" style={{
      top: dropPos.top,
      left: dropPos.left,
      width: dropPos.width
    }}>
      <div className="overflow-y-auto max-h-[250px] custom-scrollbar py-1">
          {options.map(opt => <div key={opt.value} onMouseDown={e => {
        e.preventDefault();
        onChange(opt.value);
        setOpen(false);
      }} className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 border-l-2
                ${opt.value === value ? 'bg-primary/10 border-primary text-primary font-semibold' : 'border-transparent hover:bg-primary/5 hover:border-primary/30 text-text'}`}>
              {opt.label}
            </div>)}
      </div>
        </div>, document.body)}
    </>;
}

// Using CustomDatePicker instead of inline DateTimeInput

export default function OrderWizard({
  isOpen,
  onClose,
  onSaved,
  orderId,
  initialStep,
  highlightSection,
  isPortal,
}: OrderWizardProps) {
  const {
    t
  } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);

  const resolveTargetStep = (h?: string | null, s?: number | null) => {
    if (h) {
      const lower = String(h).toLowerCase();
      if (['cargo', 'weight', 'ldm', 'volume', 'pallet', 'quantity', 'box', 'item', 'kg', 'cbm', 'adr', 'temp'].some(k => lower.includes(k))) return 2;
      if (['stop', 'pickup', 'delivery', 'route', 'gps', 'time', 'date', 'address', 'window', 'late', 'loc'].some(k => lower.includes(k))) return 1;
      if (['general', 'client', 'price', 'ref', 'priority', 'type', 'status'].some(k => lower.includes(k))) return 0;
    }
    if (typeof s === 'number' && s >= 0 && s <= 2) {
      return s;
    }
    return 0;
  };

  const [currentStep, setCurrentStep] = useState<number>(() => resolveTargetStep(highlightSection, initialStep));
  const [isHighlightDismissed, setIsHighlightDismissed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsHighlightDismissed(false);
      setCurrentStep(resolveTargetStep(highlightSection, initialStep));
    }
  }, [isOpen, initialStep, highlightSection, orderId]);

  // Cost estimator state
  const [costEstimate, setCostEstimate] = useState<any>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [fuelConsumption, setFuelConsumption] = useState(32); // L/100km
  const [fuelPrice, setFuelPrice] = useState(1.65); // €/L
  const [confirmedUnprofitable, setConfirmedUnprofitable] = useState(false);

  // Progress bar pixel positions computed via refs
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [barLeft, setBarLeft] = useState(0);
  const [barTotalWidth, setBarTotalWidth] = useState(0);
  const [barOrangeWidth, setBarOrangeWidth] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const recalcBar = () => {
    const refs = stepRefs.current;
    if (!refs[0] || !refs[STEPS.length - 1] || !headerRef.current) return;
    const containerRect = headerRef.current.getBoundingClientRect();
    const firstRect = refs[0].getBoundingClientRect();
    const lastRect = refs[STEPS.length - 1].getBoundingClientRect();
    const firstCenter = firstRect.left + firstRect.width / 2 - containerRect.left;
    const lastCenter = lastRect.left + lastRect.width / 2 - containerRect.left;
    setBarLeft(firstCenter);
    setBarTotalWidth(lastCenter - firstCenter);
    if (currentStep === 0) {
      setBarOrangeWidth(0);
    } else if (currentStep >= STEPS.length - 1) {
      setBarOrangeWidth(lastCenter - firstCenter);
    } else {
      const curRef = refs[currentStep];
      if (curRef) {
        const curRect = curRef.getBoundingClientRect();
        const curCenter = curRect.left + curRect.width / 2 - containerRect.left;
        setBarOrangeWidth(curCenter - firstCenter);
      }
    }
  };
  useLayoutEffect(() => {
    if (isOpen) {
      // Small delay to let modal render first
      const t = setTimeout(recalcBar, 20);
      return () => clearTimeout(t);
    }
  }, [isOpen, currentStep]);
  const [form, setForm] = useState({
    clientId: '',
    customerReference: '',
    internalReference: '',
    priority: 'normal',
    transportType: 'ftl',
    price: '',
    currency: 'EUR',
    notes: '',
    contactPerson: '',
    contactPhone: '',
    equipmentRequirements: [] as string[]
  });
  const emptyStop = {
    companyName: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    scheduledDate: '',
    scheduledTime: '',
    latitude: null as number | null,
    longitude: null as number | null,
    contactPerson: '',
    phone: '',
    dateTo: '',
    timeUntil: '',
    reference: '',
    notes: ''
  };
  const emptyCargo = {
    description: '',
    quantity: 1,
    weightKg: '',
    volumeCbm: '',
    ldm: '',
    unit: 'pallet',
    lengthCm: '',
    widthCm: '',
    heightCm: '',
    stackable: false,
    fragile: false,
    isAdr: false,
    adrClass: '',
    adrUnNumber: '',
    isTemperatureControlled: false,
    requiredTemperature: ''
  };
  const [pickup, setPickup] = useState({
    ...emptyStop
  });
  const [dropoff, setDropoff] = useState({
    ...emptyStop
  });
  const [extraStops, setExtraStops] = useState<any[]>([]);
  const [cargoItems, setCargoItems] = useState<any[]>([]);
  useEffect(() => {
    if (isOpen) {
      if (!isPortal) {
        api.get('/clients').then(res => setClients(res.data)).catch(console.error);
      }

      if (!isPortal) {
        api.get('/routing/diesel-prices').then(res => {
          const nlPrice = res.data?.find((p: any) => p.country === 'NL')?.price;
          if (nlPrice) setFuelPrice(nlPrice);
        }).catch(err => console.warn('Failed to fetch diesel prices', err));
      }

      if (orderId) {
        (async () => {
          const targetApi = isPortal ? (await import('../../lib/portalApi')).default : api;
          const endpoint = isPortal ? `/portal/orders/${orderId}` : `/orders/${orderId}`;
          targetApi.get(endpoint).then(res => {
          const order = res.data;
          setForm({
            clientId: order?.client?.id || order?.clientId || '',
            customerReference: order?.customerReference || '',
            internalReference: order?.internalReference || '',
            priority: order?.priority || 'normal',
            transportType: order?.transportType || 'ftl',
            price: order?.price?.toString() || '',
            currency: order?.currency || 'EUR',
            notes: order?.notes || '',
            contactPerson: order?.contactPerson || '',
            contactPhone: order?.contactPhone || '',
            equipmentRequirements: Array.isArray(order?.equipmentRequirements) ? order.equipmentRequirements : (typeof order?.equipmentRequirements === 'string' ? [order.equipmentRequirements] : [])
          });
          const stopsArray = Array.isArray(order?.stops) ? order.stops : [];
          const p = stopsArray.find((s: any) => s.type === 'pickup') || {};
          const d = stopsArray.find((s: any) => s.type === 'dropoff') || {};
          setPickup({
            companyName: p.companyName || '',
            address: p.address || '',
            city: p.city || '',
            country: p.country || '',
            postalCode: p.postalCode || '',
            scheduledDate: p.dateFrom || (p.scheduledDate ? String(p.scheduledDate).slice(0, 10) : ''),
            scheduledTime: p.timeFrom || p.scheduledTime || '',
            latitude: p.latitude ? parseFloat(p.latitude) : null,
            longitude: p.longitude ? parseFloat(p.longitude) : null,
            contactPerson: p.contactPerson || '',
            phone: p.phone || '',
            dateTo: p.dateTo || '',
            timeUntil: p.timeUntil || '',
            reference: p.reference || '',
            notes: p.notes || ''
          });
          setDropoff({
            companyName: d.companyName || '',
            address: d.address || '',
            city: d.city || '',
            country: d.country || '',
            postalCode: d.postalCode || '',
            scheduledDate: d.dateFrom || (d.scheduledDate ? String(d.scheduledDate).slice(0, 10) : ''),
            scheduledTime: d.timeFrom || d.scheduledTime || '',
            latitude: d.latitude ? parseFloat(d.latitude) : null,
            longitude: d.longitude ? parseFloat(d.longitude) : null,
            contactPerson: d.contactPerson || '',
            phone: d.phone || '',
            dateTo: d.dateTo || '',
            timeUntil: d.timeUntil || '',
            reference: d.reference || '',
            notes: d.notes || ''
          });
          setCargoItems(Array.isArray(order?.cargoItems) && order.cargoItems.length > 0 ? order.cargoItems.map((c: any) => ({
            id: c.id,
            description: c.description || '',
            quantity: c.quantity || 1,
            weightKg: c.weightKg?.toString() || '',
            volumeCbm: c.volumeCbm?.toString() || '',
            ldm: c.ldm?.toString() || '',
            unit: c.unit || 'pallet',
            lengthCm: c.lengthCm?.toString() || '',
            widthCm: c.widthCm?.toString() || '',
            heightCm: c.heightCm?.toString() || '',
            stackable: Boolean(c.stackable),
            fragile: Boolean(c.fragile),
            isAdr: Boolean(c.isAdr),
            adrClass: c.adrClass || '',
            adrUnNumber: c.adrUnNumber || '',
            isTemperatureControlled: Boolean(c.isTemperatureControlled),
            requiredTemperature: c.requiredTemperature?.toString() || ''
          })) : [{
            ...emptyCargo
          }]);
          const sortedStops = [...stopsArray].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
          const middle = sortedStops.length > 2 ? sortedStops.slice(1, -1) : [];
          setExtraStops(middle.map((s: any) => ({
            companyName: s.companyName || '',
            address: s.address || '',
            city: s.city || '',
            country: s.country || '',
            postalCode: s.postalCode || '',
            scheduledDate: s.dateFrom || (s.scheduledDate ? String(s.scheduledDate).slice(0, 10) : ''),
            scheduledTime: s.timeFrom || s.scheduledTime || '',
            latitude: s.latitude ? parseFloat(s.latitude) : null,
            longitude: s.longitude ? parseFloat(s.longitude) : null,
            contactPerson: s.contactPerson || '',
            phone: s.phone || '',
            dateTo: s.dateTo || '',
            timeUntil: s.timeUntil || '',
            reference: s.reference || '',
            notes: s.notes || ''
          })));
        }).catch(err => {
            console.error("Error fetching order data:", err);
            toast.error("Failed to load order details.");
          });
        })();
      } else {
        (async () => {
          try {
            const refApi = isPortal ? (await import('../../lib/portalApi')).default : api;
            const res = await refApi.get(isPortal ? '/portal/orders/next-reference' : '/orders/next-reference');
            setForm(prev => ({ ...prev, internalReference: res.data?.nextReference || '' }));
          } catch (err) {
            console.warn('Failed to fetch next reference', err);
          }
        })();

        setForm({
          clientId: '',
          customerReference: '',
          internalReference: '',
          priority: 'normal',
          transportType: 'ftl',
          price: '',
          currency: 'EUR',
          notes: '',
          contactPerson: '',
          contactPhone: '',
          equipmentRequirements: []
        });
        setPickup({
          ...emptyStop
        });
        setDropoff({
          ...emptyStop
        });
        setExtraStops([]);
        setCargoItems([{
          ...emptyCargo
        }]);
      }
      // Removed setCurrentStep(0) so the modal respects initialStep / highlightSection
    }
  }, [isOpen, orderId]);
  useEffect(() => {
    setCostEstimate((prev: any) => {
      if (!prev) return prev;
      const fuelCost = ((prev.distanceKm / 100) * fuelConsumption * fuelPrice);
      const totalCost = fuelCost + prev.tollCost;
      const agreedPrice = parseFloat(form.price) || 0;
      const profit = agreedPrice - totalCost;
      // Prevent unnecessary updates if values haven't changed
      if (prev.fuelCost === fuelCost && prev.totalCost === totalCost && prev.agreedPrice === agreedPrice && prev.profit === profit) {
        return prev;
      }
      return { ...prev, fuelCost, totalCost, agreedPrice, profit };
    });
  }, [fuelConsumption, fuelPrice, form.price]);

  if (!isOpen) return null;
  const handleCalculateCost = async () => {
    if (!pickup.latitude || !pickup.longitude || !dropoff.latitude || !dropoff.longitude) {
      toast.error(t('cost_calc_no_coords', 'Please validate pickup and delivery addresses first (Step 2).'));
      return;
    }
    try {
      setCostLoading(true);
      const totalWeightKg = cargoItems.reduce((sum: number, c: any) => sum + (parseFloat(c.weightKg) || 0), 0);
      const res = await api.get('/routing/estimate', {
        params: {
          fromLat: pickup.latitude,
          fromLng: pickup.longitude,
          toLat: dropoff.latitude,
          toLng: dropoff.longitude,
          weightKg: totalWeightKg || undefined,
        }
      });
      const { distanceKm, durationMin, durationText, tollCost } = res.data;
      const fuelCost = ((distanceKm / 100) * fuelConsumption * fuelPrice);
      const totalCost = fuelCost + (tollCost || 0);
      const agreedPrice = parseFloat(form.price) || 0;
      const profit = agreedPrice - totalCost;
      setCostEstimate({
        distanceKm,
        durationMin,
        durationText,
        tollCost: tollCost || 0,
        fuelCost,
        totalCost,
        agreedPrice,
        profit,
      });
      setConfirmedUnprofitable(false);
    } catch (err) {
      toast.error(t('cost_calc_error', 'Cost calculation failed. Please try again.'));
    } finally {
      setCostLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      // Validate geocoding coordinates on stop step
      if (!pickup.latitude || !pickup.longitude) {
        toast.error(t('pickup_no_gps', 'Pickup location does not have valid GPS coordinates. Please select an address from the list.'));
        return;
      }
      if (!dropoff.latitude || !dropoff.longitude) {
        toast.error(t('dropoff_no_gps', 'Delivery location does not have valid GPS coordinates. Please select an address from the list.'));
        return;
      }
    }
    if (currentStep === 2) {
      // On cargo step, require cost calculation acknowledgement if showing unprofitable
      if (costEstimate && costEstimate.profit < 0 && !confirmedUnprofitable) {
        toast.error(t('cost_confirm_required', 'Please confirm that you accept the unprofitable order.'));
        return;
      }
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };
  const handleAddCargo = () => setCargoItems([...cargoItems, {
    ...emptyCargo
  }]);
  const handleRemoveCargo = (i: number) => setCargoItems(cargoItems.filter((_, idx) => idx !== i));
  const handleAddExtraStop = () => setExtraStops([...extraStops, {
    ...emptyStop
  }]);
  const handleRemoveExtraStop = (i: number) => setExtraStops(extraStops.filter((_, idx) => idx !== i));
  const handleExtraStopChange = (i: number, patch: any) => {
    const n = [...extraStops];
    n[i] = { ...n[i], ...patch };
    setExtraStops(n);
  };
  const handleExtraStopSelect = (i: number, label: string, city: string, country: string, lat: number | null, lng: number | null) => {
    const n = [...extraStops];
    n[i] = {
      ...n[i],
      address: label,
      city: city || n[i].city,
      country: country || n[i].country,
      latitude: lat || null,
      longitude: lng || null
    };
    setExtraStops(n);
  };
  const handleCargoChange = (i: number, field: string, value: any) => {
    setIsHighlightDismissed(true);
    const n = [...cargoItems];
    n[i][field] = value;
    setCargoItems(n);
    // Reset cost estimate when modal closes
    setCostEstimate(null);
    setConfirmedUnprofitable(false);
  };
  const handleSubmit = async () => {
    if (!pickup.latitude || !pickup.longitude || !dropoff.latitude || !dropoff.longitude) {
      toast.error(t('both_addresses_need_gps', 'Both addresses must have valid GPS coordinates (geocoded) to save the order.'));
      return;
    }
    try {
      setLoading(true);
      const {
        customerReference,
        ...cleanForm
      } = form;
      const payload = {
        ...cleanForm,
        internalReference: form.internalReference || null,
        clientId: form.clientId || null,
        price: form.price ? parseFloat(form.price) : null,
        customerReference: pickup.reference || null,
        contactPerson: pickup.contactPerson || null,
        contactPhone: pickup.phone || null,
        estimatedCost: costEstimate ? costEstimate.totalCost : null,
        estimatedProfit: costEstimate ? costEstimate.profit : null,
        stops: [{
          type: 'pickup',
          sequence: 1,
          ...pickup,
          scheduledDate: pickup.scheduledDate || null
        }, ...extraStops.map((s, i) => ({
          type: 'delivery',
          sequence: i + 2,
          ...s,
          scheduledDate: s.scheduledDate || null
        })), {
          type: 'dropoff',
          sequence: extraStops.length + 2,
          ...dropoff,
          scheduledDate: dropoff.scheduledDate || null
        }],
        cargoItems: cargoItems.map(c => ({
          ...c,
          quantity: c.quantity ? parseInt(c.quantity) : null,
          weightKg: c.weightKg ? parseFloat(c.weightKg) : null,
          volumeCbm: c.volumeCbm ? parseFloat(c.volumeCbm) : null,
          ldm: c.ldm ? parseFloat(c.ldm) : null,
          lengthCm: c.lengthCm ? parseFloat(c.lengthCm) : null,
          widthCm: c.widthCm ? parseFloat(c.widthCm) : null,
          heightCm: c.heightCm ? parseFloat(c.heightCm) : null,
          requiredTemperature: c.requiredTemperature ? parseFloat(c.requiredTemperature) : null
        }))
      };
      
      const targetApi = isPortal ? (await import('../../lib/portalApi')).default : api;
      const endpoint = isPortal ? '/portal/orders' : '/orders';
      
      if (orderId && !isPortal) {
        await targetApi.patch(`${endpoint}/${orderId}`, payload);
        toast.success(t('saved', 'Order updated'));
      } else {
        await targetApi.post(endpoint, payload);
        toast.success(t('saved', 'Order created'));
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('error', 'Error'));
    } finally {
      setLoading(false);
    }
  };
  const clientOptions: SelectOpt[] = [{
    value: '',
    label: t('select_client_default', 'Select a client...')
  }, ...clients.map(c => ({
    value: c.id,
    label: c.name
  }))];
  const transportOptions: SelectOpt[] = [{
    value: 'ftl',
    label: t('transport_ftl', 'FTL (Full Truckload)')
  }, {
    value: 'groupage',
    label: t('transport_groupage', 'Groupage (LTL)')
  }, {
    value: 'express',
    label: t('transport_express', 'Express')
  }];
  const priorityOptions: SelectOpt[] = [{
    value: 'low',
    label: t('priority_low', 'Low')
  }, {
    value: 'normal',
    label: t('priority_normal', 'Normal')
  }, {
    value: 'high',
    label: t('priority_high', 'High')
  }, {
    value: 'critical',
    label: t('priority_critical', '🔴 Critical')
  }];
  const currencyOptions: SelectOpt[] = [{
    value: 'EUR',
    label: '€'
  }, {
    value: 'USD',
    label: '$ USD'
  }, {
    value: 'RON',
    label: 'RON'
  }];
  const unitOptions: SelectOpt[] = [{
    value: 'pallet',
    label: t('unit_pallets', 'Pallets')
  }, {
    value: 'kg',
    label: t('unit_kg', 'Kilograms')
  }, {
    value: 'ton',
    label: t('unit_tons', 'Tons')
  }, {
    value: 'box',
    label: t('unit_boxes', 'Boxes')
  }, {
    value: 'package',
    label: t('unit_packages', 'Packages')
  }, {
    value: 'container',
    label: t('unit_container', 'Container')
  }, {
    value: 'machine',
    label: 'Machine'
  }, {
    value: 'other',
    label: t('unit_other', 'Other')
  }];
  const modalContent = <div className="fixed inset-0 z-[20000] flex items-center justify-center p-3 md:p-5" style={{
    backdropFilter: 'blur(6px)',
    backgroundColor: 'rgba(0,0,0,0.65)'
  }}>
      <div className="relative z-[20001] w-full max-w-6xl h-[92vh] max-h-[950px] bg-card shadow-2xl flex flex-col rounded-2xl overflow-hidden border border-border" style={{
      animation: 'wizardIn 0.25s cubic-bezier(0.34,1.56,0.64,1)'
    }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-2 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {orderId ? t('editOrder', 'Edit Order') : t('createOrder', 'Create New Order')}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">{t("jsx_step")}{currentStep + 1} of {STEPS.length} — {t(STEPS[currentStep].titleKey, STEPS[currentStep].fallbackTitle)}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl transition-colors text-text-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators with pixel-perfect bar */}
        <div className="px-4 py-2 border-b border-border bg-white dark:bg-card shrink-0" ref={headerRef} style={{
        position: 'relative'
      }}>
          {/* Gray full connector */}
          <div className="absolute bg-border" style={{
          top: 8 + 14,
          left: barLeft,
          width: barTotalWidth,
          height: 2,
          zIndex: 0
        }} />
          {/* Orange progress */}
          <div className="absolute bg-primary transition-all duration-400" style={{
          top: 8 + 14,
          left: barLeft,
          width: barOrangeWidth,
          height: 2,
          zIndex: 0
        }} />

          <div className="flex items-start justify-between">
            {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep;
            const isPast = idx < currentStep;
            return <div key={step.id} ref={el => {
              stepRefs.current[idx] = el;
            }} className="flex flex-col items-center flex-1" style={{
              position: 'relative',
              zIndex: 2
            }}>
                  <div className="bg-white dark:bg-card rounded-full ring-4 ring-white dark:ring-card">
                    <button type="button" onClick={() => (orderId || idx <= currentStep) && setCurrentStep(idx)} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none
                        ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110' : (orderId || isPast) ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30' : 'bg-surface border-2 border-border text-text-muted cursor-default'}`}>
                      <StepIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className={`text-[10px] mt-1.5 font-semibold text-center leading-tight ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                    {t(step.titleKey, step.fallbackTitle)}
                  </span>
                </div>;
          })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-4 custom-scrollbar">

          {/* STEP 1: General Info */}
          {currentStep === 0 && <div className="space-y-5" style={{
          animation: 'stepIn 0.2s ease-out'
        }}>
              {!isPortal && (
              <div className="bg-surface/40 p-5 rounded-xl border border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("jsx_clientInformat")}</h3>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="wiz-client">{t("jsx_client")}</label>
                  <ModalSelect id="wiz-client" value={form.clientId} onChange={v => setForm({
                ...form,
                clientId: v
              })} options={clientOptions} placeholder="Select a client..." />
                </div>
              </div>
              )}

              <div className="bg-surface/40 p-5 rounded-xl border border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">{t("jsx_transportDetai")}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("jsx_transportType")}</label>
                    <ModalSelect value={form.transportType} onChange={v => setForm({
                  ...form,
                  transportType: v
                })} options={transportOptions} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("jsx_priority")}</label>
                    <ModalSelect value={form.priority} onChange={v => setForm({
                  ...form,
                  priority: v
                })} options={priorityOptions} />
                  </div>
                </div>
                {!isPortal && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("jsx_agreedPrice")}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">€</span>
                      <input type="number" step="0.01" value={form.price} onChange={e => setForm({
                    ...form,
                    price: e.target.value
                  })} className="input w-full pl-8" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("jsx_currency")}</label>
                    <ModalSelect value={form.currency} onChange={v => setForm({
                  ...form,
                  currency: v
                })} options={currencyOptions} />
                  </div>
                </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">{t("jsx_equipmentRequi")}</label>
                  <div className="flex flex-wrap gap-2">
                    {['frigo', 'tilt', 'adr', 'mega'].map(eq => {
                  const selected = form.equipmentRequirements.includes(eq);
                  return <button key={eq} type="button" onClick={() => {
                    const reqsArray = Array.isArray(form.equipmentRequirements) ? form.equipmentRequirements : [];
                    const newReqs = selected ? reqsArray.filter(r => r !== eq) : [...reqsArray, eq];
                    setForm({
                      ...form,
                      equipmentRequirements: newReqs
                    });
                  }} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${selected ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface border-border text-text-secondary hover:border-primary/50'}`}>
                          {t(`eq_${eq}`, eq.toUpperCase())}
                        </button>;
                })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">{t("jsx_internalReference", "Internal Reference")}</label>
                    <input type="text" value={form.internalReference} readOnly={isPortal} onChange={e => setForm({
                  ...form,
                  internalReference: e.target.value
                })} className="input w-full" placeholder={t("jsx_autoGenerated", "Auto-generated on save")} />
                  </div>
                </div>
              </div>

              <div className="bg-surface/40 p-5 rounded-xl border border-border">
                <label className="block text-sm font-medium mb-1.5">{t("jsx_internalNotes")}</label>
                <textarea value={form.notes} onChange={e => setForm({
              ...form,
              notes: e.target.value
            })} className="input w-full min-h-[80px] resize-none" placeholder={t('additionalNotesPlaceholder', 'Additional instructions or notes...')} />
              </div>
            </div>}

          {/* STEP 2: Pickup & Delivery */}
          {currentStep === 1 && <div className="space-y-4" style={{
          animation: 'stepIn 0.2s ease-out'
        }}>
              <div className="mb-1">
                <h3 className="text-lg font-semibold text-text-primary">{t("jsx_pickupDelive")}</h3>
                <p className="text-sm text-text-secondary">{t("jsx_whereIsTheCa")}</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5 relative lg:col-start-1 lg:row-start-1">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-4 border-card flex items-center justify-center font-bold text-xs text-blue-600">A</div>
                  <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />{t("jsx_pickupDetails")}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_companyLocat", "Company / Location Name")}</label>
                      <CompanyAutocomplete value={pickup.companyName} onChange={val => setPickup({
                    ...pickup,
                    companyName: val
                  })} onSelectFull={(companyName, address, lat, lng, city, country) => {
                    setPickup(p => ({
                      ...p,
                      companyName,
                      address,
                      latitude: lat || null,
                      longitude: lng || null,
                      city: city || p.city,
                      country: country || p.country
                    }));
                  }} className="input w-full bg-white dark:bg-card" placeholder="e.g. Supplier Warehouse" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_fullAddress")}</label>
                      <AddressAutocomplete value={pickup.address} onChange={val => setPickup({
                    ...pickup,
                    address: val
                  })} onSelectFull={(label, city, country, lat, lng) => {
                    setPickup(p => ({
                      ...p,
                      address: label,
                      city: city || p.city,
                      country: country || p.country,
                      latitude: lat || null,
                      longitude: lng || null
                    }));
                  }} placeholder="Street, Number, Zip Code" className="input w-full bg-white dark:bg-card" required />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-text-secondary">{t("jsx_geocoding")}</span>
                        {pickup.latitude && pickup.longitude ? <span className="text-xs font-semibold text-green-600 flex items-center gap-1">{t("jsx_Geocoded")}{pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)})
                          </span> : <span className="text-xs font-semibold text-red-500">{t("jsx_CoordinatesM")}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_contactPerson")}</label>
                        <input type="text" value={pickup.contactPerson} onChange={e => setPickup({
                      ...pickup,
                      contactPerson: e.target.value
                    })} className="input w-full bg-white dark:bg-card" placeholder="Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_phoneNumber")}</label>
                        <input type="text" value={pickup.phone} onChange={e => setPickup({
                      ...pickup,
                      phone: e.target.value
                    })} className="input w-full bg-white dark:bg-card" placeholder="Phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDatePicker label="Pickup Time Window (Min)" dateValue={pickup.scheduledDate} timeValue={pickup.scheduledTime || ''} onDateChange={v => setPickup({
                    ...pickup,
                    scheduledDate: v
                  })} onTimeChange={v => setPickup({
                    ...pickup,
                    scheduledTime: v
                  })} />
                      <CustomDatePicker label="Pickup Time Window (Max)" dateValue={pickup.dateTo} timeValue={pickup.timeUntil || ''} onDateChange={v => setPickup({
                    ...pickup,
                    dateTo: v
                  })} onTimeChange={v => setPickup({
                    ...pickup,
                    timeUntil: v
                  })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_referencePO")}</label>
                      <input type="text" value={pickup.reference} onChange={e => setPickup({
                    ...pickup,
                    reference: e.target.value
                  })} className="input w-full bg-white dark:bg-card" placeholder="e.g. PO-99812 / Loading Instructions" />
                    </div>
                  </div>
                </div>

                {/* Intermediate stops */}
                {extraStops.map((stop, i) => <div key={`extra-${i}`} className="lg:col-span-2 bg-purple-50/40 dark:bg-purple-900/5 border border-purple-200 dark:border-purple-800 rounded-xl p-5 relative">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 border-4 border-card flex items-center justify-center font-bold text-xs text-purple-600">
                    {i + 2}
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-2">
                      <MapPin className="w-4 h-4" />{t('stop_intermediate', 'Oprire intermediară')} {i + 1}
                    </h4>
                    <button onClick={() => handleRemoveExtraStop(i)} className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title={t('remove_stop', 'Șterge oprirea')}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_companyLocat", "Company / Location Name")}</label>
                      <CompanyAutocomplete value={stop.companyName} onChange={val => handleExtraStopChange(i, {
                    companyName: val
                  })} onSelectFull={(companyName, address, lat, lng, city, country) => {
                    handleExtraStopSelect(i, address, city, country, lat, lng);
                    handleExtraStopChange(i, { companyName });
                  }} className="input w-full bg-white dark:bg-card" placeholder="e.g. Cross-dock warehouse" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_fullAddress")}</label>
                      <AddressAutocomplete value={stop.address} onChange={val => handleExtraStopChange(i, { address: val })} onSelectFull={(label, city, country, lat, lng) => handleExtraStopSelect(i, label, city, country, lat, lng)} placeholder="Street, Number, Zip Code" className="input w-full bg-white dark:bg-card" />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-text-secondary">{t("jsx_geocoding")}</span>
                        {stop.latitude && stop.longitude ? <span className="text-xs font-semibold text-green-600 flex items-center gap-1">{t("jsx_Geocoded")}{stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)})
                          </span> : <span className="text-xs font-semibold text-red-500">{t("jsx_CoordinatesM")}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDatePicker label="Stop Time Window (Min)" dateValue={stop.scheduledDate} timeValue={stop.scheduledTime || ''} onDateChange={v => handleExtraStopChange(i, { scheduledDate: v })} onTimeChange={v => handleExtraStopChange(i, { scheduledTime: v })} />
                      <CustomDatePicker label="Stop Time Window (Max)" dateValue={stop.dateTo} timeValue={stop.timeUntil || ''} onDateChange={v => handleExtraStopChange(i, { dateTo: v })} onTimeChange={v => handleExtraStopChange(i, { timeUntil: v })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_referencePO")}</label>
                      <input type="text" value={stop.reference} onChange={e => handleExtraStopChange(i, { reference: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="e.g. Reference / Instructions" />
                    </div>
                  </div>
                </div>)}

                <div className="lg:col-span-2">
                  <button onClick={handleAddExtraStop} className="w-full py-2.5 text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-900/10 border-2 border-dashed border-purple-300 dark:border-purple-800 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />{t('add_stop', 'Adaugă oprire intermediară')}
                  </button>
                </div>

                {/* Delivery */}
                <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5 relative lg:col-start-2 lg:row-start-1">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 border-4 border-card flex items-center justify-center font-bold text-xs text-green-600">B</div>
                  <h4 className="text-green-600 dark:text-green-400 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />{t("jsx_deliveryDetail")}</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_companyLocat", "Company / Location Name")}</label>
                      <CompanyAutocomplete value={dropoff.companyName} onChange={val => setDropoff({
                    ...dropoff,
                    companyName: val
                  })} onSelectFull={(companyName, address, lat, lng, city, country) => {
                    setDropoff(d => ({
                      ...d,
                      companyName,
                      address,
                      latitude: lat || null,
                      longitude: lng || null,
                      city: city || d.city,
                      country: country || d.country
                    }));
                  }} className="input w-full bg-white dark:bg-card" placeholder="e.g. Client Destination" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_fullAddress")}</label>
                      <AddressAutocomplete value={dropoff.address} onChange={val => setDropoff({
                    ...dropoff,
                    address: val
                  })} onSelectFull={(label, city, country, lat, lng) => {
                    setDropoff(d => ({
                      ...d,
                      address: label,
                      city: city || d.city,
                      country: country || d.country,
                      latitude: lat || null,
                      longitude: lng || null
                    }));
                  }} placeholder="Street, Number, Zip Code" className="input w-full bg-white dark:bg-card" required />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-text-secondary">{t("jsx_geocoding")}</span>
                        {dropoff.latitude && dropoff.longitude ? <span className="text-xs font-semibold text-green-600 flex items-center gap-1">{t("jsx_Geocoded")}{dropoff.latitude.toFixed(4)}, {dropoff.longitude.toFixed(4)})
                          </span> : <span className="text-xs font-semibold text-red-500">{t("jsx_CoordinatesM")}</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_contactPerson")}</label>
                        <input type="text" value={dropoff.contactPerson} onChange={e => setDropoff({
                      ...dropoff,
                      contactPerson: e.target.value
                    })} className="input w-full bg-white dark:bg-card" placeholder="Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_phoneNumber")}</label>
                        <input type="text" value={dropoff.phone} onChange={e => setDropoff({
                      ...dropoff,
                      phone: e.target.value
                    })} className="input w-full bg-white dark:bg-card" placeholder="Phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDatePicker label="Delivery Time Window (Min)" dateValue={dropoff.scheduledDate} timeValue={dropoff.scheduledTime || ''} onDateChange={v => setDropoff({
                    ...dropoff,
                    scheduledDate: v
                  })} onTimeChange={v => setDropoff({
                    ...dropoff,
                    scheduledTime: v
                  })} />
                      <CustomDatePicker label="Delivery Time Window (Max)" dateValue={dropoff.dateTo} timeValue={dropoff.timeUntil || ''} onDateChange={v => setDropoff({
                    ...dropoff,
                    dateTo: v
                  })} onTimeChange={v => setDropoff({
                    ...dropoff,
                    timeUntil: v
                  })} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_referenceUnl")}</label>
                      <input type="text" value={dropoff.reference} onChange={e => setDropoff({
                    ...dropoff,
                    reference: e.target.value
                  })} className="input w-full bg-white dark:bg-card" placeholder="e.g. Gate 3 / Unloading Instructions" />
                    </div>
                  </div>
                </div>
              </div>
            </div>}

          {/* STEP 3: Cargo Items */}
          {currentStep === 2 && <div className="space-y-4" style={{
          animation: 'stepIn 0.2s ease-out'
        }}>
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-text-primary">{t("jsx_cargoItems")}</h3>
                <p className="text-sm text-text-secondary">{t("jsx_whatAreWeTra")}</p>
              </div>
              <div className="space-y-3">
                {cargoItems.map((cargo, index) => {
                  const isHighlighted = Boolean(highlightSection && !isHighlightDismissed);
                  const isWeightTarget = isHighlighted && (highlightSection === 'weight' || highlightSection === 'cargo');
                  const isPalletsTarget = isHighlighted && (highlightSection === 'pallets' || highlightSection === 'quantity' || highlightSection === 'cargo');
                  const isLdmTarget = isHighlighted && (highlightSection === 'ldm' || highlightSection === 'cargo');
                  const isVolumeTarget = isHighlighted && (highlightSection === 'volume' || highlightSection === 'cargo');

                  return (
                    <div
                      key={index}
                      className="border border-border rounded-xl p-4 relative group bg-surface/50 transition-all"
                    >
                      {isHighlighted && (
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase text-orange-600 bg-orange-500/20 px-2.5 py-0.5 rounded-full animate-bounce">
                            ⚠️ Conflict Target — Adjust {highlightSection === 'weight' ? 'Weight (kg)' : highlightSection === 'ldm' ? 'LDM' : highlightSection === 'volume' ? 'Volume (m³)' : highlightSection === 'pallets' ? 'Quantity (Pallets)' : 'Cargo Specs'}
                          </span>
                        </div>
                      )}
                      {cargoItems.length > 1 && <button type="button" onClick={() => handleRemoveCargo(index)} className="absolute top-3 right-3 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_cargoDescripti")}</label>
                          <input type="text" value={cargo.description} onChange={e => handleCargoChange(index, 'description', e.target.value)} className="input w-full" placeholder="e.g. Pallets of electronics" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center justify-between">
                            <span>{t("jsx_quantityOptio")}</span>
                            {isPalletsTarget && <span className="text-[9px] text-orange-500 font-bold uppercase">Target</span>}
                          </label>
                          <input
                            type="number"
                            value={cargo.quantity != null ? cargo.quantity : ''}
                            onChange={e => handleCargoChange(index, 'quantity', e.target.value)}
                            className={`input w-full transition-all ${isPalletsTarget ? 'border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-md shadow-orange-500/30 animate-pulse font-bold' : ''}`}
                            min="1"
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_unitTypeOpti")}</label>
                          <ModalSelect value={cargo.unit || 'pallet'} onChange={v => handleCargoChange(index, 'unit', v)} options={unitOptions} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center justify-between">
                            <span>{t("jsx_weightKgOp")}</span>
                            {isWeightTarget && <span className="text-[9px] text-orange-500 font-bold uppercase">Target</span>}
                          </label>
                          <input
                            type="number"
                            step="0.1"
                            value={cargo.weightKg || ''}
                            onChange={e => handleCargoChange(index, 'weightKg', e.target.value)}
                            className={`input w-full transition-all ${isWeightTarget ? 'border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-md shadow-orange-500/30 animate-pulse font-bold' : ''}`}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center justify-between">
                            <span>{t("jsx_volumeMOp")}</span>
                            {isVolumeTarget && <span className="text-[9px] text-orange-500 font-bold uppercase">Target</span>}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={cargo.volumeCbm || ''}
                            onChange={e => handleCargoChange(index, 'volumeCbm', e.target.value)}
                            className={`input w-full transition-all ${isVolumeTarget ? 'border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-md shadow-orange-500/30 animate-pulse font-bold' : ''}`}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center justify-between">
                            <span>{t("jsx_lDMOptional")}</span>
                            {isLdmTarget && <span className="text-[9px] text-orange-500 font-bold uppercase">Target</span>}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={cargo.ldm || ''}
                            onChange={e => handleCargoChange(index, 'ldm', e.target.value)}
                            className={`input w-full transition-all ${isLdmTarget ? 'border-2 border-orange-500 ring-4 ring-orange-500/50 shadow-md shadow-orange-500/30 animate-pulse font-bold' : ''}`}
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/40">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">{t("jsx_cargoDimension")}</label>
                        <div className="grid grid-cols-3 gap-1">
                          <input type="number" value={cargo.lengthCm || ''} onChange={e => handleCargoChange(index, 'lengthCm', e.target.value)} className="input p-1 text-center" placeholder="L" />
                          <input type="number" value={cargo.widthCm || ''} onChange={e => handleCargoChange(index, 'widthCm', e.target.value)} className="input p-1 text-center" placeholder="W" />
                          <input type="number" value={cargo.heightCm || ''} onChange={e => handleCargoChange(index, 'heightCm', e.target.value)} className="input p-1 text-center" placeholder="H" />
                        </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.stackable} onChange={e => handleCargoChange(index, 'stackable', e.target.checked)} className="checkbox" />
                          <span>{t("jsx_stackable")}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary mt-1">
                          <input type="checkbox" checked={cargo.fragile} onChange={e => handleCargoChange(index, 'fragile', e.target.checked)} className="checkbox" />
                          <span>{t("jsx_fragile")}</span>
                        </label>
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.isAdr} onChange={e => handleCargoChange(index, 'isAdr', e.target.checked)} className="checkbox" />
                          <span>{t("jsx_requiresADR")}</span>
                        </label>
                        {cargo.isAdr && <div className="grid grid-cols-2 gap-1 mt-1">
                            <input type="text" value={cargo.adrClass || ''} onChange={e => handleCargoChange(index, 'adrClass', e.target.value)} className="input p-1 text-xs" placeholder="Class" />
                            <input type="text" value={cargo.adrUnNumber || ''} onChange={e => handleCargoChange(index, 'adrUnNumber', e.target.value)} className="input p-1 text-xs" placeholder="UN #" />
                          </div>}
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.isTemperatureControlled} onChange={e => handleCargoChange(index, 'isTemperatureControlled', e.target.checked)} className="checkbox" />
                          <span>{t("jsx_tempControlled")}</span>
                        </label>
                        {cargo.isTemperatureControlled && <input type="number" step="0.5" value={cargo.requiredTemperature || ''} onChange={e => handleCargoChange(index, 'requiredTemperature', e.target.value)} className="input p-1 text-xs mt-1 w-full" placeholder="Temp °C" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              <button type="button" onClick={handleAddCargo} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium">
                <Plus className="w-4 h-4" />{t("jsx_addCargoItem")}</button>

              {/* ============ COST ESTIMATOR ============ */}
              {!isPortal && (
              <div className="mt-4 bg-gradient-to-br from-blue-950/5 to-primary/5 border border-primary/20 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h3 className="font-bold text-base flex items-center gap-2 text-text-primary">
                    <Calculator className="w-5 h-5 text-primary" />
                    {t('cost_estimator_title', 'Cost Estimator')}
                  </h3>
                  <button
                    type="button"
                    onClick={handleCalculateCost}
                    disabled={costLoading || !pickup.latitude || !dropoff.latitude}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    {costLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                    {t('cost_calculate_btn', 'Calculate Costs')}
                  </button>
                </div>

                {/* Fuel parameters */}
                <div className="grid grid-cols-2 gap-3 mb-4 bg-black/5 p-3 rounded-xl">
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">
                      <Fuel className="w-3 h-3 inline mr-1" />{t('cost_consumption', 'Avg Consumption (L/100km)')}
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="10"
                      max="60"
                      value={fuelConsumption}
                      onChange={e => setFuelConsumption(parseFloat(e.target.value) || 32)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-secondary mb-1 uppercase tracking-wider">
                      {t('cost_fuel_price', 'Fuel Price (€/L)')}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="5"
                      value={fuelPrice}
                      onChange={e => setFuelPrice(parseFloat(e.target.value) || 1.65)}
                      className="input w-full text-sm"
                    />
                  </div>
                </div>

                {!pickup.latitude || !dropoff.latitude ? (
                  <p className="text-xs text-text-secondary text-center py-3">
                    {t('cost_need_addresses', '⚠ Validate pickup & delivery addresses in Step 2 to enable cost calculation.')}
                  </p>
                ) : !costEstimate ? (
                  <p className="text-xs text-text-secondary text-center py-3">
                    {t('cost_click_calculate', 'Click "Calculate Costs" to estimate transport costs for this route.')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Route summary */}
                    <div className="flex items-center justify-between bg-white/60 dark:bg-card/60 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">{t('cost_route_distance', 'Route')}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-base text-primary">{costEstimate.distanceKm} km</span>
                        <span className="text-xs text-text-secondary ml-2">({costEstimate.durationText})</span>
                      </div>
                    </div>

                    {/* Cost breakdown */}
                    <div className="bg-white/60 dark:bg-card/60 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary flex items-center gap-1.5">
                          <Fuel className="w-3.5 h-3.5 text-orange-500" />
                          {t('cost_fuel_cost', 'Fuel Cost')}
                        </span>
                        <span className="font-semibold">€{costEstimate.fuelCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-secondary flex items-center gap-1.5">
                          <span className="text-base">🛣</span>
                          {t('cost_toll', 'Road Toll')}
                        </span>
                        <span className="font-semibold">€{costEstimate.tollCost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-border/50 font-bold">
                        <span className="text-text-primary">{t('cost_total_cost', 'Total Estimated Cost')}</span>
                        <span className="text-red-500">€{costEstimate.totalCost.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Profit analysis */}
                    <div className={`rounded-xl p-4 border-2 ${costEstimate.profit >= 0 ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/40'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-text-secondary">{t('cost_agreed_price', 'Agreed Price')}</span>
                        <span className="font-bold">€{costEstimate.agreedPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-sm font-bold flex items-center gap-1.5 ${costEstimate.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {costEstimate.profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {t('cost_estimated_profit', 'Estimated Profit')}
                        </span>
                        <span className={`font-black text-lg ${costEstimate.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {costEstimate.profit >= 0 ? '+' : ''}€{costEstimate.profit.toFixed(2)}
                        </span>
                      </div>
                      {costEstimate.profit >= 0 && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('cost_profitable', 'This order is profitable. Margin: {{margin}}%', {
                            margin: ((costEstimate.profit / costEstimate.agreedPrice) * 100).toFixed(1)
                          })}
                        </p>
                      )}
                      {costEstimate.profit < 0 && (
                        <div className="mt-3 bg-red-500/10 border border-red-400/40 rounded-lg p-3">
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1.5 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {t('cost_unprofitable_title', '⚠ Warning: Unprofitable Order!')}
                          </p>
                          <p className="text-xs text-red-500">
                            {t('cost_unprofitable_desc', 'The agreed price is lower than estimated transport costs. You can still proceed, but this order will operate at a loss.')}
                          </p>
                          <label className="flex items-center gap-2 mt-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={confirmedUnprofitable}
                              onChange={e => setConfirmedUnprofitable(e.target.checked)}
                              className="checkbox"
                            />
                            <span className="text-xs font-semibold text-red-600">
                              {t('cost_unprofitable_confirm', 'I understand and accept this unprofitable order')}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              )}
              {/* ============ END COST ESTIMATOR ============ */}
            </div>}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-surface/50 flex justify-between items-center shrink-0 flex-wrap gap-3">
          <button type="button" onClick={onClose} className="btn-secondary !px-3 !py-1.5 !text-xs">{t("jsx_cancel")}</button>
          <div className="flex gap-3 items-center flex-wrap">
            {/* Unprofitable warning banner in footer */}
            {currentStep === STEPS.length - 1 && costEstimate && costEstimate.profit < 0 && (
              <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-300 rounded-md px-2 py-1.5">
                <input type="checkbox" checked={confirmedUnprofitable} onChange={e => setConfirmedUnprofitable(e.target.checked)} className="checkbox !w-3.5 !h-3.5" />
                <AlertTriangle className="w-3 h-3" />
                {t('cost_confirm_checkbox', 'Confirm unprofitable order')}
              </label>
            )}
            {currentStep > 0 && <button type="button" onClick={handlePrev} className="btn-secondary flex items-center gap-1.5 !px-3 !py-1.5 !text-xs">
                <ArrowLeft className="w-3.5 h-3.5" />{t("jsx_back")}</button>}
            {currentStep < STEPS.length - 1 ? <button type="button" onClick={handleNext} className="btn-primary flex items-center gap-1.5 shadow-sm hover:shadow-md !px-3 !py-1.5 !text-xs">{t("jsx_nextStep")}<ArrowRight className="w-3.5 h-3.5" />
              </button> : <button type="button" onClick={handleSubmit} disabled={loading || (costEstimate && costEstimate.profit < 0 && !confirmedUnprofitable)} className={`flex items-center gap-1.5 px-4 py-2 text-white rounded-lg font-semibold text-xs shadow-md hover:shadow-lg transition-all duration-150 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${costEstimate && costEstimate.profit < 0 && !confirmedUnprofitable ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'}`}>
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}{t("jsx_confirmSave")}</button>}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes wizardIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>;
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
