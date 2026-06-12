import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from './Providers';

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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
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
