/**
 * Deterministic matching between an order's stops and the trip stops that
 * represent them.
 *
 * The previous implementation walked both lists by index and picked the first
 * unused trip stop of the wanted type. That is not stable when a trip already
 * contains two stops of the same type (a legacy duplicate, a re-added order, a
 * rebuild interrupted midway): a second run can consume the *other* copy, the
 * two screens then disagree about which stop carries the appointment, and the
 * duplicate keeps being updated instead of surfaced.
 *
 * This module only decides *which* order stop maps to *which* trip stop, from
 * stable fields (type, sequence, id). It never writes, never deletes and never
 * reorders the inputs, so repeated synchronization resolves to the same pairs.
 */

export interface SyncOrderStopLike {
  id?: string | null;
  sequence?: number | string | null;
  type?: string | null;
}

export interface SyncTripStopLike {
  id?: string | null;
  sequence?: number | string | null;
  type?: string | null;
}

export interface StopSyncPair<T extends SyncOrderStopLike, R extends SyncTripStopLike> {
  orderStop: T;
  tripStop: R;
}

export interface StopSyncDuplicate {
  /** The order stop whose type has more than one trip stop candidate. */
  orderStopId: string;
  /** Every candidate, in the deterministic order used for matching. */
  tripStopIds: string[];
  /** The candidate a synchronization writes to. */
  chosenTripStopId: string;
}

export interface StopSyncPlan<T extends SyncOrderStopLike, R extends SyncTripStopLike> {
  pairs: Array<StopSyncPair<T, R>>;
  duplicates: StopSyncDuplicate[];
  /** Trip stops that represent none of this order's stops. */
  unmatchedTripStopIds: string[];
}

type StopKind = 'pickup' | 'delivery' | 'stop';

const kindOf = (value: unknown): StopKind | null => {
  const type = String(value || '').toLowerCase();
  if (['pickup', 'load', 'loading'].includes(type)) return 'pickup';
  if (['delivery', 'dropoff', 'drop', 'unload', 'unloading'].includes(type)) return 'delivery';
  if (type === 'stop') return 'stop';
  return null;
};

const sequenceOf = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.MAX_SAFE_INTEGER;
};

const idOf = (value: { id?: string | null }): string => String(value?.id || '');

/** Stable order: sequence, then id, so the same data always matches the same way. */
const stable = <T extends { id?: string | null; sequence?: number | string | null }>(stops: T[]): T[] =>
  [...stops].sort((a, b) => sequenceOf(a.sequence) - sequenceOf(b.sequence) || idOf(a).localeCompare(idOf(b)));

/**
 * A single order stop is a whole operation on its own (one pickup, one
 * delivery); with two or more, the first is the pickup, the last the delivery
 * and anything between is an intermediate stop.
 */
export function expectedKindAt(index: number, total: number): StopKind | null {
  if (total <= 1) return null;
  if (index === 0) return 'pickup';
  if (index === total - 1) return 'delivery';
  return 'stop';
}

export function planOrderStopSync<T extends SyncOrderStopLike, R extends SyncTripStopLike>(
  orderStops: T[],
  tripStops: R[],
): StopSyncPlan<T, R> {
  const orderedOrderStops = stable(orderStops || []);
  const orderedTripStops = stable(tripStops || []);
  const used = new Set<string>();
  const pairs: StopSyncPair<T, R>[] = [];
  const duplicates: StopSyncDuplicate[] = [];

  for (let index = 0; index < orderedOrderStops.length; index += 1) {
    const orderStop = orderedOrderStops[index];
    const wanted = expectedKindAt(index, orderedOrderStops.length);
    const candidates = orderedTripStops.filter((stop) => {
      if (used.has(idOf(stop))) return false;
      const kind = kindOf(stop.type);
      return wanted === null ? true : kind === wanted || (wanted === 'stop' && kind === 'stop');
    });
    if (!candidates.length) continue;
    const chosen = candidates[0];
    used.add(idOf(chosen));
    pairs.push({ orderStop, tripStop: chosen });
    if (candidates.length > 1 && wanted !== null) {
      duplicates.push({
        orderStopId: idOf(orderStop),
        tripStopIds: candidates.map(idOf),
        chosenTripStopId: idOf(chosen),
      });
    }
  }

  return {
    pairs,
    duplicates,
    unmatchedTripStopIds: orderedTripStops.filter((stop) => !used.has(idOf(stop))).map(idOf),
  };
}
