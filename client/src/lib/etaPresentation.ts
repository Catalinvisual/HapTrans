/**
 * Presentation semantics for the timestamps a dispatcher sees on a stop.
 *
 * The planner used to print one "ETA" for four different things: the booked
 * appointment, the schedule's planned arrival, a route recalculated arrival and
 * a GPS projection. They are never interchangeable:
 *
 *  - `appointment`  — exactly what the dispatcher entered (fixed slot or window),
 *  - `plannedEta`   — the trip schedule's operational estimate,
 *  - `calculatedEta`— the arrival recomputed from the current route/schedule,
 *  - `liveEta`      — only when a live source (GPS / telematics) reported one,
 *  - `ata`          — only when an actual arrival event was recorded.
 *
 * Deviations always name the two values compared, so "-4112 min" can no longer
 * appear next to a planned time it was not measured against.
 */

import { describeWallClockAppointment, formatAppointmentInstants, summariseAppointment } from './stopAppointment';

export type EtaSource = 'live_gps' | 'stale_gps' | 'calculated' | 'planned' | 'none';
export type EtaLabelKind = 'live' | 'stale' | 'calculated' | 'planned' | 'none';

export interface StopTimeInput {
  appointmentStart?: string | Date | null;
  appointmentEnd?: string | Date | null;
  plannedEta?: string | Date | null;
  calculatedEta?: string | Date | null;
  liveEta?: string | Date | null;
  actualArrival?: string | Date | null;
  etaSource?: string | null;
  gpsAt?: string | Date | null;
  /** Wall-clock appointment as entered in the order form. */
  appointmentDateFrom?: string | null;
  appointmentTimeFrom?: string | null;
  appointmentDateTo?: string | null;
  appointmentTimeUntil?: string | null;
}

export interface LabeledTime {
  kind: string;
  label: string;
  value: Date | null;
}

export interface EtaDeviation {
  minutes: number;
  /** Which two timestamps are being compared, e.g. "live ETA − planned ETA". */
  basis: 'live_vs_planned' | 'live_vs_window' | 'planned_vs_appointment' | 'actual_vs_appointment';
  minutesLabel: string;
}

export interface StopTimePresentation {
  appointment: { kind: 'fixed' | 'window' | 'unscheduled' | 'invalid'; label: string };
  plannedEta: LabeledTime | null;
  calculatedEta: LabeledTime | null;
  liveEta: LabeledTime | null;
  ata: LabeledTime | null;
  deviations: EtaDeviation[];
}

const toDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isLiveEtaSource = (source?: string | null): boolean =>
  String(source || '').toLowerCase() === 'live_gps';

/** A live ETA without a live source is not live — it is a projection or nothing. */
export function resolveEtaLabelKind(input: StopTimeInput): EtaLabelKind {
  const live = toDate(input.liveEta);
  const source = String(input.etaSource || '').toLowerCase();
  if (live && isLiveEtaSource(source)) return 'live';
  if (live && source === 'stale_gps') return 'stale';
  if (toDate(input.calculatedEta)) return 'calculated';
  if (toDate(input.plannedEta)) return 'planned';
  return 'none';
}

export function formatDeviationMinutes(minutes: number): string {
  const sign = minutes > 0 ? '+' : '−';
  return `${sign}${Math.abs(Math.round(minutes))} min`;
}

const diffMinutes = (later: Date | null, earlier: Date | null): number | null =>
  later && earlier ? Math.round((later.getTime() - earlier.getTime()) / 60000) : null;

export function presentStopTimes(input: StopTimeInput, locale = 'en-GB'): StopTimePresentation {
  const wallClock = describeWallClockAppointment({
    dateFrom: input.appointmentDateFrom,
    timeFrom: input.appointmentTimeFrom,
    dateTo: input.appointmentDateTo,
    timeUntil: input.appointmentTimeUntil,
  });
  const hasWallClock = summariseAppointment({
    dateFrom: input.appointmentDateFrom,
    timeFrom: input.appointmentTimeFrom,
    dateTo: input.appointmentDateTo,
    timeUntil: input.appointmentTimeUntil,
  }).kind !== 'unscheduled';

  const start = toDate(input.appointmentStart);
  const end = toDate(input.appointmentEnd);
  const appointmentLabel = hasWallClock
    ? wallClock.label
    : start
      ? formatAppointmentInstants(start, end, locale)
      : '';

  const planned = toDate(input.plannedEta);
  const calculated = toDate(input.calculatedEta);
  const live = toDate(input.liveEta);
  const actual = toDate(input.actualArrival);

  const deviations: EtaDeviation[] = [];
  const plannedMinutes = diffMinutes(planned, start ? (end && end.getTime() !== start.getTime() ? end : start) : null);
  if (plannedMinutes !== null) {
    deviations.push({
      minutes: plannedMinutes,
      basis: 'planned_vs_appointment',
      minutesLabel: formatDeviationMinutes(plannedMinutes),
    });
  }
  const liveVsPlanned = diffMinutes(live, planned);
  if (live && planned && liveVsPlanned !== null) {
    deviations.push({ minutes: liveVsPlanned, basis: 'live_vs_planned', minutesLabel: formatDeviationMinutes(liveVsPlanned) });
  }
  const liveVsWindow = diffMinutes(live, end ?? start);
  if (live && (end ?? start) && liveVsWindow !== null) {
    deviations.push({ minutes: liveVsWindow, basis: 'live_vs_window', minutesLabel: formatDeviationMinutes(liveVsWindow) });
  }
  const actualVsAppointment = diffMinutes(actual, start);
  if (actual && start && actualVsAppointment !== null) {
    deviations.push({ minutes: actualVsAppointment, basis: 'actual_vs_appointment', minutesLabel: formatDeviationMinutes(actualVsAppointment) });
  }

  return {
    appointment: { kind: wallClock.kind, label: appointmentLabel },
    plannedEta: planned ? { kind: 'planned', label: formatAppointmentInstants(planned, null, locale), value: planned } : null,
    calculatedEta: calculated ? { kind: 'calculated', label: formatAppointmentInstants(calculated, null, locale), value: calculated } : null,
    liveEta: live && (isLiveEtaSource(input.etaSource) || String(input.etaSource || '').toLowerCase() === 'stale_gps')
      ? { kind: isLiveEtaSource(input.etaSource) ? 'live' : 'stale', label: formatAppointmentInstants(live, null, locale), value: live }
      : null,
    ata: actual ? { kind: 'ata', label: formatAppointmentInstants(actual, null, locale), value: actual } : null,
    deviations,
  };
}
