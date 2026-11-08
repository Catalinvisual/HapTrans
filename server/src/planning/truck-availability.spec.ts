import { assessCandidateAvailability, tripOccupancyFromTimeline } from './truck-availability';

// The production timeline of TRP-2026-0005: two long layovers at Pobiedziska
// and Berlin, which must not be treated as a continuous truck reservation.
const timeline = [
  { sequence: 1, city: 'Écully', arrival: '2026-11-07T02:00:00.000Z', departure: '2026-11-07T02:30:00.000Z', layoverMin: 0, waitingMin: 0 },
  { sequence: 2, city: 'Soest', arrival: '2026-11-07T14:21:00.000Z', departure: '2026-11-07T14:51:00.000Z', layoverMin: 0, waitingMin: 0 },
  { sequence: 3, city: 'Pobiedziska', arrival: '2026-11-08T14:03:00.000Z', departure: '2026-11-10T02:30:00.000Z', layoverMin: 2157, waitingMin: 0 },
  { sequence: 4, city: 'Berlin', arrival: '2026-11-10T18:50:00.000Z', departure: '2026-11-13T04:00:00.000Z', layoverMin: 3400, waitingMin: 0 },
];

const occupancy = tripOccupancyFromTimeline(timeline);

describe('truck availability', () => {
  it('derives the idle windows from the same timeline the planner displays', () => {
    expect(occupancy.verified).toBe(true);
    expect(occupancy.free).toHaveLength(2);
    expect(occupancy.free[0].city).toBe('Pobiedziska');
    expect(Math.round((occupancy.free[0].end - occupancy.free[0].start) / 3600000)).toBe(36);
    expect(occupancy.free[1].city).toBe('Berlin');
  });

  it('does not report an overlap for a candidate inside a layover', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-09T08:00:00.000Z', end: '2026-11-09T11:00:00.000Z' },
      occupancy,
    );
    expect(result.status).toBe('free_gap');
    if (result.status === 'free_gap') {
      expect(result.interval.city).toBe('Pobiedziska');
      expect(result.windowMinutes).toBe(2157);
    }
  });

  it('reports an overlap when the candidate needs the truck while it is driving', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-08T08:00:00.000Z', end: '2026-11-08T16:00:00.000Z' },
      occupancy,
    );
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') {
      expect(result.interval.city).toBe('Pobiedziska');
      expect(result.overlapMinutes).toBeGreaterThan(0);
    }
  });

  it('reports an overlap for a candidate during service at a stop', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-07T02:10:00.000Z', end: '2026-11-07T02:20:00.000Z' },
      occupancy,
    );
    expect(result.status).toBe('conflict');
  });

  it('accepts a candidate that fits exactly inside the free window', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-08T14:10:00.000Z', end: '2026-11-10T01:50:00.000Z' },
      occupancy,
    );
    expect(result.status).toBe('free_gap');
  });

  it('flags a candidate that exceeds the free window by a few minutes as a conflict', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-10T02:00:00.000Z', end: '2026-11-10T02:40:00.000Z' },
      occupancy,
    );
    expect(result.status).toBe('conflict');
  });

  it('never invents availability when the timeline is missing', () => {
    const result = assessCandidateAvailability(
      { start: '2026-11-09T08:00:00.000Z', end: '2026-11-09T11:00:00.000Z' },
      tripOccupancyFromTimeline(null),
    );
    expect(result.status).toBe('unverified');
  });
});
