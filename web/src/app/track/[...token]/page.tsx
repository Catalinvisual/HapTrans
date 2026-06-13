'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';
import { useLanguage } from '@/context/LanguageContext';

interface TrackData {
  referenceNumber: string;
  pickupCountry: string;
  pickupAddress: string;
  dropoffCountry: string;
  dropoffAddress: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  weightKg: number;
  pallets: number;
  distanceKm: number;
  status: string;
  documents: any[];
}

export default function TrackPage({ params }: { params: any }) {
  const { t } = useLanguage();
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!params) {
      setLoading(false);
      setError(true);
      return;
    }
    if (typeof params.then === 'function') {
      params.then((p: any) => {
        const rawToken = p?.token;
        const resolved = Array.isArray(rawToken) ? rawToken.join('/') : rawToken;
        if (resolved) {
          setToken(resolved);
        } else {
          setLoading(false);
          setError(true);
        }
      }).catch(() => {
        setLoading(false);
        setError(true);
      });
    } else {
      const rawToken = params.token;
      const resolved = Array.isArray(rawToken) ? rawToken.join('/') : rawToken;
      if (resolved) {
        setToken(resolved);
      } else {
        setLoading(false);
        setError(true);
      }
    }
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const fetchTracking = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
        const res = await fetch(`${apiUrl}/track/${token}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Invalid token');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTracking();
  }, [token]);

  const renderStatusLine = (currentStatus: string) => {
    const statuses = ['pending', 'confirmed', 'in_progress', 'completed'];
    const labels = [
      t('statusPending') || 'Ofertă Trimisă',
      t('statusConfirmed') || 'Acceptată (Camion Alocat)',
      t('statusInProgress') || 'În Tranzit',
      t('statusCompleted') || 'Livrată'
    ];
    
    const currentIndex = statuses.indexOf(currentStatus) === -1 ? 0 : statuses.indexOf(currentStatus);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', marginBottom: '2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', background: '#eee', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', top: '15px', left: '0', width: `${(currentIndex / (statuses.length - 1)) * 100}%`, height: '4px', background: 'var(--primary)', zIndex: 1, transition: 'width 0.5s ease' }}></div>
        
        {statuses.map((s, idx) => {
          const isActive = idx <= currentIndex;
          return (
            <div key={s} style={{ position: 'relative', zIndex: 2, textAlign: 'center', width: '25%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', background: isActive ? 'var(--primary)' : '#eee', 
                color: isActive ? 'white' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                fontWeight: 'bold', border: '4px solid white'
              }}>
                {isActive ? '✓' : idx + 1}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: isActive ? 'bold' : 'normal', color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {labels[idx]}
              </div>
            </div>
          )
        })}
      </div>
    );
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: 'var(--surface-alt)' }}>
      <Header />
      <div className="container" style={{ paddingTop: '10rem', paddingBottom: '4rem', maxWidth: '800px' }}>
        
        {loading && <div style={{ textAlign: 'center', padding: '3rem' }}>{t('loadingTrackingDetails')}</div>}
        
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h2 style={{ color: 'red', marginBottom: '1rem' }}>{t('errorTitle')}</h2>
            <p>{t('invalidTrackingLink')}</p>
          </div>
        )}

        {data && !loading && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--secondary)' }}>{t('clientPortal')}</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>{t('trackStatusDesc')}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('route') || 'Rută'}</p>
                <p style={{ fontWeight: 600 }}>{data.pickupCountry} ➔ {data.dropoffCountry}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{t('fromLabel') || 'De la'}: {data.pickupAddress}<br/>{t('toLabel') || 'Până la'}: {data.dropoffAddress}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('etaLabel') || 'ETA (Timp Estimat)'}</p>
                <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                  {data.dropoffDate ? new Date(data.dropoffDate).toLocaleDateString('ro-RO') : 'N/A'}
                  {data.dropoffTime ? ` la ${data.dropoffTime}` : ''}
                </p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Ref: #{data.referenceNumber || 'N/A'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('cargoDetailsLabel') || 'Detalii Marfă'}</p>
                <p style={{ fontWeight: 600 }}>{data.pallets ? `${data.pallets} Paleți` : '-'} • {data.weightKg ? `${data.weightKg} kg` : '-'}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('distanceLabel') || 'Distanță Cursă'}</p>
                <p style={{ fontWeight: 600 }}>{data.distanceKm ? `${data.distanceKm} km` : '-'}</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>{t('transportStatus') || 'Status Transport'}</h3>
            {renderStatusLine(data.status)}

            {data.documents && data.documents.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>{t('tripDocuments') || 'Documente Cursă'}</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {data.documents.map(doc => {
                    const getDownloadUrl = (url: string) => {
                      if (url.includes('/upload/')) {
                        return url.replace('/upload/', '/upload/fl_attachment/');
                      }
                      return url;
                    };
                    
                    return (
                      <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                        <span style={{ fontWeight: 500 }}>📄 {doc.name || 'Document'}</span>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <a href={doc.url} target="_blank" rel="noreferrer" style={{ background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.5rem 1rem', borderRadius: '0.35rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('previewLabel') || 'Vizualizare'}
                          </a>
                          <a href={getDownloadUrl(doc.url)} target="_blank" rel="noreferrer" download style={{ background: 'var(--primary)', color: 'white', border: '1px solid var(--primary)', padding: '0.5rem 1rem', borderRadius: '0.35rem', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                            {t('downloadLabel') || 'Descarcă'}
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
          </div>
        )}

      </div>
    </main>
  );
}
