'use client';
import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { t } = useLanguage();
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.column}>
          <Link href="/" className={styles.logo}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="#FF5A00" width="42" height="42" className={styles.logoIcon}>
              <path d="M32 10 L46 10 L38 50 L48 50 L45.2 64 L35.2 64 L30 90 L16 90 L21.2 64 L5.2 64 L8 50 L24 50 Z" />
              <path d="M68 90 L54 90 L62 50 L52 50 L54.8 36 L64.8 36 L70 10 L84 10 L78.8 36 L94.8 36 L92 50 L76 50 Z" />
            </svg>
            <div className={styles.logoTextGroup}>
              <span className={styles.logoHap}>HAP</span><span className={styles.logoCargo}>CARGO</span>
            </div>
          </Link>
          <p className={styles.desc}>
            {t('footerDesc') || 'Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală pe întreg teritoriul Europei.'}
          </p>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>{t('companyTitle') || 'Companie'}</h4>
          <ul className={styles.links}>
            <li><a href="#despre">{t('about') || 'Despre Noi'}</a></li>
            <li><a href="#servicii">{t('services') || 'Servicii'}</a></li>
            <li><a href="#flota">{t('fleet') || 'Flotă'}</a></li>
            <li><a href="#cariere">{t('careers') || 'Cariere'}</a></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>{t('legalTitle') || 'Legal'}</h4>
          <ul className={styles.links}>
            <li><a href="/termeni">{t('termsLink') || 'Termeni și Condiții'}</a></li>
            <li><a href="/politica">{t('privacyLink') || 'Politica de Confidențialitate'}</a></li>
            <li><a href="/cookies">{t('cookiesLink') || 'Politica Cookies'}</a></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>{t('contactTitle') || 'Contact'}</h4>
          <ul className={styles.links} style={{ lineHeight: '1.8' }}>
            <li>📍 Adres: Transportweg 1, 1000 AA Amsterdam, Nederland</li>
            <li>📞 Tel: +31 20 000 0000</li>
            <li>✉️ E-mail: office@hapcargo.com</li>
            <li>🏢 KvK nummer: 12345678</li>
            <li>💶 BTW nummer: NL123456789B01</li>
            <li>⏰ Openingstijden: Ma - Vr, 08:00 - 18:00</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} HapCargo. {t('rightsReserved') || 'Toate drepturile rezervate.'}</p>
      </div>
    </footer>
  );
};

export default Footer;
