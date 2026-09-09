const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

// Find start of DE block
const deStart = content.indexOf('de: { translation: {');
if (deStart === -1) {
  console.log("de block NOT FOUND");
  process.exit(1);
}

// Find end of DE block
const deEnd = content.indexOf('},', deStart);
const deBlock = content.substring(deStart, deEnd);

console.log("Length of DE block:", deBlock.length);
console.log("Contains jsx_noTripsFound:", deBlock.includes('jsx_noTripsFound'));
console.log("Contains addTruck:", deBlock.includes('addTruck'));

// Check how many jsx_ and toast_ it has
const jsxMatches = deBlock.match(/jsx_[a-zA-Z0-9_]+/g);
const toastMatches = deBlock.match(/toast_[a-zA-Z0-9_]+/g);
console.log("Total jsx_ keys:", jsxMatches ? jsxMatches.length : 0);
console.log("Total toast_ keys:", toastMatches ? toastMatches.length : 0);

// Print out where addTruck is
const lines = deBlock.split('\n');
const addTruckLine = lines.find(l => l.includes('addTruck'));
console.log("addTruck line:", addTruckLine);
