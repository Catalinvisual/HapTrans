const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'client/src/lib/i18n.ts');
let code = fs.readFileSync(file, 'utf8');

const additions = {
  ro: {
    approvingAndSending: 'Aprobare ?i Trimitere...',
    approving: 'Aprobare în curs...',
    generatingPdf: 'Generare PDF...',
    pdfGenerateError: 'Eroare la generarea PDF-ului.',
    allowPopups: 'Te rugam sa permi?i pop-up-urile pentru a vizualiza factura.',
    invoiceDownloaded: 'Factura descarcata!',
    invoiceShared: 'Factura distribuita!',
    shareFailed: 'Nu s-a putut distribui factura.',
    copiedToClipboard: 'Informa?ii copiate în clipboard!',
    selectClient: 'Te rugam sa selectezi un client.',
    draftUpdated: 'Draft actualizat!',
    invoiceCreatedWithPdf: 'Factura creata cu succes!',
    error: 'A aparut o eroare.',
    sendingEmail: 'Se trimite email-ul...',
    emailSent: 'Email trimis cu succes!'
  },
  en: {
    approvingAndSending: 'Approving and Sending...',
    approving: 'Approving...',
    generatingPdf: 'Generating PDF...',
    pdfGenerateError: 'Error generating PDF.',
    allowPopups: 'Please allow popups to view the invoice.',
    invoiceDownloaded: 'Invoice downloaded!',
    invoiceShared: 'Invoice shared!',
    shareFailed: 'Failed to share invoice.',
    copiedToClipboard: 'Information copied to clipboard!',
    selectClient: 'Please select a client.',
    draftUpdated: 'Draft updated!',
    invoiceCreatedWithPdf: 'Invoice created successfully!',
    error: 'An error occurred.',
    sendingEmail: 'Sending email...',
    emailSent: 'Email sent successfully!'
  },
  nl: {
    approvingAndSending: 'Goedkeuren en Verzenden...',
    approving: 'Goedkeuren...',
    generatingPdf: 'PDF Genereren...',
    pdfGenerateError: 'Fout bij het genereren van PDF.',
    allowPopups: 'Sta pop-ups toe om de factuur te bekijken.',
    invoiceDownloaded: 'Factuur gedownload!',
    invoiceShared: 'Factuur gedeeld!',
    shareFailed: 'Factuur delen mislukt.',
    copiedToClipboard: 'Informatie gekopieerd naar klembord!',
    selectClient: 'Selecteer een klant.',
    draftUpdated: 'Concept bijgewerkt!',
    invoiceCreatedWithPdf: 'Factuur succesvol aangemaakt!',
    error: 'Er is een fout opgetreden.',
    sendingEmail: 'E-mail verzenden...',
    emailSent: 'E-mail succesvol verzonden!'
  },
  de: {
    approvingAndSending: 'Genehmigen und Senden...',
    approving: 'Genehmigen...',
    generatingPdf: 'PDF wird generiert...',
    pdfGenerateError: 'Fehler bei der PDF-Generierung.',
    allowPopups: 'Bitte erlauben Sie Popups, um die Rechnung anzuzeigen.',
    invoiceDownloaded: 'Rechnung heruntergeladen!',
    invoiceShared: 'Rechnung geteilt!',
    shareFailed: 'Fehler beim Teilen der Rechnung.',
    copiedToClipboard: 'Informationen in die Zwischenablage kopiert!',
    selectClient: 'Bitte wählen Sie einen Kunden aus.',
    draftUpdated: 'Entwurf aktualisiert!',
    invoiceCreatedWithPdf: 'Rechnung erfolgreich erstellt!',
    error: 'Ein Fehler ist aufgetreten.',
    sendingEmail: 'E-Mail senden...',
    emailSent: 'E-Mail erfolgreich gesendet!'
  },
  fr: {
    approvingAndSending: 'Approbation et Envoi...',
    approving: 'Approbation en cours...',
    generatingPdf: 'Génération du PDF...',
    pdfGenerateError: 'Erreur de génération du PDF.',
    allowPopups: 'Veuillez autoriser les pop-ups pour afficher la facture.',
    invoiceDownloaded: 'Facture téléchargée !',
    invoiceShared: 'Facture partagée !',
    shareFailed: 'Échec du partage de la facture.',
    copiedToClipboard: 'Informations copiées dans le presse-papiers !',
    selectClient: 'Veuillez sélectionner un client.',
    draftUpdated: 'Brouillon mis à jour !',
    invoiceCreatedWithPdf: 'Facture créée avec succès !',
    error: 'Une erreur est survenue.',
    sendingEmail: 'Envoi de l\'e-mail...',
    emailSent: 'E-mail envoyé avec succès !'
  }
};

for (const lang of Object.keys(additions)) {
  const marker = new RegExp(`(${lang}: \\{\\s*translation: \\{)`);
  const entries = Object.entries(additions[lang]).map(([k, v]) => `        ${k}: "${v}",`).join('\n');
  code = code.replace(marker, `$1\n${entries}`);
}

fs.writeFileSync(file, code);
console.log('Toasts added!');
