const fs = require('fs');

let content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const additions = {
  ro: {
    vatType: 'Tip TVA',
    vatNormal: 'TVA Normal (ex. 19%)',
    vatReverseCharge: 'Taxare Inversă (Reverse Charge 0%)',
    vatExempt: 'Scutit de TVA (Exempt 0%)',
    tvaPercent: 'TVA (%)',
    notesPlaceholder: 'Adaugă detalii, servicii prestate, observații pentru factură...',
    invoiceApprovedAndSent: 'Factură aprobată și trimisă!',
    invoiceApproved: 'Factură aprobată!'
  },
  en: {
    vatType: 'VAT Type',
    vatNormal: 'Normal VAT (e.g. 19%)',
    vatReverseCharge: 'Reverse Charge (0%)',
    vatExempt: 'VAT Exempt (0%)',
    tvaPercent: 'VAT (%)',
    notesPlaceholder: 'Add details, services provided, invoice notes...',
    invoiceApprovedAndSent: 'Invoice approved and sent!',
    invoiceApproved: 'Invoice approved!'
  },
  nl: {
    vatType: 'Btw-type',
    vatNormal: 'Normale Btw (bijv. 21%)',
    vatReverseCharge: 'Btw Verlegd (0%)',
    vatExempt: 'Btw Vrijgesteld (0%)',
    tvaPercent: 'Btw (%)',
    notesPlaceholder: 'Voeg details, geleverde diensten, factuur notities toe...',
    invoiceApprovedAndSent: 'Factuur goedgekeurd en verzonden!',
    invoiceApproved: 'Factuur goedgekeurd!'
  },
  es: {
    vatType: 'Tipo de IVA',
    vatNormal: 'IVA Normal (ej. 21%)',
    vatReverseCharge: 'Inversión del Sujeto Pasivo (0%)',
    vatExempt: 'Exento de IVA (0%)',
    tvaPercent: 'IVA (%)',
    notesPlaceholder: 'Agregar detalles, servicios prestados, notas de factura...',
    invoiceApprovedAndSent: '¡Factura aprobada y enviada!',
    invoiceApproved: '¡Factura aprobada!'
  },
  pl: {
    vatType: 'Typ VAT',
    vatNormal: 'Normalny VAT (np. 23%)',
    vatReverseCharge: 'Odwrotne Obciążenie (0%)',
    vatExempt: 'Zwolniony z VAT (0%)',
    tvaPercent: 'VAT (%)',
    notesPlaceholder: 'Dodaj szczegóły, świadczone usługi, uwagi do faktury...',
    invoiceApprovedAndSent: 'Faktura zatwierdzona i wysłana!',
    invoiceApproved: 'Faktura zatwierdzona!'
  }
};

for (const lang of Object.keys(additions)) {
  const marker = `${lang}: {\\n    translation: {`;
  if (content.includes(marker)) {
    const keys = additions[lang];
    let toInject = '';
    for (const [k, v] of Object.entries(keys)) {
      toInject += `\\n      ${k}: "${v}",`;
    }
    content = content.replace(marker, marker + toInject);
  }
}

fs.writeFileSync('src/lib/i18n.ts', content);
console.log('Translations injected successfully.');
