import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  order?: any;
}
export default function OrderFormModal({
  isOpen,
  onClose,
  onSaved,
  order
}: OrderFormModalProps) {
  const {
    t
  } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'stops' | 'cargo'>('general');
  const [form, setForm] = useState({
    clientId: '',
    customerReference: '',
    internalReference: '',
    priority: 'normal',
    transportType: 'ftl',
    price: '',
    currency: 'EUR',
    notes: ''
  });
  const [stops, setStops] = useState<any[]>([]);
  const [cargoItems, setCargoItems] = useState<any[]>([]);
  useEffect(() => {
    if (isOpen) {
      api.get('/clients').then(res => setClients(res.data)).catch(console.error);
      if (order) {
        setForm({
          clientId: order.client?.id || '',
          customerReference: order.customerReference || '',
          internalReference: order.internalReference || '',
          priority: order.priority || 'normal',
          transportType: order.transportType || 'ftl',
          price: order.price?.toString() || '',
          currency: order.currency || 'EUR',
          notes: order.notes || ''
        });
        setStops(order.stops || []);
        setCargoItems(order.cargoItems || []);
      } else {
        setForm({
          clientId: '',
          customerReference: '',
          internalReference: '',
          priority: 'normal',
          transportType: 'ftl',
          price: '',
          currency: 'EUR',
          notes: ''
        });
        setStops([{
          type: 'pickup',
          address: '',
          companyName: '',
          city: '',
          country: ''
        }, {
          type: 'dropoff',
          address: '',
          companyName: '',
          city: '',
          country: ''
        }]);
        setCargoItems([{
          description: '',
          quantity: 1,
          weightKg: '',
          unit: 'pallet'
        }]);
      }
      setActiveTab('general');
    }
  }, [isOpen, order]);
  if (!isOpen) return null;
  const handleAddStop = () => {
    setStops([...stops, {
      type: 'dropoff',
      address: '',
      companyName: '',
      city: '',
      country: ''
    }]);
  };
  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };
  const handleStopChange = (index: number, field: string, value: string) => {
    const newStops = [...stops];
    newStops[index][field] = value;
    setStops(newStops);
  };
  const handleAddCargo = () => {
    setCargoItems([...cargoItems, {
      description: '',
      quantity: 1,
      weightKg: '',
      unit: 'pallet'
    }]);
  };
  const handleRemoveCargo = (index: number) => {
    setCargoItems(cargoItems.filter((_, i) => i !== index));
  };
  const handleCargoChange = (index: number, field: string, value: string) => {
    const newCargo = [...cargoItems];
    newCargo[index][field] = value;
    setCargoItems(newCargo);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        clientId: form.clientId || null,
        price: form.price ? parseFloat(form.price) : null,
        stops: stops,
        cargoItems: cargoItems.map(c => ({
          ...c,
          quantity: c.quantity ? parseInt(c.quantity) : null,
          weightKg: c.weightKg ? parseFloat(c.weightKg) : null
        }))
      };
      if (order?.id) {
        await api.patch(`/orders/${order.id}`, payload);
        toast.success(t('saved') || 'Salvată');
      } else {
        await api.post('/orders', payload);
        toast.success(t('saved') || 'Salvată');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || t('error') || 'Eroare');
    } finally {
      setLoading(false);
    }
  };
  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-card w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center bg-surface/50">
          <h2 className="text-xl font-semibold">
            {order ? t('edit') || 'Editare' : t('addOrder', 'Add Order')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="flex border-b border-border">
          <button className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === 'general' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:bg-surface/50'}`} onClick={() => setActiveTab('general')}>
            {t('general', 'General')}
          </button>
          <button className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === 'stops' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:bg-surface/50'}`} onClick={() => setActiveTab('stops')}>
            {t('stops', 'Stops')} ({stops.length})
          </button>
          <button className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === 'cargo' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary hover:bg-surface/50'}`} onClick={() => setActiveTab('cargo')}>
            {t('cargo', 'Cargo')} ({cargoItems.length})
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="p-6 flex-1">
            {activeTab === 'general' && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('client', 'Client')} *</label>
                  <select value={form.clientId} onChange={e => setForm({
                ...form,
                clientId: e.target.value
              })} className="input w-full" required>
                    <option value="">{t('selectClient', 'Select Client')}</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('customerReference', 'Customer Reference')}</label>
                    <input type="text" value={form.customerReference} onChange={e => setForm({
                  ...form,
                  customerReference: e.target.value
                })} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('internalReference', 'Internal Reference')}</label>
                    <input type="text" value={form.internalReference} onChange={e => setForm({
                  ...form,
                  internalReference: e.target.value
                })} className="input w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('transportType', 'Transport Type')}</label>
                    <select value={form.transportType} onChange={e => setForm({
                  ...form,
                  transportType: e.target.value
                })} className="input w-full">
                      <option value="ftl">{t("jsx_fTLFullTruck")}</option>
                      <option value="groupage">{t("jsx_lTLGroupage")}</option>
                      <option value="express">{t("jsx_express")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('priority', 'Priority')}</label>
                    <select value={form.priority} onChange={e => setForm({
                  ...form,
                  priority: e.target.value
                })} className="input w-full">
                      <option value="normal">{t("jsx_normal")}</option>
                      <option value="high">{t("jsx_high")}</option>
                      <option value="critical">{t("jsx_critical")}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('price', 'Agreed Price')}</label>
                    <input type="number" step="0.01" value={form.price} onChange={e => setForm({
                  ...form,
                  price: e.target.value
                })} className="input w-full" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('currency', 'Currency')}</label>
                    <select value={form.currency} onChange={e => setForm({
                  ...form,
                  currency: e.target.value
                })} className="input w-full">
                      <option value="EUR">{t("jsx_eUR")}</option>
                      <option value="USD">{t("jsx_uSD")}</option>
                      <option value="RON">{t("jsx_rON")}</option>
                    </select>
                  </div>
                </div>
              </div>}

            {activeTab === 'stops' && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {stops.map((stop, index) => <div key={index} className="p-4 border border-border rounded-xl bg-surface/30 relative group">
                    <button type="button" onClick={() => handleRemoveStop(index)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_type")}</label>
                        <select value={stop.type} onChange={e => handleStopChange(index, 'type', e.target.value)} className="input w-full text-sm py-1.5">
                          <option value="pickup">{t("jsx_pickup")}</option>
                          <option value="dropoff">{t("jsx_dropoff")}</option>
                          <option value="warehouse">{t("jsx_warehouse")}</option>
                          <option value="customs">{t("jsx_customs")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_companyName")}</label>
                        <input type="text" value={stop.companyName} onChange={e => handleStopChange(index, 'companyName', e.target.value)} className="input w-full text-sm py-1.5" placeholder="e.g. Acme Corp" />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-xs text-text-secondary mb-1">{t("jsx_address")}</label>
                      <input type="text" value={stop.address} onChange={e => handleStopChange(index, 'address', e.target.value)} className="input w-full text-sm py-1.5" placeholder="Full Address" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_city")}</label>
                        <input type="text" value={stop.city || ''} onChange={e => handleStopChange(index, 'city', e.target.value)} className="input w-full text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_country")}</label>
                        <input type="text" value={stop.country || ''} onChange={e => handleStopChange(index, 'country', e.target.value)} className="input w-full text-sm py-1.5" />
                      </div>
                    </div>
                  </div>)}
                <button type="button" onClick={handleAddStop} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />{t("jsx_addStop")}</button>
              </div>}

            {activeTab === 'cargo' && <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                {cargoItems.map((cargo, index) => <div key={index} className="p-4 border border-border rounded-xl bg-surface/30 relative group">
                    <button type="button" onClick={() => handleRemoveCargo(index)} className="absolute top-2 right-2 p-2 text-red-500 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="mb-3">
                      <label className="block text-xs text-text-secondary mb-1">{t("jsx_description")}</label>
                      <input type="text" value={cargo.description} onChange={e => handleCargoChange(index, 'description', e.target.value)} className="input w-full text-sm py-1.5" placeholder="e.g. Electronic parts" required />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_quantity")}</label>
                        <input type="number" value={cargo.quantity} onChange={e => handleCargoChange(index, 'quantity', e.target.value)} className="input w-full text-sm py-1.5" />
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_unit")}</label>
                        <select value={cargo.unit} onChange={e => handleCargoChange(index, 'unit', e.target.value)} className="input w-full text-sm py-1.5">
                          <option value="pallet">{t("jsx_pallets")}</option>
                          <option value="box">{t("jsx_boxes")}</option>
                          <option value="package">{t("jsx_packages")}</option>
                          <option value="machine">{t("jsx_machine")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">{t("jsx_weightKg")}</label>
                        <input type="number" value={cargo.weightKg} onChange={e => handleCargoChange(index, 'weightKg', e.target.value)} className="input w-full text-sm py-1.5" />
                      </div>
                    </div>
                  </div>)}
                <button type="button" onClick={handleAddCargo} className="w-full py-3 border-2 border-dashed border-border rounded-xl text-text-secondary hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" />{t("jsx_addCargoItem")}</button>
              </div>}
          </div>

          <div className="p-6 border-t border-border bg-surface/50 flex justify-end gap-3 mt-auto">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save', 'Save Order')}
            </button>
          </div>
        </form>
      </div>
    </div>, document.body);
}