const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const translations = {
  ro: 'website_hub_tabs_jobs: "Cariere / Jobs",',
  en: 'website_hub_tabs_jobs: "Careers / Jobs",',
  nl: 'website_hub_tabs_jobs: "Carrière / Jobs",',
  de: 'website_hub_tabs_jobs: "Karriere / Jobs",',
  frBase: 'website_hub_tabs_jobs: "Carrières / Emplois",',
  pl: 'website_hub_tabs_jobs: "Kariera / Praca",',
  es: 'website_hub_tabs_jobs: "Carreras / Empleos",'
};

for (const [lang, trans] of Object.entries(translations)) {
  const regex = new RegExp(`(  ${lang}: \\{ translation: \\{)`);
  content = content.replace(regex, `$1\n      ${trans}`);
}

fs.writeFileSync(filePath, content);
console.log('Updated hub titles successfully.');
