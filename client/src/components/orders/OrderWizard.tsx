import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Box, MapPin, FileText, ChevronDown, Clock } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import AddressAutocomplete from '../AddressAutocomplete';
import CustomDatePicker from '../CustomDatePicker';

interface OrderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  orderId?: string | null;
}

const STEPS = [
  { id: 'general', title: 'General Info', icon: FileText },
  { id: 'route', title: 'Pickup & Delivery', icon: MapPin },
  { id: 'cargo', title: 'Cargo Items', icon: Box },
];

interface SelectOpt { value: string; label: string; }

function ModalSelect({
  value, onChange, options, placeholder = 'Select...', id,
}: {
  value: string; onChange: (v: string) => void; options: SelectOpt[];
  placeholder?: string; id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        dropRef.current && !dropRef.current.contains(e.target as Node)
      ) setOpen(false);
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
      setDropPos({ top, left: r.left, width: r.width });
    }
    setOpen(p => !p);
  };

  const selected = options.find(o => o.value === value);

  return (
    <>
      <button
        id={id}
        type="button"
        ref={btnRef}
        onClick={toggle}
        className="input w-full flex items-center justify-between cursor-pointer hover:border-primary/60 transition-colors text-left"
      >
        <span className={selected ? 'text-text font-medium' : 'text-text-secondary'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-secondary flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropRef}
          className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl overflow-y-auto max-h-[250px] custom-scrollbar py-1"
          style={{ top: dropPos.top, left: dropPos.left, width: dropPos.width }}
        >
          {options.map(opt => (
            <div
              key={opt.value}
              onMouseDown={e => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center gap-2 border-l-2
                ${opt.value === value
                  ? 'bg-primary/10 border-primary text-primary font-semibold'
                  : 'border-transparent hover:bg-primary/5 hover:border-primary/30 text-text'
                }`}
            >
              {opt.label}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// Using CustomDatePicker instead of inline DateTimeInput

export default function OrderWizard({ isOpen, onClose, onSaved, orderId }: OrderWizardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

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
    equipmentRequirements: [] as string[],
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
    notes: '',
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
    requiredTemperature: '',
  };

  const [pickup, setPickup] = useState({ ...emptyStop });
  const [dropoff, setDropoff] = useState({ ...emptyStop });
  const [cargoItems, setCargoItems] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      api.get('/clients').then(res => setClients(res.data)).catch(console.error);
      if (orderId) {
        api.get(`/orders/${orderId}`).then(res => {
          const order = res.data;
          setForm({
            clientId: order.client?.id || '',
            customerReference: order.customerReference || '',
            internalReference: order.internalReference || '',
            priority: order.priority || 'normal',
            transportType: order.transportType || 'ftl',
            price: order.price?.toString() || '',
            currency: order.currency || 'EUR',
            notes: order.notes || '',
            contactPerson: order.contactPerson || '',
            contactPhone: order.contactPhone || '',
            equipmentRequirements: order.equipmentRequirements || [],
          });
          const p = order.stops?.find((s: any) => s.type === 'pickup') || {};
          const d = order.stops?.find((s: any) => s.type === 'dropoff') || {};
          
          setPickup({
            companyName: p.companyName || '',
            address: p.address || '',
            city: p.city || '',
            country: p.country || '',
            postalCode: p.postalCode || '',
            scheduledDate: p.dateFrom || (p.scheduledDate ? p.scheduledDate.slice(0, 10) : ''),
            scheduledTime: p.timeFrom || p.scheduledTime || '',
            latitude: p.latitude ? parseFloat(p.latitude) : null,
            longitude: p.longitude ? parseFloat(p.longitude) : null,
            contactPerson: p.contactPerson || '',
            phone: p.phone || '',
            dateTo: p.dateTo || '',
            timeUntil: p.timeUntil || '',
            reference: p.reference || '',
            notes: p.notes || '',
          });

          setDropoff({
            companyName: d.companyName || '',
            address: d.address || '',
            city: d.city || '',
            country: d.country || '',
            postalCode: d.postalCode || '',
            scheduledDate: d.dateFrom || (d.scheduledDate ? d.scheduledDate.slice(0, 10) : ''),
            scheduledTime: d.timeFrom || d.scheduledTime || '',
            latitude: d.latitude ? parseFloat(d.latitude) : null,
            longitude: d.longitude ? parseFloat(d.longitude) : null,
            contactPerson: d.contactPerson || '',
            phone: d.phone || '',
            dateTo: d.dateTo || '',
            timeUntil: d.timeUntil || '',
            reference: d.reference || '',
            notes: d.notes || '',
          });

          setCargoItems(order.cargoItems?.length ? order.cargoItems.map((c: any) => ({
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
            stackable: c.stackable || false,
            fragile: c.fragile || false,
            isAdr: c.isAdr || false,
            adrClass: c.adrClass || '',
            adrUnNumber: c.adrUnNumber || '',
            isTemperatureControlled: c.isTemperatureControlled || false,
            requiredTemperature: c.requiredTemperature?.toString() || '',
          })) : [{ ...emptyCargo }]);
        });
      } else {
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
          equipmentRequirements: [],
        });
        setPickup({ ...emptyStop });
        setDropoff({ ...emptyStop });
        setCargoItems([{ ...emptyCargo }]);
      }
      setCurrentStep(0);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

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
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(c => c - 1); };
  const handleAddCargo = () => setCargoItems([...cargoItems, { ...emptyCargo }]);
  const handleRemoveCargo = (i: number) => setCargoItems(cargoItems.filter((_, idx) => idx !== i));
  const handleCargoChange = (i: number, field: string, value: any) => {
    const n = [...cargoItems]; n[i][field] = value; setCargoItems(n);
  };

  const handleSubmit = async () => {
    if (!pickup.latitude || !pickup.longitude || !dropoff.latitude || !dropoff.longitude) {
      toast.error(t('both_addresses_need_gps', 'Both addresses must have valid GPS coordinates (geocoded) to save the order.'));
      return;
    }
    try {
      setLoading(true);
      const { internalReference, customerReference, ...cleanForm } = form;
      const payload = {
        ...cleanForm,
        clientId: form.clientId || null,
        price: form.price ? parseFloat(form.price) : null,
        customerReference: pickup.reference || null,
        contactPerson: pickup.contactPerson || null,
        contactPhone: pickup.phone || null,
        stops: [
          { type: 'pickup', sequence: 1, ...pickup, scheduledDate: pickup.scheduledDate || null },
          { type: 'dropoff', sequence: 2, ...dropoff, scheduledDate: dropoff.scheduledDate || null },
        ],
        cargoItems: cargoItems.map(c => ({
          ...c,
          quantity: c.quantity ? parseInt(c.quantity) : null,
          weightKg: c.weightKg ? parseFloat(c.weightKg) : null,
          volumeCbm: c.volumeCbm ? parseFloat(c.volumeCbm) : null,
          ldm: c.ldm ? parseFloat(c.ldm) : null,
          lengthCm: c.lengthCm ? parseFloat(c.lengthCm) : null,
          widthCm: c.widthCm ? parseFloat(c.widthCm) : null,
          heightCm: c.heightCm ? parseFloat(c.heightCm) : null,
          requiredTemperature: c.requiredTemperature ? parseFloat(c.requiredTemperature) : null,
        })),
      };
      if (orderId) {
        await api.patch(`/orders/${orderId}`, payload);
        toast.success(t('saved', 'Order updated'));
      } else {
        await api.post('/orders', payload);
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

  const clientOptions: SelectOpt[] = [
    { value: '', label: t('select_client_default', 'Select a client...') },
    ...clients.map(c => ({ value: c.id, label: c.name })),
  ];
  const transportOptions: SelectOpt[] = [
    { value: 'ftl', label: t('transport_ftl', 'FTL (Full Truckload)') },
    { value: 'ltl', label: t('transport_ltl', 'LTL (Groupage)') },
    { value: 'express', label: t('transport_express', 'Express') },
  ];
  const priorityOptions: SelectOpt[] = [
    { value: 'low', label: t('priority_low', 'Low') },
    { value: 'normal', label: t('priority_normal', 'Normal') },
    { value: 'high', label: t('priority_high', 'High') },
    { value: 'critical', label: t('priority_critical', '🔴 Critical') },
  ];
  const currencyOptions: SelectOpt[] = [
    { value: 'EUR', label: '€ EUR' },
    { value: 'USD', label: '$ USD' },
    { value: 'RON', label: 'RON' },
  ];
  const unitOptions: SelectOpt[] = [
    { value: 'pallet', label: t('unit_pallets', 'Pallets (EUR)') },
    { value: 'kg', label: t('unit_kg', 'Kilograms') },
    { value: 'ton', label: t('unit_tons', 'Tons') },
    { value: 'box', label: t('unit_boxes', 'Boxes') },
    { value: 'package', label: t('unit_packages', 'Packages') },
    { value: 'container', label: t('unit_container', 'Container') },
    { value: 'machine', label: 'Machine' },
    { value: 'other', label: t('unit_other', 'Other') },
  ];

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
    >
      <div
        className="relative z-50 w-full max-w-6xl bg-card shadow-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ maxHeight: '92vh', animation: 'wizardIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {orderId ? t('editOrder', 'Edit Order') : t('createOrder', 'Create New Order')}
            </h2>
            <p className="text-sm text-text-secondary mt-0.5">
              Step {currentStep + 1} of {STEPS.length} — {STEPS[currentStep].title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicators with pixel-perfect bar */}
        <div className="px-8 py-5 border-b border-border bg-white dark:bg-card shrink-0" ref={headerRef} style={{ position: 'relative' }}>
          {/* Gray full connector */}
          <div
            className="absolute bg-border"
            style={{ top: 20 + 20, left: barLeft, width: barTotalWidth, height: 2, zIndex: 0 }}
          />
          {/* Orange progress */}
          <div
            className="absolute bg-primary transition-all duration-400"
            style={{ top: 20 + 20, left: barLeft, width: barOrangeWidth, height: 2, zIndex: 0 }}
          />

          <div className="flex items-start justify-between">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              return (
                <div
                  key={step.id}
                  ref={el => { stepRefs.current[idx] = el; }}
                  className="flex flex-col items-center flex-1"
                  style={{ position: 'relative', zIndex: 2 }}
                >
                  <div className="bg-white dark:bg-card rounded-full ring-[6px] ring-white dark:ring-card">
                    <button
                      type="button"
                      onClick={() => idx <= currentStep && setCurrentStep(idx)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none
                        ${isActive
                          ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-110'
                          : isPast
                            ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30'
                            : 'bg-surface border-2 border-border text-text-muted cursor-default'
                        }`}
                    >
                      <StepIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <span className={`text-xs mt-2 font-semibold text-center leading-tight ${
                    isActive ? 'text-primary' : 'text-text-secondary'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

          {/* STEP 1: General Info */}
          {currentStep === 0 && (
            <div className="space-y-5" style={{ animation: 'stepIn 0.2s ease-out' }}>
              <div className="bg-surface/40 p-5 rounded-xl border border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Client Information</h3>
                <div>
                  <label className="block text-sm font-medium mb-1.5" htmlFor="wiz-client">Client *</label>
                  <ModalSelect id="wiz-client" value={form.clientId} onChange={v => setForm({ ...form, clientId: v })} options={clientOptions} placeholder="Select a client..." />
                </div>
              </div>

              <div className="bg-surface/40 p-5 rounded-xl border border-border space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Transport Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Transport Type</label>
                    <ModalSelect value={form.transportType} onChange={v => setForm({ ...form, transportType: v })} options={transportOptions} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Priority</label>
                    <ModalSelect value={form.priority} onChange={v => setForm({ ...form, priority: v })} options={priorityOptions} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Agreed Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-medium">€</span>
                      <input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="input w-full pl-8" placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Currency</label>
                    <ModalSelect value={form.currency} onChange={v => setForm({ ...form, currency: v })} options={currencyOptions} />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Equipment Requirements</label>
                  <div className="flex flex-wrap gap-2">
                    {['frigo', 'tilt', 'adr', 'mega'].map(eq => {
                      const selected = form.equipmentRequirements.includes(eq);
                      return (
                        <button
                          key={eq}
                          type="button"
                          onClick={() => {
                            const newReqs = selected
                              ? form.equipmentRequirements.filter(r => r !== eq)
                              : [...form.equipmentRequirements, eq];
                            setForm({ ...form, equipmentRequirements: newReqs });
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                            selected
                              ? 'bg-primary text-white border-primary shadow-sm'
                              : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                          }`}
                        >
                          {eq.toUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-surface/40 p-5 rounded-xl border border-border">
                <label className="block text-sm font-medium mb-1.5">Internal Notes</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input w-full min-h-[80px] resize-none" placeholder="Additional instructions or notes..." />
              </div>
            </div>
          )}

          {/* STEP 2: Pickup & Delivery */}
          {currentStep === 1 && (
            <div className="space-y-4" style={{ animation: 'stepIn 0.2s ease-out' }}>
              <div className="mb-1">
                <h3 className="text-lg font-semibold text-text-primary">Pickup & Delivery</h3>
                <p className="text-sm text-text-secondary">Where is the cargo going from and to? Coordinates must be validated.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5 relative">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-4 border-card flex items-center justify-center font-bold text-xs text-blue-600">A</div>
                  <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Pickup Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Company / Location Name</label>
                      <input type="text" value={pickup.companyName} onChange={e => setPickup({ ...pickup, companyName: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="e.g. Supplier Warehouse" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Address *</label>
                      <AddressAutocomplete
                        value={pickup.address}
                        onChange={val => setPickup({ ...pickup, address: val })}
                        onSelectFull={(label, city, country, lat, lng) => {
                          setPickup(p => ({
                            ...p,
                            address: label,
                            city: city || p.city,
                            country: country || p.country,
                            latitude: lat || null,
                            longitude: lng || null
                          }));
                        }}
                        placeholder="Street, Number, Zip Code"
                        className="input w-full bg-white dark:bg-card"
                        required
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-text-secondary">Geocoding:</span>
                        {pickup.latitude && pickup.longitude ? (
                          <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                            ● Geocoded ({pickup.latitude.toFixed(4)}, {pickup.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-500">
                            ● Coordinates Missing (Address not verified)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Contact Person</label>
                        <input type="text" value={pickup.contactPerson} onChange={e => setPickup({ ...pickup, contactPerson: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Phone Number</label>
                        <input type="text" value={pickup.phone} onChange={e => setPickup({ ...pickup, phone: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="Phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDatePicker
                        label="Pickup Time Window (Min)"
                        dateValue={pickup.scheduledDate}
                        timeValue={pickup.scheduledTime || ''}
                        onDateChange={v => setPickup({ ...pickup, scheduledDate: v })}
                        onTimeChange={v => setPickup({ ...pickup, scheduledTime: v })}
                      />
                      <CustomDatePicker
                        label="Pickup Time Window (Max)"
                        dateValue={pickup.dateTo}
                        timeValue={pickup.timeUntil || ''}
                        onDateChange={v => setPickup({ ...pickup, dateTo: v })}
                        onTimeChange={v => setPickup({ ...pickup, timeUntil: v })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Reference (PO #) / Instructions</label>
                      <input type="text" value={pickup.reference} onChange={e => setPickup({ ...pickup, reference: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="e.g. PO-99812 / Loading Instructions" />
                    </div>
                  </div>
                </div>

                {/* Delivery */}
                <div className="bg-green-50/50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5 relative">
                  <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 border-4 border-card flex items-center justify-center font-bold text-xs text-green-600">B</div>
                  <h4 className="text-green-600 dark:text-green-400 font-bold mb-4 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Delivery Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Company / Location Name</label>
                      <input type="text" value={dropoff.companyName} onChange={e => setDropoff({ ...dropoff, companyName: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="e.g. Client Destination" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Full Address *</label>
                      <AddressAutocomplete
                        value={dropoff.address}
                        onChange={val => setDropoff({ ...dropoff, address: val })}
                        onSelectFull={(label, city, country, lat, lng) => {
                          setDropoff(d => ({
                            ...d,
                            address: label,
                            city: city || d.city,
                            country: country || d.country,
                            latitude: lat || null,
                            longitude: lng || null
                          }));
                        }}
                        placeholder="Street, Number, Zip Code"
                        className="input w-full bg-white dark:bg-card"
                        required
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-semibold text-text-secondary">Geocoding:</span>
                        {dropoff.latitude && dropoff.longitude ? (
                          <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                            ● Geocoded ({dropoff.latitude.toFixed(4)}, {dropoff.longitude.toFixed(4)})
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-red-500">
                            ● Coordinates Missing (Address not verified)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Contact Person</label>
                        <input type="text" value={dropoff.contactPerson} onChange={e => setDropoff({ ...dropoff, contactPerson: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="Name" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Phone Number</label>
                        <input type="text" value={dropoff.phone} onChange={e => setDropoff({ ...dropoff, phone: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="Phone" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <CustomDatePicker
                        label="Delivery Time Window (Min)"
                        dateValue={dropoff.scheduledDate}
                        timeValue={dropoff.scheduledTime || ''}
                        onDateChange={v => setDropoff({ ...dropoff, scheduledDate: v })}
                        onTimeChange={v => setDropoff({ ...dropoff, scheduledTime: v })}
                      />
                      <CustomDatePicker
                        label="Delivery Time Window (Max)"
                        dateValue={dropoff.dateTo}
                        timeValue={dropoff.timeUntil || ''}
                        onDateChange={v => setDropoff({ ...dropoff, dateTo: v })}
                        onTimeChange={v => setDropoff({ ...dropoff, timeUntil: v })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-secondary mb-1.5">Reference / Unloading Instructions</label>
                      <input type="text" value={dropoff.reference} onChange={e => setDropoff({ ...dropoff, reference: e.target.value })} className="input w-full bg-white dark:bg-card" placeholder="e.g. Gate 3 / Unloading Instructions" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Cargo Items */}
          {currentStep === 2 && (
            <div className="space-y-4" style={{ animation: 'stepIn 0.2s ease-out' }}>
              <div className="mb-2">
                <h3 className="text-lg font-semibold text-text-primary">Cargo Items</h3>
                <p className="text-sm text-text-secondary">What are we transporting? You can split the order into multiple items.</p>
              </div>
              <div className="space-y-3">
                {cargoItems.map((cargo, index) => (
                  <div key={index} className="bg-surface/50 border border-border rounded-xl p-4 relative group">
                    {cargoItems.length > 1 && (
                      <button type="button" onClick={() => handleRemoveCargo(index)} className="absolute top-3 right-3 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Cargo Description</label>
                        <input type="text" value={cargo.description} onChange={e => handleCargoChange(index, 'description', e.target.value)} className="input w-full" placeholder="e.g. Pallets of electronics" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Quantity (Optional)</label>
                        <input type="number" value={cargo.quantity || ''} onChange={e => handleCargoChange(index, 'quantity', e.target.value)} className="input w-full" min="1" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Unit Type (Optional)</label>
                        <ModalSelect value={cargo.unit || 'pallet'} onChange={v => handleCargoChange(index, 'unit', v)} options={unitOptions} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Weight (kg) (Optional)</label>
                        <input type="number" step="0.1" value={cargo.weightKg || ''} onChange={e => handleCargoChange(index, 'weightKg', e.target.value)} className="input w-full" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Volume (m³) (Optional)</label>
                        <input type="number" step="0.01" value={cargo.volumeCbm || ''} onChange={e => handleCargoChange(index, 'volumeCbm', e.target.value)} className="input w-full" placeholder="Optional" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">LDM (Optional)</label>
                        <input type="number" step="0.01" value={cargo.ldm || ''} onChange={e => handleCargoChange(index, 'ldm', e.target.value)} className="input w-full" placeholder="Optional" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/40">
                      <div>
                        <label className="block text-xs font-semibold text-text-secondary mb-1.5">Cargo Dimensions (L / W / H cm)</label>
                        <div className="grid grid-cols-3 gap-1">
                          <input type="number" value={cargo.lengthCm || ''} onChange={e => handleCargoChange(index, 'lengthCm', e.target.value)} className="input p-1 text-center" placeholder="L" />
                          <input type="number" value={cargo.widthCm || ''} onChange={e => handleCargoChange(index, 'widthCm', e.target.value)} className="input p-1 text-center" placeholder="W" />
                          <input type="number" value={cargo.heightCm || ''} onChange={e => handleCargoChange(index, 'heightCm', e.target.value)} className="input p-1 text-center" placeholder="H" />
                        </div>
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.stackable} onChange={e => handleCargoChange(index, 'stackable', e.target.checked)} className="checkbox" />
                          <span>Stackable</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary mt-1">
                          <input type="checkbox" checked={cargo.fragile} onChange={e => handleCargoChange(index, 'fragile', e.target.checked)} className="checkbox" />
                          <span>Fragile</span>
                        </label>
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.isAdr} onChange={e => handleCargoChange(index, 'isAdr', e.target.checked)} className="checkbox" />
                          <span>Requires ADR</span>
                        </label>
                        {cargo.isAdr && (
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <input type="text" value={cargo.adrClass || ''} onChange={e => handleCargoChange(index, 'adrClass', e.target.value)} className="input p-1 text-xs" placeholder="Class" />
                            <input type="text" value={cargo.adrUnNumber || ''} onChange={e => handleCargoChange(index, 'adrUnNumber', e.target.value)} className="input p-1 text-xs" placeholder="UN #" />
                          </div>
                        )}
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-text-secondary">
                          <input type="checkbox" checked={cargo.isTemperatureControlled} onChange={e => handleCargoChange(index, 'isTemperatureControlled', e.target.checked)} className="checkbox" />
                          <span>Temp Controlled</span>
                        </label>
                        {cargo.isTemperatureControlled && (
                          <input type="number" step="0.5" value={cargo.requiredTemperature || ''} onChange={e => handleCargoChange(index, 'requiredTemperature', e.target.value)} className="input p-1 text-xs mt-1 w-full" placeholder="Temp °C" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" onClick={handleAddCargo} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 font-medium">
                <Plus className="w-4 h-4" /> Add Cargo Item
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border bg-surface/50 flex justify-between items-center shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button type="button" onClick={handlePrev} className="btn-secondary flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <button type="button" onClick={handleNext} className="btn-primary flex items-center gap-2 shadow-sm hover:shadow-md">
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-150 active:scale-95">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Confirm & Save Order
              </button>
            )}
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
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
