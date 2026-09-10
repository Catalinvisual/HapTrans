const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'client/src/lib/i18n.ts');
let code = fs.readFileSync(file, 'utf8');

const additions = {
  ro: {
    vatType: 'Tip TVA',
    vatNormal: 'TVA Normal',
    vatReverseCharge: 'Taxare Inversa',
    vatExempt: 'Scutit de TVA',
    tvaPercent: 'Procent TVA (%)',
    approve: 'Aproba',
    approveAndSend: 'Aproba ?i Trimite',
    edit: 'Editeaza',
    saveDraft: 'Salveaza Draft',
    cancel: 'Anuleaza'
  },
  en: {
    vatType: 'VAT Type',
    vatNormal: 'Standard VAT',
    vatReverseCharge: 'Reverse Charge',
    vatExempt: 'VAT Exempt',
    tvaPercent: 'VAT Percent (%)',
    approve: 'Approve',
    approveAndSend: 'Approve & Send',
    edit: 'Edit',
    saveDraft: 'Save Draft',
    cancel: 'Cancel'
  },
  nl: {
    vatType: 'Btw-type',
    vatNormal: 'Standaard Btw',
    vatReverseCharge: 'Btw Verlegd',
    vatExempt: 'Btw Vrijgesteld',
    tvaPercent: 'Btw Percentage (%)',
    approve: 'Goedkeuren',
    approveAndSend: 'Goedkeuren & Verzenden',
    edit: 'Bewerken',
    saveDraft: 'Concept Opslaan',
    cancel: 'Annuleren'
  },
  de: {
    vatType: 'MwSt-Typ',
    vatNormal: 'Standard-MwSt',
    vatReverseCharge: 'Steuerschuldnerschaft',
    vatExempt: 'Steuerfrei',
    tvaPercent: 'MwSt Prozent (%)',
    approve: 'Genehmigen',
    approveAndSend: 'Genehmigen & Senden',
    edit: 'Bearbeiten',
    saveDraft: 'Entwurf Speichern',
    cancel: 'Abbrechen'
  },
  fr: {
    vatType: 'Type de TVA',
    vatNormal: 'TVA Standard',
    vatReverseCharge: 'Autoliquidation',
    vatExempt: 'Exonéré de TVA',
    tvaPercent: 'Pourcentage TVA (%)',
    approve: 'Approuver',
    approveAndSend: 'Approuver & Envoyer',
    edit: 'Modifier',
    saveDraft: 'Enregistrer le brouillon',
    cancel: 'Annuler'
  }
};

for (const lang of Object.keys(additions)) {
  const marker = new RegExp(`(${lang}: \\{\\s*translation: \\{)`);
  const entries = Object.entries(additions[lang]).map(([k, v]) => `        ${k}: "${v}",`).join('\n');
  code = code.replace(marker, `$1\n${entries}`);
}

fs.writeFileSync(file, code);
console.log('Translations added!');
