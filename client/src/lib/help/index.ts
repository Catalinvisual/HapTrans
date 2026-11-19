import { ro } from './ro';
import { en } from './en';
import { nl } from './nl';
import { de } from './de';
import { fr } from './fr';
import { es } from './es';
import { pl } from './pl';
import type { HelpLocaleText } from './types';

export const HELP_LOCALES = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'pl'] as const;
export type HelpLang = (typeof HELP_LOCALES)[number];

export const HELP_CONTENT: Record<HelpLang, HelpLocaleText> = { ro, en, nl, de, fr, es, pl };

// Flat guide_* keys merged into the main i18n catalogue, so the header button
// and the page chrome are translated by the same mechanism as the rest of the app.
export const helpResources: Record<string, Record<string, string>> = Object.fromEntries(
  HELP_LOCALES.map((lang) => [lang, HELP_CONTENT[lang].ui]),
);

export function resolveHelpLang(language: string | undefined): HelpLang {
  const short = String(language || 'ro').slice(0, 2).toLowerCase();
  return (HELP_LOCALES as readonly string[]).includes(short) ? (short as HelpLang) : 'en';
}

export function helpText(language: string | undefined): HelpLocaleText {
  return HELP_CONTENT[resolveHelpLang(language)];
}

export { HELP_STRUCTURE, HELP_CHAPTER_COUNT } from './structure';
export type { HelpBlock, HelpChapterText, HelpCategoryText, HelpLocaleText, DiagramVariant } from './types';
