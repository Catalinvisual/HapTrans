/**
 * Vehicle capacity resolution shared by the TMS screens.
 *
 * A capacity can only be proven from data that actually exists. The previous
 * screens used `maxWeightKg || 24000` and `maxPallets || 33`, so an incomplete
 * vehicle showed invented limits that disagreed with the server (which already
 * refused to block on missing dimensions). This mirrors the server rules in
 * `server/src/planning/assignment-capacity.ts`.
 */
export interface KnownTruckCapacity {
  maxWeightKg: number | null;
  maxLdm: number | null;
  maxVolumeCbm: number | null;
  maxPallets: number | null;
}

const positive = (value: unknown): number | null => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export function knownTruckCapacity(truck?: any): KnownTruckCapacity {
  const trailer = truck?.trailer;
  const gvw = positive(truck?.maxWeightKg);
  const truckPayload = positive(truck?.payloadCapacity);
  return {
    maxWeightKg:
      truckPayload ??
      (gvw !== null && gvw <= 30000 ? gvw : null) ??
      positive(trailer?.payloadCapacityWeight) ??
      positive(trailer?.maxWeightKg),
    maxLdm: positive(truck?.maxLdm) ?? positive(trailer?.maxLdm),
    maxVolumeCbm: positive(truck?.maxVolumeCbm) ?? positive(trailer?.maxVolumeCbm),
    maxPallets: positive(truck?.maxPallets) ?? positive(trailer?.payloadCapacityPallets),
  };
}
