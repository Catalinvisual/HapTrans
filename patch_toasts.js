const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const translations = {
  ro: 'website_hub_saved_success: "Modificările au fost salvate cu succes!",',
  en: 'website_hub_saved_success: "Changes saved successfully!",',
  nl: 'website_hub_saved_success: "Wijzigingen succesvol opgeslagen!",',
  de: 'website_hub_saved_success: "Änderungen erfolgreich gespeichert!",',
  frBase: 'website_hub_saved_success: "Modifications enregistrées avec succès!",',
  pl: 'website_hub_saved_success: "Zmiany zapisane pomyślnie!",',
  es: 'website_hub_saved_success: "¡Cambios guardados con éxito!",'
};

for (const [lang, trans] of Object.entries(translations)) {
  const regex = new RegExp(`(  ${lang}: \\{ translation: \\{)`);
  content = content.replace(regex, `$1\n      ${trans}`);
}

fs.writeFileSync(filePath, content);
console.log('Updated success toasts successfully.');
