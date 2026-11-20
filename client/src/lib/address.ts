import { countryIso, countryName } from './countries';

export interface AddressParts {
  companyName?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

const norm = (value?: string | null) =>
  String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const pieces = (address?: string | null) =>
  String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

const mentions = (list: string[], value?: string | null) => {
  const needle = norm(value);
  if (!needle) return false;
  return list.some((item) => {
    const hay = norm(item);
    return hay === needle || hay.endsWith(` ${needle}`) || hay.startsWith(`${needle} `) || hay.includes(` ${needle} `);
  });
};

const countryAliases = (value?: string | null) => {
  const iso = countryIso(value);
  if (!iso) return [];
  return [
    value,
    iso,
    countryName(iso, 'en'),
    countryName(iso, 'nl'),
    countryName(iso, 'ro'),
    countryName(iso, 'de'),
  ].filter(Boolean) as string[];
};

/**
 * One address line in the order the TMS reads it: company, street, postal code
 * and city together, country last.
 *
 * The autocomplete label already carries the city (and often the country), so
 * the structured city/country are only appended when the label does not show
 * them. That is what removes the duplicated "Eindhoven, Eindhoven".
 */
export function composeAddress({ companyName, address, postalCode, city, country }: AddressParts): string {
  const segments = pieces(address);
  const postal = String(postalCode || '').trim();
  const cityName = String(city || '').trim();

  // A postal code belongs in front of its city, not at the end of the line.
  if (postal && !mentions(segments, postal)) {
    const cityIndex = cityName ? segments.findIndex((segment) => mentions([segment], cityName)) : -1;
    if (cityIndex >= 0) segments[cityIndex] = `${postal} ${segments[cityIndex]}`.trim();
    else segments.push(postal);
  }
  if (cityName && !mentions(segments, cityName)) segments.push(cityName);

  const aliases = countryAliases(country);
  if (aliases.length && !aliases.some((alias) => mentions(segments, alias))) {
    segments.push(String(country).trim());
  }

  const body = segments.join(', ');
  const head = String(companyName || '').trim();
  if (!head) return body || '—';
  if (mentions([body], head)) return body || head;
  return body ? `${head}, ${body}` : head;
}

/**
 * Short place for route cells and cards: "030167 Eindhoven (NL)".
 * The country is always the ISO code so two cities with the same name in
 * different countries stay distinguishable.
 */
export function composeCityLine({ address, postalCode, city, country }: Pick<AddressParts, 'address' | 'postalCode' | 'city' | 'country'>): string {
  const cityName = String(city || '').trim() || pieces(address)[0] || '';
  const postal = String(postalCode || '').trim();
  const iso = countryIso(country);
  const place = [postal, cityName].filter(Boolean).join(' ');
  if (!place) return iso || '—';
  return iso ? `${place} (${iso})` : place;
}

/** Everything a search box should match for one stop. */
export function addressSearchText(stop?: AddressParts | null): string {
  if (!stop) return '';
  return [stop.companyName, stop.address, stop.postalCode, stop.city, stop.country]
    .filter(Boolean)
    .join(' ');
}
