/**
 * Timeline model for a planned trip.
 *
 * The planner used to add every gap between the vehicle's arrival and a stop's
 * window start to "waiting". Order windows can be days apart, so a single
 * multi-order trip reported 140h+ of customer waiting. Waiting is now only the
 * short period at a stop before its window opens; a longer gap is a layover /
 * schedule gap, which is still elapsed time but is not time spent waiting at a
 * customer. Breaks and daily rests are separate intervals, so no minute is
 * counted twice and the components always add up to the elapsed time.
 */

export const MAX_STOP_WAIT_MIN = 240;
export const BREAK_AFTER_DRIVING_MIN = 270;
export const BREAK_MINUTES = 45;
export const DAILY_DRIVING_LIMIT_MIN = 540;
export const DAILY_REST_MINUTES = 660;

export interface ScheduleStopInput {
  id?: string | null;
  sequence?: number | null;
  city?: string | null;
  type?: string | null;
  timeWindowStart?: Date | string | null;
  timeWindowEnd?: Date | string | null;
  serviceDurationMinutes?: number | null;
  /** Road-driving minutes of the leg that ends at this stop. */
  durationFromPreviousMin?: number | null;
}

export interface ScheduleWarning {
  code: string;
  severity: 'warning' | 'error';
  stopId?: string | null;
  city?: string | null;
  params?: Record<string, unknown>;
  message: string;
}

export interface ScheduledStop {
  id: string | null;
  sequence: number;
  city: string | null;
  arrival: Date;
  windowStart: Date | null;
  windowEnd: Date | null;
  serviceStart: Date;
  departure: Date;
  waitingMin: number;
  layoverMin: number;
  serviceMin: number;
  breakMin: number;
  restMin: number;
  conflict: boolean;
}

export interface ScheduleBreakdown {
  drivingMin: number;
  waitingMin: number;
  serviceMin: number;
  breakMin: number;
  restMin: number;
  layoverMin: number;
  elapsedMin: number;
  stops: ScheduledStop[];
  gaps: Array<{ stopId: string | null; city: string | null; minutes: number }>;
  conflicts: Array<{ stopId: string | null; city: string | null; arrival: Date; windowEnd: Date }>;
  warnings: ScheduleWarning[];
}

const toDate = (value: any): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const positive = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/**
 * Builds the full timeline. `elapsedMin` is the sum of the component intervals
 * (driving, service, waiting, break, rest, layover) and the timestamps are
 * advanced with exactly those intervals, so the two can never disagree.
 */
export function buildRouteSchedule(input: {
  stops: ScheduleStopInput[];
  departure?: Date | string | null;
}): ScheduleBreakdown {
  const stops = input.stops || [];
  const firstWindow = toDate(stops[0]?.timeWindowStart);
  const departure = toDate(input.departure) || firstWindow || new Date();

  let cursor = departure.getTime();
  let drivingSinceBreak = 0;
  let drivingToday = 0;
  let drivingMin = 0;
  let waitingMin = 0;
  let serviceMin = 0;
  let breakMin = 0;
  let restMin = 0;
  let layoverMin = 0;

  const gaps: ScheduleBreakdown['gaps'] = [];
  const conflicts: ScheduleBreakdown['conflicts'] = [];
  const warnings: ScheduleWarning[] = [];
  const scheduled: ScheduledStop[] = [];

  stops.forEach((stop, index) => {
    let stopBreak = 0;
    let stopRest = 0;

    if (index > 0) {
      const legMin = positive(stop.durationFromPreviousMin);

      // A duty day cannot absorb more than the daily driving limit; the driver
      // takes a full daily rest before continuing.
      if (drivingToday > 0 && drivingToday + legMin > DAILY_DRIVING_LIMIT_MIN) {
        cursor += DAILY_REST_MINUTES * 60000;
        restMin += DAILY_REST_MINUTES;
        stopRest += DAILY_REST_MINUTES;
        drivingToday = 0;
        drivingSinceBreak = 0;
      }

      cursor += legMin * 60000;
      drivingMin += legMin;
      drivingToday += legMin;
      drivingSinceBreak += legMin;

      if (drivingSinceBreak >= BREAK_AFTER_DRIVING_MIN) {
        cursor += BREAK_MINUTES * 60000;
        breakMin += BREAK_MINUTES;
        stopBreak += BREAK_MINUTES;
        drivingSinceBreak = 0;
      }
    }

    const arrival = new Date(cursor);
    const windowStart = toDate(stop.timeWindowStart);
    const windowEnd = toDate(stop.timeWindowEnd);

    let stopWaiting = 0;
    let stopLayover = 0;
    if (windowStart && arrival.getTime() < windowStart.getTime()) {
      const gap = (windowStart.getTime() - arrival.getTime()) / 60000;
      if (gap <= MAX_STOP_WAIT_MIN) {
        stopWaiting = gap;
        waitingMin += gap;
      } else {
        // Days between windows are not customer waiting: the truck is idle
        // between operations, and the dispatcher must see that as a gap.
        stopLayover = gap;
        layoverMin += gap;
        gaps.push({ stopId: stop.id || null, city: stop.city || null, minutes: round(gap) });
        warnings.push({
          code: 'schedule_gap',
          severity: 'warning',
          stopId: stop.id || null,
          city: stop.city || null,
          params: { gapMinutes: Math.round(gap), windowStart: windowStart.toISOString() },
          message: `A ${(gap / 60).toFixed(1)}h gap separates the previous departure from the window opening at ${stop.city || 'this stop'}. It is planned as layover, not customer waiting.`,
        });
      }
      cursor = windowStart.getTime();
    }

    const serviceStart = new Date(cursor);
    const stopService = positive(stop.serviceDurationMinutes) || 30;
    serviceMin += stopService;
    cursor += stopService * 60000;
    const departureAtStop = new Date(cursor);

    const conflict = !!(windowEnd && serviceStart.getTime() > windowEnd.getTime());
    if (conflict && windowEnd) {
      conflicts.push({ stopId: stop.id || null, city: stop.city || null, arrival: serviceStart, windowEnd });
      warnings.push({
        code: 'schedule_window_conflict',
        severity: 'error',
        stopId: stop.id || null,
        city: stop.city || null,
        params: { arrival: serviceStart.toISOString(), windowEnd: windowEnd.toISOString() },
        message: `Service at ${stop.city || 'the stop'} starts at ${serviceStart.toISOString()}, after the window closes at ${windowEnd.toISOString()}.`,
      });
    }

    scheduled.push({
      id: stop.id || null,
      sequence: Number(stop.sequence) || index + 1,
      city: stop.city || null,
      arrival,
      windowStart,
      windowEnd,
      serviceStart,
      departure: departureAtStop,
      waitingMin: round(stopWaiting),
      layoverMin: round(stopLayover),
      serviceMin: round(stopService),
      breakMin: stopBreak,
      restMin: stopRest,
      conflict,
    });
  });

  const components = drivingMin + serviceMin + waitingMin + breakMin + restMin + layoverMin;
  const elapsedMin = round((cursor - departure.getTime()) / 60000);
  // The cursor is advanced by exactly these intervals. Should rounding ever
  // disagree, the component total wins so the reported breakdown always
  // reconciles with the reported elapsed time.
  if (Math.abs(components - elapsedMin) > 0.01) {
    warnings.push({
      code: 'schedule_breakdown_mismatch',
      severity: 'error',
      params: { components: round(components), elapsedMin },
      message: 'The timeline breakdown does not add up to the elapsed time.',
    });
  }

  return {
    drivingMin: round(drivingMin),
    waitingMin: round(waitingMin),
    serviceMin: round(serviceMin),
    breakMin: round(breakMin),
    restMin: round(restMin),
    layoverMin: round(layoverMin),
    elapsedMin: round(components),
    stops: scheduled,
    gaps,
    conflicts,
    warnings,
  };
}
