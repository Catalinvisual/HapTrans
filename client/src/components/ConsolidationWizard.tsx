import { useTranslation } from 'react-i18next';
import { groupConflicts, presentConflict } from '../lib/conflictPresentation';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Truck as TruckIcon,
  X,
} from 'lucide-react';

export interface ConsolidationReviewState {
  orderIds: string[];
  truckId: string;
  tripId: string | null;
  tripNumber?: string | null;
  mode: 'existing' | 'new';
  loading: boolean;
  error?: string | null;
  preflight?: any;
  insertion?: any;
  selectedInsertion?: { pickupIndex: number; deliveryIndex: number } | null;
  overrideReason?: string;
  overrideError?: string | null;
  proposalChanged?: boolean;
}

interface ConsolidationWizardProps {
  review: ConsolidationReviewState;
  resources?: any[];
  busy?: boolean;
  onClose: () => void;
  onMode: (mode: 'existing' | 'new') => void;
  onSelectOption: (selection: { pickupIndex: number; deliveryIndex: number }) => void;
  onOverrideReason: (value: string) => void;
  onConfirm: () => void;
  onOpenTruck: (truckId: string) => void;
  onJumpToOrder: (orderId: string | null) => void;
}

const num = (value: any, digits = 0): string => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return parsed.toLocaleString(undefined, { maximumFractionDigits: digits });
};

const when = (value: any): string => (value ? new Date(value).toLocaleString() : '—');

const TONES: Record<string, string> = {
  red: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  amber: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  sky: 'border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300',
  emerald: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  slate: 'border-border bg-surface/60 text-text-secondary',
};

const STATUS_TONE: Record<string, keyof typeof TONES> = {
  blocked: 'red',
  warning: 'amber',
  unverified: 'sky',
  feasible: 'emerald',
};

/**
 * Smart Consolidation wizard.
 *
 * Every verdict, distance and conflict shown here comes from the backend
 * preflight: the component never re-derives feasibility. Missing data is shown
 * as unverified, never replaced by a generic value.
 */
export default function ConsolidationWizard({
  review,
  resources = [],
  busy = false,
  onClose,
  onMode,
  onSelectOption,
  onOverrideReason,
  onConfirm,
  onOpenTruck,
  onJumpToOrder,
}: ConsolidationWizardProps) {
  const { t } = useTranslation();

  const preflight = review.preflight || null;
  const feasibility = preflight?.feasibility || null;
  const blockers = (preflight?.blockers || []).filter((c: any) => c.level === 'blocking');
  const warnings = (preflight?.warnings || []).filter((c: any) => c.level !== 'blocking');
  const feasibilityStatus: string = feasibility?.status
    || (blockers.length ? 'blocked' : warnings.length ? 'warning' : 'feasible');
  const tone = TONES[STATUS_TONE[feasibilityStatus] || 'slate'];

  const insertion = review.insertion || preflight?.insertion || null;
  const options: any[] = [insertion?.recommended, ...(insertion?.alternatives || [])]
    .filter(Boolean)
    .filter((option: any, index: number, list: any[]) => list.findIndex((entry: any) =>
      entry.pickupIndex === option.pickupIndex && entry.deliveryIndex === option.deliveryIndex) === index);
  const selected = options.find((option: any) => review.selectedInsertion
    && option.pickupIndex === review.selectedInsertion.pickupIndex
    && option.deliveryIndex === review.selectedInsertion.deliveryIndex) || options[0] || null;

  const route = preflight?.route || null;
  const sequence: any[] = (selected?.sequence?.length ? selected.sequence : route?.stops) || [];
  const cargo = preflight?.cargo || null;
  const capacity = cargo?.capacity || null;
  const schedule = preflight?.schedule || null;
  const equipment = preflight?.equipment || null;
  const driverHours = preflight?.driverHours || null;

  const needsOverride = feasibilityStatus === 'warning' || feasibilityStatus === 'unverified';
  const overrideReason = review.overrideReason || '';
  const truckResource = resources.find((resource: any) => String(resource?.id) === String(review.truckId));
  const canConfirm = !review.loading
    && !review.error
    && !busy
    && feasibilityStatus !== 'blocked'
    && (review.mode === 'new' || !!selected)
    && (!selected || (selected.blockers || []).length === 0)
    && (!needsOverride || overrideReason.trim().length > 0);

  const usedPct = (value: number, limit: number) => (limit > 0 ? Math.min(100, Math.round((value / limit) * 100)) : null);

  const statusLabel = (status: string) => {
    if (status === 'blocked') return t('cons_blocked', 'Blocked');
    if (status === 'warning') return t('cons_manual', 'Manual review required');
    if (status === 'unverified') return t('cw_unverified', 'Unverified data');
    return t('cw_feasible', 'Feasible');
  };

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={() => !busy && onClose()}
    >
      <div
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-border px-6 pt-5 pb-3 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <TruckIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-text-primary">{t('cons_title', 'Smart consolidation')}</h3>
              <p className="text-xs text-text-secondary truncate">
                {review.orderIds.length} {t('jsx_orders', 'orders')} · {t('cons_truck', 'Truck')}{' '}
                {truckResource?.plateNumber || '—'}
                {review.tripNumber ? ` · ${review.tripNumber}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface shrink-0"
            aria-label={t('cons_cancel', 'Cancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-4">
          {review.tripId && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onMode('existing')}
                disabled={review.loading || busy}
                className={`rounded-2xl border p-3 text-left transition-all ${review.mode === 'existing' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface/30 hover:bg-surface/60'}`}
              >
                <span className="block text-xs font-black text-text-primary">{t('cons_add_existing', 'Add to existing trip')}</span>
                <span className="block text-[10px] text-text-secondary mt-0.5 truncate">{review.tripNumber || t('cons_trip', 'Trip')}</span>
              </button>
              <button
                onClick={() => onMode('new')}
                disabled={review.loading || busy}
                className={`rounded-2xl border p-3 text-left transition-all ${review.mode === 'new' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-surface/30 hover:bg-surface/60'}`}
              >
                <span className="block text-xs font-black text-text-primary">{t('cons_create_new', 'Create a new trip')}</span>
                <span className="block text-[10px] text-text-secondary mt-0.5">{t('cons_new_hint', 'Independent trip on the same truck')}</span>
              </button>
            </div>
          )}

          {review.loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-text-secondary">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-xs font-bold">{t('cons_checking', 'Checking capacity, time windows and road route…')}</p>
            </div>
          ) : (
            <>
              {review.proposalChanged && (
                <div className="rounded-2xl border border-sky-500/40 bg-sky-500/10 px-3.5 py-2.5 text-[11px] font-bold text-sky-800 dark:text-sky-300">
                  {t('cw_proposal_changed', 'The proposal changed. Review the new result and confirm again.')}
                </div>
              )}
              {review.error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-[11px] font-bold text-red-700 dark:text-red-300">
                  {review.error}
                </div>
              )}

              <div className={`rounded-2xl border p-3.5 ${tone}`}>
                <div className="flex items-start gap-3">
                  {feasibilityStatus === 'blocked'
                    ? <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    : <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black uppercase tracking-wide">{statusLabel(feasibilityStatus)}</p>
                      {feasibility && (
                        <span className="text-[10px] font-bold opacity-90">
                          {t('cw_hard_blockers', 'Hard blockers')}: {feasibility.hardBlockers}
                          {' · '}{t('cw_warnings', 'Warnings')}: {feasibility.warnings}
                          {' · '}{t('cw_unverified_count', 'Unverified')}: {feasibility.unverified}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] mt-0.5 opacity-90">
                      {feasibilityStatus === 'blocked'
                        ? t('cons_hard_blocker', 'A hard blocker prevents this assignment.')
                        : needsOverride
                          ? t('cons_override', 'Review the warnings before confirming.')
                          : t('cons_no_blockers', 'No blocking or warning conditions were found.')}
                    </p>
                    {feasibility?.codes && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {[...(feasibility.codes.blocking || []).map((code: string) => `B:${code}`),
                          ...(feasibility.codes.warning || []).map((code: string) => `W:${code}`),
                          ...(feasibility.codes.unverified || []).map((code: string) => `U:${code}`)].map((code: string) => (
                          <code key={code} className="rounded bg-white/50 px-1.5 py-0.5 text-[9px] font-bold dark:bg-black/20">{code}</code>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {review.mode === 'existing' && insertion && options.length > 1 && (
                <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">
                    {t('cw_sequence', 'Proposed stop sequence')}
                  </p>
                  {options.map((option: any, index: number) => {
                    const isSelected = selected === option;
                    return (
                      <button
                        key={`${option.pickupIndex}-${option.deliveryIndex}`}
                        type="button"
                        onClick={() => onSelectOption({ pickupIndex: option.pickupIndex, deliveryIndex: option.deliveryIndex })}
                        className={`w-full rounded-xl border px-2.5 py-2 text-left transition-all ${isSelected ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border bg-card hover:bg-surface/60'}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black text-text-primary">
                            {index === 0 ? t('cw_recommended', 'Recommended sequence') : t('cw_alternatives', 'Alternative sequences')}
                            {isSelected && <span className="ml-1 rounded bg-primary/15 px-1 text-[8px] uppercase text-primary">{t('cw_selected', 'Selected')}</span>}
                          </span>
                          <span className="text-[10px] text-text-secondary">
                            {option.addedDistanceKm != null
                              ? `+${num(option.addedDistanceKm)} km · +${num(option.addedDrivingMin)} min`
                              : t('cw_unverified_state', 'Unverified')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {sequence.length > 0 && (
                <div className="rounded-2xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/40 px-3 py-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">
                      {t('cw_sequence', 'Proposed stop sequence')}
                    </p>
                    <p className="text-[10px] text-text-muted">{selected?.stopOrder?.length || sequence.length} {t('stops', 'stops')}</p>
                  </div>
                  <div className="divide-y divide-border">
                    {sequence.map((stop: any) => (
                      <div key={stop.key || stop.sequence} className="px-3 py-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 shrink-0 text-right font-mono text-[10px] text-text-muted">{stop.sequence}</span>
                          <span className={`shrink-0 rounded px-1 text-[8px] font-black uppercase ${['pickup', 'load'].includes(String(stop.type))
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'}`}
                          >
                            {stop.type}
                          </span>
                          <span className="flex min-w-0 items-center gap-1 font-bold text-text-primary">
                            <MapPin className="h-3 w-3 shrink-0 text-text-muted" />
                            <span className="truncate">{stop.city || '—'}</span>
                          </span>
                          {(stop.isNew || stop.orderNumber) && (
                            <span className="shrink-0 rounded bg-primary/10 px-1 text-[8px] font-black uppercase text-primary">
                              {stop.isNew ? t('cw_new_stop', 'New stop') : t('cw_existing_stop', 'Existing')}
                            </span>
                          )}
                          <span className="ml-auto shrink-0 text-[10px] text-text-secondary">{stop.orderNumber || stop.orderId || ''}</span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-7 text-[10px] text-text-muted">
                          <span><Clock className="mr-0.5 inline h-3 w-3" />{t('cw_arrival', 'Arrival')}: <b className="text-text-secondary">{when(stop.plannedArrival)}</b></span>
                          <span>{t('cw_departure', 'Departure')}: <b className="text-text-secondary">{when(stop.plannedDeparture)}</b></span>
                          {stop.etaDeltaMin != null && (
                            <span className={stop.etaDeltaMin > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}>
                              {t('cw_eta_delta', 'ETA change')}: {stop.etaDeltaMin > 0 ? '+' : ''}{num(stop.etaDeltaMin)} min
                            </span>
                          )}
                          {stop.windowStatus && (
                            <span className={stop.windowStatus === 'missed'
                              ? 'font-bold text-red-600 dark:text-red-400'
                              : stop.windowStatus === 'met' ? 'text-emerald-700 dark:text-emerald-300' : ''}
                            >
                              {stop.windowStatus === 'missed'
                                ? t('cw_window_missed', 'Window missed')
                                : stop.windowStatus === 'met'
                                  ? t('cw_window_met', 'Inside window')
                                  : t('cw_window_unknown', 'Window unverified')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {route && (
                <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cons_route_verified', 'Road route')}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${route.status === 'verified' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'}`}>
                      {route.status === 'verified' ? t('cw_verified', 'Verified') : t('cw_unverified_state', 'Unverified')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_baseline_distance', 'Existing route')}</span><b className="text-text-primary">{num(route.baselineDistanceKm)} km</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_proposed_distance', 'Proposed total')}</span><b className="text-text-primary">{num(route.proposedDistanceKm)} km</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_added_distance', 'Incremental distance')}</span><b className="text-primary">{num(route.addedDistanceKm)} km</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_baseline_duration', 'Existing driving')}</span><b className="text-text-primary">{num(route.baselineDurationMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_proposed_duration', 'Proposed driving')}</span><b className="text-text-primary">{num(route.proposedDurationMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_added_duration', 'Incremental driving')}</span><b className="text-primary">{num(route.addedDurationMin)} min</b></div>
                  </div>
                  <p className="text-[10px] text-text-muted">
                    {t('cw_provider', 'Routing provider')}: <b>{route.provider || '—'}</b>
                    {' · '}{t('cw_verified', 'Verified')}: {route.legs?.length || 0}/{Math.max(0, sequence.length - 1)} legs
                  </p>
                </div>
              )}

              {schedule && (
                <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cw_schedule', 'Schedule')}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                    <div><span className="block text-[10px] text-text-secondary">{t('sched_waiting', 'Waiting')}</span><b>{num(schedule.waitingMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_breaks', 'Breaks')}</span><b>{num(schedule.breakMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_daily_rest', 'Daily rest')}</span><b>{num(schedule.dailyRestMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_duty_days', 'Duty days')}</span><b>{num(schedule.dutyDays)}</b></div>
                  </div>
                  <p className="text-[9px] leading-snug text-text-muted">{t('cw_schedule_model_note', 'Planning model based on EU 561/2006 limits. It is not recorded tachograph activity.')}</p>
                </div>
              )}

              {cargo && (
                <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cons_capacity', 'Capacity')}</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="block text-[10px] text-text-secondary">{t('cw_current_load', 'Current load (existing itinerary)')}</span>
                      <b className="text-text-primary">{cargo.before?.pallets || 0} {t('cw_pallets', 'pallets')} · {num(cargo.before?.weight)} kg · {num(cargo.before?.ldm, 1)} LDM</b>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-secondary">{t('cw_proposed_load', 'Proposed load (this itinerary)')}</span>
                      <b className="text-text-primary">{cargo.after?.pallets || 0} {t('cw_pallets', 'pallets')} · {num(cargo.after?.weight)} kg · {num(cargo.after?.ldm, 1)} LDM</b>
                    </div>
                  </div>
                  {[['cw_weight', 'maxWeightKg', cargo.after?.weight, capacity?.maxWeightKg, 0],
                    ['cw_pallets', 'maxPallets', cargo.after?.pallets, capacity?.maxPallets, 0],
                    ['cw_volume', 'maxVolumeCbm', cargo.after?.volume, capacity?.maxVolumeCbm, 1],
                    ['LDM', 'maxLdm', cargo.after?.ldm, capacity?.maxLdm, 1]].map(([label, key, value, limit, digits]: any[]) => {
                    const percent = usedPct(Number(value) || 0, Number(limit) || 0);
                    return (
                      <div key={key} className="text-[10px] text-text-secondary">
                        <div className="flex items-center justify-between">
                          <span>{label === 'LDM' ? 'LDM' : t(label, key)}: <b className="text-text-primary">{num(value, digits)} / {limit == null ? t('cw_missing_data', 'Not recorded') : num(limit, digits)}</b></span>
                          {percent != null && <span>{percent}%</span>}
                        </div>
                        {percent != null && (
                          <div className="mt-0.5 h-1 w-full rounded bg-border">
                            <div className={`h-1 rounded ${percent >= 100 ? 'bg-red-500' : percent >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${percent}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {preflight?.candidate && (
                    <div className="space-y-1 border-t border-border pt-2 text-[10px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black uppercase tracking-wide text-text-secondary">
                          {t('cw_candidate', 'Proposed sequence')}
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${preflight.candidate.status === 'rejected'
                          ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'}`}>
                          {preflight.candidate.status === 'rejected'
                            ? t('cw_candidate_rejected', 'Cannot be inserted')
                            : t('cw_candidate_selected', 'Selected')}
                        </span>
                      </div>
                      <p className="text-text-secondary">
                        {t('cw_candidate_peak', 'Maximum simultaneous load')}: <b className="text-text-primary">{preflight.candidate.peak?.pallets ?? 0} {t('cw_pallets', 'pallets')} · {num(preflight.candidate.peak?.weight)} kg · {num(preflight.candidate.peak?.ldm, 1)} LDM</b>
                      </p>
                      <p className="text-text-secondary">
                        {t('cw_candidate_stops', 'Candidate stops')}: <b className="text-text-primary">{(preflight.candidate.stopOrder || []).length}</b>
                        {' · '}{t('cw_candidate_ledger', 'Ledger')}: <b className="text-text-primary">{preflight.candidate.ledgerStatus || '—'}</b>
                        {preflight.candidate.addedDistanceKm != null && (
                          <>{' · '}{t('cw_added_distance', 'Incremental distance')}: <b className="text-text-primary">{num(preflight.candidate.addedDistanceKm)} km</b></>
                        )}
                      </p>
                      {(preflight.candidate.blockers || []).filter((entry: any) => entry.level === 'blocking').map((entry: any, index: number) => (
                        <p key={`${entry.code}-${index}`} className="text-red-700 dark:text-red-300">
                          {entry.code}
                          {entry.params?.load != null ? `: ${num(entry.params.load, 1)} / ${num(entry.params.max, 1)}` : ''}
                        </p>
                      ))}
                      {preflight.candidate.status === 'rejected' && (
                        <p className="text-text-muted">
                          {t('cw_candidate_unchanged', 'The existing itinerary is unchanged; this sequence was evaluated but cannot be inserted.')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {equipment && (equipment.truck || equipment.trailer) && (
                <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cw_equipment', 'Truck and trailer')}</p>
                    <button
                      type="button"
                      onClick={() => equipment.truck?.id && onOpenTruck(equipment.truck.id)}
                      className="inline-flex items-center gap-1 text-[10px] font-black text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />{t('cw_open_fleet', 'Open in Fleet')}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="block text-[10px] text-text-secondary">{t('cons_truck', 'Truck')}</span>
                      <b className="text-text-primary">{equipment.truck?.plateNumber || '—'}</b>
                      <span className="block text-[10px] text-text-muted">{equipment.truck?.truckType || t('cw_missing_data', 'Not recorded')}</span>
                      <span className="block text-[10px] text-text-muted">{equipment.truck?.maxWeightKg ? `${num(equipment.truck.maxWeightKg)} kg` : t('cw_missing_data', 'Not recorded')}{equipment.truck?.axleCount ? ` · ${equipment.truck.axleCount} ${t('cw_axles', 'axles')}` : ''}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-text-secondary">{t('cw_trailer', 'Trailer')}</span>
                      <b className="text-text-primary">{equipment.trailer?.plateNumber || '—'}</b>
                      <span className="block text-[10px] text-text-muted">{equipment.trailer?.type || t('cw_missing_data', 'Not recorded')}</span>
                      <span className="block text-[10px] text-text-muted">
                        {t('cw_internal_dims', 'Internal dimensions')}: {equipment.trailer?.lengthCm
                          ? `${equipment.trailer.lengthCm}×${equipment.trailer.widthCm || '—'}×${equipment.trailer.heightCm || '—'} cm`
                          : t('cw_missing_data', 'Not recorded')}
                      </span>
                      <span className="block text-[10px] text-text-muted">
                        {t('cw_features', 'Features')}: {equipment.trailer?.features?.length ? equipment.trailer.features.join(', ') : t('cw_missing_data', 'Not recorded')}
                      </span>
                    </div>
                  </div>
                  {(equipment.requirements || []).length > 0 && (
                    <div className="space-y-1 border-t border-border pt-2">
                      {(equipment.requirements || []).map((requirement: any, index: number) => (
                        <div key={`${requirement.requirement}-${index}`} className="flex items-start gap-1.5 text-[10px]">
                          <span className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-black uppercase ${requirement.status === 'compatible'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                            : requirement.status === 'incompatible'
                              ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                              : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'}`}
                          >
                            {requirement.status === 'compatible'
                              ? t('cw_compatible', 'Verified compatible')
                              : requirement.status === 'incompatible'
                                ? t('cw_incompatible', 'Verified incompatible')
                                : t('cw_unverified_state', 'Unverified')}
                          </span>
                          <span className="text-text-secondary">
                            <b className="text-text-primary">{t('cw_requirement', 'Requirement')}: {requirement.requirement}</b>
                            {requirement.reason ? ` — ${requirement.reason}` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cw_driver_hours', 'Driver hours')}</p>
                {driverHours?.scheduleModel ? (
                  <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_duty_days', 'Duty days')}</span><b>{num(driverHours.scheduleModel.dutyDays)}</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_breaks', 'Breaks')}</span><b>{num(driverHours.scheduleModel.breakMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_daily_rest', 'Daily rest')}</span><b>{num(driverHours.scheduleModel.dailyRestMin)} min</b></div>
                    <div><span className="block text-[10px] text-text-secondary">{t('cw_verified', 'Verified')}</span><b>{driverHours.status}</b></div>
                  </div>
                ) : null}
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  {driverHours?.status === 'unverified'
                    ? t('cw_driver_unverified', 'Tachograph data unavailable for this driver.')
                    : t('cw_legal_note', 'Legal driving and rest limits are shown only from recorded activity.')}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-surface/30 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cw_conflicts', 'Conflicts and warnings')}</p>
                  <span className="text-[10px] text-text-muted">{blockers.length + warnings.length}</span>
                </div>
                {[...blockers, ...warnings].length === 0 && (
                  <p className="text-[11px] text-text-secondary">{t('cw_no_conflicts', 'No blocking or warning conditions were found.')}</p>
                )}
                {groupConflicts([...blockers, ...warnings]).map(({ conflict, count }: any, index: number) => {
                  const presented = presentConflict(conflict, {
                    t,
                    locale: (typeof document !== 'undefined' && document.documentElement.lang) || 'en-GB',
                  });
                  return (
                    <div key={`${conflict.id || conflict.code}-${index}`} className="rounded-xl border border-border bg-card p-2 text-[11px]">
                      <div className="flex items-start gap-1.5">
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${presented.severity === 'blocking'
                          ? 'bg-red-600 text-white'
                          : presented.severity === 'unverified'
                            ? 'bg-sky-500/20 text-sky-800 dark:text-sky-300'
                            : 'bg-amber-500/20 text-amber-800 dark:text-amber-300'}`}
                        >
                          {presented.severity === 'blocking'
                            ? t('cons_blockers', 'Blockers')
                            : presented.severity === 'unverified'
                              ? t('cw_unverified', 'Unverified')
                              : t('cw_warnings', 'Warnings')}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-text-primary">
                            {presented.title}
                            {count > 1 && (
                              <span className="ml-1 text-[9px] font-black text-text-muted">
                                {t('cf_occurrences', '{count}×').replace('{count}', String(count))}
                              </span>
                            )}
                          </p>
                          <p className="text-text-secondary">{presented.description}</p>
                          {presented.meta.length > 0 && (
                            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[10px]">
                              {presented.meta.map((entry: any) => (
                                <div key={entry.label} className="contents">
                                  <dt className="text-text-muted">{entry.label}</dt>
                                  <dd className="font-semibold text-text-primary">{entry.value}</dd>
                                </div>
                              ))}
                            </dl>
                          )}
                          {presented.action && (
                            <p className="mt-1 font-semibold text-amber-800 dark:text-amber-300">{presented.action}</p>
                          )}
                          {presented.technical.length > 0 && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-[9px] font-black uppercase tracking-wide text-text-muted">
                                {t('cf_technical', 'Technical details')}
                              </summary>
                              <dl className="mt-1 space-y-0.5 font-mono text-[9px] text-muted-foreground">
                                {presented.technical.map((entry: any) => (
                                  <div key={`${entry.label}-${entry.value}`} className="flex gap-1">
                                    <dt className="shrink-0 text-text-muted">{entry.label}:</dt>
                                    <dd className="break-all">{entry.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            </details>
                          )}
                        </div>
                      </div>
                      {conflict.orderId && (
                        <button
                          type="button"
                          onClick={() => onJumpToOrder(String(conflict.orderId))}
                          className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />{t('cw_jump', 'Open')} {t('cw_order_ref', 'Order')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {needsOverride && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-800 dark:text-amber-300">{t('cw_override', 'Override required')}</p>
                  <p className="text-[10px] text-amber-800/90 dark:text-amber-200/90">{t('cw_override_hint', 'This proposal has warnings or unverified requirements. A written reason is stored with your user, the verdict and the accepted codes.')}</p>
                  <label className="block text-[10px] font-bold text-amber-900 dark:text-amber-200" htmlFor="consolidation-override-reason">
                    {t('cw_override_reason', 'Reason')}
                  </label>
                  <textarea
                    id="consolidation-override-reason"
                    value={overrideReason}
                    onChange={(event) => onOverrideReason(event.target.value)}
                    placeholder={t('cw_override_placeholder', 'Explain why this assignment is operationally acceptable…')}
                    rows={2}
                    className="w-full rounded-xl border border-amber-500/40 bg-card px-2.5 py-1.5 text-[11px] text-text-primary"
                  />
                  {review.overrideError && <p className="text-[10px] font-bold text-red-600">{review.overrideError}</p>}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-3">
          <button onClick={onClose} disabled={busy} className="btn-secondary text-xs py-2 px-4 font-bold">
            {t('cons_cancel', 'Cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-1.5 shadow-md shadow-primary/20 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            {review.mode === 'existing'
              ? t('cw_confirm_add', 'Confirm and add to trip')
              : t('cw_confirm_new', 'Confirm and create trip')}
          </button>
        </div>
      </div>
    </div>
  );
}
