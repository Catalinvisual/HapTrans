// Pure helpers for the premium planning board.
//
// Kept free of React/DOM so the arithmetic that the dispatcher reads (average
// speed, plan variance, fixed cost, the undo window, fuzzy palette matching)
// can be unit-tested and reused by the results table and the timeline.

export type Provenance = 'recorded' | 'estimated' | 'unverified';

export interface ProvenanceStyle {
  key: string;
  label: string;
  dot: string;
  chip: string;
}

/**
 * Every number on the board states where it came from. The same vocabulary is
 * used by the results table (rec./mix./est.), the KPI strip and the drawer, so
 * "estimated" never looks like a measurement.
 */
export const PROVENANCE: Record<Provenance, ProvenanceStyle> = {
  recorded: {
    key: 'prov_recorded',
    label: 'Recorded',
    dot: 'bg-emerald-500',
    chip: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25',
  },
  estimated: {
    key: 'prov_estimated',
    label: 'Estimated',
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-600 border-amber-500/25',
  },
  unverified: {
    key: 'prov_unverified',
    label: 'Unverified',
    dot: 'bg-slate-400',
    chip: 'bg-slate-500/10 text-text-secondary border-slate-500/25',
  },
};

export function provenanceOf(value: any): Provenance {
  if (value === 'recorded' || value === 'estimated' || value === 'unverified') return value;
  return 'unverified';
}

const finite = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const ms = (value: any): number | null => {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Average speed over the driven distance. Returns null when either input is
 * missing or the driving time is too short to be meaningful (below 10 minutes),
 * instead of printing an impressive 400 km/h.
 */
export function avgSpeedKmh(distanceKm: any, drivingMin: any): number | null {
  const km = finite(distanceKm);
  const minutes = finite(drivingMin);
  if (km === null || minutes === null || km <= 0 || minutes < 10) return null;
  const value = km / (minutes / 60);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 10) / 10;
}

export interface PlanVariance {
  value: number | null;
  basis: 'actual' | 'planned' | 'mixed' | 'none';
}

/**
 * Difference between what actually happened and the plan, in minutes.
 * Positive means late. Uses the actual timestamps when both exist, and only
 * falls back to planned-vs-planned (always 0) when there is no actual at all —
 * in which case the value is null, never a false "on time".
 */
export function planVarianceMin(trip: any): PlanVariance {
  const plannedStart = ms(trip?.plannedDeparture);
  const plannedEnd = ms(trip?.plannedArrival);
  const actualStart = ms(trip?.actualDeparture);
  const actualEnd = ms(trip?.actualArrival);
  if (plannedStart === null || plannedEnd === null) return { value: null, basis: 'none' };

  if (actualStart !== null && actualEnd !== null) {
    return { value: Math.round((actualEnd - actualStart - (plannedEnd - plannedStart)) / 60000), basis: 'actual' };
  }
  if (actualStart !== null && plannedEnd !== null) {
    return { value: Math.round((actualStart - plannedStart) / 60000), basis: 'mixed' };
  }
  return { value: null, basis: 'none' };
}

/** Fixed ownership cost per trip from the CostEngine breakdown, if present. */
export function fixedCostOf(breakdown: any): number | null {
  if (!breakdown || typeof breakdown !== 'object') return null;
  const fixed = finite(breakdown.fixedCost);
  return fixed === null ? null : Math.round(fixed * 100) / 100;
}

/**
 * Shift an ISO timestamp by whole days, preserving the wall clock. Used by
 * "repeat this plan" so a Tuesday 09:00 pickup becomes next Tuesday 09:00.
 */
export function shiftDays(value: any, days: number): string | null {
  const base = ms(value);
  if (base === null) return null;
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

/** Shift a stop window, keeping the pair consistent (both or neither). */
export function shiftWindow(
  start: any,
  end: any,
  days: number,
): { timeWindowMin: string | null; timeWindowMax: string | null } {
  return {
    timeWindowMin: shiftDays(start, days),
    timeWindowMax: shiftDays(end, days),
  };
}

/** Format minutes as `7 h 05` / `45 min`, or an em dash when unknown. */
export function formatMinutes(value: any, dash = '—'): string {
  const minutes = finite(value);
  if (minutes === null) return dash;
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(Math.round(minutes));
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return hours > 0 ? `${sign}${hours} h ${String(rest).padStart(2, '0')}` : `${sign}${rest} min`;
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Score a command against a query for the Ctrl+K palette. Higher is better,
 * 0 means no match. Matches the start of a word before the middle of one.
 */
export function commandScore(query: string, text: string): number {
  const q = normalize(query.trim());
  if (!q) return 1;
  const haystack = normalize(text);
  if (!haystack) return 0;
  if (haystack === q) return 100;
  if (haystack.startsWith(q)) return 80;
  const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(q))) return 60;
  if (words.some((word) => word.includes(q))) return 40;
  if (haystack.includes(q)) return 20;
  return 0;
}

/** Path for the map panel route toggle, kept in one place for saved views. */
export function toggleHiddenTrip(hidden: ReadonlySet<string>, tripId: string): Set<string> {
  const next = new Set(hidden);
  if (next.has(tripId)) next.delete(tripId);
  else next.add(tripId);
  return next;
}

/** Only these trip states may be dragged onto another truck. */
export function isMovableTrip(trip: any): boolean {
  return ['planning', 'planned', 'assigned'].includes(String(trip?.status || '').toLowerCase());
}

/**
 * Group the suggestions endpoint payload by truck so the panel reads as
 * "truck → what it could take" instead of a flat ranked list.
 */
/**
 * Minutes the zone is ahead of UTC at a given instant (positive east of UTC).
 * Derived from Intl so no timezone table ships with the bundle.
 */
function zoneOffsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return Math.round((asUtc - date.getTime()) / 60000);
}

/**
 * Value for an `<input type="datetime-local">` showing an instant in the
 * operational zone. The dispatcher edits the wall clock the customer agreed on,
 * not the browser's local clock.
 */
export function wallClockInputValue(value: any, timeZone: string): string {
  const base = ms(value);
  if (base === null) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(new Date(base));
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** Inverse of `wallClockInputValue`: wall clock in the zone → UTC ISO instant. */
export function wallClockToIso(value: string, timeZone: string): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.slice(0, 5).split(':').map(Number);
  if ([year, month, day, hour, minute].some((part) => !Number.isFinite(part))) return null;
  let timestamp = Date.UTC(year, month - 1, day, hour, minute);
  // Correct by the zone offset at that instant, then once more in case the
  // first guess landed on the other side of a DST boundary.
  const firstOffset = zoneOffsetMinutes(new Date(timestamp), timeZone);
  timestamp -= firstOffset * 60000;
  const secondOffset = zoneOffsetMinutes(new Date(timestamp), timeZone);
  if (secondOffset !== firstOffset) timestamp -= (secondOffset - firstOffset) * 60000;
  return new Date(timestamp).toISOString();
}

export function groupSuggestions(suggestions: any[]): Array<{ truckId: string; plateNumber: string; driver: string; items: any[] }> {
  const groups = new Map<string, { truckId: string; plateNumber: string; driver: string; items: any[] }>();
  for (const suggestion of suggestions || []) {
    const key = String(suggestion?.truckId || suggestion?.plateNumber || 'unknown');
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(suggestion);
      continue;
    }
    groups.set(key, {
      truckId: String(suggestion?.truckId || ''),
      plateNumber: String(suggestion?.plateNumber || '—'),
      driver: String(suggestion?.driver || ''),
      items: [suggestion],
    });
  }
  return [...groups.values()].sort((a, b) => b.items.length - a.items.length);
}
