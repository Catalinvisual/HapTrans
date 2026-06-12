'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'RO' | 'EN' | 'NL' | 'DE' | 'FR' | 'ES';

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Header
  home: { RO: 'Acasă', EN: 'Home', NL: 'Startpagina', DE: 'Startseite', FR: 'Accueil', ES: 'Inicio' },
  about: { RO: 'Despre noi', EN: 'About us', NL: 'Over ons', DE: 'Über uns', FR: 'À propos', ES: 'Sobre nosotros' },
  services: { RO: 'Servicii', EN: 'Services', NL: 'Diensten', DE: 'Dienstleistungen', FR: 'Services', ES: 'Servicios' },
  fleet: { RO: 'Flotă', EN: 'Fleet', NL: 'Vloot', DE: 'Flotte', FR: 'Flotte', ES: 'Flota' },
  contact: { RO: 'Contact', EN: 'Contact', NL: 'Contact', DE: 'Kontakt', FR: 'Contact', ES: 'Contacto' },
  clientLogin: { RO: 'CLIENT LOGIN', EN: 'CLIENT LOGIN', NL: 'KLANTEN LOGIN', DE: 'KUNDEN-LOGIN', FR: 'ESPACE CLIENT', ES: 'ACCESO CLIENTES' },
  
  // Hero
  heroTitle: { RO: 'Transport internațional, la standarde profesionale.', EN: 'International transport, at professional standards.', NL: 'Internationaal transport, op professioneel niveau.', DE: 'Internationaler Transport, nach professionellen Standards.', FR: 'Transport international, selon des normes professionnelles.', ES: 'Transporte internacional, con estándares profesionales.' },
  heroSubtitle: { RO: 'Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală.', EN: 'We deliver your freight on time, safely and with full transparency.', NL: 'Wij leveren uw vracht op tijd, veilig en met volledige transparantie.', DE: 'Wir liefern Ihre Fracht pünktlich, sicher und mit voller Transparenz.', FR: 'Nous livrons vos marchandises à temps, en toute sécurité et avec une transparence totale.', ES: 'Entregamos su carga a tiempo, de forma segura y con total transparencia.' },
  badge: { RO: 'Rapid & Sigur', EN: 'Fast & Secure', NL: 'Snel & Veilig', DE: 'Schnell & Sicher', FR: 'Rapide & Sécurisé', ES: 'Rápido & Seguro' },
  
  // Calculator
  calcTitle: { RO: 'Calculator de Preț', EN: 'Price Calculator', NL: 'Prijscalculator', DE: 'Preisrechner', FR: 'Calculateur de prix', ES: 'Calculadora de precios' },
  calcDesc: { RO: 'Obține o estimare rapidă a costului pentru expedierea ta.', EN: 'Get a quick cost estimate for your shipment.', NL: 'Krijg een snelle kostenraming voor uw zending.', DE: 'Erhalten Sie einen schnellen Kostenvoranschlag für Ihre Sendung.', FR: 'Obtenez une estimation rapide du coût de votre envoi.', ES: 'Obtenga una estimación rápida del costo de su envío.' },
  calcFrom: { RO: 'De la (Adresă / Oraș / Țară)', EN: 'From (Address / City / Country)', NL: 'Van (Adres / Stad / Land)', DE: 'Von (Adresse / Stadt / Land)', FR: 'De (Adresse / Ville / Pays)', ES: 'De (Dirección / Ciudad / País)' },
  calcFromPlaceholder: { RO: 'ex: București, RO', EN: 'e.g., London, UK', NL: 'bijv., Amsterdam, NL', DE: 'z.B. Berlin, DE', FR: 'ex: Paris, FR', ES: 'ej. Madrid, ES' },
  calcTo: { RO: 'Către (Adresă / Oraș / Țară)', EN: 'To (Address / City / Country)', NL: 'Naar (Adres / Stad / Land)', DE: 'Nach (Adresse / Stadt / Land)', FR: 'À (Adresse / Ville / Pays)', ES: 'A (Dirección / Ciudad / País)' },
  calcToPlaceholder: { RO: 'ex: Munchen, DE', EN: 'e.g., Paris, FR', NL: 'bijv., Berlijn, DE', DE: 'z.B. Wien, AT', FR: 'ex: Lyon, FR', ES: 'ej. Barcelona, ES' },
  calcWeight: { RO: 'Greutate', EN: 'Weight', NL: 'Gewicht', DE: 'Gewicht', FR: 'Poids', ES: 'Peso' },
  calcWeightPlaceholder: { RO: 'ex: 21 tone', EN: 'e.g., 21 tons', NL: 'bijv., 21 ton', DE: 'z.B. 21 Tonnen', FR: 'ex: 21 tonnes', ES: 'ej. 21 toneladas' },
  calcType: { RO: 'Tip Marfă', EN: 'Freight Type', NL: 'Vrachttype', DE: 'Frachtart', FR: 'Type de Fret', ES: 'Tipo de Carga' },
  calcTypePlaceholder: { RO: 'ex: Paleți generali', EN: 'e.g., General pallets', NL: 'bijv., Algemene pallets', DE: 'z.B. Allgemeine Paletten', FR: 'ex: Palettes générales', ES: 'ej. Palets generales' },
  calcNotes: { RO: 'Observații (Opțional)', EN: 'Notes (Optional)', NL: 'Opmerkingen (Optioneel)', DE: 'Anmerkungen (Optional)', FR: 'Notes (Optionnel)', ES: 'Notas (Opcional)' },
  calcNotesPlaceholder: { RO: '...', EN: '...', NL: '...', DE: '...', FR: '...', ES: '...' },
  calcSubmit: { RO: 'Calculează Oferta', EN: 'Calculate Quote', NL: 'Offerte berekenen', DE: 'Angebot berechnen', FR: 'Calculer l\'offre', ES: 'Calcular oferta' },
  calcLoading: { RO: 'Se calculează...', EN: 'Calculating...', NL: 'Berekenen...', DE: 'Wird berechnet...', FR: 'Calcul en cours...', ES: 'Calculando...' },

  // Map
  mapTitle: { RO: 'Unde transportăm?', EN: 'Where do we transport?', NL: 'Waar transporteren we?', DE: 'Wo transportieren wir?', FR: 'Où transportons-nous?', ES: '¿Dónde transportamos?' },
  mapDesc: { RO: 'Acoperim rutele principale din Europa cu o flotă modernă și șoferi profesioniști. Oferim transport sigur și punctual pentru clienții noștri pe următoarele piețe cheie:', EN: 'We cover the main routes in Europe with a modern fleet and professional drivers. We offer safe and punctual transport for our clients in the following key markets:', NL: 'Wij bestrijken de belangrijkste routes in Europa met een modern wagenpark en professionele chauffeurs. Wij bieden veilig en stipt transport voor onze klanten in de volgende belangrijke markten:', DE: 'Wir decken die wichtigsten Routen in Europa mit einer modernen Flotte und professionellen Fahrern ab. Wir bieten unseren Kunden sicheren und pünktlichen Transport auf den folgenden Schlüsselmärkten:', FR: 'Nous couvrons les principaux itinéraires en Europe avec une flotte moderne et des chauffeurs professionnels. Nous offrons un transport sûr et ponctuel pour nos clients sur les marchés clés suivants:', ES: 'Cubrimos las principales rutas de Europa con una flota moderna y conductores profesionales. Ofrecemos transporte seguro y puntual para nuestros clientes en los siguientes mercados clave:' },
  mapPlaceholder: { RO: 'Harta Interactivă Europa', EN: 'Interactive Map of Europe', NL: 'Interactieve kaart van Europa', DE: 'Interaktive Europakarte', FR: 'Carte interactive de l\'Europe', ES: 'Mapa interactivo de Europa' },

  // Stats
  statsTrucks: { RO: 'Camioane Moderne', EN: 'Modern Trucks', NL: 'Moderne Vrachtwagens', DE: 'Moderne LKW', FR: 'Camions Modernes', ES: 'Camiones Modernos' },
  statsClients: { RO: 'Clienți Mulțumiți', EN: 'Happy Clients', NL: 'Tevreden Klanten', DE: 'Zufriedene Kunden', FR: 'Clients Satisfaits', ES: 'Clientes Satisfechos' },
  statsTrips: { RO: 'Curse Efectuate', EN: 'Completed Trips', NL: 'Voltooide Ritten', DE: 'Abgeschlossene Fahrten', FR: 'Trajets Terminés', ES: 'Viajes Completados' },
  statsCountries: { RO: 'Țări Acoperite', EN: 'Countries Covered', NL: 'Gedekte Landen', DE: 'Abgedeckte Länder', FR: 'Pays Couverts', ES: 'Países Cubiertos' },

  // Testimonials
  testimonialsTitle: { RO: 'Ce Spun Clienții Noștri', EN: 'What Our Clients Say', NL: 'Wat Onze Klanten Zeggen', DE: 'Was Unsere Kunden Sagen', FR: 'Ce Que Disent Nos Clients', ES: 'Lo Que Dicen Nuestros Clientes' },
  testimonialsDesc: { RO: 'Mândria noastră este satisfacția partenerilor de afaceri.', EN: 'Our pride is the satisfaction of our business partners.', NL: 'Onze trots is de tevredenheid van onze zakenpartners.', DE: 'Unser Stolz ist die Zufriedenheit unserer Geschäftspartner.', FR: 'Notre fierté est la satisfaction de nos partenaires commerciaux.', ES: 'Nuestro orgullo es la satisfacción de nuestros socios comerciales.' },
  review1: { RO: 'Colaborăm de 3 ani cu HapCargo. Foarte prompți și mereu atenți la detalii. Camioanele sunt impecabile, iar platforma de urmărire ne ajută enorm.', EN: 'We have been working with HapCargo for 3 years. Very prompt and always attentive to details. The trucks are impeccable, and the tracking platform helps us enormously.', NL: 'We werken al 3 jaar samen met HapCargo. Zeer stipt en altijd aandachtig voor details. De vrachtwagens zijn onberispelijk en het trackingplatform helpt ons enorm.', DE: 'Wir arbeiten seit 3 Jahren mit HapCargo zusammen. Sehr prompt und immer auf Details bedacht. Die LKWs sind tadellos und die Tracking-Plattform hilft uns enorm.', FR: 'Nous travaillons avec HapCargo depuis 3 ans. Très rapides et toujours attentifs aux détails. Les camions sont impeccables et la plateforme de suivi nous aide énormément.', ES: 'Llevamos 3 años trabajando con HapCargo. Muy rápidos y siempre atentos a los detalles. Los camiones son impecables y la plataforma de seguimiento nos ayuda enormemente.' },
  review2: { RO: 'Cel mai bun raport calitate-preț pentru rutele externe. Apreciem transparența totală și comunicarea excelentă a dispecerilor.', EN: 'The best value for money for external routes. We appreciate the total transparency and the excellent communication of the dispatchers.', NL: 'De beste prijs-kwaliteitverhouding voor externe routes. We waarderen de totale transparantie en de uitstekende communicatie van de expediteurs.', DE: 'Das beste Preis-Leistungs-Verhältnis für externe Routen. Wir schätzen die absolute Transparenz und die hervorragende Kommunikation der Disponenten.', FR: 'Le meilleur rapport qualité-prix pour les itinéraires externes. Nous apprécions la transparence totale et l\'excellente communication des répartiteurs.', ES: 'La mejor relación calidad-precio para rutas externas. Apreciamos la total transparencia y la excelente comunicación de los despachadores.' },
  review3: { RO: 'Un partener de încredere pentru cursele din Germania spre Europa de Est. Recomand cu încredere serviciile HapCargo.', EN: 'A reliable partner for trips from Germany to Eastern Europe. I highly recommend HapCargo services.', NL: 'Een betrouwbare partner voor ritten van Duitsland naar Oost-Europa. Ik raad de diensten van HapCargo ten zeerste aan.', DE: 'Ein zuverlässiger Partner für Fahrten von Deutschland nach Osteuropa. Ich empfehle die Dienste von HapCargo wärmstens.', FR: 'Un partenaire de confiance pour les trajets de l\'Allemagne vers l\'Europe de l\'Est. Je recommande vivement les services HapCargo.', ES: 'Un socio de confianza para viajes desde Alemania a Europa del Este. Recomiendo encarecidamente los servicios de HapCargo.' },

  // Track Portal
  trackTitle: { RO: 'Portal Urmărire Client', EN: 'Client Tracking Portal', NL: 'Klant Volgportaal', DE: 'Kunden-Tracking-Portal', FR: 'Portail de Suivi Client', ES: 'Portal de Seguimiento de Clientes' },
  trackDesc: { RO: 'Introduceți AWB-ul sau Token-ul cursei pentru a vizualiza statusul live al mărfii.', EN: 'Enter the AWB or Trip Token to view the live status of your freight.', NL: 'Voer de AWB of Trip Token in om de live status van uw vracht te bekijken.', DE: 'Geben Sie die AWB oder das Trip Token ein, um den Live-Status Ihrer Fracht anzuzeigen.', FR: 'Entrez l\'AWB ou le Token de trajet pour voir le statut en direct de votre fret.', ES: 'Ingrese el AWB o el Token de viaje para ver el estado en vivo de su carga.' },
  trackButton: { RO: 'Urmărește Cursa', EN: 'Track Trip', NL: 'Volg Rit', DE: 'Fahrt Verfolgen', FR: 'Suivre le Trajet', ES: 'Rastrear Viaje' },

  // Features
  featuresTitle: { RO: 'Servicii de Top', EN: 'Top Services', NL: 'Top Diensten', DE: 'Top Dienstleistungen', FR: 'Services de Premier Plan', ES: 'Servicios Principales' },
  featuresSubtitle: { RO: 'De ce să alegi HapCargo pentru transportul tău.', EN: 'Why choose HapCargo for your transport.', NL: 'Waarom kiezen voor HapCargo voor uw transport.', DE: 'Warum HapCargo für Ihren Transport wählen.', FR: 'Pourquoi choisir HapCargo pour votre transport.', ES: 'Por qué elegir HapCargo para su transporte.' },
  feat0Title: { RO: 'Acoperire Europeană', EN: 'European Coverage', NL: 'Europese Dekking', DE: 'Europäische Abdeckung', FR: 'Couverture Européenne', ES: 'Cobertura Europea' },
  feat0Desc: { RO: 'Curse regulate pe cele mai importante rute din Europa.', EN: 'Regular trips on the most important routes in Europe.', NL: 'Regelmatige ritten op de belangrijkste routes in Europa.', DE: 'Regelmäßige Fahrten auf den wichtigsten Routen in Europa.', FR: 'Trajets réguliers sur les routes les plus importantes d\'Europe.', ES: 'Viajes regulares en las rutas más importantes de Europa.' },
  feat1Title: { RO: 'Flotă Modernă', EN: 'Modern Fleet', NL: 'Modern Wagenpark', DE: 'Moderne Flotte', FR: 'Flotte Moderne', ES: 'Flota Moderna' },
  feat1Desc: { RO: 'Camioane noi, sigure și ecologice pentru eficiență maximă.', EN: 'New, safe, and ecological trucks for maximum efficiency.', NL: 'Nieuwe, veilige en ecologische vrachtwagens voor maximale efficiëntie.', DE: 'Neue, sichere und ökologische LKWs für maximale Effizienz.', FR: 'Camions neufs, sûrs et écologiques pour une efficacité maximale.', ES: 'Camiones nuevos, seguros y ecológicos para máxima eficiencia.' },
  feat2Title: { RO: 'Urmărire Live GPS', EN: 'Live GPS Tracking', NL: 'Live GPS Tracking', DE: 'Live GPS-Tracking', FR: 'Suivi GPS en Direct', ES: 'Rastreo GPS en Vivo' },
  feat2Desc: { RO: 'Știi mereu unde este marfa ta, 24/7.', EN: 'You always know where your freight is, 24/7.', NL: 'U weet altijd waar uw vracht is, 24/7.', DE: 'Sie wissen immer, wo Ihre Fracht ist, rund um die Uhr.', FR: 'Vous savez toujours où se trouve votre fret, 24/7.', ES: 'Siempre sabe dónde está su carga, 24/7.' },
  feat3Title: { RO: 'Suport Dedicat', EN: 'Dedicated Support', NL: 'Toegewijde Ondersteuning', DE: 'Engagierter Support', FR: 'Support Dédicacé', ES: 'Soporte Dedicado' },
  feat3Desc: { RO: 'Echipa noastră de dispeceri este mereu la dispoziția ta.', EN: 'Our dispatcher team is always at your disposal.', NL: 'Ons team van expediteurs staat altijd tot uw beschikking.', DE: 'Unser Disponenten-Team steht Ihnen jederzeit zur Verfügung.', FR: 'Notre équipe de répartiteurs est toujours à votre disposition.', ES: 'Nuestro equipo de despachadores está siempre a su disposición.' },
};

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>('RO');

  useEffect(() => {
    const savedLang = localStorage.getItem('hapcargo_lang') as Language;
    if (savedLang && translations.home[savedLang]) {
      setLangState(savedLang);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('hapcargo_lang', newLang);
  };

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
