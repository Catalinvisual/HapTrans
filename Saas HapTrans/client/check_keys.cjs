const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const startEN = content.indexOf('en: { translation: {');
const endEN = content.indexOf('nl: { translation: {');
const enText = content.substring(startEN, endEN);

console.log('dashboard EN:', !!enText.match(/["']?dashboard["']?:/));
console.log('orders EN:', !!enText.match(/["']?orders["']?:/));
console.log('plateNumber EN:', !!enText.match(/["']?plateNumber["']?:/));
console.log('addClient EN:', !!enText.match(/["']?addClient["']?:/));

const startRO = content.indexOf('ro: { translation: {');
const endRO = content.indexOf('en: { translation: {');
const roText = content.substring(startRO, endRO);

console.log('dashboard RO:', !!roText.match(/["']?dashboard["']?:/));
console.log('orders RO:', !!roText.match(/["']?orders["']?:/));
console.log('plateNumber RO:', !!roText.match(/["']?plateNumber["']?:/));
console.log('addClient RO:', !!roText.match(/["']?addClient["']?:/));
