/**
 * The planner's stop list must show operations, not rows.
 *
 * A trip that accumulated duplicated stop rows rendered the same delivery six
 * times and pushed the real sequence out of view. Rows are collapsed by identity
 * (id, else order+type+sequence), which keeps the list honest about what the
 * route actually contains without hiding a genuinely repeated intermediate stop
 * (those differ by sequence).
 */

const keyOf = (stop: any): string | null => {
  // Duplicated rows are different records with different ids, so the operation
  // is the identity: one order, one kind, one sequence.
  const orderId = stop?.orderId || stop?.order?.id;
  if (orderId) return `op:${orderId}:${stop?.type || ''}:${stop?.sequence ?? ''}`;
  return stop?.id ? `id:${stop.id}` : null;
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
