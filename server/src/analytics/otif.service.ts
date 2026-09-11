// ---------------------------------------------------------------------------
// CANONICAL TIME-PERFORMANCE KPI SERVICE (OTIF / OTD / OTP)
//
// Definitions (also exposed via GET /api/analytics/kpi-definitions):
//
// OTD  (On-Time Delivery)
//   eligible = orders in a delivered terminal status that carry BOTH a promised
//   delivery time (requested_delivery_at) and an actual delivery time
//   (actual_delivery_at).
//   good    = eligible orders whose actual_delivery_at <= requested +
//             graceMinutes. The grace period is configurable via the analytics
//             targets / company settings (default 0).
//   rate    = good / eligible × 100.
//
// OTIF (On Time, In Full)
//   eligible = same as OTD.
//   good     = on-time orders (see OTD) that are additionally NOT partial.
//   "In full" cannot yet be reconciled from the operational data model (there is
//   no per-order ordered-vs-delivered quantity reconciliation table); the
//   current proxy for "partial" is a delivery linked to a trip whose final
//   status is `partially_delivered`. The day a quantity reconciliation becomes
//   available, only the completeness predicate below needs to change.
//   rate    = good / eligible × 100.
//
// OTP  (On-Time Pickup)
//   eligible = pickup stops (trip `stops` rows of type 'pickup') carrying both a
//   window end (timeWindowMax) and an actual arrival (ata).
//   good     = ata <= timeWindowMax + graceMinutes.
//   rate     = good / eligible × 100.
//
// Trips-level on-time (secondary): actualArrival <= plannedArrival + grace.
// ---------------------------------------------------------------------------

import { isOnTime, num } from './analytics.utils';

export const ORDER_DELIVERED = new Set([
  'delivered', 'pod_received', 'ready_for_invoice', 'invoiced', 'paid', 'closed',
]);

export const ORDER_ACTIVE = new Set([
  'draft', 'new', 'planned', 'assigned', 'loading', 'in_transit', 'dispatched',
]);

export const TRIP_COMPLETED = new Set(['completed', 'closed']);
export const TRIP_ACTIVE = new Set([
  'planning', 'planned', 'dispatched', 'assigned', 'confirmed', 'driver_received',
  'driver_accepted', 'started', 'loading', 'driving', 'in_transit', 'partially_delivered',
]);

export interface OrderLike {
  status?: string;
  requested_delivery_at?: Date | string | null;
  actual_delivery_at?: Date | string | null;
  is_late?: boolean | string | null;
  late_minutes?: number | string | null;
  trip?: { status?: string } | null;
  trip_status?: string | null;
}

export interface PickupStopLike {
  type?: string;
  timeWindowMax?: Date | string | null;
  ata?: Date | string | null;
}

export interface RateResult {
  total: number;
  good: number;
  rate: number;
  lateCount: number;
  avgLateMinutes: number;
}

function gradeDelivery(orders: OrderLike[], graceMinutes: number, requireFull: boolean): RateResult {
  let eligible = 0, good = 0, lateCount = 0, lateMin = 0;
  for (const o of orders || []) {
    const status = String(o.status || '').toLowerCase();
    if (!ORDER_DELIVERED.has(status)) continue;
    const promised = o.requested_delivery_at;
    const actual = o.actual_delivery_at;
    if (!promised || !actual) continue;
    eligible++;
    const onTime = isOnTime(actual, promised, graceMinutes);
    if (!onTime) {
      lateCount++;
      const lm = num(o.late_minutes) || Math.max(0, (new Date(actual).getTime() - new Date(promised).getTime()) / 60000);
      lateMin += lm;
      continue;
    }
    const isPartial =
      String(o.trip_status || '') === 'partially_delivered' ||
      String(o.trip?.status || '') === 'partially_delivered';
    if (requireFull && isPartial) {
      lateCount++;
      continue;
    }
    good++;
  }
  return {
    total: eligible,
    good,
    rate: eligible > 0 ? (good / eligible) * 100 : 0,
    lateCount,
    avgLateMinutes: lateCount > 0 ? lateMin / lateCount : 0,
  };
}

export class OtifService {
  private graceMinutes = 0;

  setGraceMinutes(minutes: number) {
    this.graceMinutes = Math.max(0, minutes || 0);
  }

  /** OTD — on-time deliveries (order level). */
  otd(orders: OrderLike[]): RateResult {
    return gradeDelivery(orders, this.graceMinutes, false);
  }

  /** OTIF — on-time AND in-full deliveries (order level). */
  otif(orders: OrderLike[]): RateResult {
    return gradeDelivery(orders, this.graceMinutes, true);
  }

  /** OTP — on-time pickups at trip stops. */
  otp(stops: PickupStopLike[]): RateResult {
    let eligible = 0, good = 0, lateCount = 0, lateMin = 0;
    for (const s of stops || []) {
      if (String(s.type || '').toLowerCase() !== 'pickup') continue;
      if (!s.timeWindowMax || !s.ata) continue;
      eligible++;
      if (isOnTime(s.ata, s.timeWindowMax, this.graceMinutes)) good++;
      else {
        lateCount++;
        lateMin += Math.max(0, (new Date(s.ata).getTime() - new Date(s.timeWindowMax).getTime()) / 60000);
      }
    }
    return {
      total: eligible,
      good,
      rate: eligible > 0 ? (good / eligible) * 100 : 0,
      lateCount,
      avgLateMinutes: lateCount > 0 ? lateMin / lateCount : 0,
    };
  }

  /** Trips on time vs planned arrival (secondary metric). */
  tripsOnTime(trips: Array<{ plannedArrival?: any; actualArrival?: any }>): RateResult & { lateTrips: number } {
    let eligible = 0, good = 0, lateCount = 0, lateMin = 0;
    for (const t of trips || []) {
      if (!t.plannedArrival || !t.actualArrival) continue;
      eligible++;
      if (isOnTime(t.actualArrival, t.plannedArrival, this.graceMinutes)) good++;
      else {
        lateCount++;
        lateMin += Math.max(0, (new Date(t.actualArrival).getTime() - new Date(t.plannedArrival).getTime()) / 60000);
      }
    }
    return {
      total: eligible,
      good,
      rate: eligible > 0 ? (good / eligible) * 100 : 0,
      lateCount,
      avgLateMinutes: lateCount > 0 ? lateMin / lateCount : 0,
      lateTrips: lateCount,
    };
  }
}