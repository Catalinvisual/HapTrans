import {
  aggregateFinancials, tripRevenue, tripManualCost, tripDistance,
  tripAllocatedCost, tripDirectCost, tripProfit, tripMargin, DEFAULT_COST_PER_KM,
} from './financial-calculator';

/**
 * Acceptance fixture — Customer A:
 *   10 trips × (revenue 1000, direct cost 700)  → revenue 10000, cost 7000,
 *   profit 3000, margin 30%.
 */
const customerATrips = Array.from({ length: 10 }, () => ({
  orders: [{ price: 1000 }],
  costs: [{ amount: 700 }],
  distanceKm: 0,
  truck: null,
}));

describe('financial-calculator', () => {
  describe('trip-level decisions', () => {
    it('revenue from orders', () => {
      expect(tripRevenue({ orders: [{ price: '400' }, { price: 600 }] })).toBe(1000);
    });

    it('revenue falls back to trip.revenue_amount then estimatedProfit when no order prices', () => {
      expect(tripRevenue({ orders: [], revenue_amount: 1234.5 })).toBe(1234.5);
      expect(tripRevenue({ orders: [], estimatedProfit: 800 })).toBe(800);
      expect(tripRevenue({ orders: [] })).toBe(0);
    });

    it('allocated cost uses km × costPerKm with the 1.15 default', () => {
      expect(tripDistance({ distanceKm: 100 })).toBe(100);
      expect(tripDistance({ distance_km: 200 })).toBe(200);
      expect(tripDistance({})).toBe(0);
      expect(tripAllocatedCost({ distanceKm: 100, truck: null })).toBeCloseTo(100 * DEFAULT_COST_PER_KM, 5);
      expect(tripAllocatedCost({ distanceKm: 100, truck: { costPerKm: 1.8 } })).toBeCloseTo(180, 5);
    });

    it('direct cost = manual + allocated; profit and margin derived', () => {
      const t = { orders: [{ price: 1000 }], costs: [{ amount: 300 }], distanceKm: 100, truck: { costPerKm: 0.5 } };
      expect(tripManualCost(t)).toBe(300);
      expect(tripAllocatedCost(t)).toBeCloseTo(50, 5);
      expect(tripDirectCost(t)).toBeCloseTo(350, 5);
      expect(tripProfit(t)).toBeCloseTo(650, 5);
      expect(tripMargin(t)).toBeCloseTo(65, 5);
    });

    it('margin of a zero-revenue trip is 0 (no division blow-up)', () => {
      expect(tripMargin({ orders: [], costs: [{ amount: 50 }] })).toBe(0);
    });
  });

  describe('acceptance fixture (Customer A)', () => {
    it('aggregates to revenue 10000 / cost 7000 / profit 3000 / margin 30%', () => {
      const ag = aggregateFinancials(customerATrips);
      expect(ag.revenue).toBe(10000);
      expect(ag.cost).toBe(7000);
      expect(ag.profit).toBe(3000);
      expect(ag.margin).toBeCloseTo(30, 5);
      expect(ag.trips).toBe(10);
    });

    it('aggregation is flat over an empty group', () => {
      const ag = aggregateFinancials([]);
      expect(ag).toMatchObject({ revenue: 0, cost: 0, profit: 0, margin: 0, km: 0, trips: 0 });
    });
  });
});