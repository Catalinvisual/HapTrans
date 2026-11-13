// Pure date arithmetic for "move these orders N days".
//
// Bulk re-dating shifts the customer's requested dates, not the plan: the
// dispatcher asks the customer to accept a new date and the whole order moves
// by the same number of days. An order that is already being driven must never
// jump dates silently, so the caller skips it and reports why.

export const MAX_BULK_SHIFT_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Shift a date-only value ("YYYY-MM-DD") by whole days.
 *
 * Date-only strings are parsed as UTC on purpose: the stored value is a
 * calendar day, and a local-time parse would move it across midnight for
 * anyone east or west of UTC.
 */
export function shiftDateOnly(value: string | null | undefined, days: number): string | null {
  if (!value) return null;
  const raw = String(value).slice(0, 10);
  const parts = raw.split('-').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return null;
  const [year, month, day] = parts;
  const time = Date.UTC(year, month - 1, day) + days * DAY_MS;
  return new Date(time).toISOString().slice(0, 10);
}

export interface BulkShiftStopInput {
  id: string;
  dateFrom?: string | null;
  dateTo?: string | null;
}

export interface BulkShiftStopResult {
  id: string;
  dateFrom: string | null;
  dateTo: string | null;
}

export function shiftOrderStops(stops: BulkShiftStopInput[] | null | undefined, days: number): BulkShiftStopResult[] {
  return (Array.isArray(stops) ? stops : [])
    .filter((stop) => Boolean(stop?.id))
    .map((stop) => ({
      id: String(stop.id),
      dateFrom: shiftDateOnly(stop.dateFrom, days),
      dateTo: shiftDateOnly(stop.dateTo, days),
    }));
}

export class BulkShiftDaysError extends Error {
  constructor(public readonly reason: 'invalid' | 'max') {
    super(reason);
  }
}

/** Whole non-zero days within the accepted range, or a typed error. */
export function validateShiftDays(days: unknown): number {
  const value = Number(days);
  if (!Number.isInteger(value) || value === 0) throw new BulkShiftDaysError('invalid');
  if (Math.abs(value) > MAX_BULK_SHIFT_DAYS) throw new BulkShiftDaysError('max');
  return value;
}

const LIVE_TRIP_STATUSES = ['in_transit', 'en_route_to_pickup', 'at_pickup', 'loading', 'at_delivery', 'unloading', 'delivered', 'completed'];

/** An order on a trip that is already running keeps its dates. */
export function canShiftOrder(order: any): boolean {
  const trip = order?.trip;
  if (!trip) return true;
  const operational = String(trip.operationalStatus || '').toLowerCase();
  if (operational && LIVE_TRIP_STATUSES.includes(operational)) return false;
  const status = String(trip.status || '').toLowerCase();
  if (status && LIVE_TRIP_STATUSES.includes(status)) return false;
  if (trip.sentToDriverAt || trip.actualDeparture) return false;
  return true;
}
