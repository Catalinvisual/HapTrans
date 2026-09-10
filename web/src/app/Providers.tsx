'use client';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppToaster } from '@/components/Toast/AppToaster';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      {children}
      <AppToaster />
    </LanguageProvider>
  );
}
