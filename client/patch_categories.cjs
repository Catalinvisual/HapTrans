const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/lib/i18n.ts';
let c = fs.readFileSync(path, 'utf8');

// RO
c = c.replace("scannerTitle: '🤖 Smart AI Scanner',\n        scannerSubtitle:", `scannerTitle: '🤖 Smart AI Scanner',
        cat_fuel: 'Combustibil',
        cat_maintenance: 'Piese / Service',
        cat_accounting: 'Contabilitate',
        cat_salary: 'Salarii (Admin/Birou)',
        cat_toll: 'Taxe Drum',
        cat_other: 'Altele',
        scannerSubtitle:`);

// EN
c = c.replace("scannerTitle: '🤖 Smart AI Scanner',\n        scannerSubtitle: 'Upload a shipping", `scannerTitle: '🤖 Smart AI Scanner',
        cat_fuel: 'Fuel',
        cat_maintenance: 'Parts / Service',
        cat_accounting: 'Accounting',
        cat_salary: 'Salaries (Admin/Office)',
        cat_toll: 'Road Tolls',
        cat_other: 'Other',
        scannerSubtitle: 'Upload a shipping`);

// NL
c = c.replace("scannerTitle: '🤖 Slimme AI Scanner',\n        scannerSubtitle:", `scannerTitle: '🤖 Slimme AI Scanner',
        cat_fuel: 'Brandstof',
        cat_maintenance: 'Onderdelen / Service',
        cat_accounting: 'Boekhouding',
        cat_salary: 'Salarissen (Admin/Kantoor)',
        cat_toll: 'Tolgelden',
        cat_other: 'Overige',
        scannerSubtitle:`);

// DE
c = c.replace("scannerTitle: '🤖 KI Smart Scanner',\n        scannerSubtitle:", `scannerTitle: '🤖 KI Smart Scanner',
        cat_fuel: 'Kraftstoff',
        cat_maintenance: 'Teile / Service',
        cat_accounting: 'Buchhaltung',
        cat_salary: 'Gehälter (Admin/Büro)',
        cat_toll: 'Mautgebühren',
        cat_other: 'Sonstiges',
        scannerSubtitle:`);

// FR
c = c.replace("scannerTitle: '🤖 Scanner IA Intelligent',\n        scannerSubtitle:", `scannerTitle: '🤖 Scanner IA Intelligent',
        cat_fuel: 'Carburant',
        cat_maintenance: 'Pièces / Service',
        cat_accounting: 'Comptabilité',
        cat_salary: 'Salaires (Admin/Bureau)',
        cat_toll: 'Péages',
        cat_other: 'Autres',
        scannerSubtitle:`);

fs.writeFileSync(path, c);
console.log('Category translations added successfully');
