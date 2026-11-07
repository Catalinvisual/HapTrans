import { buildCargoLedger, CargoLedgerStop } from './cargo-ledger';

const stop = (sequence: number, type: string, city: string, tasks: any[]): CargoLedgerStop => ({
  id: `stop-${sequence}`,
  sequence,
  type,
  city,
  companyName: city,
  tasks,
});

const task = (type: string, orderNumber: string, pallets: number, weightKg: number, extra: any = {}) => ({
  id: `${orderNumber}-${type}`,
  type,
  status: 'completed',
  pallets,
  weightKg,
  order: { id: orderNumber, orderNumber },
  ...extra,
});

describe('buildCargoLedger', () => {
  it('projects 5 -> 25 -> 20 -> 0 pallets across two orders', () => {
    const ledger = buildCargoLedger([
      stop(1, 'pickup', 'Emmeloord', [task('load', 'ORD-1', 5, 1000)]),
      stop(2, 'pickup', 'Amsterdam', [task('load', 'ORD-2', 20, 4000)]),
      stop(3, 'delivery', 'Brussels', [task('unload', 'ORD-1', 5, 1000)]),
      stop(4, 'delivery', 'Antwerp', [task('unload', 'ORD-2', 20, 4000)]),
    ]);

    expect(ledger.rows.map((row) => row.cargoAfter.pallets)).toEqual([5, 25, 20, 0]);
    expect(ledger.rows.map((row) => row.cargoAfter.weightKg)).toEqual([1000, 5000, 4000, 0]);
    expect(ledger.totals.loaded.pallets).toBe(25);
    expect(ledger.totals.delivered.pallets).toBe(25);
    expect(ledger.totals.remaining.pallets).toBe(0);
    expect(ledger.peak.pallets).toBe(25);
    expect(ledger.status).toBe('unverified');
    expect(ledger.issues.map((issue) => issue.code)).toContain('CARGO_VOLUME_UNVERIFIED');
  });

  it('tracks volume and LDM per route segment', () => {
    const ledger = buildCargoLedger([
      stop(1, 'pickup', 'A', [task('load', 'ORD-1', 5, 1000, { volumeCbm: 12, loadingMeters: 3 })]),
      stop(2, 'pickup', 'B', [task('load', 'ORD-2', 20, 4000, { volumeCbm: 40, loadingMeters: 8 })]),
      stop(3, 'delivery', 'C', [task('unload', 'ORD-1', 5, 1000, { volumeCbm: 12, loadingMeters: 3 })]),
      stop(4, 'delivery', 'D', [task('unload', 'ORD-2', 20, 4000, { volumeCbm: 40, loadingMeters: 8 })]),
    ]);

    expect(ledger.rows.map((row) => row.cargoAfter.volumeCbm)).toEqual([12, 52, 40, 0]);
    expect(ledger.rows.map((row) => row.cargoAfter.loadingMeters)).toEqual([3, 11, 8, 0]);
    expect(ledger.status).toBe('verified');
  });

  it('reports an unload that exceeds the load', () => {
    const ledger = buildCargoLedger([
      stop(1, 'pickup', 'A', [task('load', 'ORD-1', 5, 1000)]),
      stop(2, 'delivery', 'B', [task('unload', 'ORD-1', 8, 1000)]),
    ]);

    expect(ledger.status).toBe('invalid');
    expect(ledger.issues.some((issue) => issue.code === 'UNLOAD_EXCEEDS_LOAD')).toBe(true);
    expect(ledger.rows[1].cargoAfter.pallets).toBe(-3);
  });

  it('reports a segment capacity violation using only known capacity', () => {
    const ledger = buildCargoLedger(
      [
        stop(1, 'pickup', 'A', [task('load', 'ORD-1', 12, 12000, { volumeCbm: 30, loadingMeters: 6 })]),
        stop(2, 'pickup', 'B', [task('load', 'ORD-2', 12, 12000, { volumeCbm: 30, loadingMeters: 6 })]),
      ],
      { maxWeightKg: 20000, maxPallets: 22, maxVolumeCbm: 55, maxLdm: null },
    );

    expect(ledger.status).toBe('invalid');
    expect(ledger.issues.some((issue) => issue.code === 'SEGMENT_CAPACITY_EXCEEDED' && issue.field === 'maxWeightKg')).toBe(true);
    expect(ledger.issues.some((issue) => issue.code === 'SEGMENT_CAPACITY_EXCEEDED' && issue.field === 'maxPallets')).toBe(true);
    expect(ledger.issues.some((issue) => issue.code === 'SEGMENT_CAPACITY_EXCEEDED' && issue.field === 'maxLdm')).toBe(false);
  });

  it('does not move cargo for rejected tasks and reports rejection', () => {
    const ledger = buildCargoLedger([
      stop(1, 'pickup', 'A', [task('load', 'ORD-1', 5, 1000)]),
      stop(2, 'delivery', 'B', [task('unload', 'ORD-1', 5, 1000, { status: 'problem', issueReason: 'refused' })]),
    ]);

    expect(ledger.rows[1].operation).toBe('rejected');
    expect(ledger.rows[1].cargoAfter.pallets).toBe(5);
    expect(ledger.totals.rejected.pallets).toBe(5);
    expect(ledger.totals.delivered.pallets).toBe(0);
  });
});
