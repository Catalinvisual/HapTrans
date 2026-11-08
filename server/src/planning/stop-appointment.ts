/**
 * Stop appointment semantics — one model for pickup and delivery.
 *
 * An OrderStop stores `dateFrom`/`timeFrom` and `dateTo`/`timeUntil`, both
 * optional. The old code turned a missing maximum into `<date>T23:59`, which is
 * 00:59 on the next day in Europe/Amsterdam during winter time and is not a
 * value the user ever entered.
 *
 * The rules implemented here (identical for pickup, delivery and intermediate
 * stops):
 *
 *  1. Only one endpoint entered  -> FIXED APPOINTMENT at exactly that instant.
 *  2. Both endpoints entered    -> the exact flexible window, endpoints kept.
 *  3. Neither endpoint entered  -> UNSCHEDULED, no window invented.
 *  4. Max earlier than min      -> INVALID, never swapped or normalised.
 *
 * A date-only maximum (a date was chosen but no clock) still describes a
 * flexible window and ends at the end of that local day; that is a real entered
 * date, not a synthetic endpoint, and it is reported with `endTimeAssumed`.
 */

import {
  DEFAULT_OPERATIONAL_TIME_ZONE,
  instantToWallClockString,
  isValidTimeValue,
  operationalTimeZone,
  wallClockToInstant,
} from '../common/operational-time';

export type StopAppointmentKind = 'fixed' | 'window' | 'unscheduled' | 'invalid';

export interface StopAppointmentIssue {
  code: 'STOP_WINDOW_END_BEFORE_START' | 'STOP_WINDOW_END_TIME_ASSUMED';
  message: string;
}

export interface StopAppointment {
  kind: StopAppointmentKind;
  /** Start instant in UTC. Equal to `end` for a fixed appointment. */
  start: Date | null;
  /** End instant in UTC. Never synthesised when neither endpoint was entered. */
  end: Date | null;
  /** Operational-zone wall clock, `YYYY-MM-DDTHH:mm`. */
  localStart: string | null;
  localEnd: string | null;
  timeZone: string;
  /** True when one endpoint was entered and the appointment is exact. */
  isFixedAppointment: boolean;
  issues: StopAppointmentIssue[];
}

export interface StopAppointmentInput {
  dateFrom?: string | null;
  timeFrom?: string | null;
  dateTo?: string | null;
  timeUntil?: string | null;
  timeZone?: string | null;
}

const dateOf = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const clockOf = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 5);
  return isValidTimeValue(text) ? text : null;
};

const EMPTY_ISSUES: StopAppointmentIssue[] = [];

export function resolveStopAppointment(
  input: StopAppointmentInput | null | undefined,
  timeZone?: string | null,
): StopAppointment {
  const zone = operationalTimeZone(timeZone || input?.timeZone || DEFAULT_OPERATIONAL_TIME_ZONE);
  const dateFrom = dateOf(input?.dateFrom);
  const dateTo = dateOf(input?.dateTo);
  const timeFrom = clockOf(input?.timeFrom);
  const timeUntil = clockOf(input?.timeUntil);

  const unscheduled: StopAppointment = {
    kind: 'unscheduled',
    start: null,
    end: null,
    localStart: null,
    localEnd: null,
    timeZone: zone,
    isFixedAppointment: false,
    issues: EMPTY_ISSUES,
  };

  if (!dateFrom && !dateTo) return unscheduled;

  // One endpoint only: an exact appointment at the value the user entered.
  if (!dateFrom && dateTo) {
    const instant = wallClockToInstant(dateTo, timeUntil || '00:00', zone);
    if (!instant) return unscheduled;
    return {
      kind: 'fixed',
      start: instant,
      end: new Date(instant.getTime()),
      localStart: instantToWallClockString(instant, zone),
      localEnd: instantToWallClockString(instant, zone),
      timeZone: zone,
      isFixedAppointment: true,
      issues: EMPTY_ISSUES,
    };
  }

  if (dateFrom && !dateTo && !timeUntil) {
    const instant = wallClockToInstant(dateFrom, timeFrom || '00:00', zone);
    if (!instant) return unscheduled;
    return {
      kind: 'fixed',
      start: instant,
      end: new Date(instant.getTime()),
      localStart: instantToWallClockString(instant, zone),
      localEnd: instantToWallClockString(instant, zone),
      timeZone: zone,
      isFixedAppointment: true,
      issues: EMPTY_ISSUES,
    };
  }

  const issues: StopAppointmentIssue[] = [];
  const start = wallClockToInstant(dateFrom, timeFrom || '00:00', zone);
  const endDate = dateTo || dateFrom;
  const endTime = timeUntil || (dateTo ? '23:59' : null);
  if (dateTo && !timeUntil) {
    issues.push({
      code: 'STOP_WINDOW_END_TIME_ASSUMED',
      message: `No end time was entered, so the window ends at the end of ${endDate} in ${zone}.`,
    });
  }
  const end = wallClockToInstant(endDate, endTime || '00:00', zone);
  if (!start || !end) return unscheduled;

  if (end.getTime() < start.getTime()) {
    return {
      kind: 'invalid',
      start,
      end,
      localStart: instantToWallClockString(start, zone),
      localEnd: instantToWallClockString(end, zone),
      timeZone: zone,
      isFixedAppointment: false,
      issues: [
        {
          code: 'STOP_WINDOW_END_BEFORE_START',
          message: `The maximum (${instantToWallClockString(end, zone)}) is earlier than the minimum (${instantToWallClockString(start, zone)}).`,
        },
      ],
    };
  }

  if (end.getTime() === start.getTime()) {
    return {
      kind: 'fixed',
      start,
      end,
      localStart: instantToWallClockString(start, zone),
      localEnd: instantToWallClockString(end, zone),
      timeZone: zone,
      isFixedAppointment: true,
      issues,
    };
  }

  return {
    kind: 'window',
    start,
    end,
    localStart: instantToWallClockString(start, zone),
    localEnd: instantToWallClockString(end, zone),
    timeZone: zone,
    isFixedAppointment: false,
    issues,
  };
}

/** Rejects a max earlier than min instead of silently swapping the endpoints. */
export function validateStopAppointment(input: StopAppointmentInput | null | undefined): string | null {
  const appointment = resolveStopAppointment(input);
  if (appointment.kind !== 'invalid') return null;
  return appointment.issues[0]?.message
    || 'The maximum of the time window cannot be earlier than the minimum.';
}

export function stopAppointmentPayload(appointment: StopAppointment) {
  return {
    kind: appointment.kind,
    fixed: appointment.isFixedAppointment,
    start: appointment.start ? appointment.start.toISOString() : null,
    end: appointment.end ? appointment.end.toISOString() : null,
    localStart: appointment.localStart,
    localEnd: appointment.localEnd,
    timeZone: appointment.timeZone,
    issues: appointment.issues,
  };
}

/** Convenience for planning code that only needs the occupancy bounds. */
export function appointmentBounds(input: StopAppointmentInput | null | undefined): { start: Date | null; end: Date | null } {
  const appointment = resolveStopAppointment(input);
  return { start: appointment.start, end: appointment.end };
}
