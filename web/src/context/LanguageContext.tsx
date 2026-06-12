'use client';
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'RO' | 'EN' | 'DE' | 'FR' | 'ES';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Header
  home: { RO: 'Acasă', EN: 'Home', DE: 'Startseite', FR: 'Accueil', ES: 'Inicio' },
  about: { RO: 'Despre noi', EN: 'About us', DE: 'Über uns', FR: 'À propos', ES: 'Sobre nosotros' },
  services: { RO: 'Servicii', EN: 'Services', DE: 'Dienstleistungen', FR: 'Services', ES: 'Servicios' },
  fleet: { RO: 'Flotă', EN: 'Fleet', DE: 'Flotte', FR: 'Flotte', ES: 'Flota' },
  contact: { RO: 'Contact', EN: 'Contact', DE: 'Kontakt', FR: 'Contact', ES: 'Contacto' },
  clientLogin: { RO: 'CLIENT LOGIN', EN: 'CLIENT LOGIN', DE: 'KUNDEN-LOGIN', FR: 'ESPACE CLIENT', ES: 'ACCESO CLIENTES' },
  
  // Hero
  heroTitle: { RO: 'Transport internațional, la standarde profesionale.', EN: 'International transport, at professional standards.', DE: 'Internationaler Transport, nach professionellen Standards.', FR: 'Transport international, selon des normes professionnelles.', ES: 'Transporte internacional, con estándares profesionales.' },
  heroSubtitle: { RO: 'Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală.', EN: 'We deliver your freight on time, safely and with full transparency.', DE: 'Wir liefern Ihre Fracht pünktlich, sicher und mit voller Transparenz.', FR: 'Nous livrons vos marchandises à temps, en toute sécurité et avec une transparence totale.', ES: 'Entregamos su carga a tiempo, de forma segura y con total transparencia.' },
  badge: { RO: 'Rapid & Sigur', EN: 'Fast & Secure', DE: 'Schnell & Sicher', FR: 'Rapide & Sécurisé', ES: 'Rápido & Seguro' },
  
  // Calculator
  calcTitle: { RO: 'Calculator de Preț', EN: 'Price Calculator', DE: 'Preisrechner', FR: 'Calculateur de prix', ES: 'Calculadora de precios' },
  calcDesc: { RO: 'Obține instant o estimare de cost pentru cursa ta.', EN: 'Get an instant cost estimate for your shipment.', DE: 'Erhalten Sie sofort einen Kostenvoranschlag für Ihre Sendung.', FR: 'Obtenez instantanément une estimation de coût pour votre expédition.', ES: 'Obtenga un presupuesto al instante para su envío.' },
  calcFrom: { RO: 'De la (Adresă / Oraș / Țară)', EN: 'From (Address / City / Country)', DE: 'Von (Adresse / Stadt / Land)', FR: 'De (Adresse / Ville / Pays)', ES: 'De (Dirección / Ciudad / País)' },
  calcTo: { RO: 'Până la (Adresă / Oraș / Țară)', EN: 'To (Address / City / Country)', DE: 'Nach (Adresse / Stadt / Land)', FR: 'À (Adresse / Ville / Pays)', ES: 'Para (Dirección / Ciudad / País)' },
  calcWeight: { RO: 'Greutate', EN: 'Weight', DE: 'Gewicht', FR: 'Poids', ES: 'Peso' },
  calcType: { RO: 'Tip Marfă', EN: 'Freight Type', DE: 'Frachtart', FR: 'Type de fret', ES: 'Tipo de carga' },
  calcNotes: { RO: 'Observații (Opțional)', EN: 'Notes (Optional)', DE: 'Bemerkungen (Optional)', FR: 'Remarques (Optionnel)', ES: 'Notas (Opcional)' },
  calcSubmit: { RO: 'Calculează Oferta', EN: 'Calculate Quote', DE: 'Angebot berechnen', FR: 'Calculer l\'offre', ES: 'Calcular oferta' },
  calcLoading: { RO: 'Se calculează...', EN: 'Calculating...', DE: 'Wird berechnet...', FR: 'Calcul en cours...', ES: 'Calculando...' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>('RO');

  const t = (key: string): string => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
