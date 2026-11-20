import {
  completesPostalCode,
  completePostalCodeInAddress,
  postalCodeKey,
} from './postal-code';

describe('completesPostalCode', () => {
  it('accepts the full Dutch code for its numeric prefix', () => {
    expect(completesPostalCode('5611', '5611 AB')).toBe(true);
    expect(completesPostalCode(' 5611 ', '5611AB')).toBe(true);
  });

  it('accepts a longer numeric code with the same prefix', () => {
    expect(completesPostalCode('500', '500001')).toBe(true);
  });

  it('never moves to another area', () => {
    expect(completesPostalCode('5611', '5612 AB')).toBe(false);
  });

  it('leaves complete or non-numeric codes alone', () => {
    expect(completesPostalCode('5611 AB', '5611 AB')).toBe(false);
    expect(completesPostalCode('5611 ab', '5611 AB')).toBe(false);
    expect(completesPostalCode('10115', '10115')).toBe(false);
    expect(completesPostalCode('1000-001', '1000-001')).toBe(false);
    expect(completesPostalCode('', '5611 AB')).toBe(false);
    expect(completesPostalCode('5611', '')).toBe(false);
  });
});

describe('completePostalCodeInAddress', () => {
  it('rewrites the short code in front of the city', () => {
    expect(
      completePostalCodeInAddress('Bd. Unirii nr.147, 5611 Eindhoven', '5611', '5611 AB', 'Eindhoven'),
    ).toBe('Bd. Unirii nr.147, 5611 AB Eindhoven');
  });

  it('rewrites a standalone segment even without the city', () => {
    expect(completePostalCodeInAddress('Industrieweg 4, 5611, NL', '5611', '5611 AB')).toBe(
      'Industrieweg 4, 5611 AB, NL',
    );
  });

  it('does not touch a house number that equals the digits', () => {
    expect(completePostalCodeInAddress('Bd. Unirii nr. 5611, București', '5611', '5611 AB', 'Eindhoven')).toBe(
      'Bd. Unirii nr. 5611, București',
    );
  });

  it('returns the address untouched when there is nothing to replace', () => {
    expect(completePostalCodeInAddress(null, '5611', '5611 AB')).toBeNull();
    expect(completePostalCodeInAddress('Bd. Unirii nr.147', '5611', '5611 AB')).toBe('Bd. Unirii nr.147');
  });
});

describe('postalCodeKey', () => {
  it('normalises case, spaces and punctuation', () => {
    expect(postalCodeKey(' 5611 ab ')).toBe('5611AB');
    expect(postalCodeKey('1000-001')).toBe('1000001');
    expect(postalCodeKey(null)).toBe('');
  });
});
