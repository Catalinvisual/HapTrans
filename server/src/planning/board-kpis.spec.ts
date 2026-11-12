import { buildBoardKpis } from './board-kpis';

const trip = (overrides: any = {}) => ({
  id: 't1',
  status: 'planning',
  distanceKm: 500,
  emptyKm: 100,
  orders: [{ price: 1200, currency: 'EUR', weightKg: 12000 }],
  truck: { id: 'truck-1', maxWeightKg: 24000 },
  ...overrides,
});

const resources = [{ id: 'truck-1', maxWeightKg: 24000, capacity: { maxWeightKg: 24000 } }];

describe('buildBoardKpis', () => {
  it('sums distance and empty km and labels them as estimated', () => {
    const kpis = buildBoardKpis({ trips: [trip(), trip({ id: 't2', distanceKm: 300, emptyKm: 0 })], resources });
    expect(kpis.byKey.distanceKm.value).toBe(800);
    expect(kpis.byKey.distanceKm.provenance).toBe('estimated');
    expect(kpis.byKey.emptyKmPct.value).toBe(11.1);
  });

  it('does not invent a utilisation when the truck has no capacity', () => {
    const kpis = buildBoardKpis({
      trips: [trip({ truck: { id: 'truck-x' } })],
      resources: [{ id: 'truck-x' }],
    });
    expect(kpis.byKey.utilisationPct.value).toBeNull();
    expect(kpis.byKey.utilisationPct.provenance).toBe('unverified');
  });

  it('averages utilisation over trips that can be measured', () => {
    const kpis = buildBoardKpis({
      trips: [trip(), trip({ id: 't2', orders: [{ price: 100, weightKg: 6000 }] })],
      resources,
    });
    // 50% and 25%
    expect(kpis.byKey.utilisationPct.value).toBe(38);
  });

  it('never mixes currencies in a money KPI', () => {
    const kpis = buildBoardKpis({
      trips: [
        trip({ orders: [{ price: 1000, currency: 'EUR', weightKg: 100 }, { price: 500, currency: 'PLN' }] }),
      ],
      resources,
    });
    expect(kpis.currency).toBeNull();
    expect(kpis.byKey.margin.value).toBeNull();
    expect(kpis.byKey.margin.provenance).toBe('unverified');
  });

  it('prefers recorded TripCost rows over the estimate', () => {
    const kpis = buildBoardKpis({
      trips: [trip({ costs: [{ amount: 300 }, { amount: 200 }], estimatedCost: 9999 })],
      resources,
    });
    expect(kpis.byKey.margin.value).toBe(700);
    expect(kpis.byKey.margin.provenance).toBe('recorded');
    expect(kpis.byKey.costPerKm.value).toBe(1);
  });

  it('refuses a cost total when the toll is unavailable', () => {
    const kpis = buildBoardKpis({
      trips: [trip({ estimatedCost: 500, tollStatus: 'unavailable', estimatedCostBreakdown: { tollCostAvailable: false } })],
      resources,
    });
    expect(kpis.byKey.margin.value).toBeNull();
    expect(kpis.byKey.margin.provenance).toBe('unverified');
  });

  it('counts conflicts by level and unplanned orders', () => {
    const kpis = buildBoardKpis({
      trips: [trip()],
      resources,
      totalUnplanned: 7,
      conflicts: [
        { level: 'blocking' },
        { level: 'blocking' },
        { level: 'warning' },
      ],
    });
    expect(kpis.byKey.conflicts.value).toBe(2);
    expect(kpis.byKey.warnings.value).toBe(1);
    expect(kpis.byKey.unplannedOrders.value).toBe(7);
  });

  it('counts drivers at risk from the HOS summary only when it exists', () => {
    const withData = buildBoardKpis({
      trips: [],
      resources,
      hosSummary: {
        d1: { remaining: 3, over: false },
        d2: { remaining: 12, over: false },
        d3: { remaining: 20, over: true },
      },
    });
    expect(withData.byKey.driversAtRisk.value).toBe(1);
    expect(withData.byKey.driversOver.value).toBe(1);

    const withoutData = buildBoardKpis({ trips: [], resources, hosSummary: {} });
    expect(withoutData.byKey.driversAtRisk.value).toBeNull();
    expect(withoutData.byKey.driversAtRisk.provenance).toBe('unverified');
  });

  it('ignores completed trips in fleet totals', () => {
    const kpis = buildBoardKpis({
      trips: [trip({ status: 'completed', distanceKm: 9000 }), trip({ id: 't2', distanceKm: 100 })],
      resources,
    });
    expect(kpis.byKey.distanceKm.value).toBe(100);
  });

  it('computes punctuality from the planned arrival', () => {
    const now = new Date('2026-11-12T12:00:00Z');
    const kpis = buildBoardKpis({
      trips: [
        trip({ id: 'a', plannedArrival: '2026-11-12T10:00:00Z' }),
        trip({ id: 'b', plannedArrival: '2026-11-12T18:00:00Z' }),
      ],
      resources,
      now,
    });
    expect(kpis.byKey.onTimePct.value).toBe(50);
    expect(kpis.byKey.delayedTrips.value).toBe(1);
  });
});
