import {
  capacityViolations,
  knownTruckCapacity,
  missingTruckCapacity,
  normalizeEquipmentRequirements,
} from './assignment-capacity';

describe('assignment capacity rules', () => {
  const cargo = { weight: 20000, ldm: 10, volume: 60, pallets: 24 };

  it('does not treat a truck with unknown capacity as overloaded', () => {
    const capacity = knownTruckCapacity({ id: 'truck-1' });
    expect(capacity).toEqual({
      maxWeightKg: null,
      maxLdm: null,
      maxVolumeCbm: null,
      maxPallets: null,
    });
    expect(capacityViolations(cargo, capacity)).toEqual([]);
    expect(missingTruckCapacity(capacity)).toHaveLength(4);
  });

  it('allows a normal load on a verified compatible truck', () => {
    const capacity = knownTruckCapacity({
      payloadCapacity: 24000,
      maxLdm: 13.6,
      maxVolumeCbm: 90,
      maxPallets: 33,
    });
    expect(capacityViolations(cargo, capacity)).toEqual([]);
  });

  it('blocks only the dimension that is genuinely exceeded', () => {
    const capacity = knownTruckCapacity({ payloadCapacity: 18000, maxLdm: 13.6, maxPallets: 33 });
    expect(capacityViolations(cargo, capacity)).toEqual([
      { code: 'WEIGHT_OVERLOAD', field: 'maxWeightKg', actual: 20000, expected: 18000 },
    ]);
  });

  it('lets the attached trailer tighten the combination limits', () => {
    // Real production pair: tractor AR 67X WT (23,235 kg / 34 pallets) with
    // trailer VL61TWZ (21,220 kg / 24 pallets). The trailer governs.
    const capacity = knownTruckCapacity({
      payloadCapacity: 23235,
      maxWeightKg: 40924,
      maxPallets: 34,
      maxLdm: 9.9,
      maxVolumeCbm: 84,
      trailer: { payloadCapacityWeight: 21220, payloadCapacityPallets: 24, maxLdm: 9.9, maxVolumeCbm: 87 },
    });
    expect(capacity).toEqual({ maxWeightKg: 21220, maxLdm: 9.9, maxVolumeCbm: 84, maxPallets: 24 });
  });

  it('never lets a larger trailer raise the tractor limit', () => {
    expect(
      knownTruckCapacity({ payloadCapacity: 18000, maxPallets: 20, trailer: { payloadCapacityWeight: 24000, payloadCapacityPallets: 33 } }),
    ).toMatchObject({ maxWeightKg: 18000, maxPallets: 20 });
  });

  it('uses trailer capacity when the tractor has none and normalizes equipment', () => {
    expect(knownTruckCapacity({ trailer: { maxLdm: 13.6, payloadCapacityPallets: 33 } })).toMatchObject({
      maxLdm: 13.6,
      maxPallets: 33,
    });
    expect(normalizeEquipmentRequirements('tail_lift, frigo;TAIL_LIFT')).toEqual(['tail_lift', 'frigo']);
    expect(normalizeEquipmentRequirements(['ADR', 'frigo'])).toEqual(['ADR', 'frigo']);
    expect(normalizeEquipmentRequirements(null)).toEqual([]);
  });
});
