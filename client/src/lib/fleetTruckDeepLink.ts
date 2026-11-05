// Deep-link and validation helpers shared by the route planner and Fleet editor.
// The planner may only return to a same-origin, absolute application path.

export type TruckDimensionKey = 'heightCm' | 'widthCm' | 'lengthCm' | 'axleCount';

export const TRUCK_DIMENSION_FIELDS = [
  { key: 'heightCm', min: 100, max: 500 },
  { key: 'widthCm', min: 100, max: 400 },
  { key: 'lengthCm', min: 300, max: 3000 },
  { key: 'axleCount', min: 1, max: 12 },
] as const satisfies ReadonlyArray<{ key: TruckDimensionKey; min: number; max: number }>;

export function isMissingTruckDimension(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  const numeric = Number(value);
  return !Number.isFinite(numeric) || numeric <= 0;
}

export function missingTruckDimensions(
  form: Partial<Record<TruckDimensionKey, unknown>>,
): TruckDimensionKey[] {
  return TRUCK_DIMENSION_FIELDS
    .filter(({ key }) => isMissingTruckDimension(form[key]))
    .map(({ key }) => key);
}

export function validateTruckDimensions(
  form: Partial<Record<TruckDimensionKey, unknown>>,
): Partial<Record<TruckDimensionKey, { min: number; max: number }>> {
  const errors: Partial<Record<TruckDimensionKey, { min: number; max: number }>> = {};
  for (const field of TRUCK_DIMENSION_FIELDS) {
    const raw = form[field.key];
    if (raw === null || raw === undefined || String(raw).trim() === '') continue;
    const numeric = Number(raw);
    const invalidRange = !Number.isFinite(numeric) || numeric < field.min || numeric > field.max;
    const invalidInteger = field.key === 'axleCount' && !Number.isInteger(numeric);
    if (invalidRange || invalidInteger) errors[field.key] = { min: field.min, max: field.max };
  }
  return errors;
}

export function truckDimensionInputId(key: TruckDimensionKey): string {
  return `truck-dimension-${key}`;
}

export function buildTruckDimensionsEditUrl(truckId: string, returnTo?: string): string {
  const params = new URLSearchParams({
    tab: 'trucks',
    editTruck: truckId,
    focus: 'dimensions',
  });
  if (returnTo) params.set('returnTo', returnTo);
  return `/fleet?${params.toString()}`;
}

export function safeInternalReturnTo(value: string | null | undefined): string | null {
  if (!value || value.includes('\\') || !value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const base = new URL('https://haptrans.local');
    const target = new URL(value, base);
    if (target.origin !== base.origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}

export function withVehicleUpdated(value: string, truckId: string): string | null {
  const safe = safeInternalReturnTo(value);
  if (!safe) return null;
  const url = new URL(safe, 'https://haptrans.local');
  url.searchParams.set('vehicleUpdated', truckId);
  return `${url.pathname}${url.search}${url.hash}`;
}
