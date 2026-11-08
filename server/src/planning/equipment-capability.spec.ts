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

  it('does not treat external height as mega capability', () => {
    const result = assessEquipment(frigoTruck, frigoTrailer, 'Camion mega');
    expect(result.code).toBe('mega');
    expect(result.supported).toBe(false);
    expect(result.verified).toBe(true);
    expect(result.reason).toContain('external vehicle height does not prove it');
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
});
