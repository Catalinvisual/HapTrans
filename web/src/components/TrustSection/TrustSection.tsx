'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

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
    <section
      style={{
        background: 'var(--bg)',
        padding: '2.5rem 1.5rem 4rem 1.5rem',
        color: 'var(--text)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Reveal variant="fade">
          <h3
            style={{
              fontSize: '1.35rem',
              fontWeight: '600',
              marginBottom: '1.75rem',
              color: 'var(--text)',
            }}
          >
            {t('trustTitle') || 'Betrouwbaar transportbedrijf'}
          </h3>
        </Reveal>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            justifyContent: 'center',
          }}
        >
          {points.map((p, i) => (
            <Reveal key={i} delay={i * 80}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.55rem 1rem',
                  background: 'var(--card)',
                  border: '1px solid rgba(46,58,69,0.05)',
                  borderRadius: '9999px',
                  boxShadow: 'var(--shadow-card)',
                  fontSize: '0.92rem',
                  fontWeight: '600',
                  color: 'var(--text)',
                  transition: 'transform .18s ease, box-shadow .18s ease',
                }}
              >
                <svg style={{ color: 'var(--success)', flexShrink: 0 }} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{p}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}