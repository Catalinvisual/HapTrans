// Canonical four-state verdict for a consolidation proposal.
//
// The backend is the only place that decides whether a proposal is blocked,
// merely reviewable, under-informed or clean. The frontend renders this verdict
// verbatim so a warning can never be presented as a confirmed compatibility and
// an unverified dimension can never be presented as verified.

export type ConsolidationFeasibility = 'blocked' | 'warning' | 'unverified' | 'feasible';

export interface ConsolidationConflict {
  level?: string;
  code?: string;
  message?: string;
}

/** Codes whose presence means the check could not be performed at all. */
const UNVERIFIED_CODES = new Set([
  'EQUIPMENT_UNVERIFIED',
  'CARGO_DIMENSIONS_UNVERIFIED',
  'ROUTE_UNVERIFIED',
  'TIME_WINDOW_UNVERIFIED',
  'STOP_COORDINATES_MISSING',
  'TRUCK_CAPACITY_INCOMPLETE',
  'DRIVER_HOURS_UNVERIFIED',
  'AVAILABILITY_UNVERIFIED',
  'GPS_STALE',
]);

export function isUnverifiedCode(code: string | undefined | null): boolean {
  if (!code) return false;
  if (UNVERIFIED_CODES.has(code)) return true;
  // `EQUIPMENT_MISSING` is a proven incompatibility, so the suffix rule must not
  // swallow it: only the explicit list above may describe a data gap.
  if (code === 'EQUIPMENT_MISSING') return false;
  return /(_UNVERIFIED|_INCOMPLETE)$/.test(code);
}

export interface ConsolidationVerdict {
  status: ConsolidationFeasibility;
  /** Soft outcomes may be accepted by an authorised dispatcher, with a reason. */
  overrideable: boolean;
  hardBlockers: number;
  warnings: number;
  unverified: number;
  /** Distinct codes behind the verdict, for UI chips and audit records. */
  codes: { blocking: string[]; warning: string[]; unverified: string[] };
}

const codes = (list: ConsolidationConflict[]) =>
  Array.from(new Set(list.map((item) => String(item?.code || '')).filter(Boolean)));

/**
 * Derive the verdict from the conflicts the checks already produced.
 *
 * Precedence: a hard blocker always wins; an unverified requirement outranks a
 * plain warning so insufficient information is never reported as merely
 * "reviewable"; anything left is feasible.
 */
export function deriveConsolidationVerdict(
  blockers: ConsolidationConflict[] = [],
  warnings: ConsolidationConflict[] = [],
): ConsolidationVerdict {
  const hardBlockers = blockers.length;
  const unverifiedList = warnings.filter((warning) => isUnverifiedCode(warning?.code));
  const plainWarnings = warnings.filter((warning) => !isUnverifiedCode(warning?.code));

  const status: ConsolidationFeasibility = hardBlockers > 0
    ? 'blocked'
    : unverifiedList.length > 0
      ? 'unverified'
      : plainWarnings.length > 0
        ? 'warning'
        : 'feasible';

  return {
    status,
    overrideable: status === 'warning' || status === 'unverified',
    hardBlockers,
    warnings: plainWarnings.length,
    unverified: unverifiedList.length,
    codes: {
      blocking: codes(blockers),
      warning: codes(plainWarnings),
      unverified: codes(unverifiedList),
    },
  };
}
