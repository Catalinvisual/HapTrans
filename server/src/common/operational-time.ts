/**
 * Operational time-zone conversion.
 *
 * Order and trip stops store a local wall clock (a date column plus an HH:mm
 * column). Trip stops store an absolute `timestamp`. The two representations
 * only agree when the wall clock is converted in the operational time zone and
 * converted back exactly once for display.
 *
 * The previous helpers built `new Date(`${date}T${time}:00`)`, which Node
 * interprets in the *server* zone. On a UTC host that silently stored the local
 * wall clock as if it were UTC, and every surface that formats with the user's
 * zone added an hour (08:00 entered, 09:00 displayed). This module is the one
 * place that owns the conversion.
 */

// Matches the company default (`Company.timezone`), so an order that stores a
// wall clock with no company context still converts in the operational zone the
// company entity declares. Deployments may override it with OPERATIONAL_TIMEZONE.
export const DEFAULT_OPERATIONAL_TIME_ZONE = 'Europe/Bucharest';

/** The zone used for wall-clock order appointments. Overridable per deployment. */
export function operationalTimeZone(value?: string | null): string {
  const candidate = String(value || process.env.OPERATIONAL_TIMEZONE || '').trim();
  if (!candidate) return DEFAULT_OPERATIONAL_TIME_ZONE;
  try {
    // Throws for an unknown IANA zone; fall back instead of failing the request.
    new Intl.DateTimeFormat('en-US', { timeZone: candidate }).format(new Date(0));
    return candidate;
  } catch {
    return DEFAULT_OPERATIONAL_TIME_ZONE;
  }
}

interface ZoneParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const zonedParts = (instantMs: number, timeZone: string): ZoneParts => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    // Intl can report 24 for midnight in some environments.
    hour: read('hour') % 24,
    minute: read('minute'),
    second: read('second'),
  };
};

/** Offset of the zone at that instant, in ms (local wall clock - UTC). */
export function zoneOffsetMs(instantMs: number, timeZone = DEFAULT_OPERATIONAL_TIME_ZONE): number {
  const zoned = zonedParts(instantMs, timeZone);
  const asUtc = Date.UTC(zoned.year, zoned.month - 1, zoned.day, zoned.hour, zoned.minute, zoned.second);
  return asUtc - instantMs;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface WallClock {
  date: string;
  time: string;
}

/** Parses `YYYY-MM-DD` + `HH:mm` into a UTC instant of that wall clock. */
export function wallClockToInstant(
  date: string | null | undefined,
  time: string | null | undefined,
  timeZone = DEFAULT_OPERATIONAL_TIME_ZONE,
): Date | null {
  const dateText = String(date || '').slice(0, 10);
  const match = DATE_PATTERN.exec(dateText);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const timeText = String(time || '00:00').slice(0, 5);
  const timeMatch = TIME_PATTERN.exec(timeText);
  if (!timeMatch) return null;

  const naiveUtc = Date.UTC(year, month - 1, day, Number(timeMatch[1]), Number(timeMatch[2]), 0);
  let instant = naiveUtc - zoneOffsetMs(naiveUtc, timeZone);
  // A DST transition changes the offset between the naive guess and the real
  // instant. Re-checking once resolves both the summer and winter boundaries.
  const correctedOffset = zoneOffsetMs(instant, timeZone);
  if (correctedOffset !== zoneOffsetMs(naiveUtc, timeZone)) {
    instant = naiveUtc - correctedOffset;
  }
  return new Date(instant);
}

/** The wall clock of an instant in the operational zone, as `YYYY-MM-DD` + `HH:mm`. */
export function instantToWallClock(
  value: Date | string | number | null | undefined,
  timeZone = DEFAULT_OPERATIONAL_TIME_ZONE,
): WallClock | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const zoned = zonedParts(date.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${zoned.year}-${pad(zoned.month)}-${pad(zoned.day)}`,
    time: `${pad(zoned.hour)}:${pad(zoned.minute)}`,
  };
}

/** "2026-11-08T08:00" in the operational zone — used by tests and diagnostics. */
export function instantToWallClockString(
  value: Date | string | number | null | undefined,
  timeZone = DEFAULT_OPERATIONAL_TIME_ZONE,
): string | null {
  const wall = instantToWallClock(value, timeZone);
  return wall ? `${wall.date}T${wall.time}` : null;
}

export function isValidTimeValue(value: string | null | undefined): boolean {
  return TIME_PATTERN.test(String(value || '').slice(0, 5));
}

export function isValidDateValue(value: string | null | undefined): boolean {
  return DATE_PATTERN.test(String(value || '').slice(0, 10));
}
