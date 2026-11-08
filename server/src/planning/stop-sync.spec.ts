import { expectedKindAt, planOrderStopSync } from './stop-sync';

/**
 * These tests pin the guarantee the duplicated-stop incident broke: running the
 * same synchronization again must resolve to the same trip stops and must never
 * consume the same trip stop twice.
 */
describe('planOrderStopSync', () => {
  const orderStops = [
    { id: 'os-1', sequence: 1, type: 'pickup' },
    { id: 'os-2', sequence: 2, type: 'dropoff' },
  ];

  it('maps a two-stop order to its pickup and delivery trip stops', () => {
    const tripStops = [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'delivery' },
    ];
    const plan = planOrderStopSync(orderStops, tripStops);
    expect(plan.pairs.map((p) => [p.orderStop.id, p.tripStop.id])).toEqual([
      ['os-1', 'ts-1'],
      ['os-2', 'ts-2'],
    ]);
    expect(plan.duplicates).toEqual([]);
    expect(plan.unmatchedTripStopIds).toEqual([]);
  });

  it('resolves to the same trip stops on a repeated run (idempotent)', () => {
    const tripStops = [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'delivery' },
    ];
    const first = planOrderStopSync(orderStops, tripStops);
    const second = planOrderStopSync(orderStops, tripStops);
    expect(second.pairs.map((p) => p.tripStop.id)).toEqual(first.pairs.map((p) => p.tripStop.id));
  });

  it('never consumes the same trip stop twice', () => {
    const tripStops = [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'pickup' },
      { id: 'ts-3', sequence: 3, type: 'delivery' },
    ];
    const plan = planOrderStopSync(orderStops, tripStops);
    const used = plan.pairs.map((p) => p.tripStop.id);
    expect(new Set(used).size).toBe(used.length);
  });

  it('reports a duplicated trip stop instead of silently rewriting both copies', () => {
    const tripStops = [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'pickup' },
      { id: 'ts-3', sequence: 3, type: 'delivery' },
    ];
    const plan = planOrderStopSync(orderStops, tripStops);
    expect(plan.duplicates).toHaveLength(1);
    expect(plan.duplicates[0].tripStopIds).toEqual(['ts-1', 'ts-2']);
    expect(plan.duplicates[0].chosenTripStopId).toBe('ts-1');
    expect(plan.unmatchedTripStopIds).toEqual(['ts-2']);
  });

  it('keeps intermediate stops of a multi-stop order', () => {
    const three = [
      { id: 'os-1', sequence: 1, type: 'pickup' },
      { id: 'os-2', sequence: 2, type: 'stop' },
      { id: 'os-3', sequence: 3, type: 'dropoff' },
    ];
    const tripStops = [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'stop' },
      { id: 'ts-3', sequence: 3, type: 'delivery' },
    ];
    expect(planOrderStopSync(three, tripStops).pairs.map((p) => p.tripStop.id)).toEqual(['ts-1', 'ts-2', 'ts-3']);
  });

  it('is independent of the order the rows arrive in', () => {
    const shuffled = [{ id: 'ts-2', sequence: 2, type: 'delivery' }, { id: 'ts-1', sequence: 1, type: 'pickup' }];
    const ordered = [{ id: 'ts-1', sequence: 1, type: 'pickup' }, { id: 'ts-2', sequence: 2, type: 'delivery' }];
    expect(planOrderStopSync(orderStops, shuffled).pairs.map((p) => p.tripStop.id))
      .toEqual(planOrderStopSync(orderStops, ordered).pairs.map((p) => p.tripStop.id));
  });

  it('does not mutate its inputs', () => {
    const tripStops = [{ id: 'ts-2', sequence: 2, type: 'delivery' }, { id: 'ts-1', sequence: 1, type: 'pickup' }];
    const snapshot = JSON.stringify(tripStops);
    planOrderStopSync(orderStops, tripStops);
    expect(JSON.stringify(tripStops)).toBe(snapshot);
  });

  it('matches a single order stop to one trip stop only', () => {
    const plan = planOrderStopSync([{ id: 'os-1', sequence: 1 }], [
      { id: 'ts-1', sequence: 1, type: 'pickup' },
      { id: 'ts-2', sequence: 2, type: 'delivery' },
    ]);
    expect(plan.pairs).toHaveLength(1);
    expect(plan.pairs[0].tripStop.id).toBe('ts-1');
  });

  it('computes the expected operation kind per position', () => {
    expect(expectedKindAt(0, 1)).toBeNull();
    expect(expectedKindAt(0, 2)).toBe('pickup');
    expect(expectedKindAt(1, 2)).toBe('delivery');
    expect(expectedKindAt(1, 3)).toBe('stop');
    expect(expectedKindAt(2, 3)).toBe('delivery');
  });
});
