'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useLanguage } from '@/context/LanguageContext';
import { MapPin, ArrowRight } from 'lucide-react';
import styles from './TrackPage.module.css';

export default function TrackPage() {
  const [token, setToken] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    let cleanToken = token.trim();
    if (cleanToken.includes('/track/')) {
      const parts = cleanToken.split('/track/');
      cleanToken = parts[parts.length - 1] || '';
    }
    // Clean query parameters or trailing slashes
    cleanToken = cleanToken.split('?')[0].split('#')[0].replace(/\/$/, '');

    if (cleanToken) {
      router.push(`/track/${cleanToken}`);
    }
  };

  return (
    <main className={styles.main}>
      <Header />
      <div className={styles.content}>
        <section className={styles.panel} aria-labelledby="tracking-title">
          <div className={styles.intro}>
            <div className={styles.icon} aria-hidden="true"><MapPin size={30} /></div>
            <h1 className={styles.title} id="tracking-title">{t('trackTitle') || 'Portal Clienți - Urmărire Comandă'}</h1>
            <p className={styles.description} id="tracking-help">{t('trackDesc') || 'Introduceți codul de urmărire (Tracking Token) primit pe email sau WhatsApp pentru a vedea statusul comenzii dumneavoastră.'}</p>
          </div>
          <form onSubmit={handleTrack} className={styles.form}>
            <label className={styles.label} htmlFor="tracking-token">{t('trackButton') || 'Urmărește Comanda'}</label>
            <input id="tracking-token" type="text" required value={token} onChange={(e) => setToken(e.target.value)} placeholder="ex: hc_a1b2c3" aria-describedby="tracking-help" autoCapitalize="none" spellCheck={false} className={styles.input} />
            <button type="submit" className={styles.submit}><span>{t('trackButton') || 'Urmărește Comanda'}</span><ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </section>
      </div>
      <Footer />
    </main>
  );
}
