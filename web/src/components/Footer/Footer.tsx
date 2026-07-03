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
              <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="igGrad" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f09433"/>
                    <stop offset="0.25" stopColor="#e6683c"/>
                    <stop offset="0.5" stopColor="#dc2743"/>
                    <stop offset="0.75" stopColor="#cc2366"/>
                    <stop offset="1" stopColor="#bc1888"/>
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#igGrad)"/>
                <rect x="6" y="6" width="12" height="12" rx="3" fill="none" stroke="white" strokeWidth="2"/>
                <circle cx="12" cy="12" r="3" fill="none" stroke="white" strokeWidth="2"/>
                <circle cx="16" cy="8" r="1" fill="white"/>
              </svg>
            </a>
            <a href={cmsData.social_tiktok || '#'} target={cmsData.social_tiktok ? "_blank" : "_self"} rel="noreferrer" aria-label="TikTok">
              <svg width="24" height="24" viewBox="0 0 448 512" xmlns="http://www.w3.org/2000/svg">
                <rect width="448" height="512" rx="60" fill="black" />
                <path d="M410 188.75c-43.4 0-82-20-109.5-51v218.5c0 79.5-64.5 144-144 144S12.5 435.75 12.5 356.25 77 212.25 156.5 212.25c13.7 0 26.8 2 39.2 5.5v72.5c-12-3.4-25.2-5.5-39.2-5.5-39.7 0-72 32.3-72 72s32.3 72 72 72 72-32.3 72-72v-341h72.5c0 53 43 96 96 96v73z" fill="#25F4EE" transform="translate(-10, -10)" />
                <path d="M410 188.75c-43.4 0-82-20-109.5-51v218.5c0 79.5-64.5 144-144 144S12.5 435.75 12.5 356.25 77 212.25 156.5 212.25c13.7 0 26.8 2 39.2 5.5v72.5c-12-3.4-25.2-5.5-39.2-5.5-39.7 0-72 32.3-72 72s32.3 72 72 72 72-32.3 72-72v-341h72.5c0 53 43 96 96 96v73z" fill="#FE2C55" transform="translate(10, 10)" />
                <path d="M410 188.75c-43.4 0-82-20-109.5-51v218.5c0 79.5-64.5 144-144 144S12.5 435.75 12.5 356.25 77 212.25 156.5 212.25c13.7 0 26.8 2 39.2 5.5v72.5c-12-3.4-25.2-5.5-39.2-5.5-39.7 0-72 32.3-72 72s32.3 72 72 72 72-32.3 72-72v-341h72.5c0 53 43 96 96 96v73z" fill="white" />
              </svg>
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
