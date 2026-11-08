import { resolvePlannedEta } from './planned-eta';

describe('resolvePlannedEta', () => {
  it('refreshes a stale planned ETA when the schedule moves the arrival', () => {
    // The production shape: appointment edited, stop still advertising the old
    // planned arrival from the previous plan.
    const stale = new Date('2026-11-10T07:00:00.000Z');
    const scheduled = new Date('2026-11-11T08:30:00.000Z');
    expect(resolvePlannedEta(scheduled, { plannedEta: stale })?.toISOString())
      .toBe('2026-11-11T08:30:00.000Z');
  });

  it('is stable when the schedule did not move', () => {
    const at = new Date('2026-11-10T07:00:00.000Z');
    expect(resolvePlannedEta(at, { plannedEta: at })?.toISOString()).toBe(at.toISOString());
  });

  it('keeps a planned ETA that a completed stop already recorded', () => {
    const planned = new Date('2026-11-10T07:00:00.000Z');
    const actual = new Date('2026-11-10T07:12:00.000Z');
    expect(resolvePlannedEta(new Date('2026-11-10T09:00:00.000Z'), { plannedEta: planned, actualArrival: actual }))
      .toBe(planned);
  });

  it('never erases a persisted ETA when no schedule arrival exists', () => {
    const planned = new Date('2026-11-10T07:00:00.000Z');
    expect(resolvePlannedEta(null, { plannedEta: planned })).toBe(planned);
    expect(resolvePlannedEta(null, { plannedEta: null })).toBeNull();
  });
});
