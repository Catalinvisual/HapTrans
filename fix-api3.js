const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/SELECT data FROM website_cms WHERE id = 1/g, "SELECT value FROM website_cms WHERE key = 'countries'");
code = code.replace(/cms\[0\]\.data/g, "cms[0].value");
code = code.replace(/cms\[0\]\.value\.countries/g, "cms[0].value");

fs.writeFileSync(file, code);
console.log("Fixed API SQL for CMS using Regex");
