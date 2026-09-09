const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/lib/i18n.ts');
let content = fs.readFileSync(filePath, 'utf8');

const additions = {
  ro: '\n      userDeleted: "Utilizator șters cu succes",\n      confirmDeleteUser: "Sunteți sigur că doriți să ștergeți acest utilizator? Această acțiune este ireversibilă.",',
  en: '\n      userDeleted: "User deleted successfully",\n      confirmDeleteUser: "Are you sure you want to delete this user? This action is irreversible.",',
  pl: '\n      userDeleted: "Użytkownik pomyślnie usunięty",\n      confirmDeleteUser: "Czy na pewno chcesz usunąć tego użytkownika? Ta akcja jest nieodwracalna.",',
  nl: '\n      userDeleted: "Gebruiker succesvol verwijderd",\n      confirmDeleteUser: "Weet u zeker dat u deze gebruiker wilt verwijderen? Deze actie is onomkeerbaar.",',
  de: '\n      userDeleted: "Benutzer erfolgreich gelöscht",\n      confirmDeleteUser: "Möchten Sie diesen Benutzer wirklich löschen? Diese Aktion ist unwiderruflich.",',
  frBase: '\n      userDeleted: "Utilisateur supprimé avec succès",\n      confirmDeleteUser: "Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.",'
};

for (const lang in additions) {
  const text = additions[lang];
  const regex = new RegExp(lang + ':\\s*\\{\\s*translation:\\s*\\{', 'g');
  content = content.replace(regex, lang + ': { translation: {' + text);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected i18n keys for deletion.');
