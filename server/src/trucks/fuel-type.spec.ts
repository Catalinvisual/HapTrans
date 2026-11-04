import {
  TruckFuelType,
  getTruckFuelProfile,
  normalizeTruckFuelType,
} from './fuel-type';

describe('canonical truck fuel / energy model', () => {
  it('supports every required energy type distinctly', () => {
    expect(Object.values(TruckFuelType)).toEqual([
      'DIESEL',
      'HVO',
      'BIODIESEL',
      'CNG',
      'LNG',
      'LPG',
      'ELECTRIC',
      'HYDROGEN_FCEV',
      'HYDROGEN_ICE',
      'GASOLINE',
      'HYBRID_DIESEL',
      'HYBRID_GASOLINE',
      'OTHER',
    ]);
  });

  it('keeps HVO, biodiesel, CNG, LNG and LPG distinct', () => {
    expect(normalizeTruckFuelType('hvo100')).toBe('HVO');
    expect(normalizeTruckFuelType('biodiesel')).toBe('BIODIESEL');
    expect(normalizeTruckFuelType('cng')).toBe('CNG');
    expect(normalizeTruckFuelType('lng')).toBe('LNG');
    expect(normalizeTruckFuelType('autogas')).toBe('LPG');
  });

  it('keeps hydrogen fuel cell and hydrogen combustion distinct', () => {
    expect(normalizeTruckFuelType('hydrogen_fcev')).toBe('HYDROGEN_FCEV');
    expect(normalizeTruckFuelType('hydrogen_ice')).toBe('HYDROGEN_ICE');
    expect(normalizeTruckFuelType('fcev')).toBe('HYDROGEN_FCEV');
  });

  it('does not guess ambiguous legacy hybrid or hydrogen values', () => {
    expect(normalizeTruckFuelType('hybrid')).toBeNull();
    expect(normalizeTruckFuelType('hydrogen')).toBeNull();
  });

  it('does not assign Diesel to empty or missing legacy values', () => {
    expect(normalizeTruckFuelType(null)).toBeNull();
    expect(normalizeTruckFuelType(undefined)).toBeNull();
    expect(normalizeTruckFuelType('')).toBeNull();
    expect(normalizeTruckFuelType('unknown-value')).toBeNull();
  });

  it('uses the correct consumption unit per energy type', () => {
    expect(getTruckFuelProfile('DIESEL')?.unit).toBe('L/100 km');
    expect(getTruckFuelProfile('LNG')?.unit).toBe('kg/100 km');
    expect(getTruckFuelProfile('ELECTRIC')?.unit).toBe('kWh/100 km');
    expect(getTruckFuelProfile('HYDROGEN_FCEV')?.unit).toBe('kg/100 km');
  });

  it('leaves unconfigured emission factors unavailable', () => {
    expect(getTruckFuelProfile('ELECTRIC')?.factorKgPerUnit).toBeNull();
    expect(getTruckFuelProfile('HVO')?.factorKgPerUnit).toBeNull();
    expect(getTruckFuelProfile('HYBRID_DIESEL')?.factorKgPerUnit).toBeNull();
    expect(getTruckFuelProfile('DIESEL')?.factorKgPerUnit).toBe(2.68);
  });
});
