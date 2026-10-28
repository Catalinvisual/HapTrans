/**
 * Shared audit-diff helper.
 *
 * Compares the persisted state of an entity ("before") with the incoming DTO and returns
 * ONLY the fields whose value really changed. Values are normalized before comparison so
 * that representation differences never show up as fake modifications in the history:
 *   - null / undefined / ''           -> null
 *   - DB decimals ("12.500000") vs 12.5 -> equal
 *   - Date objects vs ISO / YYYY-MM-DD   -> equal when they describe the same day/instant
 *   - relations ({ id }) vs "xxxId"      -> compared by id
 *   - arrays of primitives               -> order-insensitive
 */

export type AuditChanges = Record<string, { old: any; new: any }>;

export interface AuditDiffOptions {
  /** DTO keys that must never be audited (e.g. computed / volatile fields). */
  ignore?: string[];
  /** Map DTO key -> relation name on the entity, e.g. { truckId: 'truck' }. */
  relations?: Record<string, string>;
  /** Fields whose values must never be stored in the log (e.g. password). */
  masked?: string[];
}

const ALWAYS_IGNORED = new Set([
  'id', 'createdAt', 'updatedAt', 'deletedAt', 'company', 'companyId', 'createdBy', 'updatedBy',
]);

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

function isDateLike(v: any): boolean {
  return v instanceof Date || (typeof v === 'string' && (DATE_ONLY_RE.test(v) || DATE_TIME_RE.test(v)));
}

function toDateKey(v: any, dateOnly: boolean): string | null {
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  if (dateOnly) {
    if (typeof v === 'string' && DATE_ONLY_RE.test(v)) return v;
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString();
}

function isEmpty(v: any): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

/** Returns a comparable key for a single value, or undefined when the value cannot be audited. */
function comparable(v: any): any {
  if (isEmpty(v)) return null;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null;
  if (typeof v === 'string') return v.trim();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) {
    if (v.every(x => x === null || ['string', 'number', 'boolean'].includes(typeof x))) {
      return JSON.stringify(v.map(x => comparable(x)).sort());
    }
    if (v.every(x => x && typeof x === 'object' && x.id)) {
      return JSON.stringify(v.map(x => String(x.id)).sort());
    }
    return undefined; // complex nested arrays are audited by the caller explicitly
  }
  if (typeof v === 'object') {
    if (v.id !== undefined) return String(v.id);
    return JSON.stringify(v);
  }
  return String(v);
}

/** True when two raw values describe the same thing after normalization. */
export function auditValuesEqual(a: any, b: any): boolean {
  if (isEmpty(a) && isEmpty(b)) return true;
  if (isEmpty(a) !== isEmpty(b)) return false;

  // Booleans (DB may give true/false, DTO may give 'true'/'false')
  if (typeof a === 'boolean' || typeof b === 'boolean') {
    const ba = typeof a === 'boolean' ? a : String(a).toLowerCase() === 'true';
    const bb = typeof b === 'boolean' ? b : String(b).toLowerCase() === 'true';
    return ba === bb;
  }

  // Numbers (DB decimals come back as strings, e.g. "1250.00")
  const aNum = typeof a === 'number' || (typeof a === 'string' && NUMERIC_RE.test(a.trim()));
  const bNum = typeof b === 'number' || (typeof b === 'string' && NUMERIC_RE.test(b.trim()));
  if (aNum && bNum && (typeof a === 'number' || typeof b === 'number' || String(a).includes('.') || String(b).includes('.'))) {
    return Math.round(Number(a) * 10000) === Math.round(Number(b) * 10000);
  }

  // Dates / timestamps
  if (isDateLike(a) && isDateLike(b)) {
    const dateOnly = (typeof a === 'string' && DATE_ONLY_RE.test(a)) || (typeof b === 'string' && DATE_ONLY_RE.test(b));
    return toDateKey(a, dateOnly) === toDateKey(b, dateOnly);
  }

  const ca = comparable(a);
  const cb = comparable(b);
  if (ca === undefined || cb === undefined) return true; // not auditable -> never report a fake change
  return ca === cb;
}

/** Human-friendly value to store in the log entry. */
export function auditDisplayValue(v: any): any {
  if (isEmpty(v)) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number') return Math.round(v * 100) / 100;
  if (typeof v === 'string' && NUMERIC_RE.test(v.trim()) && v.includes('.')) return Math.round(Number(v) * 100) / 100;
  if (Array.isArray(v)) {
    return v.map(x => (x && typeof x === 'object') ? (x.name || x.plateNumber || x.orderNumber || x.id) : x).join(', ');
  }
  if (typeof v === 'object') return v.name || v.plateNumber || v.tripNumber || v.orderNumber || v.email || v.id || null;
  return v;
}

/**
 * Computes the real changes between the persisted entity and the incoming DTO.
 * Only keys present in the DTO are considered.
 */
export function computeAuditChanges(before: any, dto: any, opts: AuditDiffOptions = {}): {
  updatedFields: string[];
  changes: AuditChanges;
} {
  const changes: AuditChanges = {};
  if (!before || !dto || typeof dto !== 'object') return { updatedFields: [], changes };

  const ignore = new Set([...(opts.ignore || []), ...ALWAYS_IGNORED]);
  const masked = new Set(opts.masked || ['password']);
  const relations = opts.relations || {};

  for (const key of Object.keys(dto)) {
    if (ignore.has(key)) continue;
    const newRaw = dto[key];
    if (newRaw === undefined) continue;

    const relationName = relations[key];
    if (relationName) {
      const oldRel = before[relationName];
      const oldId = oldRel?.id ?? null;
      const newId = isEmpty(newRaw) ? null : String(newRaw);
      if ((oldId ? String(oldId) : null) !== newId) {
        changes[key] = { old: oldRel ? auditDisplayValue(oldRel) : null, new: newId };
      }
      continue;
    }

    if (masked.has(key)) {
      if (!isEmpty(newRaw)) changes[key] = { old: '••••••', new: '••••••' };
      continue;
    }

    const oldRaw = before[key];
    if (!auditValuesEqual(oldRaw, newRaw)) {
      changes[key] = { old: auditDisplayValue(oldRaw), new: auditDisplayValue(newRaw) };
    }
  }

  return { updatedFields: Object.keys(changes), changes };
}
