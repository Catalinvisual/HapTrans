'use client';
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
