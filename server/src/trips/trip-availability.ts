/**
 * Canonical resource availability rules shared by Planning, assignment,
 * confirmation and recommendations. A trip occupies a resource only during
 * its real scheduled interval and only while it is not terminal. A completed
 * trip is history: it never reserves a truck, trailer or driver for later work.
 */

export const TERMINAL_TRIP_STATUSES = [
  'completed',
  'closed',
  'cancelled',
  'canceled',
  'delivered',
  'invoiced',
  'paid',
] as const;

export const ACTIVE_TRIP_STATUSES = [
  'planning',
  'planned',
  'confirmed',
  'assigned',
  'dispatched',
  'driver_received',
  'driver_accepted',
  'started',
  'at_pickup',
  'loading',
  'driving',
  'at_delivery',
  'unloading',
  'partially_delivered',
  'in_transit',
] as const;

export type TripInterval = { start: number; end: number };

const asTime = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export function normalizeTripStatus(value: any): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isTerminalTripStatus(value: any): boolean {
  return (TERMINAL_TRIP_STATUSES as readonly string[]).includes(normalizeTripStatus(value));
}

export function isActiveTrip(trip: any): boolean {
  return Boolean(trip) && !isTerminalTripStatus(trip?.status) && !isTerminalTripStatus(trip?.operationalStatus);
}

/**
 * The scheduled occupation interval. We only use real timestamps: planned
 * trip dates first, then the ordered stop windows. If the end is unknown we
 * deliberately return null instead of inventing a duration, because a made-up
 * interval would create false conflicts or false availability.
 */
export function tripInterval(trip: any): TripInterval | null {
  if (!trip) return null;
  const stops = [...(Array.isArray(trip.stops) ? trip.stops : [])]
    .filter(Boolean)
    .sort((a, b) => Number(a.sequence || a.stopOrder || 0) - Number(b.sequence || b.stopOrder || 0));
  const stopStart = stops
    .map((s) => asTime(s.timeWindowMin ?? s.plannedArrival ?? s.eta))
    .find((v) => v !== null) ?? null;
  const stopEnd = [...stops]
    .reverse()
    .map((s) => asTime(s.timeWindowMax ?? s.completedAt ?? s.ata ?? s.timeWindowMin ?? s.eta))
    .find((v) => v !== null) ?? null;

  const start = asTime(trip.plannedDeparture) ?? asTime(trip.actualDeparture) ?? stopStart;
  const end = asTime(trip.plannedArrival) ?? asTime(trip.actualArrival) ?? stopEnd;
  if (start === null || end === null || end <= start) return null;
  return { start, end };
}

/** Half-open interval comparison: touching trips are sequential, not overlapping. */
export function intervalsOverlap(a: TripInterval | null, b: TripInterval | null): boolean {
  if (!a || !b) return false;
  return a.start < b.end && a.end > b.start;
}

export function overlapInterval(a: TripInterval, b: TripInterval): TripInterval {
  return { start: Math.max(a.start, b.start), end: Math.min(a.end, b.end) };
}

export function tripOverlaps(a: any, b: any): boolean {
  if (!isActiveTrip(a) || !isActiveTrip(b)) return false;
  return intervalsOverlap(tripInterval(a), tripInterval(b));
}

export function intervalContains(interval: TripInterval | null, at: Date | number = new Date()): boolean {
  if (!interval) return false;
  const ms = at instanceof Date ? at.getTime() : at;
  return ms >= interval.start && ms < interval.end;
}

export function startOfDay(at: Date = new Date()): Date {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(at: Date = new Date()): Date {
  const d = new Date(at);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** The resource is occupied right now, not merely on the board's date range. */
export function isResourceBusyNow(trips: any[], at: Date = new Date()): boolean {
  return (trips || []).some((trip) => isActiveTrip(trip) && intervalContains(tripInterval(trip), at));
}

export function isResourcePlannedOn(trips: any[], at: Date = new Date()): boolean {
  const day = { start: startOfDay(at).getTime(), end: endOfDay(at).getTime() };
  return (trips || []).some((trip) => isActiveTrip(trip) && intervalsOverlap(tripInterval(trip), day));
}

export function tripStatusIsOperational(value: any): boolean {
  return [
    'started', 'at_pickup', 'loading', 'driving', 'at_delivery', 'unloading', 'partially_delivered', 'in_transit',
  ].includes(normalizeTripStatus(value));
}