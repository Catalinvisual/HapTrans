const fs = require('fs');
const path = require('path');

const files = [
  'ConfirmDeleteModal.tsx', 
  'ConfirmModal.tsx', 
  'GlobalSearchModal.tsx', 
  'RapidTransportModal.tsx', 
  'ShortcutsHelpModal.tsx', 
  'AiImportModal.tsx'
];

files.forEach(f => {
  const fp = path.join('c:/Users/hapen/Desktop/New folder/client/src/components', f);
  if (!fs.existsSync(fp)) return;
  let c = fs.readFileSync(fp, 'utf8');
  if (c.includes('createPortal')) return;
  
  if (!c.includes('import { createPortal }')) {
    if (c.includes('import { ReactNode')) {
      c = c.replace(/import \{.*\} from 'react';/, "$&\nimport { createPortal } from 'react-dom';");
    } else if (c.includes("import React")) {
      c = c.replace(/import React.*?from 'react';/, "$&\nimport { createPortal } from 'react-dom';");
    } else {
      c = "import { createPortal } from 'react-dom';\n" + c;
    }
  }

  // Regex to match `return (` followed by whitespace and `<div className="fixed` or `<div className={`fixed`
  const returnRegex = /return\s*\(\s*<div[^>]*className=["`']fixed/g;
  const match = returnRegex.exec(c);
  if (match) {
    const returnIdx = match.index;
    c = c.slice(0, returnIdx) + 'const modalContent = (' + c.slice(returnIdx + 8);
    
    // Find the last `  );`
    const lastDivIdx = c.lastIndexOf('  );');
    if (lastDivIdx !== -1) {
      const insertion = `
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
`;
      c = c.slice(0, lastDivIdx + 4) + insertion + c.slice(lastDivIdx + 4);
      fs.writeFileSync(fp, c);
      console.log('Fixed', f);
    }
  }
});
