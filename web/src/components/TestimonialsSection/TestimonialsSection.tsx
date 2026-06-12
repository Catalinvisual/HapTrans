'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function TestimonialsSection() {
  const { t } = useLanguage();

  const reviews = [
    { name: 'Alexandru D.', company: 'Logistics Group', initials: 'AD', text: t('review1') || 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii.' },
    { name: 'Maria C.', company: 'EuroTrade Inc', initials: 'MC', text: t('review2') || 'Cel mai bun raport calitate-preț pentru rutele externe. Transparență totală.' },
    { name: 'Klaus M.', company: 'GmbH Berlin', initials: 'KM', text: t('review3') || 'Un partener de încredere pentru cursele din Germania spre Europa de Est.' }
  ];

  return (
    <section style={{
      background: 'linear-gradient(180deg, #0B1B2A 0%, #0D1B2A 100%)',
      padding: '6rem 1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '700px', height: '400px', background: 'radial-gradient(ellipse, rgba(255,90,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,90,0,0.15)', color: '#FF5A00', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0.4rem 1rem', borderRadius: '2rem', border: '1px solid rgba(255,90,0,0.3)', marginBottom: '1.25rem' }}>★ Testimoniale</div>
          <h2 style={{ fontSize: '2.75rem', fontWeight: '900', color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.03em' }}>{t('testimonialsTitle') || 'Ce Spun Clienții Noștri'}</h2>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.55)', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>{t('testimonialsDesc') || 'Mândria noastră este satisfacția partenerilor de afaceri.'}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {reviews.map((r, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '1.25rem',
              padding: '2rem',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem'
            }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,90,0,0.4)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,90,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-6px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
            >
              <div style={{ color: '#FF5A00', fontSize: '1.25rem', letterSpacing: '0.1em' }}>★★★★★</div>
              <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, fontStyle: 'italic', flexGrow: 1 }}>"{r.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF5A00, #ff7e33)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: 'white', flexShrink: 0 }}>{r.initials}</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#ffffff' }}>{r.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>{r.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
