const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const startEN = content.indexOf('en: { translation: {');
const endEN = content.indexOf('nl: { translation: {');
const enText = content.substring(startEN, endEN);

enText.split('\n').forEach(l => {
  if (l.match(/["']?orders["']?\s*:/)) console.log(l);
});
