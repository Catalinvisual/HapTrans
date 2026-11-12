// Pure date arithmetic for "shift this trip to a new departure" (scenario apply).
//
// The dispatcher can model a departure change in the board and then apply it.
// Applying must move the departure, the arrival and every stop time by the same
// number of minutes — a route that is re-optimised here would silently change
// distances and costs the user never approved. Customer time windows are never
// moved: they are constraints, so we only report which ones the shift breaks.

export interface RescheduleStopInput {
  id?: string | null;
  sequence?: number | null;
  plannedDate?: any;
  eta?: any;
  timeWindowMin?: any;
  timeWindowMax?: any;
}

export interface RescheduleStopResult {
  id: string;
  plannedDate: string | null;
  eta: string | null;
  windowViolation: boolean;
}

export interface RescheduleResult {
  deltaMin: number;
  stops: RescheduleStopResult[];
  windowViolations: number;
}

const parse = (value: any): number | null => {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const toIso = (time: number | null): string | null =>
  time === null ? null : new Date(time).toISOString();

const shift = (value: any, deltaMs: number): number | null => {
  const base = parse(value);
  return base === null ? null : base + deltaMs;
};

/**
 * Whole minutes between two departures. Empty or unparseable input yields 0,
 * which callers treat as "nothing to apply" rather than an error.
 */
export function departureDeltaMin(plannedDeparture: any, newDeparture: any): number {
  const from = parse(plannedDeparture);
  const to = parse(newDeparture);
  if (from === null || to === null) return 0;
  return Math.round((to - from) / 60000);
}

/** True when the given instant falls outside the stop's window. */
export function violatesWindow(arrival: number | null, min: any, max: any): boolean {
  if (arrival === null) return false;
  const from = parse(min);
  const to = parse(max);
  if (from !== null && arrival < from) return true;
  if (to !== null && arrival > to) return true;
  return false;
}

/**
 * Shift a plan by the difference between its old and new departure.
 * Returns the new stop times as ISO strings (null stays null) and counts the
 * customer windows the new times would miss.
 */
export function reschedulePlan(input: {
  plannedDeparture: any;
  newDeparture: any;
  stops?: RescheduleStopInput[];
}): RescheduleResult {
  const deltaMin = departureDeltaMin(input.plannedDeparture, input.newDeparture);
  const deltaMs = deltaMin * 60000;
  const stops = Array.isArray(input.stops) ? input.stops : [];

  const results: RescheduleStopResult[] = stops.map((stop) => {
    const planned = shift(stop?.plannedDate, deltaMs);
    const eta = shift(stop?.eta, deltaMs);
    const arrival = eta ?? planned;
    return {
      id: String(stop?.id || ''),
      plannedDate: toIso(planned),
      eta: toIso(eta),
      windowViolation: violatesWindow(arrival, stop?.timeWindowMin, stop?.timeWindowMax),
    };
  });

  return {
    deltaMin,
    stops: results,
    windowViolations: results.filter((stop) => stop.windowViolation).length,
  };
}
