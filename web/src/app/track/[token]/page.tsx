'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header/Header';

interface TrackData {
  referenceNumber: string;
  pickupCountry: string;
  pickupAddress: string;
  dropoffCountry: string;
  dropoffAddress: string;
  pickupDate: string;
  status: string;
  documents: any[];
}

export default function TrackPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<TrackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://joyful-exploration-production.up.railway.app/api';
        const res = await fetch(`${apiUrl}/track/${params.token}`);
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
  }, [params.token]);

  const renderStatusLine = (currentStatus: string) => {
    const statuses = ['pending', 'confirmed', 'in_progress', 'completed'];
    const labels = ['Ofertă Trimisă', 'Acceptată (Camion Alocat)', 'În Tranzit', 'Livrată'];
    
    const currentIndex = statuses.indexOf(currentStatus) === -1 ? 0 : statuses.indexOf(currentStatus);

    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', marginBottom: '2rem', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '15px', left: '0', right: '0', height: '4px', background: '#eee', zIndex: 0 }}></div>
        <div style={{ position: 'absolute', top: '15px', left: '0', width: \`\${(currentIndex / (statuses.length - 1)) * 100}%\`, height: '4px', background: 'var(--primary)', zIndex: 1, transition: 'width 0.5s ease' }}></div>
        
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
        
        {loading && <div style={{ textAlign: 'center', padding: '3rem' }}>Se încarcă detaliile cursei...</div>}
        
        {error && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '1rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h2 style={{ color: 'red', marginBottom: '1rem' }}>Eroare</h2>
            <p>Linkul de urmărire este invalid sau a expirat.</p>
          </div>
        )}

        {data && !loading && (
          <div style={{ background: 'white', borderRadius: '1rem', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--secondary)' }}>Portal Client</h1>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Urmărește statusul și documentele pentru comanda ta.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'var(--surface-alt)', borderRadius: '0.5rem' }}>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ruta</p>
                <p style={{ fontWeight: 600 }}>{data.pickupCountry} ➔ {data.dropoffCountry}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>De la: {data.pickupAddress}<br/>Până la: {data.dropoffAddress}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Referință / Data</p>
                <p style={{ fontWeight: 600 }}>#{data.referenceNumber || 'N/A'}</p>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{new Date(data.pickupDate).toLocaleDateString('ro-RO')}</p>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Status Transport</h3>
            {renderStatusLine(data.status)}

            {data.documents && data.documents.length > 0 && (
              <div style={{ marginTop: '3rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Documente Cursă</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {data.documents.map(doc => (
                    <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                      <span style={{ fontWeight: 500 }}>📄 {doc.name || 'Document'}</span>
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ background: 'var(--primary)', color: 'white', padding: '0.5rem 1rem', borderRadius: '0.25rem', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
                        Descarcă / Vizualizează
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}

      </div>
    </main>
  );
}
