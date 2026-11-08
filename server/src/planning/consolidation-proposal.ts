import { KnownTruckCapacity } from './assignment-capacity';
import {
  consolidationCapacityForSequence,
  prepareLedgerStops,
  ConsolidationCapacityResult,
} from './consolidation-cargo';
import {
  computeRouteTotals,
  evaluateInsertion,
  scheduleForStops,
  InsertionEvaluation,
  InsertionLeg,
  InsertionOption,
  InsertionOrder,
  InsertionStop,
} from './stop-insertion';

/**
 * Assemble one consolidation proposal for an existing Trip.
 *
 * The proposal is the *best* insertion position for every requested Order, not
 * the existing route with the new stops appended at the tail. Every candidate
 * position is evaluated by `evaluateInsertion`; the chosen sequence is the
 * cheapest feasible one and the returned distance is the net increment over
 * the existing itinerary.
 *
 * Nothing here touches the database and every figure carries its provenance:
 * a route is only `verified` when every leg was answered by the routing
 * provider, and the schedule is an internal planning model, never tachograph
 * compliance.
 */

export const DEFAULT_SERVICE_MIN = 30;

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export type ProposalLevel = 'blocking' | 'warning';

export interface ProposalConflict {
  level: ProposalLevel;
  code: string;
  message: string;
  params?: Record<string, unknown>;
  stopKey?: string;
  orderId?: string | null;
}

export interface ProposalSequenceStop {
  sequence: number;
  key: string;
  id: string | null;
  type: string;
  city: string | null;
  companyName: string | null;
  orderId: string | null;
  orderNumber: string | null;
  isNew: boolean;
  plannedArrival: string | null;
  plannedDeparture: string | null;
  baselineArrival: string | null;
  etaDeltaMin: number | null;
  waitingMin: number;
  serviceMin: number;
  windowStart: string | null;
  windowEnd: string | null;
  windowStatus: 'met' | 'missed' | 'unverified';
  latitude: number | null;
  longitude: number | null;
}

export interface ProposalLeg {
  sequence: number;
  from: string | null;
  to: string | null;
  distanceKm: number;
  durationMin: number;
  provider: string | null;
}

export interface ProposalRoute {
  status: 'verified' | 'unverified';
  provider: string | null;
  baselineDistanceKm: number | null;
  proposedDistanceKm: number | null;
  addedDistanceKm: number | null;
  baselineDurationMin: number | null;
  proposedDurationMin: number | null;
  addedDurationMin: number | null;
  legs: ProposalLeg[];
  baselineLegs: ProposalLeg[];
}

export interface ProposalSchedule {
  status: 'verified' | 'unverified';
  departure: string | null;
  totalElapsedMin: number | null;
  drivingMin: number | null;
  waitingMin: number;
  breakMin: number;
  dailyRestMin: number;
  serviceMin: number;
  dutyDays: number;
  dailyDrivingMin: number[];
  methodology: 'eu_561_2006_planning_model';
}

export interface ProposalInsertionOption {
  pickupIndex: number;
  deliveryIndex: number;
  stopOrder: string[];
  sequence: ProposalSequenceStop[];
  addedDistanceKm: number | null;
  addedDrivingMin: number | null;
  waitingMin: number | null;
  totalMin: number | null;
  capacityAfter: { pallets: number; weightKg: number; ldm: number; volume: number };
  driverHours: InsertionOption['driverHours'];
  blockers: InsertionOption['blockers'];
  warnings: InsertionOption['warnings'];
  explanation: string;
}

export interface ConsolidationProposalInput {
  /** Raw Trip.stops rows; sorted by their stored sequence here. */
  existingStops: any[];
  /** Orders already allocated to the trip, used for legacy cargo tasks. */
  existingOrders: any[];
  /** Raw Order entities (with `stops` and `cargoItems`). */
  orders: any[];
  capacity: KnownTruckCapacity;
  departure: Date | null;
  leg: (from: InsertionStop, to: InsertionStop) => InsertionLeg | null;
  serviceMinutes?: number;
  vehicleLabel?: string | null;
}

export interface ConsolidationProposal {
  status: 'feasible' | 'infeasible' | 'unverified';
  proposedStops: InsertionStop[];
  sequence: ProposalSequenceStop[];
  route: ProposalRoute;
  cargo: ConsolidationCapacityResult;
  schedule: ProposalSchedule;
  insertion: {
    status: 'feasible' | 'infeasible' | 'unverified';
    explanation: string;
    blockedCount: number;
    rejectedCodes: string[];
    recommended: ProposalInsertionOption | null;
    alternatives: ProposalInsertionOption[];
  };
  blockers: ProposalConflict[];
  warnings: ProposalConflict[];
  explanation: string;
}

function mapTripStop(stop: any): InsertionStop {
  const orderId = stop?.tasks?.[0]?.order?.id || stop?.tasks?.[0]?.orderId || stop?.orderId || null;
  return {
    id: stop?.id,
    key: `${orderId || 'trip'}:${stop?.type}:${stop?.city || ''}`,
    orderId,
    type: String(stop?.type || ''),
    city: stop?.city || null,
    companyName: stop?.companyName || null,
    latitude: stop?.latitude ?? null,
    longitude: stop?.longitude ?? null,
    timeWindowMin: stop?.timeWindowMin ?? null,
    timeWindowMax: stop?.timeWindowMax ?? null,
    dateFrom: stop?.dateFrom ?? null,
    timeFrom: stop?.timeFrom ?? null,
    dateUntil: stop?.dateUntil ?? null,
    timeUntil: stop?.timeUntil ?? null,
    serviceDurationMinutes: stop?.serviceDurationMinutes ?? null,
    sequence: Number(stop?.sequence) || 0,
    tasks: stop?.tasks || [],
  };
}

function mapOrderStop(order: any, stop: any): InsertionStop {
  return {
    id: stop?.id,
    key: `${order.id}:${stop?.type}:${stop?.city || ''}`,
    type: String(stop?.type || ''),
    city: stop?.city || null,
    companyName: stop?.companyName || null,
    latitude: stop?.latitude ?? null,
    longitude: stop?.longitude ?? null,
    dateFrom: stop?.dateFrom ?? null,
    timeFrom: stop?.timeFrom ?? null,
    dateUntil: stop?.dateUntil ?? null,
    timeUntil: stop?.timeUntil ?? null,
    timeWindowMin: stop?.timeWindowMin ?? null,
    timeWindowMax: stop?.timeWindowMax ?? null,
    serviceDurationMinutes: stop?.serviceDurationMinutes ?? null,
    sequence: Number(stop?.sequence) || 0,
  };
}

function toInsertionOrder(order: any): InsertionOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    cargoItems: order.cargoItems || [],
    stops: [...((order.stops || []) as any[])].map((stop) => mapOrderStop(order, stop)),
  };
}

function legProvenance(
  stops: InsertionStop[],
  route: ReturnType<typeof computeRouteTotals>,
): ProposalLeg[] {
  return route.legs.map((leg, index) => ({
    sequence: index + 1,
    from: stops[index]?.city || null,
    to: stops[index + 1]?.city || null,
    distanceKm: leg ? round(leg.distanceKm) : 0,
    durationMin: leg ? round(leg.durationMin) : 0,
    provider: leg?.provider || null,
  }));
}

function summarizeOption(option: InsertionOption): ProposalInsertionOption {
  return {
    pickupIndex: option.pickupIndex,
    deliveryIndex: option.deliveryIndex,
    stopOrder: option.stopOrder,
    sequence: option.sequence.map((stop) => ({
      sequence: stop.sequence,
      key: stop.key,
      id: null,
      type: stop.type,
      city: stop.city,
      companyName: null,
      orderId: stop.orderId,
      orderNumber: null,
      isNew: false,
      plannedArrival: stop.plannedArrival,
      plannedDeparture: stop.plannedDeparture,
      baselineArrival: null,
      etaDeltaMin: null,
      waitingMin: stop.waitingMin,
      serviceMin: stop.serviceMin,
      windowStart: stop.windowStart,
      windowEnd: stop.windowEnd,
      windowStatus: stop.windowStatus,
      latitude: null,
      longitude: null,
    })),
    addedDistanceKm: option.addedDistanceKm,
    addedDrivingMin: option.addedDrivingMin,
    waitingMin: option.waitingMin,
    totalMin: option.totalMin,
    capacityAfter: option.capacityAfter,
    driverHours: option.driverHours,
    blockers: option.blockers,
    warnings: option.warnings,
    explanation: option.explanation,
  };
}

export function buildConsolidationProposal(input: ConsolidationProposalInput): ConsolidationProposal {
  const serviceMin = input.serviceMinutes ?? DEFAULT_SERVICE_MIN;
  const mapped = (input.existingStops || [])
    .slice()
    .sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
    .map(mapTripStop);
  // Legacy trips can have stops but no StopTask rows; the cargo ledger needs
  // one load/unload pair in that case and never overrides existing tasks.
  const existing = prepareLedgerStops(mapped as any[], input.existingOrders || []) as unknown as InsertionStop[];
  const existingKeys = new Set(existing.map((stop, index) => String(stop.key || stop.id || index)));

  const baselineSchedule = scheduleForStops(existing, input.leg, input.departure, serviceMin);
  const preExistingMissedKeys = new Set<string>();
  for (const miss of baselineSchedule.missed) {
    const stop = existing[miss.index];
    if (!stop) continue;
    preExistingMissedKeys.add(String(stop.key || stop.id));
  }
  const baselineArrivalByKey = new Map<string, string>();
  baselineSchedule.arrivals.forEach((arrival, index) => {
    const stop = existing[index];
    if (!arrival || !stop) return;
    baselineArrivalByKey.set(String(stop.key || stop.id), arrival.toISOString());
  });

  const conflicts: ProposalConflict[] = [];
  const orders = (input.orders || []).map(toInsertionOrder);
  let working: InsertionStop[] = existing.slice();
  let status: 'feasible' | 'infeasible' | 'unverified' = 'feasible';
  let lastEvaluation: InsertionEvaluation | null = null;
  // A proposal only exists when every requested order found a position.
  let placedAll = true;

  for (const order of orders) {
    const evaluation = evaluateInsertion({
      existingStops: working,
      order,
      capacity: input.capacity,
      departure: input.departure,
      leg: input.leg,
      serviceMinutes: serviceMin,
      preExistingMissedKeys,
    });
    lastEvaluation = evaluation;
    if (!evaluation.recommended) {
      placedAll = false;
      status = evaluation.status;
      for (const blocker of evaluation.blockers) {
        conflicts.push({ ...blocker, level: 'blocking', orderId: order.id });
      }
      for (const warning of evaluation.warnings) {
        conflicts.push({ ...warning, level: 'warning', orderId: order.id });
      }
      break;
    }
    working = evaluation.recommended.orderedStops;
    for (const warning of evaluation.recommended.warnings) {
      conflicts.push({ ...warning, level: 'warning', orderId: order.id });
    }
  }

  const proposedStops = working;
  const cargo = consolidationCapacityForSequence(
    mapped as any[],
    input.existingOrders || [],
    proposedStops as any[],
    input.capacity,
  );

  // The insertion search already reports capacity and ledger problems for every
  // rejected position. Only genuinely new codes are added here, so one overload
  // is never counted twice.
  const reported = new Set(conflicts.map((entry) => entry.code));
  for (const violation of cargo.violations) {
    if (reported.has(violation.code)) continue;
    reported.add(violation.code);
    conflicts.push({
      level: 'blocking',
      code: violation.code,
      params: { field: violation.field, load: violation.actual, max: violation.expected },
      message: `${violation.field} exceeds the ${input.vehicleLabel || 'selected vehicle'} limit at the peak route segment: ${violation.actual} > ${violation.expected}. Remove cargo, split the load, or assign a larger vehicle.`,
    });
  }
  for (const issue of cargo.after.issues) {
    if (issue.severity !== 'error' || issue.code === 'SEGMENT_CAPACITY_EXCEEDED') continue;
    if (reported.has('CARGO_LEDGER_INVALID')) continue;
    reported.add('CARGO_LEDGER_INVALID');
    conflicts.push({
      level: 'blocking',
      code: 'CARGO_LEDGER_INVALID',
      params: { field: issue.field, actual: issue.actual, expected: issue.expected },
      message: `${issue.message} Correct the allocation before confirming.`,
    });
  }
  if (cargo.duplicateTaskKeys.length > 0 && !reported.has('DUPLICATE_ALLOCATION')) {
    conflicts.push({
      level: 'blocking',
      code: 'DUPLICATE_ALLOCATION',
      params: { count: cargo.duplicateTaskKeys.length },
      message: 'The same order load/unload task is present more than once at a stop. Remove the duplicate allocation before confirming; capacity must not be double-counted.',
    });
  }

  const baselineRoute = baselineSchedule.route;
  const proposedRoute = computeRouteTotals(proposedStops, input.leg);
  // Without a placed position there is no proposed itinerary, so no proposed or
  // incremental figure may be reported as if one existed.
  const routeVerified = placedAll
    && baselineRoute.status === 'verified'
    && proposedRoute.status === 'verified';
  const addedDistanceKm = routeVerified
    ? round(Number(proposedRoute.distanceKm) - Number(baselineRoute.distanceKm))
    : null;
  const addedDurationMin = routeVerified
    ? round(Number(proposedRoute.drivingMin) - Number(baselineRoute.drivingMin))
    : null;
  const provider = proposedRoute.legs.find((leg) => leg?.provider)?.provider
    || baselineRoute.legs.find((leg) => leg?.provider)?.provider
    || null;

  const proposedSchedule = scheduleForStops(proposedStops, input.leg, input.departure, serviceMin);
  const orderNumbers = new Map(orders.map((order) => [order.id, order.orderNumber || null]));

  const sequence: ProposalSequenceStop[] = proposedStops.map((stop, index) => {
    const key = String(stop.key || stop.id || `stop-${index + 1}`);
    const arrival = proposedSchedule.arrivals[index] || null;
    const baselineArrival = baselineArrivalByKey.get(key) || null;
    const windowEnd = stop.timeWindowMax || stop.dateUntil || null;
    return {
      sequence: index + 1,
      key,
      id: stop.id || null,
      type: String(stop.type || '').toLowerCase(),
      city: stop.city || null,
      companyName: stop.companyName || null,
      orderId: stop.orderId || null,
      orderNumber: stop.orderId ? orderNumbers.get(String(stop.orderId)) || null : null,
      isNew: !existingKeys.has(key),
      plannedArrival: arrival?.toISOString() || null,
      plannedDeparture: proposedSchedule.departures[index]?.toISOString() || null,
      baselineArrival,
      etaDeltaMin: arrival && baselineArrival
        ? round((arrival.getTime() - new Date(baselineArrival).getTime()) / 60000)
        : null,
      waitingMin: proposedSchedule.waiting[index] || 0,
      serviceMin: Number(stop.serviceDurationMinutes) || serviceMin,
      windowStart: stop.timeWindowMin ? new Date(stop.timeWindowMin as any).toISOString() : null,
      windowEnd: windowEnd ? new Date(windowEnd as any).toISOString() : null,
      windowStatus: !arrival || !windowEnd
        ? 'unverified'
        : arrival.getTime() > new Date(windowEnd as any).getTime() ? 'missed' : 'met',
      latitude: Number.isFinite(Number(stop.latitude)) ? Number(stop.latitude) : null,
      longitude: Number.isFinite(Number(stop.longitude)) ? Number(stop.longitude) : null,
    };
  });

  const recommended = lastEvaluation?.recommended ? summarizeOption(lastEvaluation.recommended) : null;
  const alternatives = (lastEvaluation?.candidates || [])
    .filter((option) => option !== lastEvaluation?.recommended)
    .map(summarizeOption);

  const blockers = conflicts.filter((entry) => entry.level === 'blocking');
  const warnings = conflicts.filter((entry) => entry.level === 'warning');
  if (!routeVerified && !warnings.some((entry) => entry.code === 'ROUTE_UNVERIFIED')) {
    warnings.push({
      level: 'warning',
      code: 'ROUTE_UNVERIFIED',
      message: 'The road route could not be verified for both the existing and proposed itinerary. No incremental distance or duration is shown; confirm the stop coordinates and routing provider before relying on this result.',
    });
  }

  if (placedAll) {
    status = blockers.length > 0 ? 'infeasible' : routeVerified ? 'feasible' : 'unverified';
  }

  const explanation = recommended
    ? recommended.explanation
    : lastEvaluation?.explanation
      || 'No insertion position could be evaluated for the requested order.';

  return {
    status,
    proposedStops,
    sequence,
    route: {
      status: routeVerified ? 'verified' : 'unverified',
      provider,
      baselineDistanceKm: baselineRoute.distanceKm,
      proposedDistanceKm: routeVerified ? proposedRoute.distanceKm : null,
      addedDistanceKm,
      baselineDurationMin: baselineRoute.drivingMin,
      proposedDurationMin: routeVerified ? proposedRoute.drivingMin : null,
      addedDurationMin,
      legs: routeVerified ? legProvenance(proposedStops, proposedRoute) : [],
      baselineLegs: legProvenance(existing, baselineRoute),
    },
    cargo,
    schedule: {
      status: proposedSchedule.status,
      departure: input.departure ? input.departure.toISOString() : null,
      totalElapsedMin: routeVerified ? proposedSchedule.totalMin : null,
      drivingMin: routeVerified ? proposedRoute.drivingMin : null,
      waitingMin: proposedSchedule.waitingMin,
      breakMin: proposedSchedule.breakMin,
      dailyRestMin: proposedSchedule.dailyRestMin,
      serviceMin: serviceMin * Math.max(0, proposedStops.length - 1),
      dutyDays: proposedSchedule.dailyDrivingMin.length,
      dailyDrivingMin: proposedSchedule.dailyDrivingMin,
      methodology: 'eu_561_2006_planning_model',
    },
    insertion: {
      status,
      explanation,
      blockedCount: lastEvaluation?.blockedCount || 0,
      rejectedCodes: lastEvaluation?.rejectedCodes || [],
      recommended,
      alternatives,
    },
    blockers,
    warnings,
    explanation,
  };
}
