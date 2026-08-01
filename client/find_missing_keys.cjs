const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const i18nPath = path.join(__dirname, 'src', 'lib', 'i18n.ts');
const i18nCode = fs.readFileSync(i18nPath, 'utf8');

// Rough extraction of keys from ro block
const roBlockMatch = i18nCode.match(/ro:\s*\{\s*translation:\s*\{([\s\S]*?)\}(?=\s*,\s*[a-z]+:|\s*\}\s*;\s*const)/);
let existingKeys = new Set();
if (roBlockMatch) {
  const lines = roBlockMatch[1].split('\n');
  lines.forEach(line => {
    const match = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
    if (match) existingKeys.add(match[1]);
  });
}
console.log(`Found ${existingKeys.size} keys in ro block`);

const srcDirs = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'layouts')
];

let usedKeys = new Set();

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const code = fs.readFileSync(fullPath, 'utf8');
      try {
        const ast = parser.parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        });
        traverse(ast, {
          CallExpression(path) {
            if (path.node.callee.name === 't' && path.node.arguments.length > 0) {
              const arg = path.node.arguments[0];
              if (arg.type === 'StringLiteral') {
                usedKeys.add(arg.value);
              }
            }
          }
        });
      } catch (e) {
        // ignore parse errors for now
      }
    }
  }
}

srcDirs.forEach(dir => walk(dir));

const missingKeys = [...usedKeys].filter(k => !existingKeys.has(k) && !k.includes(' '));
console.log(`Found ${missingKeys.length} missing keys`);
fs.writeFileSync('missing_keys.json', JSON.stringify(missingKeys, null, 2));
