'use client';
import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';
import styles from './TestimonialsSection.module.css';

export default function TestimonialsSection() {
  const { t } = useLanguage();

  const reviews = [
    {
      name: 'Alexandru D.',
      role: 'Operations Director',
      company: 'Logistics Group',
      initials: 'AD',
      monogramBg: 'linear-gradient(135deg, #FF6A2B, #FF9A66)',
      text: t('review1') || 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii. Camioanele sunt impecabile, iar platforma de urmărire ne ajută enorm.',
    },
    {
      name: 'Maria C.',
      role: 'Logistics Manager',
      company: 'EuroTrade Inc',
      initials: 'MC',
      monogramBg: 'linear-gradient(135deg, #0F6FFF, #6FB1FF)',
      text: t('review2') || 'Cel mai bun raport calitate-preț pentru rutele externe. Transparență totală și o comunicare excelentă din partea dispecerilor.',
    },
    {
      name: 'Klaus M.',
      role: 'Procurement Lead',
      company: 'GmbH Berlin',
      initials: 'KM',
      monogramBg: 'linear-gradient(135deg, #16A34A, #6EE7A0)',
      text: t('review3') || 'Un partener de încredere pentru cursele din Germania spre Europa de Est. Recomand cu încredere serviciile HapCargo.',
    },
    {
      name: 'Sofia R.',
      role: 'Supply Chain Manager',
      company: 'Nordic Foods',
      initials: 'SR',
      monogramBg: 'linear-gradient(135deg, #F59E0B, #FCD34D)',
      text: t('review4') || 'Livrări pe timp și temperaturi controlate impecabile. Dispeceratul răspunde permanent, chiar și în weekend.',
    },
    {
      name: 'Jan V.',
      role: 'CEO',
      company: 'VanBerg Logistics',
      initials: 'JV',
      monogramBg: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
      text: t('review5') || 'De la grupaj la FTL, totul a fost fără probleme. Platforma de track & trace a schimbat complet modul în care lucrăm.',
    },
    {
      name: 'Elena P.',
      role: 'Import Coordinator',
      company: 'TechParts RO',
      initials: 'EP',
      monogramBg: 'linear-gradient(135deg, #0EA5E9, #7DD3FC)',
      text: t('review6') || 'Recomandați de un partener extern și nu am fost dezamăgită. Comunicare proactivă și prețuri corecte de fiecare dată.',
    },
  ];

  const double = [...reviews, ...reviews];

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <Reveal variant="fade">
          <div className={styles.header}>
            <div className={styles.label}>
              <span aria-hidden="true">★</span>
              {t('testimonialsLabel') || 'Testimoniale'}
              <span className={styles.ratingChip}>4.9/5</span>
            </div>
            <h2 className={styles.title}>{t('testimonialsTitle') || 'Ce Spun Clienții Noștri'}</h2>
            <p className={styles.desc}>{t('testimonialsDesc') || 'Mândria noastră este satisfacția partenerilor de afaceri.'}</p>
          </div>
        </Reveal>

        <Reveal variant="up">
          <div className={styles.marquee}>
            <div className={styles.marqueeTrack}>
              {double.map((r, i) => (
                <article key={i} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div className={styles.stars} aria-label="5 out of 5 stars">
                      {[0, 1, 2, 3, 4].map((s) => (
                        <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#FF6B00" aria-hidden="true">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z" />
                        </svg>
                      ))}
                    </div>
                    <span className={styles.verified}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                      {t('verifiedShipment') || 'Verified Shipment'}
                    </span>
                  </div>

                  <p className={styles.quote}>&ldquo;{r.text}&rdquo;</p>

                  <div className={styles.cardFooter}>
                    <div className={styles.authorRow}>
                      <div className={styles.monogram} style={{ background: r.monogramBg }} aria-hidden="true">{r.initials}</div>
                      <div>
                        <h4 className={styles.authorName}>{r.name}</h4>
                        <p className={styles.authorRole}>{r.role} · {r.company}</p>
                      </div>
                    </div>
                    <span className={styles.logo}>{r.company.split(' ')[0].toUpperCase()}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
