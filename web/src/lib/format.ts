import { useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const LOCALES = {
  RO: 'ro-RO',
  EN: 'en-GB',
  NL: 'nl-NL',
  DE: 'de-DE',
  FR: 'fr-FR',
  ES: 'es-ES'
} as const;

export const localeForLang = (lang: string): string =>
  LOCALES[lang as keyof typeof LOCALES] || 'en-GB';

export const useFormatters = () => {
  const { lang } = useLanguage();

  return useMemo(() => {
    const locale = localeForLang(lang);

    const fmtNum = (value: number, decimals = 0) =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: Math.max(decimals, 2)
      }).format(value);

    const fmtMoney = (value: number, currency = 'EUR') =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(value);

    return { fmtNum, fmtMoney, locale };
  }, [lang]);
};
