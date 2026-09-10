'use client';
import React from 'react';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import QuoteForm from '@/components/QuoteForm/QuoteForm';
import { useLanguage } from '@/context/LanguageContext';

export default function RequestQuotePage() {
  const { t } = useLanguage();

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      
      <div className="flex-1">
        {/* Banner Section */}
        <div className="bg-slate-900 w-full flex justify-center text-center" style={{ paddingTop: '160px', paddingBottom: '80px', backgroundColor: '#0f172a', width: '100%', display: 'flex', justifyContent: 'center', textAlign: 'center' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20" style={{ maxWidth: '896px', margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 20 }}>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight" style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', marginBottom: '1.5rem', lineHeight: '1.2' }}>
              {t('quotePageTitle')}
            </h1>
            <p className="text-lg text-slate-300" style={{ fontSize: '1.125rem', color: '#cbd5e1' }}>
              {t('quotePageDesc')}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30 pb-24" style={{ maxWidth: '1280px', margin: '-64px auto 0', padding: '0 24px', position: 'relative', zIndex: 30, paddingBottom: '96px' }}>
          <React.Suspense fallback={<div>Loading...</div>}>
            <QuoteForm />
          </React.Suspense>
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
