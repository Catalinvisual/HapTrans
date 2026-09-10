const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const startRO = content.indexOf('ro: { translation: {');
const endRO = content.indexOf('en: { translation: {');
const roText = content.substring(startRO, endRO);

const sidebarKeys = ['dashboard', 'trips', 'orders', 'liveMap', 'trucks', 'planning', 'drivers', 'clients', 'chat', 'documents', 'invoices', 'financial', 'payroll', 'maintenance', 'expenses', 'websiteCms', 'users', 'settings', 'addTruck', 'plateNumber', 'brand', 'model', 'capacity', 'consumption'];

const missing = [];
sidebarKeys.forEach(k => {
  const rx = new RegExp(`^[\\s]*["']?${k}["']?\\s*:`, 'm');
  if (!rx.test(roText)) {
    missing.push(k);
  }
});

console.log('Missing from RO exactly:', missing.join(', '));
