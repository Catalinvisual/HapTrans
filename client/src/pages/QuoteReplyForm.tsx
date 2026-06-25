import React, { useState } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
      const res = await api.post('/quotes/' + quoteId + '/reply', formData);
      toast.success(tLocal('reply_success'));
      setShowForm(false);
      setFormData({ price: '', pickupDate: '', deliveryDate: '', validUntil: '', message: '' });
      onReplyAdded();
    } catch (err: any) {
      toast.error('Error sending reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 border-t border-gray-200 pt-6" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{tLocal('reply_history')}</h4>
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
              <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>{new Date(r.sentAt).toLocaleString('en-GB')}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-3">
                {r.price && <div><span className="text-gray-500">{tLocal('price_eur')}:</span> <strong>{r.price}</strong></div>}
                {r.pickupDate && <div><span className="text-gray-500">Pickup:</span> <strong>{r.pickupDate}</strong></div>}
                {r.deliveryDate && <div><span className="text-gray-500">Delivery:</span> <strong>{r.deliveryDate}</strong></div>}
                {r.validUntil && <div><span className="text-gray-500">{tLocal('valid_until')}:</span> <strong>{r.validUntil}</strong></div>}
              </div>
              {r.message && <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.message}</p>}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tLocal('price_eur')}</label>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 1200" />
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">{tLocal('valid_until')}</label>
              <Flatpickr
                value={formData.validUntil}
                onChange={(dates, dateStr) => setFormData({...formData, validUntil: dateStr})}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.validUntil) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-gray-300'}`}
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false, minDate: 'today' }}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.validUntil) ? 'text-red-500' : 'text-gray-400'}`} />
              {isPastDate(formData.validUntil) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Pickup Date</label>
              <Flatpickr
                value={formData.pickupDate}
                onChange={(dates, dateStr) => setFormData({...formData, pickupDate: dateStr})}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.pickupDate) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-gray-300'}`}
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false, minDate: 'today' }}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.pickupDate) ? 'text-red-500' : 'text-gray-400'}`} />
              {isPastDate(formData.pickupDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Delivery Date</label>
              <Flatpickr
                value={formData.deliveryDate}
                onChange={(dates, dateStr) => setFormData({...formData, deliveryDate: dateStr})}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-primary focus:border-primary pl-9 ${isPastDate(formData.deliveryDate) ? 'border-red-500 text-red-600 bg-red-50/20' : 'border-gray-300'}`}
                options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false, minDate: 'today' }}
                placeholder="dd/mm/yyyy"
              />
              <Calendar className={`w-4 h-4 absolute left-3 top-8 pointer-events-none ${isPastDate(formData.deliveryDate) ? 'text-red-500' : 'text-gray-400'}`} />
              {isPastDate(formData.deliveryDate) && <span className="text-xs text-red-600 font-semibold mt-1 block">⚠️ {getErrorMessage()}</span>}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">{tLocal('reply_message')}</label>
            <textarea className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary focus:border-primary min-h-[100px]" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} required placeholder="Write your offer/message here..."></textarea>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancel</button>
            <button type="submit" disabled={sending} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50">
              {sending ? 'Sending...' : tLocal('send_reply')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
