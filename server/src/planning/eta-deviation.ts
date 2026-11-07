/**
 * ETA deviation, against the correct baseline.
 *
 * The live ETA has two different references and they must not be mixed:
 *  - the planned ETA (what dispatch promised),
 *  - the time-window end (the operational deadline).
 *
 * The previous payload exposed a single `deviationMin` computed against
 * `timeWindowMax ?? plannedEta`, while the UI printed it next to the planned
 * ETA. When a stop had a window, the number shown was the lateness against the
 * deadline, not the deviation from the plan, which produced the impossible
 * "Calculated 07:36 / Planned 03:00 / +1 838 min" combination.
 */

export interface EtaDeviations {
  /** Live ETA minus planned ETA, in minutes (positive = later than planned). */
  vsPlannedMin: number | null;
  /** Live ETA minus the window end, in minutes (positive = after the window). */
  vsWindowMin: number | null;
  /** Kept for existing consumers: window end when present, else planned ETA. */
  deviationMin: number | null;
}

const toTime = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  const time = date.getTime();
  return Number.isNaN(time) ? null : time;
};

const minutes = (liveTime: number | null, reference: number | null): number | null =>
  liveTime === null || reference === null ? null : Math.round((liveTime - reference) / 60000);

export function etaDeviations(liveEta: unknown, plannedEta: unknown, windowEnd: unknown): EtaDeviations {
  const live = toTime(liveEta);
  const planned = toTime(plannedEta);
  const window = toTime(windowEnd);
  return {
    vsPlannedMin: minutes(live, planned),
    vsWindowMin: minutes(live, window),
    deviationMin: window !== null ? minutes(live, window) : minutes(live, planned),
  };
}
