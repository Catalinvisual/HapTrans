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

const placeKey = (stop: any): string => {
  const norm = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  // Duplicate rows were written at different times and can disagree on the
  // address (one carries the street, another only the company). The city is
  // what identifies the place; the more detailed fields are only consulted
  // when the city itself is missing.
  return norm(stop?.city) || norm(stop?.postalCode) || norm(stop?.address) || norm(stop?.companyName);
};

const operationKind = (type: unknown): string => {
  const value = String(type || '').toLowerCase();
  if (value === 'pickup' || value === 'load' || value === 'loading') return 'pickup';
  if (value === 'delivery' || value === 'dropoff' || value === 'drop' || value === 'unload' || value === 'unloading') return 'delivery';
  return value;
};

/**
 * Planner-level identity: one order operation at one place.
 *
 * Trip stops written by the old rebuild carry their own sequence numbers, so two
 * copies of the same delivery are sequence 1 and sequence 2 — the sequence is
 * therefore not part of the identity here. Two genuinely different deliveries
 * of one order differ by city and are both kept. Intermediate `stop`s of the
 * same order in one city are real legs of the tour, so their sequence stays
 * part of the identity.
 */
export function dedupePlannerStops(stops: any[] | null | undefined): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const stop of (stops || []).filter(Boolean)) {
    const orderId = stop?.orderId || stop?.order?.id || stop?.tasks?.[0]?.order?.id || null;
    if (!orderId) {
      out.push(stop);
      continue;
    }
    const kind = operationKind(stop?.type);
    const key = [
      String(orderId),
      kind,
      kind === 'stop' ? String(stop?.sequence ?? '') : placeKey(stop),
    ].join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(stop);
  }
  return out;
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
