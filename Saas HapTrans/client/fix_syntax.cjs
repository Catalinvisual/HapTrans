const fs = require('fs');

const path = 'src/lib/i18n.ts';
let code = fs.readFileSync(path, 'utf8');

// Replace any keys like   common.loading: "..." with   "common.loading": "..."
const fixedCode = code.replace(/^(\s*)([a-zA-Z0-9_.-]+)\s*:/gm, (match, space, key) => {
  if (key.includes('.')) {
    return space + '"' + key + '":';
  }
  return match;
});

fs.writeFileSync(path, fixedCode, 'utf8');
console.log('Fixed syntax in i18n.ts');
