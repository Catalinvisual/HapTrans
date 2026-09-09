const fs = require('fs');
const path = 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/lib/i18n.ts';
let code = fs.readFileSync(path, 'utf8');

const newKeys = {
  ro: "\n      postalCode: 'Cod Poștal',\n      confirmDelete: 'Sunteți sigur că doriți să ștergeți acest element?',\n      editDriver: 'Editează șofer',\n      newPasswordOptional: 'Parolă nouă (opțională)',\n      leaveBlankToKeepUnchanged: 'Lăsați gol pentru a păstra',\n      maintenance_preventive: 'Preventivă',\n      maintenance_corrective: 'Corectivă',\n      maintenance_inspection: 'Inspecție',\n      uploadFile: 'Alege Fișier',\n      noFileChosen: 'Niciun fișier ales',",
  en: "\n      postalCode: 'Postal Code',\n      confirmDelete: 'Are you sure you want to delete this item?',\n      editDriver: 'Edit driver',\n      newPasswordOptional: 'New password (optional)',\n      leaveBlankToKeepUnchanged: 'Leave blank to keep unchanged',\n      maintenance_preventive: 'Preventive',\n      maintenance_corrective: 'Corrective',\n      maintenance_inspection: 'Inspection',\n      uploadFile: 'Choose File',\n      noFileChosen: 'No file chosen',",
  nl: "\n      postalCode: 'Postcode',\n      confirmDelete: 'Weet u zeker dat u dit item wilt verwijderen?',\n      editDriver: 'Chauffeur bewerken',\n      newPasswordOptional: 'Nieuw wachtwoord (optioneel)',\n      leaveBlankToKeepUnchanged: 'Laat leeg om ongewijzigd te laten',\n      maintenance_preventive: 'Preventief',\n      maintenance_corrective: 'Correctief',\n      maintenance_inspection: 'Inspectie',\n      uploadFile: 'Bestand kiezen',\n      noFileChosen: 'Geen bestand gekozen',",
  de: "\n      postalCode: 'Postleitzahl',\n      confirmDelete: 'Möchten Sie dieses Element wirklich löschen?',\n      editDriver: 'Fahrer bearbeiten',\n      newPasswordOptional: 'Neues Passwort (optional)',\n      leaveBlankToKeepUnchanged: 'Leer lassen, um unverändert zu bleiben',\n      maintenance_preventive: 'Vorbeugend',\n      maintenance_corrective: 'Korrektiv',\n      maintenance_inspection: 'Inspektion',\n      uploadFile: 'Datei wählen',\n      noFileChosen: 'Keine Datei ausgewählt',",
  fr: "\n      postalCode: 'Code postal',\n      confirmDelete: 'Êtes-vous sûr de vouloir supprimer cet élément ?',\n      editDriver: 'Modifier le chauffeur',\n      newPasswordOptional: 'Nouveau mot de passe (facultatif)',\n      leaveBlankToKeepUnchanged: 'Laissez vide pour ne pas modifier',\n      maintenance_preventive: 'Préventif',\n      maintenance_corrective: 'Correctif',\n      maintenance_inspection: 'Inspection',\n      uploadFile: 'Choisir un fichier',\n      noFileChosen: 'Aucun fichier choisi',"
};

for (const lang of ['ro', 'en', 'nl', 'de', 'fr']) {
  const marker = lang + ': {\n    translation: {';
  if (code.includes(marker)) {
    code = code.replace(marker, marker + newKeys[lang]);
  }
}

fs.writeFileSync(path, code);
console.log('Added translations');
