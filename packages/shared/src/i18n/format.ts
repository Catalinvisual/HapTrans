import { LOCALE_TAGS, type Locale } from './resources';
import { DateTime } from 'luxon';

/**
 * Locale-aware number/date/currency formatting via Intl. These are pure helpers
 * usable on both client and server. Instant formatting always converts from a
 * UTC string to a target timezone before rendering.
 */

export function formatNumber(value: number | bigint, locale: Locale, options?: Intl.NumberFormatOptions): string {
  const v = typeof value === 'bigint' ? Number(value) : value;
  return new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(v);
}

export function formatCurrency(
  amount: string, // decimal string, e.g. "1234.56"
  currency: string,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], {
    style: 'currency',
    currency,
    ...options,
  }).format(Number(amount));
}

/** Format a UTC ISO instant in a given timezone, localized. */
export function formatDate(
  instant: string,
  locale: Locale,
  timezone = 'UTC',
  options?: Intl.DateTimeFormatOptions,
): string {
  const dt = DateTime.fromISO(instant, { setZone: true }).setZone(timezone);
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    ...options,
    timeZone: timezone,
  }).format(dt.toJSDate());
}

export function formatDateTime(
  instant: string,
  locale: Locale,
  timezone = 'UTC',
): string {
  return formatDate(instant, locale, timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format a date-only value (no timezone conversion). */
export function formatDateOnly(
  date: string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const [y = '1970', m = '01', d = '01'] = date.split('-');
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))));
}
