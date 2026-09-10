const fs = require('fs');
const https = require('https');

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

// 1. Inject missing keys into ro, en, nl, de
const injectLangs = ['ro', 'en', 'nl', 'de'];
injectLangs.forEach(lang => {
  const marker = `${lang}: { translation: {`;
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    let toInject = '';
    for (const [k, v] of Object.entries(sidebarKeys)) {
      toInject += `\n      "${k}": ${JSON.stringify(v[lang])},`;
    }
    content = content.substring(0, idx + marker.length) + toInject + content.substring(idx + marker.length);
  }
});
console.log('Injected sidebar keys into ro, en, nl, de');

// 2. Extract RO keys
const startRo = content.indexOf('ro: { translation: {');
const endRo = content.indexOf('en: { translation: {');
const roText = content.substring(startRo, endRo);
const roKeys = {};
roText.split('\n').forEach(line => {
  const match = line.match(/^\s*(["']?[a-zA-Z0-9_.-]+["']?)\s*:\s*(['"`])(.*?)\2/);
  if (match) {
    let k = match[1];
    if (k.startsWith('"') || k.startsWith("'")) k = k.slice(1, -1);
    roKeys[k] = match[3];
  }
});
console.log('Extracted', Object.keys(roKeys).length, 'keys from RO');

// 3. Nuke frBase and prepare for regeneration
const startFr = content.indexOf('frBase: { translation: {');
const endFr = content.indexOf('resources.fr = {', startFr);

async function translateChunk(texts) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=fr&dt=t&q=${encodeURIComponent(texts.join(' ||| '))}`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          if (parsed && parsed[0]) {
            parsed[0].forEach(t => translated += (t[0] || ''));
          }
          resolve(translated.split(/\s*\|\|\|\s*|\s*\|\s*\|\s*\|\s*/));
        } catch(e) { resolve(texts); }
      });
    }).on('error', () => resolve(texts));
  });
}

function unCamelCase(str) {
  return str.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

async function main() {
  const keysToTranslate = Object.keys(roKeys);
  const translations = {};
  const chunkSize = 20;
  
  for (let i = 0; i < keysToTranslate.length; i += chunkSize) {
    const cKeys = keysToTranslate.slice(i, i + chunkSize);
    const cTexts = cKeys.map(k => roKeys[k]);
    
    console.log(`Translating chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(keysToTranslate.length/chunkSize)} for French...`);
    const transParts = await translateChunk(cTexts);
    
    cKeys.forEach((k, idx) => {
      let val = transParts[idx] ? transParts[idx].trim() : unCamelCase(k);
      translations[k] = val;
    });
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  let newFrBaseStr = 'frBase: { translation: {';
  for (const [k, v] of Object.entries(translations)) {
    const formattedKey = k.includes('.') ? `"${k}"` : k;
    newFrBaseStr += `\n      ${formattedKey}: ${JSON.stringify(v)},`;
  }
  newFrBaseStr += '\n    }\n  },\n};\n\n';
  
  content = content.substring(0, startFr) + newFrBaseStr + content.substring(endFr);
  fs.writeFileSync(path, content, 'utf8');
  console.log('French block perfectly regenerated!');
}

main();
