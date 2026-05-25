import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download, Filter, Search, FileText, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import CustomSelect from '../components/CustomSelect';
import { generatePayrollPdfBase64 } from '../lib/payrollPdfGenerator';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function PayrollPage() {
  const { t, i18n } = useTranslation();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');

  const loadPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payrolls?month=${selectedMonth}&year=${selectedYear}`);
      setPayrolls(res.data);
    } catch (err) {
      toast.error('Eroare la încărcarea salariilor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, [selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    const loadingToast = toast.loading('Calculăm salariile pentru luna selectată...');
    try {
      await api.post('/payrolls/generate', { month: selectedMonth, year: selectedYear });
      toast.success('Salariile au fost calculate cu succes!', { id: loadingToast });
      loadPayrolls();
    } catch (err) {
      toast.error('Eroare la generarea salariilor.', { id: loadingToast });
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await api.patch(`/payrolls/${id}`, { [field]: value });
      toast.success('Actualizat cu succes!');
      loadPayrolls();
    } catch {
      toast.error('Eroare la actualizare.');
    }
  };

  const handleDownloadPdf = async (p: any) => {
    const loadingToast = toast.loading(t('generatingPdf') || 'Generăm fluturașul...');
    try {
      const base64 = await generatePayrollPdfBase64(p, t);
      const link = document.createElement('a');
      link.href = base64;
      link.download = `Loonstrook_${p.user?.name?.replace(/\s+/g, '_')}_${p.month}_${p.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Fluturaș descărcat!', { id: loadingToast });
    } catch (err) {
      toast.error('Eroare la generare.', { id: loadingToast });
    }
  };

  const filtered = payrolls.filter(p => {
    const q = search.toLowerCase();
    return (p.user?.name || '').toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Salarizare (Payroll)</h1>
          <p className="text-text-secondary text-sm">Gestionare Bruto Salaris, Loonheffing și Onbelaste vergoeding</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Filter className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-semibold text-text-secondary">Luna:</span>
          </div>
          <select 
            className="input py-1.5 px-3 text-sm font-semibold bg-surface border-none"
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select 
            className="input py-1.5 px-3 text-sm font-semibold bg-surface border-none"
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button 
            onClick={handleGenerate}
            className="btn-primary py-1.5 px-4 text-sm font-bold flex items-center gap-2 ml-2 shadow-md shadow-primary/20"
          >
            <RefreshCw className="w-4 h-4" /> Calculează {MONTHS[selectedMonth-1]}
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9 py-2 text-sm" placeholder="Caută șofer..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs font-semibold text-text-secondary uppercase bg-surface px-2.5 py-1.5 rounded-lg">
            {filtered.length} Înregistrări
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="table-header">Șofer</th>
                <th className="table-header">Bruto Salaris</th>
                <th className="table-header text-error">Loonheffing (Taxe)</th>
                <th className="table-header text-success">Netto Salaris</th>
                <th className="table-header">Zile Cursă</th>
                <th className="table-header text-primary">Onbelaste Verg.</th>
                <th className="table-header">Bonus / Rețineri</th>
                <th className="table-header font-bold text-success">Total Net (Uitbetaling)</th>
                <th className="table-header">Status</th>
                <th className="table-header">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">Se încarcă...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">Nu există date calculate pentru luna selectată. Apasă "Calculează".</td></tr>
              : filtered.map(p => (
                <tr key={p.id} className="hover:bg-surface/60 transition-colors border-b border-border/50 last:border-0">
                  <td className="table-cell font-bold text-text">
                    {p.user?.name || 'Necunoscut'}
                    <div className="text-[10px] font-normal text-text-secondary mt-0.5">Vakantiegeld: €{Number(p.holidayAllowance).toFixed(2)}</div>
                  </td>
                  <td className="table-cell font-semibold">€{Number(p.grossSalary).toFixed(2)}</td>
                  <td className="table-cell text-error font-medium">-€{Number(p.taxAmount).toFixed(2)}</td>
                  <td className="table-cell text-success font-semibold">€{Number(p.netSalary).toFixed(2)}</td>
                  <td className="table-cell font-medium text-text-secondary">
                    <span className="bg-surface px-2 py-1 rounded-md border border-border">{p.daysWorked} zile</span>
                    <div className="text-[10px] text-text-secondary mt-1">@ €{Number(p.dailyAllowance).toFixed(2)}/zi</div>
                  </td>
                  <td className="table-cell font-bold text-primary">€{Number(p.totalAllowance).toFixed(2)}</td>
                  <td className="table-cell min-w-[120px]">
                    <div className="flex flex-col gap-1.5">
                      <input 
                        type="number" className="input py-1 px-2 text-xs border-success/30 focus:border-success focus:ring-success/20 bg-success/5" placeholder="Bonus €" 
                        defaultValue={p.bonuses || ''}
                        onBlur={e => handleUpdate(p.id, 'bonuses', Number(e.target.value) || 0)}
                      />
                      <input 
                        type="number" className="input py-1 px-2 text-xs border-error/30 focus:border-error focus:ring-error/20 bg-error/5" placeholder="Reținere €" 
                        defaultValue={p.deductions || ''}
                        onBlur={e => handleUpdate(p.id, 'deductions', Number(e.target.value) || 0)}
                      />
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="bg-success/10 text-success border border-success/20 px-3 py-1.5 rounded-lg font-bold text-base whitespace-nowrap">
                      €{Number(p.totalNetToPay).toFixed(2)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <CustomSelect 
                      className="w-28 text-xs"
                      value={p.status} 
                      onChange={val => handleUpdate(p.id, 'status', val)} 
                      options={[
                        { value: 'draft', label: 'Draft', color: 'text-gray-500' },
                        { value: 'paid', label: 'Plătit', color: 'text-success' },
                        { value: 'sent', label: 'Trimis', color: 'text-primary' },
                      ]}
                    />
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleDownloadPdf(p)}
                        className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded transition-colors" 
                        title="Descarcă Fluturaș"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
