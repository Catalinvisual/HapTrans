import {
  tripNotificationContext,
  tripNotificationText,
  tripStatusLabel,
} from './notification-context';

describe('trip notification context', () => {
  const trip = {
    tripNumber: 'TRP-2026-0005',
    driver: { user: { name: 'Jan Kowalski' } },
    orders: [{ orderNumber: 'ORD-2026-004521' }],
    stops: [
      { sequence: 1, city: 'Berlin', tasks: [{ type: 'load' }] },
      { sequence: 2, city: 'Wien', tasks: [{ type: 'unload' }] },
      { sequence: 3, city: 'Brașov', tasks: [{ type: 'unload' }] },
    ],
  };

  it('collects trip, order, route and driver', () => {
    const context = tripNotificationContext(trip);

    expect(context.headline).toBe('TRP-2026-0005 · ORD-2026-004521');
    expect(context.route).toBe('Berlin → Brașov');
    expect(context.line).toBe(
      'TRP-2026-0005 · ORD-2026-004521 · Berlin → Brașov · Jan Kowalski',
    );
  });

  it('falls back to the truck driver and to the order on a stop task', () => {
    const context = tripNotificationContext({
      tripNumber: 'TRP-1',
      truck: { driver: { user: { name: 'Truck Driver' } } },
      stops: [
        {
          sequence: 1,
          city: 'Paris',
          tasks: [{ type: 'load', order: { orderNumber: 'ORD-9' } }],
        },
      ],
    });

    expect(context.driver).toBe('Truck Driver');
    expect(context.orderRefs).toBe('ORD-9');
    expect(context.route).toBe('Paris');
  });

  it('builds a readable title and body without inventing missing data', () => {
    expect(tripNotificationText(trip, 'Trip started')).toEqual({
      title: 'TRP-2026-0005 · ORD-2026-004521',
      message: 'Berlin → Brașov · Jan Kowalski · Trip started',
    });

    expect(tripNotificationText({ id: 'trip-1' }, 'Trip started', 'Ion Popescu')).toEqual({
      title: 'Trip started',
      message: 'Ion Popescu · Trip started',
    });
  });

  it('labels known statuses and humanizes unknown ones', () => {
    expect(tripStatusLabel('driver_accepted')).toBe('Trip accepted');
    expect(tripStatusLabel('custom_stage')).toBe('custom stage');
    expect(tripStatusLabel('')).toBe('');
  });
});
