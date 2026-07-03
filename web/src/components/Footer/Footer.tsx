'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';
import { useLanguage } from '@/context/LanguageContext';

const Footer = () => {
  const { t, lang } = useLanguage();
  const [company, setCompany] = useState<any>({});
  const [cmsData, setCmsData] = useState<any>({});

  const getLabel = (roText: string, enText: string, nlText: string, deText: string, frText: string, esText: string) => {
    if (lang === 'RO') return roText;
    if (lang === 'EN') return enText;
    if (lang === 'NL') return nlText;
    if (lang === 'DE') return deText;
    if (lang === 'FR') return frText;
    if (lang === 'ES') return esText;
    return enText;
  };

  const formatWorkingHours = (text?: string) => {
    if (!text) return getLabel('Luni - Vineri, 08:00 - 18:00', 'Mon - Fri, 08:00 - 18:00', 'Ma - Vr, 08:00 - 18:00', 'Mo - Fr, 08:00 - 18:00', 'Lun - Ven, 08:00 - 18:00', 'Lun - Vie, 08:00 - 18:00');
    let str = text;
    if (lang === 'RO') {
      str = str.replace(/\b(Mon|Ma|Mo|Lun|Pon)\b/gi, 'Luni').replace(/\b(Fri|Vr|Fr|Ven|Vie|Pt)\b/gi, 'Vineri').replace(/\b(Mon\s*-\s*Fri|Ma\s*-\s*Vr|Mo\s*-\s*Fr|Lun\s*-\s*Ven|Lun\s*-\s*Vie)\b/gi, 'Luni - Vineri');
    } else if (lang === 'NL') {
      str = str.replace(/\b(Mon|Luni|Mo|Lun|Pon)\b/gi, 'Ma').replace(/\b(Fri|Vineri|Fr|Ven|Vie|Pt)\b/gi, 'Vr').replace(/\b(Luni\s*-\s*Vineri|Mon\s*-\s*Fri|Mo\s*-\s*Fr|Lun\s*-\s*Ven|Lun\s*-\s*Vie)\b/gi, 'Ma - Vr');
    } else if (lang === 'DE') {
      str = str.replace(/\b(Mon|Luni|Ma|Lun|Pon)\b/gi, 'Mo').replace(/\b(Fri|Vineri|Vr|Ven|Vie|Pt)\b/gi, 'Fr').replace(/\b(Luni\s*-\s*Vineri|Mon\s*-\s*Fri|Ma\s*-\s*Vr|Lun\s*-\s*Ven|Lun\s*-\s*Vie)\b/gi, 'Mo - Fr');
    } else if (lang === 'FR') {
      str = str.replace(/\b(Mon|Luni|Ma|Mo|Pon)\b/gi, 'Lun').replace(/\b(Fri|Vineri|Vr|Fr|Vie|Pt)\b/gi, 'Ven').replace(/\b(Luni\s*-\s*Vineri|Mon\s*-\s*Fri|Ma\s*-\s*Vr|Mo\s*-\s*Fr|Lun\s*-\s*Vie)\b/gi, 'Lun - Ven');
    } else if (lang === 'ES') {
      str = str.replace(/\b(Mon|Luni|Ma|Mo|Pon)\b/gi, 'Lun').replace(/\b(Fri|Vineri|Vr|Fr|Ven|Pt)\b/gi, 'Vie').replace(/\b(Luni\s*-\s*Vineri|Mon\s*-\s*Fri|Ma\s*-\s*Vr|Mo\s*-\s*Fr|Lun\s*-\s*Ven)\b/gi, 'Lun - Vie');
    } else {
      // EN
      str = str.replace(/\b(Luni|Ma|Mo|Lun|Pon)\b/gi, 'Mon').replace(/\b(Vineri|Vr|Fr|Ven|Vie|Pt)\b/gi, 'Fri').replace(/\b(Luni\s*-\s*Vineri|Ma\s*-\s*Vr|Mo\s*-\s*Fr|Lun\s*-\s*Ven|Lun\s*-\s*Vie)\b/gi, 'Mon - Fri');
    }
    return str;
  };

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
        const res = await fetch(`${apiUrl}/public/company-settings`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && (!data.error || data.address)) {
            setCompany(data);
          }
        }

        const cmsRes = await fetch(`${apiUrl}/public/website-cms`, { cache: 'no-store' })
          .catch(() => fetch(`${apiUrl}/website-cms`, { cache: 'no-store' }));
        if (cmsRes && cmsRes.ok) {
          const cmsObj = await cmsRes.json();
          setCmsData(cmsObj);
        }
      } catch (e) {
        console.error('Failed to fetch company settings', e);
      }
    };
    fetchCompany();
  }, []);

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
            <li><Link href="/over-ons">{t('about') || 'Despre Noi'}</Link></li>
            <li><Link href="/diensten">{t('services') || 'Servicii'}</Link></li>
            <li><Link href="/routes">Routes</Link></li>
            <li><Link href="/vloot">{t('fleet') || 'Flotă'}</Link></li>
            <li><Link href="/cariere">{t('careers') || 'Cariere'}</Link></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>{t('legalTitle') || 'Legal'}</h4>
          <ul className={styles.links}>
            <li><Link href="/termeni">{t('termsLink') || 'Termeni și Condiții'}</Link></li>
            <li><Link href="/politica">{t('privacyLink') || 'Politica de Confidențialitate'}</Link></li>
            <li><Link href="/cookies">{t('cookiesLink') || 'Politica Cookies'}</Link></li>
          </ul>
        </div>

        <div className={styles.column}>
          <h4 className={styles.title}>{getLabel("Social Media", "Social Media", "Sociale media", "Soziale Medien", "Médias sociaux", "Redes sociales")}</h4>
          <div className={styles.socialIcons}>
            {cmsData.social_linkedin && <a href={cmsData.social_linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#0A66C2" stroke="none"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></a>}
            {cmsData.social_facebook && <a href={cmsData.social_facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#1877F2" stroke="none"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg></a>}
            {cmsData.social_instagram && <a href={cmsData.social_instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="url(#instaGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <defs>
                  <linearGradient id="instaGradient" x1="2" y1="2" x2="22" y2="22">
                    <stop offset="0%" stopColor="#feda75" />
                    <stop offset="25%" stopColor="#fa7e1e" />
                    <stop offset="50%" stopColor="#d62976" />
                    <stop offset="75%" stopColor="#962fbf" />
                    <stop offset="100%" stopColor="#4f5bd5" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>}
            {cmsData.social_tiktok && <a href={cmsData.social_tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#ffffff" stroke="none"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.31-1.92 1.57-4.49 2.15-6.91 1.62-2.73-.55-5.07-2.31-6.22-4.83-1.07-2.33-1.03-5.11.23-7.39 1.25-2.34 3.6-3.83 6.22-4.13.43-.05.86-.06 1.29-.07v4.11c-1.34.09-2.74.52-3.69 1.51-.9.94-1.31 2.31-1.11 3.61.18 1.21.94 2.3 1.99 2.87 1.18.63 2.65.61 3.82-.04 1.05-.59 1.76-1.64 1.88-2.84.05-.55.04-1.1.04-1.65v-16.63z"/></svg></a>}
          </div>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>{t('contactTitle') || 'Contact'}</h4>
          <ul className={styles.links} style={{ lineHeight: '1.8' }}>
            <li>📍 {getLabel("Adresă", "Address", "Adres", "Adresse", "Adresse", "Dirección")}: {company.address || 'Transportweg 1, 1000 AA Amsterdam, Nederland'}</li>
            <li>📞 {getLabel("Tel", "Tel", "Tel", "Tel", "Tél", "Tel")}: {company.phone || '+31 20 000 0000'}</li>
            <li>✉️ {getLabel("Email", "Email", "E-mail", "E-Mail", "E-mail", "Correo")}: {company.email || 'office@hapcargo.com'}</li>
            <li>🏢 {getLabel("Nr. Reg", "Reg No", "KvK nummer", "Reg.-Nr.", "N° RCS", "Nº Reg")}: {company.regNo || '12345678'}</li>
            <li>💶 {getLabel("CUI / CIF", "VAT No", "BTW nummer", "USt-IdNr.", "N° TVA", "NIF / IVA")}: {company.cui || 'NL123456789B01'}</li>
            <li>⏰ {getLabel("Program de lucru", "Working Hours", "Openingstijden", "Arbeitszeiten", "Horaires de travail", "Horario de trabajo")}: {formatWorkingHours(company.workingHours)}</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.bottom}>
        <p>&copy; 2026-{new Date().getFullYear()} HapCargo Transport S.R.L. {t('rightsReserved') || 'Toate drepturile rezervate.'}</p>
      </div>
    </footer>
  );
};

export default Footer;
