const fs = require('fs');
let content = fs.readFileSync('client/src/lib/i18n.ts', 'utf8');

const keysToEnsure = {
  dashboard: { RO: 'Panou de Control', EN: 'Dashboard', NL: 'Dashboard', DE: 'Armaturenbrett', FR: 'Tableau de bord', ES: 'Panel de Control' },
  trips: { RO: 'Curse', EN: 'Trips', NL: 'Ritten', DE: 'Touren', FR: 'Courses', ES: 'Viajes' },
  orders: { RO: 'Comenzi', EN: 'Orders', NL: 'Bestellingen', DE: 'Aufträge', FR: 'Commandes', ES: 'Pedidos' },
  liveMap: { RO: 'Hartă Live', EN: 'Live Map', NL: 'Live Kaart', DE: 'Live-Karte', FR: 'Carte en direct', ES: 'Mapa en Vivo' },
  trucks: { RO: 'Camioane', EN: 'Trucks', NL: 'Vrachtwagens', DE: 'LKW', FR: 'Camions', ES: 'Camiones' },
  planning: { RO: 'Planificare', EN: 'Planning', NL: 'Planning', DE: 'Planung', FR: 'Planification', ES: 'Planificación' },
  drivers: { RO: 'Șoferi', EN: 'Drivers', NL: 'Chauffeurs', DE: 'Fahrer', FR: 'Chauffeurs', ES: 'Conductores' },
  clients: { RO: 'Clienți', EN: 'Clients', NL: 'Klanten', DE: 'Kunden', FR: 'Clients', ES: 'Clientes' },
  chat: { RO: 'Chat', EN: 'Chat', NL: 'Chat', DE: 'Chat', FR: 'Chat', ES: 'Chat' },
  documents: { RO: 'Documente', EN: 'Documents', NL: 'Documenten', DE: 'Dokumente', FR: 'Documents', ES: 'Documentos' },
  invoices: { RO: 'Facturi', EN: 'Invoices', NL: 'Facturen', DE: 'Rechnungen', FR: 'Factures', ES: 'Facturas' },
  financial: { RO: 'Financiar', EN: 'Financial', NL: 'Financieel', DE: 'Finanzen', FR: 'Financier', ES: 'Financiero' },
  payroll: { RO: 'Salarizare', EN: 'Payroll', NL: 'Salarisadministratie', DE: 'Gehaltsabrechnung', FR: 'Paie', ES: 'Nómina' },
  maintenance: { RO: 'Mentenanță', EN: 'Maintenance', NL: 'Onderhoud', DE: 'Wartung', FR: 'Maintenance', ES: 'Mantenimiento' },
  expenses: { RO: 'Cheltuieli', EN: 'Expenses', NL: 'Uitgaven', DE: 'Ausgaben', FR: 'Dépenses', ES: 'Gastos' },
  websiteCms: { RO: 'Conținut Web', EN: 'Website CMS', NL: 'Website CMS', DE: 'Website-CMS', FR: 'CMS Site Web', ES: 'CMS Sitio Web' },
  users: { RO: 'Utilizatori', EN: 'Users', NL: 'Gebruikers', DE: 'Benutzer', FR: 'Utilisateurs', ES: 'Usuarios' },
  settings: { RO: 'Setări', EN: 'Settings', NL: 'Instellingen', DE: 'Einstellungen', FR: 'Paramètres', ES: 'Ajustes' },
  loginSubtitle: { RO: 'Gestionați-vă flota eficient', EN: 'Manage your fleet efficiently', NL: 'Beheer uw vloot efficiënt', DE: 'Verwalten Sie Ihre Flotte effizient', FR: 'Gérez votre flotte efficacement', ES: 'Administre su flota de manera eficiente' }
};

const langMap = {
  ro: 'RO',
  en: 'EN',
  nl: 'NL',
  de: 'DE',
  fr: 'FR',
  es: 'ES'
};

const langs = ['ro', 'en', 'nl', 'de', 'fr', 'es'];

for (const langCode of langs) {
  const langEnum = langMap[langCode];
  
  const startRegex = new RegExp('^\\s*' + langCode + ':\\s*\\{\\s*translation:\\s*\\{', 'm');
  const match = content.match(startRegex);
  
  if (match) {
    const startIndex = match.index;
    let nextLangIndex = content.length;
    for (const other of langs) {
      if (other === langCode) continue;
      const otherRegex = new RegExp('^\\s*' + other + ':\\s*\\{\\s*translation:\\s*\\{', 'm');
      const otherMatch = content.match(otherRegex);
      if (otherMatch && otherMatch.index > startIndex && otherMatch.index < nextLangIndex) {
        nextLangIndex = otherMatch.index;
      }
    }
    
    const blockEndIndex = content.lastIndexOf('    }', nextLangIndex);
    
    if (blockEndIndex > startIndex) {
      let block = content.substring(startIndex, blockEndIndex);
      
      let toAppend = '';
      for (const [key, trans] of Object.entries(keysToEnsure)) {
        const keyRegex = new RegExp('\\s*' + key + '\\s*:');
        if (!keyRegex.test(block)) {
          toAppend += "\n      " + key + ": \"" + trans[langEnum].replace(/"/g, '\\"') + "\",";
        }
      }
      
      content = content.substring(0, blockEndIndex) + toAppend + '\n' + content.substring(blockEndIndex);
    }
  }
}

fs.writeFileSync('client/src/lib/i18n.ts', content, 'utf8');
console.log('Translations updated.');
