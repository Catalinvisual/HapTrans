import { assessLoadingWindow, isLoadStopType, orderPickupWindow, stopArrival } from './loading-window';
import { operationalTimeZone, wallClockToInstant } from '../common/operational-time';

// Order stops hold an operational-zone wall clock, not a server-zone Date.
const at = (date: string, time: string) => wallClockToInstant(date, time, operationalTimeZone())!;

describe('loading window assessment', () => {
  const order = {
    id: 'ord-31',
    orderNumber: 'ORD-2026-000031',
    stops: [
      { type: 'pickup', sequence: 1, city: 'Écully', dateFrom: '2026-11-07', timeFrom: '06:00', timeUntil: '10:00' },
      { type: 'delivery', sequence: 2, city: 'Berlin', dateFrom: '2026-11-08', timeUntil: '18:00' },
    ],
  };

  it('uses the pickup stop window, never the delivery window', () => {
    const window = orderPickupWindow(order);
    expect(window.end?.toISOString()).toBe(at('2026-11-07', '10:00').toISOString());
  });

  it('does not warn when the arrival is inside the window', () => {
    const window = orderPickupWindow(order);
    const result = assessLoadingWindow(at('2026-11-07', '08:30'), window.end);
    expect(result.status).toBe('ok');
    expect(result.lateMinutes).toBe(0);
  });

  it('warns when the arrival is after the window closes', () => {
    const window = orderPickupWindow(order);
    const result = assessLoadingWindow(at('2026-11-07', '12:15'), window.end);
    expect(result.status).toBe('late');
    expect(result.lateMinutes).toBe(135);
  });

  it('stays unverified when no arrival is recorded', () => {
    const window = orderPickupWindow(order);
    const result = assessLoadingWindow(null, window.end);
    expect(result.status).toBe('unverified');
    expect(result.reason).toBe('missing_arrival');
  });

  it('stays unverified when the order has no pickup window', () => {
    const noWindow = { id: 'ord-32', stops: [{ type: 'pickup', sequence: 1 }] };
    const window = orderPickupWindow(noWindow);
    expect(window.end).toBeNull();
    expect(assessLoadingWindow(new Date('2026-11-07T12:00:00'), window.end).status).toBe('unverified');
  });

  it('only falls back to the trip departure for the first stop', () => {
    const departure = new Date('2026-11-07T05:00:00');
    expect(stopArrival({}, departure, true)?.toISOString()).toBe(departure.toISOString());
    expect(stopArrival({}, departure, false)).toBeNull();
  });

  it('recognises load and unload stop types', () => {
    expect(isLoadStopType('pickup')).toBe(true);
    expect(isLoadStopType('LOAD')).toBe(true);
    expect(isLoadStopType('delivery')).toBe(false);
  });
});
