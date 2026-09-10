const fs = require('fs');
const https = require('https');

const i18nPath = 'src/lib/i18n.ts';
let content = fs.readFileSync(i18nPath, 'utf8');

function extractKeys(blockText) {
  const keys = {};
  const lines = blockText.split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([a-zA-Z0-9_.]+)\s*:\s*['"](.*)['"]/);
    if (match) keys[match[1]] = match[2];
  });
  return keys;
}

function getBlock(lang) {
  const start = content.indexOf(`${lang}: { translation: {`);
  if (start === -1) return null;
  const end = content.indexOf('},', start);
  return { start, end, text: content.substring(start, end) };
}

async function translateChunk(texts, targetLang) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=${targetLang}&dt=t&q=${encodeURIComponent(texts.join(' ||| '))}`;
    https.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let translated = '';
          if (parsed && parsed[0]) {
            parsed[0].forEach(t => translated += (t[0] || ''));
          }
          resolve(translated.split(/\s*\|\|\|\s*|\s*\|\s*\|\s*\|\s*/));
        } catch(e) { resolve(texts); }
      });
    }).on('error', () => resolve(texts));
  });
}

function unCamelCase(str) {
  if (str === 'cui') return 'CUI / VAT';
  if (str === 'tva') return 'VAT';
  return str.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

async function main() {
  const roBlock = getBlock('ro');
  if (!roBlock) return console.log('ro block not found');
  const roKeys = extractKeys(roBlock.text);
  
  const langs = ['en', 'nl', 'de', 'frBase'];
  
  for (const lang of langs) {
    const block = getBlock(lang);
    if (!block) continue;
    
    const langKeys = extractKeys(block.text);
    const missingKeys = [];
    const missingTexts = []; // Original RO texts to translate
    
    for (const [key, roVal] of Object.entries(roKeys)) {
      if (!(key in langKeys)) {
        missingKeys.push(key);
        missingTexts.push(roVal);
      }
    }
    
    if (missingKeys.length > 0) {
      console.log(`\n${lang} is missing ${missingKeys.length} keys from RO.`);
      
      const translations = {};
      if (lang === 'en') {
        // Just uncamelcase the key for English if we don't want to translate Romanian to English, 
        // wait, RO value is proper Romanian (e.g. "Nume"). So we MUST translate to English!
        // Actually, translating RO to EN works perfectly.
      }
      
      const chunkSize = 30;
      for (let i = 0; i < missingKeys.length; i += chunkSize) {
        const cKeys = missingKeys.slice(i, i + chunkSize);
        const cTexts = missingTexts.slice(i, i + chunkSize);
        
        console.log(`Translating chunk ${i/chunkSize + 1} for ${lang}...`);
        const targetL = lang === 'frBase' ? 'fr' : lang;
        let transParts;
        if (lang === 'en') {
            // For English, use translation API from RO to EN
            transParts = await translateChunk(cTexts, 'en');
        } else {
            transParts = await translateChunk(cTexts, targetL);
        }
        
        cKeys.forEach((k, idx) => {
          let val = transParts[idx] ? transParts[idx].trim() : unCamelCase(k);
          // Special fixes
          if (k === 'cui' && lang === 'en') val = 'CUI / VAT';
          translations[k] = val;
        });
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Inject new keys
      let newKeysStr = '';
      for (const [k, v] of Object.entries(translations)) {
        newKeysStr += `\n      ${k}: ${JSON.stringify(v)},`;
      }
      
      const langRegex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
      content = content.replace(langRegex, `$1${newKeysStr}`);
      console.log(`Injected missing keys into ${lang}`);
    } else {
      console.log(`\n${lang} is fully synced with RO.`);
    }
  }

  // Final check for the hardcoded PlanningPage text "Toate comenzile sunt planificate!"
  // It was in PlanningPage.tsx, we must replace it.
  fs.writeFileSync(i18nPath, content, 'utf8');
  console.log('\ni18n sync complete!');
}

main();
