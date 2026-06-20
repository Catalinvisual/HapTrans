const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'web/src/components/StatsSection/StatsSection.tsx');
let code = fs.readFileSync(file, 'utf8');

code = code.replace("trucks: json.trucks || 50", "trucks: json.trucks !== undefined ? json.trucks : 50");
code = code.replace("trips: json.trips || 15000", "trips: json.trips !== undefined ? json.trips : 15000");
code = code.replace("clients: json.clients || 250", "clients: json.clients !== undefined ? json.clients : 250");
code = code.replace("countries: json.countries || 24", "countries: json.countries !== undefined ? json.countries : 24");

fs.writeFileSync(file, code);
console.log("Fixed StatsSection variables");
