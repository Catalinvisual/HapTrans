import { isActiveTrip, isResourceBusyNow, tripInterval, tripOverlaps } from './trip-availability';

const trip = (id: string, status: string, start: string, end: string) => ({
  id,
  status,
  plannedDeparture: new Date(start),
  plannedArrival: new Date(end),
});

describe('canonical trip availability', () => {
  it('does not reserve resources for completed or cancelled trips', () => {
    expect(isActiveTrip(trip('done', 'completed', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z'))).toBe(false);
    expect(isActiveTrip(trip('cancelled', 'cancelled', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z'))).toBe(false);
    expect(isActiveTrip(trip('planned', 'planned', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z'))).toBe(true);
  });

  it('detects only genuine interval overlap, not back-to-back trips', () => {
    const a = trip('a', 'planned', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z');
    const b = trip('b', 'planned', '2026-11-12T01:00:00Z', '2026-11-13T10:00:00Z');
    const c = trip('c', 'planned', '2026-11-11T22:00:00Z', '2026-11-12T04:00:00Z');
    expect(tripOverlaps(a, b)).toBe(false);
    expect(tripOverlaps(a, c)).toBe(true);
  });

  it('never invents an interval when the end is missing', () => {
    expect(tripInterval({ status: 'planned', plannedDeparture: new Date('2026-11-10T00:00:00Z') })).toBeNull();
  });

  it('is busy now only when an active trip covers the current instant', () => {
    const now = new Date('2026-11-11T12:00:00Z');
    expect(isResourceBusyNow([trip('a', 'planned', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z')], now)).toBe(true);
    expect(isResourceBusyNow([trip('done', 'completed', '2026-11-10T00:00:00Z', '2026-11-12T01:00:00Z')], now)).toBe(false);
  });
});