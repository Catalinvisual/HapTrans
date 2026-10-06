import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, X, Calendar } from 'lucide-react';
import portalApi from '../lib/portalApi';
import { notify } from './AppToaster';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import AddressAutocomplete from './AddressAutocomplete';

interface RapidTransportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RapidTransportModal({ open, onClose, onSuccess }: RapidTransportModalProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    loadingDate: '',
    loadingTime: '',
    unloadingDate: '',
    unloadingTime: '',
    loadingLocation: '',
    unloadingLocation: '',
    cargoType: '',
    cargoWeightKg: '',
    numberOfPallets: '',
    cargoVolumeM3: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.loadingLocation || !form.unloadingLocation) {
      notify.error(t('jsx_requiredFields'));
      return;
    }
    setSubmitting(true);
    try {
      await portalApi.post('/portal/quotes', form);

      notify.success(t('jsx_requestSent', 'Request sent successfully!'));
      setForm({
        loadingDate: '',
        loadingTime: '',
        unloadingDate: '',
        unloadingTime: '',
        loadingLocation: '',
        unloadingLocation: '',
        cargoType: '',
        cargoWeightKg: '',
        numberOfPallets: '',
        cargoVolumeM3: '',
        notes: '',
      });
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      notify.error(err?.response?.data?.message || t('jsx_requestError', 'Failed to send request.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-y-auto max-h-[90vh]">
        <div className="px-4 py-3 border-b border-border flex justify-between items-center bg-surface/50 sticky top-0 z-20">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {t('jsx_newTransportR')}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-text-secondary hover:text-text rounded-lg hover:bg-surface transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('pickupAddress')} *
              </label>
              <AddressAutocomplete
                value={form.loadingLocation}
                onChange={(val) => setForm(prev => ({ ...prev, loadingLocation: val }))}
                placeholder={t('pickupAddress')}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('dropoffAddress')} *
              </label>
              <AddressAutocomplete
                value={form.unloadingLocation}
                onChange={(val) => setForm(prev => ({ ...prev, unloadingLocation: val }))}
                placeholder={t('dropoffAddress')}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  {t('loadingDate', 'Loading Date')}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <Flatpickr 
                    value={form.loadingDate} 
                    onChange={(_, dateStr) => setForm(prev => ({ ...prev, loadingDate: dateStr }))} 
                    className="input pl-9 bg-card w-full cursor-pointer hover:border-primary/50 transition-colors" 
                    options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d' }} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  {t('loadingTime', 'Time')}
                </label>
                <input type="time" name="loadingTime" value={form.loadingTime} onChange={handleChange} className="input w-full" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  {t('unloadingDate', 'Unloading Date')}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                  <Flatpickr 
                    value={form.unloadingDate} 
                    onChange={(_, dateStr) => setForm(prev => ({ ...prev, unloadingDate: dateStr }))} 
                    className="input pl-9 bg-card w-full cursor-pointer hover:border-primary/50 transition-colors" 
                    options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d' }} 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                  {t('unloadingTime', 'Time')}
                </label>
                <input type="time" name="unloadingTime" value={form.unloadingTime} onChange={handleChange} className="input w-full" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('cargo', 'Cargo Description')}
              </label>
              <input type="text" name="cargoType" value={form.cargoType} onChange={handleChange} className="input w-full" placeholder="e.g. Electronics, Pallets" />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('jsx_weight', 'Weight')} (kg)
              </label>
              <input type="number" name="cargoWeightKg" value={form.cargoWeightKg} onChange={handleChange} className="input w-full" placeholder="e.g. 1000" />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('pallets', 'Pallets')}
              </label>
              <input type="number" name="numberOfPallets" value={form.numberOfPallets} onChange={handleChange} className="input w-full" placeholder="e.g. 10" />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('volume', 'Volume')} (m³)
              </label>
              <input type="number" name="cargoVolumeM3" value={form.cargoVolumeM3} onChange={handleChange} className="input w-full" placeholder="e.g. 20" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary uppercase mb-1">
                {t('notes', 'Notes')}
              </label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={2} className="input w-full" placeholder={t('notes', 'Notes')} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={onClose} className="btn-secondary px-6 font-bold">
              {t('jsx_close')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-8 font-bold flex items-center justify-center gap-2"
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
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
}