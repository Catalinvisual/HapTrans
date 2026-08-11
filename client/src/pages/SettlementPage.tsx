import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Search, Filter, Trash2, Wallet, Plus } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function SettlementPage() {
  const { t } = useTranslation();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [genDriverId, setGenDriverId] = useState('');
  const [genPayMode, setGenPayMode] = useState('per_km');
  const [genPayRate, setGenPayRate] = useState('');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [res, drv] = await Promise.all([
        api.get(`/settlements?month=${selectedMonth}&year=${selectedYear}`),
        api.get('/drivers'),
      ]);
      setSettlements(res.data);
      setDrivers(drv.data);
    } catch {
      toast.error(t('sett_loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedMonth, selectedYear]);

  const handleGenerate = async () => {
    if (!genDriverId) {
      toast.error(t('sett_selectDriver'));
      return;
    }
    const loadingToast = toast.loading(t('sett_generating'));
    try {
      const res = await api.post('/settlements/generate', {
        driverId: genDriverId,
        month: selectedMonth,
        year: selectedYear,
        payMode: genPayMode,
        payRate: genPayRate ? Number(genPayRate) : undefined,
      });
      if (res.data.tripCount === 0) {
        toast.success(t('sett_generatedEmpty'), { id: loadingToast });
      } else {
        toast.success(t('sett_generated') + ' ' + res.data.tripCount, { id: loadingToast });
      }
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('sett_genError'), { id: loadingToast });
    }
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    try {
      await api.patch(`/settlements/${id}`, { [field]: value });
      toast.success(t('sett_updated'));
      load();
    } catch {
      toast.error(t('sett_updateError'));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/settlements/${deleteId}`);
      toast.success(t('sett_deleted'));
      setDeleteId(null);
      load();
    } catch {
      toast.error(t('sett_deleteError'));
    }
  };

  const filtered = settlements.filter((s: any) => {
    const q = search.toLowerCase();
    return (s.driverName || '').toLowerCase().includes(q);
  });

  const isPerKm = genPayMode === 'per_km';
  const totalNet = settlements.reduce((sum: number, s: any) => sum + Number(s.netPay || 0), 0);

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
          <span className="text-xs font-bold text-success uppercase bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2 rounded-lg shrink-0 border border-emerald-200 dark:border-emerald-700">
            {t('sett_totalNet')}: €{Number(totalNet).toFixed(2)}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 bg-surface/50 border border-border rounded-xl p-1.5 shrink-0">
            <div className="flex items-center gap-1.5 px-2">
              <Filter className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-semibold text-text-secondary">{t("jsx_luna")}</span>
            </div>
            <CustomSelect className="w-28 text-sm font-semibold shadow-sm" value={String(selectedMonth)} onChange={val => setSelectedMonth(Number(val))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
            <CustomSelect className="w-24 text-sm font-semibold shadow-sm" value={String(selectedYear)} onChange={val => setSelectedYear(Number(val))} options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))} />
          </div>
        </div>
      </div>

      <div className="p-4 border-b border-border bg-surface/40 flex flex-col lg:flex-row items-end lg:items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider shrink-0">{t('sett_driver')}</span>
          <CustomSelect className="w-full" value={genDriverId} onChange={setGenDriverId} placeholder={t('sett_selectDriver')} options={drivers.map((d: any) => ({ value: d.id, label: d.user?.name || d.id }))} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{t('sett_payMode')}</span>
          <CustomSelect className="w-32 text-sm font-semibold shadow-sm" value={genPayMode} onChange={setGenPayMode} options={[{ value: 'per_km', label: t('sett_perKm') }, { value: 'percent', label: t('sett_percent') }]} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{isPerKm ? '€/km' : '%'}</span>
          <input type="number" step="0.01" className="input w-24 py-2 text-sm" value={genPayRate} onChange={e => setGenPayRate(e.target.value)} placeholder={isPerKm ? '0.25' : '10'} />
        </div>
        <button onClick={handleGenerate} className="btn-primary py-2 px-4 text-sm font-bold flex items-center gap-2 shrink-0 shadow-md shadow-primary/20">
          <Plus className="w-4 h-4" /> {t('sett_generate')}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface border-b border-border">
              <th className="table-header">{t('employee')}</th>
              <th className="table-header text-center">{t('sett_trips')}</th>
              <th className="table-header text-right">{t('sett_distance')}</th>
              <th className="table-header text-right">{t('sett_revenue')}</th>
              <th className="table-header text-right">{t('sett_gross')}</th>
              <th className="table-header text-right">{t('advances')}</th>
              <th className="table-header text-right">{t('deductions')}</th>
              <th className="table-header text-right">{t('sett_net')}</th>
              <th className="table-header text-center">{t('status')}</th>
              <th className="table-header text-center">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">{t('loading')}</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="text-center py-8 text-text-secondary">{t('sett_noData')}</td></tr> : filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((s: any) => (
              <tr key={s.id} className="border-b border-border hover:bg-surface/60 transition-colors">
                <td className="p-3 font-semibold">{s.driverName}</td>
                <td className="p-3 text-center">{s.tripCount}</td>
                <td className="p-3 text-right">{Number(s.totalDistance).toFixed(0)} km</td>
                <td className="p-3 text-right">€{Number(s.totalRevenue).toFixed(2)}</td>
                <td className="p-3 text-right font-semibold">€{Number(s.grossPay).toFixed(2)}</td>
                <td className="p-3 text-right">
                  <input type="number" step="0.01" className="input w-24 py-1 text-right text-sm" value={Number(s.advances || 0)} onChange={e => handleUpdate(s.id, 'advances', e.target.value ? Number(e.target.value) : 0)} />
                </td>
                <td className="p-3 text-right">
                  <input type="number" step="0.01" className="input w-24 py-1 text-right text-sm" value={Number(s.deductions || 0)} onChange={e => handleUpdate(s.id, 'deductions', e.target.value ? Number(e.target.value) : 0)} />
                </td>
                <td className="p-3 text-right font-bold text-success">€{Number(s.netPay).toFixed(2)}</td>
                <td className="p-3 text-center">
                  <CustomSelect className="w-28 text-sm" value={s.status} onChange={val => handleUpdate(s.id, 'status', val)} options={['draft', 'approved', 'paid'].map(v => ({ value: v, label: t('sett_status' + v) }))} />
                </td>
                <td className="p-3 text-center">
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-text-secondary hover:text-error rounded-lg hover:bg-error/10 transition-colors" title={t('delete')}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > itemsPerPage && (
        <div className="p-4 border-t border-border flex items-center justify-between flex-wrap gap-3">
          <span className="text-xs text-text-secondary">{filtered.length} {t('records')}</span>
          <Pagination totalItems={filtered.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      )}
    </div>

    <ConfirmModal
      isOpen={!!deleteId}
      onClose={() => setDeleteId(null)}
      onConfirm={handleDelete}
      title={t('sett_deleteTitle')}
      message={t('sett_deleteMessage')}
    />
  </div>;
}
