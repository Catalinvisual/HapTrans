'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function HowItWorksSection() {
  const { t } = useLanguage();
  
  const steps = [
    { num: '1', title: t('step1') || 'Vraag een offerte aan' },
    { num: '2', title: t('step2') || 'Wij plannen de rit' },
    { num: '3', title: t('step3') || 'Uw vracht wordt opgehaald' },
    { num: '4', title: t('step4') || 'U volgt de levering live' },
    { num: '5', title: t('step5') || 'Levering met bewijs van aflevering' },
  ];

  return (
    <section style={{ padding: '5rem 1.5rem', background: '#fff' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '4rem', color: '#0f172a' }}>
          {t('howItWorksTitle') || 'Zo werkt het'}
        </h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
          {steps.map((step, i) => (
            <div key={i} style={{ flex: '1 1 200px', maxWidth: '240px', textAlign: 'center', position: 'relative' }}>
              <div style={{ width: '64px', height: '64px', background: '#ff5a00', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', margin: '0 auto 1.5rem' }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1e293b' }}>{step.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
