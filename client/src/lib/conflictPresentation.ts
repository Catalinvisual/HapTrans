// Turns a raw planning conflict into what an enterprise user should read.
//
// The backend payload carries exact machine facts (codes, ids, ISO timestamps,
// raw parameters). Those belong in a collapsed technical section, never in the
// primary description: a dispatcher must understand "truck busy until 15:03"
// without reading database identifiers.

export type ConflictSeverity = 'blocking' | 'warning' | 'unverified';

export interface RawConflict {
  id?: string;
  level?: string;
  code?: string;
  message?: string;
  orderId?: string;
  tripId?: string;
  stopId?: string;
  resourceId?: string;
  params?: Record<string, any> | null;
}

export interface PresentedConflict {
  code: string;
  severity: ConflictSeverity;
  title: string;
  description: string;
  action: string | null;
  meta: { label: string; value: string }[];
  /** Raw diagnostic payload, only rendered inside a collapsed section. */
  technical: { label: string; value: string }[];
}

export interface PresentOptions {
  t: (key: string, fallback: string) => string;
  locale?: string;
  timeZone?: string;
}

const OVERLAP_CODES: Record<string, { title: string; action: string; resource: 'truck' | 'trailer' | 'driver' }> = {
  TRUCK_OVERLAP: { title: 'cf_truck_unavailable', action: 'cf_action_other_truck', resource: 'truck' },
  TRAILER_OVERLAP: { title: 'cf_trailer_unavailable', action: 'cf_action_other_trailer', resource: 'trailer' },
  DRIVER_OVERLAP: { title: 'cf_driver_unavailable', action: 'cf_action_other_driver', resource: 'driver' },
};

const ISO_LIKE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

function severityOf(conflict: RawConflict): ConflictSeverity {
  const level = String(conflict.level || '').toLowerCase();
  if (level === 'blocking' || level === 'blocker' || level === 'error') return 'blocking';
  if (level === 'unverified') return 'unverified';
  return 'warning';
}

function toDate(value: unknown): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatConflictTime(
  value: unknown,
  { locale = 'en-GB', timeZone }: { locale?: string; timeZone?: string } = {},
): string | null {
  const date = toDate(value);
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      ...(timeZone ? { timeZone } : {}),
    }).format(date);
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16);
  }
}

export function formatConflictDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (!hours) return `${rest} min`;
  return `${hours} h ${String(rest).padStart(2, '0')} min`;
}

function isIdentifier(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function stringifyParam(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) return value.map((item) => stringifyParam(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function technicalEntries(conflict: RawConflict, opts: PresentOptions): { label: string; value: string }[] {
  const entries: { label: string; value: string }[] = [];
  if (conflict.id) entries.push({ label: 'id', value: String(conflict.id) });
  for (const key of ['tripId', 'orderId', 'stopId', 'resourceId'] as const) {
    const value = (conflict as any)[key];
    if (value) entries.push({ label: key, value: String(value) });
  }
  if (conflict.message) {
    entries.push({ label: opts.t('cf_raw_message', 'Original message'), value: String(conflict.message) });
  }
  for (const [key, value] of Object.entries(conflict.params || {})) {
    if (value == null || value === '') continue;
    entries.push({ label: key, value: stringifyParam(value) });
  }
  return entries;
}

export function presentConflict(conflict: RawConflict, opts: PresentOptions): PresentedConflict {
  const { t, locale = 'en-GB', timeZone } = opts;
  const params = conflict.params || {};
  const code = String(conflict.code || 'UNKNOWN');
  const severity = severityOf(conflict);
  const time = (value: unknown) => formatConflictTime(value, { locale, timeZone });

  const overlap = OVERLAP_CODES[code];
  if (overlap) {
    const resourceName = String(
      params.plateNumber
      || params.truckPlate
      || params.trailerPlate
      || params.driverName
      || params.resourceName
      || '',
    ).trim();
    const tripRef = String(params.trip || params.tripNumber || '').trim();
    const location = String(params.location || params.city || params.stopCity || '').trim();
    const until = time(params.overlapEnd || params.busyUntil || params.end);
    const minutes = Number(params.overlapMinutes ?? params.minutes ?? 0);
    const resourceLabel = t(`cf_resource_${overlap.resource}`, overlap.resource);

    const title = t(overlap.title, 'Resource unavailable');
    const sentences: string[] = [];
    sentences.push(resourceName
      ? t('cf_overlap_sentence_named', `${resourceLabel} ${resourceName} is already assigned to another trip during the requested period.`)
        .replace('{resource}', resourceLabel)
        .replace('{name}', resourceName)
      : t('cf_overlap_sentence', 'This resource is already assigned to another trip during the requested period.')
        .replace('{resource}', resourceLabel));

    const meta: { label: string; value: string }[] = [];
    if (tripRef && !isIdentifier(tripRef)) {
      meta.push({ label: t('cf_conflicting_trip', 'Conflicting trip'), value: tripRef });
    }
    if (location) meta.push({ label: t('cf_location', 'Location'), value: location });
    if (until) meta.push({ label: t('cf_busy_until', 'Busy until'), value: until });
    if (minutes > 0) meta.push({ label: t('cf_overlap', 'Overlap'), value: formatConflictDuration(minutes) });

    return {
      code,
      severity,
      title,
      description: sentences.join(' '),
      action: severity === 'blocking' ? t(overlap.action, 'Select another resource or change the schedule.') : null,
      meta,
      technical: technicalEntries(conflict, opts),
    };
  }

  if (code === 'EQUIPMENT_UNVERIFIED' || code === 'EQUIPMENT_MISSING') {
    const blocked = code === 'EQUIPMENT_MISSING' || severity === 'blocking';
    const trailerPlate = String(params.plateNumber || params.trailerPlate || '').trim();
    const equipment = String(params.equipment || params.req || '').trim();
    const required = String(params.required || params.requiredHeightM || '').trim();
    const title = blocked
      ? t('cf_equipment_incompatible', 'Equipment incompatible')
      : t('cf_trailer_not_verified', 'Trailer compatibility not verified');
    const description = blocked
      ? t('cf_equipment_incompatible_body', 'The assigned equipment does not meet the requirement of this order.')
      : t('cf_trailer_not_verified_body', 'Trailer {plate} has no recorded internal loading height. {equipment} compatibility cannot currently be confirmed.')
        .replace('{plate}', trailerPlate || t('cf_this_trailer', 'this trailer'))
        .replace('{equipment}', equipment ? equipment.toUpperCase() : t('cf_the_required_equipment', 'the required equipment'));
    const meta: { label: string; value: string }[] = [];
    if (equipment) meta.push({ label: t('cf_equipment', 'Equipment'), value: equipment.toUpperCase() });
    if (required) meta.push({ label: t('cf_required_height', 'Required internal height'), value: /[a-z]/i.test(required) ? required : `${required} m` });
    return {
      code,
      severity,
      title,
      description,
      action: blocked
        ? t('cf_action_other_equipment', 'Assign equipment that meets the requirement.')
        : t('cf_action_complete_trailer', 'Open the trailer record and complete its missing technical data.'),
      meta,
      technical: technicalEntries(conflict, opts),
    };
  }

  const genericTitles: Record<string, string> = {
    NO_DRIVER: 'cf_no_driver',
    DRIVER_HOURS_EXCEEDED: 'cf_driver_hours',
    STOP_WINDOW_MISSED: 'cf_window_missed',
    PRE_EXISTING_WINDOW_MISS: 'cf_window_missed_existing',
    CARGO_OVERLOAD: 'cf_cargo_overload',
    EQUIPMENT_EQ: 'cf_equipment_incompatible',
    ORDER_ALREADY_ON_TRIP: 'cf_already_assigned',
    TRIP_LOCKED: 'cf_trip_locked',
  };
  const titleKey = genericTitles[code];
  const title = titleKey
    ? t(titleKey, 'Planning conflict')
    : t('cf_generic_title', 'Planning issue');
  const description = t(`cf_desc_${code}`, '') || t('cf_generic_body', 'This item needs attention before the plan can be confirmed.');
  return {
    code,
    severity,
    title,
    description,
    action: severity === 'blocking' ? t('cf_action_review', 'Review the plan before confirming.') : null,
    meta: [],
    technical: technicalEntries(conflict, opts),
  };
}

/** Groups repeated conflicts so ten identical warnings are shown once. */
export function groupConflicts(conflicts: RawConflict[]): { conflict: RawConflict; count: number }[] {
  const map = new Map<string, { conflict: RawConflict; count: number }>();
  for (const conflict of conflicts || []) {
    if (!conflict) continue;
    const key = [conflict.code, conflict.orderId, conflict.resourceId, conflict.stopId].join('|');
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { conflict, count: 1 });
  }
  return Array.from(map.values());
}

export function hasIsoTimestamp(value: string): boolean {
  return ISO_LIKE.test(value);
}
