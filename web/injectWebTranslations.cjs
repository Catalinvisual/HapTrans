const fs = require('fs');

const contextPath = 'src/context/LanguageContext.tsx';
let content = fs.readFileSync(contextPath, 'utf8');

const newTranslations = `
  // Missing Web translations
  whyHapCargo: { RO: 'De ce HapCargo?', EN: 'Why HapCargo?', NL: 'Waarom HapCargo?', DE: 'Warum HapCargo?', FR: 'Pourquoi HapCargo?', ES: '¿Por qué HapCargo?' },
  mapCoverage: { RO: 'Acoperire Europeană', EN: 'European Coverage', NL: 'Europese Dekking', DE: 'Europäische Abdeckung', FR: 'Couverture Européenne', ES: 'Cobertura Europea' },
  testimonialsLabel: { RO: 'Testimoniale', EN: 'Testimonials', NL: 'Getuigenissen', DE: 'Referenzen', FR: 'Témoignages', ES: 'Testimonios' },
  footerDesc: { RO: 'Livrăm marfa dumneavoastră la timp, în siguranță și cu transparență totală pe întreg teritoriul Europei.', EN: 'We deliver your goods on time, safely and with full transparency across Europe.', NL: 'Wij leveren uw goederen op tijd, veilig en met volledige transparantie in heel Europa.', DE: 'Wir liefern Ihre Waren pünktlich, sicher und mit voller Transparenz in ganz Europa.', FR: 'Nous livrons vos marchandises à temps, en toute sécurité et avec une transparence totale à travers l\\'Europe.', ES: 'Entregamos su mercancía a tiempo, de forma segura y con total transparencia en toda Europa.' },
  companyTitle: { RO: 'Companie', EN: 'Company', NL: 'Bedrijf', DE: 'Unternehmen', FR: 'Entreprise', ES: 'Empresa' },
  legalTitle: { RO: 'Legal', EN: 'Legal', NL: 'Juridisch', DE: 'Rechtlich', FR: 'Juridique', ES: 'Legal' },
  contactTitle: { RO: 'Contact', EN: 'Contact', NL: 'Contact', DE: 'Kontakt', FR: 'Contact', ES: 'Contacto' },
  termsLink: { RO: 'Termeni și Condiții', EN: 'Terms and Conditions', NL: 'Algemene Voorwaarden', DE: 'Allgemeine Geschäftsbedingungen', FR: 'Termes et Conditions', ES: 'Términos y Condiciones' },
  privacyLink: { RO: 'Politica de Confidențialitate', EN: 'Privacy Policy', NL: 'Privacybeleid', DE: 'Datenschutzrichtlinie', FR: 'Politique de Confidentialité', ES: 'Política de Privacidad' },
  cookiesLink: { RO: 'Politica Cookies', EN: 'Cookies Policy', NL: 'Cookiebeleid', DE: 'Cookie-Richtlinie', FR: 'Politique des Cookies', ES: 'Política de Cookies' },
  rightsReserved: { RO: 'Toate drepturile rezervate.', EN: 'All rights reserved.', NL: 'Alle rechten voorbehouden.', DE: 'Alle Rechte vorbehalten.', FR: 'Tous droits réservés.', ES: 'Todos los derechos reservados.' },
  
  // Tracking specifics
  etaPlanned: { RO: 'ETA planificat / estimativ', EN: 'Planned / estimated ETA', NL: 'Geplande / geschatte ETA', DE: 'Geplante / geschätzte ETA', FR: 'ETA prévue / estimée', ES: 'ETA planificada / estimada' },
  etaLive: { RO: 'ETA Live', EN: 'Live ETA', NL: 'Live ETA', DE: 'Live ETA', FR: 'ETA en Direct', ES: 'ETA en Vivo' },
  deliveredOn: { RO: 'Livrat pe', EN: 'Delivered on', NL: 'Geleverd op', DE: 'Geliefert am', FR: 'Livré le', ES: 'Entregado el' },
  arrivalEstimated: { RO: 'Sosire estimată:', EN: 'Estimated arrival:', NL: 'Geschatte aankomst:', DE: 'Voraussichtliche Ankunft:', FR: 'Arrivée estimée:', ES: 'Llegada estimada:' },
  betweenTime: { RO: '–', EN: '-', NL: '-', DE: '-', FR: '-', ES: '-' },
  etaOnTime: { RO: '🟢 La timp', EN: '🟢 On time', NL: '🟢 Op tijd', DE: '🟢 Pünktlich', FR: '🟢 À l\\'heure', ES: '🟢 A tiempo' },
  etaUpdated: { RO: '🟡 ETA actualizat', EN: '🟡 ETA updated', NL: '🟡 ETA bijgewerkt', DE: '🟡 ETA aktualisiert', FR: '🟡 ETA mis à jour', ES: '🟡 ETA actualizado' },
  etaRisk: { RO: '🔴 Risc de întârziere', EN: '🔴 Delay risk', NL: '🔴 Vertragingsrisico', DE: '🔴 Verzögerungsrisiko', FR: '🔴 Risque de retard', ES: '🔴 Riesgo de retraso' },
  etaDelayed: { RO: '🔴 Întârziat', EN: '🔴 Delayed', NL: '🔴 Vertraagd', DE: '🔴 Verspätet', FR: '🔴 Retardé', ES: '🔴 Retrasado' },
  
  companyDetails: { RO: 'Detalii Companie', EN: 'Company Details', NL: 'Bedrijfsgegevens', DE: 'Firmendetails', FR: 'Détails de l\\'Entreprise', ES: 'Detalles de la Empresa' },
  headquarters: { RO: 'Sediu Central', EN: 'Headquarters', NL: 'Hoofdkantoor', DE: 'Hauptsitz', FR: 'Siège Social', ES: 'Sede' },
`;

if (!content.includes('whyHapCargo:')) {
  content = content.replace('const translations: Translations = {', 'const translations: Translations = {' + newTranslations);
  fs.writeFileSync(contextPath, content);
  console.log('Translations injected');
} else {
  console.log('Translations already exist');
}
