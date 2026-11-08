import { dedupeOrderStops, dedupePlannerStops, dedupeRebuildOrders, uniqueRowsById } from './rebuild-dedupe';

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

  it('collapses duplicate trip stops that carry different trip sequences', () => {
    // The production shape: five copies of one delivery, sequences 1..5.
    const copies = Array.from({ length: 5 }, (_, i) => ({
      id: `t-${i}`,
      orderId: 'ord',
      type: 'delivery',
      city: 'Luttelgeest',
      address: '1 Weg',
      sequence: i + 1,
      timeWindowMin: '2026-11-07T08:00:00.000Z',
    }));
    const pickup = { id: 'p', orderId: 'ord', type: 'pickup', city: 'Kalisz', address: '2 Ulica', sequence: 6 };
    const result = dedupePlannerStops([...copies, pickup]);
    expect(result).toHaveLength(2);
    expect(result.map((s: any) => s.type)).toEqual(['delivery', 'pickup']);
  });

  it('keeps two deliveries of one order at different places', () => {
    const rows = [
      { orderId: 'ord', type: 'delivery', city: 'Soest', address: '2 Markt' },
      { orderId: 'ord', type: 'delivery', city: 'Berlin', address: '3 Strasse' },
    ];
    expect(dedupePlannerStops(rows)).toHaveLength(2);
  });

  it('never treats a freshly created row without an id as a duplicate', () => {
    const created = { type: 'pickup' } as any;
    expect(uniqueRowsById([created, created])).toHaveLength(2);
  });
});
