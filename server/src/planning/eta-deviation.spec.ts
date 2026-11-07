import { etaDeviations } from './eta-deviation';

describe('eta deviations', () => {
  const planned = '2026-11-07T03:00:00.000Z';
  const windowEnd = '2026-11-07T12:00:00.000Z';
  const live = '2026-11-08T07:36:00.000Z';

  it('reports the deviation from the planned ETA separately from the window', () => {
    const result = etaDeviations(live, planned, windowEnd);
    expect(result.vsPlannedMin).toBe(1716);
    expect(result.vsWindowMin).toBe(1176);
    expect(result.deviationMin).toBe(1176);
  });

  it('falls back to the planned ETA when there is no window', () => {
    const result = etaDeviations(live, planned, null);
    expect(result.vsWindowMin).toBeNull();
    expect(result.deviationMin).toBe(1716);
  });

  it('never invents a deviation for missing values', () => {
    expect(etaDeviations(null, planned, windowEnd)).toEqual({
      vsPlannedMin: null,
      vsWindowMin: null,
      deviationMin: null,
    });
    expect(etaDeviations(live, null, null).deviationMin).toBeNull();
  });

  it('returns negative values when the truck is early', () => {
    const result = etaDeviations('2026-11-07T01:30:00.000Z', planned, windowEnd);
    expect(result.vsPlannedMin).toBe(-90);
    expect(result.vsWindowMin).toBe(-630);
  });
});
