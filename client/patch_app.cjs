const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/App.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('import ExpensesPage from')) {
    c = c.replace("import SettingsPage from './pages/SettingsPage';", "import SettingsPage from './pages/SettingsPage';\nimport ExpensesPage from './pages/ExpensesPage';");
}

if (!c.includes('<Route path="/expenses" element={<ExpensesPage />} />')) {
    c = c.replace('<Route path="/settings" element={<SettingsPage />} />', '<Route path="/expenses" element={<ExpensesPage />} />\n              <Route path="/settings" element={<SettingsPage />} />');
}

fs.writeFileSync(path, c);
console.log('App.tsx updated');
