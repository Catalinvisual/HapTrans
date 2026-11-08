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

  it('never treats a freshly created row without an id as a duplicate', () => {
    const created = { type: 'pickup' } as any;
    expect(uniqueRowsById([created, created])).toHaveLength(2);
  });
});
