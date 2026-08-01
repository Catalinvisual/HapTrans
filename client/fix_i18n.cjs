const fs = require('fs');
const path = require('path');

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
let content = fs.readFileSync(i18nPath, 'utf8');

const extractedPath = path.join(__dirname, 'extracted_strings.json');
const keys = Object.keys(JSON.parse(fs.readFileSync(extractedPath, 'utf8')));

// Find the English translations that were successfully injected
let enKeysBlock = '';
const enMatch = content.match(/en:\s*\{\s*translation:\s*\{([\s\S]*?)search:\s*"Search"/);
if (enMatch) {
  // Extract all lines that contain our keys
  const lines = enMatch[1].split('\n');
  const validLines = lines.filter(line => {
    return keys.some(k => line.includes(`      ${k}:`));
  });
  enKeysBlock = validLines.join('\n') + '\n';
}

if (enKeysBlock) {
  console.log('Successfully extracted English keys. Injecting to other languages...');
  
  // For languages that failed (de, fr, es, it), they didn't get patched. We just patch them.
  // For nl, it got patched with Romanian. We will overwrite the injected lines by finding them.
  
  const langs = ['nl', 'de', 'fr', 'es', 'it'];
  for (const lang of langs) {
    // Check if it already has toast_clientTersCu
    if (content.includes(`      toast_clientTersCu:`) && content.match(new RegExp(`${lang}:\\s*\\{\\s*translation:\\s*\\{[\\s\\S]*?toast_clientTersCu:`))) {
      // It was injected. Let's just remove the bad injection. This is complex with regex.
      // Alternatively, we can just change the fallbackLng to 'en' and leave it alone, but wait, 
      // if 'nl' has Romanian text, fallbackLng won't trigger because the key exists!
      // So we MUST replace the 'nl' keys.
    }
  }
}

// Actually, a simpler way is to just find all occurrences of our keys and replace their values with the English value, EXCEPT for 'ro'.
// Let's create a map of key -> enValue
const enMap = {};
if (enKeysBlock) {
  const lines = enKeysBlock.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*(toast_[a-zA-Z0-9]+|jsx_[a-zA-Z0-9]+):\s*"(.*)",$/);
    if (match) {
      enMap[match[1]] = match[2];
    }
  }
}

// Now replace in the entire file for any language EXCEPT 'ro'.
// This is safe because the keys are uniquely generated (toast_..., jsx_...)
let modifiedContent = content.split('\n').map(line => {
  const match = line.match(/^\s*(toast_[a-zA-Z0-9]+|jsx_[a-zA-Z0-9]+):\s*"(.*)",$/);
  if (match) {
    const key = match[1];
    const val = match[2];
    
    // Check if this line is in the 'ro' block
    // We can't easily know the block from line by line.
    return line; // aborting line-by-line approach
  }
  return line;
}).join('\n');

// Better approach: regex replace for each language block
const allLangs = ['nl', 'de', 'fr', 'frBase', 'es', 'it'];
for (const lang of allLangs) {
  const blockRegex = new RegExp(`(${lang}:\\s*\\{\\s*translation:\\s*\\{)([\\s\\S]*?)(?=\\n\\s*search:|$)`);
  content = content.replace(blockRegex, (match, p1, p2) => {
    // p2 contains the injected keys (if any). We want to replace it with enKeysBlock.
    // If it wasn't injected, p2 is just empty space.
    return p1 + '\n' + enKeysBlock + '\n';
  });
}

// Change fallbackLng
content = content.replace(/fallbackLng:\s*'ro'/, "fallbackLng: 'en'");

fs.writeFileSync(i18nPath, content, 'utf8');
console.log('Fixed i18n.ts with English fallbacks and changed fallbackLng to en.');

