const fs = require('fs');

const content = fs.readFileSync('src/lib/i18n.ts', 'utf8');
const lines = content.split('\n');

let inLangBlock = null;
let seenKeys = new Set();
let cleanedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Detect language block start
  const blockStartMatch = line.match(/^(\s*)([a-zA-Z0-9_]+):\s*\{\s*translation:\s*\{/);
  if (blockStartMatch) {
    inLangBlock = blockStartMatch[2];
    seenKeys = new Set();
    cleanedLines.push(line);
    continue;
  }
  
  // Detect language block end (approximate)
  if (inLangBlock && line.match(/^\s*\},?\s*$/)) {
    // We might be ending the translation block
    // Just reset seenKeys for safety if it's the actual end, but we don't need to be perfect
    // Actually, just let it run until the next language block.
  }

  if (inLangBlock) {
    // Try to match a key-value line
    // e.g.   addTruck: 'LKW hinzufügen',
    const keyMatch = line.match(/^\s*([a-zA-Z0-9_.]+)\s*:/);
    if (keyMatch) {
      const key = keyMatch[1];
      if (seenKeys.has(key)) {
        // Duplicate found! Skip this line.
        console.log(`Removed duplicate key '${key}' in ${inLangBlock}`);
        continue;
      } else {
        seenKeys.add(key);
      }
    }
  }

  cleanedLines.push(line);
}

fs.writeFileSync('src/lib/i18n.ts', cleanedLines.join('\n'), 'utf8');
console.log("Cleanup complete!");
