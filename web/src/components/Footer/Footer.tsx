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

        let cmsRes = await fetch(`${apiUrl}/website-cms`, { cache: 'no-store' });
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
            <a href={cmsData.social_linkedin || '#'} target={cmsData.social_linkedin ? "_blank" : "_self"} rel="noreferrer" aria-label="LinkedIn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22.227 0H1.765C.79 0 0 .777 0 1.733v20.534C0 23.223.79 24 1.765 24h20.462C23.21 24 24 23.223 24 22.267V1.733C24 .777 23.21 0 22.227 0zM7.118 20.453H3.555V8.995h3.563v11.458zM5.337 7.428A2.066 2.066 0 117.404 5.36a2.066 2.066 0 01-2.067 2.068zM20.453 20.453h-3.555v-5.57c0-1.328-.023-3.037-1.851-3.037-1.852 0-2.135 1.446-2.135 2.94v5.667H9.356V8.995h3.414v1.564h.047c.475-.9 1.637-1.85 3.367-1.85 3.603 0 4.269 2.37 4.269 5.452v6.292z" fill="#0A66C2"/></svg>
            </a>
            <a href={cmsData.social_facebook || '#'} target={cmsData.social_facebook ? "_blank" : "_self"} rel="noreferrer" aria-label="Facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073C24 5.405 18.627 0 12 0C5.373 0 0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24V15.563H7.078V12.073H10.125V9.413C10.125 6.388 11.917 4.717 14.658 4.717C15.97 4.717 17.344 4.952 17.344 4.952V7.933H15.832C14.343 7.933 13.875 8.867 13.875 9.825V12.073H17.203L16.671 15.563H13.875V24C19.612 23.094 24 18.1 24 12.073Z" fill="#1877F2"/><path d="M16.671 15.563L17.203 12.073H13.875V9.825C13.875 8.867 14.343 7.933 15.832 7.933H17.344V4.952s-1.374-.235-2.686-.235C11.917 4.717 10.125 6.388 10.125 9.413v2.66H7.078v3.49h3.047V24c.616.096 1.242.146 1.875.146.633 0 1.259-.05 1.875-.146v-8.437h2.796z" fill="white"/></svg>
            </a>
            <a href={cmsData.social_instagram || '#'} target={cmsData.social_instagram ? "_blank" : "_self"} rel="noreferrer" aria-label="Instagram">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="ig" x1="2" y1="2" x2="22" y2="22"><stop offset="0%" stopColor="#feda75" /><stop offset="25%" stopColor="#fa7e1e" /><stop offset="50%" stopColor="#d62976" /><stop offset="75%" stopColor="#962fbf" /><stop offset="100%" stopColor="#4f5bd5" /></linearGradient></defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm3.98-10.169a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z" fill="url(#ig)"/>
              </svg>
            </a>
            <a href={cmsData.social_tiktok || '#'} target={cmsData.social_tiktok ? "_blank" : "_self"} rel="noreferrer" aria-label="TikTok">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 2.78-1.15 5.54-3.33 7.31-1.92 1.57-4.49 2.15-6.91 1.62-2.73-.55-5.07-2.31-6.22-4.83-1.07-2.33-1.03-5.11.23-7.39 1.25-2.34 3.6-3.83 6.22-4.13.43-.05.86-.06 1.29-.07v4.11c-1.34.09-2.74.52-3.69 1.51-.9.94-1.31 2.31-1.11 3.61.18 1.21.94 2.3 1.99 2.87 1.18.63 2.65.61 3.82-.04 1.05-.59 1.76-1.64 1.88-2.84.05-.55.04-1.1.04-1.65v-16.63z" fill="white"/></svg>
            </a>
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
