import { capacityViolations, KnownTruckCapacity } from './assignment-capacity';

export interface CargoDimensions {
  pallets: number;
  weightKg: number;
  volumeCbm: number;
  loadingMeters: number;
}

export interface CargoLedgerTask {
  id?: string;
  type?: string | null;
  status?: string | null;
  quantity?: number | null;
  pallets?: number | null;
  weightKg?: number | null;
  volumeCbm?: number | null;
  loadingMeters?: number | null;
  issueReason?: string | null;
  order?: { id?: string; orderNumber?: string } | null;
  orderId?: string | null;
}

export interface CargoLedgerStop {
  id?: string;
  sequence?: number;
  type?: string | null;
  city?: string | null;
  companyName?: string | null;
  status?: string | null;
  tasks?: CargoLedgerTask[];
}

export type CargoLedgerOperation = 'load' | 'unload' | 'rejected' | 'none';

export interface CargoLedgerIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  stopId?: string;
  taskId?: string;
  orderId?: string;
  field?: string;
  actual?: number;
  expected?: number;
}

export interface CargoLedgerRow {
  stopId?: string;
  sequence: number;
  stopType: string;
  city: string;
  companyName: string;
  orderId?: string;
  orderNumber?: string;
  operation: CargoLedgerOperation;
  taskStatus: string;
  projected: boolean;
  cargoBefore: CargoDimensions;
  change: CargoDimensions;
  cargoAfter: CargoDimensions;
}

export interface CargoLedgerResult {
  rows: CargoLedgerRow[];
  totals: {
    loaded: CargoDimensions;
    delivered: CargoDimensions;
    rejected: CargoDimensions;
    remaining: CargoDimensions;
  };
  peak: CargoDimensions;
  capacity: KnownTruckCapacity;
  issues: CargoLedgerIssue[];
  status: 'verified' | 'unverified' | 'invalid';
}

const ZERO: CargoDimensions = { pallets: 0, weightKg: 0, volumeCbm: 0, loadingMeters: 0 };
const EPSILON = 0.0001;

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round = (value: number): number => Math.round(value * 100) / 100;

const roundDimensions = (value: CargoDimensions): CargoDimensions => ({
  pallets: round(value.pallets),
  weightKg: round(value.weightKg),
  volumeCbm: round(value.volumeCbm),
  loadingMeters: round(value.loadingMeters),
});

const add = (left: CargoDimensions, right: CargoDimensions): CargoDimensions => ({
  pallets: left.pallets + right.pallets,
  weightKg: left.weightKg + right.weightKg,
  volumeCbm: left.volumeCbm + right.volumeCbm,
  loadingMeters: left.loadingMeters + right.loadingMeters,
});

const subtract = (left: CargoDimensions, right: CargoDimensions): CargoDimensions => ({
  pallets: left.pallets - right.pallets,
  weightKg: left.weightKg - right.weightKg,
  volumeCbm: left.volumeCbm - right.volumeCbm,
  loadingMeters: left.loadingMeters - right.loadingMeters,
});

const isNegative = (value: CargoDimensions): boolean =>
  value.pallets < -EPSILON ||
  value.weightKg < -EPSILON ||
  value.volumeCbm < -EPSILON ||
  value.loadingMeters < -EPSILON;

const maxDimensions = (left: CargoDimensions, right: CargoDimensions): CargoDimensions => ({
  pallets: Math.max(left.pallets, right.pallets),
  weightKg: Math.max(left.weightKg, right.weightKg),
  volumeCbm: Math.max(left.volumeCbm, right.volumeCbm),
  loadingMeters: Math.max(left.loadingMeters, right.loadingMeters),
});

function isRejected(task: CargoLedgerTask): boolean {
  const reason = String(task.issueReason || '').toLowerCase();
  return String(task.status || '').toLowerCase() === 'problem' ||
    reason.includes('reject') ||
    reason.includes('refus') ||
    reason.includes('absent');
}

function operationFor(task: CargoLedgerTask): CargoLedgerOperation {
  if (isRejected(task)) return 'rejected';
  const type = String(task.type || '').toLowerCase();
  if (type === 'load' || type === 'pickup') return 'load';
  if (type === 'unload' || type === 'delivery' || type === 'dropoff') return 'unload';
  return 'none';
}

function taskDimensions(task: CargoLedgerTask): CargoDimensions {
  const unit = String((task as any).unit || '').toLowerCase();
  const pallets = task.pallets != null
    ? num(task.pallets)
    : unit === 'pallet' ? num(task.quantity) : 0;
  return {
    pallets,
    weightKg: num(task.weightKg),
    volumeCbm: num(task.volumeCbm),
    loadingMeters: num(task.loadingMeters),
  };
}

/**
 * Build a cargo ledger from the persisted stop/task projection.
 *
 * The same calculation is used by the API and tests. It intentionally keeps
 * unknown volume/LDM as zero rather than inventing values, and reports that
 * those dimensions are unverified.
 */
export function buildCargoLedger(
  stops: CargoLedgerStop[],
  capacity: KnownTruckCapacity = {
    maxWeightKg: null,
    maxLdm: null,
    maxVolumeCbm: null,
    maxPallets: null,
  },
): CargoLedgerResult {
  const orderedStops = (stops || [])
    .slice()
    .sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));

  const rows: CargoLedgerRow[] = [];
  const issues: CargoLedgerIssue[] = [];
  const loaded = { ...ZERO };
  const delivered = { ...ZERO };
  const rejected = { ...ZERO };
  let onBoard = { ...ZERO };
  let peak = { ...ZERO };
  let hasVolumeData = false;
  let hasLdmData = false;
  let hasCargo = false;

  const pushIssue = (issue: CargoLedgerIssue) => issues.push(issue);

  for (const stop of orderedStops) {
    const tasks = (stop.tasks || []).slice();
    for (const task of tasks) {
      const operation = operationFor(task);
      const dimensions = taskDimensions(task);
      const before = { ...onBoard };
      let change = { ...ZERO };
      let after = { ...onBoard };

      if (operation === 'load') {
        change = dimensions;
        after = add(onBoard, dimensions);
        loaded.pallets += dimensions.pallets;
        loaded.weightKg += dimensions.weightKg;
        loaded.volumeCbm += dimensions.volumeCbm;
        loaded.loadingMeters += dimensions.loadingMeters;
        hasCargo = hasCargo || dimensions.pallets > 0 || dimensions.weightKg > 0;
        hasVolumeData = hasVolumeData || dimensions.volumeCbm > 0;
        hasLdmData = hasLdmData || dimensions.loadingMeters > 0;
      } else if (operation === 'unload') {
        change = {
          pallets: -dimensions.pallets,
          weightKg: -dimensions.weightKg,
          volumeCbm: -dimensions.volumeCbm,
          loadingMeters: -dimensions.loadingMeters,
        };
        after = add(onBoard, change);
        delivered.pallets += dimensions.pallets;
        delivered.weightKg += dimensions.weightKg;
        delivered.volumeCbm += dimensions.volumeCbm;
        delivered.loadingMeters += dimensions.loadingMeters;
        if (isNegative(after)) {
          const fields: Array<keyof CargoDimensions> = ['pallets', 'weightKg', 'volumeCbm', 'loadingMeters'];
          for (const field of fields) {
            if (after[field] < -EPSILON) {
              pushIssue({
                code: 'UNLOAD_EXCEEDS_LOAD',
                severity: 'error',
                stopId: stop.id,
                taskId: task.id,
                orderId: task.order?.id || task.orderId || undefined,
                field,
                actual: roundDimensions(before)[field],
                expected: roundDimensions(dimensions)[field],
                message: `Stop ${stop.sequence || '?'} unloads more ${field} than is on board.`,
              });
            }
          }
        }
      } else if (operation === 'rejected') {
        rejected.pallets += dimensions.pallets;
        rejected.weightKg += dimensions.weightKg;
        rejected.volumeCbm += dimensions.volumeCbm;
        rejected.loadingMeters += dimensions.loadingMeters;
        pushIssue({
          code: 'CARGO_REJECTED_OR_PROBLEM',
          severity: 'warning',
          stopId: stop.id,
          taskId: task.id,
          orderId: task.order?.id || task.orderId || undefined,
          message: `Stop ${stop.sequence || '?'} has a rejected/problem task; cargo was not moved.`,
        });
      } else {
        change = { ...ZERO };
        after = { ...onBoard };
      }

      if (isNegative(after) && operation !== 'unload') {
        pushIssue({
          code: 'NEGATIVE_CARGO',
          severity: 'error',
          stopId: stop.id,
          taskId: task.id,
          orderId: task.order?.id || task.orderId || undefined,
          message: `Cargo on board became negative at stop ${stop.sequence || '?'}.`,
        });
      }

      if (operation !== 'none') {
        rows.push({
          stopId: stop.id,
          sequence: Number(stop.sequence) || rows.length + 1,
          stopType: String(stop.type || ''),
          city: stop.city || '',
          companyName: stop.companyName || '',
          orderId: task.order?.id || task.orderId || undefined,
          orderNumber: task.order?.orderNumber || undefined,
          operation,
          taskStatus: String(task.status || 'pending'),
          projected: String(task.status || 'pending').toLowerCase() !== 'completed',
          cargoBefore: roundDimensions(before),
          change: roundDimensions(change),
          cargoAfter: roundDimensions(after),
        });
      }

      onBoard = after;
      peak = maxDimensions(peak, onBoard);
    }
  }

  if (hasCargo && !hasVolumeData) {
    pushIssue({
      code: 'CARGO_VOLUME_UNVERIFIED',
      severity: 'warning',
      field: 'volumeCbm',
      message: 'Volume is not recorded on every load; segment volume is unverified.',
    });
  }
  if (hasCargo && !hasLdmData) {
    pushIssue({
      code: 'CARGO_LDM_UNVERIFIED',
      severity: 'warning',
      field: 'loadingMeters',
      message: 'Loading meters are not recorded on every load; segment LDM is unverified.',
    });
  }

  for (const violation of capacityViolations(
    { weight: peak.weightKg, ldm: peak.loadingMeters, volume: peak.volumeCbm, pallets: peak.pallets },
    capacity,
  )) {
    pushIssue({
      code: 'SEGMENT_CAPACITY_EXCEEDED',
      severity: 'error',
      field: violation.field,
      actual: violation.actual,
      expected: violation.expected,
      message: `A route segment exceeds ${violation.field}: ${violation.actual} > ${violation.expected}.`,
    });
  }

  const hasError = issues.some((issue) => issue.severity === 'error');
  const hasUnverified = issues.some((issue) => issue.code === 'CARGO_VOLUME_UNVERIFIED' || issue.code === 'CARGO_LDM_UNVERIFIED');
  return {
    rows,
    totals: {
      loaded: roundDimensions(loaded),
      delivered: roundDimensions(delivered),
      rejected: roundDimensions(rejected),
      remaining: roundDimensions(onBoard),
    },
    peak: roundDimensions(peak),
    capacity,
    issues,
    status: hasError ? 'invalid' : hasUnverified ? 'unverified' : 'verified',
  };
}
