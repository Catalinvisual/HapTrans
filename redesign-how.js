const fs = require('fs');
const path = require('path');

const howDir = path.join(__dirname, 'web/src/components/HowItWorksSection');

const howCss = `
.section {
  padding: 8rem 1.5rem;
  background-color: #040814;
  position: relative;
  overflow: hidden;
}

.bgGlow {
  position: absolute;
  width: 800px;
  height: 800px;
  background: radial-gradient(circle, rgba(255,90,0,0.08) 0%, transparent 60%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 0;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.title {
  font-size: 3.5rem;
  font-weight: 900;
  text-align: center;
  margin-bottom: 5rem;
  color: #ffffff;
  letter-spacing: -0.03em;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
  counter-reset: step-counter;
}

.card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 3rem 2rem;
  transition: all 0.5s cubic-bezier(0.25, 1, 0.5, 1);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255,90,0,0.1) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.5s ease;
}

.card:hover {
  transform: translateY(-15px);
  border-color: rgba(255, 90, 0, 0.4);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(255, 90, 0, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.card:hover::before {
  opacity: 1;
}

.iconWrapper {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ff5a00;
  margin-bottom: 2rem;
  transition: all 0.5s ease;
  position: relative;
  z-index: 2;
  box-shadow: 0 0 0 0 rgba(255, 90, 0, 0);
}

.card:hover .iconWrapper {
  background: #ff5a00;
  color: #fff;
  transform: scale(1.15);
  box-shadow: 0 0 20px 0 rgba(255, 90, 0, 0.4);
}

.cardNumber {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  font-size: 4rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.03);
  line-height: 1;
  transition: color 0.5s ease;
  z-index: 1;
}

.card:hover .cardNumber {
  color: rgba(255, 90, 0, 0.1);
}

.cardTitle {
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
  position: relative;
  z-index: 2;
  line-height: 1.4;
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
    { num: '01', title: t('step1') || 'Vraag een offerte aan', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> },
    { num: '02', title: t('step2') || 'Wij plannen de rit', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg> },
    { num: '03', title: t('step3') || 'Uw vracht wordt opgehaald', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg> },
    { num: '04', title: t('step4') || 'U volgt de levering live', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg> },
    { num: '05', title: t('step5') || 'Levering met bewijs van aflevering', icon: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points=\"22 4 12 14.01 9 11.01\"></polyline></svg> },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.bgGlow}></div>
      <div className={styles.container}>
        <h2 className={styles.title}>
          {t('howItWorksTitle') || 'Zo werkt het'}
        </h2>
        <div className={styles.grid}>
          {steps.map((step, i) => (
            <div key={i} className={styles.card}>
              <div className={styles.cardNumber}>{step.num}</div>
              <div className={styles.iconWrapper}>
                {step.icon}
              </div>
              <h3 className={styles.cardTitle}>{step.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;
fs.writeFileSync(path.join(howDir, 'HowItWorksSection.tsx'), howTsx);

console.log('HowItWorks redesigned to dark cards successfully!');
