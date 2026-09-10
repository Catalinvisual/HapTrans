const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let text = fs.readFileSync(p, 'utf8');

const t = {
  ro: { addOrder: 'Adauga Comanda', weight: 'Greutate' },
  en: { addOrder: 'Add Order', weight: 'Weight' },
  nl: { addOrder: 'Bestelling Toevoegen', weight: 'Gewicht' },
  de: { addOrder: 'Bestellung hinzufügen', weight: 'Gewicht' },
  fr: { addOrder: 'Ajouter Commande', weight: 'Poids' }
};

for (const lang of Object.keys(t)) {
  const r = new RegExp('(' + lang + ':\\s*\\{\\s*translation:\\s*\\{)');
  text = text.replace(r, '1\n      addOrder: "' + t[lang].addOrder + '",\n      weight: "' + t[lang].weight + '",');
}

fs.writeFileSync(p, text);
console.log('patched i18n.ts');
