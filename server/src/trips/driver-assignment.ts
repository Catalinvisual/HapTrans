// Single source of truth for "who is driving this trip?".
//
// A trip may carry its own driver, or may be planned on a truck that already
// has a driver. The driver mobile app can only fetch trips scoped to the
// authenticated driver, so both dispatch and the driver queries must resolve
// the assignment the same way.

export function resolveTripDriver(trip: any) {
  return trip?.driver || trip?.truck?.driver || null;
}

export function resolveTripTrailer(trip: any) {
  return trip?.trailer || trip?.truck?.trailer || null;
}
