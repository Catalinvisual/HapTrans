import { evaluateInsertion, InsertionContext, InsertionStop, InsertionOrder } from './stop-insertion';
import { KnownTruckCapacity } from './assignment-capacity';

const capacity = (maxPallets: number | null, maxWeightKg = 100000): KnownTruckCapacity => ({
  maxWeightKg,
  maxLdm: null,
  maxVolumeCbm: null,
  maxPallets,
});

type LegTable = Record<string, [number, number]>;

function link(table: LegTable, a: string, b: string, km: number, min: number) {
  table[`${a}|${b}`] = [km, min];
  table[`${b}|${a}`] = [km, min];
}

function legFor(table: LegTable, fallbackKm = 100, fallbackMin = 60): InsertionContext['leg'] {
  return (from, to) => {
    const value = table[`${from.city}|${to.city}`];
    if (!value) return { distanceKm: fallbackKm, durationMin: fallbackMin };
    return { distanceKm: value[0], durationMin: value[1] };
  };
}

function stop(key: string, type: 'pickup' | 'delivery', city: string, pallets: number, extra: Partial<InsertionStop> = {}): InsertionStop {
  const tasks = [{
    id: `${key}-task`,
    type: type === 'pickup' ? 'load' : 'unload',
    status: 'pending',
    pallets,
    quantity: pallets,
    weightKg: pallets * 100,
    loadingMeters: pallets * 0.4,
    volumeCbm: pallets * 0.5,
  }];
  return { key, id: key, type, city, latitude: 1, longitude: 1, tasks, ...extra };
}

function order(pickupCity: string, deliveryCity: string, pallets: number, extra: Partial<InsertionStop> = {}, pickupExtra: Partial<InsertionStop> = {}): InsertionOrder {
  return {
    id: 'order-new',
    orderNumber: 'ORD-NEW',
    cargoItems: [{ quantity: pallets, unit: 'pallet', weightKg: pallets * 100, ldm: pallets * 0.4, volumeCbm: pallets * 0.5 }],
    stops: [
      { key: 'new-pickup', id: 'new-pickup', type: 'pickup', city: pickupCity, latitude: 1, longitude: 1, ...pickupExtra },
      { key: 'new-delivery', id: 'new-delivery', type: 'delivery', city: deliveryCity, latitude: 1, longitude: 1, ...extra },
    ],
  };
}

const departure = new Date('2026-11-10T08:00:00Z');
const codes = (list: Array<{ code: string }>) => list.map((item) => item.code);

describe('stop insertion evaluation', () => {
  it('inserts a pickup and delivery between existing stops when that is cheapest', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'B', 40, 40);
    link(legs, 'B', 'C', 60, 60);
    link(legs, 'A', 'C', 200, 150);
    link(legs, 'C', 'D', 200, 150);
    link(legs, 'B', 'D', 300, 200);

    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 5), stop('c', 'delivery', 'C', 5)],
      order: order('B', 'D', 5),
      capacity: capacity(20),
      departure,
      leg: legFor(legs),
    });

    expect(result.status).toBe('feasible');
    expect(result.recommended).not.toBeNull();
    expect(result.recommended!.sequence.map((item) => item.city)).toEqual(['A', 'B', 'C', 'D']);
    expect(result.recommended!.addedDistanceKm).toBe(100);
    expect(result.recommended!.explanation).toContain('ORD-NEW');
  });

  it('can place a new pickup before an existing delivery', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'B', 25, 25);
    link(legs, 'B', 'C', 25, 25);
    link(legs, 'A', 'C', 120, 90);
    link(legs, 'C', 'D', 25, 25);
    link(legs, 'B', 'D', 200, 150);

    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 4), stop('c', 'delivery', 'C', 4)],
      order: order('B', 'D', 2),
      capacity: capacity(20),
      departure,
      leg: legFor(legs),
    });

    const sequence = result.recommended!.sequence.map((item) => item.city);
    expect(sequence.indexOf('B')).toBeLessThan(sequence.indexOf('C'));
    expect(sequence.indexOf('B')).toBeLessThan(sequence.indexOf('D'));
  });

  it('rejects a position that misses the delivery time window', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'B', 60, 60);
    link(legs, 'B', 'C', 60, 60);
    link(legs, 'A', 'C', 120, 120);
    link(legs, 'C', 'D', 60, 60);
    link(legs, 'B', 'D', 60, 60);

    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 2), stop('c', 'delivery', 'C', 2)],
      order: order('B', 'D', 2, { timeWindowMax: new Date('2026-11-10T08:10:00Z') }),
      capacity: capacity(20),
      departure,
      leg: legFor(legs),
    });

    expect(result.status).toBe('infeasible');
    expect(result.recommended).toBeNull();
    expect(result.rejectedCodes).toContain('STOP_WINDOW_MISSED');
  });

  it('never picks up before an unload that would overload the truck', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'C', 100, 60);
    link(legs, 'C', 'B', 50, 40);
    link(legs, 'B', 'D', 50, 40);
    link(legs, 'C', 'D', 100, 70);
    link(legs, 'A', 'B', 80, 60);
    link(legs, 'B', 'C', 40, 40);
    link(legs, 'A', 'D', 200, 150);
    link(legs, 'D', 'C', 100, 70);

    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 10), stop('c', 'delivery', 'C', 10)],
      order: order('B', 'D', 4),
      capacity: capacity(10),
      departure,
      leg: legFor(legs),
    });

    expect(result.status).toBe('feasible');
    expect(result.rejectedCodes).toContain('PALLET_OVERLOAD');
    expect(result.recommended!.sequence.map((item) => item.city)).toEqual(['A', 'C', 'B', 'D']);
    expect(result.recommended!.blockers).toHaveLength(0);
    expect(result.recommended!.capacityAfter.pallets).toBeLessThanOrEqual(10);
  });

  it('keeps every order dependency when several orders share the trip', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'B', 50, 40);
    link(legs, 'B', 'C', 50, 40);
    link(legs, 'C', 'D', 50, 40);
    link(legs, 'D', 'E', 50, 40);
    link(legs, 'E', 'F', 50, 40);

    const result = evaluateInsertion({
      existingStops: [
        stop('a', 'pickup', 'A', 2),
        stop('b', 'delivery', 'B', 2),
        stop('c', 'pickup', 'C', 3),
        stop('d', 'delivery', 'D', 3),
      ],
      order: order('E', 'F', 1),
      capacity: capacity(30),
      departure,
      leg: legFor(legs),
    });

    const positions = new Map(result.recommended!.sequence.map((item, index) => [item.city, index]));
    expect(positions.get('A')!).toBeLessThan(positions.get('B')!);
    expect(positions.get('C')!).toBeLessThan(positions.get('D')!);
    expect(positions.get('E')!).toBeLessThan(positions.get('F')!);
  });

  it('stays infeasible even though capacity would suffice after unloading', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'B', 20, 20);
    link(legs, 'B', 'C', 10, 10);
    link(legs, 'A', 'C', 10, 10);
    link(legs, 'C', 'D', 10, 10);
    link(legs, 'B', 'D', 30, 30);
    link(legs, 'D', 'C', 10, 10);

    const earlyDelivery = { timeWindowMin: new Date('2026-11-10T08:00:00Z'), timeWindowMax: new Date('2026-11-10T10:00:00Z') };
    const lateDelivery = { timeWindowMin: new Date('2026-11-10T18:00:00Z'), timeWindowMax: new Date('2026-11-10T20:00:00Z') };
    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 10), stop('c', 'delivery', 'C', 10, earlyDelivery)],
      order: order('B', 'D', 8, lateDelivery, { timeWindowMin: new Date('2026-11-10T08:00:00Z'), timeWindowMax: new Date('2026-11-10T08:30:00Z') }),
      capacity: capacity(15),
      departure,
      leg: legFor(legs),
    });

    expect(result.status).toBe('infeasible');
    expect(result.recommended).toBeNull();
    expect(result.rejectedCodes).toContain('PALLET_OVERLOAD');
    expect(result.rejectedCodes).toContain('STOP_WINDOW_MISSED');
  });

  it('is feasible only when the existing delivery unloads before the new pickup', () => {
    const legs: LegTable = {};
    link(legs, 'A', 'C', 120, 120);
    link(legs, 'C', 'B', 40, 40);
    link(legs, 'B', 'D', 40, 40);
    link(legs, 'A', 'B', 30, 30);
    link(legs, 'B', 'C', 30, 30);

    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 10), stop('c', 'delivery', 'C', 10)],
      order: order('B', 'D', 3),
      capacity: capacity(10),
      departure,
      leg: legFor(legs),
    });

    expect(result.status).toBe('feasible');
    expect(result.recommended!.sequence.map((item) => item.city)).toEqual(['A', 'C', 'B', 'D']);
    expect(result.recommended!.pickupIndex).toBe(2);
  });

  it('reports an unverified route when a leg has no provider answer', () => {
    const result = evaluateInsertion({
      existingStops: [stop('a', 'pickup', 'A', 2), stop('c', 'delivery', 'C', 2)],
      order: order('B', 'D', 2),
      capacity: capacity(20),
      departure,
      leg: () => null,
    });

    expect(result.status).toBe('unverified');
    expect(result.recommended).toBeNull();
    expect(codes(result.warnings)).toContain('ROUTE_UNVERIFIED');
  });
});
