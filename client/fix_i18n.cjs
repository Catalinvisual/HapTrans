const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let text = fs.readFileSync(p, 'utf8');

const langs = ['ro', 'en', 'nl', 'de', 'fr'];
let i = 0;
text = text.replace(/  1/g, () => {
  const lang = langs[i++];
  return '  ' + lang + ': { translation: {';
});

fs.writeFileSync(p, text);
console.log('fixed i18n.ts');
