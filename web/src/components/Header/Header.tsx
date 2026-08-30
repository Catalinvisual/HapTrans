'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import { useLanguage } from '@/context/LanguageContext';

const Header = () => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
    fetch(`${apiUrl}/public/company-settings`)
      .then(r => r.json())
      .then(data => {
        if (data?.logo) setLogoUrl(data.logo);
      })
      .catch(e => console.error(e));
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(height > 0 ? Math.min(scrollTop / height, 1) * 100 : 0);
      setScrolled(scrollTop > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  const handleLogoClick = (e: React.MouseEvent) => {
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const languages: import('@/context/LanguageContext').Language[] = ['RO', 'EN', 'NL', 'DE', 'FR', 'ES'];

  const LANGS = [
    { code: 'RO', label: 'Română', flag: 'https://flagcdn.com/w40/ro.png' },
    { code: 'EN', label: 'English', flag: 'https://flagcdn.com/w40/gb.png' },
    { code: 'NL', label: 'Nederlands', flag: 'https://flagcdn.com/w40/nl.png' },
    { code: 'DE', label: 'Deutsch', flag: 'https://flagcdn.com/w40/de.png' },
    { code: 'FR', label: 'Français', flag: 'https://flagcdn.com/w40/fr.png' },
    { code: 'ES', label: 'Español', flag: 'https://flagcdn.com/w40/es.png' },
  ];

  const currentLang = LANGS.find(l => l.code === lang) || LANGS[0];

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.headerBar}>
      <div className={styles.scrollProgress} style={{ width: `${scrollProgress}%` }} aria-hidden="true" />
      <div className={styles.container}>
        <Link href="/" className={styles.logo} onClick={handleLogoClick}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
          ) : null}
        </Link>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.mobileNavOpen : ''}`}>
          {mobileMenuOpen && (
            <div className={styles.mobileNavHeader}>
              <Link href="/" className={styles.logo} onClick={handleLogoClick}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ height: '42px', width: 'auto', objectFit: 'contain' }} />
                ) : null}
              </Link>
              <button className={styles.mobileCloseBtn} onClick={() => setMobileMenuOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          )}

          <div className={styles.navLinksWrapper}>
            <Link href="/diensten" className={`${styles.navLink}`} onClick={() => setMobileMenuOpen(false)}>{t('services')}</Link>
            <Link href="/routes" className={`${styles.navLink}`} onClick={() => setMobileMenuOpen(false)}>Routes</Link>
            <Link href="/vloot" className={`${styles.navLink}`} onClick={() => setMobileMenuOpen(false)}>{t('fleet')}</Link>
            <Link href="/over-ons" className={`${styles.navLink}`} onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>
            <Link href="/cariere" className={`${styles.navLink} ${pathname === '/cariere' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('careers')}</Link>
            <Link href="/contact" className={`${styles.navLink} ${pathname === '/contact' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
          </div>

          {mobileMenuOpen && (
            <div className={styles.mobileNavFooter}>
              <Link href="/track" className={styles.mobileCta} style={{ backgroundColor: '#1e293b' }} onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {t('clientLogin') || 'TRACK ORDER'}
              </Link>
              <a href="https://joyful-exploration-production.up.railway.app/portal/login" target="_blank" rel="noopener noreferrer" className={styles.mobileCta} style={{ backgroundColor: 'var(--brand)' }} onClick={() => setMobileMenuOpen(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                {t('clientPortal') || 'Portal Clienți'}
              </a>
            </div>
          )}
        </nav>

        <div className={styles.actions}>
          <div className={styles.langWrapper}>
            <button className={styles.langSwitch} onClick={() => setShowLangMenu(!showLangMenu)} aria-expanded={showLangMenu} aria-haspopup="menu" aria-label={`${t('home')} - Language: ${currentLang.code}`}>
              <img src={currentLang.flag} alt={currentLang.code} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
              <span>{currentLang.code}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showLangMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {showLangMenu && (
              <div className={styles.langDropdown} role="menu">
                {LANGS.map(l => (
                  <button key={l.code} className={styles.langOption} role="menuitem" onClick={() => { setLang(l.code as import('@/context/LanguageContext').Language); setShowLangMenu(false); }}>
                    <img src={l.flag} alt={l.code} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Link href="/cere-oferta" className={`btn btn-primary ${styles.desktopLoginBtn}`} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#fff', color: 'var(--brand)', border: '2px solid var(--brand)', borderRadius: '1.5rem 0.3rem 1.5rem 0.3rem' }}>
            {t('navQuote') || 'Cere ofertă'}
          </Link>
          <Link href="/track" className={`btn ${styles.desktopLoginBtn}`} style={{ padding: '0.6rem', fontSize: '0.9rem', backgroundColor: '#1e293b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', textDecoration: 'none', width: '42px', height: '42px' }} title={t('clientLogin') || 'TRACK ORDER'}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </Link>
          <a href="https://joyful-exploration-production.up.railway.app/portal/login" target="_blank" rel="noopener noreferrer" className={`btn btn-primary ${styles.desktopLoginBtn}`} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: 'var(--brand)', borderRadius: '0.3rem 1.5rem 0.3rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff', textDecoration: 'none', border: '2px solid var(--brand)', marginLeft: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            {t('clientPortal') || 'Portal Clienți'}
          </a>

          <div className={styles.contactBadge} title="Available 24/7">
            <span className={styles.contactDot} aria-hidden="true" />
            <span className={styles.contactBadgeText}>
              <span className={styles.contactBadgeLabel}>24/7 Dispatch</span>
              <span className={styles.contactBadgeNum}>+31 20 795 7000</span>
            </span>
          </div>

          <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      </div>
    </header>
  );
};

export default Header;
