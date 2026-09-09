const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/context/LanguageContext.tsx');
let code = fs.readFileSync(file, 'utf8');

const target = "ES: 'Cargando...' },\r\n  ,\r\n  \r\n    // Services";
const replacement = "ES: 'Cargando...' },\r\n  \r\n    // Services";
code = code.replace(target, replacement);

const target2 = "ES: 'Cargando...' },\n  ,\n  \n    // Services";
const replacement2 = "ES: 'Cargando...' },\n  \n    // Services";
code = code.replace(target2, replacement2);

fs.writeFileSync(file, code);
console.log('Syntax error fixed 2');
