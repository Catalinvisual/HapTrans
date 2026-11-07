import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

/**
 * Single authority for the operational lifecycle shared by the TMS and the
 * driver mobile app.
 *
 * The driver app drives three records at once: the stop it operates, the trip
 * that contains it and the orders carried by that stop. Keeping that logic in
 * one place is what prevents the TMS from showing "Accepted" while the driver
 * is already unloading.
 */

export type StatusSource = 'mobile' | 'tms' | 'system';

export const STOP_STATUSES = ['pending', 'arrived', 'loading', 'unloading', 'completed'] as const;
export type StopStatusValue = (typeof STOP_STATUSES)[number];

/** Which driver action the source of a change is, based on the authenticated actor. */
export function resolveStatusSource(user: any): StatusSource {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'driver') return 'mobile';
  if (role === 'system') return 'system';
  if (!user?.id) return 'system';
  return 'tms';
}

export function isDriverActor(user: any): boolean {
  return String(user?.role || '').toLowerCase() === 'driver';
}

/** Authenticated accounts that may operate the trip, resolved from its own relations. */
function driverUserIdsOf(trip: any): string[] {
  const ids = [
    trip?.driver?.user?.id,
    trip?.truck?.driver?.user?.id,
    trip?.driver?.userId,
  ];
  return ids.filter(Boolean).map(String);
}

export function actorOwnsTrip(trip: any, user: any): boolean {
  const userId = user?.id ? String(user.id) : null;
  if (!userId) return false;
  return driverUserIdsOf(trip).includes(userId);
}

/**
 * Drivers may only operate trips assigned to their own account. Dispatchers and
 * admins keep their existing access. Identity always comes from the JWT, never
 * from the request body.
 */
export function assertActorMayOperateTrip(trip: any, user: any) {
  if (!user?.id) throw new ForbiddenException('Authentication required');
  if (!isDriverActor(user)) return;
  if (!actorOwnsTrip(trip, user)) {
    throw new ForbiddenException('Cursa nu este alocată acestui șofer');
  }
}

const STOP_TRANSITIONS: Record<string, Record<string, string[]>> = {
  pickup: {
    pending: ['arrived'],
    arrived: ['loading'],
    loading: ['completed'],
    unloading: [],
    completed: [],
  },
  delivery: {
    pending: ['arrived'],
    arrived: ['unloading'],
    unloading: ['completed'],
    loading: [],
    completed: [],
  },
};

export function isStopStatus(value: string): value is StopStatusValue {
  return (STOP_STATUSES as readonly string[]).includes(value);
}

/**
 * Stop types arrive from three places (TMS form, CSV import, legacy rows), so
 * they are compared case-insensitively. Treating 'DELIVERY' as a pickup is what
 * made the driver app offer "Start loading" at a delivery address.
 */
export function normalizeStopType(type: any, sequence?: number): 'pickup' | 'delivery' {
  const t = String(type ?? '').trim().toLowerCase();
  if (['delivery', 'dropoff', 'drop-off', 'unloading', 'unload', 'drop'].includes(t)) return 'delivery';
  if (['pickup', 'pick-up', 'collection', 'loading', 'load'].includes(t)) return 'pickup';
  const seq = Number(sequence);
  return Number.isFinite(seq) && seq >= 2 ? 'delivery' : 'pickup';
}

/** Legacy rows may store free text; the driver UI must always get a real status. */
export function normalizeStopStatus(status: any): StopStatusValue {
  const s = String(status ?? '').trim().toLowerCase();
  if ((STOP_STATUSES as readonly string[]).includes(s)) return s as StopStatusValue;
  if (['in_progress', 'at_stop', 'arrived_at_stop', 'on_site'].includes(s)) return 'arrived';
  if (['done', 'finished', 'delivered', 'unloaded'].includes(s)) return 'completed';
  return 'pending';
}

export type DriverStopActionKind =
  | 'arrive_pickup'
  | 'start_loading'
  | 'complete_loading'
  | 'arrive_delivery'
  | 'start_unloading'
  | 'complete_delivery';

/** The single action the driver may perform on a stop right now. */
export function driverActionForStop(
  stop: any,
): { kind: DriverStopActionKind; status: StopStatusValue } | null {
  const type = normalizeStopType(stop?.type, stop?.sequence);
  const status = normalizeStopStatus(stop?.status);
  if (status === 'completed') return null;

  if (type === 'pickup') {
    if (status === 'pending') return { kind: 'arrive_pickup', status: 'arrived' };
    if (status === 'arrived') return { kind: 'start_loading', status: 'loading' };
    if (status === 'loading') return { kind: 'complete_loading', status: 'completed' };
    return null;
  }
  if (status === 'pending') return { kind: 'arrive_delivery', status: 'arrived' };
  if (status === 'arrived') return { kind: 'start_unloading', status: 'unloading' };
  if (status === 'unloading') return { kind: 'complete_delivery', status: 'completed' };
  return null;
}

/** Rejects impossible or backwards moves instead of silently overwriting state. */
export function assertStopTransition(type: string, current: string, next: string) {
  const stopType = normalizeStopType(type);
  const allowed = STOP_TRANSITIONS[stopType][current] || [];
  if (!allowed.includes(next)) {
    throw new ConflictException(
      `Tranziție invalidă pentru oprirea ${stopType}: ${current} → ${next}`,
    );
  }
}

/** Server-side timestamps for each operational milestone of a stop. */
export function timestampsForStop(status: string, at: Date): Record<string, Date> {
  switch (status) {
    case 'arrived':
      return { ata: at };
    case 'loading':
      return { loadingStartedAt: at };
    case 'unloading':
      return { unloadingStartedAt: at };
    case 'completed':
      return { completedAt: at };
    default:
      return {};
  }
}

/**
 * Legacy order status implied by the stop operation. Arrival never marks an
 * order delivered, and unloading only moves it to in_transit. The operational
 * status is derived separately by `operational-status.ts`.
 */
export function deriveOrderStatusForStop(stopType: string, status: string): string | null {
  if (normalizeStopType(stopType) === 'delivery') {
    if (status === 'completed') return 'delivered';
    if (status === 'arrived' || status === 'unloading') return 'in_transit';
    return null;
  }
  // Arriving at the pickup only proves the driver is on site. The order does
  // not become 'loading' until loading has actually started.
  if (status === 'arrived') return null;
  if (status === 'loading') return 'loading';
  if (status === 'completed') return 'in_transit';
  return null;
}

/** Priority buckets used to decide which trip is the driver's current job. */
const DRIVER_FINISHED_STATUSES = ['completed', 'closed', 'cancelled', 'rejected'];
const DRIVER_ACTIVE_STATUSES = [
  'started',
  'loading',
  'driving',
  'partially_delivered',
  'in_transit',
  'at_pickup',
  'at_delivery',
  'unloading',
];

/**
 * 0 = work already under way, 1 = accepted but not started, 2 = waiting for
 * acceptance (today before tomorrow), 3 = finished. A newer assignment can
 * therefore never overtake a trip the driver is still unloading.
 */
export function driverTripPriority(trip: any): number {
  const status = String(trip?.status ?? '').toLowerCase();
  if (DRIVER_FINISHED_STATUSES.includes(status)) return 3;
  if (DRIVER_ACTIVE_STATUSES.includes(status)) return 0;
  if (status === 'driver_accepted') return 1;
  return 2;
}

function tripTime(value: any): number {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

/** Stable operational ordering: active first, then earliest scheduled trip. */
export function sortDriverTrips(trips: any[]): any[] {
  return [...(trips || [])].sort((a, b) => {
    const pa = driverTripPriority(a);
    const pb = driverTripPriority(b);
    if (pa !== pb) return pa - pb;
    if (pa === 3) {
      // Newest finished trip first; a cancelled trip without a completion date
      // must not jump ahead of a trip that actually delivered.
      const finishedAt = (trip: any) => {
        const time = trip?.completedAt ?? trip?.actualArrival ?? trip?.updatedAt ?? trip?.createdAt;
        const parsed = time ? new Date(time).getTime() : NaN;
        return Number.isFinite(parsed) ? parsed : 0;
      };
      const delta = finishedAt(b) - finishedAt(a);
      if (delta !== 0) return delta;
      return String(b?.tripNumber ?? '').localeCompare(String(a?.tripNumber ?? ''));
    }
    const ta = tripTime(a?.plannedDeparture ?? a?.createdAt);
    const tb = tripTime(b?.plannedDeparture ?? b?.createdAt);
    if (ta !== tb) return ta - tb;
    return String(a?.tripNumber ?? '').localeCompare(String(b?.tripNumber ?? ''));
  });
}

const TRIP_FINISHED_STATUSES = ['completed', 'closed', 'cancelled', 'canceled', 'rejected'];
const TRIP_ACCEPTED_STATUSES = ['driver_accepted'];
const TRIP_ACTIVE_STATUSES = [
  'started',
  'loading',
  'driving',
  'unloading',
  'at_pickup',
  'at_delivery',
  'in_transit',
  'partially_delivered',
];
const CANONICAL_ACCEPTED_OR_LATER = [
  'ACCEPTED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'LOADING',
  'EN_ROUTE_TO_DELIVERY',
  'ARRIVED_AT_DELIVERY',
  'UNLOADING',
  'COMPLETED',
];

/**
 * Whether the assigned driver has already taken the trip. This is the single
 * acceptance test used by the API, the mobile action payload and transition
 * guards. The legacy `status`, canonical `operationalStatus` and the persisted
 * acceptance timestamp all describe the same fact, so none of them may make
 * the driver app offer "Accept trip" a second time.
 */
export function isTripAccepted(trip: any): boolean {
  const status = String(trip?.status ?? '').trim().toLowerCase();
  const operational = String(trip?.operationalStatus ?? '').trim().toUpperCase();
  if (TRIP_ACCEPTED_STATUSES.includes(status)) return true;
  if (TRIP_ACTIVE_STATUSES.includes(status)) return true;
  if (CANONICAL_ACCEPTED_OR_LATER.includes(operational)) return true;
  return Boolean(trip?.driverAcceptedAt);
}

export type DriverTripActionKind = 'accept' | 'start' | DriverStopActionKind;

export interface DriverTripAction {
  kind: DriverTripActionKind;
  status?: string;
  stopId?: string;
}

/**
 * The one authoritative next action for the authenticated driver's trip.
 *
 * Acceptance and starting are trip-level actions; every later action belongs to
 * the first open stop. The helper derives from canonical status/stops rather
 * than translated labels or cached UI state.
 */
export function driverTripAction(trip: any, stops?: any[]): DriverTripAction | null {
  const status = String(trip?.status ?? '').trim().toLowerCase();
  const operational = String(trip?.operationalStatus ?? '').trim().toUpperCase();
  if (TRIP_FINISHED_STATUSES.includes(status)) return null;
  if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(operational)) return null;

  const list = (stops ?? trip?.stops ?? []).filter(Boolean);
  const sorted = [...list].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  const hasProgress = sorted.some((stop) => normalizeStopStatus(stop.status) !== 'pending');
  const active = TRIP_ACTIVE_STATUSES.includes(status) || hasProgress;

  if (!isTripAccepted(trip)) return { kind: 'accept', status: 'driver_accepted' };

  // Accepted but not started: the only valid next action is Start Trip. This
  // is what stops ACCEPTED from ever being paired with Accept Trip.
  if (!active) return { kind: 'start', status: 'started' };

  const firstOpen = sorted.find((stop) => normalizeStopStatus(stop.status) !== 'completed');
  if (!firstOpen) return null;
  const next = driverActionForStop(firstOpen);
  if (!next) return null;
  return { kind: next.kind, status: next.status, stopId: firstOpen.id };
}

/**
 * Trip status derived from the stops that actually exist, never from the last
 * button that was pressed. Partial completion stays partial.
 */
export function deriveTripStatus(stops: any[]): string {
  const list = (stops || []).filter(Boolean);
  if (list.length === 0) return 'started';
  const bySeq = [...list].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const allCompleted = bySeq.every((s) => s.status === 'completed');
  if (allCompleted) return 'completed';

  const pickups = bySeq.filter((s) => normalizeStopType(s.type, s.sequence) === 'pickup');
  const deliveries = bySeq.filter((s) => normalizeStopType(s.type, s.sequence) === 'delivery');
  const anyDeliveryStarted = deliveries.some((s) =>
    ['arrived', 'unloading', 'completed'].includes(s.status),
  );
  const allPickupsCompleted = pickups.length > 0 && pickups.every((s) => s.status === 'completed');
  const anyPickupActive = pickups.some((s) => ['arrived', 'loading'].includes(s.status));

  if (anyDeliveryStarted) {
    if (deliveries.some((s) => s.status === 'completed')) return 'partially_delivered';
    // Arrival is not unloading. Keep the trip at the delivery address until
    // the driver actually starts the unloading operation.
    if (deliveries.some((s) => s.status === 'unloading')) return 'unloading';
    if (deliveries.some((s) => s.status === 'arrived')) return 'at_delivery';
    return 'driving';
  }
  if (allPickupsCompleted) return 'driving';
  if (pickups.some((s) => s.status === 'arrived')) return 'at_pickup';
  if (pickups.some((s) => s.status === 'loading')) return 'loading';
  return 'started';
}
