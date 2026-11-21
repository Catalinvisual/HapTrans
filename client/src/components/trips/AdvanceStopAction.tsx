import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

/**
 * Dispatcher-facing shortcut for the operational checkpoint the driver app
 * reports. It only ever sends the next legal status of the current stop through
 * the driver endpoint, so orders, POD and trip status keep being derived by the
 * server instead of being overwritten from the TMS.
 */

const STOP_STATUSES = ['pending', 'arrived', 'loading', 'unloading', 'completed'];

const NEXT_ACTION: Record<'pickup' | 'delivery', Record<string, { status: string; key: string; fallback: string }>> = {
  pickup: {
    pending: { status: 'arrived', key: 'stop_mark_arrived', fallback: 'Mark arrived' },
    arrived: { status: 'loading', key: 'stop_start_loading', fallback: 'Start loading' },
    loading: { status: 'completed', key: 'stop_complete_loading', fallback: 'Complete loading' },
  },
  delivery: {
    pending: { status: 'arrived', key: 'stop_mark_arrived', fallback: 'Mark arrived' },
    arrived: { status: 'unloading', key: 'stop_start_unloading', fallback: 'Start unloading' },
    unloading: { status: 'completed', key: 'stop_complete_unloading', fallback: 'Complete unloading' },
  },
};

const FINISHED_TRIP_STATUSES = ['completed', 'closed', 'cancelled', 'canceled', 'rejected'];

function normalizeStopType(type: any, sequence?: any): 'pickup' | 'delivery' {
  const value = String(type ?? '').trim().toLowerCase();
  if (['delivery', 'dropoff', 'drop-off', 'unloading', 'unload', 'drop'].includes(value)) return 'delivery';
  if (['pickup', 'pick-up', 'collection', 'loading', 'load'].includes(value)) return 'pickup';
  const seq = Number(sequence);
  return Number.isFinite(seq) && seq >= 2 ? 'delivery' : 'pickup';
}

function normalizeStopStatus(status: any): string {
  const value = String(status ?? '').trim().toLowerCase();
  if (['in_progress', 'at_stop', 'arrived_at_stop', 'on_site'].includes(value)) return 'arrived';
  if (['done', 'finished', 'delivered', 'unloaded'].includes(value)) return 'completed';
  return STOP_STATUSES.includes(value) ? value : 'pending';
}

function sortedStops(stops: any[]): any[] {
  return [...(stops || [])].sort((a, b) => Number(a?.sequence || 0) - Number(b?.sequence || 0));
}

/** The stop the operator is working on now: an in-progress one wins over a later pending one. */
function currentStop(stops: any[]): any | null {
  const ordered = sortedStops(stops).filter((stop) => stop?.id && normalizeStopStatus(stop.status) !== 'completed');
  return ordered.find((stop) => normalizeStopStatus(stop.status) !== 'pending') || ordered[0] || null;
}

/** True when the trip still has a checkpoint the operator can advance. */
export function tripHasOpenCheckpoint(stops?: any[] | null): boolean {
  const stop = currentStop(stops || []);
  if (!stop) return false;
  return Boolean(NEXT_ACTION[normalizeStopType(stop.type, stop.sequence)][normalizeStopStatus(stop.status)]);
}

interface AdvanceStopActionProps {
  stops?: any[] | null;
  tripStatus?: string | null;
  onAdvanced?: () => void;
  className?: string;
}

export default function AdvanceStopAction({ stops, tripStatus, onAdvanced, className = '' }: AdvanceStopActionProps) {
  const { t } = useTranslation();
  const [localStops, setLocalStops] = useState<any[]>(stops || []);
  const [saving, setSaving] = useState(false);

  // The modal may reload its entity after the action; the prop stays the source
  // of truth whenever the actual checkpoints change (a fresh array reference
  // from the parent must not reset the state on every render).
  const stopsSignature = (stops || []).map((item) => `${item?.id}:${item?.status}`).join('|');
  useEffect(() => {
    setLocalStops(stops || []);
  }, [stopsSignature]);

  const stop = useMemo(() => currentStop(localStops), [localStops]);
  const finished = FINISHED_TRIP_STATUSES.includes(String(tripStatus || '').toLowerCase());
  if (finished || !stop) return null;

  const stopType = normalizeStopType(stop.type, stop.sequence);
  const action = NEXT_ACTION[stopType][normalizeStopStatus(stop.status)];
  if (!action) return null;

  const position = sortedStops(localStops).findIndex((item) => item.id === stop.id) + 1;
  const place = stop.city || stop.companyName || stop.address || '';
  const label = [
    `${position}. ${t(stopType === 'pickup' ? 'pickup' : 'dropoff', stopType === 'pickup' ? 'Pickup' : 'Delivery')}`,
    place,
  ].filter(Boolean).join(' · ');

  const advance = async () => {
    setSaving(true);
    try {
      await api.patch(`/trips/stops/${stop.id}/status`, { status: action.status });
      setLocalStops((prev) => prev.map((item) => (item.id === stop.id ? { ...item, status: action.status } : item)));
      toast.success(t('stop_advance_success', 'Stop updated'));
      onAdvanced?.();
    } catch (err: any) {
      const message = err?.response?.data?.message;
      toast.error(Array.isArray(message) ? message.join(', ') : message || t('stop_advance_error', 'Could not update the stop'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-bold uppercase text-text-secondary">{t('stop_advance_title', 'Advance stop')}</span>
        <span className="truncate text-[11px] font-semibold text-text-primary max-w-[220px]" title={label}>{label}</span>
      </div>
      <button
        type="button"
        onClick={advance}
        disabled={saving}
        className="btn-secondary flex items-center gap-1.5 !px-3 !py-1.5 !text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
        {t(action.key, action.fallback)}
      </button>
    </div>
  );
}
