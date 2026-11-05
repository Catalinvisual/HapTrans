// Vehicle restriction status for the truck route planner.
//
// The status is deliberately split in two:
//  - `vehicleRestrictionsState` only answers "is the vehicle data complete?".
//  - `routeRestrictionsState` answers "does the persisted route still match
//    that vehicle data?".
// A verified vehicle is therefore never reported as a recalculated route.
//
// The route plan stores the restriction signature that was used when the HGV
// road route was last calculated. Comparing it with the current truck/trailer
// data is what makes the recalculation notice survive a page refresh without
// firing for unrelated changes (driver, pallets, timetable, ...).

export const VEHICLE_RESTRICTION_FIELDS = ['height', 'width', 'length', 'axles', 'grossWeight'] as const;

export type VehicleRestrictionField = (typeof VEHICLE_RESTRICTION_FIELDS)[number];

export type VehicleRestrictionsState = 'missing_vehicle_data' | 'vehicle_data_verified';

export type RouteRestrictionsState =
  | 'missing_vehicle_data'
  | 'vehicle_data_verified'
  | 'route_recalculation_required'
  | 'route_recalculated'
  | 'route_recalculation_failed';

export interface VehicleRestrictionValues {
  height: number;
  width: number;
  length: number;
  axles: number;
  grossWeight: number;
}

/** Largest positive value of the given readings, or 0 when none is usable. */
function maxPositive(...values: any[]): number {
  const numbers = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return numbers.length ? Math.max(...numbers) : 0;
}

/**
 * Effective HGV restrictions of the truck + trailer combination. Dimensions
 * take the larger of the two units (a trailer can be taller/longer than the
 * tractor), axles are summed, gross weight comes from the tractor.
 */
export function vehicleRestrictionValues(
  truck: any,
  trailer: any,
  fallbackGrossWeightKg?: any,
): VehicleRestrictionValues {
  return {
    height: maxPositive(truck?.heightCm, trailer?.heightCm),
    width: maxPositive(truck?.widthCm, trailer?.widthCm),
    length: maxPositive(truck?.lengthCm, trailer?.lengthCm),
    axles: maxPositive(truck?.axleCount) + maxPositive(trailer?.axleCount),
    grossWeight: maxPositive(truck?.maxWeightKg, fallbackGrossWeightKg),
  };
}

/** Only genuinely absent restrictions, in a stable field order. */
export function missingVehicleRestrictions(values: VehicleRestrictionValues): VehicleRestrictionField[] {
  return VEHICLE_RESTRICTION_FIELDS.filter((field) => !(Number(values[field]) > 0));
}

/**
 * Stable fingerprint of the restrictions a route was calculated with. Zero
 * (missing) readings are part of the signature so completing a field always
 * changes it and invalidates the previous verification.
 */
export function vehicleRestrictionsSignature(values: VehicleRestrictionValues): string {
  return VEHICLE_RESTRICTION_FIELDS
    .map((field) => {
      const rounded = Math.round((Number(values[field]) || 0) * 10) / 10;
      return String(rounded);
    })
    .join('|');
}

export function vehicleRestrictionsState(missingFields: VehicleRestrictionField[]): VehicleRestrictionsState {
  return missingFields.length ? 'missing_vehicle_data' : 'vehicle_data_verified';
}

export interface RouteRestrictionsStateInput {
  missingFields: VehicleRestrictionField[];
  currentSignature: string;
  storedSignature?: string | null;
  routeStatus?: string | null;
}

export function resolveRouteRestrictionsState({
  missingFields,
  currentSignature,
  storedSignature,
  routeStatus,
}: RouteRestrictionsStateInput): RouteRestrictionsState {
  if (missingFields.length) return 'missing_vehicle_data';

  const status = String(routeStatus || '').toLowerCase();
  if (status === 'failed') return 'route_recalculation_failed';

  // No signature means the route was never calculated with tracked vehicle
  // data; the current data still has to be applied by a recalculation.
  if (!storedSignature) return 'route_recalculation_required';
  if (storedSignature !== currentSignature) return 'route_recalculation_required';

  // A plan without a usable stop sequence has no road route yet; the
  // "incomplete" hint already covers that case.
  if (status === 'incomplete') return 'vehicle_data_verified';

  return 'route_recalculated';
}
