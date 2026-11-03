import { CostEngine } from './cost.engine';

describe('CostEngine authoritative trip costs', () => {
  const routing = {
    getDieselPrices: async () => [{ country: 'RO', price: 1.8 }],
  } as any;

  const trip = {
    distanceKm: 100,
    tollCost: 20,
    plannedDeparture: new Date('2026-11-03T08:00:00Z'),
    plannedArrival: new Date('2026-11-03T18:00:00Z'),
    truck: {
      fuelConsumption: 30,
      fuelPricePerLiter: 1.5,
      maintenanceCostPerKm: 0.1,
      fixedCostPerDay: 10,
    },
    driver: { payMode: 'per_km', payRate: 0.5 },
    stops: [{ country: 'RO' }],
    costs: [{ type: 'parking', amount: 5 }],
  } as any;

  it('builds a complete breakdown from the vehicle and driver profiles', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(trip, 500);

    expect(result.fuelCost).toBe(45); // 100 km × 30 l/100km × 1.5 €/l
    expect(result.tollCost).toBe(20);
    expect(result.driverCost).toBe(50); // 100 km × 0.5 €/km
    expect(result.maintenanceCost).toBe(10); // 100 km × 0.1 €/km
    expect(result.fixedCost).toBe(10); // 1 day × 10 €/day
    expect(result.manualCost).toBe(5);
    expect(result.total).toBe(140);
    expect(result.estimatedFields).toEqual([]);
    expect(result.breakdown.map((item) => item.type)).toEqual(
      expect.arrayContaining(['fuel', 'toll', 'driver', 'maintenance', 'fixed', 'parking']),
    );
  });

  it('flags a missing fuel consumption instead of pretending it is configured', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      { ...trip, truck: { ...trip.truck, fuelConsumption: null } } as any,
      500,
    );
    expect(result.estimatedFields).toContain('fuelConsumption');
    expect(result.fuelCost).toBeGreaterThan(0); // default estimate is explicitly flagged
  });

  it('flags the default driver day rate when no driver profile exists', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts({ ...trip, driver: null } as any, 500);
    expect(result.driverCostSource).toBe('default_estimate');
    expect(result.estimatedFields).toContain('driverCost');
  });
});
