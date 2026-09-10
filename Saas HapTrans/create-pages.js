const fs = require('fs');
const path = require('path');

function createPage(route, content) {
  const dir = path.join(__dirname, 'web/src/app', route);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.tsx'), content);
}

// 1. /diensten
createPage('diensten', `'use client';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import ServicesSection from '@/components/ServicesSection/ServicesSection';
import HowItWorksSection from '@/components/HowItWorksSection/HowItWorksSection';
import { useLanguage } from '@/context/LanguageContext';

export default function DienstenPage() {
  const { t } = useLanguage();
  return (
    <main>
      <Header />
      <div style={{ paddingTop: '80px', background: '#0f172a', color: '#fff', textAlign: 'center', paddingBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', paddingTop: '4rem' }}>{t('services') || 'Diensten'}</h1>
      </div>
      <ServicesSection />
      <HowItWorksSection />
      <Footer />
    </main>
  );
}
`);

// 2. /routes
createPage('routes', `'use client';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import MapSection from '@/components/MapSection/MapSection';
import { useLanguage } from '@/context/LanguageContext';

export default function RoutesPage() {
  const { t } = useLanguage();
  return (
    <main>
      <Header />
      <div style={{ paddingTop: '80px', background: '#0f172a', color: '#fff', textAlign: 'center', paddingBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', paddingTop: '4rem' }}>Routes</h1>
      </div>
      <MapSection />
      <Footer />
    </main>
  );
}
`);

// 3. /vloot
createPage('vloot', `'use client';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import Features from '@/components/Features/Features';
import TrustSection from '@/components/TrustSection/TrustSection';
import { useLanguage } from '@/context/LanguageContext';

export default function VlootPage() {
  const { t } = useLanguage();
  return (
    <main>
      <Header />
      <div style={{ paddingTop: '80px', background: '#0f172a', color: '#fff', textAlign: 'center', paddingBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', paddingTop: '4rem' }}>{t('fleet') || 'Vloot'}</h1>
      </div>
      <TrustSection />
      <Features />
      <Footer />
    </main>
  );
}
`);

// 4. /over-ons
createPage('over-ons', `'use client';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import StatsSection from '@/components/StatsSection/StatsSection';
import TestimonialsSection from '@/components/TestimonialsSection/TestimonialsSection';
import { useLanguage } from '@/context/LanguageContext';

export default function OverOnsPage() {
  const { t } = useLanguage();
  return (
    <main>
      <Header />
      <div style={{ paddingTop: '80px', background: '#0f172a', color: '#fff', textAlign: 'center', paddingBottom: '3rem' }}>
        <h1 style={{ fontSize: '3rem', fontWeight: 'bold', paddingTop: '4rem' }}>{t('about') || 'Over ons'}</h1>
      </div>
      <StatsSection />
      <TestimonialsSection />
      <Footer />
    </main>
  );
}
`);

// Modify Header.tsx
const headerFile = path.join(__dirname, 'web/src/components/Header/Header.tsx');
let headerCode = fs.readFileSync(headerFile, 'utf8');

// Update menu links
headerCode = headerCode.replace(/<Link href="#diensten"[^>]*>\{t\('services'\)\}<\/Link>/, `<Link href="/diensten" className={\`\${styles.navLink} \${pathname === '/diensten' ? styles.navLinkActive : ''}\`} onClick={() => setMobileMenuOpen(false)}>{t('services')}</Link>`);
headerCode = headerCode.replace(/<Link href="#harta"[^>]*>Routes<\/Link>/, `<Link href="/routes" className={\`\${styles.navLink} \${pathname === '/routes' ? styles.navLinkActive : ''}\`} onClick={() => setMobileMenuOpen(false)}>Routes</Link>`);
headerCode = headerCode.replace(/<Link href="#flota"[^>]*>\{t\('fleet'\)\}<\/Link>/, `<Link href="/vloot" className={\`\${styles.navLink} \${pathname === '/vloot' ? styles.navLinkActive : ''}\`} onClick={() => setMobileMenuOpen(false)}>{t('fleet')}</Link>`);
headerCode = headerCode.replace(/<Link href="#despre"[^>]*>\{t\('about'\)\}<\/Link>/, `<Link href="/over-ons" className={\`\${styles.navLink} \${pathname === '/over-ons' ? styles.navLinkActive : ''}\`} onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>`);

fs.writeFileSync(headerFile, headerCode);

console.log('Pages created and Header updated!');
