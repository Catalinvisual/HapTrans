const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const targetStrings = [
  "Name", "cui", "save", "Drivers", "file", "type", "Notițe", "reference", "uploadedBy", "date", "Actions",
  "Search", "Export", "0 results", "newInvoice", "invoiceNo", "client", "amount", "tva", "issueDate", "dueDate", "Status",
  "noData", "totalRevenue", "totalCosts", "totalProfit", "searchEmployee", "0 records", "Month", "generatePayroll", "employee",
  "payroll_gross", "payroll_tax", "payroll_net", "daysWorked", "payroll_allowance", "bonuses / deductions", "payroll_totalNet",
  "noPayrollData", "addMaintenance", "addExpense", "expenseDate", "expenseCategory", "expenseDescription", "expenseAmount",
  "expenseDocument", "expenseActions", "cat_other", "Road freight transport services", "Toate comenzile sunt planificate!"
];

// Map of words to keys (to avoid spaces/symbols in keys)
const wordToKey = {};
targetStrings.forEach(w => {
  let key = w.replace(/[^a-zA-Z0-9]/g, '_');
  if (key.match(/^[0-9]/)) key = 'num_' + key;
  if (!wordToKey[w]) wordToKey[w] = key;
});

const dirs = [
  path.join(__dirname, 'src', 'pages'),
  path.join(__dirname, 'src', 'components'),
  path.join(__dirname, 'src', 'layouts')
];

let modifiedFiles = 0;
let newKeys = new Set();

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
        
        let changed = false;
        let hasUseTranslation = false;
        
        // First check if file imports useTranslation
        traverse(ast, {
          ImportDeclaration(path) {
            if (path.node.source.value === 'react-i18next') {
              hasUseTranslation = true;
            }
          }
        });

        traverse(ast, {
          StringLiteral(p) {
            // Ignore imports
            if (p.parent.type === 'ImportDeclaration') return;
            // Ignore object keys unless it's a value (like header: "Name")
            if (p.parent.type === 'ObjectProperty' && p.parent.key === p.node) return;
            // Ignore JSX attributes that are not placeholder/title/label
            if (p.parent.type === 'JSXAttribute') {
               const name = p.parent.name.name;
               if (!['placeholder', 'title', 'label'].includes(name)) return;
            }
            // Ignore arguments to console.log, etc.
            if (p.parent.type === 'CallExpression' && p.parent.callee.name !== 't') {
               // Only ignore if it's not a translation func
               if (p.parent.callee.name === 'console' || p.parent.callee.type === 'MemberExpression') return;
            }

            const val = p.node.value;
            if (targetStrings.includes(val)) {
               const key = wordToKey[val];
               newKeys.add(key);
               
               if (p.parent.type === 'JSXAttribute') {
                 // Replace placeholder="Search" with placeholder={t("Search")}
                 p.replaceWith(t.jsxExpressionContainer(
                   t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
                 ));
               } else {
                 p.replaceWith(t.callExpression(t.identifier('t'), [t.stringLiteral(key)]));
               }
               changed = true;
            }
          },
          JSXText(p) {
            const val = p.node.value.trim();
            if (targetStrings.includes(val)) {
               const key = wordToKey[val];
               newKeys.add(key);
               p.replaceWith(t.jsxExpressionContainer(
                 t.callExpression(t.identifier('t'), [t.stringLiteral(key)])
               ));
               changed = true;
            }
          }
        });

        if (changed) {
          // VERY HACKY: if missing useTranslation, we can't easily inject it properly without knowing the component structure.
          // For now we assume pages using these strings ALREADY have useTranslation.
          // Generate code
          const output = generate(ast, {}, code);
          fs.writeFileSync(fullPath, output.code, 'utf8');
          modifiedFiles++;
          console.log(`Modified ${fullPath}`);
        }
      } catch (e) {
        console.error(`Parse error in ${fullPath}`);
      }
    }
  }
}

dirs.forEach(d => walk(d));
console.log(`Modified ${modifiedFiles} files.`);
fs.writeFileSync('new_extracted_keys.json', JSON.stringify(Object.keys(wordToKey).reduce((acc, w) => {
  if (newKeys.has(wordToKey[w])) acc[wordToKey[w]] = w;
  return acc;
}, {}), null, 2));
