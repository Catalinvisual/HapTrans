import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Archive, CheckCircle2, Download, FileSpreadsheet, FileText, Lock, Play } from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { EmissionFiltersState, EmissionReportRecord } from '../../lib/emissionsApi';
import { generateEmissionReportPdf } from '../../lib/emissionsPdf';
import { useAuthStore } from '../../store/authStore';
import CustomSelect from '../CustomSelect';
import { EmissionBadge, Field, Panel, SectionHeading, StateBlock, TextInput, formatEmission, formatNumber } from './EmissionBits';
import EmissionFilters, { type FilterOptions, presetRange } from './EmissionFilters';

const KINDS = [
  'company', 'daily', 'monthly', 'annual', 'country', 'fleet', 'truck', 'driver_efficiency',
  'customer', 'trip', 'fuel_consumption', 'empty_running', 'wtw', 'data_quality', 'compliance', 'subcontractor',
];

export default function ReportsTab({
  filters, onFiltersChange, options,
}: {
  filters: EmissionFiltersState;
  onFiltersChange: (next: EmissionFiltersState) => void;
  options: FilterOptions;
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const defaultRange = presetRange('this_month');
  const [kind, setKind] = useState('company');
  const [from, setFrom] = useState(defaultRange.from || '');
  const [to, setTo] = useState(defaultRange.to || '');
  const [reports, setReports] = useState<EmissionReportRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [viewing, setViewing] = useState<EmissionReportRecord | null>(null);

  const loadReports = () => {
    setLoading(true);
    emissionsApi.reports()
      .then(setReports)
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(loadReports, []);

  const generate = async () => {
    if (!from || !to) {
      toast.error(t('emissions_reports_period'));
      return;
    }
    setGenerating(true);
    try {
      const report = await emissionsApi.generateReport({ kind, from, to, filters });
      setViewing(report);
      toast.success(t('emissions_reports_generated'));
      loadReports();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_reports_error'));
    } finally {
      setGenerating(false);
    }
  };

  const finalize = async (report: EmissionReportRecord) => {
    try {
      const updated = await emissionsApi.finalizeReport(report.id);
      setViewing((prev) => prev && prev.id === report.id ? updated : prev);
      loadReports();
      toast.success(t('emissions_reports_finalize'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const download = async (report: EmissionReportRecord, format: 'csv' | 'xlsx' | 'pdf') => {
    try {
      if (format === 'pdf') {
        const doc = await generateEmissionReportPdf(report, (user as any)?.company?.name || '');
        doc.save(`${report.reportNumber}.pdf`);
        return;
      }
      const blob = await emissionsApi.downloadReport(report.id, format);
      downloadBlob(blob, `${report.reportNumber}.${format}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const snapshotSections = useMemo(() => (viewing?.snapshot?.sections || []) as any[], [viewing]);

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_reports_title')} hint={t('emissions_reports_hint')} />

      <Panel title={t('emissions_reports_generate')} icon={Play}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
          <Field label={t('emissions_reports_kind')}>
            <CustomSelect
              value={kind}
              onChange={setKind}
              options={KINDS.map((k) => ({ value: k, label: t(`emissions_kind_${k === 'driver_efficiency' ? 'driver' : k === 'fuel_consumption' ? 'fuel' : k === 'empty_running' ? 'empty' : k === 'data_quality' ? 'quality' : k}`, k) }))}
            />
          </Field>
          <Field label={t('emissions_from')}>
            <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('emissions_to')}>
            <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <button className="btn-primary py-2 px-3 text-sm inline-flex items-center justify-center gap-1.5" onClick={generate} disabled={generating}>
            <Play className="w-4 h-4" />{generating ? '…' : t('emissions_reports_generate')}
          </button>
        </div>
        <div className="mt-2">
          <EmissionFilters value={filters} onChange={onFiltersChange} options={options} showDates={false} compact />
        </div>
      </Panel>

      <StateBlock loading={loading} error={error} onRetry={loadReports} empty={!reports.length}>
        <Panel title={t('emissions_reports_list')} icon={Archive} dense>
          <ul className="divide-y divide-border">
            {reports.map((report) => (
              <li key={report.id} className="py-2 flex flex-wrap items-center gap-2">
                <button className="text-left min-w-0 flex-1" onClick={() => setViewing(report)}>
                  <div className="text-xs font-bold text-text truncate">{report.title}</div>
                  <div className="text-[10px] text-text-secondary">
                    {report.reportNumber} · {report.periodStart} → {report.periodEnd} · {formatEmission(report.totalWtwKgCo2e)}
                  </div>
                </button>
                <EmissionBadge status={report.status} />
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-text-secondary hover:text-primary" title={t('emissions_reports_pdf')} onClick={() => download(report, 'pdf')}>
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-primary" title={t('emissions_reports_csv')} onClick={() => download(report, 'csv')}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-text-secondary hover:text-primary" title={t('emissions_reports_xlsx')} onClick={() => download(report, 'xlsx')}>
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                  {report.status !== 'finalized' && (
                    <button className="p-1.5 text-text-secondary hover:text-emerald-600" title={t('emissions_reports_finalize')} onClick={() => finalize(report)}>
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="text-[10px] text-text-secondary mt-2">{t('emissions_reports_snapshot_note')}</div>
        </Panel>
      </StateBlock>

      {viewing && (
        <Panel
          title={viewing.title}
          subtitle={`${viewing.reportNumber} · ${viewing.periodStart} → ${viewing.periodEnd} · ${t('emissions_reports_engine')} ${viewing.engineVersion}`}
          icon={FileText}
          actions={
            <div className="flex items-center gap-1.5">
              <button className="btn-secondary py-1.5 px-2.5 text-xs inline-flex items-center gap-1" onClick={() => download(viewing, 'pdf')}>
                <FileText className="w-3.5 h-3.5" />PDF
              </button>
              <button className="btn-secondary py-1.5 px-2.5 text-xs inline-flex items-center gap-1" onClick={() => download(viewing, 'csv')}>
                <Download className="w-3.5 h-3.5" />CSV
              </button>
              <button className="btn-secondary py-1.5 px-2.5 text-xs inline-flex items-center gap-1" onClick={() => download(viewing, 'xlsx')}>
                <FileSpreadsheet className="w-3.5 h-3.5" />XLSX
              </button>
              {viewing.status !== 'finalized' && (
                <button className="btn-primary py-1.5 px-2.5 text-xs inline-flex items-center gap-1" onClick={() => finalize(viewing)}>
                  <CheckCircle2 className="w-3.5 h-3.5" />{t('emissions_reports_finalize')}
                </button>
              )}
            </div>
          }
        >
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-secondary">
            <EmissionBadge status={viewing.status} />
            <span>{t('emissions_reports_total')}: <b className="text-text">{formatEmission(viewing.totalWtwKgCo2e)}</b></span>
            <span>{t('emissions_reports_checksum')}: <span className="font-mono">{viewing.checksum || '—'}</span></span>
          </div>
          <div className="mt-2 space-y-3">
            {snapshotSections.map((section: any) => (
              <div key={section.key}>
                <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">{section.title}</div>
                <div className="overflow-auto border border-border rounded-lg">
                  <table className="w-full text-[11px]">
                    <thead className="bg-surface">
                      <tr>
                        {section.columns.map((column: any) => (
                          <th key={column.key} className={`px-2 py-1.5 text-[9px] uppercase tracking-wider text-text-secondary ${column.type === 'number' ? 'text-right' : 'text-left'}`}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.slice(0, 150).map((row: any, index: number) => (
                        <tr key={index} className="border-t border-border/60">
                          {section.columns.map((column: any) => (
                            <td key={column.key} className={`px-2 py-1 ${column.type === 'number' ? 'text-right' : 'text-left'}`}>
                              {row[column.key] === null || row[column.key] === undefined
                                ? '—'
                                : column.type === 'number' && typeof row[column.key] === 'number'
                                  ? formatNumber(row[column.key])
                                  : String(row[column.key])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
