const fs = require('fs');
const path = require('path');

const basePath = 'c:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/pages';
const files = [
  'ClientsPage.tsx',
  'TripsPage.tsx',
  'TrucksPage.tsx',
  'DriversPage.tsx'
];

for (const file of files) {
  const filePath = path.join(basePath, file);
  if (!fs.existsSync(filePath)) continue;

  let code = fs.readFileSync(filePath, 'utf8');

  // 1. Add ConfirmModal import
  if (!code.includes('ConfirmModal')) {
    code = code.replace("import api from '../lib/api';", "import api from '../lib/api';\nimport ConfirmModal from '../components/ConfirmModal';");
  }

  // 2. Add delete state
  if (!code.includes('const [deleteId, setDeleteId]')) {
    code = code.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  const [deleteId, setDeleteId] = useState<string | null>(null);');
  }

  // 3. Update handleDelete logic
  // e.g. if (confirm(...)) { try { await api.delete... } }
  // Replace the confirm block with just the try/catch, and we rename it to executeDelete
  if (code.includes('if (confirm(')) {
    // We will extract the code inside the confirm block.
    // Since regex for nested braces is hard, we can just replace "if (confirm(..." with "if (true) {", and create a wrapper handleDelete that just sets deleteId
    code = code.replace(/const handleDelete = async \(id: string\) => \{[\s\S]*?if \(confirm\([^)]*\)\) \{/g, `const executeDelete = async () => {
    if (!deleteId) return;
    try {`);
    
    // We also need to fix the parameter `id` inside executeDelete to use `deleteId`
    code = code.replace(/api\.delete\(\`.*?\/.*\$\{id\}\`\)/g, match => match.replace('${id}', '${deleteId}'));
    
    // Create new handleDelete
    code = code.replace(/const executeDelete = async \(\) => \{/, `const handleDelete = (id: string) => setDeleteId(id);
  
  const executeDelete = async () => {`);
    
    // The try/catch inside executeDelete might close with } }
    // Let's ensure the state is cleared.
    code = code.replace(/load\(\);\s*\}\s*catch\s*\{/g, `load();\n      } catch {\n`);
    code = code.replace(/toast\.error\((.*?)\);\s*\}/g, `toast.error($1);\n      } finally {\n        setDeleteId(null);\n      }`);
  }

  // 4. Render ConfirmModal at the end of the return statement
  if (!code.includes('<ConfirmModal')) {
    code = code.replace('</div>\n  );\n}', `
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirmDelete')}
      />
    </div>
  );
}`);
  }

  fs.writeFileSync(filePath, code);
}

// 5. Layout.tsx - Translation of document names inside notifications
const layoutPath = path.join(basePath, '../components/Layout.tsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');
if (!layoutCode.includes('translatedMessage.replace')) {
  layoutCode = layoutCode.replace(
    /let translatedMessage = n\.message;/,
    `let translatedMessage = n.message;
                        if (translatedMessage) {
                          translatedMessage = translatedMessage.replace('Permis', t('doc_permis') || 'Permis')
                                                               .replace('Aviz Medical', t('doc_medical') || 'Aviz Medical')
                                                               .replace('Card Tahograf', t('doc_tacho') || 'Card Tahograf');
                        }`
  );
  fs.writeFileSync(layoutPath, layoutCode);
}

// 6. i18n.ts - Add missing keys
const i18nPath = path.join(basePath, '../lib/i18n.ts');
let i18nCode = fs.readFileSync(i18nPath, 'utf8');

// Add to RO
i18nCode = i18nCode.replace("company_from_note: \"Aceste date vor apărea automat în secțiunea FROM a fiecărei facturi generate.\",", "company_from_note: \"Aceste date vor apărea automat în secțiunea FROM a fiecărei facturi generate.\",\n      doc_permis: 'Permis',\n      doc_medical: 'Aviz Medical',\n      doc_tacho: 'Card Tahograf',");
// Add to EN
i18nCode = i18nCode.replace("company_from_note: \"This data will automatically appear in the FROM section of every generated invoice.\",", "company_from_note: \"This data will automatically appear in the FROM section of every generated invoice.\",\n      doc_permis: 'License',\n      doc_medical: 'Medical Certificate',\n      doc_tacho: 'Tacho Card',");
// Add to NL
i18nCode = i18nCode.replace("company_from_note: \"Deze gegevens verschijnen automatisch in het FROM gedeelte van elke gegenereerde factuur.\",", "company_from_note: \"Deze gegevens verschijnen automatisch in het FROM gedeelte van elke gegenereerde factuur.\",\n      doc_permis: 'Rijbewijs',\n      doc_medical: 'Medische Verklaring',\n      doc_tacho: 'Tacho Kaart',");

fs.writeFileSync(i18nPath, i18nCode);

console.log("Refactoring complete");
