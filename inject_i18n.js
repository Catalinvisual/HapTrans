const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'client/src/lib/i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const keys = {
  passwordGenerated: { ro: "Parolă generată!", en: "Password generated!", nl: "Wachtwoord gegenereerd!", de: "Passwort generiert!", fr: "Mot de passe généré!" },
  userUpdated: { ro: "Utilizator actualizat!", en: "User updated!", nl: "Gebruiker bijgewerkt!", de: "Benutzer aktualisiert!", fr: "Utilisateur mis à jour!" },
  userCreated: { ro: "Utilizator creat!", en: "User created!", nl: "Gebruiker aangemaakt!", de: "Benutzer erstellt!", fr: "Utilisateur créé!" },
  saveError: { ro: "Eroare la salvare.", en: "Error saving.", nl: "Fout bij opslaan.", de: "Fehler beim Speichern.", fr: "Erreur d'enregistrement." },
  passwordResetSuccess: { ro: "Parolă resetată cu succes! Noua parolă: ", en: "Password reset successfully! New password: ", nl: "Wachtwoord succesvol gereset! Nieuw wachtwoord: ", de: "Passwort erfolgreich zurückgesetzt! Neues Passwort: ", fr: "Mot de passe réinitialisé avec succès! Nouveau mot de passe: " },
  passwordResetError: { ro: "Eroare la resetarea parolei.", en: "Error resetting password.", nl: "Fout bij resetten wachtwoord.", de: "Fehler beim Zurücksetzen des Passworts.", fr: "Erreur lors de la réinitialisation du mot de passe." },
  confirmDeactivateUser: { ro: "Dezactivezi utilizatorul?", en: "Deactivate user?", nl: "Gebruiker deactiveren?", de: "Benutzer deaktivieren?", fr: "Désactiver l'utilisateur?" },
  updated: { ro: "Actualizat!", en: "Updated!", nl: "Bijgewerkt!", de: "Aktualisiert!", fr: "Mis à jour!" },
  truckUpdated: { ro: "Camion actualizat!", en: "Truck updated!", nl: "Vrachtwagen bijgewerkt!", de: "LKW aktualisiert!", fr: "Camion mis à jour!" },
  truckAdded: { ro: "Camion adăugat!", en: "Truck added!", nl: "Vrachtwagen toegevoegd!", de: "LKW hinzugefügt!", fr: "Camion ajouté!" },
  confirmDeleteTruck: { ro: "Ștergi camionul?", en: "Delete truck?", nl: "Vrachtwagen verwijderen?", de: "LKW löschen?", fr: "Supprimer le camion?" },
  truckDeleted: { ro: "Camion șters.", en: "Truck deleted.", nl: "Vrachtwagen verwijderd.", de: "LKW gelöscht.", fr: "Camion supprimé." },
  tripUpdated: { ro: "Cursa actualizată!", en: "Trip updated!", nl: "Rit bijgewerkt!", de: "Fahrt aktualisiert!", fr: "Trajet mis à jour!" },
  tripAdded: { ro: "Cursa adăugată!", en: "Trip added!", nl: "Rit toegevoegd!", de: "Fahrt hinzugefügt!", fr: "Trajet ajouté!" },
  tripDeleted: { ro: "Cursa ștearsă.", en: "Trip deleted.", nl: "Rit verwijderd.", de: "Fahrt gelöscht.", fr: "Trajet supprimé." },
  settingsSaved: { ro: "Setări salvate!", en: "Settings saved!", nl: "Instellingen opgeslagen!", de: "Einstellungen gespeichert!", fr: "Paramètres enregistrés!" },
  maintenanceAdded: { ro: "Mentenanță adăugată!", en: "Maintenance added!", nl: "Onderhoud toegevoegd!", de: "Wartung hinzugefügt!", fr: "Maintenance ajoutée!" },
  statusUpdated: { ro: "Status actualizat!", en: "Status updated!", nl: "Status bijgewerkt!", de: "Status aktualisiert!", fr: "Statut mis à jour!" },
  invalidCredentials: { ro: "Email sau parolă incorectă.", en: "Invalid email or password.", nl: "Ongeldig e-mailadres of wachtwoord.", de: "Ungültige E-Mail oder Passwort.", fr: "E-mail ou mot de passe invalide." },
  welcomeUser: { ro: "Bun venit, ", en: "Welcome, ", nl: "Welkom, ", de: "Willkommen, ", fr: "Bienvenue, " },
  focusOnTruck: { ro: "Focalizare pe camionul ", en: "Focusing on truck ", nl: "Focussen op vrachtwagen ", de: "Fokussiere auf LKW ", fr: "Mise au point sur le camion " },
  noActiveCoordinates: { ro: " nu transmite coordonate active în acest moment.", en: " is not transmitting active coordinates at this moment.", nl: " verzendt op dit moment geen actieve coördinaten.", de: " überträgt im Moment keine aktiven Koordinaten.", fr: " ne transmet pas de coordonnées actives pour le moment." },
  allowPopups: { ro: "Permiteți pop-up-urile în browser pentru vizualizare.", en: "Please allow pop-ups in your browser to view.", nl: "Sta pop-ups toe in uw browser om te bekijken.", de: "Bitte erlauben Sie Pop-ups in Ihrem Browser zur Ansicht.", fr: "Veuillez autoriser les fenêtres contextuelles dans votre navigateur pour afficher." },
  invoiceDownloaded: { ro: "Factură descărcată!", en: "Invoice downloaded!", nl: "Factuur gedownload!", de: "Rechnung heruntergeladen!", fr: "Facture téléchargée!" },
  invoiceShared: { ro: "Factură partajată cu succes!", en: "Invoice shared successfully!", nl: "Factuur succesvol gedeeld!", de: "Rechnung erfolgreich geteilt!", fr: "Facture partagée avec succès!" },
  shareFailed: { ro: "Partajarea a eșuat.", en: "Sharing failed.", nl: "Delen mislukt.", de: "Teilen fehlgeschlagen.", fr: "Le partage a échoué." },
  copiedToClipboard: { ro: "Link copiat în clipboard!", en: "Link copied to clipboard!", nl: "Link gekopieerd naar klembord!", de: "Link in die Zwischenablage kopiert!", fr: "Lien copié dans le presse-papiers!" },
  generatingPdf: { ro: "Generare PDF...", en: "Generating PDF...", nl: "PDF genereren...", de: "PDF wird generiert...", fr: "Génération du PDF..." },
  pdfGenerateError: { ro: "Eroare la generarea PDF.", en: "Error generating PDF.", nl: "Fout bij genereren PDF.", de: "Fehler beim Generieren der PDF.", fr: "Erreur de génération du PDF." },
  invoiceCreatedWithPdf: { ro: "Factură creată cu succes cu PDF în baza de date!", en: "Invoice created successfully with PDF in database!", nl: "Factuur succesvol aangemaakt met PDF in database!", de: "Rechnung erfolgreich mit PDF in Datenbank erstellt!", fr: "Facture créée avec succès avec PDF dans la base de données!" },
  documentDownloaded: { ro: "Document descărcat!", en: "Document downloaded!", nl: "Document gedownload!", de: "Dokument heruntergeladen!", fr: "Document téléchargé!" },
  documentShared: { ro: "Document partajat!", en: "Document shared!", nl: "Document gedeeld!", de: "Dokument geteilt!", fr: "Document partagé!" },
  uploadError: { ro: "Eroare la încărcare.", en: "Upload error.", nl: "Uploadfout.", de: "Fehler beim Hochladen.", fr: "Erreur de téléchargement." },
  driverUpdated: { ro: "Șofer actualizat!", en: "Driver updated!", nl: "Chauffeur bijgewerkt!", de: "Fahrer aktualisiert!", fr: "Chauffeur mis à jour!" },
  driverAdded: { ro: "Șofer adăugat!", en: "Driver added!", nl: "Chauffeur toegevoegd!", de: "Fahrer hinzugefügt!", fr: "Chauffeur ajouté!" },
  confirmDeleteDriver: { ro: "Ștergi șoferul?", en: "Delete driver?", nl: "Chauffeur verwijderen?", de: "Fahrer löschen?", fr: "Supprimer le chauffeur?" },
  driverDeleted: { ro: "Șofer șters.", en: "Driver deleted.", nl: "Chauffeur verwijderd.", de: "Fahrer gelöscht.", fr: "Chauffeur supprimé." },
  clientUpdated: { ro: "Client actualizat!", en: "Client updated!", nl: "Klant bijgewerkt!", de: "Kunde aktualisiert!", fr: "Client mis à jour!" },
  clientAdded: { ro: "Client adăugat!", en: "Client added!", nl: "Klant toegevoegd!", de: "Kunde hinzugefügt!", fr: "Client ajouté!" },
  confirmDeleteClient: { ro: "Ștergi clientul?", en: "Delete client?", nl: "Klant verwijderen?", de: "Kunde löschen?", fr: "Supprimer le client?" },
  clientDeleted: { ro: "Client șters.", en: "Client deleted.", nl: "Klant verwijderd.", de: "Kunde gelöscht.", fr: "Client supprimé." },
  documentDeleted: { ro: "Document șters.", en: "Document deleted.", nl: "Document verwijderd.", de: "Dokument gelöscht.", fr: "Document supprimé." }
};

['ro', 'en', 'nl', 'de', 'fr'].forEach(lang => {
  const marker = `      monthTable: '`; // finding the end of translation block
  
  const regex = new RegExp(`(${lang}: \\{\\s*translation: \\{[\\s\\S]*?)(      monthTable: '[^']+')(,\\n*\\s*\\}\\s*,\\n*\\s*\\})`);
  const match = content.match(regex);
  
  if (match) {
    let toInsert = '';
    for (const [key, trObj] of Object.entries(keys)) {
      if (trObj[lang]) {
        toInsert += `,\n      ${key}: '${trObj[lang].replace(/'/g, "\\'")}'`;
      }
    }
    content = content.replace(regex, `$1$2${toInsert}$3`);
  }
});

fs.writeFileSync(i18nPath, content);
console.log('Translations injected successfully!');
