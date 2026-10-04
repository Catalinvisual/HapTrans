'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import styles from './TmsStats.module.css';

type Counts = { trucks: number | null; euro6Trucks: number | null; trips: number | null; countries: number | null };

const copy = {
  RO: ['Camioane înregistrate', 'Camioane Euro 6', 'Curse finalizate', 'Țări deservite'],
  EN: ['Registered trucks', 'Euro 6 trucks', 'Completed trips', 'Countries served'],
  NL: ['Geregistreerde vrachtwagens', 'Euro 6-vrachtwagens', 'Voltooide ritten', 'Bediende landen'],
  DE: ['Registrierte Lkw', 'Euro-6-Lkw', 'Abgeschlossene Fahrten', 'Bediente Länder'],
  FR: ['Camions enregistrés', 'Camions Euro 6', 'Trajets terminés', 'Pays desservis'],
  ES: ['Camiones registrados', 'Camiones Euro 6', 'Viajes completados', 'Países atendidos'],
} as const;

function validCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseCounts(value: unknown): Pick<Counts, 'trucks' | 'trips' | 'euro6Trucks'> {
  if (!value || typeof value !== 'object') throw new Error('Invalid TMS response');
  const data = value as Record<string, unknown>;
  if ('error' in data) throw new Error('TMS statistics unavailable');
  const trucks = validCount(data.trucks) ? data.trucks : null;
  // Older deployed endpoints count all trips; never label these as completed.
  const corrected = typeof data.updatedAt === 'string' && Number.isFinite(Date.parse(data.updatedAt));
  const trips = corrected && validCount(data.trips) ? data.trips : null;
  const euro6Trucks = corrected && validCount(data.euro6Trucks) &&
    trucks !== null && data.euro6Trucks <= trucks ? data.euro6Trucks : null;
  return { trucks, trips, euro6Trucks };
}

function parseCountries(value: unknown): number {
  if (!value || typeof value !== 'object') throw new Error('Invalid CMS response');
  const countries = (value as Record<string, unknown>).countries;
  if (typeof countries !== 'string' || !countries.trim()) return 0;
  return new Set(countries.split(',').map(code => code.trim().toUpperCase()).filter(Boolean)).size;
}

export default function TmsStats() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState<Counts>({ trucks: null, euro6Trucks: null, trips: null, countries: null });

  useEffect(() => {
    let disposed = false;
    let pending = false;
    let active: AbortController | undefined;
    const api = (process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api').replace(/\/+$/, '');
    async function refresh() {
      if (pending || document.hidden || disposed) return;
      pending = true;
      active = new AbortController();
      const timeout = window.setTimeout(() => active?.abort(), 10000);
      try {
        const [tms, cms] = await Promise.allSettled([
          fetch(`${api}/public/stats`, { signal: active.signal, cache: 'no-store' })
            .then(async response => { if (!response.ok) throw new Error('TMS unavailable'); return parseCounts(await response.json()); }),
          fetch(`${api}/website-cms?t=${Date.now()}`, { signal: active.signal, cache: 'no-store' })
            .then(async response => { if (!response.ok) throw new Error('CMS unavailable'); return parseCountries(await response.json()); }),
        ]);
        if (!disposed) setStats(previous => ({
          trucks: tms.status === 'fulfilled' ? tms.value.trucks : previous.trucks,
          euro6Trucks: tms.status === 'fulfilled' ? tms.value.euro6Trucks : previous.euro6Trucks,
          trips: tms.status === 'fulfilled' ? tms.value.trips : previous.trips,
          countries: cms.status === 'fulfilled' ? cms.value : previous.countries,
        }));
      } finally {
        window.clearTimeout(timeout);
        pending = false;
      }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      disposed = true;
      active?.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const language = lang in copy ? lang as keyof typeof copy : 'EN';
  const labels = copy[language];
  const fmt = new Intl.NumberFormat(language.toLowerCase());
  const number = (value: number | null | undefined) => value == null ? '—' : fmt.format(value);
  return (
    <section className={styles.banner} aria-label={language === 'RO' ? 'Statistici TMS' : 'TMS statistics'}>
      <div className={styles.grid}>
        <div className={styles.item}><strong className={styles.value}>{number(stats.trucks)}</strong><span className={styles.label}>{labels[0]}</span>
          {stats.euro6Trucks !== null && stats.euro6Trucks > 0 && <span className={styles.detail}>{number(stats.euro6Trucks)} {labels[1]}</span>}</div>
        <div className={styles.item}><strong className={styles.value}>{number(stats.trips)}</strong><span className={styles.label}>{labels[2]}</span></div>
        <div className={styles.item}><strong className={styles.value}>{number(stats.countries)}</strong><span className={styles.label}>{labels[3]}</span></div>
      </div>
    </section>
  );
}
