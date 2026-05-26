const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/lib/i18n.ts';
let c = fs.readFileSync(path, 'utf8');

c = c.replace("invoices: 'Facturi',", "invoices: 'Facturi',\n        expenses: 'Cheltuieli',");
c = c.replace("invoices: 'Invoices',", "invoices: 'Invoices',\n        expenses: 'Expenses',");
c = c.replace("invoices: 'Facturen',", "invoices: 'Facturen',\n        expenses: 'Uitgaven',");
c = c.replace("invoices: 'Rechnungen',", "invoices: 'Rechnungen',\n        expenses: 'Ausgaben',");
c = c.replace("invoices: 'Factures',", "invoices: 'Factures',\n        expenses: 'Dépenses',");

fs.writeFileSync(path, c);
console.log('i18n.ts updated');
