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

const extractedStrings = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_strings.json'), 'utf8'));

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
  let needsTranslationImport = false;

  traverse(ast, {
    // 1. toast.success('Text') -> toast.success(t('toast_key'))
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
            path.node.arguments[0] = t.callExpression(t.identifier('t'), [t.stringLiteral(key)]);
            modified = true;
            needsTranslationImport = true;
          }
        }
      }

      // 2. t('key') || 'Fallback' -> t('key')
      if (
        t.isLogicalExpression(path.node) &&
        path.node.operator === '||' &&
        t.isCallExpression(path.node.left) &&
        t.isIdentifier(path.node.left.callee, { name: 't' }) &&
        t.isStringLiteral(path.node.right)
      ) {
        path.replaceWith(path.node.left);
        modified = true;
      }
    },
    // 3. JSXText -> {t('key')}
    JSXText(path) {
      const text = path.node.value.trim();
      if (/[a-zA-Z]/.test(text) && !text.startsWith('{') && text.length > 2) {
        const key = 'jsx_' + toCamelCase(text.substring(0, 15));
        path.replaceWith(t.jsxExpressionContainer(t.callExpression(t.identifier('t'), [t.stringLiteral(key)])));
        modified = true;
        needsTranslationImport = true;
      }
    }
  });

  if (modified) {
    const output = generator(ast, {}, code);
    fs.writeFileSync(filePath, output.code, 'utf8');
    console.log(`Updated ${filePath}`);
  }
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
console.log('Finished AST replacement!');
