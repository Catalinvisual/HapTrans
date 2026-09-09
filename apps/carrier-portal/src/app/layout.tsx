import type { Metadata } from 'next';
import './globals.css';
import { I18nProvider } from '../i18n';

export const metadata: Metadata = {
  title: 'HAP CARGO — Carrier Portal',
  description: 'Carrier portal for HAP CARGO TMS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-secondary/30 text-foreground">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
