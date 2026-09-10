const fs = require('fs');

const path = 'src/lib/i18n.ts';
let content = fs.readFileSync(path, 'utf8');

const sidebarKeys = {
  dashboard: { ro: "Dashboard", en: "Dashboard", nl: "Dashboard", de: "Dashboard", fr: "Tableau de bord" },
  trips: { ro: "Curse", en: "Trips", nl: "Ritten", de: "Fahrten", fr: "Trajets" },
  orders: { ro: "Comenzi", en: "Orders", nl: "Bestellingen", de: "Bestellungen", fr: "Commandes" },
  liveMap: { ro: "Harta Live", en: "Live Map", nl: "Live Kaart", de: "Live-Karte", fr: "Carte en direct" },
  trucks: { ro: "Camioane", en: "Trucks", nl: "Vrachtwagens", de: "LKW", fr: "Camions" },
  planning: { ro: "Planificare", en: "Planning", nl: "Planning", de: "Planung", fr: "Planification" },
  drivers: { ro: "Șoferi", en: "Drivers", nl: "Chauffeurs", de: "Fahrer", fr: "Chauffeurs" },
  clients: { ro: "Clienți", en: "Clients", nl: "Klanten", de: "Kunden", fr: "Clients" },
  chat: { ro: "Chat", en: "Chat", nl: "Chat", de: "Chat", fr: "Discussion" },
  documents: { ro: "Documente", en: "Documents", nl: "Documenten", de: "Dokumente", fr: "Documents" },
  invoices: { ro: "Facturi", en: "Invoices", nl: "Facturen", de: "Rechnungen", fr: "Factures" },
  financial: { ro: "Financiar", en: "Financial", nl: "Financieel", de: "Finanziell", fr: "Financier" },
  payroll: { ro: "Salarizare", en: "Payroll", nl: "Salarisadministratie", de: "Lohnabrechnung", fr: "Paie" },
  maintenance: { ro: "Mentenanță", en: "Maintenance", nl: "Onderhoud", de: "Wartung", fr: "Entretien" },
  expenses: { ro: "Cheltuieli", en: "Expenses", nl: "Uitgaven", de: "Ausgaben", fr: "Dépenses" },
  websiteCms: { ro: "Website Hub", en: "Website Hub", nl: "Website Hub", de: "Website Hub", fr: "Hub Web" },
  users: { ro: "Utilizatori", en: "Users", nl: "Gebruikers", de: "Benutzer", fr: "Utilisateurs" },
  settings: { ro: "Setări", en: "Settings", nl: "Instellingen", de: "Einstellungen", fr: "Paramètres" }
};

const langs = { ro: 'ro', en: 'en', nl: 'nl', de: 'de', fr: 'frBase' };

for (const [langCode, blockName] of Object.entries(langs)) {
  let newKeysStr = '';
  for (const [key, trans] of Object.entries(sidebarKeys)) {
    // Only add if not strictly present as exact key (e.g., ^\s*key:\s*)
    const blockStart = content.indexOf(`${blockName}: { translation: {`);
    let blockEnd = -1;
    const nextLangs = ['ro', 'en', 'nl', 'de', 'frBase'];
    const nextIdx = nextLangs.indexOf(blockName) + 1;
    if (nextIdx < nextLangs.length) {
      blockEnd = content.indexOf(`${nextLangs[nextIdx]}: { translation: {`, blockStart);
    } else {
      blockEnd = content.indexOf('};\n\nresources.fr = {');
      if (blockEnd === -1) blockEnd = content.length;
    }
    const blockText = content.substring(blockStart, blockEnd);
    if (!blockText.match(new RegExp(`^\\s*["']?${key}["']?\\s*:`, 'm'))) {
      newKeysStr += `\n      ${key}: ${JSON.stringify(trans[langCode])},`;
    }
  }
  if (newKeysStr) {
    const langRegex = new RegExp(`(${blockName}:\\s*\\{\\s*translation:\\s*\\{)`);
    content = content.replace(langRegex, `$1${newKeysStr}`);
    console.log(`Injected missing sidebar keys into ${blockName}`);
  }
}

fs.writeFileSync(path, content, 'utf8');
console.log('Sidebar keys fixed!');
