import { KnownTruckCapacity, CapacityViolation } from './assignment-capacity';
import { buildCargoLedger, CargoLedgerResult, CargoLedgerStop } from './cargo-ledger';
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
  /** Routing provider that produced the leg, when the caller knows it. */
  provider?: string | null;
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
  sequence?: number;
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
  /**
   * Stops whose window was already missed before any insertion. Their miss is
   * a pre-existing condition and must not reject every insertion position.
   */
  preExistingMissedKeys?: Set<string>;
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
  plannedDeparture: string | null;
  waitingMin: number;
  serviceMin: number;
  windowStatus: 'met' | 'missed' | 'unverified';
}

export interface InsertionDriverHours {
  status: 'verified' | 'unverified' | 'exceeded';
  /** The model is an internal planning estimate, never a tachograph verdict. */
  methodology: 'eu_561_2006_planning_model';
  drivingMin: number | null;
  elapsedMin: number | null;
  dailyDrivingMin: number[];
  breakMinutes: number;
  dailyRestMinutes: number;
  dailyLimitMin: number;
  dutyDays: number;
}

export interface InsertionOption {
  pickupIndex: number;
  deliveryIndex: number;
  sequence: InsertionSequenceStop[];
  stopOrder: string[];
  /** Concrete stop objects in the proposed order; reused by the caller. */
  orderedStops: InsertionStop[];
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
  /**
   * The cargo ledger of this exact stop sequence. Every blocker of this option
   * is derived from it, so a reported load can always be traced to a segment
   * of the sequence the option actually proposes.
   */
  ledger: CargoLedgerResult;
  driverHours: InsertionDriverHours;
  blockers: InsertionBlocker[];
  warnings: InsertionWarning[];
  explanation: string;
}

export interface InsertionEvaluation {
  status: 'feasible' | 'infeasible' | 'unverified';
  recommended: InsertionOption | null;
  candidates: InsertionOption[];
  /**
   * The single rejected position whose ledger and blockers are reported when no
   * insertion is feasible. Null when a position was recommended.
   */
  rejectedCandidate: InsertionOption | null;
  /** Other rejected positions, each with its own independent verdict. */
  rejectedCandidates: InsertionOption[];
  blockedCount: number;
  /** Codes seen across all rejected positions; a summary, never a verdict. */
  rejectedCodes: string[];
  blockers: InsertionBlocker[];
  warnings: InsertionWarning[];
  explanation: string;
}

const DEFAULT_SERVICE_MIN = 30;
const BREAK_AFTER_DRIVING_MIN = 270;
const BREAK_MIN = 45;
const DAILY_REST_MIN = 11 * 60;
const DAILY_DRIVING_LIMIT_MIN = 9 * 60;
const DEFAULT_DAILY_DRIVING_MIN = DAILY_DRIVING_LIMIT_MIN;
const DEFAULT_EXTENDED_DRIVING_MIN = 10 * 60;
/** EU 561/2006: 13h regular daily duty, 15h when the 10h extension is used. */
const SHIFT_MAX_MIN = 15 * 60;

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

export interface RouteTotalsInternal {
  status: 'verified' | 'unverified';
  distanceKm: number | null;
  drivingMin: number | null;
  legs: Array<{ distanceKm: number; durationMin: number; provider?: string | null } | null>;
}

export function computeRouteTotals(
  stops: InsertionStop[],
  leg: InsertionContext['leg'],
): RouteTotalsInternal {
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
    legs.push({
      distanceKm: Number(resolved.distanceKm),
      durationMin: Number(resolved.durationMin),
      provider: resolved.provider ?? null,
    });
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

export interface ScheduleResult {
  status: 'verified' | 'unverified';
  arrivals: Array<Date | null>;
  departures: Array<Date | null>;
  waiting: number[];
  waitingMin: number;
  breakMin: number;
  dailyRestMin: number;
  totalMin: number | null;
  /** Modelled driving minutes per duty day; index 0 is the departure day. */
  dailyDrivingMin: number[];
  missed: Array<{ index: number; arrival: Date; windowEnd: Date }>;
}

/**
 * EU 561/2006 planning model: at most 9h of driving per duty day (the 10h
 * extension is never assumed), a 45 minute break after 4.5h of continuous
 * driving and 11h of daily rest between duty days.
 *
 * This is an internal planning estimate for the proposed schedule. It is not a
 * tachograph compliance verdict and must never be presented as recorded
 * driver activity.
 */
function schedule(
  stops: InsertionStop[],
  route: RouteTotalsInternal,
  departure: Date | null,
  serviceMin: number,
): ScheduleResult {
  const empty: ScheduleResult = {
    status: 'unverified',
    arrivals: stops.map(() => null),
    departures: stops.map(() => null),
    waiting: stops.map(() => 0),
    waitingMin: 0,
    breakMin: 0,
    dailyRestMin: 0,
    totalMin: null,
    dailyDrivingMin: [],
    missed: [],
  };
  if (!departure || route.status !== 'verified') return empty;

  let current = departure.getTime();
  let dutyStart = current;
  let dayDriving = 0;
  let drivingSinceBreak = 0;
  let waitingMin = 0;
  let breakMin = 0;
  let dailyRestMin = 0;
  const dailyDrivingMin: number[] = [0];
  const arrivals: Array<Date | null> = [];
  const departures: Array<Date | null> = [];
  const waiting: number[] = [];
  const missed: Array<{ index: number; arrival: Date; windowEnd: Date }> = [];

  arrivals.push(new Date(current));
  departures.push(new Date(current));
  waiting.push(0);

  const restDay = () => {
    current += DAILY_REST_MIN * 60000;
    dailyRestMin += DAILY_REST_MIN;
    dutyStart = current;
    dayDriving = 0;
    drivingSinceBreak = 0;
    dailyDrivingMin.push(0);
  };

  for (let index = 1; index < stops.length; index += 1) {
    let remaining = route.legs[index - 1]?.durationMin || 0;
    let guard = 0;
    while (remaining > 0.01 && guard < 60) {
      guard += 1;
      const shiftLeft = SHIFT_MAX_MIN - (current - dutyStart) / 60000;
      const driveLeft = DAILY_DRIVING_LIMIT_MIN - dayDriving;
      if (shiftLeft <= 0.01 || driveLeft <= 0.01) {
        restDay();
        continue;
      }
      const chunk = Math.min(remaining, shiftLeft, driveLeft);
      current += chunk * 60000;
      remaining -= chunk;
      dayDriving += chunk;
      drivingSinceBreak += chunk;
      dailyDrivingMin[dailyDrivingMin.length - 1] = round(dayDriving);
      if (drivingSinceBreak >= BREAK_AFTER_DRIVING_MIN) {
        current += BREAK_MIN * 60000;
        breakMin += BREAK_MIN;
        waitingMin += BREAK_MIN;
        drivingSinceBreak = 0;
      }
    }

    const stop = stops[index];
    const arrival = new Date(current);
    const start = windowStart(stop);
    const wait = start && arrival.getTime() < start.getTime()
      ? (start.getTime() - arrival.getTime()) / 60000
      : 0;
    if (wait > 0) {
      waitingMin += wait;
      current = start!.getTime();
    }
    const arrivalAfterWait = new Date(current);
    const end = windowEnd(stop);
    if (end && arrivalAfterWait.getTime() > end.getTime()) {
      missed.push({ index, arrival: arrivalAfterWait, windowEnd: end });
    }
    const service = Number(stop.serviceDurationMinutes) || serviceMin;
    arrivals.push(arrivalAfterWait);
    departures.push(new Date(current + service * 60000));
    waiting.push(round(wait));
    current += service * 60000;
  }

  return {
    status: 'verified',
    arrivals,
    departures,
    waiting,
    waitingMin: round(waitingMin),
    breakMin,
    dailyRestMin,
    totalMin: round((current - departure.getTime()) / 60000),
    dailyDrivingMin,
    missed,
  };
}

/** Schedule one stop list from a departure time, resolving its road legs. */
export function scheduleForStops(
  stops: InsertionStop[],
  leg: InsertionContext['leg'],
  departure: Date | null,
  serviceMinutes: number = DEFAULT_SERVICE_MIN,
): ScheduleResult & { route: RouteTotalsInternal } {
  const route = computeRouteTotals(stops, leg);
  return { ...schedule(stops, route, departure, serviceMinutes), route };
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
  newKeys: Set<string>,
): InsertionOption {
  const serviceMin = ctx.serviceMinutes || DEFAULT_SERVICE_MIN;
  const route = computeRouteTotals(sequenceStops, ctx.leg);
  const ledger = buildCargoLedger(sequenceStops.map((stop, index) => ledgerStop(stop, index + 1)), ctx.capacity);
  const plan = schedule(sequenceStops, route, ctx.departure, serviceMin);
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
    const key = stopKey(stop, `stop-${miss.index + 1}`);
    const preExisting = ctx.preExistingMissedKeys?.has(key) === true;
    const entry = {
      code: preExisting ? 'PRE_EXISTING_WINDOW_MISS' : 'STOP_WINDOW_MISSED',
      stopKey: key,
      params: {
        city: stop.city,
        arrival: miss.arrival.toISOString(),
        windowEnd: miss.windowEnd.toISOString(),
        delayMin: Math.round((miss.arrival.getTime() - miss.windowEnd.getTime()) / 60000),
        preExisting,
      },
      message: preExisting
        ? `${stop.city || 'Stop ' + (miss.index + 1)} was already outside its window before this insertion; the new stop does not cause the delay.`
        : `Arrival at ${stop.city || 'stop ' + (miss.index + 1)} would be ${miss.arrival.toISOString()}, after the window closes at ${miss.windowEnd.toISOString()}.`,
    };
    if (preExisting) warnings.push({ level: 'warning', ...entry });
    else blockers.push({ level: 'blocking', ...entry });
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
  // A long leg is split into duty days by the schedule below, so total driving
  // time is never a shift violation on its own. Driver-hour compliance against
  // recorded tachograph data remains unverified and is reported by the caller.
  void extendedLimit;

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

  const sequence = sequenceStops.map((stop, index) => {
    const key = stopKey(stop, `position-${index + 1}`);
    const arrival = plan.arrivals[index] || null;
    const end = windowEnd(stop);
    return {
      sequence: index + 1,
      key,
      type: String(stop.type || '').toLowerCase(),
      city: stop.city || null,
      orderId: stop.orderId || null,
      windowStart: windowStart(stop)?.toISOString() || null,
      windowEnd: end?.toISOString() || null,
      plannedArrival: arrival?.toISOString() || null,
      plannedDeparture: plan.departures[index]?.toISOString() || null,
      waitingMin: plan.waiting[index] || 0,
      serviceMin: Number(stop.serviceDurationMinutes) || serviceMin,
      windowStatus: !arrival || !end
        ? 'unverified'
        : arrival.getTime() > end.getTime() ? 'missed' : 'met',
    } as InsertionSequenceStop;
  });

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
  if (plan.dailyRestMin > 0) {
    explanationParts.push(`The schedule needs ${plan.dailyDrivingMin.length} duty day(s) with ${round(plan.dailyRestMin / 60, 1)}h of daily rest.`);
  }
  if (blockers.length) {
    explanationParts.push(`This position is rejected: ${[...new Set(blockers.map((blocker) => blocker.code))].join(', ')}.`);
  } else if (warnings.length) {
    explanationParts.push(`It is feasible with ${warnings.length} warning(s): ${[...new Set(warnings.map((warning) => warning.code))].join(', ')}.`);
  } else {
    explanationParts.push('It satisfies capacity at every stop, the time windows and the modelled driver working-time limits.');
  }

  return {
    pickupIndex,
    deliveryIndex,
    sequence,
    stopOrder: sequenceStops.map((stop, index) => stopKey(stop, `position-${index + 1}`)),
    orderedStops: sequenceStops,
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
    ledger,
    driverHours: {
      status: drivingMin == null ? 'unverified' : 'verified',
      methodology: 'eu_561_2006_planning_model',
      drivingMin,
      elapsedMin: plan.totalMin,
      dailyDrivingMin: plan.dailyDrivingMin,
      breakMinutes: plan.breakMin,
      dailyRestMinutes: plan.dailyRestMin,
      dailyLimitMin: dailyLimit,
      dutyDays: plan.dailyDrivingMin.length,
    },
    blockers,
    warnings,
    explanation: explanationParts.join(' '),
  };
}

/**
 * Rank rejected positions deterministically: fewest independent blocking
 * reasons first, then the cheapest net addition, then the earliest position,
 * then the stop order itself. Exactly one of them is reported as the rejected
 * candidate, so its blockers can never be borrowed from another sequence.
 */
function rankRejected(options: InsertionOption[]): InsertionOption[] {
  const distinctCodes = (option: InsertionOption) => new Set(option.blockers.map((blocker) => blocker.code)).size;
  return options.slice().sort((a, b) => {
    const byCodes = distinctCodes(a) - distinctCodes(b);
    if (byCodes !== 0) return byCodes;
    const aKm = a.addedDistanceKm ?? Number.POSITIVE_INFINITY;
    const bKm = b.addedDistanceKm ?? Number.POSITIVE_INFINITY;
    if (aKm !== bKm) return aKm - bKm;
    if (a.pickupIndex !== b.pickupIndex) return a.pickupIndex - b.pickupIndex;
    if (a.deliveryIndex !== b.deliveryIndex) return a.deliveryIndex - b.deliveryIndex;
    return a.stopOrder.join('|').localeCompare(b.stopOrder.join('|'));
  });
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
      rejectedCandidate: null,
      rejectedCandidates: [],
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

  const baselineRoute = computeRouteTotals(existing, ctx.leg);
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
  const newKeys = new Set(additions.map((stop, index) => stopKey(stop, `new-${index}`)));

  const options: InsertionOption[] = [];
  for (let p = 0; p <= existing.length; p += 1) {
    for (let d = p + 1 + middle.length; d <= existing.length + 1 + middle.length; d += 1) {
      const sequence = existing.slice();
      sequence.splice(p, 0, pickup, ...middle);
      sequence.splice(d, 0, delivery);
      options.push(evaluateCandidate(sequence, p, d, ctx, baseline, newKeys));
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
  const rejectedRanked = rankRejected(blocked);
  const rejectedCandidate = recommended ? null : rejectedRanked[0] || null;
  // When every position is capacity-feasible but no route is verified, no
  // position is rejected; its warnings still describe one single sequence.
  const unverifiedBest = recommended || rejectedCandidate ? null : rankRejected(unverified)[0] || null;

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
    rejectedCandidate,
    rejectedCandidates: recommended ? [] : rejectedRanked,
    blockedCount: blocked.length,
    // A summary of what was seen, kept for the count chip. The verdict below is
    // never assembled from these: it belongs to one sequence only.
    rejectedCodes: [...new Set(blocked.flatMap((option) => option.blockers.map((blocker) => blocker.code)))],
    blockers: recommended ? recommended.blockers : rejectedCandidate?.blockers || [],
    warnings: recommended
      ? recommended.warnings
      : rejectedCandidate?.warnings || unverifiedBest?.warnings || [],
    explanation,
  };
}
