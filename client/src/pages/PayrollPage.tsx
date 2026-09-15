import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Download, Filter, Search } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

import CustomSelect from '../components/CustomSelect';
import { generatePayrollPdfBase64 } from '../lib/payrollPdfGenerator';
import { matchesSearch } from '../lib/search';
import Pagination from '../components/Pagination';
import { useSaveConfirm } from '../components/SaveConfirmProvider';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export default function PayrollPage() {

  const {
    t,
    i18n
  } = useTranslation();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const loadPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payrolls?month=${selectedMonth}&year=${selectedYear}`);
      setPayrolls(res.data);
    } catch (err) {
      toast.error(t('errLoadPayrolls'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (i18n.language) {
      loadPayrolls();
    }
  }, [selectedMonth, selectedYear, i18n.language, t]);
  const handleGenerate = async () => {
    const loadingToast = toast.loading(t('toast_calcPayrolls'));
    try {
      await api.post('/payrolls/generate', {
        month: selectedMonth,
        year: selectedYear
      });
      toast.success(t('toast_calcSuccess'), {
        id: loadingToast
      });
      loadPayrolls();
    } catch (err) {
      toast.error(t('errGenPayrolls'), {
        id: loadingToast
      });
    }
  };
  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await api.patch(`/payrolls/${id}`, {
        [field]: value
      });
      toast.success(t('toast_updateSuccess'));
      loadPayrolls();
    } catch {
      toast.error(t('errUpdate'));
    }
  };
  const handleDownloadPdf = async (p: any) => {
    const loadingToast = toast.loading(t('generatingPdf'));
    try {
      const base64 = await generatePayrollPdfBase64(p, t);
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${base64}`;
      link.download = `Fluturas_Salariu_${p.user?.name}_${p.month}_${p.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t('toast_downloadSuccess'), {
        id: loadingToast
      });
    } catch (err) {
      toast.error(t('errGenerate'), {
        id: loadingToast
      });
    }
  };
  const filtered = payrolls.filter(p => matchesSearch(search, p.user?.name));
  return <div className="space-y-5 animate-fade-in">
      <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
        <div className="p-4 border-b border-border flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full xl:w-auto">
            <div className="relative flex-1 xl:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input className="input pl-9 py-2 text-sm w-full" placeholder={t('searchEmployee')} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <span className="text-xs font-bold text-text-secondary uppercase bg-surface px-3 py-2 rounded-lg shrink-0 border border-border/50">
              {filtered.length} {t('records')}
            </span>
          </div>
          
          <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
            <div className="flex items-center gap-2 bg-surface/50 border border-border rounded-xl p-1.5 shrink-0">
              <div className="flex items-center gap-1.5 px-2">
                <Filter className="w-4 h-4 text-text-secondary" />
                <span className="text-sm font-semibold text-text-secondary">{t("jsx_luna")}</span>
              </div>
              <CustomSelect className="w-28 text-sm font-semibold shadow-sm" value={String(selectedMonth)} onChange={val => setSelectedMonth(Number(val))} options={MONTHS.map((m, i) => ({
              value: String(i + 1),
              label: m
            }))} />
              <CustomSelect className="w-24 text-sm font-semibold shadow-sm" value={String(selectedYear)} onChange={val => setSelectedYear(Number(val))} options={[2024, 2025, 2026, 2027].map(y => ({
              value: String(y),
              label: String(y)
            }))} />
            </div>

            <button onClick={handleGenerate} className="btn-primary py-2 px-4 text-sm font-bold flex items-center gap-2 shrink-0 shadow-md shadow-primary/20">
              <RefreshCw className="w-4 h-4" /> {t('generatePayroll')}
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface border-b border-border">
                <th className="table-header">{t('employee')}</th>
                <th className="table-header">{t('payroll_gross')}</th>
                <th className="table-header">{t('payroll_tax')}</th>
                <th className="table-header">{t('payroll_net')}</th>
                <th className="table-header">{t('daysWorked')}</th>
                <th className="table-header">{t('payroll_allowance')}</th>
                <th className="table-header">{t('bonuses')} / {t('deductions')}</th>
                <th className="table-header">{t('payroll_totalNet')}</th>
                <th className="table-header">{t('status')}</th>
                <th className="table-header">{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">{t('loading')}</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">{t('noPayrollData')}</td></tr> : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(p => <tr key={p.id} className="hover:bg-surface/60 transition-colors border-b border-border/50 last:border-0">
                  <td className="table-cell font-bold text-text">
                    {p.user?.name || '-'}
                    <div className="text-[10px] font-normal text-text-secondary mt-0.5">{t('payroll_holiday')}: €{Number(p.holidayAllowance).toFixed(2)}</div>
                  </td>
                  <td className="table-cell font-semibold text-right">€{Number(p.grossSalary).toFixed(2)}</td>
                  <td className="table-cell text-error font-medium text-right">-€{Number(p.taxAmount).toFixed(2)}</td>
                  <td className="table-cell text-success font-semibold text-right">€{Number(p.netSalary).toFixed(2)}</td>
                  <td className="table-cell font-medium text-text-secondary text-center">
                    <span className="bg-surface px-2 py-1 rounded-md border border-border">{p.daysWorked} {t('days')}</span>
                    <div className="text-[10px] text-text-secondary mt-1">@ €{Number(p.dailyAllowance).toFixed(2)}/{t('day')}</div>
                  </td>
                  <td className="table-cell font-bold text-primary text-right">€{Number(p.totalAllowance).toFixed(2)}</td>
                  <td className="table-cell min-w-[120px] text-right">
                    <div className="flex flex-col gap-1.5 items-end">
<input type="number" className="input py-1 px-2 text-xs border-success/30 focus:border-success focus:ring-success/20 bg-success/5 w-24 text-right" placeholder={t('bonuses')} defaultValue={p.bonuses || ''} onBlur={e => handleUpdate(p.id, 'bonuses', Number(e.target.value) || 0)} />
                       <input type="number" className="input py-1 px-2 text-xs border-error/30 focus:border-error focus:ring-error/20 bg-error/5 w-24 text-right" placeholder={t('deductions')} defaultValue={p.deductions || ''} onBlur={e => handleUpdate(p.id, 'deductions', Number(e.target.value) || 0)} />
                    </div>
                  </td>
                  <td className="table-cell text-right">
                    <div className="bg-success/10 inline-block text-success border border-success/20 px-3 py-1.5 rounded-lg font-bold text-base whitespace-nowrap">
                      €{Number(p.totalNetToPay).toFixed(2)}
                    </div>
                  </td>
                  <td className="table-cell">
                    <CustomSelect className="w-28 text-xs" value={p.status} onChange={val => handleUpdate(p.id, 'status', val)} options={[{
                  value: 'draft',
                  label: 'Draft',
                  color: 'text-text-secondary'
                }, {
                  value: 'paid',
                  label: 'Plătit',
                  color: 'text-success'
                }, {
                  value: 'sent',
                  label: 'Trimis',
                  color: 'text-primary'
                }]} />
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDownloadPdf(p)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded transition-colors" title="Descarcă Fluturaș">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    </div>;
}