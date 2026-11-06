// Single source of truth for "who is driving this trip?".
//
// A trip may carry its own driver, or may be planned on a truck that already
// has a driver. The driver mobile app can only fetch trips scoped to the
// authenticated driver, so both dispatch and the driver queries must resolve
// the assignment the same way.

export function resolveTripDriver(trip: any) {
  return trip?.driver || trip?.truck?.driver || null;
}

/**
 * Resolves the driver a trip belongs to and records where that assignment came
 * from. The trip-level driver always wins; a driver attached to the assigned
 * truck is a confirmed assignment only when the backend resolved it from the
 * truck that is actually on the trip. The mobile app uses `confirmed` and
 * `source` to avoid inventing a driver of its own.
 */
export function resolveTripDriverAssignment(trip: any) {
  const direct = trip?.driver || null;
  if (direct) return { driver: direct, source: 'trip' as const, confirmed: true };
  const truckDriver = trip?.truck?.driver || null;
  if (truckDriver) return { driver: truckDriver, source: 'truck' as const, confirmed: true };
  return { driver: null, source: null, confirmed: false };
}

export function resolveTripTrailer(trip: any) {
  return trip?.trailer || trip?.truck?.trailer || null;
}
