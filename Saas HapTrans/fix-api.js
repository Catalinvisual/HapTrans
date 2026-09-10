const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace("FROM truck", "FROM trucks");
code = code.replace("FROM trip", "FROM trips");
code = code.replace("FROM client", "FROM clients");

fs.writeFileSync(file, code);
console.log("Fixed API SQL queries");
