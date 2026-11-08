import { planOrderStopMatch } from './order-stop-identity';

/**
 * Regression coverage for the duplicate-stop incident: re-saving an order must
 * reuse the same order-stop rows (same ids) rather than replacing them, and only
 * a genuinely removed stop may become surplus.
 */
describe('planOrderStopMatch', () => {
  const existing = [
    { id: 'a', sequence: 1, type: 'pickup' },
    { id: 'b', sequence: 2, type: 'dropoff' },
  ];

  it('reuses both rows when the same two stops are saved again', () => {
    const plan = planOrderStopMatch(existing, [
      { type: 'pickup' },
      { type: 'dropoff' },
    ]);
    expect(plan.matches).toEqual([
      { index: 0, existingId: 'a' },
      { index: 1, existingId: 'b' },
    ]);
    expect(plan.surplusIds).toEqual([]);
  });

  it('is identical on the second save (no new identities, no surplus)', () => {
    const first = planOrderStopMatch(existing, [{ type: 'pickup' }, { type: 'dropoff' }]);
    const second = planOrderStopMatch(existing, [{ type: 'pickup' }, { type: 'dropoff' }]);
    expect(second).toEqual(first);
  });

  it('matches by sequence even when the type label changed', () => {
    const plan = planOrderStopMatch(existing, [
      { type: 'warehouse' },
      { type: 'delivery' },
    ]);
    expect(plan.matches.map((m) => m.existingId)).toEqual(['a', 'b']);
  });

  it('inserts only the genuinely new stop', () => {
    const plan = planOrderStopMatch(existing, [
      { type: 'pickup' },
      { type: 'stop' },
      { type: 'dropoff' },
    ]);
    expect(plan.matches.map((m) => m.existingId)).toEqual(['a', null, 'b']);
    expect(plan.surplusIds).toEqual([]);
  });

  it('reports the removed stop as surplus and keeps the survivors', () => {
    const plan = planOrderStopMatch(existing, [{ type: 'pickup' }]);
    expect(plan.matches).toEqual([{ index: 0, existingId: 'a' }]);
    expect(plan.surplusIds).toEqual(['b']);
  });

  it('never assigns one row to two desired stops', () => {
    const plan = planOrderStopMatch([{ id: 'a', sequence: 1, type: 'pickup' }], [
      { type: 'pickup' },
      { type: 'pickup' },
    ]);
    const ids = plan.matches.map((m) => m.existingId).filter(Boolean);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('does not mutate its inputs', () => {
    const snapshot = JSON.stringify(existing);
    planOrderStopMatch(existing, [{ type: 'pickup' }, { type: 'dropoff' }]);
    expect(JSON.stringify(existing)).toBe(snapshot);
  });
});
