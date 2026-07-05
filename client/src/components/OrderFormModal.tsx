import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface OrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  order?: any;
}

export default function OrderFormModal({ isOpen, onClose, onSaved, order }: OrderFormModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [form, setForm] = useState({
    referenceNumber: '',
    clientId: '',
    pickupAddress: '',
    dropoffAddress: '',
    weightKg: '',
    pallets: ''
  });

  useEffect(() => {
    if (isOpen) {
      api.get('/clients').then(res => setClients(res.data)).catch(console.error);
      if (order) {
        setForm({
          referenceNumber: order.referenceNumber || '',
          clientId: order.client?.id || '',
          pickupAddress: order.pickupAddress || '',
          dropoffAddress: order.dropoffAddress || '',
          weightKg: order.weightKg?.toString() || '',
          pallets: order.pallets?.toString() || ''
        });
      } else {
        setForm({
          referenceNumber: '',
          clientId: '',
          pickupAddress: '',
          dropoffAddress: '',
          weightKg: '',
          pallets: ''
        });
      }
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        clientId: form.clientId || null,
        weightKg: form.weightKg ? parseFloat(form.weightKg) : null,
        pallets: form.pallets ? parseInt(form.pallets) : null,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            {order ? t('edit') || 'Editare' : t('addOrder', 'Add Order')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('client', 'Client')} *</label>
            <select
              value={form.clientId}
              onChange={e => setForm({ ...form, clientId: e.target.value })}
              className="input w-full"
              required
            >
              <option value="">{t('selectClient', 'Select Client')}</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('reference', 'Reference')} *</label>
            <input
              type="text"
              value={form.referenceNumber}
              onChange={e => setForm({ ...form, referenceNumber: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium mb-1">{t('pickupAddress', 'Pickup Address')} *</label>
              <input
                type="text"
                value={form.pickupAddress}
                onChange={e => setForm({ ...form, pickupAddress: e.target.value })}
                className="input w-full"
                required
              />
            </div>
             <div>
              <label className="block text-sm font-medium mb-1">{t('dropoffAddress', 'Dropoff Address')} *</label>
              <input
                type="text"
                value={form.dropoffAddress}
                onChange={e => setForm({ ...form, dropoffAddress: e.target.value })}
                className="input w-full"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{t('weight', 'Weight')} (kg)</label>
              <input
                type="number"
                step="0.01"
                value={form.weightKg}
                onChange={e => setForm({ ...form, weightKg: e.target.value })}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('pallets', 'Pallets')}</label>
              <input
                type="number"
                value={form.pallets}
                onChange={e => setForm({ ...form, pallets: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn-secondary">
              {t('cancel', 'Cancel')}
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('save', 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
