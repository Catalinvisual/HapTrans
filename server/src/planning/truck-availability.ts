/**
 * Truck availability for a candidate order or an independent follow-on trip.
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
 *
 * Two trips on the same truck are allowed whenever the operational intervals do
 * not overlap and the turnaround (and, when known, the repositioning drive)
 * fits in the gap. A cargo-capacity conflict is never reported here.
 */

export type OccupancyKind = 'driving' | 'service' | 'layover';

export interface OccupancyInterval {
  start: number;
  end: number;
  city: string | null;
  stopId: string | null;
  kind?: OccupancyKind;
}

export interface TripOccupancy {
  /** True when at least one stop had usable arrival and departure times. */
  verified: boolean;
  /** Where the intervals came from. Never presented as confirmed when `none`. */
  source: 'timeline' | 'stops' | 'none';
  /** Driving legs and service at stops: the vehicle is occupied. */
  committed: OccupancyInterval[];
  /** Idle time at a stop (layover / waiting): the vehicle is parked there. */
  free: OccupancyInterval[];
}

/** Preparation, fuelling and paperwork between two trips on one truck. */
export const DEFAULT_TURNAROUND_MIN = 45;
/** A schedule gap longer than this is a layover, not waiting at a customer. */
const LAYOVER_GAP_MIN = 240;
/** Fallback handling time at a stop when no measured milestone exists. */
const DEFAULT_SERVICE_MIN = 30;

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
        kind: 'driving',
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
        kind: 'layover',
      });
    }
    if (departure > serviceStart) {
      committed.push({
        start: serviceStart,
        end: departure,
        city: stop?.city ?? null,
        stopId: stop?.id ?? null,
        kind: 'service',
      });
    }

    previousDeparture = departure;
  }

  return { verified, source: verified ? 'timeline' : 'none', committed, free };
}

/**
 * Fallback occupancy from the trip's own stop rows when no route plan timeline
 * exists. Only recorded arrival estimates are used. A gap longer than four hours
 * is treated as a layover (the same rule the schedule model uses), so a
 * multi-day order window cannot look like continuous driving occupancy.
 */
export function tripOccupancyFromStops(rawStops: any[] | null | undefined): TripOccupancy {
  const stops = Array.isArray(rawStops)
    ? [...rawStops].sort(
      (a, b) =>
        (Number(a?.sequence) || Number(a?.stopOrder) || 0) -
        (Number(b?.sequence) || Number(b?.stopOrder) || 0),
    )
    : [];

  const committed: OccupancyInterval[] = [];
  const free: OccupancyInterval[] = [];
  let previousDeparture: number | null = null;
  let verified = false;

  for (const stop of stops) {
    const arrival = toMs(stop?.eta) ?? toMs(stop?.plannedArrival);
    if (arrival === null) continue;
    verified = true;

    if (previousDeparture !== null && arrival > previousDeparture) {
      const gapMinutes = (arrival - previousDeparture) / 60000;
      if (gapMinutes <= LAYOVER_GAP_MIN) {
        committed.push({
          start: previousDeparture,
          end: arrival,
          city: stop?.city ?? null,
          stopId: stop?.id ?? null,
          kind: 'driving',
        });
      } else {
        free.push({
          start: previousDeparture,
          end: arrival,
          city: stop?.city ?? null,
          stopId: stop?.id ?? null,
          kind: 'layover',
        });
      }
    }

    const serviceStart = toMs(stop?.loadingStartedAt) ?? toMs(stop?.unloadingStartedAt) ?? toMs(stop?.ata) ?? arrival;
    const serviceMinutes = minutes(stop?.serviceMinutes)
      || (toMs(stop?.completedAt) !== null ? Math.max(0, ((toMs(stop?.completedAt) as number) - serviceStart) / 60000) : 0)
      || DEFAULT_SERVICE_MIN;
    const serviceEnd = Math.max(serviceStart, serviceStart) + serviceMinutes * 60000;
    if (serviceEnd > serviceStart) {
      committed.push({
        start: serviceStart,
        end: serviceEnd,
        city: stop?.city ?? null,
        stopId: stop?.id ?? null,
        kind: 'service',
      });
      if (toMs(stop?.completedAt) === null) {
        // The departure is estimated from the handling time model, not recorded.
        free.push({
          start: serviceEnd,
          end: serviceEnd,
          city: stop?.city ?? null,
          stopId: stop?.id ?? null,
          kind: 'layover',
        });
      }
    }
    previousDeparture = serviceEnd;
  }

  return { verified, source: verified ? 'stops' : 'none', committed, free };
}

/** Occupancy of one trip: the persisted timeline first, its stops second. */
export function buildTripOccupancy(trip: any): TripOccupancy {
  if (!trip) return { verified: false, source: 'none', committed: [], free: [] };
  const timeline = (trip?.routePlan?.optimizationMetadata as any)?.scheduleTimeline;
  const fromTimeline = tripOccupancyFromTimeline(timeline);
  if (fromTimeline.verified) return fromTimeline;
  return tripOccupancyFromStops(trip?.stops);
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

export interface ScheduleConflictDetails {
  tripId: string;
  resourceId?: string | null;
  tripNumber: string | null;
  overlapStart: string;
  overlapEnd: string;
  overlapMinutes: number;
  busyStart: string;
  busyEnd: string;
  city: string | null;
  reason: string;
  resolution: string;
}

export interface TurnaroundDetails {
  tripId: string;
  tripNumber: string | null;
  gapMinutes: number;
  requiredMinutes: number;
  turnaroundMinutes: number;
  repositionMinutes: number | null;
  busyStart: string;
  busyEnd: string;
  city: string | null;
  reason: string;
  resolution: string;
}

/** First and last committed instant of a trip, or null when unverified. */
/**
 * The window in which a trip occupies its truck for cross-trip comparisons.
 *
 * It starts at `plannedDeparture` (the truck leaves the yard) and ends at the
 * last committed interval — never at a broad `plannedArrival` calendar range.
 * A trip with no stop-level schedule at all falls back to its planned span and
 * is flagged `verified: false`, so callers can report an unconfirmed decision
 * instead of treating the truck as free.
 */
export function tripCommittedSpan(
  trip: any,
  occupancy?: TripOccupancy,
): { start: number; end: number; source: 'committed' | 'planned-span'; verified: boolean } | null {
  const intervals = occupancy || buildTripOccupancy(trip);
  const bounds = committedBounds(intervals);
  const plannedStart = toMs(trip?.plannedDeparture);
  const plannedEnd = toMs(trip?.plannedArrival);
  if (bounds) {
    return {
      start: plannedStart !== null && plannedStart < bounds.start ? plannedStart : bounds.start,
      end: bounds.end,
      source: 'committed',
      verified: true,
    };
  }
  if (plannedStart === null || plannedEnd === null || plannedEnd <= plannedStart) return null;
  return { start: plannedStart, end: plannedEnd, source: 'planned-span', verified: false };
}

export function committedBounds(occupancy: TripOccupancy): { start: number; end: number } | null {
  if (!occupancy?.verified || !occupancy.committed.length) return null;
  const starts = occupancy.committed.map((interval) => interval.start);
  const ends = occupancy.committed.map((interval) => interval.end);
  return { start: Math.min(...starts), end: Math.max(...ends) };
}

/** The first genuinely occupied interval shared by two trips. */
export function committedOverlap(
  a: TripOccupancy,
  b: TripOccupancy,
): { start: number; end: number; a: OccupancyInterval; b: OccupancyInterval } | null {
  for (const left of a?.committed || []) {
    for (const right of b?.committed || []) {
      if (left.start < right.end && right.start < left.end) {
        return {
          start: Math.max(left.start, right.start),
          end: Math.min(left.end, right.end),
          a: left,
          b: right,
        };
      }
    }
  }
  return null;
}

/** Smallest gap between two trips' occupied intervals, in minutes. */
export function smallestCommittedGapMinutes(a: TripOccupancy, b: TripOccupancy): number | null {
  let smallest: number | null = null;
  for (const left of a?.committed || []) {
    for (const right of b?.committed || []) {
      const gap = left.end <= right.start ? right.start - left.end : right.end <= left.start ? left.start - right.end : 0;
      const minutes = Math.round(gap / 60000);
      if (smallest === null || minutes < smallest) smallest = minutes;
    }
  }
  return smallest;
}

export type TruckScheduleAssessment =
  | { status: 'available'; turnaroundGapMin: number | null; repositionVerified: boolean }
  | { status: 'hard_overlap'; conflict: ScheduleConflictDetails }
  | { status: 'insufficient_turnaround'; conflict: TurnaroundDetails }
  | { status: 'repositioning_unverified'; details: TurnaroundDetails }
  | { status: 'unverified'; reason: string };

export interface OtherTripOccupancy {
  trip: any;
  occupancy: TripOccupancy;
}

export interface AssessTruckScheduleOptions {
  turnaroundMin?: number;
  /**
   * Real driving time between the two activities. `null` means the provider had
   * no answer; the caller then reports unverified repositioning instead of
   * assuming the truck is free.
   */
  repositionMinutes?: (info: {
    fromTrip: any;
    from: 'previous' | 'next';
    otherCity: string | null;
    candidateCity: string | null;
  }) => number | null;
  candidateCity?: string | null;
  /** True when the candidate route is fully verified (has real road legs). */
  candidateRouteVerified?: boolean;
}

const tripRef = (trip: any): string => String(trip?.tripNumber || trip?.id || 'unknown');

/**
 * Assesses one candidate occupation interval against every other active trip of
 * the same truck. Only committed driving/service intervals can conflict; a
 * layover is a real free gap and is accepted when turnaround fits.
 */
export function assessTruckSchedule(
  candidate: { start: any; end: any },
  others: OtherTripOccupancy[],
  options: AssessTruckScheduleOptions = {},
): TruckScheduleAssessment {
  const start = toMs(candidate.start);
  const end = toMs(candidate.end);
  if (start === null || end === null || end < start) {
    return { status: 'unverified', reason: 'The candidate activity has no complete start and end.' };
  }

  const turnaroundMin = Number.isFinite(Number(options.turnaroundMin))
    ? Math.max(0, Number(options.turnaroundMin))
    : DEFAULT_TURNAROUND_MIN;

  let unverifiedReason: string | null = null;
  let smallestGap: number | null = null;
  let repositionVerified = true;

  for (const other of others || []) {
    const occupancy = other?.occupancy;
    const trip = other?.trip;
    if (!trip || !occupancy) continue;
    if (!occupancy.verified) {
      // A truck committed to a trip we cannot model is not proof of availability.
      unverifiedReason = `Trip ${tripRef(trip)} has no verifiable schedule.`;
      continue;
    }

    const committed = [...occupancy.committed].sort((a, b) => a.start - b.start);
    if (committed.length === 0) continue;

    const hit = committed.find((interval) => interval.start < end && interval.end > start);
    if (hit) {
      const overlapStart = Math.max(hit.start, start);
      const overlapEnd = Math.min(hit.end, end);
      return {
        status: 'hard_overlap',
        conflict: {
          tripId: String(trip.id),
          tripNumber: trip.tripNumber || null,
          overlapStart: new Date(overlapStart).toISOString(),
          overlapEnd: new Date(overlapEnd).toISOString(),
          overlapMinutes: Math.round((overlapEnd - overlapStart) / 60000),
          busyStart: new Date(hit.start).toISOString(),
          busyEnd: new Date(hit.end).toISOString(),
          city: hit.city,
          reason: `The truck is ${hit.kind === 'service' ? 'loading/unloading' : 'driving'} on trip ${tripRef(trip)} at ${hit.city || 'this stop'} during the requested period.`,
          resolution: `Move this activity after ${new Date(hit.end).toISOString()} or assign another truck.`,
        },
      };
    }

    const firstStart = committed[0].start;
    const lastEnd = committed[committed.length - 1].end;

    const after = start >= lastEnd;
    const gapMinutes = after ? (start - lastEnd) / 60000 : firstStart >= end ? (firstStart - end) / 60000 : 0;
    if (smallestGap === null || gapMinutes < smallestGap) smallestGap = Math.round(gapMinutes);

    if (gapMinutes < turnaroundMin) {
      const busyStart = after ? lastEnd : firstStart;
      const busyEnd = after ? lastEnd : firstStart;
      return {
        status: 'insufficient_turnaround',
        conflict: {
          tripId: String(trip.id),
          tripNumber: trip.tripNumber || null,
          gapMinutes: Math.round(gapMinutes),
          requiredMinutes: turnaroundMin,
          turnaroundMinutes: turnaroundMin,
          repositionMinutes: null,
          busyStart: new Date(busyStart).toISOString(),
          busyEnd: new Date(busyEnd).toISOString(),
          city: after ? committed[committed.length - 1].city : committed[0].city,
          reason: `Only ${Math.round(gapMinutes)} min separate this activity from trip ${tripRef(trip)}; ${turnaroundMin} min of turnaround and preparation is required.`,
          resolution: `Start at least ${Math.ceil(turnaroundMin - gapMinutes)} min later, or reduce the turnaround by pre-loading the trailer.`,
        },
      };
    }

    // Repositioning: the truck ends somewhere else and must drive to the next
    // job. Without a route answer the gap is not proof of availability.
    const otherCity = after ? committed[committed.length - 1].city : committed[0].city;
    const candidateCity = options.candidateCity ?? null;
    if (otherCity && candidateCity && otherCity !== candidateCity) {
      const repositionMinutes = options.repositionMinutes
        ? options.repositionMinutes({ fromTrip: trip, from: after ? 'previous' : 'next', otherCity, candidateCity })
        : null;
      if (repositionMinutes === null) {
        repositionVerified = false;
        if (unverifiedReason === null) {
          unverifiedReason = `Repositioning from ${otherCity} to ${candidateCity} after trip ${tripRef(trip)} has no road route.`;
        }
        // Never claim the truck is free when the necessary drive is unknown.
        const details: TurnaroundDetails = {
          tripId: String(trip.id),
          tripNumber: trip.tripNumber || null,
          gapMinutes: Math.round(gapMinutes),
          requiredMinutes: turnaroundMin,
          turnaroundMinutes: turnaroundMin,
          repositionMinutes: null,
          busyStart: new Date(after ? lastEnd : firstStart).toISOString(),
          busyEnd: new Date(after ? lastEnd : firstStart).toISOString(),
          city: otherCity,
          reason: `The truck is at ${otherCity} and the next activity starts at ${candidateCity}; the repositioning drive is unknown.`,
          resolution: 'Verify the road route between the two locations before confirming the schedule.',
        };
        return { status: 'repositioning_unverified', details };
      }
      if (gapMinutes < turnaroundMin + repositionMinutes) {
        return {
          status: 'insufficient_turnaround',
          conflict: {
            tripId: String(trip.id),
            tripNumber: trip.tripNumber || null,
            gapMinutes: Math.round(gapMinutes),
            requiredMinutes: Math.round(turnaroundMin + repositionMinutes),
            turnaroundMinutes: turnaroundMin,
            repositionMinutes: Math.round(repositionMinutes),
            busyStart: new Date(after ? lastEnd : firstStart).toISOString(),
            busyEnd: new Date(after ? lastEnd : firstStart).toISOString(),
            city: otherCity,
            reason: `The gap is ${Math.round(gapMinutes)} min but ${turnaroundMin} min turnaround plus ${Math.round(repositionMinutes)} min repositioning from ${otherCity} is required.`,
            resolution: `Start at least ${Math.ceil(turnaroundMin + repositionMinutes - gapMinutes)} min later, or move the activity to a truck already near ${candidateCity}.`,
          },
        };
      }
    }
  }

  if (unverifiedReason) {
    // A smaller gap may still be real, but a missing neighbour schedule means
    // availability cannot be confirmed; the caller reports it as unverified.
    return { status: 'unverified', reason: unverifiedReason };
  }

  return {
    status: 'available',
    turnaroundGapMin: smallestGap,
    repositionVerified,
  };
}
