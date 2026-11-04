import { CostEngine } from './cost.engine';

describe('CostEngine authoritative trip costs', () => {
  const routing = {
    getDieselPrices: async () => [{ country: 'RO', price: 1.8 }],
  } as any;

  const truck = {
    fuelConsumption: 30,
    fuelPricePerLiter: 1.5,
    maintenanceCostPerKm: 0.1,
    fixedCostPerDay: 10,
  };

  const trip = {
    distanceKm: 100,
    tollCost: 20,
    plannedDeparture: new Date('2026-11-03T08:00:00Z'),
    plannedArrival: new Date('2026-11-03T18:00:00Z'),
    truck,
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
    expect(result.driverCostSource).toBe('per_km');
    expect(result.driverDistanceKm).toBe(100);
    expect(result.maintenanceCost).toBe(10); // 100 km × 0.1 €/km
    expect(result.fixedCost).toBe(10); // 1 day × 10 €/day
    expect(result.manualCost).toBe(5);
    expect(result.total).toBe(140);
    expect(result.estimatedFields).toEqual([]);
    expect(result.breakdown.map((item) => item.type)).toEqual(
      expect.arrayContaining(['fuel', 'toll', 'driver', 'maintenance', 'fixed', 'parking']),
    );
  });

  it('uses a configured per-km driver rate without inventing another basis', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      {
        ...trip,
        distanceKm: 1000,
        driver: { payMode: 'per_km', payRate: 0.26 },
      } as any,
      500,
    );
    expect(result.driverCost).toBe(260);
    expect(result.driverCostSource).toBe('per_km');
    expect(result.breakdown.find((item) => item.type === 'driver')?.description).toContain('trip distance');
  });

  it('applies a per-trip driver rate exactly once, independent of distance', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      {
        ...trip,
        distanceKm: 839,
        driver: { payMode: 'per_trip', payRate: 417 },
      } as any,
      500,
    );
    expect(result.driverCost).toBe(417);
    expect(result.driverCostSource).toBe('per_trip');
  });

  it('resolves the driver inherited from the truck default assignment', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      {
        ...trip,
        driver: null,
        distanceKm: 1000,
        truck: { ...truck, driver: { id: 'truck-driver', payMode: 'per_km', payRate: 0.26 } },
      } as any,
      500,
    );
    expect(result.driverCost).toBe(260);
    expect(result.driverCostSource).toBe('per_km');
  });

  it('lets an explicit trip driver override the truck default driver', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      {
        ...trip,
        distanceKm: 1000,
        driver: { id: 'explicit', payMode: 'per_trip', payRate: 417 },
        truck: { ...truck, driver: { id: 'truck-driver', payMode: 'per_km', payRate: 0.26 } },
      } as any,
      500,
    );
    expect(result.driverCost).toBe(417);
    expect(result.driverCostSource).toBe('per_trip');
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

  it('does not invent a driver cost when no profile is available', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts({ ...trip, driver: null } as any, 500);
    expect(result.driverCostSource).toBe('unavailable');
    expect(result.driverCost).toBe(0);
    expect(result.estimatedFields).toContain('driverCost');
  });

  it('does not invent a per-km driver cost when the trip distance is missing', async () => {
    const engine = new CostEngine(routing);
    const result = await engine.calculateTripCosts(
      { ...trip, distanceKm: 0, driver: { payMode: 'per_km', payRate: 0.26 } } as any,
      500,
    );
    expect(result.driverCostSource).toBe('unavailable');
    expect(result.driverCost).toBe(0);
  });
});
