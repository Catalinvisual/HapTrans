/**
 * Single source of truth for trip resource assignment.
 *
 * Resolution order:
 *   driver:  explicit trip driver → truck default driver → subcontractor carrier driver → missing
 *   trailer: explicit trip trailer → truck attached trailer → carrier trailer plate → missing
 *
 * A truck default is never reported as an explicit trip assignment: the source
 * is returned so the UI and validation can label it correctly.
 */

export type AssignmentSource = 'assigned' | 'truck' | 'carrier' | 'none';

export interface ResolvedDriverAssignment {
  entity: any | null;
  source: AssignmentSource;
  name: string | null;
}

export interface ResolvedTrailerAssignment {
  entity: any | null;
  source: AssignmentSource;
  plate: string | null;
}

function driverName(driver: any): string | null {
  const raw = String(driver?.user?.name || driver?.name || driver?.user?.email || '').trim();
  return raw || null;
}

export function resolveTripDriver(trip: any): ResolvedDriverAssignment {
  if (trip?.driver?.id) {
    return { entity: trip.driver, source: 'assigned', name: driverName(trip.driver) };
  }
  const truckDriver = trip?.truck?.driver;
  if (truckDriver?.id) {
    return { entity: truckDriver, source: 'truck', name: driverName(truckDriver) };
  }
  const carrierName = String(trip?.carrierDriverName || '').trim();
  if (carrierName) {
    return { entity: null, source: 'carrier', name: carrierName };
  }
  return { entity: null, source: 'none', name: null };
}

export function resolveTripTrailer(trip: any): ResolvedTrailerAssignment {
  if (trip?.trailer?.id) {
    return {
      entity: trip.trailer,
      source: 'assigned',
      plate: String(trip.trailer.plateNumber || '').trim() || null,
    };
  }
  const truckTrailer = trip?.truck?.trailer;
  if (truckTrailer?.id) {
    return {
      entity: truckTrailer,
      source: 'truck',
      plate: String(truckTrailer.plateNumber || '').trim() || null,
    };
  }
  const carrierPlate = String(trip?.carrierTrailerPlate || '').trim();
  if (carrierPlate) {
    return { entity: null, source: 'carrier', plate: carrierPlate };
  }
  return { entity: null, source: 'none', plate: null };
}

/** Driver resolved for compliance checks, falling back to a fully loaded record. */
export function resolveDriverForCompliance(trip: any, driversById: Record<string, any>): any | null {
  const resolved = resolveTripDriver(trip);
  const id = resolved.entity?.id;
  if (id && driversById[id]) return driversById[id];
  return resolved.entity || null;
}
