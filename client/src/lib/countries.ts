export const countryNames: Record<string, Record<string, string>> = {
  RO: { ro: 'România', en: 'Romania', nl: 'Roemenië', de: 'Rumänien' },
  DE: { ro: 'Germania', en: 'Germany', nl: 'Duitsland', de: 'Deutschland' },
  NL: { ro: 'Olanda', en: 'Netherlands', nl: 'Nederland', de: 'Niederlande' },
  FR: { ro: 'Franța', en: 'France', nl: 'Frankrijk', de: 'Frankreich' },
  BE: { ro: 'Belgia', en: 'Belgium', nl: 'België', de: 'Belgien' },
  PL: { ro: 'Polonia', en: 'Poland', nl: 'Polen', de: 'Polen' },
  HU: { ro: 'Ungaria', en: 'Hungary', nl: 'Hongarije', de: 'Ungarn' },
  IT: { ro: 'Italia', en: 'Italy', nl: 'Italië', de: 'Italien' },
  AT: { ro: 'Austria', en: 'Austria', nl: 'Oostenrijk', de: 'Österreich' },
  ES: { ro: 'Spania', en: 'Spain', nl: 'Spanje', de: 'Spanien' },
  CZ: { ro: 'Cehia', en: 'Czechia', nl: 'Tsjechië', de: 'Tschechien' },
  HR: { ro: 'Croația', en: 'Croatia', nl: 'Kroatië', de: 'Kroatien' },
  SK: { ro: 'Slovacia', en: 'Slovakia', nl: 'Slowakije', de: 'Slowakei' },
  BG: { ro: 'Bulgaria', en: 'Bulgaria', nl: 'Bulgarije', de: 'Bulgarien' },
  SI: { ro: 'Slovenia', en: 'Slovenia', nl: 'Slovenië', de: 'Slowenien' },
  RS: { ro: 'Serbia', en: 'Serbia', nl: 'Servië', de: 'Serbien' },
  BA: { ro: 'Bosnia și Herțegovina', en: 'Bosnia and Herzegovina', nl: 'Bosnië en Herzegovina', de: 'Bosnien und Herzegowina' },
  MK: { ro: 'Macedonia de Nord', en: 'North Macedonia', nl: 'Noord-Macedonië', de: 'Nordmazedonien' },
  AL: { ro: 'Albania', en: 'Albania', nl: 'Albanië', de: 'Albanien' },
  GR: { ro: 'Grecia', en: 'Greece', nl: 'Griekenland', de: 'Griechenland' },
  TR: { ro: 'Turcia', en: 'Turkey', nl: 'Turkije', de: 'Türkei' },
  UA: { ro: 'Ucraina', en: 'Ukraine', nl: 'Oekraïne', de: 'Ukraine' },
  CH: { ro: 'Elveția', en: 'Switzerland', nl: 'Zwitserland', de: 'Schweiz' },
  LU: { ro: 'Luxemburg', en: 'Luxembourg', nl: 'Luxemburg', de: 'Luxemburg' },
  DK: { ro: 'Danemarca', en: 'Denmark', nl: 'Denemarken', de: 'Dänemark' },
  SE: { ro: 'Suedia', en: 'Sweden', nl: 'Zweden', de: 'Schweden' },
  NO: { ro: 'Norvegia', en: 'Norway', nl: 'Noorwegen', de: 'Norwegen' },
  FI: { ro: 'Finlanda', en: 'Finland', nl: 'Finland', de: 'Finnland' },
  LT: { ro: 'Lituania', en: 'Lithuania', nl: 'Litouwen', de: 'Litauen' },
  LV: { ro: 'Letonia', en: 'Latvia', nl: 'Letland', de: 'Lettland' },
  EE: { ro: 'Estonia', en: 'Estonia', nl: 'Estland', de: 'Estland' },
  IE: { ro: 'Irlanda', en: 'Ireland', nl: 'Ierland', de: 'Irland' },
  PT: { ro: 'Portugalia', en: 'Portugal', nl: 'Portugal', de: 'Portugal' },
  GB: { ro: 'Marea Britanie', en: 'United Kingdom', nl: 'Verenigd Koninkrijk', de: 'Vereinigtes Königreich' },
};

export function countryName(code: string, lang: 'ro' | 'en' | 'nl' | 'de' = 'ro'): string {
  return countryNames[code]?.[lang] || code;
}

const nameToCode: Record<string, string> = {};
Object.entries(countryNames).forEach(([code, names]) => {
  nameToCode[code.toLowerCase()] = code;
  Object.values(names).forEach(n => { nameToCode[n.toLowerCase()] = code; });
});

/**
 * Normalize a country value (ISO code or localized name) to a 2-letter ISO code.
 * Returns null for empty input.
 */
export function countryIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (/^[A-Za-z]{2}$/.test(v)) return v.toUpperCase();
  return nameToCode[v.toLowerCase()] || v.slice(0, 2).toUpperCase();
}