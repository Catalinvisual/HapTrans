const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/context/LanguageContext.tsx');
let code = fs.readFileSync(file, 'utf8');

// 1. Update Hero Title and Subtitle
code = code.replace(/heroSubtitle: \{ RO: 'Livrm marfa[^}]+\},/, `heroSubtitle: { RO: 'Transport de încredere prin toata Europa, cu urmarire live ?i comunicare clara.', EN: 'Reliable transport throughout Europe with live tracking and clear communication.', NL: 'Betrouwbaar transport door heel Europa met live tracking en duidelijke communicatie.', DE: 'Zuverlässiger Transport durch ganz Europa mit Live-Tracking und klarer Kommunikation.', FR: 'Transport fiable à travers l\\'Europe avec suivi en direct et communication claire.', ES: 'Transporte confiable por toda Europa con seguimiento en vivo y comunicación clara.' },`);

// 2. Change featuresTitle
code = code.replace(/featuresTitle: \{ RO: 'Servicii de Top'[^}]+\},/, `featuresTitle: { RO: 'De ce sa alegi HapCargo?', EN: 'Why choose HapCargo?', NL: 'Waarom kiezen voor HapCargo?', DE: 'Warum HapCargo wählen?', FR: 'Pourquoi choisir HapCargo ?', ES: '¿Por qué elegir HapCargo?' },`);

// 3. Map Section
code = code.replace(/mapTitle: \{ RO: 'Unde transportm\?', EN: 'Where do we transport\?', NL: 'Waar transporteren we\?', DE: 'Wo transportieren wir\?', FR: 'Où transportons-nous\?', ES: '¿Dónde transportamos\?' \},/, `mapTitle: { RO: 'Activ pe rute europene importante', EN: 'Active on major European routes', NL: 'Actief op belangrijke Europese routes', DE: 'Aktiv auf wichtigen europäischen Routen', FR: 'Actif sur les grands axes européens', ES: 'Activo en las principales rutas europeas' },`);

// 4. Footer vacatures
code = code.replace(/careers: \{ RO: 'Cariere', EN: 'Careers', NL: 'Careers', DE: 'Karriere', FR: 'Carrières', ES: 'Carreras' \},/, `careers: { RO: 'Cariere', EN: 'Careers', NL: 'Vacatures', DE: 'Karriere', FR: 'Carrières', ES: 'Carreras' },`);

// 5. Add new translations at the end of the translations object
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
    navQuote: { RO: 'Cere oferta', EN: 'Request quote', NL: 'Offerte aanvragen', DE: 'Angebot anfordern', FR: 'Demander un devis', ES: 'Solicitar cotización' },
`;

// Insert before the last closing brace of translations object
code = code.replace(/    \/\/ Admin\s+adminMenu:/, newTranslations + '\n    // Admin\n    adminMenu:');

fs.writeFileSync(file, code);
console.log('Translations updated successfully.');
