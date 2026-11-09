import { createHash } from 'crypto';

/**
 * The Route & Load Planner persists its own copy of the trip's stops. That copy
 * used to be trusted forever: once a plan existed, opening the planner returned
 * it unchanged, so an Order added to the trip afterwards never appeared and the
 * route was calculated over the old, partial stop sequence.
 *
 * These helpers give the planner a stable fingerprint of the trip's *current*
 * stop set so a stale plan can be detected and rebuilt instead of served.
 */

export interface PlannerStopLike {
  id?: string | null;
  type?: string | null;
  orderId?: string | null;
  order?: { id?: string | null } | null;
  tasks?: Array<{ order?: { id?: string | null } | null; orderId?: string | null }> | null;
  city?: string | null;
  address?: string | null;
  companyName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

const isPickupType = (type: unknown): boolean => {
  const value = String(type || '').toLowerCase();
  return value === 'pickup' || value === 'load' || value === 'loading';
};

const orderIdsOf = (stop: PlannerStopLike): string[] => {
  const ids = new Set<string>();
  if (stop.orderId) ids.add(String(stop.orderId));
  if (stop.order?.id) ids.add(String(stop.order.id));
  for (const task of stop.tasks || []) {
    const id = task?.order?.id || task?.orderId;
    if (id) ids.add(String(id));
  }
  return [...ids].sort();
};

const coord = (value: unknown): string => {
  const num = Number(value);
  return Number.isFinite(num) && num !== 0 ? num.toFixed(3) : '';
};

const place = (stop: PlannerStopLike): string =>
  String(stop.city || stop.address || stop.companyName || '').trim().toLowerCase();

/**
 * Fingerprint of the ordered stop set. Two stops that differ in order, type,
 * location or owning orders produce different fingerprints, which is exactly
 * what the planner must notice.
 */
export function plannerStopSetSignature(stops: PlannerStopLike[]): string {
  const parts = (stops || []).map((stop) => [
    isPickupType(stop.type) ? 'pickup' : 'delivery',
    coord(stop.latitude),
    coord(stop.longitude),
    place(stop),
    orderIdsOf(stop).join('+'),
  ].join('|'));
  // Ordered fingerprint: the same stops in a different order are a different
  // plan, because the sequence is what the truck actually drives.
  return createHash('sha1').update(parts.join(';')).digest('hex');
}

/**
 * Fingerprint of the stop set as the plan builder writes it.
 *
 * `plannerStopSetSignature` fingerprints the trip's stop list, but the route
 * plan stores a projection of it: every non-pickup stop becomes a delivery and
 * a stop with several tasks keeps the first task's order. Comparing the raw
 * trip signature with the projection therefore never matched for trips with an
 * intermediate stop or a consolidated stop — every open of the planner looked
 * stale, rebuilt the plan and called the routing provider again. This signature
 * is computed from the same projection on both sides, so a freshly built plan
 * compares equal.
 */
export function plannerStopReconciliationSignature(stops: PlannerStopLike[]): string {
  const parts = (stops || []).map((stop) => [
    isPickupType(stop.type) ? 'pickup' : 'delivery',
    coord(stop.latitude),
    coord(stop.longitude),
    place(stop),
    // The builder stores one order per plan stop: the first task's order.
    String(stop.tasks?.[0]?.order?.id || stop.tasks?.[0]?.orderId || stop.orderId || stop.order?.id || ''),
  ].join('|'));
  return createHash('sha1').update(parts.join(';')).digest('hex');
}

/**
 * The trip's stops are the routing truth. Some legacy trips only carry the
 * stops of the Orders that were attached when the trip was created, so any
 * Order of the trip that has no stop represented at all is appended from its
 * own stop list. Orders that are already represented are never duplicated.
 */
export function mergePlannerStops<T extends PlannerStopLike>(
  tripStops: T[],
  orders: Array<{ id?: string | null; orderNumber?: string | null; stops?: PlannerStopLike[] | null }>,
): T[] {
  const result: T[] = [...(tripStops || [])];
  const covered = new Set<string>();
  for (const stop of result) for (const id of orderIdsOf(stop)) covered.add(id);

  for (const order of orders || []) {
    if (!order?.id || covered.has(String(order.id))) continue;
    const orderStops = [...(order.stops || [])];
    if (!orderStops.length) continue;
    for (const stop of orderStops) {
      result.push({
        ...(stop as any),
        tasks: [{
          order,
          type: isPickupType(stop.type) ? 'load' : 'unload',
        }],
      } as T);
    }
    covered.add(String(order.id));
  }
  return result;
}
