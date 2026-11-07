/**
 * Loading-window assessment.
 *
 * A loading window can only be missed when the vehicle actually arrives after
 * the window closes. Comparing the trip departure with the window *start*
 * (the previous behaviour) flags trips that leave before the window opens or
 * ignores a late arrival at the pickup, which is not an operational conflict.
 *
 * Everything here is best-effort: when the arrival or the window end is not
 * recorded, the assessment is `unverified` and no warning is emitted.
 */

export type LoadingWindowStatus = 'ok' | 'late' | 'unverified';

export interface LoadingWindowAssessment {
  status: LoadingWindowStatus;
  arrivalAt: string | null;
  windowEndAt: string | null;
  lateMinutes: number | null;
  reason: 'arrived_within_window' | 'arrived_after_window' | 'missing_arrival' | 'missing_window';
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

const LOAD_STOP_TYPES = ['pickup', 'load'];
const UNLOAD_STOP_TYPES = ['delivery', 'dropoff', 'unload'];

export function isLoadStopType(value: unknown): boolean {
  return LOAD_STOP_TYPES.includes(String(value || '').toLowerCase());
}

export function isUnloadStopType(value: unknown): boolean {
  return UNLOAD_STOP_TYPES.includes(String(value || '').toLowerCase());
}

/** The end of a stop's time window, from the explicit field or date + time. */
export function stopWindowEnd(stop: any): Date | null {
  if (!stop) return null;
  const explicit = toDate(stop.timeWindowMax) || toDate(stop.timeWindowTo);
  if (explicit) return explicit;
  if (stop.dateFrom) {
    const value = toDate(`${String(stop.dateFrom).slice(0, 10)}T${stop.timeUntil || '23:59'}:00`);
    if (value) return value;
  }
  return null;
}

/** The start of a stop's time window. */
export function stopWindowStart(stop: any): Date | null {
  if (!stop) return null;
  const explicit = toDate(stop.timeWindowMin) || toDate(stop.timeWindowFrom);
  if (explicit) return explicit;
  if (stop.dateFrom) {
    const value = toDate(`${String(stop.dateFrom).slice(0, 10)}T${stop.timeFrom || '00:00'}:00`);
    if (value) return value;
  }
  return null;
}

/**
 * The window in which the order must be loaded: the last pickup/load stop of
 * the order. Orders without their own stops have no verifiable loading window.
 */
export function orderPickupWindow(order: any): { start: Date | null; end: Date | null; stop: any | null } {
  const stops = Array.isArray(order?.stops) ? order.stops : [];
  const loadStops = stops
    .filter((stop: any) => isLoadStopType(stop?.type))
    .sort((a: any, b: any) => (Number(a?.sequence) || 0) - (Number(b?.sequence) || 0));
  const stop = loadStops[loadStops.length - 1] || null;
  if (!stop) return { start: null, end: null, stop: null };
  return { start: stopWindowStart(stop), end: stopWindowEnd(stop), stop };
}

export function assessLoadingWindow(arrival: unknown, windowEnd: unknown): LoadingWindowAssessment {
  const arrivalDate = toDate(arrival);
  const endDate = toDate(windowEnd);
  if (!arrivalDate) {
    return { status: 'unverified', arrivalAt: null, windowEndAt: endDate?.toISOString() || null, lateMinutes: null, reason: 'missing_arrival' };
  }
  if (!endDate) {
    return { status: 'unverified', arrivalAt: arrivalDate.toISOString(), windowEndAt: null, lateMinutes: null, reason: 'missing_window' };
  }
  const lateMinutes = Math.round((arrivalDate.getTime() - endDate.getTime()) / 60000);
  if (lateMinutes > 0) {
    return { status: 'late', arrivalAt: arrivalDate.toISOString(), windowEndAt: endDate.toISOString(), lateMinutes, reason: 'arrived_after_window' };
  }
  return { status: 'ok', arrivalAt: arrivalDate.toISOString(), windowEndAt: endDate.toISOString(), lateMinutes: 0, reason: 'arrived_within_window' };
}

/**
 * Arrival at a stop. Only recorded values are used; a missing arrival stays
 * null so the caller reports "unverified" instead of inventing a time.
 */
export function stopArrival(stop: any, tripDeparture?: unknown, isFirstStop = false): Date | null {
  if (!stop) return null;
  const explicit =
    toDate(stop.eta) ||
    toDate(stop.calculatedEta) ||
    toDate(stop.plannedArrival) ||
    toDate(stop.arrivalAt) ||
    toDate(stop.timeWindowMin);
  if (explicit) return explicit;
  return isFirstStop ? toDate(tripDeparture) : null;
}
