import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Trash2, Zap, Coins, Route, HandCoins, Wallet, User, FileText } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import CustomSelect from '../components/CustomSelect';
import { matchesSearch } from '../lib/search';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import KpiStrip from '../components/ui/KpiStrip';
import DataTable from '../components/ui/DataTable';
import { fmtMoney, fmtNumber, fmtKm } from '../lib/format';

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

  const filtered = settlements.filter((s: any) => matchesSearch(search, s.driverName));

  const isPerKm = genPayMode === 'per_km';

  const totalDecontat = settlements.reduce((sum: number, s: any) => sum + Number(s.grossPay || 0), 0);
  const totalKm = settlements.reduce((sum: number, s: any) => sum + Number(s.totalDistance || 0), 0);
  const totalAvansuri = settlements.reduce((sum: number, s: any) => sum + Number(s.advances || 0), 0);
  const totalNetToPay = settlements.reduce((sum: number, s: any) => sum + Number(s.netPay || 0), 0);

  const statusOptions = [
    { value: 'draft', label: t('sett_statusdraft'), color: '#94A3B8' },
    { value: 'approved', label: t('sett_statusapproved'), color: '#F59E0B' },
    { value: 'paid', label: t('sett_statuspaid'), color: '#10B981' },
  ];

  const paged = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const empty = settlements.length === 0;

  return <div className="space-y-5 animate-fade-in">
    <KpiStrip items={[
      { key: 'total', label: t('sett_totalNet', 'Total decontat'), value: fmtMoney(totalDecontat), icon: Coins },
      { key: 'km', label: 'Km totali', value: fmtKm(totalKm), icon: Route },
      { key: 'avansuri', label: 'Avansuri acordate', value: fmtMoney(totalAvansuri), icon: HandCoins },
      { key: 'net', label: 'Net de plată', value: fmtMoney(totalNetToPay), icon: Wallet, color: 'text-success' },
    ]} dense />

    <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
      <div className="relative flex-1 min-w-[170px] max-w-[210px] shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <input className="input !pl-8 !py-1.5 !text-xs h-8 w-full" placeholder={t('searchEmployee')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-lg px-1.5 py-1 shrink-0">
        <span className="text-[10px] font-bold uppercase text-text-secondary px-1">{t("jsx_luna")}</span>
        <CustomSelect size="sm" className="w-24" value={String(selectedMonth)} onChange={val => setSelectedMonth(Number(val))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        <CustomSelect size="sm" className="w-20" value={String(selectedYear)} onChange={val => setSelectedYear(Number(val))} options={[2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }))} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <User className="w-3.5 h-3.5 text-text-secondary" />
        <CustomSelect size="sm" className="w-44" value={genDriverId} onChange={setGenDriverId} placeholder={t('sett_selectDriver')} options={drivers.map((d: any) => ({ value: d.id, label: d.user?.name || d.id }))} />
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <CustomSelect size="sm" className="w-32" value={genPayMode} onChange={setGenPayMode} options={[{ value: 'per_km', label: t('sett_perKm') }, { value: 'percent', label: t('sett_percent') }]} />
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-black text-text-secondary">{isPerKm ? '€/km' : '%'}</span>
          <input type="number" step="0.01" className="input !w-16 !py-1 !px-1.5 !text-xs h-8 text-right" value={genPayRate} onChange={e => setGenPayRate(e.target.value)} placeholder={isPerKm ? '0.25' : '10'} />
        </div>
      </div>

      <div className="flex-1" />

      <button onClick={handleGenerate} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/20">
        <Zap className="w-4 h-4" /> {t('sett_generate')}
      </button>
    </div>

    <div className="card !p-0 overflow-hidden">
      <DataTable
        dense
        minWidth="1080px"
        loading={loading}
        rowKey={(s: any) => s.id}
        data={paged}
        emptyState={empty ? (
          <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-[15px] font-black text-text mb-1.5">{t('sett_noData')}</h3>
            <p className="text-xs text-text-secondary leading-relaxed mb-5">{MONTHS[selectedMonth - 1]} {selectedYear}</p>
            <button onClick={handleGenerate} className="btn-primary !px-4 !py-2 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-primary/20">
              <Zap className="w-4 h-4" /> {t('sett_generate')}
            </button>
          </div>
        ) : (
          <div className="p-12 text-center text-sm text-text-secondary">{t('noResults')}</div>
        )}
        columns={[
          { key: 'anagajat', label: 'ANGAJAT & TARIFA', align: 'left', render: (s: any) => (
            <div>
              <p className="font-bold text-[13px] text-text truncate">{s.driverName}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Mod: {s.payMode === 'percent' ? t('sett_percent') : t('sett_perKm')} ({fmtNumber(s.payRate, 2)}{s.payMode === 'percent' ? ' %' : ' €/km'})</p>
            </div>
          ) },
          { key: 'activitate', label: 'ACTIVITATE', align: 'right', render: (s: any) => (
            <div>
              <p className="font-semibold text-[12.5px] text-text">{fmtKm(s.totalDistance)}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{s.tripCount} {t('sett_trips')}</p>
            </div>
          ) },
          { key: 'venit', label: 'VENIT & BRUT', align: 'right', render: (s: any) => (
            <div>
              <p className="font-semibold text-[12.5px] text-text">{fmtMoney(s.grossPay)} Brut</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{t('sett_revenue', 'Venit cursă: ')}{fmtMoney(s.totalRevenue)}</p>
            </div>
          ) },
          { key: 'avansuri', label: 'AVANSURI & REȚINERI', align: 'right', render: (s: any) => (
            <div className="inline-flex flex-col items-end gap-0.5">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[9px] font-bold uppercase text-rose-500" title="Avansuri">Avans</span>
                <input type="number" step="0.01" className="input !w-[86px] !py-0.5 !px-1.5 !text-xs text-right" value={Number(s.advances || 0)} onChange={e => handleUpdate(s.id, 'advances', e.target.value ? Number(e.target.value) : 0)} />
              </div>
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-[9px] font-bold uppercase text-text-secondary">Rețineri</span>
                <input type="number" step="0.01" className="input !w-[86px] !py-0.5 !px-1.5 !text-xs text-right" value={Number(s.deductions || 0)} onChange={e => handleUpdate(s.id, 'deductions', e.target.value ? Number(e.target.value) : 0)} />
              </div>
            </div>
          ) },
          { key: 'net', label: 'NET DE PLATĂ', align: 'right', render: (s: any) => (
            <span className="inline-block font-black text-[14px] text-success whitespace-nowrap">{fmtMoney(s.netPay)}</span>
          ) },
          { key: 'actions', label: 'STATUS & ACȚIUNI', align: 'right', sticky: 'right', width: '150px', render: (s: any) => (
            <div className="flex items-center justify-end gap-1">
              <CustomSelect size="sm" className="w-24" value={s.status} onChange={val => handleUpdate(s.id, 'status', val)} options={statusOptions} />
              <button onClick={() => setDeleteId(s.id)} className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors" title={t('delete')}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) },
        ]}
      />
      <Pagination currentPage={currentPage} totalItems={filtered.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
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