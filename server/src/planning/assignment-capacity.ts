export interface CargoTotals {
  weight: number;
  ldm: number;
  volume: number;
  pallets: number;
}

export interface KnownTruckCapacity {
  maxWeightKg: number | null;
  maxLdm: number | null;
  maxVolumeCbm: number | null;
  maxPallets: number | null;
}

export interface CapacityViolation {
  code: 'WEIGHT_OVERLOAD' | 'LDM_OVERLOAD' | 'VOLUME_OVERLOAD' | 'PALLET_OVERLOAD';
  field: 'maxWeightKg' | 'maxLdm' | 'maxVolumeCbm' | 'maxPallets';
  actual: number;
  expected: number;
}

const positive = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

/**
 * An attached trailer is part of the vehicle combination, so the tightest
 * known limit governs. A 23.2 t tractor drawing a 21.2 t trailer can only
 * legally carry 21.2 t; taking the first value found let the heavier tractor
 * figure win and hid a real overload.
 */
const tightest = (...values: Array<number | null>): number | null => {
  const known = values.filter((value): value is number => value !== null);
  return known.length ? Math.min(...known) : null;
};

/**
 * Only values that actually exist on the tractor or trailer can prove an
 * overload. resolveTruckCapacity deliberately has display defaults, but those
 * defaults must never be used to block a dispatcher.
 */
export function knownTruckCapacity(truck?: any): KnownTruckCapacity {
  const trailer = truck?.trailer;
  const gvw = positive(truck?.maxWeightKg);
  return {
    maxWeightKg: tightest(
      positive(truck?.payloadCapacity),
      // A gross vehicle weight only stands in for payload on light vehicles;
      // above 30 t it is the combination's own mass and proves nothing.
      gvw !== null && gvw <= 30000 ? gvw : null,
      positive(trailer?.payloadCapacityWeight),
      positive(trailer?.maxWeightKg),
    ),
    maxLdm: tightest(positive(truck?.maxLdm), positive(trailer?.maxLdm)),
    maxVolumeCbm: tightest(positive(truck?.maxVolumeCbm), positive(trailer?.maxVolumeCbm)),
    maxPallets: tightest(positive(truck?.maxPallets), positive(trailer?.payloadCapacityPallets)),
  };
}

export function capacityViolations(cargo: CargoTotals, capacity: KnownTruckCapacity): CapacityViolation[] {
  const checks: Array<[CapacityViolation['code'], CapacityViolation['field'], number, number | null]> = [
    ['WEIGHT_OVERLOAD', 'maxWeightKg', cargo.weight, capacity.maxWeightKg],
    ['LDM_OVERLOAD', 'maxLdm', cargo.ldm, capacity.maxLdm],
    ['VOLUME_OVERLOAD', 'maxVolumeCbm', cargo.volume, capacity.maxVolumeCbm],
    ['PALLET_OVERLOAD', 'maxPallets', cargo.pallets, capacity.maxPallets],
  ];
  return checks
    .filter(([, , actual, expected]) => expected !== null && actual > expected)
    .map(([code, field, actual, expected]) => ({ code, field, actual, expected: expected as number }));
}

export function missingTruckCapacity(capacity: KnownTruckCapacity): Array<keyof KnownTruckCapacity> {
  return (Object.keys(capacity) as Array<keyof KnownTruckCapacity>).filter((key) => capacity[key] === null);
}

/** Accepts JSON arrays, simple-array values and comma/semicolon strings. */
export function normalizeEquipmentRequirements(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[,;]/)
      : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw.flatMap((entry) => (typeof entry === 'string' ? entry.split(/[,;]/) : []))) {
    const value = item.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}
