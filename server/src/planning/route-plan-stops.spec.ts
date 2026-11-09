import { mergePlannerStops, plannerStopReconciliationSignature, plannerStopSetSignature } from './route-plan-stops';

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

describe('planner plan/stops reconciliation', () => {
  const tripStop = (city: string, type: string, tasks: any[], lat = 52.1, lng = 5.1) => ({
    type, city, latitude: lat, longitude: lng, tasks,
  });
  const planStop = (city: string, type: string, orderId: string, lat = 52.1, lng = 5.1) => ({
    type, city, latitude: lat, longitude: lng, orderId,
  });

  it('matches a plan the builder generated from the same stops', () => {
    const tripStops = [
      tripStop('Kalisz', 'pickup', [{ order: { id: 'o1' } }]),
      tripStop('Soest', 'delivery', [{ order: { id: 'o1' } }], 51.57, 8.11),
    ];
    const planStops = [
      planStop('Kalisz', 'pickup', 'o1'),
      planStop('Soest', 'delivery', 'o1', 51.57, 8.11),
    ];
    expect(plannerStopReconciliationSignature(planStops))
      .toBe(plannerStopReconciliationSignature(tripStops));
  });

  it('does not report an intermediate stop as stale just because the plan stores it as a delivery', () => {
    // The builder maps every non-pickup stop to a delivery; an intermediate
    // `stop` would otherwise make the plan look stale on every single open.
    const tripStops = [
      tripStop('Kalisz', 'pickup', [{ order: { id: 'o1' } }]),
      tripStop('Poznań', 'stop', [{ order: { id: 'o1' } }], 52.4, 16.9),
      tripStop('Berlin', 'delivery', [{ order: { id: 'o1' } }], 52.52, 13.4),
    ];
    const planStops = [
      planStop('Kalisz', 'pickup', 'o1'),
      planStop('Poznań', 'delivery', 'o1', 52.4, 16.9),
      planStop('Berlin', 'delivery', 'o1', 52.52, 13.4),
    ];
    expect(plannerStopReconciliationSignature(planStops))
      .toBe(plannerStopReconciliationSignature(tripStops));
  });

  it('matches a consolidated stop that both trip and plan key on the first order', () => {
    const tripStops = [
      tripStop('Soest', 'delivery', [{ order: { id: 'o1' } }, { order: { id: 'o2' } }]),
      tripStop('Berlin', 'pickup', [{ order: { id: 'o2' } }], 52.52, 13.4),
    ];
    const planStops = [
      planStop('Soest', 'delivery', 'o1'),
      planStop('Berlin', 'pickup', 'o2', 52.52, 13.4),
    ];
    expect(plannerStopReconciliationSignature(planStops))
      .toBe(plannerStopReconciliationSignature(tripStops));
  });

  it('still reports duplicated plan rows as stale', () => {
    const tripStops = [tripStop('Kalisz', 'pickup', [{ order: { id: 'o1' } }])];
    const duplicated = [
      planStop('Kalisz', 'pickup', 'o1'),
      planStop('Kalisz', 'pickup', 'o1'),
    ];
    expect(plannerStopReconciliationSignature(duplicated))
      .not.toBe(plannerStopReconciliationSignature(tripStops));
  });
});
