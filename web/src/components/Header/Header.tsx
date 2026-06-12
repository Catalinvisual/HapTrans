'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

import { useLanguage } from '@/context/LanguageContext';

const Header = () => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);

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
          <svg viewBox="0 0 100 100" fill="#FF5A00" width="36" height="36" className={styles.logoIcon}>
            <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
            <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
          </svg>
          <div style={{ display: 'flex' }}>
            <span style={{ color: '#000000', fontWeight: 900, letterSpacing: '-0.5px', fontSize: '1.6rem', fontStyle: 'italic', marginLeft: '0.2rem' }}>HAPCARGO</span>
          </div>
        </Link>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>{t('home')}</Link>
          <Link href="#despre" className={styles.navLink}>{t('about')}</Link>
          <Link href="#servicii" className={styles.navLink}>{t('services')}</Link>
          <Link href="#flota" className={styles.navLink}>{t('fleet')}</Link>
          <Link href="#contact" className={styles.navLink}>{t('contact')}</Link>
        </nav>

        <div className={styles.actions}>
          <div className={styles.langWrapper} onMouseLeave={() => setShowLangMenu(false)}>
            <button className={styles.langSwitch} onMouseEnter={() => setShowLangMenu(true)}>
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
          
          <Link href="/track" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem', backgroundColor: '#FF5A00' }}>
            {t('clientLogin') || 'PORTAL CLIENȚI'}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
