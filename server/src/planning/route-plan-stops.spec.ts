import { mergePlannerStops, plannerStopSetSignature } from './route-plan-stops';

const orderA = 'order-a';
const orderB = 'order-b';

const tripStop = (id: string, orderId: string, type: string, city: string, lat: number, lng: number) => ({
  id,
  type,
  city,
  latitude: lat,
  longitude: lng,
  tasks: [{ order: { id: orderId }, type: type === 'pickup' ? 'load' : 'unload' }],
});

describe('planner stop reconciliation', () => {
  it('treats a different stop order as a different plan', () => {
    // The sequence is what the truck drives, so the same stops in another order
    // must not be treated as the same plan.
    const a = [tripStop('1', orderA, 'pickup', 'Écully', 45.77, 4.77), tripStop('2', orderB, 'pickup', 'Soest', 51.57, 8.11)];
    const b = [a[1], a[0]];
    expect(plannerStopSetSignature(a)).not.toBe(plannerStopSetSignature(b));
  });

  it('detects that a persisted plan is missing an Order', () => {
    const complete = [
      tripStop('1', orderA, 'pickup', 'Écully', 45.77, 4.77),
      tripStop('2', orderA, 'delivery', 'Berlin', 52.52, 13.4),
      tripStop('3', orderB, 'pickup', 'Pobiedziska', 52.45, 17.2),
      tripStop('4', orderB, 'delivery', 'Berlin', 52.5, 13.39),
    ];
    const stale = complete.slice(2);
    expect(plannerStopSetSignature(stale)).not.toBe(plannerStopSetSignature(complete));
  });

  it('appends an Order that has no stop on the trip at all', () => {
    const tripStops = [
      tripStop('3', orderB, 'pickup', 'Pobiedziska', 52.45, 17.2),
      tripStop('4', orderB, 'delivery', 'Berlin', 52.5, 13.39),
    ];
    const merged = mergePlannerStops(tripStops, [
      { id: orderA, stops: [
        { type: 'pickup', city: 'Écully', latitude: 45.77, longitude: 4.77 },
        { type: 'delivery', city: 'Soest', latitude: 51.57, longitude: 8.11 },
      ] },
      { id: orderB, stops: [{ type: 'pickup', city: 'Pobiedziska' }] },
    ]);
    expect(merged).toHaveLength(4);
    expect(merged.map((stop) => stop.city)).toEqual(['Pobiedziska', 'Berlin', 'Écully', 'Soest']);
  });

  it('never duplicates an Order that is already represented on the trip', () => {
    const tripStops = [
      tripStop('1', orderA, 'pickup', 'Écully', 45.77, 4.77),
      tripStop('2', orderA, 'delivery', 'Soest', 51.57, 8.11),
    ];
    const merged = mergePlannerStops(tripStops, [
      { id: orderA, stops: [{ type: 'pickup', city: 'Écully' }, { type: 'delivery', city: 'Soest' }] },
    ]);
    expect(merged).toHaveLength(2);
  });

  it('leaves a trip whose stops already cover every order untouched', () => {
    const tripStops = [
      tripStop('1', orderA, 'pickup', 'Écully', 45.77, 4.77),
      tripStop('2', orderB, 'delivery', 'Berlin', 52.52, 13.4),
    ];
    const merged = mergePlannerStops(tripStops, [{ id: orderA }, { id: orderB }]);
    expect(merged).toHaveLength(2);
    expect(plannerStopSetSignature(merged)).toBe(plannerStopSetSignature(tripStops));
  });

  it('treats a trip stop without an order as its own identity', () => {
    const a = [{ id: 'x', type: 'pickup', city: 'Emmeloord', latitude: 52.71, longitude: 5.75 }];
    const b = [{ id: 'x', type: 'delivery', city: 'Emmeloord', latitude: 52.71, longitude: 5.75 }];
    expect(plannerStopSetSignature(a)).not.toBe(plannerStopSetSignature(b));
  });
});
