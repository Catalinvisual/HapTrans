import { completeRo } from './i18n/completeRo';
import { completeEn } from './i18n/completeEn';
import { completeNl } from './i18n/completeNl';
import { completeDe } from './i18n/completeDe';
import { completeFr } from './i18n/completeFr';
import { completeEs } from './i18n/completeEs';
import { completePl } from './i18n/completePl';
import { dynamicGapsResources } from './i18n/dynamicGaps';
import { hardcodedGapsResources } from './i18n/hardcodedGaps';

/**
 * Keys that used to exist only as inline translation defaults in the code, so
 * every language other than the one the fallback was written in kept showing
 * that text. Merged after the core bundles and before langOverrides, which keep
 * the last word.
 */
export const completenessResources: Record<string, Record<string, string>> = {
  ro: { ...completeRo, ...dynamicGapsResources.ro, ...hardcodedGapsResources.ro },
  en: { ...completeEn, ...dynamicGapsResources.en, ...hardcodedGapsResources.en },
  nl: { ...completeNl, ...dynamicGapsResources.nl, ...hardcodedGapsResources.nl },
  de: { ...completeDe, ...dynamicGapsResources.de, ...hardcodedGapsResources.de },
  fr: { ...completeFr, ...dynamicGapsResources.fr, ...hardcodedGapsResources.fr },
  es: { ...completeEs, ...dynamicGapsResources.es, ...hardcodedGapsResources.es },
  pl: { ...completePl, ...dynamicGapsResources.pl, ...hardcodedGapsResources.pl },
};
