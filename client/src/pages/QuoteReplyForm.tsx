import React, { useState, useMemo } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCompanySettings } from "../store/settingsStore";

export const QuoteReplyForm = ({ quoteId, replies, tLocal, onReplyAdded }: any) => {
  const [showForm, setShowForm] = useState(false);
  const { i18n } = useTranslation();
  const [formData, setFormData] = useState({
    price: '',
    pickupDate: '',
    deliveryDate: '',
    validUntil: '',
    message: ''
  });
  const [sending, setSending] = useState(false);

  const fpOptions = useMemo(() => ({
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    allowInput: false,
    minDate: 'today'
  }), []);

  const isPastDate = (val: string) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const getErrorMessage = () => {
    const lg = i18n?.language || 'en';
    if (lg === 'ro') return 'Data nu poate fi în trecut.';
    if (lg === 'nl') return 'Datum mag niet in het verleden liggen.';
    if (lg === 'de') return 'Datum darf nicht in der Vergangenheit liegen.';
    if (lg === 'fr') return 'La date ne peut pas être dans le passé.';
    if (lg === 'es') return 'La fecha no puede estar en el pasado.';
    if (lg === 'pl') return 'Data nie może być w przeszłości.';
    return 'Date cannot be in the past.';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPastDate(formData.validUntil) || isPastDate(formData.pickupDate) || isPastDate(formData.deliveryDate)) {
      toast.error(getErrorMessage());
      return;
    }
    setSending(true);
    try {
      const res = await api.post(`/quotes/${quoteId}/reply`, { ...formData, company: getCompanySettings() });
      toast.success(tLocal('reply_sent_success'));
      if (onReplyAdded) onReplyAdded(res.data);
      setFormData({ price: '', pickupDate: '', deliveryDate: '', validUntil: '', message: '' });
      setShowForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error sending reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 border-t border-border pt-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{tLocal('reply_history')}</h4>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
          >
            {tLocal('reply')}
          </button>
        )}
      </div>

      {replies && replies.length > 0 && (
        <div className="space-y-4 mb-6">
          {replies.map((r: any) => (
            <div key={r.id} className="p-4 bg-orange-50 border border-orange-100 rounded-lg">
              <div className="flex justify-between text-xs text-text-secondary mb-2">
                <span>{new Date(r.sentAt).toLocaleString('en-GB')}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                {r.price && <div><span className="text-text-secondary">{tLocal('price_eur')}:</span> <strong>{r.price}</strong></div>}
                {r.pickupDate && <div><span className="text-text-secondary">Pickup:</span> <strong>{r.pickupDate}</strong></div>}
                {r.deliveryDate && <div><span className="text-text-secondary">Delivery:</span> <strong>{r.deliveryDate}</strong></div>}
                {r.validUntil && <div><span className="text-text-secondary">{tLocal('valid_until')}:</span> <strong>{r.validUntil}</strong></div>}
              </div>
              {r.message && <p className="text-sm text-text whitespace-pre-wrap">{r.message}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card p-4 rounded-lg border border-border">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">{tLocal('price_eur')}</label>
              <input type="number" className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-primary focus:border-primary" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 1200" />
            </div>
            <div className="relative" onClick={(e) => { const inp = e.currentTarget.querySelector('input'); if (inp) { const fp = (inp as any)._flatpickr; if (fp) fp.open(); else inp.focus(); } }}>
              <label className="block text-xs font-semibold text-text-secondary mb-1">{tLocal('valid_until')}</label>
              <Flatpickr
                type="hidden"
                value={formData.validUntil}
                onChange={(dates, dateStr) => setFormData({...formData, validUntil: dateStr})}
                onClick={(e) => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                onFocus={(e) => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.validUntil) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-border'}`}
                options={fpOptions}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.validUntil) ? 'text-red-500' : 'text-text-light'}`} />
              {isPastDate(formData.validUntil) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div className="relative" onClick={(e) => { const inp = e.currentTarget.querySelector('input'); if (inp) { const fp = (inp as any)._flatpickr; if (fp) fp.open(); else inp.focus(); } }}>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Pickup Date</label>
              <Flatpickr
                type="hidden"
                value={formData.pickupDate}
                onChange={(dates, dateStr) => setFormData({...formData, pickupDate: dateStr})}
                onClick={(e) => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                onFocus={(e) => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.pickupDate) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-border'}`}
                options={fpOptions}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.pickupDate) ? 'text-red-500' : 'text-text-light'}`} />
              {isPastDate(formData.pickupDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div className="relative" onClick={(e) => { const inp = e.currentTarget.querySelector('input'); if (inp) { const fp = (inp as any)._flatpickr; if (fp) fp.open(); else inp.focus(); } }}>
              <label className="block text-xs font-semibold text-text-secondary mb-1">Delivery Date</label>
              <Flatpickr
                type="hidden"
                value={formData.deliveryDate}
                onChange={(dates, dateStr) => setFormData({...formData, deliveryDate: dateStr})}
                onClick={(e) => { e.stopPropagation(); const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                onFocus={(e) => { const fp = (e.target as any)._flatpickr; if (fp) fp.open(); }}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.deliveryDate) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-border'}`}
                options={fpOptions}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.deliveryDate) ? 'text-red-500' : 'text-text-light'}`} />
              {isPastDate(formData.deliveryDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-text-secondary mb-1">{tLocal('reply_message')}</label>
            <textarea className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-primary focus:border-primary min-h-[100px]" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required placeholder="Write your offer/message here..."></textarea>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-text-secondary hover:bg-surface rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={sending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {sending ? 'Sending...' : tLocal('send_reply')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
