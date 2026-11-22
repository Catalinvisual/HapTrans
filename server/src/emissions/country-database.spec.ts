import {
  COUNTRY_BY_CODE, EUROPEAN_COUNTRIES, countryName, isKnownCountry, resolveCountryCode,
} from './country-database';

const REQUIRED = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE',
  'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'NO', 'IS', 'LI', 'CH', 'GB', 'AL', 'BA', 'XK', 'ME', 'MK', 'RS', 'MD', 'UA', 'BY',
  'RU', 'TR', 'GE', 'AM', 'AZ', 'AD', 'MC', 'SM', 'VA',
];

describe('European country registry', () => {
  it('covers every EU member state and the other requested European jurisdictions', () => {
    for (const code of REQUIRED) {
      expect(isKnownCountry(code)).toBe(true);
    }
  });

  it('contains the 27 EU member states exactly once', () => {
    const eu = EUROPEAN_COUNTRIES.filter((c) => c.euMember).map((c) => c.code);
    expect(new Set(eu).size).toBe(eu.length);
    expect(eu).toHaveLength(27);
  });

  it('has unique ISO codes and no duplicate records', () => {
    const codes = EUROPEAN_COUNTRIES.map((c) => c.code);
    expect(new Set(codes).size).toBe(codes.length);
    const iso3 = EUROPEAN_COUNTRIES.map((c) => c.iso3);
    expect(new Set(iso3).size).toBe(iso3.length);
    expect(Object.keys(COUNTRY_BY_CODE)).toHaveLength(EUROPEAN_COUNTRIES.length);
  });

  it('has a name in all seven languages for every jurisdiction', () => {
    for (const country of EUROPEAN_COUNTRIES) {
      for (const language of ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'] as const) {
        expect(country.names[language]).toBeTruthy();
        expect(country.names[language].trim().length).toBeGreaterThan(1);
      }
    }
  });

  it('never invents a CO2 road-charging class', () => {
    for (const country of EUROPEAN_COUNTRIES) {
      if (country.roadCharging.co2ClassStatus === 'applicable') {
        expect(country.roadCharging.officialUrl).toBeTruthy();
        expect(country.roadCharging.verificationStatus).not.toBe('unverified');
      }
      if (country.roadCharging.verificationStatus === 'verified') {
        expect(country.roadCharging.lastVerifiedAt).toBeTruthy();
      }
    }
  });

  it('resolves ISO codes and localised names to ISO-2', () => {
    expect(resolveCountryCode('NL')).toBe('NL');
    expect(resolveCountryCode('nld')).toBe('NL');
    expect(resolveCountryCode('Netherlands')).toBe('NL');
    expect(resolveCountryCode('Nederland')).toBe('NL');
    expect(resolveCountryCode('Niemcy')).toBe('DE');
    expect(resolveCountryCode('Deutschland')).toBe('DE');
    expect(resolveCountryCode('Nowhere')).toBeNull();
    expect(resolveCountryCode('')).toBeNull();
  });

  it('localises country names', () => {
    expect(countryName('DE', 'ro')).toBe('Germania');
    expect(countryName('DE', 'pl')).toBe('Niemcy');
    expect(countryName('NL', 'nl')).toBe('Nederland');
    expect(countryName('XX', 'en')).toBeNull();
  });
});
