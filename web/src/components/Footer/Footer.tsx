import React from 'react';
import styles from './Footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.column}>
          <h3 className={styles.brand}>
            <span className={styles.brandHap}>HAP</span>CARGO
          </h3>
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
