const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const blocks = ['ro', 'en', 'nl', 'de', 'frBase'];
const sidebarKeys = ['dashboard', 'trips', 'orders', 'liveMap', 'trucks', 'planning', 'drivers', 'clients', 'chat', 'documents', 'invoices', 'financial', 'payroll', 'maintenance', 'expenses', 'websiteCms', 'users', 'settings', 'addTruck', 'plateNumber', 'brand', 'model', 'capacity', 'consumption'];

blocks.forEach(lang => {
  let startStr = `${lang}: { translation: {`;
  let start = content.indexOf(startStr);
  if (start === -1) {
    console.log(`Lang ${lang} not found`);
    return;
  }
  let end = -1;
  const nextLangs = ['ro', 'en', 'nl', 'de', 'frBase'];
  const nextIdx = nextLangs.indexOf(lang) + 1;
  if (nextIdx < nextLangs.length) {
    end = content.indexOf(`${nextLangs[nextIdx]}: { translation: {`, start);
  } else {
    end = content.indexOf('};\n\nresources.fr = {');
    if(end === -1) end = content.indexOf('};\r\n\r\nresources.fr = {');
    if(end === -1) end = content.length;
  }
  
  const blockText = content.substring(start, end);
  let missing = [];
  sidebarKeys.forEach(k => {
    if (!blockText.match(new RegExp(`["']?${k}["']?\\s*:`))) {
      missing.push(k);
    }
  });
  console.log(`${lang} missing:`, missing.join(', '));
});
