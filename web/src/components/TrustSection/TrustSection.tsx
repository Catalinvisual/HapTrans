'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TrustSection() {
  const { t } = useLanguage();
  
  const points = [
    t('trust1') || 'CMR-documenten',
    t('trust2') || 'Verzekerde transporten',
    t('trust3') || 'Professionele chauffeurs',
    t('trust4') || 'Live tracking',
    t('trust5') || 'Duidelijke communicatie',
  ];

  return (
    <section style={{ padding: '3rem 1.5rem', background: '#0f172a', color: '#fff' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '2rem', color: '#f8fafc' }}>
          {t('trustTitle') || 'Betrouwbaar transportbedrijf'}
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
          {points.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg style={{ color: '#10b981' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style={{ fontSize: '1rem', fontWeight: '500' }}>{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
