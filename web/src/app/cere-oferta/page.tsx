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
        <div className="pt-32 pb-16 lg:pt-40 lg:pb-20 bg-slate-900 w-full flex justify-center text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              {t('quotePageTitle')}
            </h1>
            <p className="text-lg text-slate-300">
              {t('quotePageDesc')}
            </p>
          </div>
        </div>

        {/* Form Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-16 relative z-30 pb-24">
          <QuoteForm />
        </div>
      </div>
      
      <Footer />
    </main>
  );
}
