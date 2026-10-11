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
    </div>
  ),
});

const MapSection = () => {
  const { t, lang } = useLanguage();
  const [countries, setCountries] = useState<string[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showGlobe, setShowGlobe] = useState(false);
  const sectionRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    let disposed = false;
    let pending = false;
    let active: AbortController | undefined;
    const refresh = async () => {
      if (disposed || pending || document.hidden) return;
      pending = true;
      active = new AbortController();
      try {
        const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/website-cms?t=${Date.now()}`, {
          cache: 'no-store', signal: active.signal,
        });
        if (!res.ok) throw new Error('Countries unavailable');
        const data: { countries?: unknown } = await res.json();
        if (!disposed) {
          const codes = typeof data.countries === 'string'
            ? [...new Set(data.countries.split(',').map(code => code.trim().toUpperCase()).filter(Boolean))]
            : [];
          setCountries(codes);
        }
      } catch {
        // Keep the last verified CMS list; never show example countries as real.
      } finally {
        pending = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      active?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const getCountryName = (code: string) => {
    try {
      const displayNames = new Intl.DisplayNames([lang.toLowerCase()], { type: 'region' });
      return displayNames.of(code) || code;
    } catch {
      return code;
    }
  };

  
  useEffect(() => {
    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;
      setShowGlobe(true);
    };

    // Warm up the 3D globe early during idle time, before the user scrolls to it
    const idleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (window as any).requestIdleCallback
      : null;

    const idleId = idleCallback
      ? idleCallback(trigger, { timeout: 1200 })
      : setTimeout(trigger, 800);

    let observer: IntersectionObserver | null = null;
    if (sectionRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            trigger();
            observer?.disconnect();
          }
        },
        { rootMargin: '400px' }
      );
      observer.observe(sectionRef.current);
    }

    return () => {
      if (idleCallback && (window as any).cancelIdleCallback) {
        (window as any).cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId);
      }
      observer?.disconnect();
    };
  }, []);

  const coreHubs = ['NL', 'DE', 'FR', 'PL', 'CZ', 'RO', 'BG'];
  const displayCountries = [...coreHubs.filter(c => countries.includes(c)), ...countries.filter(c => !coreHubs.includes(c))];

  return (
    <section ref={sectionRef} className={styles.section} id="harta">
      <div className={styles.container}>
        <Reveal variant="left">
          <div className={styles.content}>
            <div className={styles.label}>🌍 {t('mapCoverage') || 'Acoperire Europeană'}</div>
            <h2 className={styles.title}>{t('mapTitle')}</h2>
            <p className={styles.desc}>{t('mapDesc')}</p>
            <div className={styles.countriesGrid}>
              {displayCountries.map(code => (
                <button
                  key={code}
                  type="button"
                  className={`${styles.pill} ${hovered === code ? styles.pillActive : ''}`}
                  onMouseEnter={() => setHovered(code)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <img
                    src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
                    width="20"
                    loading="lazy"
                    decoding="async"
                    style={{ borderRadius: '3px', objectFit: 'cover', height: '14px' }}
                    alt={code}
                  />
                  {getCountryName(code)}
                </button>
              ))}
            </div>
          </div>
        </Reveal>
        <Reveal variant="right">
          <div className={styles.globeStage}>
            <div className={styles.starfield} />
            <div className={styles.globeGlow} />
            {showGlobe ? (
              <GlobeCanvas countries={countries} hovered={hovered} className={styles.globeCanvas} />
            ) : (
              <div className={styles.globeFallback}>
                <div className={styles.spinner} />
              </div>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
};

export default MapSection;
