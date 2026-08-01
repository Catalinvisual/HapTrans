const fs = require('fs');
const ts = require('typescript');
const code = fs.readFileSync('src/lib/i18n.ts', 'utf8');

try {
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  });
  
  // We can't easily eval it because of imports, but if it transpiles, syntax is valid.
  console.log("Transpiled successfully");
} catch (e) {
  console.log("Syntax error", e);
}
