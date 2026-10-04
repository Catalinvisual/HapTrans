'use client';
import React from 'react';
import styles from './Features.module.css';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

const Features = () => {
  const { t } = useLanguage();
  return (
    <section className={styles.section} id="despre">
      <div className={styles.container}>
        <Reveal variant="fade">
          <div className={styles.header}>
            <h2 className={styles.title} style={{ gridColumn: '1 / -1' }}>{t('featuresTitle') || 'Why choose HapCargo?'}</h2>
          </div>
        </Reveal>
        <div className={styles.bentoGrid}>
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemStandard}`} delay={0} stretch>
            <div className={styles.card}>
              <span className={styles.chip}>⚡ {t('feat1Chip') || 'Euro-6 Compliant'}</span>
              <h3 className={styles.cardTitle}>{t('feat1Title') || 'Ecological & Modern Fleet'}</h3>
              <p className={styles.cardDesc}>{t('feat1Desc') || 'Newest Euro-6 standard trucks equipped with low-emission technology and automated route optimization for maximum efficiency.'}</p>
              <div className={styles.fleetRow}>
                <div className={styles.fleetTrucks} aria-hidden="true">
                  <span className={styles.truckIcon}></span>
                  <span className={styles.truckIcon}></span>
                  <span className={styles.truckIcon}></span>
                </div>
                <span className={styles.fleetMeta}>{t('feat1Meta') || '100+ Euro-6 vehicles'}</span>
              </div>
            </div>
          </Reveal>
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemStandard}`} delay={90} stretch>
            <div className={`${styles.card} ${styles.cardDark}`}>
              <span className={styles.chipDark}><span className={styles.liveMini} /> {t('feat2Chip') || 'LIVE GPS TRACKING'}</span>
              <h3 className={styles.cardTitleDark}>{t('feat2Title') || 'Real-Time Telematics'}</h3>
              <p className={styles.cardDescDark}>{t('feat2Desc') || "24/7 full visibility over your freight's location, route status, and estimated arrival time anywhere in Europe."}</p>
              <div className={styles.mapMock} aria-hidden="true">
                <div className={styles.mapGrid} />
                <svg className={styles.mapRoute} viewBox="0 0 320 120" preserveAspectRatio="none" fill="none">
                  <path d="M20 95 C 70 85, 90 55, 140 50 S 230 25, 300 35" stroke="#FF6B00" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" className={styles.routeDash} />
                  <circle cx="20" cy="95" r="5" fill="#0A0E17" stroke="#FF6B00" strokeWidth="2.5" />
                  <circle cx="300" cy="35" r="5" fill="#0A0E17" stroke="#FF6B00" strokeWidth="2.5" />
                  <circle cx="140" cy="50" r="6" fill="#FF6B00" className={styles.truckDot}>
                    <animateMotion dur="3.5s" repeatCount="indefinite" path="M20 95 C 70 85, 90 55, 140 50 S 230 25, 300 35" />
                  </circle>
                </svg>
                <div className={styles.mapEta}>
                  <span className={styles.mapEtaLabel}>ETA</span>
                  <span className={styles.mapEtaValue}>2h 10m</span>
                  <span className={styles.mapEtaDot} />
                </div>
              </div>
              <span className={styles.darkChip}><span className={styles.liveMini} />{t('feat2Status') || 'Active trackers online'}</span>
            </div>
          </Reveal>
          <Reveal variant="fade" className={`${styles.bentoItem} ${styles.itemStandard}`} delay={90} stretch>
            <div className={`${styles.card} ${styles.cardCertified}`}>
              <h3 className={styles.cardTitle}>{t('feat4Title') || 'Certified Quality & Safety Standards'}</h3>
              <p className={styles.cardDesc}>{t('feat4Desc') || 'Fully licensed and compliant with international ADR hazard transport, GDP pharma, and temperature-controlled freight regulations.'}</p>
              <div className={styles.sealCluster}>
                <span className={styles.adrCertBadge}>🛡️ {t('feat4Adr') || 'ADR APPROVED'}</span>
                <span className={styles.seal}>📋 ISO 9001</span>
                <span className={styles.seal}>❄️ TMP -25°C</span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
};
export default Features;
