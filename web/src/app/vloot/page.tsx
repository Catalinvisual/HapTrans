'use client';
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
