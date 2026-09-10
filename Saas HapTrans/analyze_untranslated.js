const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      walk(path.join(dir, file), fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, 'client/src'));
let toastMatches = [];
let fallbackMatches = [];
let jsxTextMatches = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find toasts like toast.success('Ceva') or toast.error("Ceva")
  const toasts = content.matchAll(/toast\.(?:success|error|loading)\(\s*(['"`])(.*?)\1\s*\)/g);
  for (const match of toasts) {
    toastMatches.push({ file: path.basename(file), text: match[2], full: match[0] });
  }

  // Find t('key') || 'fallback'
  const fallbacks = content.matchAll(/t\('([^']+)'\)\s*\|\|\s*(['"`])(.*?)\2/g);
  for (const match of fallbacks) {
    fallbackMatches.push({ file: path.basename(file), key: match[1], text: match[3], full: match[0] });
  }
}

console.log('--- TOASTS WITHOUT t() ---');
toastMatches.forEach(t => console.log(`${t.file}: ${t.full}`));
console.log('\n--- t() WITH FALLBACKS ---');
fallbackMatches.forEach(f => console.log(`${f.file}: ${f.full}`));

