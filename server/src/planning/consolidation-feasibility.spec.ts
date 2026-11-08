import { deriveConsolidationVerdict, isUnverifiedCode } from './consolidation-feasibility';

describe('deriveConsolidationVerdict', () => {
  it('keeps a genuine truck overlap as a hard blocker even with warnings present', () => {
    const verdict = deriveConsolidationVerdict(
      [{ level: 'blocking', code: 'TRUCK_OVERLAP' }],
      [{ level: 'warning', code: 'EQUIPMENT_UNVERIFIED' }],
    );
    expect(verdict.status).toBe('blocked');
    expect(verdict.overrideable).toBe(false);
    expect(verdict.codes.blocking).toEqual(['TRUCK_OVERLAP']);
  });

  it('reports a missing internal trailer height as unverified, not as a warning-only pass', () => {
    const verdict = deriveConsolidationVerdict([], [{ level: 'warning', code: 'EQUIPMENT_UNVERIFIED' }]);
    expect(verdict.status).toBe('unverified');
    expect(verdict.overrideable).toBe(true);
    expect(verdict.unverified).toBe(1);
    expect(verdict.warnings).toBe(0);
  });

  it('treats a proven equipment incompatibility as blocking', () => {
    const verdict = deriveConsolidationVerdict([{ level: 'blocking', code: 'EQUIPMENT_MISSING' }], []);
    expect(verdict.status).toBe('blocked');
    expect(verdict.overrideable).toBe(false);
  });

  it('separates plain warnings from unverified data', () => {
    const verdict = deriveConsolidationVerdict(
      [],
      [
        { level: 'warning', code: 'NO_DRIVER' },
        { level: 'warning', code: 'ROUTE_UNVERIFIED' },
      ],
    );
    expect(verdict.status).toBe('unverified');
    expect(verdict.codes.warning).toEqual(['NO_DRIVER']);
    expect(verdict.codes.unverified).toEqual(['ROUTE_UNVERIFIED']);
  });

  it('is a reviewable warning when every check ran and only soft issues remain', () => {
    const verdict = deriveConsolidationVerdict([], [{ level: 'warning', code: 'TIME_WINDOW_AT_RISK' }]);
    expect(verdict.status).toBe('warning');
    expect(verdict.overrideable).toBe(true);
    expect(verdict.hardBlockers).toBe(0);
  });

  it('is feasible only when nothing blocks, warns or is unverified', () => {
    const verdict = deriveConsolidationVerdict([], []);
    expect(verdict.status).toBe('feasible');
    expect(verdict.overrideable).toBe(false);
  });

  it('deduplicates repeated codes for chips and audit records', () => {
    const verdict = deriveConsolidationVerdict(
      [
        { code: 'TRUCK_OVERLAP' },
        { code: 'TRUCK_OVERLAP' },
      ],
      [],
    );
    expect(verdict.codes.blocking).toEqual(['TRUCK_OVERLAP']);
    expect(verdict.hardBlockers).toBe(2);
  });
});

describe('isUnverifiedCode', () => {
  it('classifies unverified and missing data without treating proven mismatch as unverified', () => {
    expect(isUnverifiedCode('EQUIPMENT_UNVERIFIED')).toBe(true);
    expect(isUnverifiedCode('TRUCK_CAPACITY_INCOMPLETE')).toBe(true);
    expect(isUnverifiedCode('STOP_COORDINATES_MISSING')).toBe(true);
    expect(isUnverifiedCode('EQUIPMENT_MISSING')).toBe(false);
    expect(isUnverifiedCode('TRUCK_OVERLAP')).toBe(false);
    expect(isUnverifiedCode(undefined)).toBe(false);
  });
});
