/**
 * Incomplete postal codes.
 *
 * Several countries print the postal code as digits plus letters — a Dutch
 * address is "5611 AB", not "5611" — and imports/document scans regularly keep
 * only the numeric prefix. A stop saved that way still renders ("5611
 * Eindhoven") but cannot be delivered to, and no human notices until the driver
 * is on the wrong street.
 *
 * The letters are never guessed here. The full code is resolved from the stop's
 * own coordinates (HERE reverse geocoding) and accepted only when it *extends*
 * the digits already stored, so a bad lookup can never move a stop into a
 * different area, and a code that is already complete is never rewritten.
 */

const clean = (value?: string | null): string =>
  String(value ?? '').trim().replace(/\s+/g, ' ');

/** Comparable form of a postal code: uppercase, no spaces or punctuation. */
export const postalCodeKey = (value?: string | null): string =>
  clean(value).toUpperCase().replace(/[^A-Z0-9]/g, '');

/**
 * True when `candidate` is the same postal code as `current` with its missing
 * tail filled in: same leading digits, strictly longer, still a plausible code.
 * A candidate from another area (different digits) is always rejected, and a
 * complete alphanumeric code is never "extended".
 */
export function completesPostalCode(
  current?: string | null,
  candidate?: string | null,
): boolean {
  const from = postalCodeKey(current);
  const to = postalCodeKey(candidate);
  if (!from || !to) return false;
  // Only a bare numeric prefix is expandable; "5611AB" or "1000-001" stay as saved.
  if (!/^\d+$/.test(from)) return false;
  if (to.length <= from.length || to.length > 10) return false;
  return to.startsWith(from);
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Rewrites the short postal code inside the free-text address so the stored
 * label keeps matching the completed code: "Bd. Unirii nr.147, 5611 Eindhoven"
 * becomes "Bd. Unirii nr.147, 5611 AB Eindhoven". Only a standalone token
 * followed by the city (or by the end of a comma-separated segment) is touched,
 * so a house number that happens to equal the digits stays intact.
 */
export function completePostalCodeInAddress(
  address?: string | null,
  current?: string | null,
  full?: string | null,
  city?: string | null,
): string | null {
  const text = address ?? null;
  const short = clean(current);
  const complete = clean(full);
  if (!text || !/^\d+$/.test(short) || !complete) return text;

  const cityName = clean(city);
  // With a known city the digits must sit right before it, so a house number
  // that happens to equal them is left alone. Without a city only a standalone
  // segment (end of the label or between commas) qualifies.
  const pattern = cityName
    ? new RegExp(`(^|[\\s,])${escapeRegExp(short)}(?=\\s*,?\\s*${escapeRegExp(cityName)}(?![\\p{L}]))`, 'iu')
    : new RegExp(`(^|[\\s,])${escapeRegExp(short)}(?=\\s*(?:,|$))`, 'i');
  return pattern.test(text)
    ? text.replace(pattern, (_match, prefix: string) => `${prefix}${complete}`)
    : text;
}
