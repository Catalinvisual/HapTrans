import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FileSpreadsheet, FileText, X, LoaderCircle, FolderOpen, Download, LayoutDashboard, ChartBarIncreasing
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import AnalyticsToolbar, { computeRange } from './AnalyticsToolbar';
import type { Granularity } from './AnalyticsToolbar';
import KpiSummary from './KpiSummary';
import ReportTable from './ReportTable';
import type { ReportColumn } from './ReportTable';
import EmptyState from './EmptyState';

const SECTION_LABELS: Record<string, string> = {
  operations: 'rp_section_operations',
  service: 'rp_section_service',
  financial: 'rp_section_financial',
  methodology: 'rp_section_methodology',
};

const REPORT_NAMES: Record<string, Record<string, string>> = {
  ro: {
    executive_overview: 'Situație generală (Executiv)',
    financial_position: 'Poziție financiară (P&L)',
    customer_profitability: 'Profit pe clienți',
    route_profitability: 'Profit pe rute',
    fleet_performance: 'Performanța camioanelor',
    driver_performance: 'Performanța șoferilor',
    carrier_costs: 'Costuri transportatori',
    receivables_aging: 'Creanțe după vechime',
    payables: 'Datorii către furnizori',
    exceptions: 'Registru excepții',
    cashflow: 'Proiecție flux de numerar',
    kpi_methodology: 'Metodologie KPI',
  },
  nl: {
    executive_overview: 'Operationeel overzicht',
    financial_position: 'Financiële positie (P&L)',
    customer_profitability: 'Winst per klant',
    route_profitability: 'Winst per route',
    fleet_performance: 'Vlootprestaties',
    driver_performance: 'Prestaties chauffeurs',
    carrier_costs: 'Carrierkosten',
    receivables_aging: 'Openstaande facturen per ouderdom',
    payables: 'Crediteuren',
    exceptions: 'Register uitzonderingen',
    cashflow: 'Kasstroomprognose',
    kpi_methodology: 'KPI-methodologie',
  },
};

function mapColumns(cols: any[]): ReportColumn[] {
  return (cols || []).map(c => ({
    key: c.key,
    label: c.header || c.label,
    align: c.type === 'currency' || c.type === 'number' || c.type === 'percent' ? 'right' : 'left',
    type: (['currency', 'percent', 'number', 'date'].includes(c.type) ? c.type : 'text') as any,
  }));
}

function fmtDate(d: any): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
}

interface ReportsPanelProps {
  open: boolean;
  onClose: () => void;
  section?: string;
}

export default function ReportsPanel({ open, onClose, section }: ReportsPanelProps) {
  const { t, i18n } = useTranslation();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const [rangeType, setRangeType] = useState('last_30_days');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const now = useMemo(() => new Date(), []);
  const [customFrom, setCustomFrom] = useState(now.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  const [clients, setClients] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [clientId, setClientId] = useState('all');
  const [truckId, setTruckId] = useState('all');
  const [driverId, setDriverId] = useState('all');

  const buildFilters = useCallback(() => {
    const r = computeRange(rangeType, customFrom, customTo);
    const f: any = { from: r.from, to: r.to, granularity };
    if (clientId && clientId !== 'all') f.clientId = clientId;
    if (truckId && truckId !== 'all') f.truckId = truckId;
    if (driverId && driverId !== 'all') f.driverId = driverId;
    return f;
  }, [rangeType, customFrom, customTo, granularity, clientId, truckId, driverId]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setPayload(null);
    setActiveKey(null);
    api.get('/reports/catalog').then(r => setCatalog(r.data || [])).catch(() => toast.error(t('an_preview_error'))).finally(() => setLoading(false));
    api.get('/analytics/customers').then(r => setClients((r.data?.customers || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
    api.get('/analytics/fleet').then(r => setTrucks((r.data?.trucks || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
    api.get('/analytics/drivers').then(r => setDrivers((r.data?.drivers || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [open, t]);

  if (!open) return null;

  const lang = i18n.language?.startsWith('ro') ? 'ro' : i18n.language?.startsWith('nl') ? 'nl' : 'en';
  const reportName = (c: any) => {
    const localized = REPORT_NAMES[lang]?.[c.key];
    return localized || c.name;
  };

  const grouped = Object.keys(SECTION_LABELS)
    .map(s => ({ section: s, items: catalog.filter((c: any) => (c.section || 'operations') === s && (!section || c.section === section)) }))
    .filter(g => g.items.length > 0);

  const preview = (key: string) => {
    setActiveKey(key);
    setPayload(null);
    setPreviewing(true);
    api.post('/reports/preview', { reportKey: key, filters: buildFilters() })
      .then(r => setPayload(r.data))
      .catch(() => toast.error(t('an_preview_error')))
      .finally(() => setPreviewing(false));
  };

  const doExport = async (format: 'xlsx' | 'pdf') => {
    if (!activeKey) return;
    const tag = `${activeKey}-${format}`;
    setExporting(tag);
    try {
      const active = catalog.find(c => c.key === activeKey);
      const r = await api.post('/reports/export', { reportKey: activeKey, filters: buildFilters(), format, name: reportName(active || { name: activeKey }) });
      const res = r.data as any;
      if (res?.downloadUrl) {
        const blobRes = await api.get(res.downloadUrl, { responseType: 'blob' });
        const url = window.URL.createObjectURL(blobRes.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName || `report.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(t('an_export_done'));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('an_export_error'));
    } finally {
      setExporting(null);
    }
  };

  const selectCls = 'w-full text-sm font-semibold bg-surface/60 border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-primary/40 text-text';
  const optCls = 'bg-surface text-text';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-6">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-6xl h-[92vh] max-h-[940px] bg-surface rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col animate-fade-in">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border/60 bg-surface/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ChartBarIncreasing className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-text leading-tight truncate">{t('rp_quick_title')}</h2>
              <p className="text-xs text-text-secondary truncate">{t('rp_quick_sub')}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-secondary !p-2 shrink-0" aria-label="close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex flex-col lg:flex-row gap-3 items-end">
            <AnalyticsToolbar
              rangeType={rangeType} onRangeType={setRangeType}
              customFrom={customFrom} customTo={customTo}
              onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
              granularity={granularity} onGranularity={setGranularity}
            />
            <div className="flex gap-3 w-full lg:w-auto pb-5 lg:pb-0">
              <select className={selectCls} value={clientId} onChange={e => setClientId(e.target.value)} title={t('rp_filter_client')}>
                <option className={optCls} value="all">{t('rp_filter_client')}</option>
                {clients.slice(0, 200).map(c => <option className={optCls} key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className={selectCls} value={truckId} onChange={e => setTruckId(e.target.value)} title={t('rp_filter_truck')}>
                <option className={optCls} value="all">{t('rp_filter_truck')}</option>
                {trucks.slice(0, 100).map(c => <option className={optCls} key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select className={selectCls} value={driverId} onChange={e => setDriverId(e.target.value)} title={t('rp_filter_driver')}>
                <option className={optCls} value="all">{t('rp_filter_driver')}</option>
                {drivers.slice(0, 100).map(c => <option className={optCls} key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-5 gap-5 p-6 overflow-hidden">
          <div className="lg:col-span-2 overflow-y-auto custom-scrollbar pr-2 space-y-5">
            {loading ? (
              <div className="flex items-center justify-center p-10"><LoaderCircle className="w-8 h-8 text-primary animate-spin" /></div>
            ) : catalog.length === 0 ? (
              <EmptyState icon={FileText} title={t('rp_no_reports')} message={t('rp_no_reports_msg')} />
            ) : (
              grouped.map(g => (
                <div key={g.section}>
                  <h3 className="text-xs font-black uppercase tracking-wider text-text-secondary mb-2 px-1">{t(SECTION_LABELS[g.section] || 'operations')}</h3>
                  <div className="space-y-2">
                    {g.items.map((c: any) => (
                      <button
                        key={c.key}
                        onClick={() => preview(c.key)}
                        className={`w-full text-left card !p-3.5 group transition-all ${activeKey === c.key ? 'border-primary/60 ring-2 ring-primary/20' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-text group-hover:text-primary transition-colors flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" /> {reportName(c)}
                          </span>
                          {activeKey === c.key && <LayoutDashboard className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{c.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-3 overflow-y-auto custom-scrollbar">
            {previewing ? (
              <div className="card flex items-center justify-center p-16 h-full">
                <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
              </div>
            ) : payload ? (
              <div className="space-y-4">
                <div className="card !p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-black text-text truncate">{payload.reportName || reportName(catalog.find(c => c.key === activeKey) || { name: activeKey })}</h3>
                      <p className="text-xs text-text-secondary mt-0.5">{fmtDate(payload.period?.from)} → {fmtDate(payload.period?.to)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => doExport('xlsx')} disabled={!!exporting} className="btn-primary !px-3 !py-2 text-xs">
                        {exporting === `${activeKey}-xlsx` ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-1.5" />}
                        {t('rp_export_xlsx')}
                      </button>
                      <button onClick={() => doExport('pdf')} disabled={!!exporting} className="btn-secondary !px-3 !py-2 text-xs">
                        {exporting === `${activeKey}-pdf` ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
                        {t('rp_export_pdf')}
                      </button>
                    </div>
                  </div>
                </div>

                {payload.kpis?.length > 0 && (
                  <div className="card !p-5"><KpiSummary kpis={payload.kpis.map((k: any) => ({ ...k, trend: k.trend ?? null }))} /></div>
                )}

                {(payload.tables || []).map((tb: any) => (
                  <div key={tb.name} className="card !p-5">
                    <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-primary" /> {tb.name}
                    </h3>
                    <ReportTable columns={mapColumns(tb.columns)} rows={(tb.rows || []).slice(0, 60)} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="card !p-10 h-full flex items-center justify-center">
                <EmptyState icon={FolderOpen} title={t('rp_no_selection')} message={t('rp_quick_hint')} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}