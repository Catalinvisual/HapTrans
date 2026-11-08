/**
 * Planned ETA ownership.
 *
 * `stop.plannedEta` is the arrival the current schedule predicts. It used to be
 * written only once (`if (!stop.plannedEta) ...`), so after a reschedule — a new
 * appointment, a new departure, a changed route — the stop kept advertising the
 * arrival from the previous plan. That stale value is what later surfaced as a
 * "Planned ETA" hours or days away from the schedule it was supposed to describe.
 *
 * The rule: whenever the schedule recomputes a stop, the planned ETA is the
 * schedule's arrival for that stop. A recorded actual arrival is history and is
 * never rewritten by planning, and a missing schedule arrival never erases the
 * persisted value.
 */

export interface PlannedEtaState {
  plannedEta?: Date | string | null;
  actualArrival?: Date | string | null;
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export function resolvePlannedEta(
  scheduledArrival: Date | string | null | undefined,
  current: PlannedEtaState | null | undefined,
): Date | null {
  const persisted = toDate(current?.plannedEta);
  // An actual arrival is a fact; planning must not overwrite the history that
  // explains it, and the schedule cannot "un-arrive" a completed stop.
  if (toDate(current?.actualArrival)) return persisted;
  const scheduled = toDate(scheduledArrival);
  return scheduled || persisted;
}
