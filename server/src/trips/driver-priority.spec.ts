import { driverTripPriority, sortDriverTrips } from './trip-progress';

/**
 * The driver must always work the trip that is actually under way. A newer
 * assignment for tomorrow may not overtake a trip that is being unloaded, and a
 * finished trip never becomes the current job again.
 */
describe('driver trip priority', () => {
  const unloadTomorrow = {
    id: 'trip-a',
    tripNumber: 'TRP-2026-0001',
    status: 'driving',
    plannedDeparture: '2026-11-05T08:00:00.000Z',
  };
  const assignedFuture = {
    id: 'trip-b',
    tripNumber: 'TRP-2026-0002',
    status: 'dispatched',
    plannedDeparture: '2026-11-07T08:00:00.000Z',
  };

  it('ranks an active trip above a newer assignment', () => {
    expect(driverTripPriority(unloadTomorrow)).toBeLessThan(driverTripPriority(assignedFuture));
  });

  it('keeps the active trip first even when it was created earlier', () => {
    const ordered = sortDriverTrips([assignedFuture, unloadTomorrow]);
    expect(ordered.map((t) => t.id)).toEqual(['trip-a', 'trip-b']);
  });

  it('orders waiting trips by their planned departure', () => {
    const today = { id: 'today', status: 'dispatched', plannedDeparture: '2026-11-06T08:00:00.000Z' };
    const later = { id: 'later', status: 'dispatched', plannedDeparture: '2026-11-09T08:00:00.000Z' };
    expect(sortDriverTrips([later, today]).map((t) => t.id)).toEqual(['today', 'later']);
  });

  it('puts accepted work before trips still waiting for acceptance', () => {
    const accepted = { id: 'accepted', status: 'driver_accepted', plannedDeparture: '2026-11-07T08:00:00.000Z' };
    expect(sortDriverTrips([assignedFuture, accepted]).map((t) => t.id)).toEqual(['accepted', 'trip-b']);
  });

  it('ranks completed and cancelled trips last', () => {
    const completed = { id: 'done', status: 'completed', actualArrival: '2026-11-06T10:00:00.000Z' };
    const cancelled = { id: 'stopped', status: 'cancelled' };
    expect(sortDriverTrips([completed, cancelled, unloadTomorrow]).map((t) => t.id)).toEqual([
      'trip-a',
      'done',
      'stopped',
    ]);
    expect(driverTripPriority(completed)).toBe(3);
  });

  it('is stable for trips with the same planned departure', () => {
    const one = { id: '2', tripNumber: 'TRP-2026-0002', status: 'dispatched', plannedDeparture: '2026-11-07T08:00:00.000Z' };
    const two = { id: '1', tripNumber: 'TRP-2026-0001', status: 'dispatched', plannedDeparture: '2026-11-07T08:00:00.000Z' };
    expect(sortDriverTrips([one, two]).map((t) => t.tripNumber)).toEqual(['TRP-2026-0001', 'TRP-2026-0002']);
  });
});
