'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

import { useLanguage } from '@/context/LanguageContext';

const Header = () => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#FF5A00" strokeWidth="3.2" strokeLinecap="round" width="36" height="36" className={styles.logoIcon}>
            <line x1="10" y1="3" x2="6" y2="21" />
            <line x1="16" y1="3" x2="12" y2="21" />
            <line x1="3" y1="9" x2="20" y2="7" />
            <line x1="3" y1="16" x2="20" y2="14" />
          </svg>
          <div style={{ display: 'flex' }}>
            <span style={{ color: '#000000', fontWeight: 900, letterSpacing: '-0.5px', fontSize: '1.6rem', fontStyle: 'italic', marginLeft: '0.2rem' }}>HAPCARGO</span>
          </div>
        </Link>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.mobileNavOpen : ''}`}>
          {mobileMenuOpen && (
            <div className={styles.mobileNavHeader}>
              <Link href="/" className={styles.logo} onClick={() => setMobileMenuOpen(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#FF5A00" strokeWidth="3.2" strokeLinecap="round" width="36" height="36" className={styles.logoIcon}>
                  <line x1="10" y1="3" x2="6" y2="21" />
                  <line x1="16" y1="3" x2="12" y2="21" />
                  <line x1="3" y1="9" x2="20" y2="7" />
                  <line x1="3" y1="16" x2="20" y2="14" />
                </svg>
                <div style={{ display: 'flex' }}>
                  <span style={{ color: '#000000', fontWeight: 900, letterSpacing: '-0.5px', fontSize: '1.6rem', fontStyle: 'italic', marginLeft: '0.2rem' }}>HAPCARGO</span>
                </div>
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
            <Link href="/" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>{t('home')}</Link>
            <Link href="/despre-noi" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>
            <Link href="/servicii" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>{t('services')}</Link>
            <Link href="/flota" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>{t('fleet')}</Link>
            <Link href="/contact" className={styles.navLink} onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
          </div>

          {mobileMenuOpen && (
            <div className={styles.mobileNavFooter}>
              <Link href="/track" className="btn btn-primary" style={{ width: '100%', padding: '0.9rem', fontSize: '1rem', backgroundColor: '#FF5A00' }} onClick={() => setMobileMenuOpen(false)}>
                {t('clientLogin') || 'PORTAL CLIENȚI'}
              </Link>
            </div>
          )}
        </nav>

        <div className={styles.actions}>
          <div className={styles.langWrapper}>
            <button className={styles.langSwitch} onClick={() => setShowLangMenu(!showLangMenu)}>
              <img src={currentLang.flag} alt={currentLang.code} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
              <span>{currentLang.code}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showLangMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            {showLangMenu && (
              <div className={styles.langDropdown}>
                {LANGS.map(l => (
                  <button key={l.code} className={styles.langOption} onClick={() => { setLang(l.code as import('@/context/LanguageContext').Language); setShowLangMenu(false); }}>
                    <img src={l.flag} alt={l.code} style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }} />
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <Link href="/track" className={`btn btn-primary ${styles.desktopLoginBtn}`} style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#FF5A00' }}>
            {t('clientLogin') || 'PORTAL CLIENȚI'}
          </Link>

          <button className={styles.mobileMenuBtn} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
