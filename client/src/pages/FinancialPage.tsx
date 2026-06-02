import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../lib/api';
import DieselWidget from '../components/DieselWidget';

export default function FinancialPage() {
  const { t, i18n } = useTranslation();
  const [monthly, setMonthly] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/trips/monthly-profits').then(r => { setMonthly(r.data); setLoading(false); });
  }, []);

  const getTranslatedMonth = (monthStr: string) => {
    const m = monthStr.toLowerCase().replace('.', '');
    const map: Record<string, string> = {
      'ian': 'jan', 'feb': 'feb', 'mar': 'mar', 'apr': 'apr', 'mai': 'may', 'iun': 'jun',
      'iul': 'jul', 'aug': 'aug', 'sep': 'sep', 'oct': 'oct', 'noi': 'nov', 'dec': 'dec'
    };
    const key = map[m] || m;
    return t(key);
  };

  const totalRevenue = monthly.reduce((s, m) => s + (m.totalRevenue || 0), 0);
  const totalCost = monthly.reduce((s, m) => s + (m.totalCost || 0), 0);
  const totalExpenses = monthly.reduce((s, m) => s + (m.totalExpenses || 0), 0);
  const totalProfit = monthly.reduce((s, m) => s + (m.profit || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">{t('financial')}</h1>
        <p className="text-text-secondary text-sm">{t('financialReport6Months')}</p>
      </div>
      {/* Diesel Prices Widget */}
      <DieselWidget avgConsumptionL100={32} />
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('totalRevenue'), value: totalRevenue, color: 'text-success' },
          { label: t('totalCosts'), value: totalCost, color: 'text-error' },
          { label: t('totalProfit'), value: totalProfit, color: totalProfit >= 0 ? 'text-success' : 'text-error' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">{s.label}</span>
            <span className={`text-2xl font-bold mt-2 ${s.color}`}>€{s.value.toLocaleString(i18n.language)}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold text-text mb-4">{t('revenueVsCosts')}</h3>
        {loading ? <div className="h-64 flex items-center justify-center text-text-secondary text-sm">{t('loading')}</div> : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickFormatter={getTranslatedMonth} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip formatter={(v: any) => [`€${Number(v || 0).toLocaleString(i18n.language)}`, '']} />
              <Legend />
              <Bar dataKey="totalRevenue" fill="#16A34A" name={t('revenue')} radius={[4,4,0,0]} />
              <Bar dataKey="totalCost" fill="#DC2626" name={t('costs')} stackId="a" radius={[0,0,0,0]} />
              <Bar dataKey="totalExpenses" fill="#991B1B" name="Cheltuieli" stackId="a" radius={[4,4,0,0]} />
              <Bar dataKey="profit" fill="#FF7A1A" name={t('profit')} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="card p-0 overflow-x-auto">
        <table className="w-full">
          <thead><tr className="bg-surface border-b border-border">
            {[t('monthTable'), t('trips'), t('revenue'), t('costs'), 'Cheltuieli (Exp)', t('profit'), t('costPerKm')].map(h => <th key={h} className="table-header">{h}</th>)}
          </tr></thead>
          <tbody>
            {monthly.map(m => (
              <tr key={m.month} className="hover:bg-surface/60 transition-colors">
                <td className="table-cell font-semibold capitalize">{getTranslatedMonth(m.month)}</td>
                <td className="table-cell">{m.tripsCount}</td>
                <td className="table-cell font-semibold text-success">€{(m.totalRevenue || 0).toLocaleString(i18n.language)}</td>
                <td className="table-cell text-error">€{(m.totalCost || 0).toLocaleString(i18n.language)}</td>
                <td className="table-cell text-error">€{(m.totalExpenses || 0).toLocaleString(i18n.language)}</td>
                <td className={`table-cell font-semibold ${(m.profit || 0) >= 0 ? 'text-success' : 'text-error'}`}>€{(m.profit || 0).toLocaleString(i18n.language)}</td>
                <td className="table-cell">€{(m.costPerKm || 0).toFixed(2)}/km</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
