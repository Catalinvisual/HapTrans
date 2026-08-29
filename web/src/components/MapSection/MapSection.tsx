'use client';
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './MapSection.module.css';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

const GlobeCanvas = dynamic(() => import('./GlobeCanvas'), {
  ssr: false,
  loading: () => (
    <div className={styles.globeFallback}>
      <div className={styles.spinner} />
      <p>Se încarcă harta...</p>
    </div>
  ),
});

const MapSection = () => {
  const { t, lang } = useLanguage();
  const [countries, setCountries] = useState<string[]>([]);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    fetch(`${apiUrl}/website-cms`)
      .then(res => res.json())
      .then(data => {
        if (data.countries) {
          const codes = data.countries.split(',').map((c: string) => c.trim().toUpperCase());
          setCountries(codes);
        }
      })
      .catch(console.error);
  }, []);

  const getCountryName = (code: string) => {
    try {
      const displayNames = new Intl.DisplayNames([lang.toLowerCase()], { type: 'region' });
      return displayNames.of(code) || code;
    } catch {
      return code;
    }
  };

  return (
    <section className={styles.section} id="harta">
      <div className={styles.container}>
        
        <Reveal variant="left">
          <div className={styles.content}>
            <div className={styles.label}>🌍 {t('mapCoverage') || 'Acoperire Europeană'}</div>
            <h2 className={styles.title}>{t('mapTitle')}</h2>
            <p className={styles.desc}>
              {t('mapDesc')}
            </p>

            <div className={styles.countriesGrid}>
              {countries.map(code => (
                <div key={code} className={styles.countryItem}>
                  <img 
                    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
                    width="20" 
                    style={{ borderRadius: '3px', objectFit: 'cover', height: '14px' }} 
                    alt={code} 
                  />
                  {getCountryName(code)}
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal variant="right">
          <div className={styles.globeStage}>
            <div className={styles.starfield} />
            <div className={styles.globeGlow} />
            <GlobeCanvas countries={countries} className={styles.globeCanvas} />
          </div>
        </Reveal>

      </div>
    </section>
  );
};

export default MapSection;