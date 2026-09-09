const fs = require('fs');
const path = require('path');

// 1. ServicesSection
const servicesDir = path.join(__dirname, 'web/src/components/ServicesSection');
if (!fs.existsSync(servicesDir)) fs.mkdirSync(servicesDir, { recursive: true });

const servicesCss = `
.section {
  padding: 6rem 1.5rem;
  background-color: #0b1120;
  position: relative;
  overflow: hidden;
}

.bgGlow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255,90,0,0.15) 0%, transparent 70%);
  top: -200px;
  left: -200px;
  pointer-events: none;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.title {
  font-size: 3rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 4rem;
  color: #fff;
  letter-spacing: -0.02em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 2rem;
}

.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 2.5rem 2rem;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  backdrop-filter: blur(10px);
}

.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(255,90,0,0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.4s ease;
}

.card:hover {
  transform: translateY(-10px);
  border-color: rgba(255, 90, 0, 0.3);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 90, 0, 0.1);
}

.card:hover::before {
  opacity: 1;
}

.iconWrapper {
  width: 64px;
  height: 64px;
  background: rgba(255, 90, 0, 0.1);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff5a00;
  transition: transform 0.4s ease;
}

.card:hover .iconWrapper {
  transform: scale(1.1) rotate(-5deg);
  background: #ff5a00;
  color: #fff;
}

.cardTitle {
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  position: relative;
  z-index: 2;
}
`;
fs.writeFileSync(path.join(servicesDir, 'ServicesSection.module.css'), servicesCss);

const servicesTsx = `'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './ServicesSection.module.css';

export default function ServicesSection() {
  const { t } = useLanguage();
  
  const services = [
    { title: t('svc1') || 'Full Truck Load transport', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg> },
    { title: t('svc2') || 'Groupage transport', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg> },
    { title: t('svc3') || 'Express transport', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg> },
    { title: t('svc4') || 'Pallet transport', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg> },
    { title: t('svc5') || 'Geconditioneerd transport', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"></path></svg> },
    { title: t('svc6') || 'Internationale distributie', icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> },
  ];

  return (
    <section className={styles.section} id="diensten">
      <div className={styles.bgGlow}></div>
      <div className={styles.container}>
        <h2 className={styles.title}>
          {t('realServicesTitle') || 'Onze diensten'}
        </h2>
        <div className={styles.grid}>
          {services.map((svc, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.iconWrapper}>
                {svc.icon}
              </div>
              <h3 className={styles.cardTitle}>{svc.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
fs.writeFileSync(path.join(servicesDir, 'ServicesSection.tsx'), servicesTsx);


// 2. HowItWorksSection
const howDir = path.join(__dirname, 'web/src/components/HowItWorksSection');
if (!fs.existsSync(howDir)) fs.mkdirSync(howDir, { recursive: true });

const howCss = `
.section {
  padding: 6rem 1.5rem;
  background: linear-gradient(to bottom, #ffffff, #f8fafc);
  position: relative;
  overflow: hidden;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
}

.title {
  font-size: 3rem;
  font-weight: 800;
  text-align: center;
  margin-bottom: 5rem;
  color: #0f172a;
}

.stepsWrapper {
  display: flex;
  flex-direction: column;
  gap: 3rem;
  position: relative;
}

@media (min-width: 1024px) {
  .stepsWrapper {
    flex-direction: row;
    justify-content: space-between;
    gap: 1rem;
  }
  
  .stepsWrapper::before {
    content: '';
    position: absolute;
    top: 40px;
    left: 50px;
    right: 50px;
    height: 4px;
    background: linear-gradient(90deg, rgba(226,232,240,0) 0%, rgba(255,90,0,0.2) 50%, rgba(226,232,240,0) 100%);
    z-index: 0;
    border-radius: 4px;
  }
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 1;
  padding: 1rem;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.step:hover {
  transform: translateY(-15px);
}

.iconBox {
  width: 84px;
  height: 84px;
  background: #fff;
  border: 3px solid #e2e8f0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 900;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transition: all 0.4s ease;
  position: relative;
}

.step:hover .iconBox {
  border-color: #ff5a00;
  background: #ff5a00;
  color: #fff;
  box-shadow: 0 20px 40px -5px rgba(255, 90, 0, 0.4);
  transform: scale(1.1);
}

.stepTitle {
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  max-width: 200px;
  line-height: 1.4;
}

.stepNumber {
  position: absolute;
  top: -10px;
  right: -10px;
  background: #0f172a;
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s ease;
}

.step:hover .stepNumber {
  opacity: 1;
  transform: scale(1);
}
`;
fs.writeFileSync(path.join(howDir, 'HowItWorksSection.module.css'), howCss);

const howTsx = `'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './HowItWorksSection.module.css';

export default function HowItWorksSection() {
  const { t } = useLanguage();
  
  const steps = [
    { num: '1', title: t('step1') || 'Vraag een offerte aan', icon: '??' },
    { num: '2', title: t('step2') || 'Wij plannen de rit', icon: '???' },
    { num: '3', title: t('step3') || 'Uw vracht wordt opgehaald', icon: '??' },
    { num: '4', title: t('step4') || 'U volgt de levering live', icon: '??' },
    { num: '5', title: t('step5') || 'Levering met bewijs van aflevering', icon: '?' },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <h2 className={styles.title}>
          {t('howItWorksTitle') || 'Zo werkt het'}
        </h2>
        <div className={styles.stepsWrapper}>
          {steps.map((step, i) => (
            <div key={i} className={styles.step}>
              <div className={styles.iconBox}>
                {step.icon}
                <div className={styles.stepNumber}>{step.num}</div>
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
fs.writeFileSync(path.join(howDir, 'HowItWorksSection.tsx'), howTsx);

console.log('Sections redesigned successfully!');
