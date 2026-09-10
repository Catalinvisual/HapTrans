'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';
import styles from './TrustSection.module.css';

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
    <section className={styles.section}>
      <div className={styles.wrap}>
        <Reveal variant="fade">
          <h3 className={styles.title}>
            {t('trustTitle') || 'Betrouwbaar transportbedrijf'}
          </h3>
        </Reveal>
        <div className={styles.pills}>
          {points.map((p, i) => (
            <Reveal key={i} delay={i * 80} variant="fade">
              <span className={styles.pill}>
                <svg className={styles.check} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                <span>{p}</span>
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
