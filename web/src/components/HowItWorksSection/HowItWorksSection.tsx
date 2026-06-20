'use client';
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
