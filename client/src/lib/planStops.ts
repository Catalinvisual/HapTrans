/**
 * The planner's stop list must show operations, not rows.
 *
 * A trip that accumulated duplicated stop rows rendered the same delivery six
 * times and pushed the real sequence out of view. Rows are collapsed by identity
 * (id, else order+type+sequence), which keeps the list honest about what the
 * route actually contains without hiding a genuinely repeated intermediate stop
 * (those differ by sequence).
 */

const norm = (value: unknown) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const kindOf = (type: unknown): string => {
  const value = String(type || '').toLowerCase();
  if (value === 'pickup' || value === 'load' || value === 'loading') return 'pickup';
  if (value === 'delivery' || value === 'dropoff' || value === 'drop' || value === 'unload' || value === 'unloading') return 'delivery';
  return value;
};

const keyOf = (stop: any): string | null => {
  // Duplicated rows are different records with different ids and sequence
  // numbers, so the operation is the identity: one order, one kind, one place.
  // The city decides the place because copies written at different times can
  // disagree on the street while describing the same operation.
  const orderId = stop?.orderId || stop?.order?.id;
  if (!orderId) return stop?.id ? `id:${stop.id}` : null;
  const kind = kindOf(stop?.type);
  const place = norm(stop?.city) || norm(stop?.postalCode) || norm(stop?.address) || norm(stop?.companyName);
  return kind === 'stop'
    ? `op:${orderId}:${kind}:${stop?.sequence ?? ''}`
    : `op:${orderId}:${kind}:${place}`;
};

export function dedupePlanStops(stops: any[] | null | undefined): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const stop of stops || []) {
    const key = keyOf(stop);
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    out.push(stop);
  }
  return out;
}

/** How many rows the list is hiding, for an explicit "duplicated" notice. */
export function countDuplicatePlanStops(stops: any[] | null | undefined): number {
  const list = stops || [];
  return Math.max(0, list.length - dedupePlanStops(list).length);
}
