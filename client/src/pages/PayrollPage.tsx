import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, FileText, Calculator, Wallet, Banknote, Coins, Landmark, Users } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

import CustomSelect from '../components/CustomSelect';
import { generatePayrollPdfBase64 } from '../lib/payrollPdfGenerator';
import { matchesSearch } from '../lib/search';
import Pagination from '../components/Pagination';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
import { fmtMoney, fmtNumber } from '../lib/format';

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

  const totalNet = payrolls.reduce((s: number, p: any) => s + Number(p.totalNetToPay || 0), 0);
  const totalBrut = payrolls.reduce((s: number, p: any) => s + Number(p.grossSalary || 0), 0);
  const totalDiurne = payrolls.reduce((s: number, p: any) => s + Number(p.totalAllowance || 0), 0);
  const totalTaxe = payrolls.reduce((s: number, p: any) => s + Number(p.taxAmount || 0), 0);

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: '#94A3B8' },
    { value: 'paid', label: 'Plătit', color: '#10B981' },
    { value: 'sent', label: 'Trimis', color: '#6366F1' },
  ];

  const paged = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return <div className="space-y-5 animate-fade-in">
      <KpiStrip items={[
        { key: 'net', label: t('payroll_totalNet'), value: fmtMoney(totalNet), icon: Wallet, color: 'text-success' },
        { key: 'brut', label: t('payroll_gross'), value: fmtMoney(totalBrut), icon: Banknote },
        { key: 'diurne', label: 'Total Diurne', value: fmtMoney(totalDiurne), icon: Coins },
        { key: 'taxe', label: t('payroll_tax'), value: fmtMoney(totalTaxe), icon: Landmark },
        { key: 'angajati', label: 'Angajați', value: fmtNumber(payrolls.length), icon: Users },
      ]} dense />

      <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-[240px] shrink-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input className="input !pl-8 !py-1.5 !text-xs h-8 w-full" placeholder={t('searchEmployee')} value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-lg px-1.5 py-1 shrink-0">
          <span className="text-[10px] font-bold uppercase text-text-secondary px-1">{t("jsx_luna")}</span>
          <CustomSelect size="sm" className="w-24" value={String(selectedMonth)} onChange={val => setSelectedMonth(Number(val))} options={MONTHS.map((m, i) => ({
            value: String(i + 1),
            label: m
          }))} />
          <CustomSelect size="sm" className="w-20" value={String(selectedYear)} onChange={val => setSelectedYear(Number(val))} options={[2024, 2025, 2026, 2027].map(y => ({
            value: String(y),
            label: String(y)
          }))} />
        </div>

        <span className="hidden xl:inline-flex text-[10px] font-bold text-text-secondary uppercase bg-surface px-2 py-1.5 rounded-lg border border-border/50 shrink-0">
          {filtered.length} {t('records')}
        </span>

        <div className="flex-1" />

        <button onClick={handleGenerate} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/20">
          <Calculator className="w-4 h-4" /> {t('generatePayroll')}
        </button>
      </div>

      <div className="card !p-0 overflow-hidden">
        <DataTable
          dense
          minWidth="1040px"
          loading={loading}
          rowKey={(p: any) => p.id}
          data={paged}
          emptyState={payrolls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
                <Calculator className="w-7 h-7" />
              </div>
              <h3 className="text-[15px] font-black text-text mb-1.5">{t('noPayrollData')}</h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-5">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
              <button onClick={handleGenerate} className="btn-primary !px-4 !py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20">
                <Calculator className="w-4 h-4" /> {t('generatePayroll')}
              </button>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-text-secondary">{t('noResults')}</div>
          )}
          columns={[
            { key: 'employee', label: t('employee'), align: 'left', render: (p: any) => (
              <div>
                <p className="font-bold text-[13px] text-text truncate">{p.user?.name || '-'}</p>
                <p className="text-[10px] font-normal text-text-secondary mt-0.5">{t('payroll_holiday')}: {fmtMoney(p.holidayAllowance)}</p>
              </div>
            ) },
            { key: 'gross', label: 'SALARIU BAZĂ', align: 'right', render: (p: any) => (
              <div>
                <p className="font-semibold text-[12.5px] text-text">{fmtMoney(p.grossSalary)}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">Taxe: <span className="text-error">-{fmtMoney(p.taxAmount)}</span> • Net bază: <span className="text-success">{fmtMoney(p.netSalary)}</span></p>
              </div>
            ) },
            { key: 'days', label: 'ZILE & DIURNĂ', align: 'right', render: (p: any) => (
              <div>
                <p className="font-semibold text-[12.5px] text-text">{p.daysWorked} {t('days')} <span className="text-[10px] text-text-secondary">@ {fmtMoney(p.dailyAllowance)}/{t('day')}</span></p>
                <p className="text-[10px] font-semibold text-primary mt-0.5">Diurnă: {fmtMoney(p.totalAllowance)}</p>
              </div>
            ) },
            { key: 'adjust', label: 'AJUSTĂRI', align: 'right', render: (p: any) => (
              <div className="flex items-center justify-end gap-1.5">
                <input type="number" className="input !w-[70px] !py-1 !px-2 !text-xs text-right border-success/30 focus:border-success focus:ring-success/20 bg-success/5" placeholder="+bonus" defaultValue={p.bonuses || ''} title={t('bonuses')} onBlur={e => handleUpdate(p.id, 'bonuses', Number(e.target.value) || 0)} />
                <input type="number" className="input !w-[70px] !py-1 !px-2 !text-xs text-right border-error/30 focus:border-error focus:ring-error/20 bg-error/5" placeholder="-reținere" defaultValue={p.deductions || ''} title={t('deductions')} onBlur={e => handleUpdate(p.id, 'deductions', Number(e.target.value) || 0)} />
              </div>
            ) },
            { key: 'totalNet', label: 'TOTAL NET DE PLATĂ', align: 'right', render: (p: any) => (
              <span className="inline-block font-black text-[14px] text-success whitespace-nowrap">{fmtMoney(p.totalNetToPay)}</span>
            ) },
            { key: 'actions', label: t('status') + ' & ' + t('actions'), align: 'right', sticky: 'right', width: '150px', render: (p: any) => (
              <div className="flex items-center justify-end gap-1">
                <CustomSelect size="sm" className="w-24" value={p.status} onChange={val => handleUpdate(p.id, 'status', val)} options={statusOptions} />
                <button onClick={() => handleDownloadPdf(p)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-md transition-colors" title="Descarcă Fluturaș">
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            ) },
          ]}
        />
        <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    </div>;
}