const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const srcDirs = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components')
];

let extractedStrings = {};
let fileModifications = {};

function toCamelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '');
}

function processFile(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch(e) {
    console.error('Error parsing', filePath, e.message);
    return;
  }

  let modified = false;

  traverse(ast, {
    // 1. toast.success('Text')
    CallExpression(path) {
      if (
        t.isMemberExpression(path.node.callee) &&
        t.isIdentifier(path.node.callee.object, { name: 'toast' }) &&
        path.node.arguments.length > 0
      ) {
        const arg = path.node.arguments[0];
        if (t.isStringLiteral(arg)) {
          const text = arg.value;
          if (/[a-zA-Z]/.test(text)) {
            const key = 'toast_' + toCamelCase(text.substring(0, 15));
            extractedStrings[key] = text;
            
            // replace with t(key)
            // Need to make sure `t` is available in scope. We assume it is for now, 
            // or we can use i18n.t(key) if t is not in scope.
            // But let's just log them for now to avoid breaking.
          }
        }
      }

      // 2. t('key') || 'Fallback'
      if (
        t.isLogicalExpression(path.node) &&
        path.node.operator === '||' &&
        t.isCallExpression(path.node.left) &&
        t.isIdentifier(path.node.left.callee, { name: 't' }) &&
        t.isStringLiteral(path.node.right)
      ) {
        const key = path.node.left.arguments[0].value;
        const fallback = path.node.right.value;
        extractedStrings[key] = fallback;
      }
    },
    // 3. JSXText
    JSXText(path) {
      const text = path.node.value.trim();
      if (/[a-zA-Z]/.test(text) && !text.startsWith('{') && text.length > 2) {
        const key = 'jsx_' + toCamelCase(text.substring(0, 15));
        extractedStrings[key] = text;
      }
    }
  });
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      processFile(fullPath);
    }
  }
}

srcDirs.forEach(dir => walk(dir));

fs.writeFileSync(path.join(__dirname, 'extracted_strings.json'), JSON.stringify(extractedStrings, null, 2));
console.log('Extracted', Object.keys(extractedStrings).length, 'strings to extracted_strings.json');
