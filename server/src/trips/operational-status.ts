/**
 * Canonical HapCargo operational lifecycle.
 *
 * These codes are the only operational states stored and returned by the API.
 * They are language independent; every driver and TMS screen translates the
 * same code through its own translation bundle. Legacy `trip.status` and
 * `order.status` remain in place for dispatch/finance compatibility, but they
 * are no longer the source of the operational label shown to users.
 */

export const OPERATIONAL_STATUSES = [
  'PLANNING',
  'ACCEPTED',
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'LOADING',
  'EN_ROUTE_TO_DELIVERY',
  'ARRIVED_AT_DELIVERY',
  'UNLOADING',
  'COMPLETED',
  'DELAYED',
  'EXCEPTION',
  'REJECTED',
  'CANCELLED',
  'DELIVERY_REJECTED',
  'PARTIALLY_REJECTED',
  'DELIVERY_EXCEPTION',
  'DELIVERY_ACCEPTED_WITH_REMARKS',
] as const;

export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const DELIVERY_INCIDENT_REASONS = [
  'DAMAGED_GOODS',
  'PALLET_OVERTURNED',
  'PACKAGING_DAMAGED',
  'GOODS_WET_OR_CONTAMINATED',
  'MISSING_GOODS',
  'INCORRECT_GOODS',
  'QUANTITY_DISCREPANCY',
  'CUSTOMER_REFUSED_DELIVERY',
  'CUSTOMER_REFUSED_PART',
  'GOODS_DO_NOT_MATCH_ORDER',
  'DELIVERY_ADDRESS_ISSUE',
  'OTHER',
] as const;

export type DeliveryIncidentReason = (typeof DELIVERY_INCIDENT_REASONS)[number];

export const DELIVERY_INCIDENT_OUTCOMES = [
  'FULL_REJECTION',
  'PARTIAL_REJECTION',
  'DAMAGE_ACCEPTED',
  'ACCEPTED_WITH_REMARKS',
  'OTHER_EXCEPTION',
] as const;

export const DELIVERY_RESOLUTIONS = [
  'RETURN_TO_ORIGIN',
  'DELIVER_REMAINING',
  'REDELIVERY',
  'AWAIT_CUSTOMER',
  'REPLACEMENT',
  'OTHER',
] as const;

export type DeliveryResolution = (typeof DELIVERY_RESOLUTIONS)[number];

export type DeliveryIncidentOutcome = (typeof DELIVERY_INCIDENT_OUTCOMES)[number];

const OUTCOME_STATUS: Record<DeliveryIncidentOutcome, OperationalStatus> = {
  FULL_REJECTION: 'DELIVERY_REJECTED',
  PARTIAL_REJECTION: 'PARTIALLY_REJECTED',
  DAMAGE_ACCEPTED: 'DELIVERY_ACCEPTED_WITH_REMARKS',
  ACCEPTED_WITH_REMARKS: 'DELIVERY_ACCEPTED_WITH_REMARKS',
  OTHER_EXCEPTION: 'DELIVERY_EXCEPTION',
};

/** The operational badge that represents a reported delivery outcome. */
export function operationalStatusForIncident(outcome: DeliveryIncidentOutcome): OperationalStatus {
  return OUTCOME_STATUS[outcome];
}

/** A full or partial rejection blocks completion until dispatch resolves it. */
export function incidentBlocksCompletion(outcome: string | null | undefined): boolean {
  return outcome === 'FULL_REJECTION' || outcome === 'PARTIAL_REJECTION';
}

export function isDeliveryIncidentReason(value: any): value is DeliveryIncidentReason {
  return DELIVERY_INCIDENT_REASONS.includes(String(value || '').toUpperCase() as DeliveryIncidentReason);
}

export function isDeliveryIncidentOutcome(value: any): value is DeliveryIncidentOutcome {
  return DELIVERY_INCIDENT_OUTCOMES.includes(String(value || '').toUpperCase() as DeliveryIncidentOutcome);
}

export function isDeliveryResolution(value: any): value is DeliveryResolution {
  return DELIVERY_RESOLUTIONS.includes(String(value || '').toUpperCase() as DeliveryResolution);
}

/** Maps legacy stored values to a canonical operational stage. */
export function operationalStatusFromLegacy(value: any): OperationalStatus {
  const raw = String(value ?? '').trim();
  if (OPERATIONAL_STATUSES.includes(raw.toUpperCase() as OperationalStatus)) {
    return raw.toUpperCase() as OperationalStatus;
  }
  const s = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (['planning', 'planned', 'confirmed', 'assigned', 'dispatched', 'driver_received', 'ready', 'draft', 'new'].includes(s)) {
    return 'PLANNING';
  }
  if (['driver_accepted', 'accepted'].includes(s)) return 'ACCEPTED';
  if (['started', 'en_route_to_pickup', 'driving_to_pickup', 'in_transit'].includes(s)) return 'EN_ROUTE_TO_PICKUP';
  if (['at_pickup', 'arrived_at_pickup', 'arrived'].includes(s)) return 'ARRIVED_AT_PICKUP';
  if (['loading', 'loading_in_progress'].includes(s)) return 'LOADING';
  if (['driving', 'en_route_to_delivery', 'driving_to_delivery', 'loaded'].includes(s)) return 'EN_ROUTE_TO_DELIVERY';
  if (['at_delivery', 'arrived_at_delivery'].includes(s)) return 'ARRIVED_AT_DELIVERY';
  if (['unloading', 'unloading_in_progress'].includes(s)) return 'UNLOADING';
  if (['completed', 'closed', 'delivered', 'pod_received'].includes(s)) return 'COMPLETED';
  if (['delayed', 'overdue'].includes(s)) return 'DELAYED';
  if (['rejected'].includes(s)) return 'REJECTED';
  if (['cancelled', 'canceled'].includes(s)) return 'CANCELLED';
  if (['exception', 'problem', 'incident'].includes(s)) return 'EXCEPTION';
  return 'PLANNING';
}

function stopType(stop: any): 'pickup' | 'delivery' {
  const type = String(stop?.type ?? '').trim().toLowerCase();
  if (['delivery', 'dropoff', 'drop-off', 'unloading', 'unload', 'drop'].includes(type)) return 'delivery';
  if (['pickup', 'pick-up', 'collection', 'loading', 'load'].includes(type)) return 'pickup';
  return Number(stop?.sequence) >= 2 ? 'delivery' : 'pickup';
}

function stopStatus(stop: any): string {
  return String(stop?.status ?? 'pending').trim().toLowerCase();
}

function sorted(stops: any[]): any[] {
  return [...(stops || [])].filter(Boolean).sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
}

/**
 * Derives the authoritative trip stage from the stops actually worked.
 * Arrival is a distinct stage from loading and unloading; it never starts work.
 */
export function deriveOperationalStatus(stops: any[], tripStatus?: string): OperationalStatus {
  const legacy = operationalStatusFromLegacy(tripStatus);
  const list = sorted(stops);
  if (list.length === 0) {
    if (legacy === 'PLANNING' || legacy === 'ACCEPTED') return legacy;
    return legacy === 'COMPLETED' ? 'COMPLETED' : legacy === 'CANCELLED' ? 'CANCELLED' : legacy;
  }
  if (list.every((s) => stopStatus(s) === 'completed')) return 'COMPLETED';

  const firstOpen = list.find((s) => stopStatus(s) !== 'completed');
  if (!firstOpen) return 'COMPLETED';

  const type = stopType(firstOpen);
  const status = stopStatus(firstOpen);

  // A pending stop proves that no operational work has started, but it does
  // not prove that the driver accepted the trip. Only the persisted ACCEPTED
  // stage can do that; every earlier state stays PLANNING. This is the source
  // of the defect where future dispatched trips were labelled Accepted.
  const beforeStart = legacy === 'ACCEPTED' ? 'ACCEPTED' : 'PLANNING';

  if (type === 'pickup') {
    if (status === 'arrived') return 'ARRIVED_AT_PICKUP';
    if (status === 'loading') return 'LOADING';
    if (status === 'pending') {
      return legacy === 'EN_ROUTE_TO_PICKUP' ? 'EN_ROUTE_TO_PICKUP' : beforeStart;
    }
  }

  if (status === 'arrived') return 'ARRIVED_AT_DELIVERY';
  if (status === 'unloading') return 'UNLOADING';
  if (status === 'pending') {
    const pickupOpen = list.some((s) => stopType(s) === 'pickup' && stopStatus(s) !== 'completed');
    return pickupOpen ? (legacy === 'EN_ROUTE_TO_PICKUP' ? 'EN_ROUTE_TO_PICKUP' : beforeStart) : 'EN_ROUTE_TO_DELIVERY';
  }
  return legacy === 'COMPLETED' ? 'COMPLETED' : 'EN_ROUTE_TO_DELIVERY';
}

/**
 * Re-derives the canonical stage on a loaded trip. API reads use this so a
 * stale stored operationalStatus can never override the real stop state.
 */
export function normalizeTripOperationalStatus<T extends { operationalStatus?: any }>(trip: T): T {
  if (!trip) return trip;
  const source = trip as any;
  trip.operationalStatus = deriveOperationalStatus(
    Array.isArray(source.stops) ? source.stops : [],
    source.status,
  );
  return trip;
}

export interface OrderDeliveryProgress {
  /** True only when every delivery allocation of this order is completed. */
  allDeliveriesDone: boolean;
  /** Canonical stage of the next still-open delivery stop. */
  operationalStatus: OperationalStatus;
}

/**
 * Progress of one order across all of its delivery stops on a trip.
 *
 * Completing a single delivery allocation of a multi-stop order must not
 * report the whole order as completed. The next open allocation decides the
 * label: pending -> en route, arrived -> arrived, unloading -> unloading.
 */
export function orderDeliveryProgress(deliveryStops: any[]): OrderDeliveryProgress {
  const open = (deliveryStops || [])
    .filter((stop) => stop && stopStatus(stop) !== 'completed')
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));
  if (open.length === 0) {
    return { allDeliveriesDone: true, operationalStatus: 'COMPLETED' };
  }
  const status = stopStatus(open[0]);
  const operationalStatus: OperationalStatus = status === 'arrived'
    ? 'ARRIVED_AT_DELIVERY'
    : status === 'unloading'
      ? 'UNLOADING'
      : 'EN_ROUTE_TO_DELIVERY';
  return { allDeliveriesDone: false, operationalStatus };
}

/** Operational status for one order, based on the stop that carries it. */
export function deriveOrderOperationalStatus(stopTypeValue: string, status: string): OperationalStatus {
  const type = stopType({ type: stopTypeValue });
  const s = String(status || 'pending').toLowerCase();
  if (s === 'completed') return type === 'pickup' ? 'EN_ROUTE_TO_DELIVERY' : 'COMPLETED';
  if (type === 'pickup') {
    if (s === 'arrived') return 'ARRIVED_AT_PICKUP';
    if (s === 'loading') return 'LOADING';
    return 'ACCEPTED';
  }
  if (s === 'arrived') return 'ARRIVED_AT_DELIVERY';
  if (s === 'unloading') return 'UNLOADING';
  return 'EN_ROUTE_TO_DELIVERY';
}

/**
 * Legacy commercial/fulfilment order status. It deliberately stays `in_transit`
 * while unloading is under way; only a completed delivery becomes delivered.
 */
export function legacyOrderStatusForStop(stopTypeValue: string, status: string): string | null {
  const type = stopType({ type: stopTypeValue });
  const s = String(status || '').toLowerCase();
  if (type === 'pickup') {
    // Arrival is not the start of loading. Keeping this distinction here keeps
    // the order badge consistent with the trip and stop badges.
    if (s === 'arrived') return null;
    if (s === 'loading') return 'loading';
    if (s === 'completed') return 'in_transit';
    return null;
  }
  if (s === 'arrived' || s === 'unloading') return 'in_transit';
  if (s === 'completed') return 'delivered';
  return null;
}
