import { assessEquipment, canonicalEquipmentCode } from './equipment-capability';

const frigoTruck = {
  truckType: 'frigo',
  features: ['["GPS Tracking"]', 'adr'],
  heightCm: 400,
  widthCm: 255,
  lengthCm: 1300,
  axleCount: 2,
};
const frigoTrailer = { type: 'frigo', heightCm: null };
const megaTrailer = { type: 'mega', heightCm: 400 };
const plainTruck = { truckType: 'Camion' };

describe('equipment capability', () => {
  it('maps stored requirement labels to canonical codes in every supported language', () => {
    expect(canonicalEquipmentCode('Camion mega')).toBe('mega');
    expect(canonicalEquipmentCode('Mega Trailer')).toBe('mega');
    expect(canonicalEquipmentCode('Megatrailer')).toBe('mega');
    expect(canonicalEquipmentCode('Naczepa Mega')).toBe('mega');
    expect(canonicalEquipmentCode('Semiremorcă Mega')).toBe('mega');
    expect(canonicalEquipmentCode('Camion frigorific')).toBe('frigo');
    expect(canonicalEquipmentCode('Frigo')).toBe('frigo');
    expect(canonicalEquipmentCode('Hayon')).toBe('lift');
    expect(canonicalEquipmentCode('ADR')).toBe('adr');
  });

  it('does not treat external height or a frigo body as proof either way', () => {
    const result = assessEquipment(frigoTruck, { ...frigoTrailer, plateNumber: 'VL61TWZ' }, 'Camion mega');
    expect(result.code).toBe('mega');
    expect(result.supported).toBe(false);
    // A frigo trailer can also be a mega trailer; without a recorded internal
    // height this is unverifiable, so it must not block the assignment.
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('internal loading height is not recorded');
    expect(result.reason).toContain('VL61TWZ');
  });

  it('accepts a mega trailer for a mega requirement', () => {
    const result = assessEquipment(frigoTruck, megaTrailer, 'Camion mega');
    expect(result.supported).toBe(true);
    expect(result.verified).toBe(true);
  });

  it('reports mega as unverified when no trailer is assigned', () => {
    const result = assessEquipment(frigoTruck, null, 'Camion mega');
    expect(result.supported).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('no trailer is assigned');
  });

  it('keeps unknown requirement text unverified instead of silently passing', () => {
    const result = assessEquipment(frigoTruck, frigoTrailer, 'Some future body');
    expect(result.code).toBe('unknown');
    expect(result.supported).toBe(false);
    expect(result.verified).toBe(false);
  });

  it('matches frigo against the combination type', () => {
    const result = assessEquipment(frigoTruck, frigoTrailer, 'Frigo');
    expect(result.supported).toBe(true);
    expect(result.verified).toBe(true);
  });

  it('does not turn a mega-only body into a verified frigo incompatibility', () => {
    const result = assessEquipment(plainTruck, { ...megaTrailer, plateNumber: 'VL61TWZ' }, 'Camion frigorific');
    expect(result.code).toBe('frigo');
    expect(result.supported).toBe(false);
    // A mega trailer can also be refrigerated, so absence of the frigo token
    // proves nothing until the body type or features say otherwise.
    expect(result.verified).toBe(false);
    expect(result.reason).toContain('cannot be verified');
    expect(result.reason).toContain('VL61TWZ');
  });

  it('verifies a frigo incompatibility only for an explicitly non-refrigerated body', () => {
    const result = assessEquipment(plainTruck, { type: 'tautliner', plateNumber: 'AB12CDE' }, 'Frigo');
    expect(result.code).toBe('frigo');
    expect(result.supported).toBe(false);
    expect(result.verified).toBe(true);
    expect(result.reason).toContain('does not provide refrigeration');
  });

  it('accepts refrigeration recorded as a feature', () => {
    const result = assessEquipment(plainTruck, { type: 'mega', features: ['reefer'] }, 'Frigo');
    expect(result.supported).toBe(true);
    expect(result.verified).toBe(true);
  });
});
