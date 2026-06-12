const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    path: 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/DriversPage.tsx',
    stateStr: 'const [deleteId, setDeleteId] = useState<string | null>(null);',
    modalJSX: `
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirmDeleteDriver') || 'Esti sigur ca vrei sa stergi soferul?'}
      />
    </div>`,
    deleteRegex: /const handleDelete = async \(id: string\) => \{[\s\S]*?if \(!confirm\(.*?\)\) return;[\s\S]*?try \{[\s\S]*?await api\.delete\(\`\/drivers\/\$\{id\}\`\);([\s\S]*?)\}[\s\S]*?catch \([^)]*\) \{([\s\S]*?)\}\s*\};/,
    replaceWith: `const handleDelete = (id: string) => setDeleteId(id);

  const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(\`/drivers/\${deleteId}\`);$1} catch (err) {$2} finally { setDeleteId(null); }
  };`
  },
  {
    path: 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/TrucksPage.tsx',
    stateStr: 'const [deleteId, setDeleteId] = useState<string | null>(null);',
    modalJSX: `
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirmDeleteTruck') || 'Esti sigur ca vrei sa stergi camionul?'}
      />
    </div>`,
    // TrucksPage has confirm inline in the JSX: onClick={async () => { if (!confirm(t('confirmDeleteTruck'))) return; await api.delete(`/trucks/${truck.id}`); toast.success(t('truckDeleted')); load(); }}
    deleteRegex: /onClick=\{async \(\) => \{ if \(!confirm\(t\('confirmDeleteTruck'\)\)\) return; await api\.delete\(\`\/trucks\/\$\{truck\.id\}\`\); toast\.success\(t\('truckDeleted'\)\); load\(\); \}\}/g,
    replaceWith: `onClick={() => setDeleteId(truck.id)}`
  },
  {
    path: 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/DocumentsPage.tsx',
    stateStr: 'const [deleteId, setDeleteId] = useState<string | null>(null);',
    modalJSX: `
      <ConfirmModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={t('confirm') || 'Esti sigur ca vrei sa stergi documentul?'}
      />
    </div>`,
    // DocumentsPage has confirm inline: onClick={async () => { if (confirm(t('confirm'))) { await api.delete(`/documents/${doc.id}`); toast.success(t('documentDeleted')); load(); } }}
    deleteRegex: /onClick=\{async \(\) => \{ if \(confirm\(t\('confirm'\)\)\) \{ await api\.delete\(\`\/documents\/\$\{doc\.id\}\`\); toast\.success\(t\('documentDeleted'\)\); load\(\); \} \}\}/g,
    replaceWith: `onClick={() => setDeleteId(doc.id)}`
  },
  {
    path: 'c:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/pages/UsersPage.tsx',
    stateStr: 'const [deactivateUser, setDeactivateUser] = useState<any>(null);\n  const [deleteUser, setDeleteUser] = useState<string | null>(null);',
    modalJSX: `
      <ConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={executeDelete}
        title={t('confirm')}
        message={'Sunteti sigur ca doriti stergerea acestui utilizator?'}
      />
      <ConfirmModal
        isOpen={!!deactivateUser}
        onClose={() => setDeactivateUser(null)}
        onConfirm={executeDeactivate}
        title={t('confirm')}
        message={t('confirmDeactivateUser') || 'Dezactivati utilizatorul?'}
      />
    </div>`,
    // UsersPage has confirm inside handleDelete and inline: 
    // const confirmed = confirm(
    //  "Ești sigur că vrei să ștergi acest utilizator?\n\nAceastă acțiune va șterge doar contul și datele personale, dar va păstra referințele către el în facturi și documente."
    //);
    deleteRegex: /const handleDelete = async \(id: string\) => \{[\s\S]*?const confirmed = confirm\([\s\S]*?\);[\s\S]*?if \(!confirmed\) return;[\s\S]*?try \{[\s\S]*?await api\.delete\(\`\/users\/\$\{id\}\`\);([\s\S]*?)\}[\s\S]*?catch \(err\) \{([\s\S]*?)\}\s*\};/,
    replaceWith: `const handleDelete = (id: string) => setDeleteUser(id);

  const executeDelete = async () => {
    if (!deleteUser) return;
    try {
      await api.delete(\`/users/\${deleteUser}\`);$1} catch (err) {$2} finally { setDeleteUser(null); }
  };`,
    extraRegex: /onClick=\{async \(\) => \{ if \(!confirm\(t\('confirmDeactivateUser'\)\)\) return; await api\.patch\(\`\/users\/\$\{u\.id\}\`, \{ isActive: !u\.isActive \}\); toast\.success\(t\('updated'\)\); load\(\); \}\}/g,
    extraReplaceWith: `onClick={() => setDeactivateUser(u)}`
  }
];

for (const fix of filesToFix) {
  let code = fs.readFileSync(fix.path, 'utf8');

  if (!code.includes('ConfirmModal')) {
    code = code.replace("import api from '../lib/api';", "import api from '../lib/api';\nimport ConfirmModal from '../components/ConfirmModal';");
  }

  if (!code.includes(fix.stateStr.split('=')[0].trim())) {
    code = code.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n  ' + fix.stateStr);
  }

  code = code.replace(fix.deleteRegex, fix.replaceWith);
  
  if (fix.extraRegex) {
    code = code.replace(fix.extraRegex, fix.extraReplaceWith);
  }

  // Add the executeDelete for TrucksPage and DocumentsPage
  if (fix.path.includes('TrucksPage') && !code.includes('const executeDelete')) {
    code = code.replace('const load = () =>', `const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(\`/trucks/\${deleteId}\`);
      toast.success(t('truckDeleted'));
      load();
    } catch {
      toast.error('Error');
    } finally {
      setDeleteId(null);
    }
  };
  const load = () =>`);
  }
  
  if (fix.path.includes('DocumentsPage') && !code.includes('const executeDelete')) {
    code = code.replace('const load = async () =>', `const executeDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(\`/documents/\${deleteId}\`);
      toast.success(t('documentDeleted'));
      load();
    } catch {
      toast.error('Error');
    } finally {
      setDeleteId(null);
    }
  };
  const load = async () =>`);
  }

  if (fix.path.includes('UsersPage') && !code.includes('const executeDeactivate')) {
    code = code.replace('const handleDelete =', `const executeDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      await api.patch(\`/users/\${deactivateUser.id}\`, { isActive: !deactivateUser.isActive });
      toast.success(t('updated'));
      load();
    } catch {
      toast.error('Error');
    } finally {
      setDeactivateUser(null);
    }
  };
  const handleDelete =`);
  }

  // Add the modal at the bottom
  if (!code.includes('<ConfirmModal')) {
    code = code.replace('</div>\n  );\n}', fix.modalJSX + '\n}');
  }

  fs.writeFileSync(fix.path, code);
}
console.log('Fixed modals');
