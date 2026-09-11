import { OtifService, OrderLike, PickupStopLike } from './otif.service';

const BASE = Date.parse('2025-06-10T10:00:00Z');

function order(over: Partial<OrderLike>): OrderLike {
  return {
    status: 'delivered',
    requested_delivery_at: new Date(BASE),
    actual_delivery_at: new Date(BASE),
    ...over,
  };
}

describe('OtifService', () => {
  let service: OtifService;
  beforeEach(() => {
    service = new OtifService();
  });

  describe('acceptance fixture — Customer A (10 orders, 8 on time, 1 late, 1 partial)', () => {
    // 8 on-time, full deliveries
    const onTime = Array.from({ length: 8 }, () => order({}));
    // 1 late delivery: 90 minutes past the promised slot
    const late = [order({ actual_delivery_at: new Date(BASE + 90 * 60 * 1000) })];
    // 1 on-time but PARTIAL delivery (trip ended partially_delivered)
    const partial = [order({ trip_status: 'partially_delivered' })];
    const orders = [...onTime, ...late, ...partial];

    it('OTIF = 8 / 10 = 80%', () => {
      const r = service.otif(orders);
      expect(r.total).toBe(10);
      expect(r.good).toBe(8);
      expect(r.rate).toBeCloseTo(80, 5);
    });

    it('OTD = 9 / 10 = 90% (partial ride is on time, so not late)', () => {
      const r = service.otd(orders);
      expect(r.total).toBe(10);
      expect(r.good).toBe(9);
      expect(r.rate).toBeCloseTo(90, 5);
      expect(r.lateCount).toBe(1);
      expect(r.avgLateMinutes).toBeCloseTo(90, 5);
    });

    it('grace minutes forgive the late order', () => {
      service.setGraceMinutes(90);
      expect(service.otd(orders).rate).toBeCloseTo(100, 5);
      // partial exclusion is independent of lateness
      expect(service.otif(orders).good).toBe(9);
    });
  });

  describe('eligibility filtering', () => {
    it('ignores undelivered orders and orders lacking promised/actual timestamps', () => {
      const orders: OrderLike[] = [
        order({ status: 'in_transit' }),
        order({ actual_delivery_at: null }),
        order({ requested_delivery_at: null }),
        order({ status: 'ready_for_invoice', actual_delivery_at: new Date(BASE) }),
      ];
      const r = service.otif(orders);
      expect(r.total).toBe(1);
      expect(r.good).toBe(1);
    });

    it('accepts delivered terminal statuses from the canonical set', () => {
      const statuses = ['delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'closed'];
      const r = service.otif(statuses.map((s) => order({ status: s })));
      expect(r.total).toBe(statuses.length);
      expect(r.good).toBe(statuses.length);
    });
  });

  describe('OTP', () => {
    it('grades pickup stops against the window end (+ grace)', () => {
      const stops: PickupStopLike[] = [
        { type: 'pickup', timeWindowMax: new Date(BASE), ata: new Date(BASE) },
        { type: 'pickup', timeWindowMax: new Date(BASE), ata: new Date(BASE + 30 * 60 * 1000) },
        { type: 'dropoff', timeWindowMax: new Date(BASE), ata: new Date(BASE) },
        { type: 'pickup', timeWindowMax: new Date(BASE), ata: null },
      ];
      const r = service.otp(stops);
      expect(r.total).toBe(2);
      expect(r.good).toBe(1);
      expect(r.rate).toBeCloseTo(50, 5);
      expect(r.lateCount).toBe(1);
    });
  });

  describe('tripsOnTime', () => {
    it('grades trips by actual vs planned arrival', () => {
      const r = service.tripsOnTime([
        { plannedArrival: new Date(BASE), actualArrival: new Date(BASE) },
        { plannedArrival: new Date(BASE), actualArrival: new Date(BASE + 60 * 60 * 1000) },
        { plannedArrival: new Date(BASE), actualArrival: null },
        { plannedArrival: null, actualArrival: new Date(BASE) },
      ]);
      expect(r.total).toBe(2);
      expect(r.good).toBe(1);
      expect(r.lateTrips).toBe(1);
      expect(r.rate).toBeCloseTo(50, 5);
    });
  });
});