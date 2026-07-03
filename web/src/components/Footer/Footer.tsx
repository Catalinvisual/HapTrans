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
            {cmsData.social_linkedin && <a href={cmsData.social_linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg></a>}
            {cmsData.social_facebook && <a href={cmsData.social_facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg></a>}
            {cmsData.social_instagram && <a href={cmsData.social_instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg></a>}
            {cmsData.social_tiktok && <a href={cmsData.social_tiktok} target="_blank" rel="noreferrer" aria-label="TikTok"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg></a>}
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
