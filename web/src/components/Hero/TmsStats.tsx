'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import heroStyles from './Hero.module.css';
import styles from './TmsStats.module.css';

type Counts = { trucks: number; euro6Trucks: number; trips: number; countries: number | null };

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

function parseStats(value: unknown): Counts | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  // Reject the older endpoint: its trips count included unfinished trips and
  // its countries count used an invented fallback. Never present those as real.
  if (typeof data.updatedAt !== 'string' || !Number.isFinite(Date.parse(data.updatedAt))) return null;
  if (!validCount(data.trucks) || !validCount(data.euro6Trucks) ||
      !validCount(data.trips) || (data.countries !== null && !validCount(data.countries)) ||
      data.euro6Trucks > data.trucks) return null;
  return { trucks: data.trucks, euro6Trucks: data.euro6Trucks,
    trips: data.trips, countries: data.countries as number | null };
}

export default function TmsStats() {
  const { lang } = useLanguage();
  const [stats, setStats] = useState<Counts | null>(null);

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
        const response = await fetch(`${api}/public/stats`, { signal: active.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Statistics unavailable');
        const data = parseStats(await response.json());
        if (!disposed) setStats(data);
      } catch {
        if (!disposed) setStats(null);
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
    <section className={`${heroStyles.statsBanner} ${styles.banner}`} aria-label={language === 'RO' ? 'Statistici TMS' : 'TMS statistics'}>
      <div className={styles.grid}>
        <div className={styles.item}><strong className={styles.value}>{number(stats?.trucks)}</strong><span className={styles.label}>{labels[0]}</span>
          {stats && stats.euro6Trucks > 0 && <span className={styles.detail}>{number(stats.euro6Trucks)} {labels[1]}</span>}</div>
        <div className={styles.item}><strong className={styles.value}>{number(stats?.trips)}</strong><span className={styles.label}>{labels[2]}</span></div>
        <div className={styles.item}><strong className={styles.value}>{number(stats?.countries)}</strong><span className={styles.label}>{labels[3]}</span></div>
      </div>
    </section>
  );
}
