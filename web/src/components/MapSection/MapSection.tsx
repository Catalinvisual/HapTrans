'use client';
import React from 'react';
import styles from './MapSection.module.css';
import { useLanguage } from '@/context/LanguageContext';

const MapSection = () => {
  const { t, lang } = useLanguage();
  const [countries, setCountries] = React.useState<string[]>(['RO', 'DE', 'FR', 'IT', 'BE', 'NL']);

  React.useEffect(() => {
    fetch('http://localhost:3001/api/website-cms')
      .then(res => res.json())
      .then(data => {
        if (data.countries) {
          // split by comma and trim
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
    <section className={styles.section} id="servicii">
      <div className={`container ${styles.container}`}>
        
        <div className={styles.content}>
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
                  style={{ borderRadius: '2px', objectFit: 'cover' }} 
                  alt={code} 
                />
                {getCountryName(code)}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapContainer}>
          <img 
            src="/europe_map.png" 
            alt="Map of Europe" 
            className={styles.realMap}
            style={{ width: '100%', height: 'auto', borderRadius: '1rem', objectFit: 'cover', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}
          />
        </div>

      </div>
    </section>
  );
};

export default MapSection;
