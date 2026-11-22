import { ISO3_TO_ISO2, ISO_COUNTRY_CODES, isIsoCountryCode } from './isoCountries';

export const countryNames: Record<string, Record<string, string>> = {
  RO: { ro: 'România', en: 'Romania', nl: 'Roemenië', de: 'Rumänien', fr: 'Roumanie', es: 'Rumanía', pl: 'Rumunia' },
  DE: { ro: 'Germania', en: 'Germany', nl: 'Duitsland', de: 'Deutschland', fr: 'Allemagne', es: 'Alemania', pl: 'Niemcy' },
  NL: { ro: 'Olanda', en: 'Netherlands', nl: 'Nederland', de: 'Niederlande', fr: 'Pays-Bas', es: 'Países Bajos', pl: 'Holandia' },
  FR: { ro: 'Franța', en: 'France', nl: 'Frankrijk', de: 'Frankreich', fr: 'France', es: 'Francia', pl: 'Francja' },
  BE: { ro: 'Belgia', en: 'Belgium', nl: 'België', de: 'Belgien', fr: 'Belgique', es: 'Bélgica', pl: 'Belgia' },
  PL: { ro: 'Polonia', en: 'Poland', nl: 'Polen', de: 'Polen', fr: 'Pologne', es: 'Polonia', pl: 'Polska' },
  HU: { ro: 'Ungaria', en: 'Hungary', nl: 'Hongarije', de: 'Ungarn', fr: 'Hongrie', es: 'Hungría', pl: 'Węgry' },
  IT: { ro: 'Italia', en: 'Italy', nl: 'Italië', de: 'Italien', fr: 'Italie', es: 'Italia', pl: 'Włochy' },
  AT: { ro: 'Austria', en: 'Austria', nl: 'Oostenrijk', de: 'Österreich', fr: 'Autriche', es: 'Austria', pl: 'Austria' },
  ES: { ro: 'Spania', en: 'Spain', nl: 'Spanje', de: 'Spanien', fr: 'Espagne', es: 'España', pl: 'Hiszpania' },
  CZ: { ro: 'Cehia', en: 'Czechia', nl: 'Tsjechië', de: 'Tschechien', fr: 'Tchéquie', es: 'Chequia', pl: 'Czechy' },
  HR: { ro: 'Croația', en: 'Croatia', nl: 'Kroatië', de: 'Kroatien', fr: 'Croatie', es: 'Croacia', pl: 'Chorwacja' },
  SK: { ro: 'Slovacia', en: 'Slovakia', nl: 'Slowakije', de: 'Slowakei', fr: 'Slovaquie', es: 'Eslovaquia', pl: 'Słowacja' },
  BG: { ro: 'Bulgaria', en: 'Bulgaria', nl: 'Bulgarije', de: 'Bulgarien', fr: 'Bulgarie', es: 'Bulgaria', pl: 'Bułgaria' },
  SI: { ro: 'Slovenia', en: 'Slovenia', nl: 'Slovenië', de: 'Slowenien', fr: 'Slovénie', es: 'Eslovenia', pl: 'Słowenia' },
  RS: { ro: 'Serbia', en: 'Serbia', nl: 'Servië', de: 'Serbien', fr: 'Serbie', es: 'Serbia', pl: 'Serbia' },
  BA: { ro: 'Bosnia și Herțegovina', en: 'Bosnia and Herzegovina', nl: 'Bosnië en Herzegovina', de: 'Bosnien und Herzegowina', fr: 'Bosnie-Herzégovine', es: 'Bosnia y Herzegovina', pl: 'Bośnia i Hercegowina' },
  MK: { ro: 'Macedonia de Nord', en: 'North Macedonia', nl: 'Noord-Macedonië', de: 'Nordmazedonien', fr: 'Macédoine du Nord', es: 'Macedonia del Norte', pl: 'Macedonia Północna' },
  AL: { ro: 'Albania', en: 'Albania', nl: 'Albanië', de: 'Albanien', fr: 'Albanie', es: 'Albania', pl: 'Albania' },
  GR: { ro: 'Grecia', en: 'Greece', nl: 'Griekenland', de: 'Griechenland', fr: 'Grèce', es: 'Grecia', pl: 'Grecja' },
  TR: { ro: 'Turcia', en: 'Turkey', nl: 'Turkije', de: 'Türkei', fr: 'Turquie', es: 'Turquía', pl: 'Turcja' },
  UA: { ro: 'Ucraina', en: 'Ukraine', nl: 'Oekraïne', de: 'Ukraine', fr: 'Ukraine', es: 'Ucrania', pl: 'Ukraina' },
  CH: { ro: 'Elveția', en: 'Switzerland', nl: 'Zwitserland', de: 'Schweiz', fr: 'Suisse', es: 'Suiza', pl: 'Szwajcaria' },
  LU: { ro: 'Luxemburg', en: 'Luxembourg', nl: 'Luxemburg', de: 'Luxemburg', fr: 'Luxembourg', es: 'Luxemburgo', pl: 'Luksemburg' },
  DK: { ro: 'Danemarca', en: 'Denmark', nl: 'Denemarken', de: 'Dänemark', fr: 'Danemark', es: 'Dinamarca', pl: 'Dania' },
  SE: { ro: 'Suedia', en: 'Sweden', nl: 'Zweden', de: 'Schweden', fr: 'Suède', es: 'Suecia', pl: 'Szwecja' },
  NO: { ro: 'Norvegia', en: 'Norway', nl: 'Noorwegen', de: 'Norwegen', fr: 'Norvège', es: 'Noruega', pl: 'Norwegia' },
  FI: { ro: 'Finlanda', en: 'Finland', nl: 'Finland', de: 'Finnland', fr: 'Finlande', es: 'Finlandia', pl: 'Finlandia' },
  LT: { ro: 'Lituania', en: 'Lithuania', nl: 'Litouwen', de: 'Litauen', fr: 'Lituanie', es: 'Lituania', pl: 'Litwa' },
  LV: { ro: 'Letonia', en: 'Latvia', nl: 'Letland', de: 'Lettland', fr: 'Lettonie', es: 'Letonia', pl: 'Łotwa' },
  EE: { ro: 'Estonia', en: 'Estonia', nl: 'Estland', de: 'Estland', fr: 'Estonie', es: 'Estonia', pl: 'Estonia' },
  IE: { ro: 'Irlanda', en: 'Ireland', nl: 'Ierland', de: 'Irland', fr: 'Irlande', es: 'Irlanda', pl: 'Irlandia' },
  PT: { ro: 'Portugalia', en: 'Portugal', nl: 'Portugal', de: 'Portugal', fr: 'Portugal', es: 'Portugal', pl: 'Portugalia' },
  GB: { ro: 'Marea Britanie', en: 'United Kingdom', nl: 'Verenigd Koninkrijk', de: 'Vereinigtes Königreich', fr: 'Royaume-Uni', es: 'Reino Unido', pl: 'Wielka Brytania' },
};

export type CountryLang = 'ro' | 'en' | 'nl' | 'de' | 'fr' | 'es' | 'pl';

const LOCALES: Record<CountryLang, string> = {
  ro: 'ro-RO', en: 'en-GB', nl: 'nl-NL', de: 'de-DE', fr: 'fr-FR', es: 'es-ES', pl: 'pl-PL',
};

/**
 * Codes carriers and authorities use that ISO 3166-1 does not assign:
 * UK is the everyday alpha-2 for the United Kingdom, EL the EU-institution
 * code for Greece, FX the legacy code for metropolitan France and XK Kosovo.
 */
const ALPHA2_ALIASES: Record<string, string> = {
  UK: 'GB', FX: 'FR', EL: 'GR', XK: 'XK',
};

const ISO3_ALIASES: Record<string, string> = { XKX: 'XK' };

/** Spellings the office and the geocoder use instead of the ICU/ISO name. Keys are normalized. */
const COUNTRY_ALIASES: Record<string, string> = {
  uk: 'GB',
  greatbritain: 'GB',
  holland: 'NL',
  thenetherlands: 'NL',
  usa: 'US',
  unitedstates: 'US',
  unitedstatesofamerica: 'US',
  uae: 'AE',
  unitedarabemirates: 'AE',
  southkorea: 'KR',
  republicofkorea: 'KR',
  northkorea: 'KP',
  czechrepublic: 'CZ',
  macedonia: 'MK',
  northmacedonia: 'MK',
  bosnia: 'BA',
  ivorycoast: 'CI',
  cotedivoire: 'CI',
  russia: 'RU',
  russianfederation: 'RU',
  vaticancity: 'VA',
  holysee: 'VA',
  turkiye: 'TR',
};

/** Case-, accent- and punctuation-insensitive key for a country name. */
function countryKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const displays = new Map<string, any>();

/** One Intl.DisplayNames per language: building it is not free and lists call this per row. */
function regionDisplay(lang: CountryLang) {
  if (!displays.has(lang)) {
    let display: any = null;
    try {
      const DisplayNames = (Intl as any).DisplayNames;
      display = DisplayNames ? new DisplayNames([LOCALES[lang] || 'en-GB'], { type: 'region' }) : null;
    } catch {
      display = null;
    }
    displays.set(lang, display);
  }
  return displays.get(lang);
}

/** Localized country name; the hand-written table wins, ICU covers every other country. */
export function countryName(code: string, lang: CountryLang = 'ro'): string {
  const iso = canonicalCountryCode(code);
  if (!iso) return String(code ?? '').trim();
  const handwritten = countryNames[iso]?.[lang];
  if (handwritten) return handwritten;
  const display = regionDisplay(lang);
  const localized = display?.of(iso);
  return localized && localized !== iso && localized !== 'Unknown Region' ? localized : iso;
}

let countryNameIndex: Map<string, string> | null = null;

/** Every name we accept for a country, in the seven interface languages, mapped to its ISO-2 code. */
function getCountryNameIndex(): Map<string, string> {
  if (countryNameIndex) return countryNameIndex;
  const index = new Map<string, string>();
  for (const [code, names] of Object.entries(countryNames)) {
    for (const name of Object.values(names)) {
      const key = countryKey(name);
      if (key) index.set(key, code);
    }
  }
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) index.set(alias, code);
  for (const lang of Object.keys(LOCALES) as CountryLang[]) {
    const display = regionDisplay(lang);
    if (!display) continue;
    for (const code of ISO_COUNTRY_CODES) {
      const name = display.of(code);
      if (!name) continue;
      const key = countryKey(name);
      if (!key || key === code.toLowerCase()) continue;
      if (!index.has(key)) index.set(key, code);
    }
  }
  countryNameIndex = index;
  return index;
}

/**
 * One canonical 2-letter code for an ISO2/ISO3 code or a country name in any
 * of the seven languages. Only officially assigned ISO 3166-1 codes (plus the
 * documented aliases above) are returned: an unknown place name such as
 * "Unknown", "UN" or "Nowhere" resolves to null instead of being cut into a
 * fake code such as "UN" or "NO".
 */
export function canonicalCountryCode(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const alpha2Alias = ALPHA2_ALIASES[upper];
  if (alpha2Alias) return alpha2Alias;
  if (isIsoCountryCode(upper)) return upper;
  const iso3Alias = ISO3_ALIASES[upper];
  if (iso3Alias) return iso3Alias;
  const iso3 = ISO3_TO_ISO2[upper];
  if (iso3) return iso3;
  const key = countryKey(raw);
  if (!key) return null;
  return COUNTRY_ALIASES[key] || getCountryNameIndex().get(key) || null;
}

/** Normalize a country value (ISO code or localized name) to a 2-letter ISO code. */
export function countryIso(value: string | null | undefined): string | null {
  return canonicalCountryCode(value);
}
