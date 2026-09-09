'use client';

import * as React from 'react';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { RESOURCES, DEFAULT_LOCALE } from '@hapcargo/shared';
import { createApiClient } from '@hapcargo/api-client';

i18next.use(initReactI18next).init({
  resources: RESOURCES as unknown as Record<string, Record<string, Record<string, string>>>,
  lng: DEFAULT_LOCALE,
  fallbackLng: DEFAULT_LOCALE,
  interpolation: { escapeValue: false },
});

export const apiClient = createApiClient({
  baseUrl: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/api/v1`,
  maxRetries: 1,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
