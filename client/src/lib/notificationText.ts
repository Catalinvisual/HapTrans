import { countryNames } from './countries';

/**
 * Notification bodies are stored server-side in whatever language the event was
 * produced (route text, status text, document names). Country names inside them
 * therefore arrive in one of the seven TMS languages and must be shown in the
 * language the dispatcher is using, exactly like the rest of the interface.
 *
 * The index is built once from the shared country list: every localized name is
 * matched case-insensitively and replaced by the target-language name, longest
 * names first so "Bosnia and Herzegovina" wins over "Bosnia".
 */

const SUPPORTED: Record<string, string> = { ro: 'ro', en: 'en', nl: 'nl', de: 'de', fr: 'fr', es: 'es', pl: 'pl' };

let matcher: { regex: RegExp; lookup: Map<string, string> } | null = null;

function getMatcher() {
  if (matcher) return matcher;
  const lookup = new Map<string, string>();
  for (const [code, names] of Object.entries(countryNames)) {
    for (const value of Object.values(names)) {
      const name = String(value || '').trim();
      if (!name) continue;
      lookup.set(name.toLowerCase(), code);
    }
    lookup.set(code.toLowerCase(), code);
  }
  const names = [...lookup.keys()]
    .filter((name) => name.length > 2 && !/^[a-z]{2,3}$/.test(name))
    .sort((a, b) => b.length - a.length)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const regex = new RegExp(`(?<![\\p{L}])(${names.join('|')})(?![\\p{L}])`, 'giu');
  matcher = { regex, lookup };
  return matcher;
}

export function translateCountryNames(text: string, lang: string): string {
  if (!text) return text;
  const locale = SUPPORTED[String(lang || '').toLowerCase()] || 'en';
  const { regex, lookup } = getMatcher();
  return text.replace(regex, (found) => {
    const code = lookup.get(found.toLowerCase());
    if (!code) return found;
    return countryNames[code]?.[locale] || found;
  });
}
