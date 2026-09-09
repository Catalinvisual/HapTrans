'use client';

import * as React from 'react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import {
  RESOURCES,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  LOCALE_META,
  type Locale,
} from '@hapcargo/shared';
import { createApiClient } from '@hapcargo/api-client';

const LOCALE_STORE_KEY = 'hapcargo.locale';

const NAMESPACES = [
  'common',
  'nav',
  'auth',
  'health',
  'locale',
  'actions',
  'states',
  'errors',
  'search',
  'command',
  'tables',
  'forms',
  'accessibility',
  'notifications',
  'settings',
  'dashboard',
  'masterData',
  'customers',
] as const;

if (typeof window !== 'undefined') {
  i18next.use(initReactI18next).init({
    resources: RESOURCES as unknown as Record<string, Record<string, Record<string, string>>>,
    lng: DEFAULT_LOCALE,
    fallbackLng: DEFAULT_LOCALE,
    interpolation: { escapeValue: false },
    defaultNS: 'common',
    ns: NAMESPACES,
    returnEmptyString: false,
    returnNull: false,
  });

  if (process.env.NODE_ENV === 'development') {
    i18next.on('missingKey', (lng, ns, key) => {
      console.warn(`[i18n] Missing translation key: ${ns}:${key} (language: ${lng})`);
    });
  }
}

export function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = window.localStorage.getItem(LOCALE_STORE_KEY);
  if (stored && (SUPPORTED_LOCALES as readonly string[]).includes(stored)) {
    return stored as Locale;
  }
  return DEFAULT_LOCALE;
}

const LocaleContext = React.createContext<{ locale: Locale; setLocale: (l: Locale) => void }>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = React.useState<Locale>(DEFAULT_LOCALE);
  const [, setReady] = React.useState(false);

  React.useEffect(() => {
    setLocaleState(readStoredLocale());
    void i18next.changeLanguage(readStoredLocale());
    setReady(true);
  }, []);

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LOCALE_STORE_KEY, l);
    }
    void i18next.changeLanguage(l);
  }, []);

  const value = React.useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <I18nextProvider i18n={i18next}>
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    </I18nextProvider>
  );
}

export function useLocale() {
  return React.useContext(LocaleContext);
}

export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiClient = createApiClient({
  baseUrl: `${apiUrl}/api/v1`,
  maxRetries: 1,
});

export { i18next, LOCALE_META, DEFAULT_LOCALE, SUPPORTED_LOCALES, NAMESPACES };
export type { Locale };
