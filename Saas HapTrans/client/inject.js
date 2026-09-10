const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf8');

const additions = {
  ro: `
      editUser: "Editare utilizator",
      allowedPages: "Acces Pagini (Lăsați gol pentru acces complet)",
      allPages: "Toate paginile...",`,
  en: `
      editUser: "Edit user",
      allowedPages: "Page Access (Leave blank for full access)",
      allPages: "All pages...",`,
  pl: `
      editUser: "Edytuj użytkownika",
      allowedPages: "Dostęp do stron (Pozostaw puste dla pełnego dostępu)",
      allPages: "Wszystkie strony...",`,
  nl: `
      editUser: "Gebruiker bewerken",
      allowedPages: "Paginatoegang (Laat leeg voor volledige toegang)",
      allPages: "Alle pagina's...",`,
  de: `
      editUser: "Benutzer bearbeiten",
      allowedPages: "Seitenzugriff (Leer lassen für vollen Zugriff)",
      allPages: "Alle Seiten...",`,
  frBase: `
      editUser: "Modifier l'utilisateur",
      allowedPages: "Accès aux pages (Laisser vide pour un accès complet)",
      allPages: "Toutes les pages...",`
};

for (const [lang, text] of Object.entries(additions)) {
  const regex = new RegExp(\`(\${lang}:\\s*\\{\\s*translation:\\s*\\{)\`, 'g');
  content = content.replace(regex, \`$1\${text}\`);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected i18n keys.');
