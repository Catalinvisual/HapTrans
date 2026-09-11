// ---------------------------------------------------------------------------
// Shared analytics helpers. Every aggregation in the analytics / reports
// modules must route number handling, period bucketing and trend comparison
// through these functions so KPI definitions stay identical across the
// executive dashboard, the financial intelligence module and the reports.
// ---------------------------------------------------------------------------

export type Granularity = 'day' | 'week' | 'month';

export function num(v: any): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function pctChange(current: number, previous: number): number | null {
  if (!previous) return current > 0 ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function isoDay(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function isoWeek(d: Date | string): { year: number; week: number } {
  const date = new Date(d instanceof Date ? d : new Date(d));
  const base = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = base.getUTCDay() || 7;
  base.setUTCDate(base.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(base.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((base.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: base.getUTCFullYear(), week };
}

export function weekKey(d: Date | string): string {
  const { year, week } = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function bucketKeyForDate(d: Date | string, granularity: Granularity): string {
  if (granularity === 'day') return isoDay(d);
  if (granularity === 'week') return weekKey(d);
  return monthKey(d);
}

/**
 * Builds a contiguous set of buckets (day / ISO-week / month) covering
 * [from, to]. Buckets are keyed with the canonical key used by
 * bucketKeyForDate so later aggregation writes into the right slot.
 */
export function buildBuckets(
  from: Date,
  to: Date,
  granularity: Granularity = 'day',
  extra: Record<string, any> = {},
): Record<string, any> {
  const map: Record<string, any> = {};
  const labelFor = (d: Date, key: string): string => {
    if (granularity === 'week') return `W${String(isoWeek(d).week).padStart(2, '0')}`;
    if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return key;
  };

  if (granularity === 'month') {
    const cur = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cur <= to) {
      const key = monthKey(cur);
      map[key] = {
        key,
        label: labelFor(cur, key),
        year: cur.getFullYear(),
        month: key,
        revenue: 0, cost: 0, profit: 0, km: 0, margin: 0,
        orders: 0, ordersDelivered: 0, ordersDelayed: 0,
        trips: 0, tripsCompleted: 0, tripsActive: 0,
        otifGood: 0, otifTotal: 0, otdGood: 0, otdTotal: 0,
        invoiced: 0, collected: 0,
        ...extra,
      };
      cur.setMonth(cur.getMonth() + 1);
    }
    return map;
  }

  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (granularity === 'week') {
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
    while (cur <= to) {
      const key = weekKey(cur);
      map[key] = {
        key,
        label: labelFor(cur, key),
        year: cur.getFullYear(),
        month: monthKey(cur),
        revenue: 0, cost: 0, profit: 0, km: 0, margin: 0,
        orders: 0, ordersDelivered: 0, ordersDelayed: 0,
        trips: 0, tripsCompleted: 0, tripsActive: 0,
        otifGood: 0, otifTotal: 0, otdGood: 0, otdTotal: 0,
        invoiced: 0, collected: 0,
        ...extra,
      };
      cur.setDate(cur.getDate() + 7);
    }
    return map;
  }

  while (cur <= to) {
    const key = isoDay(cur);
    map[key] = {
      key,
      label: labelFor(cur, key),
      year: cur.getFullYear(),
      month: monthKey(cur),
      revenue: 0, cost: 0, profit: 0, km: 0, margin: 0,
      orders: 0, ordersDelivered: 0, ordersDelayed: 0,
      trips: 0, tripsCompleted: 0, tripsActive: 0,
      otifGood: 0, otifTotal: 0, otdGood: 0, otdTotal: 0,
      invoiced: 0, collected: 0,
      ...extra,
    };
    cur.setDate(cur.getDate() + 1);
  }
  return map;
}

export interface PeriodRange {
  from: Date;
  to: Date;
}

/**
 * Parses `from`/`to` query parameters. When omitted the default window is the
 * previous `defaultMonths` months ending now. The companion `previous` window
 * is the same length immediately before the current one, used for
 * period-over-period comparison.
 */
export function parseRange(from?: string, to?: string, defaultMonths = 3): { period: PeriodRange; previous: PeriodRange } {
  const end = to ? new Date(to + 'T23:59:59.999') : new Date();
  const start = from
    ? new Date(from + 'T00:00:00.000')
    : (() => { const d = new Date(end); d.setMonth(d.getMonth() - defaultMonths); return d; })();
  const spanMs = end.getTime() - start.getTime();
  const prevTo = new Date(start.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - spanMs);
  return { period: { from: start, to: end }, previous: { from: prevFrom, to: prevTo } };
}

export function isoDaysBetween(a: Date, b: Date): number {
  const da = new Date(a); da.setHours(0, 0, 0, 0);
  const db = new Date(b); db.setHours(0, 0, 0, 0);
  return Math.floor((db.getTime() - da.getTime()) / 86400000);
}

/** True when actual timestamp is within `graceMinutes` of the promised one. */
export function isOnTime(actual: Date | string | null | undefined, promised: Date | string | null | undefined, graceMinutes = 0): boolean {
  if (!actual || !promised) return false;
  const a = new Date(actual).getTime();
  const p = new Date(promised).getTime();
  if (isNaN(a) || isNaN(p)) return false;
  return a <= p + graceMinutes * 60000;
}