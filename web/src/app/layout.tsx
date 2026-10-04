import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./premium.css";
import { Providers } from './Providers';
import BackToTop from '@/components/BackToTop/BackToTop';

export const metadata: Metadata = {
  title: "HapCargo - Transport internațional, la standarde profesionale.",
  description: "Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală. Suntem o echipă tânără, cu o poftă imensă de creștere și inovație în logistică.",
  verification: {
    google: "GSC_MOCK_VERIFICATION_STRING",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <head>
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <BackToTop />
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-MOCKTRACKING" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-MOCKTRACKING');
          `}
        </Script>
      </body>
    </html>
  );
}
