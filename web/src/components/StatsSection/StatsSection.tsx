'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function StatsSection() {
  const { t } = useLanguage();

  const stats = [
    { label: t('statsTrucks') || 'Camioane Moderne', value: '50+', icon: '🚛' },
    { label: t('statsClients') || 'Clienți Mulțumiți', value: '250+', icon: '🤝' },
    { label: t('statsTrips') || 'Curse Efectuate', value: '15.000+', icon: '📦' },
    { label: t('statsCountries') || 'Țări Acoperite', value: '24', icon: '🌍' },
  ];

  return (
    <section style={{
      background: '#0B1B2A',
      padding: '5rem 1.5rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,90,0,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,90,0,0.04) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1px', position: 'relative', zIndex: 1 }}>
        {stats.map((s, i) => (
          <div key={i} style={{
            padding: '2.5rem 1.5rem',
            textAlign: 'center',
            borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <h3 style={{ fontSize: '3.5rem', fontWeight: '900', color: '#FF5A00', margin: '0 0 0.5rem 0', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</h3>
            <p style={{ fontSize: '0.9rem', fontWeight: '600', color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
