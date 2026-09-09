const fs = require('fs');
const path = require('path');
const https = require('https');

const extractedPath = path.join(__dirname, 'extracted_strings.json');
const missingPath = path.join(__dirname, 'missing_keys.json');

const extractedStrings = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));
const missingKeys = JSON.parse(fs.readFileSync(missingPath, 'utf8'));

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let i18nContent = fs.readFileSync(i18nPath, 'utf8');

function unCamelCase(str) {
  if (str === 'tva') return 'VAT';
  if (str === 'cui') return 'CUI / VAT';
  if (str === 'invoiceNo') return 'Invoice No';
  if (str === 'totalRevenue') return 'Total Revenue';
  if (str === 'totalCosts') return 'Total Costs';
  if (str === 'totalProfit') return 'Total Profit';
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
          console.error(`Translation error`, e.message);
          resolve(text);
        }
      });
    }).on('error', () => resolve(text));
  });
}

async function main() {
  console.log('Translating all 435 keys to French...');
  
  // Prepare all English text to translate
  const allKeys = [];
  const allTexts = [];
  
  // 1. Extracted strings (Translate RO -> EN first? No, we can just use the RO text as source, but wait, the API call has sl=en.
  // Actually, I can just use sl=auto. Google will figure it out.)
  for (const [key, val] of Object.entries(extractedStrings)) {
    allKeys.push(key);
    allTexts.push(val); // RO text
  }
  
  // 2. Missing keys (Use unCamelCase EN text)
  missingKeys.forEach(k => {
    allKeys.push(k);
    allTexts.push(unCamelCase(k)); // EN text
  });

  const translations = {};
  const chunkSize = 35;
  
  for (let i = 0; i < allKeys.length; i += chunkSize) {
    const chunkKeys = allKeys.slice(i, i + chunkSize);
    const chunkTexts = allTexts.slice(i, i + chunkSize);
    
    // We use a safe separator
    const textToTranslate = chunkTexts.join(' ||| ');
    
    console.log(`  -> Translating chunk ${Math.floor(i / chunkSize) + 1}...`);
    // use sl=auto so it handles both RO and EN sources
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=fr&dt=t&q=${encodeURIComponent(textToTranslate)}`;
    
    const translatedText = await new Promise((resolve) => {
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
            resolve(translated || textToTranslate);
          } catch(e) { resolve(textToTranslate); }
        });
      }).on('error', () => resolve(textToTranslate));
    });
    
    const translatedParts = translatedText.split(/\s*\|\|\|\s*|\s*\|\s*\|\s*\|\s*/);
    
    chunkKeys.forEach((key, idx) => {
      translations[key] = translatedParts[idx] ? translatedParts[idx].trim() : chunkTexts[idx];
    });
    
    await new Promise(r => setTimeout(r, 1000));
  }

  // Inject into frBase
  let frKeysStr = '';
  for (const [key, value] of Object.entries(translations)) {
    frKeysStr += `\n      ${key}: ${JSON.stringify(value)},`;
  }

  const frRegex = /(frBase:\s*\{\s*translation:\s*\{)/;
  if (i18nContent.match(frRegex)) {
    i18nContent = i18nContent.replace(frRegex, `$1${frKeysStr}`);
    console.log('Successfully injected translations into frBase block.');
  } else {
    console.log('frBase block not found!');
  }

  fs.writeFileSync(i18nPath, i18nContent, 'utf8');
  console.log('\nFrench translations fixed and injected!');
}

main();
