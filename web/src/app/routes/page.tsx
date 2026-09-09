'use client';
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
