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
  updatedAt: string;
  appointmentFrom?: string;
  appointmentTo?: string;
  lastLiveEta?: string;
  etaConfidence?: string;
  etaStatus?: string;
  etaSource?: string;
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
    const intervalId = setInterval(() => {
      if (!error && data?.status !== 'completed' && data?.status !== 'cancelled') {
        fetchTracking();
      }
    }, 15000); // Polling every 15s

    return () => clearInterval(intervalId);
  }, [token, error, data?.status]);

  const formatTimeWithAMPM = (timeStr?: string, dateObj?: string) => {
    if (timeStr) {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hour = parseInt(parts[0], 10);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        return `${timeStr} (${ampm})`;
      }
      return timeStr;
    }
    if (dateObj) {
      return new Date(dateObj).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  };

  const renderStatusLine = (currentStatus: string) => {
    const statuses = ['pending', 'confirmed', 'loading', 'in_progress', 'unloading', 'completed'];
    const labels = [
      t('statusPending') || 'Ofertă Trimisă',
      t('statusConfirmed') || 'Acceptată',
      t('statusLoading') || 'La Încărcare',
      t('statusInProgress') || 'În Tranzit',
      t('statusUnloading') || 'La Descărcare',
      t('statusCompleted') || 'Livrată'
    ];
    
    const currentIndex = statuses.indexOf(currentStatus) === -1 ? (currentStatus === 'delayed' ? 3 : 0) : statuses.indexOf(currentStatus);

    return (
      <div style={{ overflowX: 'auto', paddingBottom: '1rem', margin: '0 -1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', position: 'relative', minWidth: '600px', padding: '0 1rem' }}>
        <div style={{ position: 'absolute', top: '14px', left: '12.5%', width: '75%', height: '4px', background: '#eee', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', top: '14px', left: '12.5%', width: `${(currentIndex / (statuses.length - 1)) * 75}%`, height: '4px', background: 'var(--primary)', zIndex: 1, transition: 'width 0.5s ease' }}></div>
        
        {statuses.map((s, idx) => {
          const isActive = idx <= currentIndex;
          const isLastAndActive = isActive && idx === statuses.length - 1;
          const circleBg = isLastAndActive ? '#10b981' : (isActive ? 'var(--primary)' : '#eee');

          return (
            <div key={s} style={{ position: 'relative', zIndex: 2, textAlign: 'center', width: '25%' }}>
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', background: circleBg, 
                color: isActive ? 'white' : '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto',
                fontWeight: 'bold', border: '4px solid white'
              }}>
                {isActive ? '✓' : idx + 1}
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: isActive ? 'bold' : 'normal', color: isLastAndActive ? '#10b981' : (isActive ? 'var(--text-primary)' : 'var(--text-muted)') }}>
                {labels[idx]}
              </div>
            </div>
          )
        })}
        </div>
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
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{t('deliveryAppointment') || 'Programare descărcare'}</p>
                <p style={{ fontWeight: 600, color: 'var(--secondary)' }}>
                  {data.appointmentFrom ? (
                    <>
                      {new Date(data.appointmentFrom).toLocaleDateString('ro-RO')}
                      <br/>
                      {new Date(data.appointmentFrom).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      {data.appointmentTo && ` ${t('betweenTime') || '–'} ${new Date(data.appointmentTo).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`}
                    </>
                  ) : data.dropoffDate ? (
                    `${new Date(data.dropoffDate).toLocaleDateString('ro-RO')} ${data.dropoffTime ? data.dropoffTime : ''}`
                  ) : 'N/A'}
                </p>
                
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                    {data.etaConfidence === 'low' || !data.lastLiveEta ? (t('etaPlanned') || 'ETA planificat / estimativ') : (t('etaLive') || 'ETA Live')}
                  </p>
                  
                  {data.status === 'completed' ? (
                    <p style={{ fontWeight: 600, color: '#10b981' }}>
                      {t('deliveredOn') || 'Livrat pe'} {new Date(data.updatedAt || new Date()).toLocaleDateString('ro-RO')} la ora {new Date(data.updatedAt || new Date()).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  ) : (
                    <div>
                      {data.lastLiveEta ? (
                        <>
                          <p style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '0.2rem' }}>
                            {t('arrivalEstimated') || 'Sosire estimată:'} {new Date(data.lastLiveEta).toLocaleDateString('ro-RO')}
                            <br/>
                            {new Date(data.lastLiveEta).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                            {` ${t('betweenTime') || '–'} `}
                            {new Date(new Date(data.lastLiveEta).getTime() + 45 * 60000).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <span style={{ 
                            backgroundColor: data.etaStatus === 'on_time' ? '#dcfce7' : data.etaStatus === 'at_risk' ? '#fef3c7' : '#fee2e2', 
                            color: data.etaStatus === 'on_time' ? '#166534' : data.etaStatus === 'at_risk' ? '#92400e' : '#991b1b',
                            padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' 
                          }}>
                            {data.etaStatus === 'on_time' ? (t('etaOnTime') || '🟢 La timp') : data.etaStatus === 'at_risk' ? (t('etaUpdated') || '🟡 ETA actualizat') : data.etaStatus === 'delayed_risk' ? (t('etaRisk') || '🔴 Risc de întârziere') : (t('etaDelayed') || '🔴 Întârziat')}
                          </span>
                        </>
                      ) : (
                        <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {(() => {
                            if (!data.dropoffDate) return 'N/A';
                            const dateStr = `${data.dropoffDate.split('T')[0]}T${data.dropoffTime || '23:59'}:00`;
                            const isPast = new Date(dateStr).getTime() < new Date().getTime();
                            if (isPast) return 'În curs de actualizare...';
                            return `${new Date(data.dropoffDate).toLocaleDateString('ro-RO')} la ora ${formatTimeWithAMPM(data.dropoffTime, data.dropoffDate)}`;
                          })()}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Ref: #{data.referenceNumber || 'N/A'}</p>
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
