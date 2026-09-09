const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const cms = await this.em.query('SELECT value FROM website_cms WHERE key = 'countries'');", 
  "const cms = await this.em.query(\"SELECT value FROM website_cms WHERE key = 'countries'\");"
);
code = code.replace("if (cms.length > 0 && cms[0].value && cms[0].value)", "if (cms.length > 0 && cms[0].value)");

fs.writeFileSync(file, code);
console.log("Fixed syntax error");
