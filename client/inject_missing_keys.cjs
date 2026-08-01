const fs = require('fs');
const path = require('path');
const https = require('https');

const missingPath = path.join(__dirname, 'missing_keys.json');
const missingKeys = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

function unCamelCase(str) {
  return str
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

async function translateChunk(text, targetLang) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          if (parsed && parsed[0]) {
            parsed[0].forEach(t => translated += (t[0] || ''));
          }
          resolve(translated || text);
        } catch(e) {
          console.error(`Translation error for ${targetLang}`, e.message);
          resolve(text); 
        }
      });
    }).on('error', () => resolve(text));
  });
}

async function main() {
  console.log(`Processing ${missingKeys.length} missing keys...`);

  // 1. Generate English translations locally
  const enTranslations = {};
  missingKeys.forEach(key => {
    // Special overrides for known bad formatting
    if (key === 'tva') enTranslations[key] = 'VAT';
    else if (key === 'cui') enTranslations[key] = 'CUI / VAT';
    else if (key === 'invoiceNo') enTranslations[key] = 'Invoice No';
    else if (key === 'totalRevenue') enTranslations[key] = 'Total Revenue';
    else if (key === 'totalCosts') enTranslations[key] = 'Total Costs';
    else if (key === 'totalProfit') enTranslations[key] = 'Total Profit';
    else enTranslations[key] = unCamelCase(key);
  });

  // Inject EN immediately
  let enKeysStr = '';
  for (const [key, value] of Object.entries(enTranslations)) {
    enKeysStr += `\n      ${key}: ${JSON.stringify(value)},`;
  }
  const enRegex = /(en:\s*\{\s*translation:\s*\{)/;
  if (i18nContent.match(enRegex)) {
    i18nContent = i18nContent.replace(enRegex, `$1${enKeysStr}`);
    console.log('Injected EN keys');
  }

  // 2. Translate to other languages
  const targetLangs = ['ro', 'nl', 'de'];
  const chunkSize = 35; // Safe chunk size

  for (const lang of targetLangs) {
    console.log(`\nTranslating for language: ${lang}`);
    const translations = {};
    
    for (let i = 0; i < missingKeys.length; i += chunkSize) {
      const chunkKeys = missingKeys.slice(i, i + chunkSize);
      
      const textToTranslate = chunkKeys.map(k => enTranslations[k]).join(' ||| ');
      
      console.log(`  -> Translating chunk ${Math.floor(i / chunkSize) + 1}...`);
      const translatedText = await translateChunk(textToTranslate, lang);
      
      const translatedParts = translatedText.split(/\s*\|\|\|\s*|\s*\|\s*\|\s*\|\s*/);
      
      chunkKeys.forEach((key, idx) => {
        translations[key] = translatedParts[idx] ? translatedParts[idx].trim() : enTranslations[key];
      });
      
      await new Promise(r => setTimeout(r, 1000));
    }

    let langKeysStr = '';
    for (const [key, value] of Object.entries(translations)) {
      langKeysStr += `\n      ${key}: ${JSON.stringify(value)},`;
    }

    const langRegex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
    if (i18nContent.match(langRegex)) {
      i18nContent = i18nContent.replace(langRegex, `$1${langKeysStr}`);
      console.log(`Successfully injected translations into ${lang} block.`);
    }
  }

  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('\nAll missing keys have been fixed and injected!');
}

main();
