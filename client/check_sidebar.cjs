const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const start = content.indexOf('ro: { translation: {');
const end = content.indexOf('en: { translation: {');
const roText = content.substring(start, end);

const sidebarKeys = ['dashboard', 'trips', 'orders', 'liveMap', 'trucks', 'planning', 'drivers', 'clients', 'chat', 'documents', 'invoices', 'financial', 'payroll', 'maintenance', 'expenses', 'websiteCms', 'users', 'settings'];

sidebarKeys.forEach(key => {
  const rx = new RegExp(`^\\s*["']?${key}["']?\\s*:`, 'm');
  if (!rx.test(roText)) {
    console.log(`Missing from RO: ${key}`);
  }
});
