/**
 * The four appointment columns of an OrderStop, normalised in one place.
 *
 * Both order write paths (create and identity-preserving update) must agree:
 *  - clearing the maximum persists null — no 23:59 is invented for it,
 *  - a time without a date is dropped rather than stored half-set,
 *  - a date-only maximum keeps `timeUntil` null, so the stop stays "until end
 *    of that day" instead of claiming an exact instant nobody entered.
 */

export interface StopAppointmentColumns {
  dateFrom: string | null;
  dateTo: string | null;
  timeFrom: string | null;
  timeUntil: string | null;
}

const dateOnly = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

const clock = (value: unknown): string | null => {
  const text = String(value ?? '').slice(0, 5);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
};

export function stopAppointmentColumns(stopDto: any): StopAppointmentColumns {
  const dateFrom = dateOnly(stopDto?.scheduledDate || stopDto?.requestedDateFrom || stopDto?.dateFrom);
  const dateTo = dateOnly(stopDto?.requestedDateTo || stopDto?.dateTo);
  return {
    dateFrom,
    dateTo,
    timeFrom: dateFrom ? clock(stopDto?.scheduledTime || stopDto?.timeFrom) : null,
    timeUntil: dateTo ? clock(stopDto?.timeUntil) : null,
  };
}
