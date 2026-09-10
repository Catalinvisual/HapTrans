const fs = require('fs');
let s = fs.readFileSync('client/src/lib/i18n.ts', 'utf8');

s = s.replace(/invoiceGenerated: 'Factură generată cu succes!',/g, `invoiceGenerated: 'Factură generată cu succes!',
      invoiceApproved: 'Factură aprobată!',
      invoiceApprovedAndSent: 'Factură aprobată și trimisă cu succes!',`);

s = s.replace(/invoiceGenerated: 'Invoice generated successfully!',/g, `invoiceGenerated: 'Invoice generated successfully!',
      invoiceApproved: 'Invoice approved!',
      invoiceApprovedAndSent: 'Invoice approved and sent successfully!',`);

s = s.replace(/invoiceGenerated: 'Factuur succesvol gegenereerd!',/g, `invoiceGenerated: 'Factuur succesvol gegenereerd!',
      invoiceApproved: 'Factuur goedgekeurd!',
      invoiceApprovedAndSent: 'Factuur succesvol goedgekeurd en verzonden!',`);

s = s.replace(/invoiceGenerated: 'Rechnung erfolgreich erstellt!',/g, `invoiceGenerated: 'Rechnung erfolgreich erstellt!',
      invoiceApproved: 'Rechnung genehmigt!',
      invoiceApprovedAndSent: 'Rechnung erfolgreich genehmigt und gesendet!',`);

s = s.replace(/invoiceGenerated: 'Facture générée avec succès !',/g, `invoiceGenerated: 'Facture générée avec succès !',
      invoiceApproved: 'Facture approuvée !',
      invoiceApprovedAndSent: 'Facture approuvée et envoyée avec succès !',`);

fs.writeFileSync('client/src/lib/i18n.ts', s);
console.log('Fixed i18n');
