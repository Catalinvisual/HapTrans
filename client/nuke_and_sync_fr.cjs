const fs = require('fs');
const https = require('https');

const path = 'src/lib/i18n.ts';
let content = fs.readFileSync(path, 'utf8');

const startFr = content.indexOf('frBase: { translation: {');
let endFr = content.indexOf('};\n\nresources.fr = {');
if (endFr === -1) endFr = content.indexOf('};\r\n\r\nresources.fr = {');
if (endFr === -1) endFr = content.length;

// Nuke frBase
content = content.substring(0, startFr) + 'frBase: { translation: {\n    }\n  ' + content.substring(endFr);
fs.writeFileSync(path, content, 'utf8');
console.log('Nuked frBase successfully.');

// Now extract RO and sync to frBase
const roStart = content.indexOf('ro: { translation: {');
const roEnd = content.indexOf('en: { translation: {');
const roText = content.substring(roStart, roEnd);

const roKeys = {};
roText.split('\n').forEach(line => {
  const match = line.match(/^\s*(["']?[a-zA-Z0-9_.-]+["']?)\s*:\s*['"](.*?)['"]/);
  if (match) {
    let k = match[1];
    if (k.startsWith('"') || k.startsWith("'")) k = k.slice(1, -1);
    roKeys[k] = match[2];
  }
});

const keysToTranslate = Object.keys(roKeys);
console.log('Extracting', keysToTranslate.length, 'keys from RO for French sync...');

async function translateChunk(texts) {
  return new Promise((resolve) => {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ro&tl=fr&dt=t&q=${encodeURIComponent(texts.join(' ||| '))}`;
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
  return str.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

async function main() {
  const translations = {};
  const chunkSize = 20;
  
  for (let i = 0; i < keysToTranslate.length; i += chunkSize) {
    const cKeys = keysToTranslate.slice(i, i + chunkSize);
    const cTexts = cKeys.map(k => roKeys[k]);
    
    console.log(`Translating chunk ${Math.floor(i/chunkSize) + 1} of ${Math.ceil(keysToTranslate.length/chunkSize)} for French...`);
    const transParts = await translateChunk(cTexts);
    
    cKeys.forEach((k, idx) => {
      let val = transParts[idx] ? transParts[idx].trim() : unCamelCase(k);
      translations[k] = val;
    });
    
    await new Promise(r => setTimeout(r, 1000));
  }
  
  let newKeysStr = '';
  for (const [k, v] of Object.entries(translations)) {
    const formattedKey = k.includes('.') ? `"${k}"` : k;
    newKeysStr += `\n      ${formattedKey}: ${JSON.stringify(v)},`;
  }
  
  content = fs.readFileSync(path, 'utf8');
  const langRegex = new RegExp(`(frBase:\\s*\\{\\s*translation:\\s*\\{)`);
  content = content.replace(langRegex, `$1${newKeysStr}`);
  
  fs.writeFileSync(path, content, 'utf8');
  console.log('French completely synced and regenerated!');
}

main();
