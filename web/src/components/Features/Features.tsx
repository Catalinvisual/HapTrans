'use client';
import React from 'react';
import styles from './Features.module.css';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

const Features = () => {
  const { t } = useLanguage();
  const cards = [
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13"></rect>
          <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
          <circle cx="5.5" cy="18.5" r="2.5"></circle>
          <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
      ),
      title: 'Transport internațional',
      desc: 'Transport rutier de marfă sigur, rapid și eficient în toată Europa.'
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      title: 'Tracking în timp real',
      desc: 'Transparență totală. Știi mereu unde este marfa ta pe durata transportului.'
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      ),
      title: 'Livrare punctuală',
      desc: 'Respectăm cu strictețe termenele agreate, garantând sosirea la timp.'
    },
    {
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      ),
      title: 'Suport rapid',
      desc: 'O echipă dedicată și agilă, pregătită să îți ofere suport la orice oră.'
    }
  ];

  return (
    <section className={styles.section} id="despre">
      <div className={styles.container}>
        <Reveal variant="fade">
          <div className={styles.header}>
            
            <h2 className={styles.title}>{t('featuresTitle') || 'Servicii de Top'}</h2>
            <p className={styles.subtitle}>{t('featuresSubtitle') || 'Ne diferențiem prin calitatea serviciilor și atenția la detalii.'}</p>
          </div>
        </Reveal>
        
        <div className={styles.grid}>
          {cards.map((card, idx) => (
            <Reveal key={idx} delay={idx * 90} stretch>
              <div className={styles.card}>
                <div className={styles.icon}>{card.icon}</div>
                <h3 className={styles.cardTitle}>{t(`feat${idx}Title`) || card.title}</h3>
                <p className={styles.cardDesc}>{t(`feat${idx}Desc`) || card.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
