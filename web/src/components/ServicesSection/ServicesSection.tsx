'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

export default function ServicesSection() {
  const { t } = useLanguage();
  
  const services = [
    t('svc1') || 'Full Truck Load transport',
    t('svc2') || 'Groupage transport',
    t('svc3') || 'Express transport',
    t('svc4') || 'Pallet transport',
    t('svc5') || 'Geconditioneerd transport',
    t('svc6') || 'Internationale distributie',
  ];

  return (
    <section style={{ padding: '5rem 1.5rem', background: '#f8fafc' }} id="diensten">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '3rem', color: '#0f172a' }}>
          {t('realServicesTitle') || 'Onze diensten'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {services.map((svc, i) => (
            <div key={i} style={{ background: '#fff', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ color: '#ff5a00' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b' }}>{svc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
