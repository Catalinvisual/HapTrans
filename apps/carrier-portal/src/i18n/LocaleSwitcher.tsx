'use client';

import { useRef } from 'react';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale } from '@hapcargo/shared';
import { useTranslation } from 'react-i18next';

export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <select
      ref={selectRef}
      defaultValue={i18n.language}
      onChange={(e) => void i18n.changeLanguage(e.target.value as Locale)}
      className="h-8 rounded-md border border-input bg-white px-2 text-sm"
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_META[l].native}
        </option>
      ))}
    </select>
  );
}
