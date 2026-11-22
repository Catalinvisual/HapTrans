import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Database, Plug, Save, Upload } from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import CustomSelect from '../CustomSelect';
import { EmissionBadge, Field, Panel, SectionHeading, StateBlock, TextInput, formatNumber } from './EmissionBits';

const METHODOLOGIES = ['iso14083_wtw', 'iso14083_ttw', 'ghg_protocol', 'distance_based', 'fuel_based'];
const DATASETS = ['DEFRA_2026', 'DEFRA_2025'];
const UNITS = ['kg', 't', 'g'];
const APPROACHES = ['operational_control', 'financial_control', 'equity_share'];
const EMPTY_ALLOC = ['trip_distance', 'loaded_distance', 'tonne_km'];

export default function SettingsTab() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<any>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [fuel, setFuel] = useState<any>(null);
  const [fuelRows, setFuelRows] = useState<any[]>([]);
  const [csv, setCsv] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([emissionsApi.settings(), emissionsApi.integrations(), emissionsApi.fuelSummary(), emissionsApi.fuel({ limit: 50 })])
      .then(([s, i, f, rows]) => {
        setSettings(s);
        setIntegrations(i);
        setFuel(f);
        setFuelRows(Array.isArray(rows) ? rows : rows?.rows || []);
      })
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const update = (field: string, value: any) => setSettings((prev: any) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        defaultMethodology: settings.defaultMethodology,
        defaultDataset: settings.defaultDataset,
        reportingUnit: settings.reportingUnit,
        consolidationApproach: settings.consolidationApproach,
        includeSubcontractors: settings.includeSubcontractors,
        autoCalculateTrips: settings.autoCalculateTrips,
        defaultConsumptionPer100Km: settings.defaultConsumptionPer100Km === '' ? null : Number(settings.defaultConsumptionPer100Km),
        emptyRunAllocation: settings.emptyRunAllocation,
        dataQualityRules: settings.dataQualityRules,
        reportSchedule: settings.reportSchedule,
      };
      const saved = await emissionsApi.saveSettings(payload);
      setSettings({ ...saved, historyPolicy: settings.historyPolicy });
      toast.success(t('emissions_save'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    } finally {
      setSaving(false);
    }
  };

  const parseCsv = () => {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) {
      toast.error(t('emissions_settings_import_help'));
      return;
    }
    const headers = lines[0].split(/[,;]/).map((h) => h.trim());
    const parsed = lines.slice(1).map((line) => {
      const cells = line.split(/[,;]/);
      const row: any = {};
      headers.forEach((header, index) => {
        const raw = (cells[index] || '').trim();
        row[header] = raw === '' ? null : raw;
      });
      if (row.quantity) row.quantity = Number(row.quantity);
      return row;
    }).filter((row) => row.occurredAt && Number.isFinite(row.quantity));
    if (!parsed.length) {
      toast.error(t('emissions_settings_import_help'));
      return;
    }
    setImporting(true);
    emissionsApi.importFuel(parsed)
      .then((result) => {
        setImportResult(result);
        setCsv('');
        toast.success(`${t('emissions_settings_imported')}: ${result.imported ?? 0}`);
        load();
      })
      .catch((err) => toast.error(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setImporting(false));
  };

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_settings_title')} hint={t('emissions_settings_hint')} />

      <StateBlock loading={loading} error={error} onRetry={load}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <Panel title={t('emissions_settings_calculation')} icon={Database}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label={t('emissions_settings_methodology')}>
                <CustomSelect
                  value={settings?.defaultMethodology || 'iso14083_wtw'}
                  onChange={(v) => update('defaultMethodology', v)}
                  options={METHODOLOGIES.map((m) => ({ value: m, label: m.replace(/_/g, ' ') }))}
                />
              </Field>
              <Field label={t('emissions_settings_dataset')}>
                <CustomSelect
                  value={settings?.defaultDataset || 'DEFRA_2026'}
                  onChange={(v) => update('defaultDataset', v)}
                  options={DATASETS.map((d) => ({ value: d, label: d }))}
                />
              </Field>
              <Field label={t('emissions_settings_unit')}>
                <CustomSelect
                  value={settings?.reportingUnit || 'kg'}
                  onChange={(v) => update('reportingUnit', v)}
                  options={UNITS.map((u) => ({ value: u, label: u }))}
                />
              </Field>
              <Field label={t('emissions_settings_boundary')}>
                <CustomSelect
                  value={settings?.consolidationApproach || 'operational_control'}
                  onChange={(v) => update('consolidationApproach', v)}
                  options={APPROACHES.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
                />
              </Field>
              <Field label={t('emissions_settings_empty_allocation')}>
                <CustomSelect
                  value={settings?.emptyRunAllocation || 'trip_distance'}
                  onChange={(v) => update('emptyRunAllocation', v)}
                  options={EMPTY_ALLOC.map((a) => ({ value: a, label: a.replace(/_/g, ' ') }))}
                />
              </Field>
              <Field label={t('emissions_settings_default_consumption')} hint={t('emissions_calc_actual_qty_note')}>
                <TextInput
                  type="number"
                  step="0.1"
                  value={settings?.defaultConsumptionPer100Km ?? ''}
                  onChange={(e) => update('defaultConsumptionPer100Km', e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-3 space-y-1.5">
              <label className="flex items-center gap-2 text-xs text-text">
                <input type="checkbox" checked={!!settings?.includeSubcontractors} onChange={(e) => update('includeSubcontractors', e.target.checked)} />
                {t('emissions_settings_include_subcontractors')}
              </label>
              <label className="flex items-center gap-2 text-xs text-text">
                <input type="checkbox" checked={!!settings?.autoCalculateTrips} onChange={(e) => update('autoCalculateTrips', e.target.checked)} />
                {t('emissions_settings_auto')}
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-[10px] text-text-secondary">{t('emissions_settings_history_note')}</span>
              <button className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5" onClick={save} disabled={saving}>
                <Save className="w-3.5 h-3.5" />{saving ? '…' : t('emissions_save')}
              </button>
            </div>
          </Panel>

          <Panel title={t('emissions_settings_integrations')} icon={Plug}>
            <ul className="divide-y divide-border">
              {(integrations?.providers || []).map((provider: any) => (
                <li key={provider.key} className="py-2 flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold text-text">{provider.label}</div>
                    <div className="text-[10px] text-text-secondary">{provider.kind.replace(/_/g, ' ')}</div>
                  </div>
                  <EmissionBadge
                    status={provider.configured ? 'verified' : 'unverified'}
                    label={provider.configured ? t('emissions_settings_configured') : t('emissions_settings_not_configured')}
                  />
                </li>
              ))}
            </ul>
            <div className="text-[10px] text-text-secondary mt-2">{integrations?.note || t('emissions_settings_integration_note')}</div>
          </Panel>
        </div>

        <Panel
          title={t('emissions_settings_fuel_import')}
          subtitle={t('emissions_settings_fuel_import_hint')}
          icon={Upload}
          className="mt-3"
          actions={
            <span className="text-[10px] text-text-secondary">
              {t('emissions_settings_fuel_totals')}: {formatNumber(fuel?.totals?.count)} · {formatNumber(fuel?.totals?.quantity, 1)} L
            </span>
          }
        >
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={4}
            placeholder="occurredAt;plateNumber;fuelType;quantity;unit;amount;currency;invoiceNumber;countryCode"
            className="w-full px-2.5 py-2 bg-card border border-border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-text-secondary">{t('emissions_settings_import_help')}</span>
            <button className="btn-primary py-1.5 px-3 text-xs inline-flex items-center gap-1.5" onClick={parseCsv} disabled={importing}>
              <Upload className="w-3.5 h-3.5" />{importing ? '…' : t('emissions_settings_import')}
            </button>
          </div>

          {importResult && (
            <div className="mt-2 rounded-lg border border-border bg-surface px-3 py-2 text-[11px]">
              <div className="font-semibold text-text">
                {t('emissions_settings_imported')}: {importResult.imported} ·
                {' '}{t('emissions_settings_duplicates')}: {importResult.duplicates} ·
                {' '}{t('emissions_settings_unmatched')}: {importResult.unmatched} ·
                {' '}{t('emissions_settings_anomalies')}: {importResult.anomalies}
              </div>
              {importResult.errors?.length > 0 && (
                <ul className="mt-1 text-rose-600 space-y-0.5">
                  {importResult.errors.slice(0, 5).map((line: string, index: number) => <li key={index}>{line}</li>)}
                </ul>
              )}
            </div>
          )}

          {fuelRows.length > 0 && (
            <div className="mt-3 overflow-auto border border-border rounded-lg">
              <table className="w-full text-[11px]">
                <thead className="bg-surface">
                  <tr className="text-[9px] uppercase tracking-wider text-text-secondary">
                    <th className="text-left px-2 py-1.5">{t('emissions_date')}</th>
                    <th className="text-left px-2 py-1.5">{t('emissions_truck')}</th>
                    <th className="text-left px-2 py-1.5">{t('emissions_settings_invoice')}</th>
                    <th className="text-right px-2 py-1.5">{t('emissions_energy')}</th>
                    <th className="text-left px-2 py-1.5">{t('emissions_status')}</th>
                    <th className="text-left px-2 py-1.5">{t('emissions_settings_anomalies')}</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelRows.map((row: any) => (
                    <tr key={row.id} className="border-t border-border/60">
                      <td className="px-2 py-1">{(row.occurredAt || '').slice(0, 10)}</td>
                      <td className="px-2 py-1">{row.plateNumber || row.truck?.plateNumber || '—'}</td>
                      <td className="px-2 py-1">{row.invoiceNumber || '—'}</td>
                      <td className="px-2 py-1 text-right">{formatNumber(row.quantity, 1)} {row.unit || 'L'}</td>
                      <td className="px-2 py-1"><EmissionBadge status={row.status} /></td>
                      <td className="px-2 py-1 text-[10px] text-text-secondary">
                        {(row.anomalyFlags || []).join(', ') || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </StateBlock>
    </div>
  );
}
