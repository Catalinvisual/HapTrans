import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, FileSpreadsheet, FileText, History, Bookmark, CalendarClock, Download, Play, Trash2,
  LoaderCircle, Plus, FolderOpen, Eye, Pause, CheckCircle2, AlertTriangle, Save
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { fmtNumber, fmtPercent } from '../lib/format';
import AnalyticsToolbar, { computeRange } from '../components/analytics/AnalyticsToolbar';
import type { Granularity } from '../components/analytics/AnalyticsToolbar';
import KpiSummary from '../components/analytics/KpiSummary';
import ReportTable from '../components/analytics/ReportTable';
import ReportChartCard from '../components/analytics/ReportChartCard';
import type { ReportColumn } from '../components/analytics/ReportTable';
import EmptyState from '../components/analytics/EmptyState';
import { getCompanySettings } from '../store/settingsStore';

const SECTION_LABELS: Record<string, string> = {
  operations: 'rp_section_operations',
  service: 'rp_section_service',
  financial: 'rp_section_financial',
  methodology: 'rp_section_methodology',
};

function mapColumns(cols: any[]): ReportColumn[] {
  return (cols || []).map(c => ({
    key: c.key,
    label: c.header || c.label,
    align: 'center',
    type: (['currency', 'percent', 'number', 'date'].includes(c.type) ? c.type : 'text') as any,
  }));
}

function fmtDate(d: any): string {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString();
}

type Tab = 'reports' | 'history' | 'saved' | 'scheduled';

export default function ReportsPage() {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<Tab>('reports');
  const [catalog, setCatalog] = useState<any[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const [scheduled, setScheduled] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const now = new Date();
  const [rangeType, setRangeType] = useState('last_30_days');
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [customFrom, setCustomFrom] = useState(now.toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState(now.toISOString().slice(0, 10));

  const [clients, setClients] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [clientId, setClientId] = useState('all');
  const [truckId, setTruckId] = useState('all');
  const [driverId, setDriverId] = useState('all');
  const [modal, setModal] = useState<null | { kind: 'save' | 'schedule'; name: string }>(null);

  const currentFilters = () => {
    const r = computeRange(rangeType, customFrom, customTo);
    const f: any = { from: r.from, to: r.to, granularity };
    if (clientId && clientId !== 'all') f.clientId = clientId;
    if (truckId && truckId !== 'all') f.truckId = truckId;
    if (driverId && driverId !== 'all') f.driverId = driverId;
    return f;
  };

  const filtersFor = (filters: any) => {
    const r = computeRange(rangeType, customFrom, customTo);
    const f: any = { from: r.from, to: r.to, granularity, ...(filters || {}) };
    if (clientId && clientId !== 'all' && !f.clientId) f.clientId = clientId;
    if (truckId && truckId !== 'all' && !f.truckId) f.truckId = truckId;
    if (driverId && driverId !== 'all' && !f.driverId) f.driverId = driverId;
    return f;
  };

  const loadCatalog = () => {
    api.get('/reports/catalog', { params: { locale: i18n.language } }).then(r => setCatalog(r.data || [])).finally(() => setCatLoading(false));
  };

  const loadHistory = () => {
    api.get('/reports/history').then(r => setHistory(r.data || [])).catch(() => {});
  };

  const loadSaved = () => {
    api.get('/reports/saved').then(r => setSaved(r.data || [])).catch(() => {});
  };

  const loadScheduled = () => {
    api.get('/reports/scheduled').then(r => setScheduled(r.data || [])).catch(() => {});
  };

  useEffect(() => {
    loadCatalog();
    loadHistory();
    loadSaved();
    loadScheduled();
    api.get('/analytics/customers').then(r => setClients((r.data?.customers || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
    api.get('/analytics/fleet').then(r => setTrucks((r.data?.trucks || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
    api.get('/analytics/drivers').then(r => setDrivers((r.data?.drivers || []).map((c: any) => ({ id: c.id, name: c.name })))).catch(() => {});
  }, [i18n.language]);

  useEffect(() => {
    if (activeKey) runPreview(activeKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const prevActiveRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeKey && prevActiveRef.current === activeKey) {
      const t = setTimeout(() => runPreview(activeKey), 250);
      return () => clearTimeout(t);
    }
    prevActiveRef.current = activeKey;
  }, [clientId, truckId, driverId, activeKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps

  const runPreview = (reportKey: string) => {
    setActiveKey(reportKey);
    setPayload(null);
    setPreviewing(true);
    api.post('/reports/preview', { reportKey, filters: currentFilters(), locale: i18n.language })
      .then(r => setPayload(r.data))
      .catch(() => toast.error(t('an_preview_error')))
      .finally(() => setPreviewing(false));
  };

  const doExport = async (reportKey: string, filters: any, format: 'xlsx' | 'pdf', name?: string) => {
    setExporting(reportKey + '-' + format);
    try {
      const storedLogo = getCompanySettings().logo;
      const logo = storedLogo && typeof storedLogo === 'string' && storedLogo.startsWith('data:image/')
        ? storedLogo
        : (storedLogo && typeof storedLogo === 'string' && /^(https?:)?\/\//.test(storedLogo) ? storedLogo : undefined);
      const r = await api.post('/reports/export', { reportKey, filters, format, name, logo, locale: i18n.language });
      const res = r.data as any;
      if (res?.downloadUrl) {
        const blobRes = await api.get(res.downloadUrl.replace(/^\/api/, ''), { responseType: 'blob' });
        const url = window.URL.createObjectURL(blobRes.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName || `report.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(t('an_export_done'));
      }
      loadHistory();
      loadScheduled();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('an_export_error'));
    } finally {
      setExporting(null);
    }
  };

  const saveCurrent = async () => {
    if (!activeKey) return;
    setModal({ kind: 'save', name: '' });
  };

  const confirmSave = async () => {
    if (!activeKey || !modal) return;
    const nm = modal.name.trim();
    if (!nm) return;
    try {
      await api.post('/reports/saved', { name: nm, reportKey: activeKey, filters: currentFilters(), format: 'xlsx', locale: i18n.language });
      toast.success(t('an_saved_ok'));
      setModal(null);
      loadSaved();
    } catch { toast.error(t('an_save_error')); }
  };

  const runSaved = (s: any) => doExport(s.reportKey, filtersFor(s.filters || {}), s.format === 'pdf' ? 'pdf' : 'xlsx', s.name);
  const deleteSaved = async (id: string) => {
    try { await api.delete(`/reports/saved/${id}`); loadSaved(); } catch { toast.error(t('an_delete_error')); }
  };

  const createSchedule = async () => {
    if (!activeKey) return;
    setModal({ kind: 'schedule', name: '' });
  };

  const confirmSchedule = async () => {
    if (!activeKey || !modal) return;
    const nm = modal.name.trim();
    if (!nm) return;
    try {
      await api.post('/reports/scheduled', { name: nm, reportKey: activeKey, filters: currentFilters(), format: 'xlsx', frequency: 'weekly', locale: i18n.language });
      toast.success(t('an_schedule_created'));
      setModal(null);
      loadScheduled();
    } catch (e: any) { toast.error(e?.response?.data?.message || t('an_save_error')); }
  };

  const toggleSchedule = async (s: any) => {
    try {
      await api.put(`/reports/scheduled/${s.id}`, { active: !s.active });
      loadScheduled();
    } catch { toast.error(t('an_update_error')); }
  };

  const deleteSchedule = async (id: string) => {
    try { await api.delete(`/reports/scheduled/${id}`); loadScheduled(); } catch { toast.error(t('an_delete_error')); }
  };

  const runSchedule = async (s: any) => {
    setExporting(s.id);
    try {
      const r = await api.post(`/reports/scheduled/${s.id}/run`);
      const res = r.data as any;
      if (res?.downloadUrl) {
        const blobRes = await api.get(res.downloadUrl.replace(/^\/api/, ''), { responseType: 'blob' });
        const url = window.URL.createObjectURL(blobRes.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = res.fileName || 'report.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success(t('an_export_done'));
      }
      loadHistory();
      loadScheduled();
    } catch { toast.error(t('an_export_error')); }
    finally { setExporting(null); }
  };

  const grouped = (SECTION_LABELS ? Object.keys(SECTION_LABELS) : []).map(section => ({
    section,
    items: catalog.filter((c: any) => (c.section || 'operations') === section),
  })).filter(g => g.items.length > 0);

  const TABS: { key: Tab; label: string; icon: any; count?: number }[] = [
    { key: 'reports', label: t('rp_tab_reports'), icon: LayoutDashboard },
    { key: 'history', label: t('rp_tab_history'), icon: History, count: history.length },
    { key: 'saved', label: t('rp_tab_saved'), icon: Bookmark, count: saved.length },
    { key: 'scheduled', label: t('rp_tab_scheduled'), icon: CalendarClock, count: scheduled.length },
  ];

  return (
    <div className="space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-blue-600">
            {t('nav_reports')}
          </h1>
          <p className="text-sm font-medium text-text-secondary mt-1">{t('rp_subtitle')}</p>
        </div>
        <AnalyticsToolbar
          rangeType={rangeType} onRangeType={setRangeType}
          customFrom={customFrom} customTo={customTo}
          onCustomFrom={setCustomFrom} onCustomTo={setCustomTo}
          granularity={granularity} onGranularity={setGranularity}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 card !p-3">
        <span className="text-xs font-black uppercase tracking-wider text-text-secondary">{t('rp_filter_title')}</span>
        <select value={clientId} onChange={e => setClientId(e.target.value)} title={t('rp_filter_client')} className="input !py-2 text-sm bg-surface/60">
          <option value="all">{t('rp_filter_client')}</option>
          {clients.slice(0, 300).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={truckId} onChange={e => setTruckId(e.target.value)} title={t('rp_filter_truck')} className="input !py-2 text-sm bg-surface/60">
          <option value="all">{t('rp_filter_truck')}</option>
          {trucks.slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={driverId} onChange={e => setDriverId(e.target.value)} title={t('rp_filter_driver')} className="input !py-2 text-sm bg-surface/60">
          <option value="all">{t('rp_filter_driver')}</option>
          {drivers.slice(0, 200).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="flex gap-2 bg-surface/60 p-1 rounded-2xl border border-border/60 w-fit">
        {TABS.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-4 py-2 text-sm font-bold rounded-xl flex items-center gap-2 transition-all ${tab === tb.key ? 'bg-white text-primary shadow-sm' : 'text-text-secondary hover:text-text'}`}
          >
            <tb.icon className="w-4 h-4" />
            {tb.label}
            {tb.count !== undefined && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary">{tb.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {catLoading ? (
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
                        onClick={() => runPreview(c.key)}
                        className={`w-full text-left card !p-3.5 group transition-all ${activeKey === c.key ? 'border-primary/60 ring-2 ring-primary/20' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-text group-hover:text-primary transition-colors flex items-center gap-2">
                            <FileSpreadsheet className="w-4 h-4 text-primary" /> {c.name}
                          </span>
                          <Eye className="w-4 h-4 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">{c.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-3">
            {!activeKey ? (
              <div className="card !p-10 h-full flex items-center justify-center">
                <EmptyState icon={FolderOpen} title={t('rp_select_report')} message={t('rp_select_report_msg')} />
              </div>
            ) : previewing ? (
              <div className="card flex items-center justify-center p-16">
                <LoaderCircle className="w-10 h-10 text-primary animate-spin" />
              </div>
            ) : payload ? (
              <div className="space-y-4">
                <div className="card !p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-text">{payload.reportName}</h2>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {fmtDate(payload.period?.from)} → {fmtDate(payload.period?.to)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => doExport(payload.reportKey, currentFilters(), 'xlsx')} disabled={!!exporting} className="btn-primary !px-3 !py-2 text-xs">
                        {exporting === payload.reportKey + '-xlsx' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1.5" />}
                        {t('rp_export_xlsx')}
                      </button>
                      <button onClick={() => doExport(payload.reportKey, currentFilters(), 'pdf')} disabled={!!exporting} className="btn-secondary !px-3 !py-2 text-xs">
                        {exporting === payload.reportKey + '-pdf' ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 mr-1.5" />}
                        {t('rp_export_pdf')}
                      </button>
                      <button onClick={saveCurrent} title={t('rp_save_config')} className="btn-secondary !px-3 !py-2 text-xs">
                        <Save className="w-4 h-4" />
                      </button>
                      <button onClick={createSchedule} title={t('rp_schedule')} className="btn-secondary !px-3 !py-2 text-xs">
                        <CalendarClock className="w-4 h-4" />
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

                {(payload.charts || []).map((ch: any) => (
                  <ReportChartCard key={ch.key} chart={ch} />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center text-text-secondary">{t('an_loading')}</div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card !p-0 overflow-hidden">
          <div className="p-4 border-b border-border/50 bg-surface/30"></div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead className="text-[10px] uppercase font-bold text-text-secondary bg-surface/60">
                <tr>
                  <th className="px-4 py-3">{t('rp_report')}</th>
                  <th className="px-4 py-3">{t('rp_format')}</th>
                  <th className="px-4 py-3">{t('rp_status')}</th>
                  <th className="px-4 py-3">{t('rp_generated')}</th>
                  <th className="px-4 py-3 text-right">{t('rp_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {history.map((h: any) => (
                  <tr key={h.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-text text-sm">{h.reportName}</p>
                      <p className="text-[11px] text-text-secondary">{h.reportKey}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-surface-hover text-text-secondary uppercase">{h.format}</span>
                    </td>
                    <td className="px-4 py-3">
                      {h.status === 'generated' ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-success/10 text-success"><CheckCircle2 className="w-3 h-3" /> OK</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-error/10 text-error" title={h.error || ''}><AlertTriangle className="w-3 h-3" /> {h.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{fmtDate(h.generatedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {h.status === 'generated' && h.filePath && (
                        <button onClick={() => doExport(h.reportKey, h.filters || {}, h.format, h.reportName)} className="btn-secondary !px-3 !py-1.5 text-xs" disabled={!!exporting}>
                          {exporting === h.reportKey + '-' + h.format ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {history.length === 0 && <EmptyState icon={History} title={t('rp_no_history')} message={t('rp_no_history_msg')} />}
          </div>
        </div>
      )}

      {tab === 'saved' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-secondary">{t('rp_saved_count', { count: saved.length })}</p>
          </div>
          {saved.length === 0 ? (
            <div className="card"><EmptyState icon={Bookmark} title={t('rp_no_saved')} message={t('rp_no_saved_msg')} /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {saved.map((s: any) => (
                <div key={s.id} className="card !p-4 hover:shadow-card-hover transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-primary" />
                      <div>
                        <p className="font-bold text-text text-sm">{s.name}</p>
                        <p className="text-[11px] text-text-secondary">{s.reportKey}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteSaved(s.id)} className="text-text-secondary hover:text-error transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button onClick={() => runSaved(s)} disabled={!!exporting} className="btn-primary flex-1 !py-2 text-xs">
                      {exporting === s.reportKey + '-' + (s.format || 'xlsx') ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} {t('rp_run')}
                    </button>
                    <span className="text-[10px] font-bold uppercase text-text-secondary self-center px-2 py-1 rounded bg-surface-hover">{s.format || 'xlsx'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'scheduled' && (
        <div className="space-y-6">
          {scheduled.length === 0 ? (
            <div className="card"><EmptyState icon={CalendarClock} title={t('rp_no_scheduled')} message={t('rp_no_scheduled_msg')} /></div>
          ) : (
            <div className="card !p-0 overflow-hidden">
              <table className="w-full text-left">
                <thead className="text-[10px] uppercase font-bold text-text-secondary bg-surface/60">
                  <tr>
                    <th className="px-4 py-3">{t('rp_report')}</th>
                    <th className="px-4 py-3">{t('rp_freq')}</th>
                    <th className="px-4 py-3">{t('rp_format')}</th>
                    <th className="px-4 py-3">{t('rp_next_run')}</th>
                    <th className="px-4 py-3 text-right">{t('rp_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {scheduled.map((s: any) => (
                    <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-text text-sm">{s.name}</p>
                        <p className="text-[11px] text-text-secondary">{s.reportKey}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-surface-hover text-text-secondary capitalize">{s.frequency}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-text-secondary uppercase">{s.format}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{fmtDate(s.nextRunAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => toggleSchedule(s)} title={s.active ? t('rp_pause') : t('rp_resume')} className="btn-secondary !p-2">
                            {s.active ? <Pause className="w-4 h-4 text-warning" /> : <Play className="w-4 h-4 text-success" />}
                          </button>
                          <button onClick={() => runSchedule(s)} title={t('rp_run_now')} className="btn-primary !p-2" disabled={!!exporting}>
                            {exporting === s.id ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          </button>
                          <button onClick={() => deleteSchedule(s.id)} title={t('rp_delete')} className="btn-secondary !p-2 text-text-secondary hover:text-error">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full max-w-md card !p-6 animate-fade-in shadow-2xl">
            <h3 className="text-lg font-black text-text mb-1">
              {modal.kind === 'save' ? t('rp_save_dialog') : t('rp_schedule_dialog')}
            </h3>
            <p className="text-xs text-text-secondary mb-4">
              {modal.kind === 'save' ? t('rp_save_dialog_sub') : t('rp_schedule_dialog_sub')}
            </p>
            <input
              autoFocus
              value={modal.name}
              onChange={e => setModal({ ...modal, name: e.target.value })}
              onKeyDown={e => { if (e.key === 'Enter') modal.kind === 'save' ? confirmSave() : confirmSchedule(); }}
              placeholder={modal.kind === 'save' ? t('rp_save_name') : t('rp_schedule_name')}
              className="input w-full mb-5"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-secondary !px-4 !py-2 text-xs">{t('cancel')}</button>
              <button
                onClick={() => modal.kind === 'save' ? confirmSave() : confirmSchedule()}
                disabled={!modal.name.trim()}
                className="btn-primary !px-4 !py-2 text-xs"
              >
                {modal.kind === 'save' ? t('save') : t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}