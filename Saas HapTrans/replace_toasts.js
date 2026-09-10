const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'client/src/pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

const replacements = [
  { search: /toast\.success\(t\('passwordGenerated'\) \|\| '[^']+'\)/g, replace: "toast.success(t('passwordGenerated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Utilizator actualizat!'\)/g, replace: "toast.success(t('userUpdated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Utilizator creat!'\)/g, replace: "toast.success(t('userCreated'))" },
  { search: /toast\.error\(t\('error'\) \|\| 'Eroare la salvare\.'\)/g, replace: "toast.error(t('saveError'))" },
  { search: /toast\.success\(`Parolă resetată cu succes! Noua parolă: \$\{newPass\} \(a fost copiată în clipboard\)`\)/g, replace: "toast.success(`${t('passwordResetSuccess')}${newPass} (clipboard)`)" },
  { search: /toast\.error\('Eroare la resetarea parolei\.'\)/g, replace: "toast.error(t('passwordResetError'))" },
  { search: /!confirm\(t\('confirmDeactivateUser'\) \|\| '[^']+'\)/g, replace: "!confirm(t('confirmDeactivateUser'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Actualizat!'\)/g, replace: "toast.success(t('updated'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Camion actualizat!'\)/g, replace: "toast.success(t('truckUpdated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Camion adăugat!'\)/g, replace: "toast.success(t('truckAdded'))" },
  { search: /!confirm\(t\('confirmDeleteTruck'\) \|\| '[^']+'\)/g, replace: "!confirm(t('confirmDeleteTruck'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Camion șters\.'\)/g, replace: "toast.success(t('truckDeleted'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Cursa actualizată!'\)/g, replace: "toast.success(t('tripUpdated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Cursa adăugată!'\)/g, replace: "toast.success(t('tripAdded'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Cursa ștearsă\.'\)/g, replace: "toast.success(t('tripDeleted'))" },
  { search: /toast\.loading\(t\('generatingInvoice'\) \|\| '[^']+'\)/g, replace: "toast.loading(t('generatingInvoice'))" },
  { search: /toast\.success\(t\('invoiceGenerated'\) \|\| '[^']+'\)/g, replace: "toast.success(t('invoiceGenerated'))" },
  { search: /toast\.error\(t\('invoiceGenerateError'\) \|\| '[^']+'\)/g, replace: "toast.error(t('invoiceGenerateError'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Setări salvate!'\)/g, replace: "toast.success(t('settingsSaved'))" },
  { search: /toast\.error\(t\('error'\) \|\| 'Eroare\.'\)/g, replace: "toast.error(t('error'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Mentenanță adăugată!'\)/g, replace: "toast.success(t('maintenanceAdded'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Status actualizat!'\)/g, replace: "toast.success(t('statusUpdated'))" },

  { search: /toast\.success\(`Bun venit, \$\{data\.user\.name\}!`\)/g, replace: "toast.success(`${t('welcomeUser')}${data.user.name}!`)" },
  { search: /toast\.error\('Email sau parolă incorectă\.'\)/g, replace: "toast.error(t('invalidCredentials'))" },

  { search: /toast\.success\(`Focalizare pe camionul \$\{truck\.plateNumber \|\| 'selectat'\}\`\)/g, replace: "toast.success(`${t('focusOnTruck')}${truck.plateNumber || ''}`)" },
  { search: /toast\.error\(`Camionul \$\{truck\.plateNumber \|\| ''\} nu transmite coordonate active în acest moment\.\`\)/g, replace: "toast.error(`${truck.plateNumber || ''}${t('noActiveCoordinates')}`)" },

  { search: /toast\.error\("Permiteți pop-up-urile în browser pentru vizualizare\."\)/g, replace: "toast.error(t('allowPopups'))" },
  { search: /toast\.success\("Factură descărcată!"\)/g, replace: "toast.success(t('invoiceDownloaded'))" },
  { search: /toast\.success\("Factură partajată cu succes!"\)/g, replace: "toast.success(t('invoiceShared'))" },
  { search: /toast\.error\("Partajarea a eșuat\."\)/g, replace: "toast.error(t('shareFailed'))" },
  { search: /toast\.success\("Detalii copiate în clipboard \(partajare manuală\)!"\)/g, replace: "toast.success(t('copiedToClipboard'))" },
  { search: /toast\.loading\("Generare PDF\.\.\."\)/g, replace: "toast.loading(t('generatingPdf'))" },
  { search: /toast\.error\("Eroare la generarea PDF\."\)/g, replace: "toast.error(t('pdfGenerateError'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Factură creată cu succes cu PDF în baza de date!'\)/g, replace: "toast.success(t('invoiceCreatedWithPdf'))" },

  { search: /toast\.success\(t\('success'\) \|\| "Document descărcat!"\)/g, replace: "toast.success(t('documentDownloaded'))" },
  { search: /toast\.success\(t\('success'\) \|\| "Document partajat!"\)/g, replace: "toast.success(t('documentShared'))" },
  { search: /toast\.error\(t\('error'\) \|\| "Partajarea a eșuat\."\)/g, replace: "toast.error(t('shareFailed'))" },
  { search: /toast\.success\(t\('success'\) \|\| "Link copiat!"\)/g, replace: "toast.success(t('copiedToClipboard'))" },
  { search: /toast\.error\(t\('error'\) \|\| 'Eroare la încărcare\.'\)/g, replace: "toast.error(t('uploadError'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Șofer actualizat!'\)/g, replace: "toast.success(t('driverUpdated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Șofer adăugat!'\)/g, replace: "toast.success(t('driverAdded'))" },
  { search: /!confirm\(t\('confirmDeleteDriver'\) \|\| '[^']+'\)/g, replace: "!confirm(t('confirmDeleteDriver'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Șofer șters\.'\)/g, replace: "toast.success(t('driverDeleted'))" },

  { search: /toast\.success\(t\('success'\) \|\| 'Client actualizat!'\)/g, replace: "toast.success(t('clientUpdated'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Client adăugat!'\)/g, replace: "toast.success(t('clientAdded'))" },
  { search: /!confirm\(t\('confirmDeleteClient'\) \|\| '[^']+'\)/g, replace: "!confirm(t('confirmDeleteClient'))" },
  { search: /toast\.success\(t\('success'\) \|\| 'Client șters\.'\)/g, replace: "toast.success(t('clientDeleted'))" },
  
  { search: /toast\.success\(t\('success'\) \|\| 'Șters\.'\)/g, replace: "toast.success(t('documentDeleted'))" },
  { search: /confirm\(t\('confirm'\) \|\| 'Confirm\?'\)/g, replace: "confirm(t('confirm'))" },
];

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const {search, replace} of replacements) {
    if (search.test(content)) {
      content = content.replace(search, replace);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
}
