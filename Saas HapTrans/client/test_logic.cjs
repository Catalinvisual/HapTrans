const fs = require('fs');

let content = fs.readFileSync('prev_i18n.ts', 'utf8');
console.log('Original length:', content.length);

const injectLangs = ['ro', 'en', 'nl', 'de'];
injectLangs.forEach(lang => {
  const marker = `${lang}: { translation: {`;
  const idx = content.indexOf(marker);
  if (idx !== -1) {
    const toInject = '\n      "dashboard": "Dashboard",';
    content = content.substring(0, idx + marker.length) + toInject + content.substring(idx + marker.length);
  }
});
console.log('Length after injectLangs:', content.length);

const startFr = content.indexOf('frBase: { translation: {');
const endFr = content.indexOf('resources.fr = {', startFr);
console.log('startFr:', startFr, 'endFr:', endFr);

const final = content.substring(0, startFr) + 'NEW_FR' + content.substring(endFr);
console.log('Final length:', final.length);
