import { CargoTotals, CapacityViolation, KnownTruckCapacity, capacityViolations } from './assignment-capacity';
import { buildCargoLedger, CargoLedgerResult, CargoLedgerStop } from './cargo-ledger';

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

/** Cargo totals for one Order. Non-pallet quantities never become pallets. */
export function cargoForOrder(order: any): CargoTotals {
  const items: any[] = Array.isArray(order?.cargoItems) ? order.cargoItems : [];
  if (items.length > 0) {
    return items.reduce<CargoTotals>((sum, item: any) => {
      sum.weight += num(item.weightKg);
      sum.ldm += num(item.ldm);
      sum.volume += num(item.volumeCbm);
      if (String(item.unit || 'pallet').trim().toLowerCase() === 'pallet') {
        sum.pallets += num(item.quantity);
      }
      return sum;
    }, { weight: 0, ldm: 0, volume: 0, pallets: 0 });
  }
  return {
    weight: num(order?.weightKg ?? order?.totalWeightKg),
    ldm: num(order?.loadingMeters ?? order?.ldm),
    volume: num(order?.volumeCbm ?? order?.totalVolumeCbm),
    pallets: num(order?.pallets ?? order?.totalPallets),
  };
}

function isLoadStop(stop: any): boolean {
  return ['pickup', 'load'].includes(String(stop?.type || '').toLowerCase());
}

function isUnloadStop(stop: any): boolean {
  return ['delivery', 'dropoff', 'unload'].includes(String(stop?.type || '').toLowerCase());
}

function stopWindowEnd(stop: any): Date | null {
  if (stop?.timeWindowMax) {
    const value = new Date(stop.timeWindowMax);
    if (!Number.isNaN(value.getTime())) return value;
  }
  if (stop?.dateFrom) {
    const value = new Date(`${stop.dateFrom}T${stop.timeUntil || '23:59'}:00`);
    if (!Number.isNaN(value.getTime())) return value;
  }
  return null;
}

function syntheticTask(taskType: 'load' | 'unload', order: any, cargo: CargoTotals) {
  return {
    id: `proposed-${order.id}-${taskType}`,
    type: taskType,
    status: 'pending',
    pallets: cargo.pallets,
    quantity: cargo.pallets,
    weightKg: cargo.weight,
    volumeCbm: cargo.volume,
    loadingMeters: cargo.ldm,
    order: { id: order.id, orderNumber: order.orderNumber },
  };
}

/**
 * The proposed stop list is the existing route followed by the new Order's
 * stops. Appending is explicit: the dispatcher requested consolidation, and a
 * future drag-to-position action can pass a different insertion. The returned
 * sequence is authoritative for the segment and route calculations.
 */
export function buildProposedStops(existingStops: any[], newOrders: any[]): CargoLedgerStop[] {
  const existing = (existingStops || [])
    .slice()
    .sort((a, b) => num(a.sequence) - num(b.sequence))
    .map((stop, index) => ({ ...stop, sequence: index + 1, tasks: stop.tasks || [] }));

  const additions: CargoLedgerStop[] = [];
  for (const order of newOrders || []) {
    const cargo = cargoForOrder(order);
    // Pickup before delivery is the dependency the ledger enforces. Order
    // stops can be stored in any sequence (a delivery row is sometimes created
    // first), so sorting by stored sequence alone appended an unload before
    // its load and produced UNLOAD_EXCEEDS_LOAD on the inserted stop.
    const rank = (stop: any) => (isLoadStop(stop) ? 0 : isUnloadStop(stop) ? 1 : 2);
    const orderStops = (order.stops || [])
      .slice()
      .sort((a: any, b: any) => rank(a) - rank(b) || num(a.sequence) - num(b.sequence));
    const firstLoadIndex = orderStops.findIndex((stop: any) => isLoadStop(stop));
    const lastUnloadIndex = orderStops.map((stop: any) => isUnloadStop(stop)).lastIndexOf(true);
    for (const [index, stop] of orderStops.entries()) {
      const load = isLoadStop(stop);
      const unload = isUnloadStop(stop);
      if (!load && !unload) continue;
      // OrderStop has no per-stop cargo split. Put the full load on the first
      // pickup and the full unload on the last delivery, never the full order
      // on every stop: that would double-count a multi-stop order.
      const carriesCargo = load ? index === firstLoadIndex : index === lastUnloadIndex;
      const cargoAtStop = carriesCargo ? cargo : { weight: 0, ldm: 0, volume: 0, pallets: 0 };
      additions.push({
        id: stop.id || `proposed-stop-${order.id}-${additions.length}`,
        sequence: existing.length + additions.length + 1,
        type: load ? 'pickup' : 'delivery',
        city: stop.city || null,
        companyName: stop.companyName || null,
        latitude: stop.latitude,
        longitude: stop.longitude,
        orderId: order.id,
        tasks: [syntheticTask(load ? 'load' : 'unload', order, cargoAtStop)],
      } as CargoLedgerStop);
    }
  }
  return [...existing, ...additions];
}

/**
 * Legacy trips can have stops but no StopTask rows. Only in that case we add
 * one load at the first pickup and one unload at the last delivery, using the
 * assigned Orders' actual cargo. Existing task data is never overridden.
 */
export function prepareLedgerStops(existingStops: any[], existingOrders: any[]): CargoLedgerStop[] {
  const stops = (existingStops || []).map((stop) => ({ ...stop, tasks: stop.tasks || [] }));
  const hasMovement = stops.some((stop) => (stop.tasks || []).some((task: any) => isLoadStop(task) || isUnloadStop(task)));
  if (hasMovement || stops.length === 0) return stops;
  const totals = (existingOrders || []).reduce((sum, order) => {
    const cargo = cargoForOrder(order);
    return {
      weight: sum.weight + cargo.weight,
      ldm: sum.ldm + cargo.ldm,
      volume: sum.volume + cargo.volume,
      pallets: sum.pallets + cargo.pallets,
    };
  }, { weight: 0, ldm: 0, volume: 0, pallets: 0 });
  if (totals.weight + totals.pallets + totals.volume + totals.ldm <= 0) return stops;
  const firstPickup = stops.findIndex((stop) => isLoadStop(stop));
  const lastDelivery = stops.map((stop) => isUnloadStop(stop)).lastIndexOf(true);
  return stops.map((stop, index) => {
    if (index === firstPickup) {
      return { ...stop, tasks: [{ id: `legacy-load-${stop.id || index}`, type: 'load', status: 'pending', pallets: totals.pallets, weightKg: totals.weight, volumeCbm: totals.volume, loadingMeters: totals.ldm }] };
    }
    if (index === lastDelivery) {
      return { ...stop, tasks: [{ id: `legacy-unload-${stop.id || index}`, type: 'unload', status: 'pending', pallets: totals.pallets, weightKg: totals.weight, volumeCbm: totals.volume, loadingMeters: totals.ldm }] };
    }
    return stop;
  });
}

export interface ConsolidationCapacityResult {
  before: CargoLedgerResult;
  after: CargoLedgerResult;
  proposedStops: CargoLedgerStop[];
  violations: CapacityViolation[];
  newStopIds: Set<string>;
  duplicateTaskKeys: string[];
}

function capacityResult(
  ledgerStops: CargoLedgerStop[],
  proposedStops: CargoLedgerStop[],
  capacity: KnownTruckCapacity,
): ConsolidationCapacityResult {
  const before = buildCargoLedger(ledgerStops, capacity);
  const after = buildCargoLedger(proposedStops, capacity);
  const existingIds = new Set(ledgerStops.map((stop) => String(stop.id)));
  const newStopIds = new Set<string>(
    proposedStops
      .filter((stop) => !existingIds.has(String(stop.id)))
      .map((stop) => String(stop.id)),
  );
  const seenTasks = new Set<string>();
  const duplicateTaskKeys: string[] = [];
  for (const stop of proposedStops) {
    for (const task of stop.tasks || []) {
      const orderId = String(task.order?.id || task.orderId || '');
      const type = String(task.type || '').toLowerCase();
      if (!orderId || !['load', 'unload', 'pickup', 'delivery', 'dropoff'].includes(type)) continue;
      const key = `${String(stop.id || stop.sequence)}|${orderId}|${type}`;
      if (seenTasks.has(key)) duplicateTaskKeys.push(key);
      seenTasks.add(key);
    }
  }
  const violations = capacityViolations(
    { weight: after.peak.weightKg, ldm: after.peak.loadingMeters, volume: after.peak.volumeCbm, pallets: after.peak.pallets },
    capacity,
  );
  return { before, after, proposedStops, violations, newStopIds, duplicateTaskKeys };
}

/**
 * Capacity is checked on the cargo actually on board after every stop, not on
 * the sum of every Order ever assigned to the trip. This is what allows cargo
 * unloaded before a later pickup to free capacity correctly.
 */
export function consolidationCapacity(
  existingStops: any[],
  existingOrders: any[],
  newOrders: any[],
  capacity: KnownTruckCapacity,
): ConsolidationCapacityResult {
  const ledgerStops = prepareLedgerStops(existingStops, existingOrders);
  return capacityResult(ledgerStops, buildProposedStops(ledgerStops, newOrders), capacity);
}

/**
 * Capacity for an already-decided stop sequence (the best insertion position).
 * The sequence is authoritative and is never re-ordered here.
 */
export function consolidationCapacityForSequence(
  existingStops: any[],
  existingOrders: any[],
  proposedStops: CargoLedgerStop[],
  capacity: KnownTruckCapacity,
): ConsolidationCapacityResult {
  const ledgerStops = prepareLedgerStops(existingStops, existingOrders);
  return capacityResult(ledgerStops, proposedStops, capacity);
}

export interface RouteTotals {
  status: 'verified' | 'unverified';
  distanceKm: number | null;
  durationMin: number | null;
  provider: string | null;
  legDurationsMin: number[];
}

/** The additional route is the proposed total minus the existing route total. */
export function incrementalRoute(baseline: RouteTotals, proposed: RouteTotals): { addedDistanceKm: number | null; addedDurationMin: number | null } {
  if (baseline.status !== 'verified' || proposed.status !== 'verified') {
    return { addedDistanceKm: null, addedDurationMin: null };
  }
  return {
    addedDistanceKm: round(num(proposed.distanceKm) - num(baseline.distanceKm)),
    addedDurationMin: round(num(proposed.durationMin) - num(baseline.durationMin)),
  };
}

/** A stop window is missed only when the actual arrival is after its end. */
export function windowRisk(windowEnd: Date | null, estimatedArrival: Date | null): boolean {
  return Boolean(windowEnd && estimatedArrival && estimatedArrival.getTime() > windowEnd.getTime());
}

export function stopWindowEndDate(stop: any): Date | null {
  return stopWindowEnd(stop);
}
export function stopWindow(stop: any): Date | null {
  return stopWindowEnd(stop);
}