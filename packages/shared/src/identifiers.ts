/**
 * Identifier strategy (architecture §12 / ADR).
 *
 * Decision: public identifiers use **UUID (v4) strings** for entity primary
 * keys, plus separate human-readable business numbers (e.g. order/invoice
 * numbers) where a business sequence is required.
 *
 * Rationale:
 * - UUIDs are globally unique, safe to expose in APIs (no enumeration of
 *   sequential business data), and suitable for distributed/background
 *   operations without coordination.
 * - Sequential database IDs are reserved strictly for internal ordering/audit
 *   concerns, never exposed as public identifiers.
 * - UUIDv7 is noted as a future option (time-ordered) if index locality
 *   becomes a measurable concern; the schema stores `uuid` and can migrate.
 */
import { randomUUID } from 'node:crypto';

export type Id = string; // uuid v4

export function createId(): Id {
  return randomUUID();
}

export function isValidId(id: string): boolean {
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(id);
}

/** Business number generator placeholder (sequence-backed via DB in later tasks). */
export function nextBusinessNumber(prefix: string, seq: number, width = 6): string {
  return `${prefix}-${String(seq).padStart(width, '0')}`;
}
