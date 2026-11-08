// Confirmation helpers shared by the assignment endpoint and its tests.
//
// Confirmation is the only place where a preview becomes persisted work, so the
// rules that decide "may this sequence be written" and "what exactly did the
// dispatcher override" must be pure, deterministic and independent of the
// request body's claims about identity or overrideability.

export interface SequenceValidation {
  ok: boolean;
  code?: 'STOP_ORDER_DUPLICATE' | 'STOP_ORDER_MISMATCH' | 'STOP_ORDER_INVALID';
  message?: string;
  orderId?: string;
}

const PICKUP_TYPES = new Set(['pickup', 'load']);
const DELIVERY_TYPES = new Set(['delivery', 'dropoff', 'unload']);

/**
 * A confirmation key must be an opaque, reasonably long token. Short or empty
 * values are rejected so two unrelated confirmations can never collide under a
 * generic key such as "1" or "confirm".
 */
export function normalizeConfirmationKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * Validates a confirmed stop order.
 *
 * The sequence must contain every proposed stop exactly once (when the proposal
 * known stops are supplied) and must never place a delivery before its own
 * pickup. Because the sequence contains every stop key, the existing stops keep
 * their dependencies too: an order whose pickup was moved after its delivery is
 * rejected by the same rule.
 */
export function validateInsertionSequence(
  sequence: string[],
  expectedKeys: string[] = [],
): SequenceValidation {
  const keys = (sequence || []).map((key) => String(key));
  if (!keys.length) return { ok: true };

  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) {
      return {
        ok: false,
        code: 'STOP_ORDER_DUPLICATE',
        message: `The confirmed sequence contains the stop ${key} more than once.`,
      };
    }
    seen.add(key);
  }

  if (expectedKeys.length > 0) {
    const sameSet = keys.length === expectedKeys.length
      && [...keys].sort().join('|') === [...expectedKeys].map(String).sort().join('|');
    if (!sameSet) {
      return {
        ok: false,
        code: 'STOP_ORDER_MISMATCH',
        message: 'The confirmed sequence does not contain exactly the stops the proposal was calculated for.',
      };
    }
  }

  const firstPickup = new Map<string, number>();
  const lastDelivery = new Map<string, number>();
  keys.forEach((key, index) => {
    const [orderId, type] = key.split(':');
    if (!orderId) return;
    const normalized = String(type || '').toLowerCase();
    if (PICKUP_TYPES.has(normalized) && !firstPickup.has(orderId)) firstPickup.set(orderId, index);
    if (DELIVERY_TYPES.has(normalized)) lastDelivery.set(orderId, index);
  });

  for (const [orderId, pickupIndex] of firstPickup) {
    const deliveryIndex = lastDelivery.get(orderId);
    if (deliveryIndex != null && deliveryIndex < pickupIndex) {
      return {
        ok: false,
        code: 'STOP_ORDER_INVALID',
        orderId,
        message: `The confirmed sequence places a delivery of ${orderId} before its pickup.`,
      };
    }
  }

  return { ok: true };
}

/**
 * The reviewed sequence is still valid when it is a permutation of the stops of
 * one of the previewed sequences. Any other stop set means the proposal changed
 * and the dispatcher has to review it again.
 */
export function isAcceptableReviewedSequence(reviewed: string[], allowed: string[][]): boolean {
  const keys = (reviewed || []).map(String);
  if (!keys.length) return true;
  const signature = [...keys].sort().join('|');
  return (allowed || []).some((list) => list.length === keys.length
    && [...list].map(String).sort().join('|') === signature);
}

export interface OverrideAuditInput {
  user: any;
  companyId: string | null;
  tripId: string;
  tripNumber: string | null;
  orderIds: string[];
  truckId: string | null;
  trailerId: string | null;
  feasibility: any;
  softCodes: string[];
  acceptedCodes: string[];
  reason: string;
  decidedAt?: Date;
}

export interface OverrideAuditRecord {
  company: { id: string } | null;
  user: { id: string };
  truckId: string | null;
  action: 'assignment_override';
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
}

/**
 * Builds the append-only audit record for an accepted override.
 *
 * `decidedBy` always comes from the authenticated user, never from the request,
 * and an empty reason or a missing user is an error rather than a silent
 * "accepted".
 */
export function buildOverrideAudit(input: OverrideAuditInput): OverrideAuditRecord {
  const reason = String(input.reason || '').trim();
  if (!reason) throw new Error('OVERRIDE_REASON_REQUIRED');
  const decidedBy = input.user?.id ? String(input.user.id) : null;
  if (!decidedBy) throw new Error('OVERRIDE_USER_REQUIRED');

  const codes = Array.from(new Set((input.softCodes || []).map(String).filter(Boolean)));
  const acceptedCodes = Array.from(new Set((input.acceptedCodes || []).map(String).filter(Boolean)));
  const decidedAt = (input.decidedAt || new Date()).toISOString();

  return {
    company: input.companyId ? { id: String(input.companyId) } : null,
    user: { id: decidedBy },
    truckId: input.truckId,
    action: 'assignment_override',
    beforeState: {
      tripId: input.tripId,
      tripNumber: input.tripNumber,
      orderIds: [...(input.orderIds || [])],
      feasibility: input.feasibility || null,
      verdictStatus: input.feasibility?.status || null,
      codes,
    },
    afterState: {
      decision: 'accepted',
      reason,
      acceptedCodes,
      feasibilityStatus: input.feasibility?.status || null,
      tripId: input.tripId,
      tripNumber: input.tripNumber,
      orderIds: [...(input.orderIds || [])],
      truckId: input.truckId,
      trailerId: input.trailerId,
      decidedBy,
      decidedAt,
    },
  };
}
