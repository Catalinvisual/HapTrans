import React from 'react';
import styles from './MapSection.module.css';

const MapSection = () => {
  const countries = [
    { code: 'RO', name: 'România' },
    { code: 'DE', name: 'Germania' },
    { code: 'FR', name: 'Franța' },
    { code: 'IT', name: 'Italia' },
    { code: 'BE', name: 'Belgia' },
    { code: 'NL', name: 'Olanda' },
  ];

  return (
    <section className={styles.section} id="servicii">
      <div className={`container ${styles.container}`}>
        
        <div className={styles.content}>
          <h2 className={styles.title}>Unde <span>transportăm?</span></h2>
          <p className={styles.desc}>
            Acoperim rutele principale din Europa cu o flotă modernă și șoferi profesioniști. Oferim transport sigur și punctual pentru clienții noștri pe următoarele piețe cheie:
          </p>
          
          <div className={styles.countriesGrid}>
            {countries.map(country => (
              <div key={country.code} className={styles.countryItem}>
                <span style={{ fontSize: '1.25rem' }}>📍</span>
                {country.name}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.mapContainer}>
          {/* Here we would normally use a real SVG map or an interactive map like Leaflet/Google Maps */}
          <div className={styles.mapPlaceholder}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              <line x1="9" y1="3" x2="9" y2="21"></line>
              <line x1="15" y1="3" x2="15" y2="21"></line>
            </svg>
            <p>Harta Interactivă Europa</p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default MapSection;
