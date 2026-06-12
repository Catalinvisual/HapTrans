'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function StatsSection() {
  const { t } = useLanguage();

  const stats = [
    { label: t('statsTrucks') || 'Camioane Moderne', value: '50+' },
    { label: t('statsClients') || 'Clienți Mulțumiți', value: '250+' },
    { label: t('statsTrips') || 'Curse Efectuate', value: '15.000+' },
    { label: t('statsCountries') || 'Țări Acoperite', value: '24' },
  ];

  return (
    <section style={{ backgroundColor: '#0B1B2A', color: 'white', padding: '4rem 1.5rem', marginTop: '-1px' }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
        {stats.map((s, i) => (
          <div key={i} style={{ padding: '1rem' }}>
            <h3 style={{ fontSize: '3rem', fontWeight: '900', color: '#FF5A00', margin: '0 0 0.5rem 0' }}>{s.value}</h3>
            <p style={{ fontSize: '1rem', fontWeight: '600', color: '#cbd5e1', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
