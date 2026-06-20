const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/context/LanguageContext.tsx');
let code = fs.readFileSync(file, 'utf8');

const newTranslations = `
  // Services
  realServicesTitle: { RO: 'Serviciile noastre', EN: 'Our services', NL: 'Onze diensten', DE: 'Unsere Dienstleistungen', FR: 'Nos services', ES: 'Nuestros servicios' },
  svc1: { RO: 'Transport Full Truck Load', EN: 'Full Truck Load transport', NL: 'Full Truck Load transport', DE: 'Komplettladungsverkehr', FR: 'Transport de lots complets', ES: 'Transporte de carga completa' },
  svc2: { RO: 'Transport Grupaj', EN: 'Groupage transport', NL: 'Groupage transport', DE: 'Sammelguttransport', FR: 'Transport de groupage', ES: 'Transporte de grupaje' },
  svc3: { RO: 'Transport Expres', EN: 'Express transport', NL: 'Express transport', DE: 'Express-Transport', FR: 'Transport express', ES: 'Transporte exprés' },
  svc4: { RO: 'Transport Pale?i', EN: 'Pallet transport', NL: 'Pallet transport', DE: 'Palettentransport', FR: 'Transport de palettes', ES: 'Transporte de palets' },
  svc5: { RO: 'Transport Frigorific', EN: 'Conditioned transport', NL: 'Geconditioneerd transport', DE: 'Kühltransport', FR: 'Transport frigorifique', ES: 'Transporte a temperatura controlada' },
  svc6: { RO: 'Distribu?ie Interna?ionala', EN: 'International distribution', NL: 'Internationale distributie', DE: 'Internationale Verteilung', FR: 'Distribution internationale', ES: 'Distribución internacional' },

  // How it works
  howItWorksTitle: { RO: 'Cum func?ioneaza', EN: 'How it works', NL: 'Zo werkt het', DE: 'Wie es funktioniert', FR: 'Comment ça marche', ES: 'Cómo funciona' },
  step1: { RO: 'Solicita o oferta', EN: 'Request a quote', NL: 'Vraag een offerte aan', DE: 'Angebot anfordern', FR: 'Demandez un devis', ES: 'Solicita una cotización' },
  step2: { RO: 'Noi planificam cursa', EN: 'We plan the trip', NL: 'Wij plannen de rit', DE: 'Wir planen die Fahrt', FR: 'Nous planifions le trajet', ES: 'Planificamos el viaje' },
  step3: { RO: 'Marfa este preluata', EN: 'Your freight is picked up', NL: 'Uw vracht wordt opgehaald', DE: 'Ihre Fracht wird abgeholt', FR: 'Votre fret est récupéré', ES: 'Se recoge su carga' },
  step4: { RO: 'Urmare?ti livrarea live', EN: 'You follow the delivery live', NL: 'U volgt de levering live', DE: 'Sie verfolgen die Lieferung live', FR: 'Vous suivez la livraison en direct', ES: 'Sigue la entrega en vivo' },
  step5: { RO: 'Livrare cu dovada', EN: 'Delivery with proof', NL: 'Levering met bewijs van aflevering', DE: 'Lieferung mit Nachweis', FR: 'Livraison avec preuve', ES: 'Entrega con comprobante' },

  // Trust
  trustTitle: { RO: 'Companie de transport de încredere', EN: 'Reliable transport company', NL: 'Betrouwbaar transportbedrijf', DE: 'Zuverlässiges Transportunternehmen', FR: 'Entreprise de transport fiable', ES: 'Empresa de transporte confiable' },
  trust1: { RO: 'Documente CMR', EN: 'CMR documents', NL: 'CMR-documenten', DE: 'CMR-Dokumente', FR: 'Documents CMR', ES: 'Documentos CMR' },
  trust2: { RO: 'Transport asigurat', EN: 'Insured transport', NL: 'Verzekerde transporten', DE: 'Versicherte Transporte', FR: 'Transports assurés', ES: 'Transportes asegurados' },
  trust3: { RO: '?oferi profesioni?ti', EN: 'Professional drivers', NL: 'Professionele chauffeurs', DE: 'Professionelle Fahrer', FR: 'Chauffeurs professionnels', ES: 'Conductores profesionales' },
  trust4: { RO: 'Urmarire live', EN: 'Live tracking', NL: 'Live tracking', DE: 'Live-Tracking', FR: 'Suivi en direct', ES: 'Seguimiento en vivo' },
  trust5: { RO: 'Comunicare clara', EN: 'Clear communication', NL: 'Duidelijke communicatie', DE: 'Klare Kommunikation', FR: 'Communication claire', ES: 'Comunicación clara' },

  // Menu
  navQuote: { RO: 'Cere oferta', EN: 'Request quote', NL: 'Offerte aanvragen', DE: 'Angebot anfordern', FR: 'Demander un devis', ES: 'Solicitar cotización' }
};
`;

const insertIndex = code.lastIndexOf('};');
if (insertIndex > -1) {
  const before = code.substring(0, insertIndex);
  const after = code.substring(insertIndex);
  // Find the exact "};" that closes the translations object
  // It's the one before "interface LanguageContextType"
  const endOfTranslations = code.indexOf('};', code.indexOf('loading: {'));
  if (endOfTranslations > -1) {
      code = code.substring(0, endOfTranslations) + ',\n' + newTranslations + '\n' + code.substring(endOfTranslations);
      fs.writeFileSync(file, code);
      console.log('Translations injected!');
  }
}

// 2. Fix the duplicate title in Features.tsx
const featuresFile = path.join(__dirname, 'web/src/components/Features/Features.tsx');
let featuresCode = fs.readFileSync(featuresFile, 'utf8');
featuresCode = featuresCode.replace(/<div className=\{styles\.label\}>[^<]*<\/div>/, '');
fs.writeFileSync(featuresFile, featuresCode);
console.log('Fixed Features duplicate label');
