/**
 * Display semantics for order stop appointments. The order stores a local wall
 * clock (date + HH:mm), so the form and the board must never run those through
 * `new Date(...)` — that is what shifted 08:00 to 09:00.
 */

export type AppointmentKind = 'fixed' | 'window' | 'unscheduled' | 'invalid';

export interface AppointmentInput {
  dateFrom?: string | null;
  timeFrom?: string | null;
  dateTo?: string | null;
  timeUntil?: string | null;
}

export interface AppointmentSummary {
  kind: AppointmentKind;
  /** `YYYY-MM-DD` or null. */
  date: string | null;
  time: string | null;
  /** For a flexible window only. */
  endDate: string | null;
  endTime: string | null;
  endBeforeStart: boolean;
}

const cleanDate = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const cleanTime = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
};

export function summariseAppointment(input: AppointmentInput | null | undefined): AppointmentSummary {
  const dateFrom = cleanDate(input?.dateFrom);
  const dateTo = cleanDate(input?.dateTo);
  const timeFrom = cleanTime(input?.timeFrom);
  const timeUntil = cleanTime(input?.timeUntil);

  if (!dateFrom && !dateTo) {
    return { kind: 'unscheduled', date: null, time: null, endDate: null, endTime: null, endBeforeStart: false };
  }

  if (!dateFrom && dateTo) {
    return { kind: 'fixed', date: dateTo, time: timeUntil || '00:00', endDate: null, endTime: null, endBeforeStart: false };
  }

  if (dateFrom && !dateTo && !timeUntil) {
    return { kind: 'fixed', date: dateFrom, time: timeFrom || '00:00', endDate: null, endTime: null, endBeforeStart: false };
  }

  const endDate = dateTo || dateFrom;
  const endTime = timeUntil || (dateTo ? '23:59' : '00:00');
  const startMinutes = (Number((timeFrom || '00:00').slice(0, 2)) * 60) + Number((timeFrom || '00:00').slice(3, 5));
  const endMinutes = (Number(endTime.slice(0, 2)) * 60) + Number(endTime.slice(3, 5));
  const endBeforeStart = endDate === dateFrom && endMinutes < startMinutes;
  return {
    kind: endBeforeStart ? 'invalid' : 'window',
    date: dateFrom,
    time: timeFrom || '00:00',
    endDate,
    endTime,
    endBeforeStart,
  };
}

/** `8 Nov 2026, 08:00` — the value the user typed, with no zone conversion. */
export function formatWallClock(
  date: string | null | undefined,
  time: string | null | undefined,
  locale = 'en-GB',
): string {
  const clean = cleanDate(date);
  if (!clean) return '';
  const [year, month, day] = clean.split('-').map(Number);
  const label = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const clock = cleanTime(time);
  return clock ? `${label}, ${clock}` : label;
}

/**
 * Read-only description of an order stop: one endpoint stays a fixed
 * appointment, two endpoints stay the exact window, none stays unscheduled.
 * It never fills in `00:00` / `23:59` for a missing endpoint.
 */
export function describeWallClockAppointment(
  input: AppointmentInput | null | undefined,
): { kind: AppointmentKind; label: string } {
  const summary = summariseAppointment(input);
  if (summary.kind === 'unscheduled') return { kind: 'unscheduled', label: '' };
  const start = formatWallClock(summary.date, summary.time);
  if (summary.kind !== 'window') return { kind: summary.kind, label: start };
  const end = summary.endDate === summary.date
    ? summary.endTime
    : formatWallClock(summary.endDate, summary.endTime);
  return { kind: 'window', label: `${start}–${end}` };
}

/** Same zone the server converts wall clocks in (OPERATIONAL_TIMEZONE). */
export const OPERATIONAL_TIME_ZONE = 'Europe/Bucharest';

/**
 * Trip stop windows arrive as UTC instants. A fixed appointment is stored as an
 * exact instant, so start === end: print it as one time, never `08:00 – 08:00`
 * and never an invented next-day maximum.
 */
export function formatAppointmentInstants(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined,
  locale = 'en-GB',
): string {
  if (!start) return '';
  const from = start instanceof Date ? start : new Date(start);
  if (Number.isNaN(from.getTime())) return '';
  const dateFmt = new Intl.DateTimeFormat(locale, {
    timeZone: OPERATIONAL_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: OPERATIONAL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  const base = `${dateFmt.format(from)}, ${timeFmt.format(from)}`;
  if (!end) return base;
  const to = end instanceof Date ? end : new Date(end);
  if (Number.isNaN(to.getTime()) || to.getTime() === from.getTime()) return base;
  const dayKey = (value: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: OPERATIONAL_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(value);
  return dayKey(from) === dayKey(to)
    ? `${base}–${timeFmt.format(to)}`
    : `${base} – ${dateFmt.format(to)}, ${timeFmt.format(to)}`;
}
