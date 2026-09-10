const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/server/src/app.module.ts';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import { ExpensesModule }')) {
    c = c.replace("import { InvoicesModule } from './invoices/invoices.module';", "import { InvoicesModule } from './invoices/invoices.module';\nimport { ExpensesModule } from './expenses/expenses.module';");
}

if (!c.includes('ExpensesModule,')) {
    c = c.replace("InvoicesModule,", "InvoicesModule,\n    ExpensesModule,");
}

fs.writeFileSync(path, c);
console.log('app.module.ts updated');
