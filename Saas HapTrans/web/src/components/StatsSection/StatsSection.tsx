'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useFormatters } from '@/lib/format';
import Reveal from '@/components/Reveal/Reveal';

const useCountUp = (target: number, start: boolean, duration = 1600) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, duration]);

  return value;
};

const StatItem = ({ label, raw, suffix, icon, index, inView }: {
  label: string;
  raw: number;
  suffix: string;
  icon: string;
  index: number;
  inView: boolean;
}) => {
  const { fmtNum } = useFormatters();
  const value = useCountUp(raw, inView);

  return (
    <Reveal delay={index * 100} stretch>
      <div className="card" style={{
        padding: '2.25rem 1.5rem',
        textAlign: 'center',
        height: '100%',
        background: 'var(--card)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        flex: 1,
      }}>
        <div style={{ fontSize: '1.6rem', marginBottom: '0.75rem', lineHeight: 1 }} aria-hidden="true">{icon}</div>
        <h3 style={{
          fontSize: '2.9rem',
          fontWeight: '800',
          color: 'var(--brand)',
          margin: '0 0 0.5rem 0',
          letterSpacing: '-0.03em',
          lineHeight: 1,
        }}>{fmtNum(value)}{suffix}</h3>
        <p style={{
          fontSize: '0.85rem',
          fontWeight: '600',
          color: 'var(--muted)',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>{label}</p>
      </div>
    </Reveal>
  );
};

export default function StatsSection() {
  const { t } = useLanguage();
  const [data, setData] = useState({ trucks: 0, trips: 0, clients: 0, countries: 0 });
  const gridRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
        const res = await fetch(`${apiUrl}/public/stats`);
        if (res.ok) {
          const json = await res.json();
          if (json && !json.error) {
            setData({
              trucks: json.trucks !== undefined ? json.trucks : 50,
              trips: json.trips !== undefined ? json.trips : 15000,
              clients: json.clients !== undefined ? json.clients : 250,
              countries: json.countries !== undefined ? json.countries : 24,
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch public stats', e);
      }
    };
    fetchStats();

    const node = gridRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { label: t('statsTrucks') || 'Camioane Moderne', raw: data.trucks, suffix: '+', icon: '🚛' },
    { label: t('statsClients') || 'Clienți Mulțumiți', raw: data.clients, suffix: '+', icon: '🤝' },
    { label: t('statsTrips') || 'Curse Efectuate', raw: data.trips, suffix: '+', icon: '📦' },
    { label: t('statsCountries') || 'Țări Acoperite', raw: data.countries, suffix: '', icon: '🌍' },
  ];

  return (
    <section style={{
      background: 'var(--bg)',
      padding: '4rem 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,106,43,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,106,43,0.04) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} aria-hidden="true" />
      <div ref={gridRef} style={{
        maxWidth: '1280px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        position: 'relative',
        zIndex: 1,
      }}>
        {stats.map((s, i) => (
          <StatItem key={i} label={s.label} raw={s.raw} suffix={s.suffix} icon={s.icon} index={i} inView={inView} />
        ))}
      </div>
    </section>
  );
}