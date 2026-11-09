import { instantToWallClockString, operationalTimeZone } from '../common/operational-time';
import { resolveStopAppointment } from './stop-appointment';
import { toDateOnly, toFiniteNumber } from './route-plan-json';

/**
 * Planned windows of a route-plan stop.
 *
 * Trip stops store their appointment as `timeWindowMin` / `timeWindowMax`;
 * order stops (the builder's fallback source) store `dateFrom` / `timeFrom` and
 * friends. Both shapes are normalised here so a persisted plan stop can be
 * compared with — and refreshed from — the trip stop it represents.
 */

export interface PlannerStopWindowFields {
  scheduledDate: string;
  start: Date | null;
  end: Date | null;
  fixed: boolean;
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return isNaN(date.getTime()) ? null : date;
};

/**
 * `scheduledDate` is the operational-zone calendar date of the window start.
 * It used to come from `dateFrom`, which trip stops do not have, so every
 * rebuilt plan fell back to the trip's departure date: a delivery moved to
 * 12 Nov still displayed 10 Nov.
 */
export function plannerStopWindow(stop: any, fallbackDate: string): PlannerStopWindowFields {
  const zone = operationalTimeZone();
  const dateFrom = stop?.dateFrom ? String(stop.dateFrom).slice(0, 10) : null;
  const appointment = resolveStopAppointment({ ...(stop || {}), dateFrom: dateFrom || fallbackDate });
  const start = toDate(stop?.timeWindowMin) || appointment.start;
  const end = toDate(stop?.timeWindowMax) || appointment.end;
  const scheduledDate = dateFrom
    || (start ? String(instantToWallClockString(start, zone)).slice(0, 10) : fallbackDate);
  return {
    scheduledDate,
    start,
    end,
    // A fixed appointment yields start === end; only the absence of a maximum
    // makes it exact when a window row also carries a resolved start/end.
    fixed: appointment.isFixedAppointment && !stop?.timeWindowMax,
  };
}

/**
 * DB round trips return timestamps as strings and decimals as strings with a
 * different scale than the number that was written. Comparing raw values made a
 * fresh plan look stale on every read and rewrote unchanged stops forever.
 */
const comparable = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return String(value.getTime());
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const date = new Date(text);
    return isNaN(date.getTime()) ? text : String(date.getTime());
  }
  const num = Number(text);
  return isNaN(num) ? text.trim().toLowerCase() : String(num);
};

const timeOf = (value: unknown): number | null => {
  const date = toDate(value);
  return date ? date.getTime() : null;
};

/**
 * Patch that moves a trip stop onto the appointment of the Order stop it
 * projects.
 *
 * The Order owns the appointment until someone works the stop. Returns null
 * when the stop is being worked, when the Order has no appointment or when the
 * two already agree — so a read can run this over every stop without writing.
 * There is deliberately no timestamp comparison: writing the trip stop later
 * is exactly what a missed synchronization or a stale rebuild leaves behind,
 * and the Order has to win.
 */
export function pendingOrderStopWindowPatch(orderStop: any, tripStop: any): Record<string, any> | null {
  if (!orderStop || !tripStop) return null;
  if (tripStop.ata || tripStop.completedAt) return null;
  if (String(tripStop.status || '').toLowerCase() === 'completed') return null;

  const appointment = resolveStopAppointment(orderStop);
  if (!appointment.start) return null;

  const nextStart = appointment.start;
  const nextEnd = appointment.end;
  if (timeOf(tripStop.timeWindowMin) === nextStart.getTime()
    && timeOf(tripStop.timeWindowMax) === (nextEnd ? nextEnd.getTime() : null)) {
    return null;
  }

  const patch: Record<string, any> = { timeWindowMin: nextStart, timeWindowMax: nextEnd };
  // The ETA follows the appointment the TMS presents; keeping an older one made
  // the driver app show the previous time after the planner moved the stop.
  patch.eta = nextStart;
  return patch;
}

/**
 * Fields of a persisted plan stop that no longer match the trip stop it
 * represents. Returns null when the plan stop is already current, so callers can
 * skip the write (and the schedule recalculation) entirely.
 */
export function planStopWindowPatch(
  planStop: any,
  plannerStop: any,
  fallbackDate: string,
): Record<string, any> | null {
  if (!plannerStop) return null;
  const window = plannerStopWindow(plannerStop, fallbackDate);
  const next: Record<string, any> = {
    address: plannerStop.address || '',
    companyName: plannerStop.companyName || '',
    city: plannerStop.city || '',
    country: plannerStop.country || '',
    postalCode: plannerStop.postalCode || '',
    latitude: toFiniteNumber(plannerStop.latitude),
    longitude: toFiniteNumber(plannerStop.longitude),
    scheduledDate: toDateOnly(window.scheduledDate, fallbackDate),
    timeWindowStart: window.start,
    timeWindowEnd: window.end,
  };
  const patch: Record<string, any> = {};
  for (const key of Object.keys(next)) {
    if (comparable(planStop?.[key]) === comparable(next[key])) continue;
    patch[key] = next[key];
  }
  return Object.keys(patch).length ? patch : null;
}
