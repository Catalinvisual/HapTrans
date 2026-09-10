const fs = require('fs');

const path = 'src/lib/i18n.ts';
let code = fs.readFileSync(path, 'utf8');

const keys = {
  ro: `allOrdersPlanned: "Toate comenzile sunt planificate!",\n      noResult: "Niciun rezultat",`,
  en: `allOrdersPlanned: "All orders are planned!",\n      noResult: "No result",`,
  nl: `allOrdersPlanned: "Alle bestellingen zijn gepland!",\n      noResult: "Geen resultaat",`,
  de: `allOrdersPlanned: "Alle Bestellungen sind geplant!",\n      noResult: "Kein Ergebnis",`,
  frBase: `allOrdersPlanned: "Toutes les commandes sont planifiées !",\n      noResult: "Aucun résultat",`
};

for (const [lang, add] of Object.entries(keys)) {
  const r = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
  code = code.replace(r, `$1\n      ${add}`);
}

fs.writeFileSync(path, code);
console.log('Done injecting planning keys');
