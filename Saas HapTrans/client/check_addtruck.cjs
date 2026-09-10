const fs = require('fs');
const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');

const langs = ['ro', 'en', 'nl', 'de', 'fr', 'es', 'it'];
langs.forEach(lang => {
  const startIndex = content.indexOf(`${lang}: { translation: {`);
  if (startIndex === -1) {
    console.log(`${lang} not found`);
    return;
  }
  const endIndex = content.indexOf('},', startIndex);
  const block = content.substring(startIndex, endIndex);
  
  const m = block.match(/addTruck:\s*['"](.*?)['"]/);
  console.log(`${lang} addTruck value:`, m ? m[1] : 'KEY MISSING');
});
