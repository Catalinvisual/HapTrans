import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, X } from 'lucide-react';
import portalApi from '../lib/portalApi';
import { notify } from './AppToaster';

interface RapidTransportModalProps {
  open: boolean;
  onClose: () => void;
}

export default function RapidTransportModal({ open, onClose }: RapidTransportModalProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    date: '',
    pickupAddress: '',
    deliveryAddress: '',
    contactName: '',
    phone: '',
    email: '',
    cargo: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pickupAddress || !form.deliveryAddress || !form.contactName || !form.email) {
      notify.error(t('jsx_requiredFields'));
      return;
    }
    setSubmitting(true);
    try {
      const message = [
        'Cerere transport rapida:',
        '- Data preferata: ' + (form.date || '-'),
        '- Adresa ridicare: ' + form.pickupAddress,
        '- Adresa livrare: ' + form.deliveryAddress,
        '- Marfa: ' + (form.cargo || '-'),
        '- Telefon: ' + (form.phone || '-'),
        'Observatii: ' + (form.notes || '-'),
      ].join('\n');

      await portalApi.post('/contact', {
        name: form.contactName,
        email: form.email,
        phone: form.phone,
        subject: 'Cerere Transport Rapida',
        message,
      });

      notify.success(t('jsx_requestSent'));
      setForm({ date: '', pickupAddress: '', deliveryAddress: '', contactName: '', phone: '', email: '', cargo: '', notes: '' });
      onClose();
    } catch (err) {
      notify.error(err?.response?.data?.message || t('jsx_requestError'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto max-h-[90vh]">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t('jsx_newTransportR')}
          </h2>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('jsx_preferredDate')}
              </label>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="input w-full" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('pickupAddress')}
              </label>
              <textarea
                name="pickupAddress"
                value={form.pickupAddress}
                onChange={handleChange}
                rows={2}
                className="input w-full"
                placeholder="Str. Fabrica nr. 1, Bucuresti"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('dropoffAddress')}
              </label>
              <textarea
                name="deliveryAddress"
                value={form.deliveryAddress}
                onChange={handleChange}
                rows={2}
                className="input w-full"
                placeholder="Str. Unirii nr. 10, Cluj-Napoca"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('contactName')}
              </label>
              <input type="text" name="contactName" value={form.contactName} onChange={handleChange} className="input w-full" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('phone')}
              </label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="input w-full" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('email')}
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className="input w-full" required />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('cargo')}
              </label>
              <input type="text" name="cargo" value={form.cargo} onChange={handleChange} className="input w-full" placeholder="Tip marfa / greutate" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('notes')}
              </label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="input w-full" placeholder="Observatii suplimentare" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2.5 font-bold">
              {t('jsx_close')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 py-2.5 font-bold flex items-center justify-center gap-2"
            >
              {submitting && <span className="animate-spin">⭮</span>}
              {t('jsx_sendRequest')}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}