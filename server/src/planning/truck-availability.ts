/**
 * Truck availability for a candidate order.
 *
 * A trip is not a continuous reservation. The persisted schedule timeline
 * already separates driving legs, service at stops and the idle period at a
 * stop (layover). Availability must use those intervals, otherwise every date
 * between the first pickup and the last delivery looks double-booked even when
 * the vehicle is standing still at a customer for two days.
 *
 * A free interval is deliberately not an automatic yes: the truck is at the
 * stop's location, so repositioning, the new sequence and driver hours still
 * have to be previewed. The assessment therefore distinguishes a real overlap
 * from a gap that needs an insertion preview.
 */

export interface OccupancyInterval {
  start: number;
  end: number;
  city: string | null;
  stopId: string | null;
}

export interface TripOccupancy {
  /** True when at least one stop had usable arrival and departure times. */
  verified: boolean;
  /** Driving legs and service at stops: the vehicle is occupied. */
  committed: OccupancyInterval[];
  /** Idle time at a stop (layover / waiting): the vehicle is parked there. */
  free: OccupancyInterval[];
}

const toMs = (value: any): number | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  return Number.isNaN(ms) ? null : ms;
};

const minutes = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/**
 * Derives occupancy from `optimizationMetadata.scheduleTimeline`, the same
 * timeline the planner displays. Each stop contributes:
 *  - the driving leg that ended at it (occupied),
 *  - the idle period before its window/service opened (parked = free),
 *  - its service interval (occupied).
 */
export function tripOccupancyFromTimeline(rawStops: any[] | null | undefined): TripOccupancy {
  const stops = Array.isArray(rawStops)
    ? [...rawStops].sort((a, b) => (Number(a?.sequence) || 0) - (Number(b?.sequence) || 0))
    : [];

  const committed: OccupancyInterval[] = [];
  const free: OccupancyInterval[] = [];
  let previousDeparture: number | null = null;
  let verified = false;

  for (const stop of stops) {
    const arrival = toMs(stop?.arrival);
    const departure = toMs(stop?.departure);
    if (arrival === null || departure === null || departure < arrival) continue;
    verified = true;

    if (previousDeparture !== null && arrival > previousDeparture) {
      committed.push({
        start: previousDeparture,
        end: arrival,
        city: stop?.city ?? null,
        stopId: stop?.id ?? null,
      });
    }

    const explicitServiceStart = toMs(stop?.serviceStart);
    const idleMinutes = minutes(stop?.layoverMin) + minutes(stop?.waitingMin);
    const serviceStart = explicitServiceStart ?? Math.min(departure, arrival + idleMinutes * 60000);

    if (serviceStart > arrival) {
      free.push({
        start: arrival,
        end: serviceStart,
        city: stop?.city ?? null,
        stopId: stop?.id ?? null,
      });
    }
    if (departure > serviceStart) {
      committed.push({
        start: serviceStart,
        end: departure,
        city: stop?.city ?? null,
        stopId: stop?.id ?? null,
      });
    }

    previousDeparture = departure;
  }

  return { verified, committed, free };
}

export type CandidateAvailability =
  | { status: 'conflict'; interval: OccupancyInterval; overlapMinutes: number }
  | { status: 'free_gap'; interval: OccupancyInterval; windowMinutes: number }
  | { status: 'no_overlap' }
  | { status: 'unverified' };

/**
 * Compares the candidate order's operation window with the trip occupancy.
 * `conflict` means a driving leg or service interval is genuinely occupied;
 * `free_gap` means the candidate falls in the vehicle's idle time and must be
 * checked by the insertion preview (repositioning, sequence, driver hours).
 */
export function assessCandidateAvailability(
  candidate: { start: any; end: any },
  occupancy: TripOccupancy,
): CandidateAvailability {
  const start = toMs(candidate.start);
  const end = toMs(candidate.end);
  if (start === null || end === null || end < start) return { status: 'unverified' };
  if (!occupancy.verified) return { status: 'unverified' };

  const hit = occupancy.committed.find((interval) => interval.start < end && interval.end > start);
  if (hit) {
    return {
      status: 'conflict',
      interval: hit,
      overlapMinutes: Math.round((Math.min(hit.end, end) - Math.max(hit.start, start)) / 60000),
    };
  }

  const gap = occupancy.free.find((interval) => interval.start < end && interval.end > start);
  if (gap) {
    return {
      status: 'free_gap',
      interval: gap,
      windowMinutes: Math.round((gap.end - gap.start) / 60000),
    };
  }

  return { status: 'no_overlap' };
}
