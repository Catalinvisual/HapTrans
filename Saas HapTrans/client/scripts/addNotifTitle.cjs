const fs = require('fs');
const path = 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/lib/i18n.ts';
let code = fs.readFileSync(path, 'utf8');

const newKeys = {
  ro: "\n      notif_doc_expiring_title: 'Document Expirat / Expiră Curând',",
  en: "\n      notif_doc_expiring_title: 'Document Expired / Expiring Soon',",
  nl: "\n      notif_doc_expiring_title: 'Document Verlopen / Verloopt Binnenkort',",
  de: "\n      notif_doc_expiring_title: 'Dokument Abgelaufen / Läuft bald ab',",
  fr: "\n      notif_doc_expiring_title: 'Document Expiré / Expire Bientôt',"
};

for (const lang of ['ro', 'en', 'nl', 'de', 'fr']) {
  const marker = lang + ': {\n    translation: {';
  if (code.includes(marker) && !code.includes('notif_doc_expiring_title:')) {
    code = code.replace(marker, marker + newKeys[lang]);
  }
}

fs.writeFileSync(path, code);
console.log('Added title translations');
