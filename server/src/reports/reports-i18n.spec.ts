import { ROWS, FR_ROWS, UNIT_ROWS, localizeText, localizeUnit, normalizeLocale } from './reports-i18n';

describe('reports-i18n', () => {
  it('normalizes the five TMS locales (ro/en/nl/fr/de)', () => {
    expect(normalizeLocale('ro')).toBe('ro');
    expect(normalizeLocale('ro-RO')).toBe('ro');
    expect(normalizeLocale('en')).toBe('en');
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('nl')).toBe('nl');
    expect(normalizeLocale('nl-NL')).toBe('nl');
    expect(normalizeLocale('fr')).toBe('fr');
    expect(normalizeLocale('fr-FR')).toBe('fr');
    expect(normalizeLocale('de')).toBe('de');
    expect(normalizeLocale('pl')).toBe('en');
    expect(normalizeLocale(undefined)).toBe('en');
  });

  it('covers every catalogue string in French and every other language', () => {
    const frKeys = new Set(FR_ROWS.map(([key]) => key));
    const missing: string[] = [];
    for (const [key] of ROWS) {
      if (!frKeys.has(key)) missing.push(`${key} -> fr (no row)`);
      for (const l of ['ro', 'nl', 'de', 'fr'] as const) {
        const tr = localizeText(key, l);
        if (!tr || tr.trim().length === 0) missing.push(`${key} -> ${l}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('provides a localized unit in every language', () => {
    const missing: string[] = [];
    for (const [key] of UNIT_ROWS) {
      for (const l of ['ro', 'en', 'nl', 'fr', 'de'] as const) {
        const tr = localizeUnit(key, l);
        if (!tr || tr.trim().length === 0) missing.push(`${key} -> ${l}`);
      }
    }
    expect(missing).toEqual([]);
  });
});