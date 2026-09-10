const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/context/LanguageContext.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/loading: \{[^}]+\},\r?\n\r?\n,/, "loading: { RO: 'Se încarca...', EN: 'Loading...', NL: 'Laden...', DE: 'Wird geladen...', FR: 'Chargement...', ES: 'Cargando...' },");

fs.writeFileSync(file, code);
console.log('Syntax error fixed');
