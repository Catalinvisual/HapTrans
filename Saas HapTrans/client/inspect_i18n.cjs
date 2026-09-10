const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
const content = fs.readFileSync(i18nPath, 'utf8');

// A safer way to extract the keys from the JS object without AST is just regexing the lines
// because the file is structured simply.
function extractKeysFromBlock(lang) {
  // Find the block starting with lang: {
  const startIndex = content.indexOf(`${lang}: {`);
  if (startIndex === -1) return new Set();
  
  // We'll just look for keys in lines that look like key: "value" or key: 'value'
  // But wait, the en block is just:
  // en: {
  //   translation: {
  //     ...((resources as any).en?.translation || {}),
  //     ...enExtra.translation
  //   }
  // }
  // So it DOES NOT contain the hardcoded keys like ro does!
  // Ah!!! 
  // In `i18n.ts`, `enExtra.translation` is used, and maybe it doesn't have all the keys!
}
