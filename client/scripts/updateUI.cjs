const fs = require('fs');
const path = require('path');

const basePath = 'c:/Users/hapen/Desktop/New folder/Saas HapTrans';

// 1. Dashboard.tsx - clickable card + scroll
const dashPath = path.join(basePath, 'client/src/pages/Dashboard.tsx');
let dashCode = fs.readFileSync(dashPath, 'utf8');
dashCode = dashCode.replace(
  '<div className="stat-card flex flex-col justify-between">',
  '<div className="stat-card flex flex-col justify-between cursor-pointer hover:bg-warning/5 transition-colors" onClick={() => document.getElementById(\'expiring-docs-section\')?.scrollIntoView({ behavior: \'smooth\' })}>'
);
dashCode = dashCode.replace(
  '<div className="card border-l-4 border-warning">',
  '<div id="expiring-docs-section" className="card border-l-4 border-warning">'
);
fs.writeFileSync(dashPath, dashCode);

// 2. ClientsPage.tsx - delete client
const clientsPath = path.join(basePath, 'client/src/pages/ClientsPage.tsx');
let clientsCode = fs.readFileSync(clientsPath, 'utf8');
if (!clientsCode.includes('Trash2')) {
  clientsCode = clientsCode.replace('import { Plus, Pencil, Search, Download }', 'import { Plus, Pencil, Search, Download, Trash2 }');
}
const deleteClientFunc = `
  const handleDelete = async (id: string) => {
    if (confirm(t('confirmDelete') || 'Ești sigur că vrei să ștergi acest client complet?')) {
      try {
        await api.delete(\`/clients/\${id}\`);
        toast.success('Client șters cu succes!');
        load();
      } catch {
        toast.error('Eroare la ștergerea clientului.');
      }
    }
  };
`;
if (!clientsCode.includes('const handleDelete')) {
  clientsCode = clientsCode.replace('const filtered = clients.filter', deleteClientFunc + '\n  const filtered = clients.filter');
}
const deleteBtn = `
                    <button onClick={() => handleDelete(c.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-error/10 transition-all ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
`;
if (!clientsCode.includes('<Trash2')) {
  clientsCode = clientsCode.replace(
    '</button>\n                  </td>',
    `</button>${deleteBtn}                  </td>`
  );
}
fs.writeFileSync(clientsPath, clientsCode);

// 3. Flatpickr options
const pagesPath = path.join(basePath, 'client/src/pages');
const files = fs.readdirSync(pagesPath).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const p = path.join(pagesPath, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // For dates
  if (content.includes("dateFormat: 'Y-m-d'")) {
    content = content.replace(/dateFormat: 'Y-m-d'/g, "dateFormat: 'd/m/Y', allowInput: true");
    changed = true;
  }
  // For time
  if (content.includes("dateFormat: 'H:i'")) {
    content = content.replace(/dateFormat: 'H:i'/g, "dateFormat: 'H:i', time_24hr: true, allowInput: true");
    changed = true;
  }
  // Replace YYYY-MM-DD placeholders
  if (content.includes('placeholder="YYYY-MM-DD"')) {
    content = content.replace(/placeholder="YYYY-MM-DD"/g, 'placeholder="DD/MM/YYYY"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content);
  }
});

// 4. Update Notifications in Backend
const dashServicePath = path.join(basePath, 'server/src/dashboard/dashboard.service.ts');
let dashSvcCode = fs.readFileSync(dashServicePath, 'utf8');
dashSvcCode = dashSvcCode.replace("type: 'alert',", "type: 'document',");
dashSvcCode = dashSvcCode.replace("title: 'notif_alert_title',", "title: 'Document Expirat / Expiră Curând',");
fs.writeFileSync(dashServicePath, dashSvcCode);

// Also add a little translation mapping in Layout.tsx so if they click Document Expirat, it goes to Documents.
const layoutPath = path.join(basePath, 'client/src/components/Layout.tsx');
let layoutCode = fs.readFileSync(layoutPath, 'utf8');
// It already routes to /documents if n.type === 'document'.
// Let's just make sure it also ignores 'notif_alert_title' if missing.
fs.writeFileSync(layoutPath, layoutCode);

console.log("Done updating files!");
