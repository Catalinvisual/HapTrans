/**
 * Pure emission calculation core.
 *
 * Every HapCargo surface (trip automation, manual calculator, reports, audit
 * reproducibility check) calls these functions. No database, no HTTP and no
 * framework code lives here so the arithmetic is deterministic and unit
 * testable.
 *
 * Conceptual formula:  GHG emissions = Activity Data × Emission Factor
 * Boundaries:          TTW = tank-to-wheel, WTT = well-to-tank, WTW = TTW + WTT
 *
 * A factor that is not configured produces `null`, never zero: an unknown
 * emission is not the same thing as no emission.
 */

export type BoundaryPart = 'ttw' | 'wtt' | 'wtw';

export interface EmissionFactorValue {
  /** Tank-to-wheel kg CO2e per activity unit (litre, kg or kWh). */
  ttwKgCo2ePerUnit: number | null;
  /** Well-to-tank kg CO2e per activity unit. */
  wttKgCo2ePerUnit: number | null;
  /** Direct CO2 only, when the source publishes it separately. */
  co2KgPerUnit?: number | null;
}

export interface FuelEmissionResult {
  ttwKgCo2e: number | null;
  wttKgCo2e: number | null;
  wtwKgCo2e: number | null;
  co2Kg: number | null;
  /** Machine-readable reasons a boundary could not be produced. */
  missing: string[];
}

export interface SegmentInput {
  countryCode: string;
  distanceKm: number;
  loadedKm?: number;
  emptyKm?: number;
  energyQuantity?: number | null;
}

export interface SegmentEmissionResult {
  countryCode: string;
  distanceKm: number;
  loadedKm: number;
  emptyKm: number;
  energyQuantity: number | null;
  ttwKgCo2e: number | null;
  wttKgCo2e: number | null;
  wtwKgCo2e: number | null;
}

export interface IntensityResult {
  gPerKm: number | null;
  gPerTonneKm: number | null;
}

const D = 6;

export function round(value: number, decimals = D): number {
  if (!Number.isFinite(value)) return 0;
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/**
 * Fuel/energy based calculation.
 * WTW is only produced when both TTW and WTT are known for the same activity.
 */
export function computeFuelEmissions(
  quantity: number | null,
  factor: EmissionFactorValue | null,
): FuelEmissionResult {
  const q = num(quantity);
  const missing: string[] = [];
  if (q === null || q <= 0) {
    return { ttwKgCo2e: null, wttKgCo2e: null, wtwKgCo2e: null, co2Kg: null, missing: ['activity_data_missing'] };
  }
  if (!factor) {
    return { ttwKgCo2e: null, wttKgCo2e: null, wtwKgCo2e: null, co2Kg: null, missing: ['emission_factor_missing'] };
  }
  const ttw = num(factor.ttwKgCo2ePerUnit);
  const wtt = num(factor.wttKgCo2ePerUnit);
  if (ttw === null) missing.push('ttw_factor_missing');
  if (wtt === null) missing.push('wtt_factor_missing');

  const ttwKg = ttw === null ? null : round(q * ttw);
  const wttKg = wtt === null ? null : round(q * wtt);
  const wtwKg = ttwKg !== null && wttKg !== null ? round(ttwKg + wttKg) : null;
  const co2 = num(factor.co2KgPerUnit ?? null);
  return {
    ttwKgCo2e: ttwKg,
    wttKgCo2e: wttKg,
    wtwKgCo2e: wtwKg,
    co2Kg: co2 === null ? null : round(q * co2),
    missing,
  };
}

/** Distance based calculation using a per-kilometre factor. */
export function computeDistanceEmissions(
  distanceKm: number | null,
  kgCo2ePerKm: number | null,
  boundary: BoundaryPart = 'ttw',
): FuelEmissionResult {
  const d = num(distanceKm);
  const f = num(kgCo2ePerKm);
  const missing: string[] = [];
  if (d === null || d <= 0) {
    return { ttwKgCo2e: null, wttKgCo2e: null, wtwKgCo2e: null, co2Kg: null, missing: ['activity_data_missing'] };
  }
  if (f === null) {
    return { ttwKgCo2e: null, wttKgCo2e: null, wtwKgCo2e: null, co2Kg: null, missing: ['emission_factor_missing'] };
  }
  const value = round(d * f);
  return {
    ttwKgCo2e: boundary === 'ttw' ? value : null,
    wttKgCo2e: boundary === 'wtt' ? value : null,
    wtwKgCo2e: boundary === 'wtw' ? value : null,
    co2Kg: null,
    missing,
  };
}

/**
 * Allocate a total across weights without drift. Uses the largest-remainder
 * method at 6 decimals so `sum(result) === total` exactly, which is what makes
 * customer/country allocations auditable (no lost or invented grams).
 */
export function allocateProRata(total: number, weights: number[]): number[] {
  const t = num(total) ?? 0;
  if (!weights.length) return [];
  const safe = weights.map((w) => {
    const n = num(w);
    return n !== null && n > 0 ? n : 0;
  });
  const sum = safe.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    // No usable weight: fall back to an equal split and keep the exact sum.
    const base = Math.floor((t * 1e6) / weights.length) / 1e6;
    const out = weights.map(() => round(base));
    const drift = round(t - out.reduce((a, b) => a + b, 0));
    if (out.length) out[out.length - 1] = round(out[out.length - 1] + drift);
    return out;
  }
  const exact = safe.map((w) => (t * w) / sum);
  const floored = exact.map((v) => Math.floor(v * 1e6) / 1e6);
  let remainder = round(t - floored.reduce((a, b) => a + b, 0));
  const order = exact
    .map((v, i) => ({ i, frac: v * 1e6 - Math.floor(v * 1e6) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floored];
  let idx = 0;
  while (remainder > 1e-12 && order.length) {
    out[order[idx % order.length].i] = round(out[order[idx % order.length].i] + 1e-6);
    remainder = round(remainder - 1e-6);
    idx++;
    if (idx > 1e6) break;
  }
  return out.map((v) => round(v));
}

/**
 * Apportion a total fuel/energy quantity across country segments by distance.
 * This is the documented fallback when no country-specific fuel measurement
 * exists; it never divides the distance itself.
 */
export function allocateEnergyByDistance(
  totalEnergy: number | null,
  segments: SegmentInput[],
): (number | null)[] {
  const e = num(totalEnergy);
  if (e === null) return segments.map(() => null);
  const allocation = allocateProRata(e, segments.map((s) => s.distanceKm));
  return allocation;
}

/**
 * Build country segments and their emissions. Segment totals are computed from
 * the allocated energy, then the record total is the sum of segments, so the
 * country view always reconciles with the trip view.
 */
export function computeSegments(
  segments: SegmentInput[],
  factor: EmissionFactorValue | null,
): SegmentEmissionResult[] {
  const energy = allocateEnergyByDistance(
    segments.reduce<number | null>((acc, s) => {
      if (s.energyQuantity === null || s.energyQuantity === undefined) return acc;
      return (acc ?? 0) + s.energyQuantity;
    }, null),
    segments,
  );
  return segments.map((segment, i) => {
    const quantity = segment.energyQuantity ?? energy[i] ?? null;
    const emissions = computeFuelEmissions(quantity, factor);
    return {
      countryCode: segment.countryCode,
      distanceKm: round(segment.distanceKm),
      loadedKm: round(segment.loadedKm ?? 0),
      emptyKm: round(segment.emptyKm ?? 0),
      energyQuantity: quantity === null ? null : round(quantity),
      ttwKgCo2e: emissions.ttwKgCo2e,
      wttKgCo2e: emissions.wttKgCo2e,
      wtwKgCo2e: emissions.wtwKgCo2e,
    };
  });
}

export interface ReconciliationResult {
  segmentDistanceKm: number;
  routeDistanceKm: number;
  differenceKm: number;
  differencePercent: number;
  tolerancePercent: number;
  reconciled: boolean;
}

/** Country segments must add up to the route distance within a stated tolerance. */
export function reconcileSegments(
  segments: Array<{ distanceKm: number }>,
  routeDistanceKm: number | null,
  tolerancePercent = 0.5,
): ReconciliationResult {
  const segmentTotal = round(segments.reduce((a, s) => a + (num(s.distanceKm) ?? 0), 0));
  const route = num(routeDistanceKm) ?? 0;
  const difference = round(segmentTotal - route);
  const pct = route > 0 ? round((Math.abs(difference) / route) * 100, 4) : segmentTotal > 0 ? 100 : 0;
  return {
    segmentDistanceKm: segmentTotal,
    routeDistanceKm: route,
    differenceKm: difference,
    differencePercent: pct,
    tolerancePercent,
    reconciled: route > 0 && pct <= tolerancePercent,
  };
}

/** g CO2e/km and g CO2e/tonne-km, with honest nulls when inputs are missing. */
export function computeIntensity(
  co2eKg: number | null,
  distanceKm: number | null,
  payloadTonnes: number | null,
): IntensityResult {
  const e = num(co2eKg);
  const d = num(distanceKm);
  const t = num(payloadTonnes);
  const gPerKm = e !== null && d !== null && d > 0 ? round((e * 1000) / d, 4) : null;
  const gPerTonneKm = e !== null && d !== null && t !== null && d > 0 && t > 0 ? round((e * 1000) / (d * t), 4) : null;
  return { gPerKm, gPerTonneKm };
}

/** Tonne-kilometres. Null when cargo weight is unknown: never assume a load. */
export function tonneKilometres(payloadTonnes: number | null, loadedKm: number | null): number | null {
  const t = num(payloadTonnes);
  const d = num(loadedKm);
  if (t === null || d === null || t <= 0 || d <= 0) return null;
  return round(t * d, 3);
}

/** Great-circle distance in km, used only to apportion an already-known route. */
export function haversineKm(
  a: { lat: number; lng: number } | null,
  b: { lat: number; lng: number } | null,
): number | null {
  if (!a || !b) return null;
  if (![a.lat, a.lng, b.lat, b.lng].every((v) => Number.isFinite(v))) return null;
  const R = 6371.0088;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))), 3);
}

/** Deterministic, order-independent hash for idempotent event processing. */
export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) return '[circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      out[key] = walk((v as Record<string, unknown>)[key]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export function hashInputs(value: unknown): string {
  const text = stableStringify(value);
  // FNV-1a 64-bit over UTF-16 code units, rendered as hex. Deterministic and
  // dependency-free; this is an idempotency key, not a security primitive.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < text.length; i++) {
    hash ^= BigInt(text.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
}

/**
 * Split a fuel quantity into TTW/WTW components. Used by the manual calculator
 * to expose direct CO2 separately from total CO2e.
 */
export function splitBoundaries(result: FuelEmissionResult): {
  ttw: number | null;
  wtt: number | null;
  wtw: number | null;
} {
  return { ttw: result.ttwKgCo2e, wtt: result.wttKgCo2e, wtw: result.wtwKgCo2e };
}
