'use client';
import React from 'react';
import styles from './MapSection.module.css';
import { useLanguage } from '@/context/LanguageContext';

const MapSection = () => {
  const { t, lang } = useLanguage();
  const [countries, setCountries] = React.useState<string[]>(['RO', 'DE', 'FR', 'IT', 'BE', 'NL']);

  React.useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
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
        
        <div className={styles.content}>
          <div className={styles.label}>🌍 Acoperire Europeană</div>
          <h2 className={styles.title}>{t('mapTitle')}</h2>
          <p className={styles.desc}>
            {t('mapDesc')}
          </p>
          
          <div className={styles.countriesGrid}>
            {countries.map(code => (
              <div key={code} className={styles.countryItem}>
                <img 
                  src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`} 
                  width="24" 
                  style={{ borderRadius: '3px', objectFit: 'cover', height: '16px' }} 
                  alt={code} 
                />
                {getCountryName(code)}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapContainer}>
          <div className={styles.mapGlow} />
          <img 
            src="/europe_map.png" 
            alt="Map of Europe" 
            className={styles.realMap}
          />
        </div>

      </div>
    </section>
  );
};

export default MapSection;
