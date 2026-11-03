// Cargo measurement helpers. All functions return null when the required
// measurements are missing, so callers can show "Not provided" instead of 0.

export const TRAILER_LOADING_WIDTH_M = 2.4;

export interface CargoLike {
  quantity?: number | string | null;
  lengthCm?: number | string | null;
  widthCm?: number | string | null;
  heightCm?: number | string | null;
  volumeCbm?: number | string | null;
  ldm?: number | string | null;
}

function positive(value: any): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function units(item: CargoLike): number {
  return Math.max(1, Math.floor(positive(item?.quantity) ?? 1));
}

/** Volume from dimensions and quantity, rounded to 2 decimals. */
export function calculateVolumeCbm(item: CargoLike): number | null {
  const length = positive(item?.lengthCm);
  const width = positive(item?.widthCm);
  const height = positive(item?.heightCm);
  if (length === null || width === null || height === null) return null;
  const perUnit = (length * width * height) / 1_000_000; // cm³ → m³
  return Math.round(perUnit * units(item) * 100) / 100;
}

/** Loading meters from floor area, using the standard 2.40 m loading width. */
export function calculateLdm(item: CargoLike): number | null {
  const length = positive(item?.lengthCm);
  const width = positive(item?.widthCm);
  if (length === null || width === null) return null;
  const perUnit = (length / 100) * (width / 100) / TRAILER_LOADING_WIDTH_M;
  return Math.round(perUnit * units(item) * 100) / 100;
}

/** True when no usable capacity measurement exists for the item. */
export function hasNoCapacityData(item: CargoLike): boolean {
  return (
    positive(item?.volumeCbm) === null &&
    positive(item?.ldm) === null &&
    positive(item?.lengthCm) === null &&
    positive(item?.widthCm) === null &&
    positive(item?.heightCm) === null
  );
}

export function missingCapacityData(items: CargoLike[]): boolean {
  return (items || []).length > 0 && (items || []).some((item) => hasNoCapacityData(item));
}
