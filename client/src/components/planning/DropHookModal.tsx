import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Unplug, Link as LinkIcon, Loader2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { planningApi } from '../../lib/planningApi';

interface DropHookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'drop' | 'hook';
  initialTrailerId?: string;
  initialTripId?: string;
  trailers: any[];
  trucks: any[];
  drivers: any[];
}

export default function DropHookModal({
  isOpen,
  onClose,
  onSuccess,
  mode: initialMode = 'drop',
  initialTrailerId,
  initialTripId,
  trailers,
  trucks,
  drivers,
}: DropHookModalProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'drop' | 'hook'>(initialMode);
  const [trailerId, setTrailerId] = useState(initialTrailerId || '');
  const [tripId, setTripId] = useState(initialTripId || '');
  const [truckId, setTruckId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [location, setLocation] = useState('');
  const [eventTime, setEventTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    if (initialTrailerId) setTrailerId(initialTrailerId);
    if (initialTripId) setTripId(initialTripId);
  }, [initialMode, initialTrailerId, initialTripId]);

  useEffect(() => {
    if (isOpen) {
      setLoadingHistory(true);
      planningApi.getDropHookEvents({ trailerId: trailerId || undefined, tripId: tripId || undefined })
        .then(events => {
          if (Array.isArray(events)) setRecentEvents(events);
        })
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }
  }, [isOpen, trailerId, tripId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trailerId) {
      toast.error(t('select_trailer_required', 'Please select a trailer'));
      return;
    }
    if (!location) {
      toast.error(t('location_required', 'Please enter a location'));
      return;
    }

    setLoading(true);
    try {
      if (mode === 'drop') {
        await planningApi.dropTrailer({
          trailerId,
          tripId: tripId || undefined,
          dropLocation: location,
          droppedAt: eventTime ? new Date(eventTime).toISOString() : undefined,
          notes,
        });
        toast.success(t('drop_success', 'Trailer dropped successfully. Tractor & driver released.'));
      } else {
        await planningApi.hookTrailer({
          trailerId,
          truckId: truckId || undefined,
          driverId: driverId || undefined,
          tripId: tripId || undefined,
          hookLocation: location,
          hookedAt: eventTime ? new Date(eventTime).toISOString() : undefined,
          notes,
        });
        toast.success(t('hook_success', 'Trailer hooked successfully to vehicle.'));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('operation_failed', 'Operation failed'));
    } finally {
      setLoading(false);
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={onClose}>
      <div className="w-full max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-surface/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${mode === 'drop' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {mode === 'drop' ? <Unplug className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-black text-text-primary">
                {mode === 'drop' ? t('drop_trailer_title', 'Drop Trailer') : t('hook_trailer_title', 'Hook Trailer')}
              </h2>
              <p className="text-xs text-text-secondary">
                {mode === 'drop' ? t('drop_trailer_subtitle', 'Release truck & driver, leave trailer at location') : t('hook_trailer_subtitle', 'Attach dropped trailer to a tractor & driver')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-3 bg-surface/30 border-b border-border flex gap-2">
          <button
            type="button"
            onClick={() => setMode('drop')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'drop' ? 'bg-amber-500 text-white shadow-sm' : 'bg-card text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <Unplug className="w-4 h-4" />
            <span>{t('mode_drop', 'Drop Operation')}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('hook')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              mode === 'hook' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-card text-text-secondary hover:text-text-primary border border-border'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>{t('mode_hook', 'Hook Operation')}</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Trailer Select */}
          <div>
            <label className="block font-bold text-text-secondary mb-1">
              {t('trailer', 'Trailer')} <span className="text-red-500">*</span>
            </label>
            <select
              value={trailerId}
              onChange={e => setTrailerId(e.target.value)}
              required
              className="w-full px-3 py-2 bg-card border border-border rounded-xl font-bold text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">{t('select_trailer', '— Select Trailer —')}</option>
              {trailers.map(trl => (
                <option key={trl.id} value={trl.id}>
                  {trl.plateNumber} {trl.isDropped ? `(DROPPED @ ${trl.dropLocation || 'facility'})` : '(Hooked)'}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block font-bold text-text-secondary mb-1">
              {mode === 'drop' ? t('drop_location', 'Drop Facility / Location') : t('hook_location', 'Hook Location')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Rotterdam Port Gate 4, Depot Brussels"
                required
                className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-xl text-text-primary font-medium focus:ring-1 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>

          {/* If HOOK mode: select Tractor & Driver */}
          {mode === 'hook' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-text-secondary mb-1">{t('truck_tractor', 'Tractor / Truck')}</label>
                <select
                  value={truckId}
                  onChange={e => setTruckId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl font-medium text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">{t('select_truck', '— Select Truck —')}</option>
                  {trucks.map(tr => (
                    <option key={tr.id} value={tr.id}>{tr.plateNumber} ({tr.brand || 'Truck'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-text-secondary mb-1">{t('driver', 'Driver')}</label>
                <select
                  value={driverId}
                  onChange={e => setDriverId(e.target.value)}
                  className="w-full px-3 py-2 bg-card border border-border rounded-xl font-medium text-text-primary focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="">{t('select_driver', '— Select Driver —')}</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name || d.user?.name || 'Driver'}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div>
            <label className="block font-bold text-text-secondary mb-1">
              {t('timestamp', 'Timestamp')}
            </label>
            <input
              type="datetime-local"
              value={eventTime}
              onChange={e => setEventTime(e.target.value)}
              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary font-medium focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-text-secondary mb-1">{t('notes', 'Notes / Yard Bay')}</label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Bay number, security seals, condition inspection notes..."
              className="w-full px-3 py-2 bg-card border border-border rounded-xl text-text-primary text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          {/* Drop & Hook Audit History Preview */}
          {loadingHistory ? (
            <div className="pt-2 border-t border-border flex items-center justify-center py-2 text-text-muted gap-1.5 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{t('loading_history', 'Loading history…')}</span>
            </div>
          ) : recentEvents.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="font-bold text-[10px] text-text-secondary uppercase mb-2">
                {t('recent_drop_hook_events', 'Recent Drop & Hook History')}
              </p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {recentEvents.slice(0, 5).map(ev => (
                  <div key={ev.id} className="p-2 rounded-lg bg-surface/50 border border-border text-[11px] flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${ev.eventType === 'drop' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                        {ev.eventType}
                      </span>
                      <span className="font-bold text-text-primary">{ev.location}</span>
                    </div>
                    <span className="text-[10px] text-text-muted">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 font-bold"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`text-xs py-2 px-5 font-bold rounded-xl text-white flex items-center gap-1.5 transition-all ${
                mode === 'drop' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{mode === 'drop' ? t('confirm_drop', 'Confirm Drop') : t('confirm_hook', 'Confirm Hook')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;
}
