const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf8');

const additions = {
  ro: '\n      editUser: "Editare utilizator",\n      allowedPages: "Acces Pagini (Lăsați gol pentru acces complet)",\n      allPages: "Toate paginile...",',
  en: '\n      editUser: "Edit user",\n      allowedPages: "Page Access (Leave blank for full access)",\n      allPages: "All pages...",',
  pl: '\n      editUser: "Edytuj użytkownika",\n      allowedPages: "Dostęp do stron (Pozostaw puste dla pełnego dostępu)",\n      allPages: "Wszystkie strony...",',
  nl: '\n      editUser: "Gebruiker bewerken",\n      allowedPages: "Paginatoegang (Laat leeg voor volledige toegang)",\n      allPages: "Alle pagina\'s...",',
  de: '\n      editUser: "Benutzer bearbeiten",\n      allowedPages: "Seitenzugriff (Leer lassen für vollen Zugriff)",\n      allPages: "Alle Seiten...",',
  frBase: '\n      editUser: "Modifier l\'utilisateur",\n      allowedPages: "Accès aux pages (Laisser vide pour un accès complet)",\n      allPages: "Toutes les pages...",'
};

for (const lang in additions) {
  const text = additions[lang];
  const regex = new RegExp(lang + ':\\s*\\{\\s*translation:\\s*\\{', 'g');
  content = content.replace(regex, lang + ': { translation: {' + text);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected i18n keys.');
