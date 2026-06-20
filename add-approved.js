const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'client/src/lib/i18n.ts');
let code = fs.readFileSync(file, 'utf8');

const additions = {
  ro: {
    approved: 'Aprobata'
  },
  en: {
    approved: 'Approved'
  },
  nl: {
    approved: 'Goedgekeurd'
  },
  de: {
    approved: 'Genehmigt'
  },
  fr: {
    approved: 'Approuvée'
  }
};

for (const lang of Object.keys(additions)) {
  const marker = new RegExp(`(${lang}: \\{\\s*translation: \\{)`);
  const entries = Object.entries(additions[lang]).map(([k, v]) => `        ${k}: "${v}",`).join('\n');
  code = code.replace(marker, `$1\n${entries}`);
}

fs.writeFileSync(file, code);
console.log('Approved translations added!');
