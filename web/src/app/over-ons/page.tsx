'use client';
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
