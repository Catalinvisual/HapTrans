const fs = require('fs');
let code = fs.readFileSync('../client/src/lib/i18n.ts', 'utf-8');

code = code.replace(/addTruck: 'Adaugă camion',/g, "addTruck: 'Adaugă camion',\n      editTruck: 'Editează camion',");
code = code.replace(/addTruck: 'Add Truck',/g, "addTruck: 'Add Truck',\n      editTruck: 'Edit Truck',");
code = code.replace(/addTruck: 'Vrachtwagen toevoegen',/g, "addTruck: 'Vrachtwagen toevoegen',\n      editTruck: 'Vrachtwagen bewerken',");
code = code.replace(/addTruck: 'LKW hinzufügen',/g, "addTruck: 'LKW hinzufügen',\n      editTruck: 'LKW bearbeiten',");
code = code.replace(/addTruck: 'Ajouter un camion',/g, "addTruck: 'Ajouter un camion',\n      editTruck: 'Modifier le camion',");

fs.writeFileSync('../client/src/lib/i18n.ts', code);
console.log('Fixed translations');
