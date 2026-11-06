import {
  normalizeStopType,
  normalizeStopStatus,
  driverActionForStop,
  deriveTripStatus,
} from './trip-progress';

/**
 * The driver UI is planned from these rules. The regression they guard is the
 * one reported from the field: arriving at a delivery address and still being
 * offered "Start loading".
 */
describe('driver stop actions', () => {
  it('treats upper-case and legacy stop types as their real type', () => {
    expect(normalizeStopType('DELIVERY')).toBe('delivery');
    expect(normalizeStopType('Dropoff')).toBe('delivery');
    expect(normalizeStopType('PICKUP')).toBe('pickup');
    expect(normalizeStopType('loading')).toBe('pickup');
  });

  it('never offers loading actions at a delivery stop', () => {
    const actions = [
      driverActionForStop({ type: 'DELIVERY', status: 'pending' }),
      driverActionForStop({ type: 'delivery', status: 'arrived' }),
      driverActionForStop({ type: 'delivery', status: 'unloading' }),
    ].map((a) => a?.kind);

    expect(actions).toEqual(['arrive_delivery', 'start_unloading', 'complete_delivery']);
    expect(actions).not.toContain('start_loading');
  });

  it('walks the pickup sequence once and then stops offering work', () => {
    expect(driverActionForStop({ type: 'pickup', status: 'pending' })?.kind).toBe('arrive_pickup');
    expect(driverActionForStop({ type: 'pickup', status: 'arrived' })?.kind).toBe('start_loading');
    expect(driverActionForStop({ type: 'pickup', status: 'loading' })?.kind).toBe('complete_loading');
    expect(driverActionForStop({ type: 'pickup', status: 'completed' })).toBeNull();
  });

  it('does not repeat unloading once the stop is completed', () => {
    expect(driverActionForStop({ type: 'delivery', status: 'completed' })).toBeNull();
  });

  it('normalises unknown legacy statuses instead of showing them raw', () => {
    expect(normalizeStopStatus('ARRIVED')).toBe('arrived');
    expect(normalizeStopStatus('in_progress')).toBe('arrived');
    expect(normalizeStopStatus('done')).toBe('completed');
    expect(normalizeStopStatus(undefined)).toBe('pending');
  });

  it('keeps a partially delivered multi-stop trip partial, not completed', () => {
    const stops = [
      { sequence: 1, type: 'pickup', status: 'completed' },
      { sequence: 2, type: 'delivery', status: 'completed' },
      { sequence: 3, type: 'delivery', status: 'pending' },
    ];
    expect(deriveTripStatus(stops)).toBe('partially_delivered');
  });

  it('completes the trip only when every stop is completed', () => {
    const stops = [
      { sequence: 1, type: 'PICKUP', status: 'completed' },
      { sequence: 2, type: 'DELIVERY', status: 'completed' },
    ];
    expect(deriveTripStatus(stops)).toBe('completed');
  });
});
