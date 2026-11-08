/**
 * Identity matching for an order's stops across an edit.
 *
 * `OrdersService.update()` used to delete every order stop and re-insert them.
 * That gave each save new primary keys, so the trip stop representing the same
 * pickup had no stable anchor to be matched against — repeated edits and
 * synchronizations could leave two records for one operation. Saving an order
 * without changing its stops must leave the rows (and their ids) untouched.
 *
 * Matching is by sequence first, then type, and never consumes a row twice.
 */

export interface ExistingOrderStopLike {
  id?: string | null;
  sequence?: number | string | null;
  type?: string | null;
}

export interface DesiredOrderStopLike {
  type?: string | null;
}

export interface OrderStopMatch {
  /** Index in the desired list, and the existing row to update (null = insert). */
  index: number;
  existingId: string | null;
}

export interface OrderStopMatchPlan {
  matches: OrderStopMatch[];
  /** Existing rows whose logical stop no longer exists and may be removed. */
  surplusIds: string[];
}

const sequenceOf = (value: unknown): number | null => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const typeOf = (value: unknown): string =>
  String(value || '').toLowerCase().trim();

export function planOrderStopMatch(
  existing: ExistingOrderStopLike[],
  desired: DesiredOrderStopLike[],
): OrderStopMatchPlan {
  const rows = [...(existing || [])];
  const used = new Set<string>();
  const matches: OrderStopMatch[] = (desired || []).map((_, index) => ({ index, existingId: null }));

  // First pass: an existing row whose operation type still matches. This keeps a
  // pickup with its pickup and a delivery with its delivery even when a new
  // intermediate stop shifts every sequence number.
  for (let index = 0; index < matches.length; index += 1) {
    const wantedType = typeOf(desired[index]?.type);
    if (!wantedType) continue;
    const byType = rows.find((row) => !used.has(String(row.id)) && typeOf(row.type) === wantedType);
    if (byType) {
      used.add(String(byType.id));
      matches[index] = { index, existingId: String(byType.id) };
    }
  }

  // Second pass: only rows still unclaimed may be matched by position, so a
  // newly inserted middle stop can never steal the delivery that follows it.
  for (let index = 0; index < matches.length; index += 1) {
    if (matches[index].existingId) continue;
    const bySequence = rows.find(
      (row) => !used.has(String(row.id)) && sequenceOf(row.sequence) === index + 1,
    );
    if (bySequence) {
      used.add(String(bySequence.id));
      matches[index] = { index, existingId: String(bySequence.id) };
    }
  }

  return {
    matches,
    surplusIds: rows.filter((row) => !used.has(String(row.id))).map((row) => String(row.id)),
  };
}
