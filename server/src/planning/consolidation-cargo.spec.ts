import { cargoForOrder, consolidationCapacity, incrementalRoute, windowRisk } from './consolidation-cargo';

const capacity = { maxWeightKg: null, maxLdm: null, maxVolumeCbm: null, maxPallets: 24 };

const order = (id: string, pallets: number, weightKg = 1000) => ({
  id,
  orderNumber: id,
  cargoItems: [{ unit: 'pallet', quantity: pallets, weightKg, volumeCbm: 1, ldm: 1 }],
  stops: [
    { id: `${id}-pickup`, type: 'pickup', sequence: 1, city: 'Pickup', latitude: 50, longitude: 4 },
    { id: `${id}-delivery`, type: 'delivery', sequence: 2, city: 'Delivery', latitude: 51, longitude: 5 },
  ],
});

const stop = (id: string, type: string, pallets: number, sequence: number) => ({
  id,
  sequence,
  type,
  city: id,
  tasks: [{ id: `${id}-task`, type: type === 'pickup' ? 'load' : 'unload', pallets, weightKg: pallets * 1000, status: 'completed' }],
});

describe('Smart Consolidation segment model', () => {
  it('allows 24 pallets against a 24-pallet limit', () => {
    const result = consolidationCapacity([stop('existing-pickup', 'pickup', 10, 1)], [], [order('new', 14)], capacity);
    expect(result.after.peak.pallets).toBe(24);
    expect(result.violations).toEqual([]);
  });

  it('blocks 25 pallets against a 24-pallet limit', () => {
    const result = consolidationCapacity([stop('existing-pickup', 'pickup', 10, 1)], [], [order('new', 15)], capacity);
    expect(result.after.peak.pallets).toBe(25);
    expect(result.violations).toEqual([{ code: 'PALLET_OVERLOAD', field: 'maxPallets', actual: 25, expected: 24 }]);
  });

  it('releases capacity when cargo is unloaded before a later pickup', () => {
    const existing = [stop('old-pickup', 'pickup', 20, 1), stop('old-delivery', 'delivery', 20, 2)];
    const result = consolidationCapacity(existing, [], [order('new', 10)], capacity);
    expect(result.after.peak.pallets).toBe(20);
    expect(result.violations).toEqual([]);
  });

  it('does not count non-pallet units as pallets', () => {
    const boxes = { id: 'boxes', cargoItems: [{ unit: 'box', quantity: 25, weightKg: 100 }] };
    expect(cargoForOrder(boxes).pallets).toBe(0);
    expect(cargoForOrder(boxes).weight).toBe(100);
  });

  it('uses only the incremental route, and marks incomplete routes unverified', () => {
    const baseline = { status: 'verified' as const, distanceKm: 100, durationMin: 120, provider: 'here', legDurationsMin: [120] };
    const proposed = { status: 'verified' as const, distanceKm: 160, durationMin: 200, provider: 'here', legDurationsMin: [120, 80] };
    expect(incrementalRoute(baseline, proposed)).toEqual({ addedDistanceKm: 60, addedDurationMin: 80 });
    expect(incrementalRoute(baseline, { ...proposed, status: 'unverified', distanceKm: null, durationMin: null })).toEqual({
      addedDistanceKm: null,
      addedDurationMin: null,
    });
  });

  it('only reports a window risk when arrival is after the window end', () => {
    expect(windowRisk(new Date('2026-08-20T10:00:00Z'), new Date('2026-08-20T09:59:00Z'))).toBe(false);
    expect(windowRisk(new Date('2026-08-20T10:00:00Z'), new Date('2026-08-20T10:01:00Z'))).toBe(true);
    expect(windowRisk(null, new Date('2026-08-20T10:01:00Z'))).toBe(false);
  });

  it('detects a duplicate StopTask instead of counting it twice', () => {
    const duplicate: any = stop('duplicate-pickup', 'pickup', 10, 1);
    duplicate.tasks = [
      { ...duplicate.tasks[0], order: { id: 'existing-order', orderNumber: 'EX-1' } },
    ];
    duplicate.tasks.push({ ...duplicate.tasks[0], id: 'duplicate-task' });
    const result = consolidationCapacity([duplicate], [], [order('new', 5)], capacity);
    expect(result.duplicateTaskKeys).toHaveLength(1);
  });
});