import {
  missingVehicleRestrictions,
  resolveRouteRestrictionsState,
  vehicleRestrictionValues,
  vehicleRestrictionsSignature,
  vehicleRestrictionsState,
} from './vehicle-restriction-status';

const truck = { heightCm: 350, widthCm: 255, lengthCm: 1650, axleCount: 3, maxWeightKg: 40000 };
const trailer = { heightCm: 400, widthCm: 255, lengthCm: 1360, axleCount: 3 };

describe('vehicle restriction status', () => {
  it('combines truck and trailer dimensions and sums axles', () => {
    expect(vehicleRestrictionValues(truck, trailer)).toEqual({
      height: 400,
      width: 255,
      length: 1650,
      axles: 6,
      grossWeight: 40000,
    });
  });

  it('falls back to the persisted plan weight when the truck has none', () => {
    const values = vehicleRestrictionValues({ ...truck, maxWeightKg: null }, trailer, 40924);
    expect(values.grossWeight).toBe(40924);
  });

  it('reports only the fields that are genuinely absent', () => {
    const values = vehicleRestrictionValues(
      { ...truck, heightCm: null, widthCm: 0 },
      { ...trailer, heightCm: null, widthCm: null },
    );
    expect(missingVehicleRestrictions(values)).toEqual(['height', 'width']);
    expect(vehicleRestrictionsState(missingVehicleRestrictions(values))).toBe('missing_vehicle_data');
  });

  it('treats complete data as verified', () => {
    const values = vehicleRestrictionValues(truck, trailer);
    expect(missingVehicleRestrictions(values)).toEqual([]);
    expect(vehicleRestrictionsState([])).toBe('vehicle_data_verified');
  });

  it('changes the signature whenever a restriction changes', () => {
    const base = vehicleRestrictionsSignature(vehicleRestrictionValues(truck, trailer));
    // The trailer is the taller unit (400 cm), so only a change to the
    // effective height may invalidate the route.
    const tallerTrailer = vehicleRestrictionsSignature(vehicleRestrictionValues(truck, { ...trailer, heightCm: 420 }));
    expect(tallerTrailer).not.toBe(base);
    expect(vehicleRestrictionsSignature(vehicleRestrictionValues(truck, trailer))).toBe(base);
  });

  it('requires a recalculation while vehicle data is still missing', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: ['height'],
        currentSignature: '0|255|1650|6|40000',
        storedSignature: '0|255|1650|6|40000',
        routeStatus: 'calculated',
      }),
    ).toBe('missing_vehicle_data');
  });

  it('reports a failed recalculation', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: [],
        currentSignature: '400|255|1650|6|40000',
        storedSignature: '400|255|1650|6|40000',
        routeStatus: 'failed',
      }),
    ).toBe('route_recalculation_failed');
  });

  it('requires a recalculation when the stored signature differs', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: [],
        currentSignature: '400|255|1650|6|40000',
        storedSignature: '0|0|0|0|40000',
        routeStatus: 'calculated',
      }),
    ).toBe('route_recalculation_required');
  });

  it('requires a recalculation when no signature was ever stored', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: [],
        currentSignature: '400|255|1650|6|40000',
        storedSignature: null,
        routeStatus: 'calculated',
      }),
    ).toBe('route_recalculation_required');
  });

  it('is recalculated when the stored signature matches the current data', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: [],
        currentSignature: '400|255|1650|6|40000',
        storedSignature: '400|255|1650|6|40000',
        routeStatus: 'calculated',
      }),
    ).toBe('route_recalculated');
  });

  it('does not claim a route exists for an incomplete sequence', () => {
    expect(
      resolveRouteRestrictionsState({
        missingFields: [],
        currentSignature: '400|255|1650|6|40000',
        storedSignature: '400|255|1650|6|40000',
        routeStatus: 'incomplete',
      }),
    ).toBe('vehicle_data_verified');
  });
});
