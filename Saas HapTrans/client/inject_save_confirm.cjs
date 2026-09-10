const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;
const t = require('@babel/types');

const pagesDir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(pagesDir, file);
  const code = fs.readFileSync(filePath, 'utf8');

  // Skip if it doesn't have editId
  if (!code.includes('editId') || !code.includes('handleSubmit')) continue;
  
  // Skip if already has useSaveConfirm
  if (code.includes('useSaveConfirm')) continue;

  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });
  } catch(e) {
    console.error('Error parsing', file, e.message);
    continue;
  }

  let modified = false;

  traverse(ast, {
    // Inject import
    Program(path) {
      const importDecl = t.importDeclaration(
        [t.importSpecifier(t.identifier('useSaveConfirm'), t.identifier('useSaveConfirm'))],
        t.stringLiteral('../components/SaveConfirmProvider')
      );
      path.node.body.unshift(importDecl);
    },
    // Inject hook inside component
    FunctionDeclaration(path) {
      if (path.node.id && path.node.id.name && path.node.id.name.endsWith('Page') && path.node.body.body) {
        // Find handleSubmit
        const hasHandleSubmit = path.node.body.body.some(stmt => 
          t.isVariableDeclaration(stmt) && 
          stmt.declarations[0].id.name === 'handleSubmit'
        );
        
        if (hasHandleSubmit) {
          const hookDecl = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('confirmSave'),
              t.callExpression(t.identifier('useSaveConfirm'), [])
            )
          ]);
          path.node.body.body.unshift(hookDecl);
        }
      }
    },
    // Inject confirmation logic in handleSubmit's if (editId)
    IfStatement(path) {
      // Look for if (editId)
      if (t.isIdentifier(path.node.test, { name: 'editId' })) {
        // Ensure we are inside handleSubmit
        const parentFunc = path.findParent(p => 
          p.isVariableDeclarator() && p.node.id.name === 'handleSubmit'
        );
        if (parentFunc) {
          // Add: const isConfirmed = await confirmSave(); if (!isConfirmed) return;
          const confirmCall = t.variableDeclaration('const', [
            t.variableDeclarator(
              t.identifier('isConfirmed'),
              t.awaitExpression(t.callExpression(t.identifier('confirmSave'), []))
            )
          ]);
          const returnIfFalse = t.ifStatement(
            t.unaryExpression('!', t.identifier('isConfirmed')),
            t.returnStatement()
          );

          if (t.isBlockStatement(path.node.consequent)) {
            path.node.consequent.body.unshift(confirmCall, returnIfFalse);
            modified = true;
          }
        }
      }
    }
  });

  if (modified) {
    const output = generator(ast, {}, code);
    fs.writeFileSync(filePath, output.code, 'utf8');
    console.log(`Injected save confirmation into ${file}`);
  }
}
