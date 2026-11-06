import { deriveTripStatus } from '../trips/trip-progress';
import { referencesFromStops } from './orders.service';

describe('order operational references', () => {
  const pickup = { type: 'pickup', sequence: 1, reference: '555555' };
  const delivery = { type: 'dropoff', sequence: 2, reference: 'abcdefg' };

  it('reads loading and unloading from the order stop rows', () => {
    expect(referencesFromStops([pickup, delivery])).toEqual({
      loading: '555555',
      unloading: 'abcdefg',
    });
  });

  it('never copies the loading reference into the unloading reference', () => {
    const legacyDelivery = { type: 'delivery', sequence: 2, reference: '555555' };
    expect(referencesFromStops([pickup, legacyDelivery])).toEqual({
      loading: '555555',
      unloading: null,
    });
  });

  it('returns nulls when the order has no stop references', () => {
    expect(referencesFromStops([])).toEqual({ loading: null, unloading: null });
    expect(referencesFromStops([{ type: 'pickup' }, { type: 'delivery' }])).toEqual({
      loading: null,
      unloading: null,
    });
  });

  it('uses the first non-empty pickup and delivery reference', () => {
    const stops = [
      { type: 'pickup', sequence: 1, reference: '' },
      { type: 'pickup', sequence: 2, reference: 'LOAD-A' },
      { type: 'delivery', sequence: 3, reference: 'UNLOAD-A' },
    ];
    expect(referencesFromStops(stops)).toEqual({ loading: 'LOAD-A', unloading: 'UNLOAD-A' });
  });
});

describe('trip status derives the current operation', () => {
  const pickupsDone = [{ type: 'pickup', sequence: 1, status: 'completed' }];

  it('reports unloading once the delivery stop is unloading', () => {
    expect(
      deriveTripStatus([...pickupsDone, { type: 'delivery', sequence: 2, status: 'unloading' }]),
    ).toBe('unloading');
  });

  it('keeps driving to delivery before unloading starts', () => {
    expect(
      deriveTripStatus([...pickupsDone, { type: 'delivery', sequence: 2, status: 'pending' }]),
    ).toBe('driving');
    expect(
      deriveTripStatus([...pickupsDone, { type: 'delivery', sequence: 2, status: 'arrived' }]),
    ).toBe('driving');
  });

  it('reports partial delivery and completion separately', () => {
    expect(
      deriveTripStatus([
        ...pickupsDone,
        { type: 'delivery', sequence: 2, status: 'completed' },
        { type: 'delivery', sequence: 3, status: 'unloading' },
      ]),
    ).toBe('partially_delivered');
    expect(
      deriveTripStatus([
        ...pickupsDone,
        { type: 'delivery', sequence: 2, status: 'completed' },
      ]),
    ).toBe('completed');
  });
});
