const fs = require('fs');
const https = require('https');

const i18nPath = 'src/lib/i18n.ts';
let content = fs.readFileSync(i18nPath, 'utf8');

function extractKeys(blockText) {
  const keys = {};
  const lines = blockText.split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([a-zA-Z0-9_.-]+)\s*:\s*['"](.*?)['"]/);
    if (match) {
      let k = match[1];
      if (k.startsWith('"') && k.endsWith('"')) k = k.slice(1, -1);
      keys[k] = match[2];
    }
  });
  return keys;
}

const blocks = {
  ro: { startStr: 'ro: { translation: {', endStr: 'en: { translation: {' },
  en: { startStr: 'en: { translation: {', endStr: 'nl: { translation: {' },
  nl: { startStr: 'nl: { translation: {', endStr: 'de: { translation: {' },
  de: { startStr: 'de: { translation: {', endStr: 'frBase: { translation: {' },
  frBase: { startStr: 'frBase: { translation: {', endStr: '};\n\nresources.fr = {' }
};

function getBlockText(lang) {
  const start = content.indexOf(blocks[lang].startStr);
  let end = content.indexOf(blocks[lang].endStr);
  if (end === -1 && lang === 'frBase') {
    end = content.indexOf('};\r\n\r\nresources.fr = {'); // windows newline
  }
  if (end === -1 && lang === 'frBase') {
      end = content.indexOf('};\nresources.fr = {');
  }
  if (start === -1 || end === -1) {
     console.log('Failed to find block boundaries for', lang);
     return '';
  }
  return content.substring(start, end);
}

const roText = getBlockText('ro');
const roKeys = extractKeys(roText);
console.log('Total RO keys:', Object.keys(roKeys).length);

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
  const langs = ['en', 'nl', 'de', 'frBase'];
  
  for (const lang of langs) {
    const langText = getBlockText(lang);
    if (!langText) continue;
    
    const langKeys = extractKeys(langText);
    const missingKeys = [];
    const missingTexts = [];
    
    for (const [key, roVal] of Object.entries(roKeys)) {
      if (!(key in langKeys) && !( '"' + key + '"' in langKeys )) {
        missingKeys.push(key);
        missingTexts.push(roVal);
      }
    }
    
    if (missingKeys.length > 0) {
      console.log(`\n${lang} is missing ${missingKeys.length} keys from RO.`);
      
      const translations = {};
      const chunkSize = 20; // smaller chunk size for large text counts
      
      for (let i = 0; i < missingKeys.length; i += chunkSize) {
        const cKeys = missingKeys.slice(i, i + chunkSize);
        const cTexts = missingTexts.slice(i, i + chunkSize);
        
        console.log(`Translating chunk ${i/chunkSize + 1} of ${Math.ceil(missingKeys.length/chunkSize)} for ${lang}...`);
        const targetL = lang === 'frBase' ? 'fr' : lang;
        let transParts;
        if (lang === 'en') {
            transParts = await translateChunk(cTexts, 'en');
        } else {
            transParts = await translateChunk(cTexts, targetL);
        }
        
        cKeys.forEach((k, idx) => {
          let val = transParts[idx] ? transParts[idx].trim() : unCamelCase(k);
          if (k === 'cui' && lang === 'en') val = 'CUI / VAT';
          translations[k] = val;
        });
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      let newKeysStr = '';
      for (const [k, v] of Object.entries(translations)) {
        const formattedKey = k.includes('.') ? `"${k}"` : k;
        newKeysStr += `\n      ${formattedKey}: ${JSON.stringify(v)},`;
      }
      
      const langRegex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)`);
      content = content.replace(langRegex, `$1${newKeysStr}`);
      console.log(`Injected missing keys into ${lang}`);
    } else {
      console.log(`\n${lang} is fully synced with RO.`);
    }
  }

  fs.writeFileSync(i18nPath, content, 'utf8');
  console.log('\ni18n sync complete!');
}

main();
