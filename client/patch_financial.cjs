const fs = require('fs');
const path = 'C:/Users/hapen/Desktop/New folder/Saas HapTrans/client/src/pages/FinancialPage.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
    "const totalCost = monthly.reduce((s, m) => s + (m.totalCost || 0), 0);",
    "const totalCost = monthly.reduce((s, m) => s + (m.totalCost || 0), 0);\n  const totalExpenses = monthly.reduce((s, m) => s + (m.totalExpenses || 0), 0);"
);

const oldWidgets = `        <div className="grid grid-cols-3 gap-4">
          {[
            { label: t('totalRevenue'), value: totalRevenue, color: 'text-success' },
            { label: t('totalCosts'), value: totalCost, color: 'text-error' },
            { label: t('totalProfit'), value: totalProfit, color: totalProfit >= 0 ? 'text-success' : 'text-error' },
          ].map(s => (`;
const newWidgets = `        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: t('totalRevenue'), value: totalRevenue, color: 'text-success' },
            { label: t('totalCosts'), value: totalCost, color: 'text-error' },
            { label: 'Cheltuieli (Total)', value: totalExpenses, color: 'text-error' },
            { label: t('totalProfit'), value: totalProfit, color: totalProfit >= 0 ? 'text-success' : 'text-error' },
          ].map(s => (`;

c = c.replace(oldWidgets, newWidgets);

const oldChart = `<Bar dataKey="totalCost" fill="#DC2626" name={t('costs')} radius={[4,4,0,0]} />
              <Bar dataKey="profit" fill="#FF7A1A" name={t('profit')} radius={[4,4,0,0]} />`;
const newChart = `<Bar dataKey="totalCost" fill="#DC2626" name={t('costs')} stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="totalExpenses" fill="#991B1B" name="Cheltuieli" stackId="a" radius={[4,4,0,0]} />
              <Bar dataKey="profit" fill="#FF7A1A" name={t('profit')} radius={[4,4,0,0]} />`;

c = c.replace(oldChart, newChart);

const oldTableHeaders = `{[t('monthTable'), t('trips'), t('revenue'), t('costs'), t('profit'), t('costPerKm')].map(h => <th key={h} className="table-header">{h}</th>)}`;
const newTableHeaders = `{[t('monthTable'), t('trips'), t('revenue'), t('costs'), 'Cheltuieli (Exp)', t('profit'), t('costPerKm')].map(h => <th key={h} className="table-header">{h}</th>)}`;

c = c.replace(oldTableHeaders, newTableHeaders);

const oldTableRow = `<td className="table-cell text-error">€{(m.totalCost || 0).toLocaleString(i18n.language)}</td>
                  <td className={\`table-cell font-semibold \${(m.profit || 0) >= 0 ? 'text-success' : 'text-error'}\`}>€{(m.profit || 0).toLocaleString(i18n.language)}</td>`;
const newTableRow = `<td className="table-cell text-error">€{(m.totalCost || 0).toLocaleString(i18n.language)}</td>
                  <td className="table-cell text-error opacity-80">€{(m.totalExpenses || 0).toLocaleString(i18n.language)}</td>
                  <td className={\`table-cell font-semibold \${(m.profit || 0) >= 0 ? 'text-success' : 'text-error'}\`}>€{(m.profit || 0).toLocaleString(i18n.language)}</td>`;

c = c.replace(oldTableRow, newTableRow);

fs.writeFileSync(path, c);
console.log('FinancialPage.tsx updated');
