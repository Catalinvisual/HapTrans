// Fleet-level planning KPIs, computed once on the server.
//
// The board used to re-derive its headline numbers in React from whatever
// happened to be loaded in the browser. That produced numbers that disagreed
// with the calculation results table, and it invented totals (a missing
// capacity silently becoming 0 kg utilisation) instead of reporting that the
// figure cannot be verified.
//
// Every KPI therefore carries its provenance:
//   recorded   — a persisted value exists (cost rows, tachograph, actuals)
//   estimated  — derived from the routing/cost engines' plan
//   unverified — the inputs are missing; the value is null, never a guess
//
// The module is pure so the arithmetic is unit-tested without a database.

export type KpiProvenance = 'recorded' | 'estimated' | 'unverified';

export interface BoardKpi {
  key: string;
  value: number | null;
  unit: string;
  provenance: KpiProvenance;
  /** Currency for money KPIs, null otherwise. */
  currency?: string | null;
}

export interface BoardKpis {
  items: BoardKpi[];
  byKey: Record<string, BoardKpi>;
  currency: string | null;
}

const PLANNING_STATUSES = ['planning', 'planned', 'assigned'];
const CLOSED_STATUSES = ['completed', 'closed', 'cancelled', 'canceled'];

const num = (value: any): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export interface BoardKpiInput {
  trips?: any[];
  orders?: any[];
  resources?: any[];
  conflicts?: any[];
  hosSummary?: Record<string, any> | null;
  totalUnplanned?: number | null;
  now?: Date;
}

/**
 * Revenue for a trip: the sum of its orders' prices. A trip without any priced
 * order has no revenue, which is different from a EUR 0 revenue.
 */
function tripRevenue(trip: any): { value: number | null; currency: string | null } {
  const orders = (trip?.orders || []).filter(Boolean);
  let sum = 0;
  let priced = 0;
  const currencies = new Set<string>();
  for (const order of orders) {
    const price = num(order?.price);
    if (price === null) continue;
    sum += price;
    priced += 1;
    if (order?.currency) currencies.add(String(order.currency).toUpperCase());
  }
  if (!priced) return { value: null, currency: null };
  return {
    value: round(sum, 2),
    currency: currencies.size === 1 ? [...currencies][0] : currencies.size === 0 ? 'EUR' : null,
  };
}

/**
 * Trip cost, from the same sources the Calculation Results table uses:
 * recorded TripCost rows first, then the CostEngine estimate. A trip with a
 * missing/unavailable toll never contributes an under-stated total.
 */
function tripCost(trip: any): { value: number | null; provenance: KpiProvenance; currency: string | null } {
  const costs = (trip?.costs || []).filter(Boolean);
  let recorded = 0;
  let recordedAny = false;
  for (const cost of costs) {
    const amount = num(cost?.amount);
    if (amount === null) continue;
    recorded += amount;
    recordedAny = true;
  }
  const tollStatus = String(trip?.tollStatus || '').toLowerCase();
  const tollDisabled = ['not_calculated', 'unavailable', 'failed', 'error'].includes(tollStatus);
  const breakdown = trip?.estimatedCostBreakdown;
  const tollAvailable = breakdown ? breakdown.tollCostAvailable !== false : !tollDisabled;

  if (recordedAny) return { value: round(recorded, 2), provenance: 'recorded', currency: null };

  const estimated = num(trip?.estimatedCost);
  if (estimated !== null && tollAvailable) {
    return { value: round(estimated, 2), provenance: 'estimated', currency: null };
  }
  if (breakdown && typeof breakdown === 'object' && tollAvailable) {
    const fuel = num(breakdown.fuelCost) ?? 0;
    const toll = num(breakdown.tollCost) ?? 0;
    const driver = num(breakdown.driverCost) ?? 0;
    const maintenance = num(breakdown.maintenanceCost) ?? 0;
    const fixed = num(breakdown.fixedCost) ?? 0;
    const manual = num(breakdown.manualCost) ?? 0;
    const total = fuel + toll + driver + maintenance + fixed + manual;
    if (total > 0) return { value: round(total, 2), provenance: 'estimated', currency: null };
  }
  return { value: null, provenance: 'unverified', currency: null };
}

/** Loaded weight of a trip, from its cargo items or the legacy order fields. */
function tripWeight(trip: any): number {
  let weight = 0;
  for (const order of trip?.orders || []) {
    if (!order) continue;
    if (Array.isArray(order.cargoItems) && order.cargoItems.length > 0) {
      for (const item of order.cargoItems) weight += Number(item?.weightKg) || 0;
    } else {
      weight += Number(order.weightKg || order.totalWeightKg) || 0;
    }
  }
  return weight;
}

function tripCapacity(trip: any, resourcesById: Record<string, any>): number | null {
  const truckId = trip?.truck?.id || trip?.truckId;
  const resource: any = truckId ? resourcesById[String(truckId)] : null;
  const candidates = [
    resource?.capacity?.maxWeightKg,
    resource?.maxWeightKg,
    resource?.payloadCapacity,
    trip?.truck?.maxWeightKg,
    trip?.truck?.payloadCapacity,
  ];
  for (const candidate of candidates) {
    const value = num(candidate);
    if (value !== null && value > 0) return value;
  }
  return null;
}

function isActive(trip: any): boolean {
  const status = String(trip?.status || '').toLowerCase();
  return status !== '' && !CLOSED_STATUSES.includes(status);
}

function isDelayed(trip: any, now: Date): boolean {
  if (String(trip?.status || '').toLowerCase() === 'delayed') return true;
  if (trip?.isDelayed) return true;
  const arrival = trip?.plannedArrival || trip?.actualArrival;
  if (!arrival) return false;
  const arrivalMs = new Date(arrival).getTime();
  if (!Number.isFinite(arrivalMs)) return false;
  const completed = ['completed', 'closed', 'cancelled', 'canceled'].includes(String(trip?.status || '').toLowerCase());
  return !completed && arrivalMs < now.getTime();
}

/**
 * Build the planning board KPIs.
 *
 * Money KPIs are only aggregated when every contributing trip shares one
 * currency; a mixed fleet reports `null` and `currency: null` rather than
 * adding PLN to EUR.
 */
export function buildBoardKpis(input: BoardKpiInput): BoardKpis {
  const trips = (input.trips || []).filter(Boolean);
  const resources = input.resources || [];
  const conflicts = input.conflicts || [];
  const now = input.now || new Date();
  const resourcesById = Object.fromEntries(resources.map((r: any) => [String(r.id), r]));

  const activeTrips = trips.filter(isActive);
  const plannedTrips = trips.filter((trip) => PLANNING_STATUSES.includes(String(trip?.status || '').toLowerCase()));

  // ── Distance ──────────────────────────────────────────────────────────────
  let distance = 0;
  let distanceKnown = 0;
  let emptyKm = 0;
  let emptyKnown = 0;
  for (const trip of activeTrips) {
    const km = num(trip?.distanceKm);
    if (km !== null && km > 0) {
      distance += km;
      distanceKnown += 1;
    }
    const empty = num(trip?.emptyKm) ?? num(trip?.deadheadKm) ?? num(trip?.emptyKilometers);
    if (empty !== null && empty >= 0) {
      emptyKm += empty;
      emptyKnown += 1;
    }
  }

  // ── Utilisation ───────────────────────────────────────────────────────────
  const utilisationSamples: number[] = [];
  let utilisationUnknown = 0;
  for (const trip of activeTrips) {
    const weight = tripWeight(trip);
    if (weight <= 0) continue;
    const capacity = tripCapacity(trip, resourcesById);
    if (capacity === null) {
      utilisationUnknown += 1;
      continue;
    }
    utilisationSamples.push((weight / capacity) * 100);
  }
  const utilisation = utilisationSamples.length
    ? round(utilisationSamples.reduce((a, b) => a + b, 0) / utilisationSamples.length, 0)
    : null;

  // ── Money ─────────────────────────────────────────────────────────────────
  const currencies = new Set<string>();
  // A trip whose own orders mix currencies has no single revenue figure. That
  // is different from "no currency recorded" and must not fall back to EUR.
  let mixedCurrency = false;
  let revenue = 0;
  let revenueKnown = 0;
  let cost = 0;
  let costKnown = 0;
  let costRecorded = 0;
  let costEstimated = 0;
  for (const trip of activeTrips) {
    const tripRev = tripRevenue(trip);
    if (tripRev.value !== null) {
      revenue += tripRev.value;
      revenueKnown += 1;
      if (tripRev.currency) currencies.add(tripRev.currency);
      else mixedCurrency = true;
    }
    const tripCostValue = tripCost(trip);
    if (tripCostValue.value !== null) {
      cost += tripCostValue.value;
      costKnown += 1;
      if (tripCostValue.provenance === 'recorded') costRecorded += 1;
      else if (tripCostValue.provenance === 'estimated') costEstimated += 1;
    }
  }
  const currency = mixedCurrency || currencies.size > 1
    ? null
    : currencies.size === 1
      ? [...currencies][0]
      : 'EUR';
  const moneySplittable = currency !== null;
  const margin = moneySplittable && revenueKnown > 0 && costKnown > 0 ? round(revenue - cost, 2) : null;
  const costPerKm = moneySplittable && costKnown > 0 && distance > 0 ? round(cost / distance, 2) : null;

  // ── Driver hours ──────────────────────────────────────────────────────────
  const hos = input.hosSummary || {};
  let driversAtRisk = 0;
  let driversOver = 0;
  let driversTracked = 0;
  for (const summary of Object.values(hos) as any[]) {
    if (!summary) continue;
    driversTracked += 1;
    const remaining = num(summary.remaining);
    if (summary.over) driversOver += 1;
    if (remaining !== null && remaining < 8) driversAtRisk += 1;
  }

  // ── Punctuality ───────────────────────────────────────────────────────────
  const withArrival = trips.filter((trip) => {
    const arrival = trip?.plannedArrival;
    return arrival && Number.isFinite(new Date(arrival).getTime());
  });
  const delayed = trips.filter((trip) => isDelayed(trip, now));
  const onTime = withArrival.length
    ? round(((withArrival.length - withArrival.filter((trip) => isDelayed(trip, now)).length) / withArrival.length) * 100, 0)
    : null;

  const blocking = conflicts.filter((c: any) => String(c?.level) === 'blocking').length;
  const warnings = conflicts.filter((c: any) => String(c?.level) === 'warning').length;
  const unplanned = num(input.totalUnplanned) ?? (input.orders || []).length;

  const items: BoardKpi[] = [
    {
      key: 'plannedTrips',
      value: plannedTrips.length,
      unit: 'trips',
      provenance: 'recorded',
    },
    {
      key: 'unplannedOrders',
      value: unplanned,
      unit: 'orders',
      provenance: 'recorded',
    },
    {
      key: 'conflicts',
      value: blocking,
      unit: 'conflicts',
      provenance: 'recorded',
    },
    {
      key: 'warnings',
      value: warnings,
      unit: 'conflicts',
      provenance: 'recorded',
    },
    {
      key: 'distanceKm',
      value: distanceKnown ? round(distance, 0) : null,
      unit: 'km',
      provenance: distanceKnown ? 'estimated' : 'unverified',
    },
    {
      key: 'emptyKmPct',
      value: distanceKnown && emptyKnown && distance > 0 ? round((emptyKm / (distance + emptyKm)) * 100, 1) : null,
      unit: '%',
      provenance: distanceKnown && emptyKnown ? 'estimated' : 'unverified',
    },
    {
      key: 'utilisationPct',
      value: utilisation,
      unit: '%',
      provenance: utilisation === null ? 'unverified' : utilisationUnknown > 0 ? 'estimated' : 'estimated',
    },
    {
      key: 'costPerKm',
      value: costPerKm,
      unit: 'currency/km',
      provenance: costPerKm === null ? 'unverified' : costRecorded > 0 && costEstimated === 0 ? 'recorded' : 'estimated',
      currency,
    },
    {
      key: 'margin',
      value: margin,
      unit: 'currency',
      provenance: margin === null ? 'unverified' : costEstimated > 0 ? 'estimated' : 'recorded',
      currency,
    },
    {
      key: 'driversAtRisk',
      value: driversTracked ? driversAtRisk : null,
      unit: 'drivers',
      provenance: driversTracked ? 'recorded' : 'unverified',
    },
    {
      key: 'driversOver',
      value: driversTracked ? driversOver : null,
      unit: 'drivers',
      provenance: driversTracked ? 'recorded' : 'unverified',
    },
    {
      key: 'onTimePct',
      value: onTime,
      unit: '%',
      provenance: onTime === null ? 'unverified' : 'estimated',
    },
    {
      key: 'delayedTrips',
      value: delayed.length,
      unit: 'trips',
      provenance: 'recorded',
    },
  ];

  return {
    items,
    byKey: Object.fromEntries(items.map((item) => [item.key, item])),
    currency,
  };
}
