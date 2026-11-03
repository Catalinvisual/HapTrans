import { resolveTripDriver, resolveTripTrailer, resolveDriverForCompliance } from './trip-assignment';

describe('trip assignment resolution', () => {
  const truckDriver = { id: 'driver-truck', user: { name: 'Truck Default' } };
  const truckTrailer = { id: 'trailer-truck', plateNumber: 'TR-999' };

  it('prefers the explicit trip driver and marks it as assigned', () => {
    const trip = { driver: { id: 'driver-trip', user: { name: 'Explicit Driver' } }, truck: { driver: truckDriver } };
    const result = resolveTripDriver(trip);
    expect(result.source).toBe('assigned');
    expect(result.entity.id).toBe('driver-trip');
    expect(result.name).toBe('Explicit Driver');
  });

  it('falls back to the truck driver and marks it as a truck default', () => {
    const trip = { truck: { driver: truckDriver } };
    const result = resolveTripDriver(trip);
    expect(result.source).toBe('truck');
    expect(result.entity.id).toBe('driver-truck');
  });

  it('uses the carrier driver for subcontractor trips', () => {
    const trip = { fleetType: 'subcontractor', carrierDriverName: 'Carrier Driver' };
    const result = resolveTripDriver(trip);
    expect(result.source).toBe('carrier');
    expect(result.name).toBe('Carrier Driver');
  });

  it('reports a genuinely missing driver', () => {
    const result = resolveTripDriver({ truck: {} });
    expect(result.source).toBe('none');
    expect(result.entity).toBeNull();
  });

  it('resolves the explicit trailer first, then the truck trailer', () => {
    expect(resolveTripTrailer({ trailer: { id: 'trailer-trip', plateNumber: 'TR-111' }, truck: { trailer: truckTrailer } })).toMatchObject({
      source: 'assigned',
      plate: 'TR-111',
    });
    expect(resolveTripTrailer({ truck: { trailer: truckTrailer } })).toMatchObject({
      source: 'truck',
      plate: 'TR-999',
    });
    expect(resolveTripTrailer({ carrierTrailerPlate: 'C-123' })).toMatchObject({
      source: 'carrier',
      plate: 'C-123',
    });
    expect(resolveTripTrailer({})).toMatchObject({ source: 'none', plate: null });
  });

  it('uses the fully loaded driver record for compliance when available', () => {
    const trip = { truck: { driver: truckDriver } };
    const loaded = { id: 'driver-truck', licenseExpiry: '2027-01-01' };
    expect(resolveDriverForCompliance(trip, { 'driver-truck': loaded })).toBe(loaded);
  });
});
