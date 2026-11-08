import { dedupeOrderStops, dedupeRebuildOrders, uniqueRowsById } from './rebuild-dedupe';

describe('rebuild de-duplication', () => {
  it('collapses a trip that carries the same order six times', () => {
    const order = { id: 'order-1', orderNumber: 'ORD-2026-000034' };
    const rows = Array.from({ length: 6 }, () => order);
    expect(dedupeRebuildOrders(rows)).toEqual([order]);
  });

  it('keeps different orders in their original order', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    expect(dedupeRebuildOrders([a, b, a])).toEqual([a, b]);
  });

  it('drops rows without an id from the order list', () => {
    expect(dedupeRebuildOrders([{ id: null }, { orderNumber: 'x' } as any])).toEqual([]);
  });

  it('collapses duplicated order stops but keeps the operations distinct', () => {
    const pickup = { id: 's1', type: 'pickup', sequence: 1 };
    const delivery = { id: 's2', type: 'delivery', sequence: 2 };
    const rows = [pickup, pickup, delivery, pickup, delivery];
    expect(dedupeOrderStops(rows)).toEqual([pickup, delivery]);
  });

  it('collapses duplicated rows that were written as separate records', () => {
    // The production shape: six copies of the same delivery, each its own row.
    const copies = Array.from({ length: 6 }, (_, i) => ({ id: `copy-${i}`, type: 'delivery', sequence: 2 }));
    const pickup = { id: 'p', type: 'pickup', sequence: 1 };
    const result = dedupeOrderStops([pickup, ...copies]);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.type)).toEqual(['pickup', 'delivery']);
  });

  it('keeps distinct intermediate stops that share a type but differ in sequence', () => {
    const rows = [
      { id: 'a', type: 'stop', sequence: 2 },
      { id: 'b', type: 'stop', sequence: 3 },
    ];
    expect(dedupeOrderStops(rows)).toHaveLength(2);
  });

  it('never treats a freshly created row without an id as a duplicate', () => {
    const created = { type: 'pickup' } as any;
    expect(uniqueRowsById([created, created])).toHaveLength(2);
  });
});
