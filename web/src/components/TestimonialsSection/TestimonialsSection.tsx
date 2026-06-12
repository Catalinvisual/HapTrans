'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TestimonialsSection() {
  const { t } = useLanguage();

  const reviews = [
    { name: 'Alexandru D.', company: 'Logistics Group', text: t('review1') || 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii. Camioanele sunt impecabile, iar platforma de urmărire ne ajută enorm.' },
    { name: 'Maria C.', company: 'EuroTrade Inc', text: t('review2') || 'Cel mai bun raport calitate-preț pentru rutele externe. Apreciem transparența totală și comunicarea excelentă a dispecerilor.' },
    { name: 'Klaus M.', company: 'GmbH Berlin', text: t('review3') || 'Un partener de încredere pentru cursele din Germania spre Europa de Est. Recomand cu încredere serviciile HapCargo.' }
  ];

  return (
    <section style={{ backgroundColor: '#f8fafc', padding: '6rem 1.5rem' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '800', color: '#0B1B2A', marginBottom: '1rem' }}>{t('testimonialsTitle') || 'Ce Spun Clienții Noștri'}</h2>
          <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', margin: '0 auto' }}>{t('testimonialsDesc') || 'Mândria noastră este satisfacția partenerilor de afaceri.'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '0.25rem', color: '#FF5A00', marginBottom: '1rem' }}>
                ★★★★★
              </div>
              <p style={{ fontSize: '1rem', color: '#334155', lineHeight: 1.6, marginBottom: '1.5rem', fontStyle: 'italic' }}>"{r.text}"</p>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>{r.name}</h4>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>{r.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
