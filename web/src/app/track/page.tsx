'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';
import { useLanguage } from '@/context/LanguageContext';

export default function TrackPage() {
  const [token, setToken] = useState('');
  const router = useRouter();
  const { t } = useLanguage();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) {
      router.push(`/track/${token.trim()}`);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', backgroundColor: '#f8fafc' }}>
        <div style={{ background: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxWidth: '500px', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textAlign: 'center', color: '#0f172a' }}>
            {t('trackTitle') || 'Portal Clienți - Urmărire Comandă'}
          </h1>
          <p style={{ color: '#64748b', marginBottom: '2rem', textAlign: 'center' }}>
            {t('trackDesc') || 'Introduceți codul de urmărire (Tracking Token) primit pe email sau WhatsApp pentru a vedea statusul comenzii dumneavoastră.'}
          </p>
          <form onSubmit={handleTrack} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ex: hc_a1b2c3"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                outline: 'none',
                fontSize: '1rem'
              }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.875rem', width: '100%', fontSize: '1rem', backgroundColor: '#FF5A00' }}
            >
              {t('trackButton') || 'Urmărește Comanda'}
            </button>
          </form>
        </div>
      </div>
      <Footer />
    </main>
  );
}
