import {
  bearingDifferenceDeg,
  bearingDeg,
  haversineKm,
  pointOf,
  rankNearbyOrders,
} from './nearby-search';

const AMSTERDAM = { lat: 52.3702, lng: 4.8952 };
const UTRECHT = { lat: 52.0907, lng: 5.1214 };
const ROTTERDAM = { lat: 51.9244, lng: 4.4777 };

const order = (id: string, pickup: any, overrides: any = {}) => ({
  id,
  orderNumber: `ORD-${id}`,
  client: { name: 'Client' },
  priority: 'normal',
  stops: [
    { id: `${id}-p`, type: 'pickup', city: 'Utrecht', ...pickup },
    { id: `${id}-d`, type: 'delivery', city: 'Berlin', latitude: 52.52, longitude: 13.405 },
  ],
  cargoItems: [{ unit: 'pallet', quantity: 10, weightKg: 5000, ldm: 6 }],
  ...overrides,
});

describe('nearby-search geometry', () => {
  it('measures Amsterdam–Utrecht in the expected order of magnitude', () => {
    const km = haversineKm(AMSTERDAM, UTRECHT);
    expect(km).toBeGreaterThan(30);
    expect(km).toBeLessThan(45);
  });

  it('computes a northbound bearing close to north', () => {
    const bearing = bearingDeg({ lat: 52, lng: 5 }, { lat: 53, lng: 5 });
    expect(bearingDifferenceDeg(bearing, 0)).toBeLessThan(1);
  });

  it('treats a failed geocode (0,0) as no coordinate', () => {
    expect(pointOf({ latitude: 0, longitude: 0 })).toBeNull();
    expect(pointOf({ latitude: '52.09', longitude: '5.12' })).toEqual({ lat: 52.09, lng: 5.12 });
    expect(pointOf({})).toBeNull();
  });

  it('returns orders inside the radius and drops those outside it', () => {
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 40,
      orders: [order('near', UTRECHT), order('far', ROTTERDAM)],
    });
    expect(result.candidates.map((c) => c.orderId)).toEqual(['near']);
    expect(result.candidates[0].distanceBasis).toBe('greatCircle');
  });

  it('prefers a load that lies on the way to the next stop', () => {
    const NORTH = { lat: 53.4, lng: 4.9 };
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 200,
      // The truck is heading south-east to Utrecht; a load in the north is a
      // detour, the Utrecht one is on the way.
      nextPoint: UTRECHT,
      orders: [order('north', NORTH), order('utrecht', UTRECHT)],
    });
    expect(result.candidates[0].orderId).toBe('utrecht');
    expect(result.candidates[0].onTheWay).toBe(true);
    expect(result.candidates[1].onTheWay).toBe(false);
    expect(result.candidates[0].detourAngleDeg).not.toBeNull();
    expect(result.candidates[0].detourAngleDeg as number).toBeLessThan(result.candidates[1].detourAngleDeg as number);
  });

  it('reports how many orders could not be placed instead of hiding them', () => {
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 100,
      orders: [order('nogeo', { latitude: null, longitude: null }, { stops: [{ type: 'pickup', city: 'Nowhere' }] })],
    });
    expect(result.candidates).toHaveLength(0);
    expect(result.withoutCoordinates).toBe(1);
  });

  it('flags an order that cannot fit the free capacity but still returns it', () => {
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 100,
      capacity: { maxWeightKg: 1000, maxPallets: 33, maxLdm: 13.6 },
      orders: [order('heavy', UTRECHT)],
    });
    expect(result.candidates[0].capacityFit).toBe('over');
  });

  it('marks capacity unverified when the vehicle limits are unknown', () => {
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 100,
      capacity: null,
      orders: [order('heavy', UTRECHT)],
    });
    expect(result.candidates[0].capacityFit).toBe('unverified');
  });

  it('estimates the empty-km saving from the great-circle distance', () => {
    const result = rankNearbyOrders({ origin: AMSTERDAM, radiusKm: 100, orders: [order('near', UTRECHT)] });
    expect(result.candidates[0].emptyKmSavingEstimateKm).toBe(result.candidates[0].pickupDistanceKm);
  });

  it('sorts orders that do not fit after the ones that do', () => {
    const result = rankNearbyOrders({
      origin: AMSTERDAM,
      radiusKm: 100,
      capacity: { maxWeightKg: 1000, maxPallets: 33, maxLdm: 13.6 },
      orders: [
        order('heavy', UTRECHT),
        order('light', UTRECHT, { cargoItems: [{ unit: 'pallet', quantity: 1, weightKg: 100 }] }),
      ],
    });
    expect(result.candidates[0].orderId).toBe('light');
    expect(result.candidates[1].capacityFit).toBe('over');
  });
});
