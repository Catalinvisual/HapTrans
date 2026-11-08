import { buildCargoLedger } from './cargo-ledger';
import { buildProposedStops } from './consolidation-cargo';

const capacity = { maxWeightKg: 24000, maxLdm: 13.6, maxVolumeCbm: 100, maxPallets: 33 };

const existingStops = [
  { id: 's1', sequence: 1, type: 'pickup', city: 'Écully', tasks: [{ id: 't1', type: 'load', pallets: 1, weightKg: 0, volumeCbm: 2.5, loadingMeters: 0.4 }] },
  { id: 's2', sequence: 2, type: 'delivery', city: 'Soest', tasks: [{ id: 't2', type: 'unload', pallets: 1, weightKg: 0, volumeCbm: 2.5, loadingMeters: 0.4 }] },
];

describe('proposed consolidation stops', () => {
  it('inserts a pickup before its delivery even when the order stores them the other way round', () => {
    const order = {
      id: 'o1',
      orderNumber: 'ORD-2024007',
      cargoItems: [{ quantity: 12, unit: 'pallet', weightKg: 6000, volumeCbm: 30, ldm: 6 }],
      stops: [
        { id: 'd1', sequence: 1, type: 'delivery', city: 'Berlin' },
        { id: 'p1', sequence: 2, type: 'pickup', city: 'Pobiedziska' },
      ],
    };

    const proposed = buildProposedStops(existingStops, [order]);
    expect(proposed.map((s) => s.type)).toEqual(['pickup', 'delivery', 'pickup', 'delivery']);
    expect(proposed[2].city).toBe('Pobiedziska');
    expect(proposed[3].city).toBe('Berlin');

    const ledger = buildCargoLedger(proposed as any, capacity);
    const errors = ledger.issues.filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
    expect(ledger.peak.pallets).toBe(12);
    expect(ledger.peak.weightKg).toBe(6000);
    expect(ledger.totals.remaining.pallets).toBe(0);
    expect(ledger.totals.remaining.weightKg).toBe(0);
    expect(ledger.status).not.toBe('invalid');
  });

  it('does not put the whole order on every stop of a multi-stop order', () => {
    const order = {
      id: 'o2',
      orderNumber: 'ORD-X',
      cargoItems: [{ quantity: 30, unit: 'pallet', weightKg: 1000 }],
      stops: [
        { id: 'p1', sequence: 1, type: 'pickup', city: 'A' },
        { id: 'd1', sequence: 2, type: 'delivery', city: 'B' },
        { id: 'd2', sequence: 3, type: 'delivery', city: 'C' },
      ],
    };
    const proposed = buildProposedStops(existingStops, [order]);
    const ledger = buildCargoLedger(proposed as any, capacity);
    expect(ledger.peak.pallets).toBe(30);
    expect(ledger.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });
});
