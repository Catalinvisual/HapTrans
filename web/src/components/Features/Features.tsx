'use client';
import React from 'react';
import styles from './Features.module.css';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

const Features = () => {
  const { t } = useLanguage();

  const flags = ['NL', 'DE', 'FR', 'PL', 'CZ', 'RO', 'BG', 'IT', 'BE', 'ES'];

  return (
    <section className={styles.section} id="despre">
      <div className={styles.container}>
        <Reveal variant="fade">
          <div className={styles.header}>
            <div className={styles.label}>{t('whyHapCargo') || 'Why HapCargo?'}</div>
            <h2 className={styles.title}>{t('featuresTitle') || 'Built for the modern supply chain'}</h2>
            <p className={styles.subtitle}>{t('featuresSubtitle') || 'Real-time visibility, dedicated dispatch and certified compliance across Europe.'}</p>
          </div>
        </Reveal>

        <div className={styles.bentoGrid}>

          {/* Card 1 — Telematics hero (spans 2 cols) */}
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemTelematics}`} delay={0} stretch>
            <div className={styles.card}>
              <div className={styles.badgeIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <span className={styles.chip}>● {t('feat1Title') || 'Real-Time Telematics & Live GPS'}</span>
              <h3 className={styles.cardTitleLarge}>
                {t('feat1Desc') || 'Full visibility. Know where your freight is, its temperature, and its ETA — on any device.'}
              </h3>

              {/* Map UI mockup */}
              <div className={styles.mapMock}>
                <div className={styles.mapGrid} aria-hidden="true" />
                <svg className={styles.mapRoute} viewBox="0 0 320 140" preserveAspectRatio="none" aria-hidden="true" fill="none">
                  <path d="M20 110 C 70 100, 90 60, 140 55 S 230 30, 300 40"
                    stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6"
                    className={styles.routeDash} />
                  <circle cx="20" cy="110" r="5" fill="#0A0E17" stroke="#FF6B00" strokeWidth="2.5" />
                  <circle cx="300" cy="40" r="5" fill="#0A0E17" stroke="#FF6B00" strokeWidth="2.5" />
                  <circle cx="140" cy="55" r="6" fill="#FF6B00" className={styles.truckDot}>
                    <animateMotion dur="3.5s" repeatCount="indefinite"
                      path="M20 110 C 70 100, 90 60, 140 55 S 230 30, 300 40" />
                  </circle>
                </svg>
                <div className={styles.mapPin} style={{ left: '18%', top: '74%' }}>NL</div>
                <div className={styles.mapPin} style={{ left: '84%', top: '22%' }}>RO</div>
                <div className={styles.mapEta}>
                  <span className={styles.mapEtaLabel}>ETA</span>
                  <span className={styles.mapEtaValue}>2h 10m</span>
                  <span className={styles.mapEtaDot} />
                </div>
              </div>
            </div>
          </Reveal>

          {/* Card 2 — 24/7 dark dispatch */}
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemStandard}`} delay={90} stretch>
            <div className={`${styles.card} ${styles.cardDark}`}>
              <div className={styles.glowingIcon}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.42 1.9.86 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.88.44 1.82.73 2.78.86A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <h3 className={styles.cardTitleDark}>{t('feat2Title') || '24/7 Dedicated Dispatch'}</h3>
              <p className={styles.cardDescDark}>{t('feat2Desc') || 'A real human dispatcher, assigned to your account, reachable day and night.'}</p>
              <div className={styles.avatarStack}>
                <span className={styles.avatar} style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9A66)' }}>AD</span>
                <span className={styles.avatar} style={{ background: 'linear-gradient(135deg,#3B82F6,#93C5FD)' }}>MC</span>
                <span className={styles.avatar} style={{ background: 'linear-gradient(135deg,#10B981,#6EE7B7)' }}>KD</span>
                <span className={styles.avatarMore}>+12</span>
              </div>
              <span className={styles.darkChip}><span className={styles.liveMini} />Live agents online</span>
            </div>
          </Reveal>

          {/* Card 3 — European coverage */}
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemStandard}`} delay={0} stretch>
            <div className={`${styles.card} ${styles.cardStandard}`}>
              <div className={styles.badgeIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              </div>
              <h3 className={styles.cardTitle}>{t('feat3Title') || 'European Express Coverage'}</h3>
              <p className={styles.cardDesc}>{t('feat3Desc') || 'Daily departures across 15+ countries with guaranteed transit times.'}</p>
              <div className={styles.flagRow}>
                {flags.map((f) => (
                  <img key={f} src={`https://flagcdn.com/w40/${f.toLowerCase()}.png`} alt={f} className={styles.flag} loading="lazy" />
                ))}
                <span className={styles.flagMore}>+5</span>
              </div>
            </div>
          </Reveal>

          {/* Card 4 — ADR & conditioned metric */}
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemMetric}`} delay={90} stretch>
            <div className={styles.card}>
              <div className={styles.metricTop}>
                <div className={styles.badgeIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <span className={styles.adrBadge}>ADR</span>
              </div>
              <h3 className={styles.cardTitle}>{t('feat4Title') || 'ADR & Conditioned Transport Approved'}</h3>
              <p className={styles.cardDesc}>{t('feat4Desc') || 'Hazardous goods and temperature-controlled freight handled under full certification.'}</p>
              <div className={styles.sealRow}>
                <span className={styles.seal}>✅ ADR</span>
                <span className={styles.seal}>❄️ TMP -25°C</span>
                <span className={styles.seal}>📋 ISO 9001</span>
              </div>
            </div>
          </Reveal>

        </div>
      </div>
    </section>
  );
};

export default Features;
