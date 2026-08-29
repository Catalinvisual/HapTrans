'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './ServicesSection.module.css';
import Reveal from '@/components/Reveal/Reveal';

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
        <Reveal variant="zoom">
          <h2 className={styles.title}>
            {t('realServicesTitle') || 'Onze diensten'}
          </h2>
        </Reveal>
        <div className={styles.grid}>
          {services.map((svc, i) => (
            <Reveal key={i} delay={i * 80} stretch>
              <div className={styles.card}>
                <div className={styles.iconWrapper}>
                  {svc.icon}
                </div>
                <h3 className={styles.cardTitle}>{svc.title}</h3>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
