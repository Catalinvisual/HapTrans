'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './HowItWorksSection.module.css';
import Reveal from '@/components/Reveal/Reveal';

export default function HowItWorksSection() {
  const { t } = useLanguage();

  const steps = [
    {
      num: '01',
      title: t('step1') || 'Vraag een offerte aan',
      sub: t('step1Sub') || 'Vertel ons waar en wat je wilt transporteren.',
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>,
    },
    {
      num: '02',
      title: t('step2') || 'Wij plannen de rit',
      sub: t('step2Sub') || 'Wij kiezen de beste route en vloot.',
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>,
    },
    {
      num: '03',
      title: t('step3') || 'Uw vracht wordt opgehaald',
      sub: t('step3Sub') || 'Een wagen haalt uw goederen op tijd op.',
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
    },
    {
      num: '04',
      title: t('step4') || 'U volgt de levering live',
      sub: t('step4Sub') || 'Volg uw zending in realtime via GPS.',
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
    },
    {
      num: '05',
      title: t('step5') || 'Levering met bewijs van aflevering',
      sub: t('step5Sub') || 'Ontvang het bewijs van aflevering digitaal.',
      icon: <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>,
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.bgGlow}></div>
      <div className={styles.container}>
        <Reveal variant="zoom">
          <h2 className={styles.title}>
            {t('howItWorksTitle') || 'Zo werkt het'}
          </h2>
        </Reveal>

        <div className={styles.pipeline}>
          {/* Continuous gradient progress track across the row */}
          <div className={styles.track} aria-hidden="true">
            <div className={styles.trackFill} />
          </div>

          {steps.map((step, i) => (
            <Reveal key={i} delay={i * 100} variant="fade" stretch>
              <div className={styles.card}>
                <div className={styles.cardTop}>
                  <div className={styles.iconWrapper}>{step.icon}</div>
                  <span className={styles.nodeNum}>{step.num}</span>
                </div>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardSub}>{step.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
