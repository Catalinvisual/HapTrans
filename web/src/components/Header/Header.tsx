'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import styles from './Header.module.css';

const Header = () => {
  const [lang, setLang] = useState('RO');

  const languages = ['RO', 'EN', 'DE', 'FR', 'ES'];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <svg viewBox="0 0 100 100" fill="currentColor" width="28" height="28" className={styles.logoIcon}>
            <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
            <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
          </svg>
          <div style={{ display: 'flex' }}>
            <span>HAP</span><span className={styles.logoText}>CARGO</span>
          </div>
        </Link>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>Acasă</Link>
          <Link href="#despre" className={styles.navLink}>Despre noi</Link>
          <Link href="#servicii" className={styles.navLink}>Servicii</Link>
          <Link href="#flota" className={styles.navLink}>Flotă</Link>
          <Link href="#contact" className={styles.navLink}>Contact</Link>
        </nav>

        <div className={styles.actions}>
          <button className={styles.langSwitch} onClick={() => {
            const nextIdx = (languages.indexOf(lang) + 1) % languages.length;
            setLang(languages[nextIdx]);
          }}>
            {lang}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
          
          <a href="https://app.hapcargo.com" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
            CLIENT LOGIN
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
