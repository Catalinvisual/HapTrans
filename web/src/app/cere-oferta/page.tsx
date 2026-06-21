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
        <div className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-900 w-full flex justify-center">
          <div className="absolute inset-0 z-0 opacity-40">
            <img 
              src="/hero-nou.png" 
              alt="HapCargo Trucks" 
              className="w-full h-full object-cover object-center"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent z-10"></div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
            <div className="max-w-3xl">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {t('quotePageTitle')}
              </h1>
              <p className="text-xl text-slate-300 leading-relaxed">
                {t('quotePageDesc')}
              </p>
            </div>
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
