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
          if (parsed && parsed[0]) {
            parsed[0].forEach(t => translated += (t[0] || ''));
          }
          resolve(translated || text);
        } catch(e) {
          console.error(`Translation error for ${targetLang}`, e.message);
          resolve(text); // fallback to original on error
        }
      });
    }).on('error', () => resolve(text));
  });
}

async function main() {
  const entries = Object.entries(extractedStrings);
  const targetLangs = ['nl', 'de', 'fr', 'es', 'it'];
  const chunkSize = 40; // Smaller chunk to avoid long URL lengths

  console.log(`Starting translation of ${entries.length} keys for 5 languages...`);

  for (const lang of targetLangs) {
    console.log(`\nTranslating for language: ${lang}`);
    const translations = {};
    
    for (let i = 0; i < entries.length; i += chunkSize) {
      const chunk = entries.slice(i, i + chunkSize);
      
      // We use ' ||| ' as a delimiter to translate multiple strings in one request
      const textToTranslate = chunk.map(c => c[1]).join(' ||| ');
      
      console.log(`  -> Translating chunk ${Math.floor(i / chunkSize) + 1}...`);
      const translatedText = await translateChunk(textToTranslate, lang);
      
      // Sometimes Google adds spaces around the delimiter: ' | | | ' or '|||'
      const translatedParts = translatedText.split(/\s*\|\|\|\s*|\s*\|\s*\|\s*\|\s*/);
      
      chunk.forEach((entry, idx) => {
        translations[entry[0]] = translatedParts[idx] ? translatedParts[idx].trim() : entry[1];
      });
      
      await new Promise(r => setTimeout(r, 1500)); // 1.5s delay to strictly avoid rate limit
    }

    // Inject into i18n.ts
    let langKeysStr = '';
    for (const [key, value] of Object.entries(translations)) {
      langKeysStr += `\n      ${key}: ${JSON.stringify(value)},`;
    }

    const langRegex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
    if (i18nContent.match(langRegex)) {
      i18nContent = i18nContent.replace(langRegex, `$1${langKeysStr}`);
      console.log(`Successfully injected translations into ${lang} block.`);
    }
    
    // Also inject into frBase if lang is fr
    if (lang === 'fr') {
      const frBaseRegex = /(frBase:\s*\{\s*translation:\s*\{)/;
      if (i18nContent.match(frBaseRegex)) {
        i18nContent = i18nContent.replace(frBaseRegex, `$1${langKeysStr}`);
      }
    }
  }
  
  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('\nAll languages have been successfully translated and injected!');
}

main();
