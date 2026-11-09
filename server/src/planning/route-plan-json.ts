/**
 * Persisted JSONB fields should be arrays, but legacy rows can contain a
 * double-encoded JSON string (for example "[]"). Normalizing at the planner
 * boundary prevents a successfully loaded plan from failing during rendering.
 */
export function asJsonArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Stop values copied from `stops` into `route_plan_stops` must fit the target
 * column. `stops.status` is a free-form varchar that driver progress fills with
 * `loading`/`unloading`, while `route_plan_stops.status` is a PostgreSQL enum of
 * pending/arrived/completed/skipped. Writing the raw value made the enum reject
 * the row and the planner answered 500 for exactly the trips being worked on.
 */
export type PlannerStopStatus = 'pending' | 'arrived' | 'completed' | 'skipped';

export function toRouteStopStatus(value: unknown): PlannerStopStatus {
  const status = String(value || '').trim().toLowerCase();
  if (['arrived', 'at_stop', 'at_pickup', 'at_delivery', 'loading', 'unloading', 'in_progress', 'working'].includes(status)) {
    return 'arrived';
  }
  if (['completed', 'complete', 'done', 'delivered', 'loaded', 'unloaded'].includes(status)) {
    return 'completed';
  }
  if (['skipped', 'cancelled', 'canceled'].includes(status)) {
    return 'skipped';
  }
  return 'pending';
}

/** A database timestamp, or null when the stored value is not a real date. */
export function toSafeDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as any);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A calendar date as YYYY-MM-DD, safe for a PostgreSQL `date` column. */
export function toDateOnly(value: unknown, fallback?: string | null): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? (fallback ?? null) : value.toISOString().slice(0, 10);
  }
  const text = String(value ?? '').trim();
  const direct = /^(\d{4}-\d{2}-\d{2})/.exec(text);
  if (direct) return direct[1];
  const parsed = toSafeDate(value);
  if (parsed) return parsed.toISOString().slice(0, 10);
  return fallback ?? null;
}

/** A finite number, or null instead of NaN/Infinity for a decimal column. */
export function toFiniteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
