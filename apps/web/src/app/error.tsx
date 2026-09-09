'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@hapcargo/ui';
import { NAMESPACES } from '@/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation(NAMESPACES);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-lg font-semibold">{t('common:error')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={() => reset()}>{t('common:retry')}</Button>
    </main>
  );
}
