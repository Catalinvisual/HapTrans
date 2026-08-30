'use client';
import React, { useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import Reveal from '@/components/Reveal/Reveal';

export default function TestimonialsSection() {
  const { t } = useLanguage();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const reviews = [
    {
      name: 'Alexandru D.',
      role: 'Operations Director',
      company: 'Logistics Group',
      initials: 'AD',
      monogramBg: 'linear-gradient(135deg, #FF6A2B, #FF9A66)',
      rating: '5.0',
      text: t('review1') || 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii. Camioanele sunt impecabile, iar platforma de urmărire ne ajută enorm.',
    },
    {
      name: 'Maria C.',
      role: 'Logistics Manager',
      company: 'EuroTrade Inc',
      initials: 'MC',
      monogramBg: 'linear-gradient(135deg, #0F6FFF, #6FB1FF)',
      rating: '5.0',
      text: t('review2') || 'Cel mai bun raport calitate-preț pentru rutele externe. Transparență totală și o comunicare excelentă din partea dispecerilor.',
    },
    {
      name: 'Klaus M.',
      role: 'Procurement Lead',
      company: 'GmbH Berlin',
      initials: 'KM',
      monogramBg: 'linear-gradient(135deg, #16A34A, #6EE7A0)',
      rating: '4.8',
      text: t('review3') || 'Un partener de încredere pentru cursele din Germania spre Europa de Est. Recomand cu încredere serviciile HapCargo.',
    },
  ];

  const scrollByStep = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-slide]');
    const step = card ? card.offsetWidth + 24 : 320;
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <section style={{
      background: '#FFFFFF',
      padding: 'var(--space-xl) 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle blob overlap accent */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 100%)',
        height: '200px',
        pointerEvents: 'none',
        zIndex: 0,
      }} aria-hidden="true">
        <svg viewBox="0 0 600 200" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M120 20 C180 -10 300 10 420 30 C520 46 560 120 480 150 C380 190 220 170 120 150 C40 136 40 60 120 20Z" fill="#FF6A2B" opacity="0.06"/>
        </svg>
      </div>

      <div style={{ maxWidth: '1280px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Reveal variant="fade">
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,106,43,0.1)',
              color: 'var(--brand)',
              fontSize: '0.8rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '0.4rem 1rem',
              borderRadius: '2rem',
              border: '1px solid rgba(255,106,43,0.25)',
              marginBottom: '1.25rem',
            }}>
              <span aria-hidden="true">★</span>
              {t('testimonialsLabel') || 'Testimoniale'}
              <span aria-hidden="true" style={{ opacity: 0.6 }}>4.9/5</span>
            </div>
            <h2 style={{ fontSize: 'var(--fs-h2)', fontWeight: '700', color: 'var(--text)', marginBottom: '1rem', letterSpacing: '-0.02em' }}>{t('testimonialsTitle') || 'Ce Spun Clienții Noștri'}</h2>
            <p style={{ fontSize: '1.05rem', color: 'var(--muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.7 }}>{t('testimonialsDesc') || 'Mândria noastră este satisfacția partenerilor de afaceri.'}</p>
          </div>
        </Reveal>

        <Reveal variant="up">
          <div
            ref={scrollerRef}
            role="region"
            aria-label={t('testimonialsTitle') || 'Testimonials'}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1.5rem',
            }}
            className="testimonials-scroller"
          >
            {reviews.map((r, i) => (
              <article
                key={i}
                data-slide="true"
                style={{
                  background: 'var(--card)',
                  border: '1px solid rgba(46,58,69,0.06)',
                  borderRadius: 'var(--radius-card)',
                  padding: '1.75rem',
                  boxShadow: 'var(--shadow-card)',
                  transition: 'transform .18s ease, box-shadow .18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  height: '100%',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.boxShadow = '0 18px 40px rgba(46,58,69,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-card)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div
                      aria-hidden="true"
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: r.monogramBg,
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(46,58,69,0.12)',
                      }}
                    >
                      {r.initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.company}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>Logistics Partner</div>
                    </div>
                  </div>
                  <div style={{ color: 'var(--brand)', fontSize: '0.8rem', letterSpacing: '0.08em', flexShrink: 0 }} title={`${r.rating}/5`} aria-label={`${r.rating} out of 5 stars`}>★★★★★</div>
                </div>

                <p style={{ fontSize: '0.98rem', color: 'var(--text)', lineHeight: 1.7, fontStyle: 'italic', flexGrow: 1, margin: 0 }}>&ldquo;{r.text}&rdquo;</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(46,58,69,0.08)', paddingTop: '1rem' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6A2B, #FF9A66)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    color: 'white',
                    flexShrink: 0,
                  }} aria-hidden="true">{r.initials}</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{r.name}</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--muted)' }}>{r.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Reveal>

        <div className="testimonials-arrows" style={{ display: 'none', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
          <button
            type="button"
            onClick={() => scrollByStep(-1)}
            className="btn btn-outline"
            aria-label="Previous testimonial"
            style={{ width: '44px', padding: '0.5rem', borderRadius: '12px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button
            type="button"
            onClick={() => scrollByStep(1)}
            className="btn btn-outline"
            aria-label="Next testimonial"
            style={{ width: '44px', padding: '0.5rem', borderRadius: '12px' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .testimonials-scroller {
            display: flex !important;
            overflow-x: auto !important;
            scroll-snap-type: x mandatory !important;
            -webkit-overflow-scrolling: touch !important;
            scrollbar-width: none !important;
            padding: 0.25rem 0.5rem 0.75rem 0.5rem;
            margin: 0 -0.5rem;
          }
          .testimonials-scroller::-webkit-scrollbar { display: none !important; }
          .testimonials-scroller > article {
            flex: 0 0 100% !important;
            scroll-snap-align: center !important;
            width: 100%;
          }
          .testimonials-arrows { display: flex !important; }
        }
      `}</style>
    </section>
  );
}