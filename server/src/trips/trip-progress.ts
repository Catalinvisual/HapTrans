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
    arrived: ['loading', 'completed'],
    loading: ['completed'],
    unloading: [],
    completed: [],
  },
  delivery: {
    pending: ['arrived'],
    arrived: ['unloading', 'completed'],
    unloading: ['completed'],
    loading: [],
    completed: [],
  },
};

export function isStopStatus(value: string): value is StopStatusValue {
  return (STOP_STATUSES as readonly string[]).includes(value);
}

/** Rejects impossible or backwards moves instead of silently overwriting state. */
export function assertStopTransition(type: string, current: string, next: string) {
  const stopType = type === 'delivery' ? 'delivery' : 'pickup';
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

/** Order status implied by the stop operation, or null when nothing changes. */
export function deriveOrderStatusForStop(stopType: string, status: string): string | null {
  if (stopType === 'delivery') {
    if (status === 'unloading') return 'delivered';
    if (status === 'completed') return 'delivered';
    if (status === 'arrived') return 'in_transit';
    return null;
  }
  if (status === 'arrived' || status === 'loading') return 'loading';
  if (status === 'completed') return 'in_transit';
  return null;
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

  const pickups = bySeq.filter((s) => (s.type || 'pickup') !== 'delivery');
  const deliveries = bySeq.filter((s) => s.type === 'delivery');
  const anyDeliveryStarted = deliveries.some((s) =>
    ['arrived', 'unloading', 'completed'].includes(s.status),
  );
  const allPickupsCompleted = pickups.length > 0 && pickups.every((s) => s.status === 'completed');
  const anyPickupActive = pickups.some((s) => ['arrived', 'loading'].includes(s.status));

  if (anyDeliveryStarted) {
    return deliveries.every((s) => s.status === 'completed') && !allPickupsCompleted
      ? 'partially_delivered'
      : deliveries.some((s) => s.status === 'completed')
        ? 'partially_delivered'
        : 'driving';
  }
  if (allPickupsCompleted) return 'driving';
  if (anyPickupActive) return 'loading';
  return 'started';
}
