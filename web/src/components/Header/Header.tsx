'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';
import { useLanguage } from '@/context/LanguageContext';

const Header = () => {
  const { lang, setLang, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

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
          <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="40" className={styles.logoIcon}>
            <path d="M4 4 L4 36 M4 20 L16 20 M16 4 L16 36" stroke="#FF5A00" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 4 L22 36 M22 20 L34 20 M34 4 L34 36" stroke="#FF5A00" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className={styles.logoTextGroup}>
            <span className={styles.logoHap}>HAP</span><span className={styles.logoCargo}>CARGO</span>
          </div>
        </Link>

        <nav className={`${styles.nav} ${mobileMenuOpen ? styles.mobileNavOpen : ''}`}>
          {mobileMenuOpen && (
            <div className={styles.mobileNavHeader}>
              <Link href="/" className={styles.logo} onClick={() => setMobileMenuOpen(false)}>
                <svg viewBox="0 0 48 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="40" className={styles.logoIcon}>
                  <path d="M4 4 L4 36 M4 20 L16 20 M16 4 L16 36" stroke="#FF5A00" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M22 4 L22 36 M22 20 L34 20 M34 4 L34 36" stroke="#FF5A00" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div className={styles.logoTextGroup}>
                  <span className={styles.logoHap}>HAP</span><span className={styles.logoCargo}>CARGO</span>
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
            <Link href="/" className={`${styles.navLink} ${pathname === '/' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('home')}</Link>
            <Link href="/despre-noi" className={`${styles.navLink} ${pathname === '/despre-noi' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('about')}</Link>
            <Link href="/servicii" className={`${styles.navLink} ${pathname === '/servicii' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('services')}</Link>
            <Link href="/flota" className={`${styles.navLink} ${pathname === '/flota' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('fleet')}</Link>
            <Link href="/contact" className={`${styles.navLink} ${pathname === '/contact' ? styles.navLinkActive : ''}`} onClick={() => setMobileMenuOpen(false)}>{t('contact')}</Link>
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
