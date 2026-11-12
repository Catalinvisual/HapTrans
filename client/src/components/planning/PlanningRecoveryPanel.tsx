import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, LifeBuoy, Split, Truck, UserX, X } from 'lucide-react';
import { fmtNumber } from '../../lib/format';

const cargoPallets = (trip: any): number =>
  (trip?.orders || []).reduce(
    (sum: number, order: any) =>
      sum +
      (Number(order?.pallets) ||
        (order?.cargoItems || []).reduce((inner: number, item: any) => inner + (Number(item?.quantity) || 0), 0)),
    0,
  );

const dayKey = (value: any): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

/**
 * Recovery for a delayed trip.
 *
 * It does not invent an optimiser: it shows which customer windows the current
 * ETAs will miss and puts the remedies that already exist in one place — move an
 * order to a candidate trip (the normal preflight still decides), shift the
 * departure (scenario apply), split the trip, or subcontract it.
 */
export default function PlanningRecoveryPanel({
  open,
  onClose,
  trip,
  trips = [],
  onMoveOrder,
  onOpenScenarios,
  onSubcontract,
  onSplit,
}: {
  open: boolean;
  onClose: () => void;
  trip: any | null;
  trips?: any[];
  onMoveOrder: (orderId: string, targetTrip: any) => void;
  onOpenScenarios: () => void;
  onSubcontract: () => void;
  onSplit: () => void;
}) {
  const { t } = useTranslation();

  const lateStops = useMemo(() => {
    const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
    return stops
      .map((stop: any) => {
        const etaRaw = stop?.eta || stop?.plannedDate;
        const eta = etaRaw ? new Date(etaRaw).getTime() : NaN;
        const maxRaw = stop?.timeWindowMax || stop?.dateTo;
        const max = maxRaw ? new Date(maxRaw).getTime() : NaN;
        if (!Number.isFinite(eta) || !Number.isFinite(max)) return null;
        if (eta <= max) return null;
        return { stop, lateMin: Math.round((eta - max) / 60000) };
      })
      .filter(Boolean) as Array<{ stop: any; lateMin: number }>;
  }, [trip?.id, trip?.stops]);

  const candidates = useMemo(() => {
    if (!trip) return [];
    const day = dayKey(trip.plannedDeparture);
    const orderPallets = cargoPallets({ orders: trip.orders });
    return (trips || [])
      .filter((candidate: any) => candidate?.id && candidate.id !== trip.id && candidate.truck?.id)
      .filter((candidate: any) => {
        const candidateDay = dayKey(candidate.plannedDeparture);
        return !day || !candidateDay || candidateDay === day;
      })
      .map((candidate: any) => {
        const capacity = Number(candidate.truck?.capacityPallets ?? candidate.truck?.maxPallets ?? 0);
        const used = cargoPallets(candidate);
        const free = capacity > 0 ? capacity - used : null;
        return { trip: candidate, free };
      })
      .filter((entry) => entry.free === null || orderPallets === 0 || entry.free >= orderPallets)
      .slice(0, 6);
  }, [trip?.id, trip?.plannedDeparture, trip?.orders, trips]);

  if (!open || !trip) return null;

  const firstOrder = (trip.orders || []).find((order: any) => order?.id) || null;
  const riskyStopOrderId = lateStops
    .map(({ stop }) => stop?.orderId)
    .find((orderId: string) => orderId) || firstOrder?.id || null;
  const currentTruckId = trip.truck?.id || trip.truckId || null;

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm" aria-label={t('rec_title', 'Recovery')}>
      <header className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-600">
          <LifeBuoy className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[11px] font-black text-text-primary">
            {t('rec_title', 'Recovery')}
            <span className="font-semibold text-text-secondary"> · {trip.tripNumber || '—'}</span>
          </h3>
          <p className="truncate text-[9px] text-text-muted">
            {t('rec_hint', 'Windows this plan is projected to miss, and the fastest ways out.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          aria-label={t('pv_stop_close', 'Close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="space-y-2 p-2.5">
        <div className="rounded-lg border border-border bg-surface/60 p-2">
          <p className="text-[9px] font-black uppercase tracking-wide text-text-muted">
            {t('rec_late_stops', 'Projected to miss')}
          </p>
          {lateStops.length === 0 ? (
            <p className="mt-1 text-[10px] font-bold text-emerald-600">
              {t('rec_no_late', 'No window is projected to be missed.')}
            </p>
          ) : (
            <ul className="mt-1 space-y-1">
              {lateStops.map(({ stop, lateMin }, index) => (
                <li key={stop?.id || index} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-4 shrink-0 font-black text-text-muted">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-bold text-text-primary">
                    {stop?.companyName || stop?.city || '—'}
                  </span>
                  <span className="shrink-0 rounded border border-rose-500/30 bg-rose-500/10 px-1 text-[8px] font-black text-rose-600">
                    +{fmtNumber(lateMin, 0)} min
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-text-muted">
            {t('rec_move', 'Move an order to another trip')}
          </p>
          {!riskyStopOrderId ? (
            <p className="text-[10px] text-text-muted">{t('rec_no_order', 'This trip has no order to move.')}</p>
          ) : candidates.length === 0 ? (
            <p className="text-[10px] text-text-muted">{t('rec_no_candidates', 'No other trip with free capacity on this day.')}</p>
          ) : (
            <ul className="space-y-1">
              {candidates.map(({ trip: candidate, free }) => (
                <li
                  key={candidate.id}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2 py-1"
                >
                  <Truck className="h-3 w-3 shrink-0 text-text-muted" />
                  <span className="shrink-0 rounded border border-border px-1 text-[8px] font-black tabular-nums text-text-secondary">
                    {candidate.truck?.plateNumber || '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-text-primary">
                    {candidate.tripNumber || '—'} · {candidate.plannedDeparture ? new Date(candidate.plannedDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                  <span className="shrink-0 text-[8px] font-bold text-text-muted">
                    {free === null ? t('rec_free_unknown', 'free n/a') : `${fmtNumber(free, 0)} ${t('rec_free', 'free')}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onMoveOrder(riskyStopOrderId, candidate)}
                    className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-orange-500 px-1.5 text-[9px] font-black text-white transition-colors hover:bg-orange-600"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {t('rec_move_action', 'Move')}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-[8px] leading-relaxed text-text-muted">
            {t('rec_candidate_note', 'Candidates are filtered by day and free pallet space; the normal assignment preflight still decides.')}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onOpenScenarios}
            className="flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[9px] font-black text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ArrowRight className="h-3 w-3" />
            {t('rec_late_departure', 'Shift the departure')}
          </button>
          <button
            type="button"
            onClick={onSplit}
            className="flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[9px] font-black text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Split className="h-3 w-3" />
            {t('up_split_trip', 'Split trip')}
          </button>
          <button
            type="button"
            onClick={onSubcontract}
            className="flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-[9px] font-black text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserX className="h-3 w-3" />
            {t('up_subcontract', 'Subcontract')}
          </button>
        </div>
      </div>
    </section>
  );
}
