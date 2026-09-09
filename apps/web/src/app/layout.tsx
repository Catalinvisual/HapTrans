import type { Metadata } from 'next';
import { ClientLayout } from './ClientLayout';
import './globals.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'HAP CARGO TMS',
  description: 'HAP CARGO Transport Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}