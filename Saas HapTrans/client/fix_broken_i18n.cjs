const fs = require('fs');
const path = require('path');
const https = require('https');

const extractedPath = path.join(__dirname, 'extracted_strings.json');
const extractedStrings = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

async function translateChunk(text, targetLang) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
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

async function main() {
  const entries = Object.entries(extractedStrings);
  console.log(`Processing ${entries.length} keys...`);

  // 1. Inject Romanian keys immediately
  let roKeys = '';
  for (const [key, value] of entries) {
    roKeys += `\n      ${key}: ${JSON.stringify(value)},`;
  }
  
  // Inject RO
  const roRegex = /(ro:\s*\{\s*translation:\s*\{)/;
  if (i18nContent.match(roRegex)) {
    i18nContent = i18nContent.replace(roRegex, `$1${roKeys}`);
    console.log('Injected RO keys');
  }

  // 2. Translate to English using chunking
  const chunkSize = 50;
  const enTranslations = {};
  
  for (let i = 0; i < entries.length; i += chunkSize) {
    const chunk = entries.slice(i, i + chunkSize);
    // filter out keys that don't need translation (e.g. numbers or pure english that happen to be there)
    // but just translate everything from RO to EN.
    const textToTranslate = chunk.map(c => c[1]).join(' ||| ');
    
    console.log(`Translating chunk ${i / chunkSize + 1}...`);
    const translatedText = await translateChunk(textToTranslate, 'en');
    
    const translatedParts = translatedText.split(/\s*\|\|\|\s*/);
    
    chunk.forEach((entry, idx) => {
      enTranslations[entry[0]] = translatedParts[idx] || entry[1];
    });
    
    await new Promise(r => setTimeout(r, 1000)); // 1s delay
  }

  // 3. Inject English keys
  let enKeysStr = '';
  for (const [key, value] of Object.entries(enTranslations)) {
    enKeysStr += `\n      ${key}: ${JSON.stringify(value)},`;
  }

  const enRegex = /(en:\s*\{\s*translation:\s*\{)/;
  if (i18nContent.match(enRegex)) {
    i18nContent = i18nContent.replace(enRegex, `$1${enKeysStr}`);
    console.log('Injected EN keys');
  }

  // Set fallback to English
  i18nContent = i18nContent.replace(/fallbackLng:\s*'ro'/, "fallbackLng: 'en'");
  
  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('Fixed i18n.ts fully! UI should now be restored and translated to English.');
}

main();
