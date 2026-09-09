'use client';

import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hapcargo/ui';
import { useLocale, NAMESPACES } from '../../i18n';
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '@hapcargo/shared';

export function LocaleSwitcher() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation(NAMESPACES);

  return (
    <Select
      value={locale}
      onValueChange={(v) => {
        if ((SUPPORTED_LOCALES as readonly string[]).includes(v)) {
          setLocale(v as Locale);
        }
      }}
    >
      <SelectTrigger className="h-8 w-40" aria-label={t('locale:select')}>
        <SelectValue placeholder={t('locale:select')} />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_LOCALES.map((l) => (
          <SelectItem key={l} value={l}>
            {LOCALE_META[l].native}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
