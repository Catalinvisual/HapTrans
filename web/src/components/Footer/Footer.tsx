import React from 'react';
import Link from 'next/link';
import styles from './Footer.module.css';

const Footer = () => {
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
            Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală pe întreg teritoriul Europei.
          </p>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>Companie</h4>
          <ul className={styles.links}>
            <li><a href="#despre">Despre Noi</a></li>
            <li><a href="#servicii">Servicii</a></li>
            <li><a href="#flota">Flotă</a></li>
            <li><a href="#cariere">Cariere</a></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>Legal</h4>
          <ul className={styles.links}>
            <li><a href="/termeni">Termeni și Condiții</a></li>
            <li><a href="/politica">Politica de Confidențialitate</a></li>
            <li><a href="/cookies">Politica Cookies</a></li>
          </ul>
        </div>
        
        <div className={styles.column}>
          <h4 className={styles.title}>Contact</h4>
          <ul className={styles.links}>
            <li>📞 +40 700 000 000</li>
            <li>📧 office@hapcargo.com</li>
            <li>📍 București, România</li>
          </ul>
        </div>
      </div>
      
      <div className={styles.bottom}>
        <p>&copy; {new Date().getFullYear()} HapCargo. Toate drepturile rezervate.</p>
      </div>
    </footer>
  );
};

export default Footer;
