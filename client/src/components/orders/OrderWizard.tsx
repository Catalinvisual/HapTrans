import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2, ArrowRight, ArrowLeft, Plus, Trash2, Box, MapPin, FileText } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

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

export default function OrderWizard({ isOpen, onClose, onSaved, orderId }: OrderWizardProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    clientId: '',
    customerReference: '',
    internalReference: '',
    priority: 'normal',
    transportType: 'ftl',
    price: '',
    currency: 'EUR',
    notes: '',
  });

  const [pickup, setPickup] = useState({ companyName: '', address: '', city: '', country: '', scheduledDate: '' });
  const [dropoff, setDropoff] = useState({ companyName: '', address: '', city: '', country: '', scheduledDate: '' });
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
          });
          const p = order.stops?.find((s:any) => s.type === 'pickup') || { companyName: '', address: '', city: '', country: '', scheduledDate: '' };
          const d = order.stops?.find((s:any) => s.type === 'dropoff') || { companyName: '', address: '', city: '', country: '', scheduledDate: '' };
          setPickup(p);
          setDropoff(d);
          
          setCargoItems(order.cargoItems?.length ? order.cargoItems : [
             { description: '', quantity: 1, weightKg: '', unit: 'pallet' }
          ]);
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
        });
        setPickup({ companyName: '', address: '', city: '', country: '', scheduledDate: '' });
        setDropoff({ companyName: '', address: '', city: '', country: '', scheduledDate: '' });
        setCargoItems([
          { description: '', quantity: 1, weightKg: '', unit: 'pallet' }
        ]);
      }
      setCurrentStep(0);
    }
  }, [isOpen, orderId]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
  };
  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleAddCargo = () => {
    setCargoItems([...cargoItems, { description: '', quantity: 1, weightKg: '', unit: 'pallet' }]);
  };
  const handleRemoveCargo = (index: number) => {
    setCargoItems(cargoItems.filter((_, i) => i !== index));
  };
  const handleCargoChange = (index: number, field: string, value: string) => {
    const newCargo = [...cargoItems];
    newCargo[index][field] = value;
    setCargoItems(newCargo);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        ...form,
        clientId: form.clientId || null,
        price: form.price ? parseFloat(form.price) : null,
        stops: [
          { type: 'pickup', sequence: 1, ...pickup },
          { type: 'dropoff', sequence: 2, ...dropoff }
        ],
        cargoItems: cargoItems.map(c => ({
          ...c,
          quantity: c.quantity ? parseInt(c.quantity) : null,
          weightKg: c.weightKg ? parseFloat(c.weightKg) : null,
        }))
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
      console.error(err);
      toast.error(err.response?.data?.message || t('error', 'Error'));
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative z-50 w-full md:w-[600px] lg:w-[800px] bg-card shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
        <div className="px-6 py-5 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-bold text-text-primary">
              {orderId ? t('editOrder', 'Edit Order') : t('createOrder', 'Create New Order')}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              Step {currentStep + 1} of {STEPS.length} - {STEPS[currentStep].title}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border bg-surface/30 shrink-0">
          <div className="flex justify-between relative">
            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center flex-1 relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isActive ? 'bg-primary text-white shadow-lg ring-4 ring-primary/20' : 
                    isPast ? 'bg-primary/20 text-primary' : 'bg-surface border border-border text-text-muted'
                  } transition-all duration-300`}>
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span className={`text-xs mt-2 font-medium ${isActive ? 'text-primary' : 'text-text-secondary'}`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
            <div className="absolute top-5 left-10 right-10 h-[2px] bg-border z-0" />
            <div 
              className="absolute top-5 left-10 h-[2px] bg-primary z-0 transition-all duration-300"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {currentStep === 0 && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="bg-surface/30 p-4 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Client Information</h3>
                <div>
                  <label className="block text-sm font-medium mb-1">Client *</label>
                  <select
                    value={form.clientId}
                    onChange={e => setForm({ ...form, clientId: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select a client...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Reference</label>
                    <input
                      type="text"
                      value={form.customerReference}
                      onChange={e => setForm({ ...form, customerReference: e.target.value })}
                      className="input w-full"
                      placeholder="e.g. PO-99812"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Internal Reference</label>
                    <input
                      type="text"
                      value={form.internalReference}
                      onChange={e => setForm({ ...form, internalReference: e.target.value })}
                      className="input w-full"
                      placeholder="e.g. Hap-01"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-surface/30 p-4 rounded-xl border border-border space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Transport Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Transport Type</label>
                    <select
                      value={form.transportType}
                      onChange={e => setForm({ ...form, transportType: e.target.value })}
                      className="input w-full"
                    >
                      <option value="ftl">FTL (Full Truckload)</option>
                      <option value="ltl">LTL (Groupage)</option>
                      <option value="express">Express</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm({ ...form, priority: e.target.value })}
                      className="input w-full"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Agreed Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">€</span>
                      <input
                        type="number"
                        step="0.01"
                        value={form.price}
                        onChange={e => setForm({ ...form, price: e.target.value })}
                        className="input w-full pl-8"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Currency</label>
                    <select
                      value={form.currency}
                      onChange={e => setForm({ ...form, currency: e.target.value })}
                      className="input w-full"
                    >
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="RON">RON</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-surface/30 p-4 rounded-xl border border-border">
                <label className="block text-sm font-medium mb-1">Internal Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input w-full min-h-[80px]"
                  placeholder="Additional instructions..."
                />
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="mb-2">
                <h3 className="text-lg font-semibold">Pickup & Delivery</h3>
                <p className="text-sm text-text-secondary">Where is the cargo going from and to?</p>
              </div>
              
              {/* Pickup Details */}
              <div className="bg-blue-50/30 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-5 relative">
                <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 border-4 border-card flex items-center justify-center font-bold text-xs text-blue-600">A</div>
                <h4 className="text-blue-600 dark:text-blue-400 font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Pickup Details
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Company / Location Name</label>
                    <input 
                      type="text" 
                      value={pickup.companyName}
                      onChange={(e) => setPickup({...pickup, companyName: e.target.value})}
                      className="input w-full text-sm bg-white dark:bg-card"
                      placeholder="e.g. Supplier Warehouse"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Full Address *</label>
                    <input 
                      type="text" 
                      value={pickup.address}
                      onChange={(e) => setPickup({...pickup, address: e.target.value})}
                      className="input w-full text-sm bg-white dark:bg-card"
                      placeholder="Street, Number, Zip"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">City</label>
                      <input 
                        type="text" 
                        value={pickup.city}
                        onChange={(e) => setPickup({...pickup, city: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Country</label>
                      <input 
                        type="text" 
                        value={pickup.country}
                        onChange={(e) => setPickup({...pickup, country: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-medium text-text-secondary mb-1">Pickup Date</label>
                      <input 
                        type="date" 
                        value={pickup.scheduledDate?.slice(0,10) || ''}
                        onChange={(e) => setPickup({...pickup, scheduledDate: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow down visually connecting them */}
              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-surface border border-border rounded-full p-1 text-text-muted">
                  <ArrowRight className="w-5 h-5 rotate-90" />
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-green-50/30 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-5 relative">
                <div className="absolute -left-3 top-6 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 border-4 border-card flex items-center justify-center font-bold text-xs text-green-600">B</div>
                <h4 className="text-green-600 dark:text-green-400 font-bold mb-4 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Delivery Details
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Company / Location Name</label>
                    <input 
                      type="text" 
                      value={dropoff.companyName}
                      onChange={(e) => setDropoff({...dropoff, companyName: e.target.value})}
                      className="input w-full text-sm bg-white dark:bg-card"
                      placeholder="e.g. Client Destination"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Full Address *</label>
                    <input 
                      type="text" 
                      value={dropoff.address}
                      onChange={(e) => setDropoff({...dropoff, address: e.target.value})}
                      className="input w-full text-sm bg-white dark:bg-card"
                      placeholder="Street, Number, Zip"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">City</label>
                      <input 
                        type="text" 
                        value={dropoff.city}
                        onChange={(e) => setDropoff({...dropoff, city: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Country</label>
                      <input 
                        type="text" 
                        value={dropoff.country}
                        onChange={(e) => setDropoff({...dropoff, country: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-medium text-text-secondary mb-1">Delivery Date</label>
                      <input 
                        type="date" 
                        value={dropoff.scheduledDate?.slice(0,10) || ''}
                        onChange={(e) => setDropoff({...dropoff, scheduledDate: e.target.value})}
                        className="input w-full text-sm bg-white dark:bg-card"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Cargo Items</h3>
                <p className="text-sm text-text-secondary">What are we transporting? You can split the order into multiple items.</p>
              </div>

              <div className="space-y-4">
                {cargoItems.map((cargo, index) => (
                  <div key={index} className="bg-surface/50 border border-border rounded-xl p-4 relative group">
                    {cargoItems.length > 1 && (
                      <button 
                        onClick={() => handleRemoveCargo(index)}
                        className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="mb-4 pr-8">
                      <label className="block text-xs font-medium text-text-secondary mb-1">Cargo Description *</label>
                      <input 
                        type="text" 
                        value={cargo.description}
                        onChange={(e) => handleCargoChange(index, 'description', e.target.value)}
                        className="input w-full text-sm"
                        placeholder="e.g. Pallets of electronics"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Quantity</label>
                        <input 
                          type="number" 
                          value={cargo.quantity}
                          onChange={(e) => handleCargoChange(index, 'quantity', e.target.value)}
                          className="input w-full text-sm"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Unit Type</label>
                        <select 
                          value={cargo.unit}
                          onChange={(e) => handleCargoChange(index, 'unit', e.target.value)}
                          className="input w-full text-sm"
                        >
                          <option value="pallet">Pallets (EUR)</option>
                          <option value="box">Boxes</option>
                          <option value="package">Packages</option>
                          <option value="container">Container</option>
                          <option value="machine">Machine</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Weight (kg)</label>
                        <input 
                          type="number" 
                          value={cargo.weightKg}
                          onChange={(e) => handleCargoChange(index, 'weightKg', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="Total weight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Volume (m³)</label>
                        <input 
                          type="number" 
                          value={cargo.volumeCbm || ''}
                          onChange={(e) => handleCargoChange(index, 'volumeCbm', e.target.value)}
                          className="input w-full text-sm"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleAddCargo}
                className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 mt-4 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Cargo Item
              </button>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-border bg-surface/50 flex justify-between items-center shrink-0">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button 
                type="button" 
                onClick={handlePrev}
                className="btn-secondary flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            
            {currentStep < STEPS.length - 1 ? (
              <button 
                type="button" 
                onClick={handleNext}
                className="btn-primary flex items-center gap-2 shadow-sm hover:shadow-md"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white border-green-700 shadow-md hover:shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Confirm & Save Order
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Use React Portal to render the modal at the root level so it covers everything including the sidebar
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}
