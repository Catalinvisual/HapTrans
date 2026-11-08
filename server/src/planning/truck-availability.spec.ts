import {
  assessTruckSchedule,
  buildTripOccupancy,
  committedBounds,
  committedOverlap,
  DEFAULT_TURNAROUND_MIN,
  smallestCommittedGapMinutes,
  tripCommittedSpan,
  tripOccupancyFromStops,
  tripOccupancyFromTimeline,
} from './truck-availability';

const iso = (value: string) => new Date(value).toISOString();

/** The production timeline of TRP-2026-0005: two long layovers at Pobiedziska and Berlin. */
const timeline = [
  { sequence: 1, city: 'Écully', arrival: '2026-11-07T02:00:00.000Z', departure: '2026-11-07T02:30:00.000Z', layoverMin: 0, waitingMin: 0 },
  { sequence: 2, city: 'Soest', arrival: '2026-11-07T14:21:00.000Z', departure: '2026-11-07T14:51:00.000Z', layoverMin: 0, waitingMin: 0 },
  { sequence: 3, city: 'Pobiedziska', arrival: '2026-11-08T14:03:00.000Z', departure: '2026-11-10T02:30:00.000Z', layoverMin: 2157, waitingMin: 0 },
  { sequence: 4, city: 'Berlin', arrival: '2026-11-10T18:50:00.000Z', departure: '2026-11-13T04:00:00.000Z', layoverMin: 3400, waitingMin: 0 },
];

const occupancy = tripOccupancyFromTimeline(timeline);

describe('truck occupancy', () => {
  it('derives the idle windows from the same timeline the planner displays', () => {
    expect(occupancy.verified).toBe(true);
    expect(occupancy.source).toBe('timeline');
    expect(occupancy.free).toHaveLength(2);
    expect(occupancy.committed.every((interval) => interval.kind === 'driving' || interval.kind === 'service')).toBe(true);
  });

  it('does not report an overlap for a candidate inside a layover', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T08:00:00.000Z', end: '2026-11-09T11:00:00.000Z' },
      [], // no other trip: this truck is only on the trip being inserted into
    );
    expect(result.status).toBe('available');
    expect(committedOverlap(occupancy, occupancy)).not.toBeNull();
  });

  it('builds occupancy from trip stops when no route plan timeline exists', () => {
    const fromStops = tripOccupancyFromStops([
      { sequence: 1, city: 'Écully', eta: '2026-11-07T02:00:00.000Z', type: 'pickup' },
      { sequence: 2, city: 'Soest', eta: '2026-11-07T14:21:00.000Z', type: 'delivery' },
      // A three-day gap is a layover, not continuous driving occupancy.
      { sequence: 3, city: 'Berlin', eta: '2026-11-10T18:50:00.000Z', type: 'delivery' },
    ]);
    expect(fromStops.verified).toBe(true);
    expect(fromStops.source).toBe('stops');
    expect(fromStops.free.some((interval) => interval.city === 'Soest')).toBe(true);
    expect(committedBounds(fromStops)).not.toBeNull();
  });

  it('never invents occupancy when the timeline is missing', () => {
    expect(tripOccupancyFromTimeline(null).source).toBe('none');
    expect(tripOccupancyFromTimeline(null).verified).toBe(false);
    expect(assessTruckSchedule({ start: '2026-11-09T08:00:00.000Z', end: '2026-11-09T11:00:00.000Z' }, []).status).toBe('available');
  });
});

describe('trip committed span', () => {
  it('starts at the planned departure and ends at the last committed interval, not at a broad planned arrival', () => {
    const span = tripCommittedSpan({
      plannedDeparture: '2026-11-07T06:00:00.000Z',
      plannedArrival: '2026-11-20T18:00:00.000Z',
      stops: [
        { sequence: 1, city: 'Rotterdam', eta: '2026-11-07T06:30:00.000Z', type: 'pickup', completedAt: '2026-11-07T07:00:00.000Z' },
        { sequence: 2, city: 'Hamburg', eta: '2026-11-07T16:00:00.000Z', type: 'delivery', completedAt: '2026-11-07T16:30:00.000Z' },
      ],
    })!;
    expect(span.verified).toBe(true);
    expect(span.source).toBe('committed');
    expect(new Date(span.start).toISOString()).toBe('2026-11-07T06:00:00.000Z');
    // A two-week planned arrival must not extend the truck's occupancy.
    expect(span.end).toBeLessThan(new Date('2026-11-08T00:00:00.000Z').getTime());
    expect(span.end).toBeGreaterThan(new Date('2026-11-07T15:00:00.000Z').getTime());
  });

  it('falls back to the planned span and stays unverified when there is no stop schedule', () => {
    const span = tripCommittedSpan({
      plannedDeparture: '2026-11-07T06:00:00.000Z',
      plannedArrival: '2026-11-07T21:54:00.000Z',
      stops: [],
    })!;
    expect(span.verified).toBe(false);
    expect(span.source).toBe('planned-span');
    expect(new Date(span.end).toISOString()).toBe('2026-11-07T21:54:00.000Z');
  });

  it('returns null when neither a schedule nor a planned span exists', () => {
    expect(tripCommittedSpan({ stops: [] })).toBeNull();
  });
});

describe('truck availability — multiple trips on one truck', () => {
  // Trip A: Monday 06:00 departure, Monday 16:00 final unloading completed.
  const tripA = {
    id: 'trip-a',
    tripNumber: 'TRP-A',
    stops: [
      { sequence: 1, city: 'Rotterdam', eta: '2026-11-09T06:00:00.000Z', type: 'pickup' },
      { sequence: 2, city: 'Hamburg', eta: '2026-11-09T16:00:00.000Z', type: 'delivery', completedAt: '2026-11-09T16:00:00.000Z' },
    ],
  };
  const occupancyA = buildTripOccupancy(tripA);

  it('allows a consecutive trip on the same truck after the turnaround', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T18:00:00.000Z', end: '2026-11-10T08:00:00.000Z' },
      [{ trip: tripA, occupancy: occupancyA }],
      { candidateCity: 'Hamburg' },
    );
    expect(result.status).toBe('available');
    if (result.status === 'available') {
      expect(result.turnaroundGapMin).toBeGreaterThanOrEqual(DEFAULT_TURNAROUND_MIN);
    }
  });

  it('blocks a genuine overlap and reports the exact conflicting trip and period', () => {
    // A real schedule: the truck drives Hamburg -> Bremen between 00:30 and
    // 14:00, so that leg genuinely occupies it.
    const situation = {
      id: 'trip-b',
      tripNumber: 'TRP-B',
      routePlan: {
        optimizationMetadata: {
          scheduleTimeline: [
            { sequence: 1, city: 'Hamburg', arrival: '2026-11-10T00:00:00.000Z', departure: '2026-11-10T00:30:00.000Z', layoverMin: 0, waitingMin: 0 },
            { sequence: 2, city: 'Bremen', arrival: '2026-11-10T14:00:00.000Z', departure: '2026-11-10T14:30:00.000Z', layoverMin: 0, waitingMin: 0 },
          ],
        },
      },
      stops: [],
    };
    const result = assessTruckSchedule(
      { start: '2026-11-10T07:00:00.000Z', end: '2026-11-10T12:00:00.000Z' },
      [{ trip: situation, occupancy: buildTripOccupancy(situation) }],
    );
    expect(result.status).toBe('hard_overlap');
    if (result.status === 'hard_overlap') {
      expect(result.conflict.tripNumber).toBe('TRP-B');
      expect(result.conflict.overlapStart).toBe(iso('2026-11-10T07:00:00.000Z'));
      expect(result.conflict.overlapEnd).toBe(iso('2026-11-10T12:00:00.000Z'));
      expect(result.conflict.overlapMinutes).toBe(300);
      expect(result.conflict.city).toBe('Bremen');
      expect(result.conflict.reason).toContain('Bremen');
      expect(result.conflict.resolution).toContain('after');
    }
  });

  it('blocks a gap shorter than the turnaround', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T16:40:00.000Z', end: '2026-11-09T20:00:00.000Z' },
      [{ trip: tripA, occupancy: occupancyA }],
      { candidateCity: 'Hamburg' },
    );
    expect(result.status).toBe('insufficient_turnaround');
    if (result.status === 'insufficient_turnaround') {
      expect(result.conflict.gapMinutes).toBe(10);
      expect(result.conflict.requiredMinutes).toBe(DEFAULT_TURNAROUND_MIN);
      expect(result.conflict.tripNumber).toBe('TRP-A');
    }
  });

  it('allows a trip before the existing trip when the turnaround fits', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T00:00:00.000Z', end: '2026-11-09T05:00:00.000Z' },
      [{ trip: tripA, occupancy: occupancyA }],
      { candidateCity: 'Rotterdam' },
    );
    expect(result.status).toBe('available');
  });

  it('reports unverified repositioning instead of assuming the truck is free', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T18:00:00.000Z', end: '2026-11-10T08:00:00.000Z' },
      [{ trip: tripA, occupancy: occupancyA }],
      { candidateCity: 'Lyon' },
    );
    expect(result.status).toBe('repositioning_unverified');
  });

  it('requires turnaround plus repositioning when the road time is known', () => {
    const result = assessTruckSchedule(
      { start: '2026-11-09T18:00:00.000Z', end: '2026-11-10T08:00:00.000Z' },
      [{ trip: tripA, occupancy: occupancyA }],
      { candidateCity: 'Lyon', repositionMinutes: () => 300 },
    );
    expect(result.status).toBe('insufficient_turnaround');
    if (result.status === 'insufficient_turnaround') {
      expect(result.conflict.repositionMinutes).toBe(300);
      expect(result.conflict.requiredMinutes).toBe(DEFAULT_TURNAROUND_MIN + 300);
    }
  });

  it('never treats an unverifiable neighbour schedule as confirmed availability', () => {
    const unknown = { id: 'trip-x', tripNumber: 'TRP-X', stops: [] };
    const result = assessTruckSchedule(
      { start: '2026-11-09T18:00:00.000Z', end: '2026-11-10T08:00:00.000Z' },
      [{ trip: unknown, occupancy: buildTripOccupancy(unknown) }],
    );
    expect(result.status).toBe('unverified');
  });

  it('measures the gap between committed intervals, not between calendar ranges', () => {
    const withLayover = buildTripOccupancy({
      id: 'trip-layover',
      tripNumber: 'TRP-L',
      stops: [
        { sequence: 1, city: 'Rotterdam', eta: '2026-11-09T06:00:00.000Z' },
        { sequence: 2, city: 'Pobiedziska', eta: '2026-11-10T14:00:00.000Z' },
        { sequence: 3, city: 'Berlin', eta: '2026-11-11T06:00:00.000Z' },
      ],
    });
    const fullTrip = buildTripOccupancy({
      id: 'trip-full',
      tripNumber: 'TRP-F',
      stops: [{ sequence: 1, city: 'Berlin', eta: '2026-11-12T08:00:00.000Z' }],
    });
    expect(smallestCommittedGapMinutes(withLayover, fullTrip)).toBeGreaterThan(DEFAULT_TURNAROUND_MIN);
  });
});
