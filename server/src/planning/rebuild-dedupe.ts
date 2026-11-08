/**
 * Rebuild input hygiene.
 *
 * A trip whose orders were assigned repeatedly can carry the same order twice in
 * `trip.orders`, and an order whose stops were written twice can carry duplicate
 * `order_stops` rows. `rebuildStops` expanded that list one-for-one, so a single
 * order with two operations produced 44 trip stops instead of 2 — the route plan
 * then failed to build and the planner showed the same delivery over and over.
 *
 * Identity is the row id: two rows with the same id are the same record. Rows
 * without an id are kept (a freshly built object is not a duplicate), and input
 * order is preserved so pickup/delivery sequencing does not change.
 */

const keyOf = (row: any): string | null => {
  const id = row?.id;
  return id === null || id === undefined || id === '' ? null : String(id);
};

export function uniqueRowsById<T>(rows: T[] | null | undefined): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows || []) {
    const key = keyOf(row);
    if (key === null) {
      out.push(row);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export function dedupeRebuildOrders(orders: any[] | null | undefined): any[] {
  return uniqueRowsById((orders || []).filter((order) => order && order.id));
}

export function dedupeOrderStops(stops: any[] | null | undefined): any[] {
  // Duplicated order stops were written as separate records, so two rows can
  // share an operation (type + sequence) while carrying different ids. The
  // operation is what makes them the same stop.
  const seen = new Set<string>();
  const out: any[] = [];
  for (const stop of (stops || []).filter(Boolean)) {
    const type = String(stop?.type || '').toLowerCase();
    const sequence = stop?.sequence;
    const key = type && sequence !== null && sequence !== undefined
      ? `op:${type}:${sequence}`
      : (stop?.id ? `id:${stop.id}` : null);
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(stop);
  }
  return out;
}
