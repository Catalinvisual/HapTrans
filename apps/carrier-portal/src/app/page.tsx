'use client';

import { useTranslation } from 'react-i18next';
import { LocaleSwitcher } from '../i18n/LocaleSwitcher';

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b bg-white px-4">
        <span className="text-sm font-semibold">{t('common.appName')}</span>
        <LocaleSwitcher />
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Carrier Portal</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Carrier functionality (assigned trips, offers, POD, invoicing) is
          implemented in a later task.
        </p>
      </section>
    </main>
  );
}
