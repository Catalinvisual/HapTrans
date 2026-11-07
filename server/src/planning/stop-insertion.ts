import { KnownTruckCapacity, CapacityViolation } from './assignment-capacity';
import { buildCargoLedger, CargoLedgerStop } from './cargo-ledger';
import { cargoForOrder } from './consolidation-cargo';

/**
 * Insertion evaluation for adding an Order to an existing Trip.
 *
 * The previous behaviour appended the new stops to the end of the route. This
 * module evaluates every position for the new pickup and delivery against the
 * real constraints: pickup-before-delivery, per-order dependencies, cargo on
 * board after each stop, time windows, incremental road distance/time and
 * driver working time. It never mutates anything; the caller persists the
 * selected sequence after the dispatcher confirms it.
 */

export interface InsertionLeg {
  distanceKm: number;
  durationMin: number;
}

export interface InsertionStop {
  id?: string;
  /** Stable key used to persist the confirmed sequence (order stop id). */
  key?: string;
  orderId?: string | null;
  type: string;
  city?: string | null;
  companyName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timeWindowMin?: string | Date | null;
  timeWindowMax?: string | Date | null;
  dateFrom?: string | null;
  timeFrom?: string | null;
  dateUntil?: string | null;
  timeUntil?: string | null;
  serviceDurationMinutes?: number | null;
  tasks?: any[];
}

export interface InsertionOrder {
  id: string;
  orderNumber?: string;
  cargoItems?: any[];
  stops: InsertionStop[];
}

export interface InsertionContext {
  existingStops: InsertionStop[];
  order: InsertionOrder;
  capacity: KnownTruckCapacity;
  departure: Date | null;
  /** Road leg between two stops; null means the provider had no answer. */
  leg: (from: InsertionStop, to: InsertionStop) => InsertionLeg | null;
  serviceMinutes?: number;
  /** EU daily driving limit, 9h. */
  maxDailyDrivingMin?: number;
  /** 10h extension is allowed twice a week but must be reported. */
  maxExtendedDrivingMin?: number;
}

export interface InsertionBlocker {
  level: 'blocking';
  code: string;
  stopKey?: string;
  params?: Record<string, unknown>;
  message: string;
}

export interface InsertionWarning {
  level: 'warning';
  code: string;
  stopKey?: string;
  params?: Record<string, unknown>;
  message: string;
}

export interface InsertionSequenceStop {
  sequence: number;
  key: string;
  type: string;
  city: string | null;
  orderId: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  plannedArrival: string | null;
  waitingMin: number;
}

export interface InsertionOption {
  pickupIndex: number;
  deliveryIndex: number;
  sequence: InsertionSequenceStop[];
  stopOrder: string[];
  distanceKm: number | null;
  drivingMin: number | null;
  waitingMin: number | null;
  totalMin: number | null;
  addedDistanceKm: number | null;
  addedDrivingMin: number | null;
  addedWaitingMin: number | null;
  capacityBefore: { pallets: number; weightKg: number; ldm: number; volume: number };
  capacityAfter: { pallets: number; weightKg: number; ldm: number; volume: number };
  capacityCapacity: KnownTruckCapacity;
  driverHours: {
    status: 'verified' | 'unverified' | 'exceeded';
    drivingMin: number | null;
    elapsedMin: number | null;
    breakMinutes: number;
    dailyLimitMin: number;
  };
  blockers: InsertionBlocker[];
  warnings: InsertionWarning[];
  explanation: string;
}

export interface InsertionEvaluation {
  status: 'feasible' | 'infeasible' | 'unverified';
  recommended: InsertionOption | null;
  candidates: InsertionOption[];
  blockedCount: number;
  rejectedCodes: string[];
  blockers: InsertionBlocker[];
  warnings: InsertionWarning[];
  explanation: string;
}

const DEFAULT_SERVICE_MIN = 30;
const BREAK_AFTER_DRIVING_MIN = 270;
const BREAK_MIN = 45;
const SHIFT_WARN_MIN = 13 * 60;
const SHIFT_MAX_MIN = 15 * 60;
const DEFAULT_DAILY_DRIVING_MIN = 540;
const DEFAULT_EXTENDED_DRIVING_MIN = 600;

const num = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

function parseDate(value: any): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function combine(date?: string | null, time?: string | null): Date | null {
  if (!date) return null;
  return parseDate(`${date}T${time && time.length === 5 ? time : time || '00:00'}:00`);
}

function windowStart(stop: InsertionStop): Date | null {
  return parseDate(stop.timeWindowMin) || combine(stop.dateFrom, stop.timeFrom);
}

function windowEnd(stop: InsertionStop): Date | null {
  return parseDate(stop.timeWindowMax) || combine(stop.dateUntil || stop.dateFrom, stop.timeUntil);
}

function isPickup(stop: InsertionStop): boolean {
  return ['pickup', 'load'].includes(String(stop.type || '').toLowerCase());
}

function isDelivery(stop: InsertionStop): boolean {
  return ['delivery', 'dropoff', 'unload'].includes(String(stop.type || '').toLowerCase());
}

function stopKey(stop: InsertionStop, fallback: string): string {
  return String(stop.key || stop.id || fallback);
}

/** Synthetic tasks mirror the consolidation preview: load on the first pickup, unload on the last delivery. */
function newOrderStops(order: InsertionOrder): InsertionStop[] {
  const stops = (order.stops || [])
    .slice()
    .sort((a, b) => Number((a as any).sequence || 0) - Number((b as any).sequence || 0));
  const cargo = cargoForOrder(order);
  const firstLoad = stops.findIndex((stop) => isPickup(stop));
  const lastUnload = stops.map((stop) => isDelivery(stop)).lastIndexOf(true);
  return stops.map((stop, index) => {
    const load = isPickup(stop);
    const unload = isDelivery(stop);
    const carries = load ? index === firstLoad : index === lastUnload;
    const dimensions = carries
      ? { pallets: cargo.pallets, weightKg: cargo.weight, ldm: cargo.ldm, volume: cargo.volume }
      : { pallets: 0, weightKg: 0, ldm: 0, volume: 0 };
    const tasks = load || unload
      ? [{
        id: `insertion-${order.id}-${index}`,
        type: load ? 'load' : 'unload',
        status: 'pending',
        pallets: dimensions.pallets,
        quantity: dimensions.pallets,
        weightKg: dimensions.weightKg,
        volumeCbm: dimensions.volume,
        loadingMeters: dimensions.ldm,
        order: { id: order.id, orderNumber: order.orderNumber },
      }]
      : [];
    return { ...stop, orderId: order.id, tasks } as InsertionStop;
  });
}

function ledgerStop(stop: InsertionStop, sequence: number): CargoLedgerStop {
  return {
    id: stop.id || stop.key,
    sequence,
    type: stop.type,
    city: stop.city || null,
    companyName: stop.companyName || null,
    tasks: stop.tasks || [],
  } as CargoLedgerStop;
}

interface RouteTotalsInternal {
  status: 'verified' | 'unverified';
  distanceKm: number | null;
  drivingMin: number | null;
  legs: Array<{ distanceKm: number; durationMin: number } | null>;
}

function routeTotals(stops: InsertionStop[], leg: InsertionContext['leg']): RouteTotalsInternal {
  const legs: Array<InsertionLeg | null> = [];
  let verified = true;
  for (let index = 1; index < stops.length; index += 1) {
    const from = stops[index - 1];
    const to = stops[index];
    const hasCoordinates = [from.latitude, from.longitude, to.latitude, to.longitude]
      .every((value) => Number.isFinite(Number(value)));
    const resolved = hasCoordinates ? leg(from, to) : null;
    if (!resolved || !Number.isFinite(Number(resolved.distanceKm)) || !Number.isFinite(Number(resolved.durationMin))) {
      verified = false;
      legs.push(null);
      continue;
    }
    legs.push({ distanceKm: Number(resolved.distanceKm), durationMin: Number(resolved.durationMin) });
  }
  if (!verified) {
    return { status: 'unverified', distanceKm: null, drivingMin: null, legs };
  }
  return {
    status: 'verified',
    distanceKm: round(legs.reduce((sum, item) => sum + (item?.distanceKm || 0), 0)),
    drivingMin: round(legs.reduce((sum, item) => sum + (item?.durationMin || 0), 0)),
    legs,
  };
}

interface ScheduleResult {
  status: 'verified' | 'unverified';
  arrivals: Array<Date | null>;
  waitingMin: number;
  breakMin: number;
  totalMin: number | null;
  missed: Array<{ index: number; arrival: Date; windowEnd: Date }>;
}

function schedule(stops: InsertionStop[], route: RouteTotalsInternal, ctx: InsertionContext, serviceMin: number): ScheduleResult {
  const empty: ScheduleResult = {
    status: 'unverified', arrivals: stops.map(() => null), waitingMin: 0, breakMin: 0, totalMin: null, missed: [],
  };
  if (!ctx.departure || route.status !== 'verified') return empty;
  let current = ctx.departure.getTime();
  let drivingSinceBreak = 0;
  let waitingMin = 0;
  let breakMin = 0;
  const arrivals: Array<Date | null> = [];
  const missed: Array<{ index: number; arrival: Date; windowEnd: Date }> = [];
  arrivals.push(new Date(current));
  for (let index = 1; index < stops.length; index += 1) {
    const item = route.legs[index - 1];
    const legMin = item?.durationMin || 0;
    drivingSinceBreak += legMin;
    current += legMin * 60000;
    if (drivingSinceBreak >= BREAK_AFTER_DRIVING_MIN) {
      current += BREAK_MIN * 60000;
      breakMin += BREAK_MIN;
      waitingMin += BREAK_MIN;
      drivingSinceBreak = 0;
    }
    const stop = stops[index];
    const arrival = new Date(current);
    const start = windowStart(stop);
    if (start && arrival.getTime() < start.getTime()) {
      const wait = (start.getTime() - arrival.getTime()) / 60000;
      waitingMin += wait;
      current = start.getTime();
    }
    const arrivalAfterWait = new Date(current);
    const end = windowEnd(stop);
    if (end && arrivalAfterWait.getTime() > end.getTime()) {
      missed.push({ index, arrival: arrivalAfterWait, windowEnd: end });
    }
    arrivals.push(arrivalAfterWait);
    current += (Number(stop.serviceDurationMinutes) || serviceMin) * 60000;
  }
  return {
    status: 'verified',
    arrivals,
    waitingMin: round(waitingMin),
    breakMin,
    totalMin: round((current - ctx.departure.getTime()) / 60000),
    missed,
  };
}

function capacityCode(violation: CapacityViolation): InsertionBlocker {
  return {
    level: 'blocking',
    code: violation.code,
    params: { field: violation.field, load: violation.actual, max: violation.expected },
    message: `The peak load after insertion exceeds ${violation.field}: ${violation.actual} > ${violation.expected}.`,
  };
}

function evaluateCandidate(
  sequenceStops: InsertionStop[],
  pickupIndex: number,
  deliveryIndex: number,
  ctx: InsertionContext,
  baseline: { route: RouteTotalsInternal; ledgerPeak: { pallets: number; weightKg: number; ldm: number; volume: number } },
): InsertionOption {
  const serviceMin = ctx.serviceMinutes || DEFAULT_SERVICE_MIN;
  const route = routeTotals(sequenceStops, ctx.leg);
  const ledger = buildCargoLedger(sequenceStops.map((stop, index) => ledgerStop(stop, index + 1)), ctx.capacity);
  const plan = schedule(sequenceStops, route, ctx, serviceMin);
  const orderNumber = ctx.order.orderNumber || ctx.order.id;

  const blockers: InsertionBlocker[] = [];
  const warnings: InsertionWarning[] = [];

  const peak = {
    pallets: ledger.peak.pallets,
    weightKg: ledger.peak.weightKg,
    ldm: ledger.peak.loadingMeters,
    volume: ledger.peak.volumeCbm,
  };
  for (const violation of capacityViolationsFor(peak, ctx.capacity)) {
    blockers.push(capacityCode(violation));
  }
  for (const issue of ledger.issues) {
    if (issue.severity !== 'error') continue;
    if (issue.code === 'SEGMENT_CAPACITY_EXCEEDED') continue;
    blockers.push({
      level: 'blocking',
      code: issue.code === 'UNLOAD_EXCEEDS_LOAD' ? 'UNLOAD_BEFORE_LOAD' : issue.code,
      stopKey: issue.stopId,
      params: { field: issue.field, actual: issue.actual, expected: issue.expected },
      message: issue.code === 'UNLOAD_EXCEEDS_LOAD'
        ? `At stop ${issue.stopId || '?'} the delivery unloads cargo that has not been picked up yet in this sequence. Move the pickup earlier or the delivery later.`
        : issue.message,
    });
  }

  for (const miss of plan.missed) {
    const stop = sequenceStops[miss.index];
    blockers.push({
      level: 'blocking',
      code: 'STOP_WINDOW_MISSED',
      stopKey: stopKey(stop, `stop-${miss.index + 1}`),
      params: { city: stop.city, arrival: miss.arrival.toISOString(), windowEnd: miss.windowEnd.toISOString() },
      message: `Arrival at ${stop.city || 'stop ' + (miss.index + 1)} would be ${miss.arrival.toISOString()}, after the window closes at ${miss.windowEnd.toISOString()}.`,
    });
  }

  if (route.status !== 'verified') {
    warnings.push({
      level: 'warning',
      code: 'ROUTE_UNVERIFIED',
      message: 'At least one leg has no road route, so the incremental distance and duration are unverified for this position.',
    });
  }

  const dailyLimit = ctx.maxDailyDrivingMin ?? DEFAULT_DAILY_DRIVING_MIN;
  const extendedLimit = ctx.maxExtendedDrivingMin ?? DEFAULT_EXTENDED_DRIVING_MIN;
  const drivingMin = route.drivingMin;
  if (drivingMin != null && drivingMin > extendedLimit) {
    blockers.push({
      level: 'blocking',
      code: 'DRIVER_DAILY_DRIVING_EXCEEDED',
      params: { drivingMin, limit: extendedLimit },
      message: `The route needs ${round(drivingMin / 60, 1)}h of driving, above the ${round(extendedLimit / 60, 0)}h absolute daily limit.`,
    });
  } else if (drivingMin != null && drivingMin > dailyLimit) {
    warnings.push({
      level: 'warning',
      code: 'DRIVER_EXTENDED_DRIVING',
      params: { drivingMin, limit: dailyLimit },
      message: `Driving time is ${round(drivingMin / 60, 1)}h, above the 9h daily limit; the 10h extension is allowed only twice a week and must be confirmed against tachograph data.`,
    });
  }
  if (plan.breakMin > 0) {
    warnings.push({
      level: 'warning',
      code: 'DRIVER_BREAK_INSERTED',
      params: { breakMin: plan.breakMin },
      message: `A ${BREAK_MIN} minute break is required after 4.5h of continuous driving and is included in the schedule.`,
    });
  }
  if (plan.totalMin != null && plan.totalMin > SHIFT_MAX_MIN) {
    blockers.push({
      level: 'blocking',
      code: 'DRIVER_SHIFT_EXCEEDED',
      params: { totalMin: plan.totalMin },
      message: `The duty would last ${round(plan.totalMin / 60, 1)}h, beyond the 15h maximum including breaks.`,
    });
  } else if (plan.totalMin != null && plan.totalMin > SHIFT_WARN_MIN) {
    warnings.push({
      level: 'warning',
      code: 'DRIVER_SHIFT_LONG',
      params: { totalMin: plan.totalMin },
      message: `The duty would last ${round(plan.totalMin / 60, 1)}h, above the normal 13h working day.`,
    });
  }
  if (plan.status === 'unverified') {
    warnings.push({
      level: 'warning',
      code: 'SCHEDULE_UNVERIFIED',
      message: 'Stops have no time windows or the departure is missing, so arrival times are unverified.',
    });
  }

  const addedDistanceKm = route.status === 'verified' && baseline.route.status === 'verified'
    ? round(Number(route.distanceKm) - Number(baseline.route.distanceKm))
    : null;
  const addedDrivingMin = route.status === 'verified' && baseline.route.status === 'verified'
    ? round(Number(route.drivingMin) - Number(baseline.route.drivingMin))
    : null;
  const addedWaitingMin = plan.status === 'verified' ? plan.waitingMin : null;

  const sequence = sequenceStops.map((stop, index) => ({
    sequence: index + 1,
    key: stopKey(stop, `position-${index + 1}`),
    type: String(stop.type || '').toLowerCase(),
    city: stop.city || null,
    orderId: stop.orderId || null,
    windowStart: windowStart(stop)?.toISOString() || null,
    windowEnd: windowEnd(stop)?.toISOString() || null,
    plannedArrival: plan.arrivals[index]?.toISOString() || null,
    waitingMin: 0,
  }));

  const pickupStop = sequenceStops[pickupIndex];
  const deliveryStop = sequenceStops[deliveryIndex];
  const afterCity = pickupIndex > 0 ? sequenceStops[pickupIndex - 1].city : null;
  const explanationParts = [
    `Order ${orderNumber} is placed with pickup at ${pickupStop?.city || 'position ' + (pickupIndex + 1)}`
      + (afterCity ? ` after ${afterCity}` : ' at the start of the route')
      + ` and delivery at ${deliveryStop?.city || 'position ' + (deliveryIndex + 1)}.`,
  ];
  if (addedDistanceKm != null) {
    explanationParts.push(`It adds ${addedDistanceKm} km and ${addedDrivingMin} minutes of driving to the current route.`);
  }
  if (blockers.length) {
    explanationParts.push(`This position is rejected: ${blockers.map((blocker) => blocker.code).join(', ')}.`);
  } else if (warnings.length) {
    explanationParts.push(`It is feasible with ${warnings.length} warning(s): ${warnings.map((warning) => warning.code).join(', ')}.`);
  } else {
    explanationParts.push('It satisfies capacity at every stop, the time windows and the driver working-time limits.');
  }

  return {
    pickupIndex,
    deliveryIndex,
    sequence,
    stopOrder: sequenceStops.map((stop, index) => stopKey(stop, `position-${index + 1}`)),
    distanceKm: route.distanceKm,
    drivingMin: route.drivingMin,
    waitingMin: plan.status === 'verified' ? plan.waitingMin : null,
    totalMin: plan.totalMin,
    addedDistanceKm,
    addedDrivingMin,
    addedWaitingMin,
    capacityBefore: baseline.ledgerPeak,
    capacityAfter: peak,
    capacityCapacity: ctx.capacity,
    driverHours: {
      status: drivingMin == null ? 'unverified' : drivingMin > dailyLimit ? 'exceeded' : 'verified',
      drivingMin,
      elapsedMin: plan.totalMin,
      breakMinutes: plan.breakMin,
      dailyLimitMin: dailyLimit,
    },
    blockers,
    warnings,
    explanation: explanationParts.join(' '),
  };
}

function uniqueWarnings(options: InsertionOption[]): InsertionWarning[] {
  const seen = new Set<string>();
  const out: InsertionWarning[] = [];
  for (const option of options) {
    for (const warning of option.warnings) {
      if (seen.has(warning.code)) continue;
      seen.add(warning.code);
      out.push(warning);
    }
  }
  return out;
}

function uniqueBlockers(options: InsertionOption[]): InsertionBlocker[] {
  const seen = new Set<string>();
  const out: InsertionBlocker[] = [];
  for (const option of options) {
    for (const blocker of option.blockers) {
      if (seen.has(blocker.code)) continue;
      seen.add(blocker.code);
      out.push(blocker);
    }
  }
  return out;
}

function capacityViolationsFor(
  cargo: { pallets: number; weightKg: number; ldm: number; volume: number },
  capacity: KnownTruckCapacity,
): CapacityViolation[] {
  const checks: Array<[CapacityViolation['code'], CapacityViolation['field'], number, number | null]> = [
    ['WEIGHT_OVERLOAD', 'maxWeightKg', cargo.weightKg, capacity.maxWeightKg],
    ['LDM_OVERLOAD', 'maxLdm', cargo.ldm, capacity.maxLdm],
    ['VOLUME_OVERLOAD', 'maxVolumeCbm', cargo.volume, capacity.maxVolumeCbm],
    ['PALLET_OVERLOAD', 'maxPallets', cargo.pallets, capacity.maxPallets],
  ];
  return checks
    .filter(([, , actual, expected]) => expected !== null && actual > expected)
    .map(([code, field, actual, expected]) => ({ code, field, actual, expected: expected as number }));
}

/**
 * Evaluate every feasible position pair (pickup, delivery) for one Order.
 * Existing stops keep their relative order, so their dependencies hold; the
 * new Order's own pickup is always before its delivery because p < d.
 */
export function evaluateInsertion(ctx: InsertionContext): InsertionEvaluation {
  const existing = (ctx.existingStops || [])
    .slice()
    .sort((a, b) => Number((a as any).sequence || 0) - Number((b as any).sequence || 0));
  const additions = newOrderStops(ctx.order);
  const pickup = additions.find((stop) => isPickup(stop));
  const delivery = additions.slice().reverse().find((stop) => isDelivery(stop)) || null;

  if (!pickup || !delivery) {
    return {
      status: 'infeasible',
      recommended: null,
      candidates: [],
      blockedCount: 0,
      rejectedCodes: ['ORDER_STOPS_INCOMPLETE'],
      blockers: [{
        level: 'blocking',
        code: 'ORDER_STOPS_INCOMPLETE',
        message: `Order ${ctx.order.orderNumber || ctx.order.id} needs at least one pickup and one delivery before it can be inserted.`,
      }],
      warnings: [],
      explanation: 'The order has no pickup/delivery pair, so no insertion position can be evaluated.',
    };
  }

  const baselineRoute = routeTotals(existing, ctx.leg);
  const baselineLedger = buildCargoLedger(existing.map((stop, index) => ledgerStop(stop, index + 1)), ctx.capacity);
  const baseline = {
    route: baselineRoute,
    ledgerPeak: {
      pallets: baselineLedger.peak.pallets,
      weightKg: baselineLedger.peak.weightKg,
      ldm: baselineLedger.peak.loadingMeters,
      volume: baselineLedger.peak.volumeCbm,
    },
  };

  // Intermediate stops of a multi-stop order travel with its pickup, so the
  // order's own internal sequence is never broken by an insertion.
  const pickupAt = additions.indexOf(pickup);
  const deliveryAt = additions.indexOf(delivery);
  const middle = additions.slice(pickupAt + 1, deliveryAt);

  const options: InsertionOption[] = [];
  for (let p = 0; p <= existing.length; p += 1) {
    for (let d = p + 1 + middle.length; d <= existing.length + 1 + middle.length; d += 1) {
      const sequence = existing.slice();
      sequence.splice(p, 0, pickup, ...middle);
      sequence.splice(d, 0, delivery);
      options.push(evaluateCandidate(sequence, p, d, ctx, baseline));
    }
  }

  const feasible = options.filter((option) => option.blockers.length === 0);
  // A position whose road route is unknown can never be recommended: capacity
  // and time windows could not be verified for it, so presenting it as the best
  // option would hide unverified data behind a green result.
  const recommendable = feasible.filter((option) => option.addedDistanceKm != null);
  recommendable.sort((a, b) => {
    const byDistance = (a.addedDistanceKm ?? 0) - (b.addedDistanceKm ?? 0);
    if (byDistance !== 0) return byDistance;
    return (a.addedDrivingMin ?? 0) - (b.addedDrivingMin ?? 0);
  });
  const blocked = options.filter((option) => option.blockers.length > 0);
  const unverified = feasible.filter((option) => option.addedDistanceKm == null);
  const recommended = recommendable[0] || null;

  const status: InsertionEvaluation['status'] = recommended
    ? 'feasible'
    : unverified.length > 0
      ? 'unverified'
      : 'infeasible';

  const explanation = recommended
    ? recommended.explanation
    : `No position for order ${ctx.order.orderNumber || ctx.order.id} satisfies the constraints. ${blocked.length} position(s) were rejected.`;

  return {
    status,
    recommended,
    candidates: recommendable.slice(0, 5),
    blockedCount: blocked.length,
    rejectedCodes: [...new Set(blocked.flatMap((option) => option.blockers.map((blocker) => blocker.code)))],
    blockers: recommended ? recommended.blockers : uniqueBlockers(blocked),
    warnings: recommended ? recommended.warnings : uniqueWarnings(feasible.concat(blocked)),
    explanation,
  };
}
