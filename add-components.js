const fs = require('fs');
const path = require('path');

function createComponent(name, content, cssContent) {
  const dir = path.join(__dirname, 'web/src/components', name);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.tsx`), content);
  if (cssContent) {
    fs.writeFileSync(path.join(dir, `${name}.module.css`), cssContent);
  }
}

// 1. ServicesSection
const servicesTsx = `'use client';
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
`;

// 2. HowItWorksSection
const howItWorksTsx = `'use client';
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
`;

// 3. TrustSection
const trustTsx = `'use client';
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
`;

createComponent('ServicesSection', servicesTsx);
createComponent('HowItWorksSection', howItWorksTsx);
createComponent('TrustSection', trustTsx);

console.log('Components created!');
