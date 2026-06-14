'use client';
import React, { useEffect, useState } from 'react';
import styles from './MapSection.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { ComposableMap, Geographies, Geography, Marker, Line } from 'react-simple-maps';

const geoUrl = "https://raw.githubusercontent.com/deldersveld/topojson/master/continents/europe.json";

const countryCoordinates: Record<string, [number, number]> = {
  NL: [5.2913, 52.1326],
  RO: [24.9668, 45.9432],
  DE: [10.4515, 51.1657],
  FR: [2.2137, 46.2276],
  IT: [12.5674, 41.8719],
  BE: [4.4699, 50.5039],
  ES: [-3.7492, 40.4637],
  PL: [19.1451, 51.9194],
  AT: [14.5501, 47.5162],
  CZ: [15.4730, 49.8175],
  HU: [19.5033, 47.1625],
  SK: [19.6990, 48.6690],
  GB: [-3.4360, 55.3781],
  DK: [9.5018, 56.2639],
  CH: [8.2275, 46.8182],
  SE: [18.6435, 60.1282],
  NO: [8.4689, 60.4720],
  FI: [25.7482, 61.9241],
  PT: [-8.2245, 39.3999],
  GR: [21.8243, 39.0742],
  IE: [-8.2439, 53.4129],
  BG: [25.4858, 42.7339],
  HR: [15.2000, 45.1000],
  RS: [21.0059, 44.0165],
  SI: [14.9955, 46.1512]
};

const MapSection = () => {
  const { t, lang } = useLanguage();
  const [countries, setCountries] = useState<string[]>(['RO', 'DE', 'FR', 'IT', 'BE', 'NL']);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
          {mounted && (
            <div className={styles.mapWrapper}>
              <ComposableMap
                projection="geoAzimuthalEqualArea"
                projectionConfig={{
                  rotate: [-10.0, -52.0, 0],
                  center: [5, -3],
                  scale: 1100
                }}
                width={800}
                height={600}
                style={{ width: "100%", height: "auto" }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#0B1B2A"
                        stroke="#1E293B"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#0F263C", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>

                {/* Lines from NL to other countries */}
                {countries.filter(c => c !== 'NL' && countryCoordinates[c]).map(code => (
                  <Line
                    key={`line-${code}`}
                    from={countryCoordinates['NL']}
                    to={countryCoordinates[code]}
                    stroke="#FF5A00"
                    strokeWidth={2}
                    strokeLinecap="round"
                    style={{
                      strokeDasharray: "4, 4",
                      animation: "dash 2s linear infinite"
                    }}
                  />
                ))}

                {/* Markers */}
                {countries.filter(c => countryCoordinates[c]).map(code => (
                  <Marker key={`marker-${code}`} coordinates={countryCoordinates[code]}>
                    <circle r={code === 'NL' ? 6 : 4} fill={code === 'NL' ? "#FF5A00" : "#FDBA74"} />
                    <circle r={code === 'NL' ? 12 : 8} fill={code === 'NL' ? "#FF5A00" : "#FDBA74"} opacity={0.3} />
                  </Marker>
                ))}
              </ComposableMap>
            </div>
          )}
        </div>

      </div>
    </section>
  );
};

export default MapSection;
