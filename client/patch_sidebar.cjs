const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapCargo/client/src/components/Sidebar.tsx';
let c = fs.readFileSync(path, 'utf8');

if (!c.includes('Wallet,')) {
    c = c.replace('import { Home, Users, Truck, Briefcase, FileText, Settings, Bell, ChevronLeft, ChevronRight, LogOut, Map } from \'lucide-react\';', 'import { Home, Users, Truck, Briefcase, FileText, Settings, Bell, ChevronLeft, ChevronRight, LogOut, Map, Wallet } from \'lucide-react\';');
}

const oldNav = `{ icon: Settings, label: t('settings'), path: '/settings', key: 'settings' }`;
const newNav = `{ icon: Wallet, label: t('expenses'), path: '/expenses', key: 'expenses' },\n  { icon: Settings, label: t('settings'), path: '/settings', key: 'settings' }`;

if (!c.includes('key: \'expenses\'')) {
    c = c.replace(oldNav, newNav);
}

fs.writeFileSync(path, c);
console.log('Sidebar.tsx updated');
