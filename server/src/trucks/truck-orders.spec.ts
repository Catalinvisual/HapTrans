import { collectTruckOrders } from './trucks.service';

describe('truck order collection', () => {
  const trips = [
    {
      id: 'trip-5',
      tripNumber: 'TRP-2026-0005',
      status: 'planning',
      orders: [
        { id: 'ord-31', orderNumber: 'ORD-2026-000031' },
        { id: 'ord-32', orderNumber: 'ORD-2026-000032' },
      ],
    },
    {
      id: 'trip-6',
      tripNumber: 'TRP-2026-0006',
      status: 'completed',
      orders: [{ id: 'ord-31', orderNumber: 'ORD-2026-000031' }],
    },
  ];

  it('returns every order of a multi-order trip, not only the first', () => {
    const orders = collectTruckOrders([trips[0]]);
    expect(orders.map((order) => order.id)).toEqual(['ord-31', 'ord-32']);
  });

  it('annotates each order with the trip that carries it', () => {
    const [first] = collectTruckOrders([trips[0]]);
    expect(first.trip).toEqual({ id: 'trip-5', tripNumber: 'TRP-2026-0005', status: 'planning' });
  });

  it('de-duplicates an order that appears on more than one trip', () => {
    expect(collectTruckOrders(trips)).toHaveLength(2);
  });

  it('keeps only orders from active trips when asked', () => {
    const active = collectTruckOrders(trips, { activeOnly: true });
    expect(active.map((order) => order.orderNumber)).toEqual(['ORD-2026-000031', 'ORD-2026-000032']);
  });

  it('ignores trips without orders and orders without an id', () => {
    expect(collectTruckOrders([{ id: 't', orders: null }, { id: 'u', orders: [{}] }])).toEqual([]);
  });
});
