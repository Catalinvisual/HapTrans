const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'client/src/lib/i18n.ts');
let code = fs.readFileSync(file, 'utf8');

const additions = {
  ro: {
    an_rides_per_country: 'Curse pe țară (Astăzi)',
    an_rides: 'Curse'
  },
  en: {
    an_rides_per_country: 'Rides Per Country (Today)',
    an_rides: 'Rides'
  },
  nl: {
    an_rides_per_country: 'Ritten per land (Vandaag)',
    an_rides: 'Ritten'
  },
  de: {
    an_rides_per_country: 'Fahrten pro Land (Heute)',
    an_rides: 'Fahrten'
  },
  fr: {
    an_rides_per_country: 'Trajets par pays (Aujourd\'hui)',
    an_rides: 'Trajets'
  }
};

for (const lang of Object.keys(additions)) {
  const marker = new RegExp(`(${lang}: \\{\\s*translation: \\{)`);
  const entries = Object.entries(additions[lang]).map(([k, v]) => `        ${k}: "${v}",`).join('\n');
  code = code.replace(marker, `$1\n${entries}`);
}

fs.writeFileSync(file, code);
console.log('Analytics Translations added!');
