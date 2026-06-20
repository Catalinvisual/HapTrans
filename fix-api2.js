const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'server/src/app.controller.ts');
let code = fs.readFileSync(file, 'utf8');

const target = "const cms = await this.em.query('SELECT data FROM website_cms WHERE id = 1');\n        let countriesCount = 24;\n        if (cms.length > 0 && cms[0].data && cms[0].data.countries) {\n          const c = cms[0].data.countries;\n          countriesCount = c.split(',').filter((x: string) => x.trim().length > 0).length;\n        }";
const replacement = "const cms = await this.em.query(\"SELECT value FROM website_cms WHERE key = 'countries'\");\n        let countriesCount = 24;\n        if (cms.length > 0 && cms[0].value) {\n          countriesCount = cms[0].value.split(',').filter((x: string) => x.trim().length > 0).length;\n        }";

code = code.replace(target, replacement);

fs.writeFileSync(file, code);
console.log("Fixed API SQL for CMS");
