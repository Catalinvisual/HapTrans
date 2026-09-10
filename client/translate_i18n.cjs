const fs = require('fs');
const path = require('path');
const https = require('https');

const extractedPath = path.join(__dirname, 'extracted_strings.json');
const extractedStrings = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

const languages = ['en', 'nl', 'de', 'fr', 'es', 'it'];
const baseLang = 'ro';

async function translateText(text, targetLang) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          parsed[0].forEach(t => translated += t[0]);
          resolve(translated);
        } catch(e) {
          console.error('Translation error', e.message);
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
}

// Function to inject translations into i18nContent
function injectToI18n(lang, newKeysStr) {
  const regex = new RegExp(lang + ':\\s*\\{\\s*translation:\\s*\\{');
  if (i18nContent.match(regex)) {
    i18nContent = i18nContent.replace(regex, lang + ': { translation: {' + newKeysStr + ',');
    console.log('Patched ' + lang);
  }
}

async function main() {
  console.log(`Translating ${Object.keys(extractedStrings).length} keys...`);
  
  // Prepare Romanian keys
  let roKeys = '';
  for (const [key, value] of Object.entries(extractedStrings)) {
    roKeys += `\n      ${key}: ${JSON.stringify(value)},`;
  }
  injectToI18n('ro', roKeys);

  // Translate and prepare for other languages
  for (const lang of languages) {
    console.log(`Translating to ${lang}...`);
    let langKeys = '';
    
    // Process in small batches to avoid rate limits
    const entries = Object.entries(extractedStrings);
    const batchSize = 10;
    
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      const promises = batch.map(async ([key, value]) => {
        // Only translate if value contains alphabetical characters
        if (/[a-zA-Z]/.test(value)) {
          const translated = await translateText(value, lang);
          return `\n      ${key}: ${JSON.stringify(translated)},`;
        } else {
          return `\n      ${key}: ${JSON.stringify(value)},`;
        }
      });
      
      const results = await Promise.all(promises);
      langKeys += results.join('');
      
      // Small delay between batches
      await new Promise(r => setTimeout(r, 200));
    }
    
    injectToI18n(lang, langKeys);
    if (lang === 'fr') injectToI18n('frBase', langKeys);
  }

  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('Successfully injected all translations to i18n.ts');
}

main();
