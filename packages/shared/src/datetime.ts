/**
 * Date/time foundation (architecture §8).
 *
 * Principles:
 * - All instants are stored as UTC ISO-8601 (`timestamptz` in Postgres).
 * - Display conversion to a local timezone (company/branch/customer/driver)
 *   happens at the edge via Luxon.
 * - Date-only values are represented as 'YYYY-MM-DD' (no time, DST-safe).
 * - All maths is DST-safe through the IANA timezone database (Luxon).
 */
import { DateTime, Settings } from 'luxon';

export type IsoInstant = string; // UTC ISO-8601, e.g. "2026-09-03T12:00:00.000Z"
export type ISODate = string; // date-only, e.g. "2026-09-03"

Settings.defaultZone = 'utc';

/** Current UTC instant as ISO-8601. */
export function nowUtc(): IsoInstant {
  return DateTime.utc().toISO() ?? new Date().toISOString();
}

/** Wrap an arbitrary date/instant into a UTC DateTime. */
export function toUtcDateTime(input: string | Date | DateTime): DateTime {
  if (input instanceof DateTime) return input.toUTC();
  if (input instanceof Date) return DateTime.fromJSDate(input).toUTC();
  return DateTime.fromISO(input, { setZone: true }).toUTC();
}

/** Convert a UTC instant to a local timezone ISO string with offset, for display. */
export function toLocalIso(instant: IsoInstant, timezone: string): string {
  const local = DateTime.fromISO(instant, { setZone: true }).setZone(timezone);
  return local.toISO() ?? instant;
}

/** Convert a UTC instant to a human display string in a timezone. */
export function formatLocal(instant: IsoInstant, timezone: string, format = 'yyyy-MM-dd HH:mm'): string {
  const local = DateTime.fromISO(instant, { setZone: true }).setZone(timezone);
  return local.toFormat(format);
}

/** Today's date-only string in a given timezone (not UTC). */
export function todayLocal(timezone: string): ISODate {
  return DateTime.now().setZone(timezone).toISODate() ?? '1970-01-01';
}

/** Convert a date-only value to a UTC instant at the start of that date in a timezone. */
export function dateOnlyToUtc(date: ISODate, timezone: string): IsoInstant {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date-only value: "${date}"`);
  }
  const dt = DateTime.fromISO(date, { zone: timezone, setZone: true }).startOf('day');
  return dt.toUTC().toISO() ?? date;
}

/** Validate a date-only string. */
export function isValidDateOnly(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && DateTime.fromISO(date).isValid;
}

/** Validate an IANA timezone name. */
export function isValidTimezone(timezone: string): boolean {
  try {
    return DateTime.local().setZone(timezone).isValid;
  } catch {
    return false;
  }
}

export { DateTime };
