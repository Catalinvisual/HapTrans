import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CheckCircle2, RefreshCw, TriangleAlert } from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { EmissionFiltersState, TripEmissionRecord, TripEmissionRow } from '../../lib/emissionsApi';
import { countryName } from '../../lib/countries';
import DetailDrawer from '../ui/DetailDrawer';
import DataTable, { type Column } from '../ui/DataTable';
import {
  DataQualityLabel, EmissionBadge, Panel, SectionHeading, StateBlock, TextInput,
  formatEmission, formatNumber, formatPercent,
} from './EmissionBits';
import EmissionFilters, { type FilterOptions } from './EmissionFilters';

export default function TripsTab({
  filters, onFiltersChange, options,
}: {
  filters: EmissionFiltersState;
  onFiltersChange: (next: EmissionFiltersState) => void;
  options: FilterOptions;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const [rows, setRows] = useState<TripEmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TripEmissionRecord | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [drawerTab, setDrawerTab] = useState('summary');
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    emissionsApi.tripRows({ ...filters, limit: 300 })
      .then(setRows)
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(load, 150);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const open = async (row: TripEmissionRow) => {
    setDrawerTab('summary');
    setReason('');
    try {
      const record = await emissionsApi.tripRecord(row.tripId);
      setSelected(record);
      if (record) {
        emissionsApi.recordHistory((record as any).id).then(setHistory).catch(() => setHistory([]));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  const recalculate = async () => {
    if (!selected) return;
    if (selected.isFinalized && !reason.trim()) {
      toast.error(t('emissions_trips_force_note'));
      return;
    }
    setBusy(true);
    try {
      await emissionsApi.calculateTrip(selected.tripId, {
        trigger: 'manual',
        force: !!reason.trim(),
        reason: reason.trim() || undefined,
      });
      const fresh = await emissionsApi.tripRecord(selected.tripId);
      setSelected(fresh);
      if (fresh) emissionsApi.recordHistory((fresh as any).id).then(setHistory).catch(() => {});
      toast.success(t('emissions_trips_recalculate'));
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    } finally {
      setBusy(false);
    }
  };

  const finalize = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await emissionsApi.finalizeRecord((selected as any).id, { reason: reason || undefined });
      const fresh = await emissionsApi.tripRecord(selected.tripId);
      setSelected(fresh);
      toast.success(t('emissions_trips_finalize'));
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<TripEmissionRow>[] = [
    {
      key: 'trip', label: t('emissions_trip'), sortable: true,
      render: (row) => (
        <div>
          <div className="font-bold text-text">{row.tripNumber || row.tripId.slice(0, 8)}</div>
          <div className="text-[10px] text-text-secondary">{row.plateNumber || '—'}</div>
        </div>
      ),
    },
    { key: 'date', label: t('emissions_date'), sortable: true, render: (row) => row.executionDate || '—' },
    { key: 'distance', label: t('emissions_distance_km'), align: 'right', render: (row) => formatNumber(row.distanceKm) },
    {
      key: 'energy', label: t('emissions_energy'), align: 'right',
      render: (row) => row.energyQuantity != null ? `${formatNumber(row.energyQuantity, 1)} ${row.fuelType === 'ELECTRIC' ? 'kWh' : 'L'}` : '—',
    },
    { key: 'ttw', label: 'TTW', align: 'right', render: (row) => formatEmission(row.ttwKg) },
    { key: 'wtt', label: 'WTT', align: 'right', render: (row) => formatEmission(row.wttKg) },
    { key: 'wtw', label: 'WTW', align: 'right', render: (row) => <span className="font-bold text-primary">{formatEmission(row.wtwKg)}</span> },
    { key: 'fleet', label: t('fleet', 'Fleet'), render: (row) => row.fleetType?.replace(/_/g, ' ') || '—' },
    { key: 'quality', label: t('emissions_trips_quality'), render: (row) => <DataQualityLabel quality={row.dataQuality} /> },
    { key: 'status', label: t('emissions_status'), render: (row) => <EmissionBadge status={row.lifecycle} /> },
  ];

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_trips_title')} hint={t('emissions_trips_hint')} />
      <EmissionFilters value={filters} onChange={onFiltersChange} options={options} />
      <StateBlock loading={loading} error={error} onRetry={load} empty={!rows.length}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <DataTable
            columns={columns}
            data={rows}
            rowKey={(row) => row.id}
            onRowClick={open}
            dense
            minWidth="1000px"
            emptyState={<div className="py-8 text-center text-sm text-text-secondary">{t('emissions_empty')}</div>}
          />
        </div>
      </StateBlock>

      <DetailDrawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.trip?.tripNumber || selected.tripId.slice(0, 8)} · ${t('emissions_trip')}` : ''}
        subtitle={selected ? `${selected.executionDate || '—'} · ${selected.engineVersion}` : undefined}
        headerRight={selected ? <EmissionBadge status={selected.lifecycle} /> : undefined}
        tabs={selected ? [
          { key: 'summary', label: t('emissions_summary'), content: null },
          { key: 'segments', label: `${t('emissions_segments')} (${selected.segments?.length || 0})`, content: null },
          { key: 'allocations', label: `${t('emissions_allocations')} (${selected.allocations?.length || 0})`, content: null },
          { key: 'history', label: `${t('emissions_trips_history')} (${history.length})`, content: null },
        ] : undefined}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        footer={selected ? (
          <div className="space-y-2">
            <TextInput value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('emissions_trips_reason')} />
            <div className="flex items-center justify-end gap-2">
              <button className="btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={recalculate} disabled={busy}>
                <RefreshCw className="w-4 h-4" />{t('emissions_trips_recalculate')}
              </button>
              {!selected.isFinalized && (
                <button className="btn-primary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={finalize} disabled={busy || selected.ttwKgCo2e === null}>
                  <CheckCircle2 className="w-4 h-4" />{t('emissions_trips_finalize')}
                </button>
              )}
            </div>
            {selected.isFinalized && <div className="text-[10px] text-amber-700 dark:text-amber-300">{t('emissions_trips_locked')}</div>}
          </div>
        ) : null}
      >
        {selected && drawerTab === 'summary' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Kpi label="TTW" value={formatEmission(selected.ttwKgCo2e)} />
              <Kpi label="WTT" value={formatEmission(selected.wttKgCo2e)} />
              <Kpi label="WTW" value={formatEmission(selected.wtwKgCo2e)} strong />
              <Kpi label={t('emissions_distance_km')} value={formatNumber(selected.distanceKm)} />
              <Kpi label={t('emissions_trips_weight')} value={selected.payloadTonnes != null ? `${formatNumber(selected.payloadTonnes, 2)} t` : '—'} />
              <Kpi label="g/t·km" value={selected.gPerTonneKm != null ? formatNumber(selected.gPerTonneKm, 1) : '—'} />
              <Kpi label={t('emissions_energy')} value={selected.energyQuantity != null ? `${formatNumber(selected.energyQuantity, 1)} ${selected.energyUnit || ''}` : '—'} />
              <Kpi label={t('emissions_kpi_empty_km')} value={formatNumber(selected.emptyKm)} />
              <Kpi label={t('emissions_trips_method')} value={selected.methodology?.replace(/_/g, ' ')} />
            </div>

            <Panel dense>
              <div className="text-[11px] space-y-1">
                <Row label={t('emissions_trips_energy_source')} value={selected.energySource?.replace(/_/g, ' ')} />
                <Row label={t('emissions_trips_quality')} value={<DataQualityLabel quality={selected.dataQuality} />} />
                <Row label={t('emissions_reports_engine')} value={selected.engineVersion} />
                <Row label="Hash" value={<span className="font-mono text-[10px]">{selected.inputHash || '—'}</span>} />
                <Row label={t('emissions_trips_run_status')} value={`${selected.calculationCount} ×`} />
              </div>
            </Panel>

            <div className={`rounded-lg border px-3 py-2 text-[11px] inline-flex items-start gap-1.5 ${
              selected.reconciliation?.reconciled
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}>
              {selected.reconciliation?.reconciled ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <TriangleAlert className="w-4 h-4 shrink-0" />}
              <div>
                <div className="font-semibold">
                  {selected.reconciliation?.reconciled ? t('emissions_trips_reconcile_ok') : t('emissions_trips_reconcile_bad')}
                </div>
                <div>
                  {formatNumber(selected.reconciliation?.segmentDistanceKm)} km / {formatNumber(selected.reconciliation?.routeDistanceKm)} km ·
                  {' '}{formatPercent(selected.reconciliation?.differencePercent, 2)} (tolerance {formatNumber(selected.reconciliation?.tolerancePercent, 2)}%)
                </div>
              </div>
            </div>

            {!!selected.qualityFlags?.length && (
              <div className="flex flex-wrap gap-1">
                {selected.qualityFlags.map((flag) => (
                  <span key={flag} className="px-1.5 py-0.5 rounded border border-border bg-surface text-[9px] font-semibold text-text-secondary">{flag}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {selected && drawerTab === 'segments' && (
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-text-secondary border-b border-border">
                  <th className="text-left py-1.5">{t('emissions_country')}</th>
                  <th className="text-right py-1.5">km</th>
                  <th className="text-right py-1.5">loaded</th>
                  <th className="text-right py-1.5">empty</th>
                  <th className="text-right py-1.5">TTW</th>
                  <th className="text-right py-1.5">WTT</th>
                  <th className="text-right py-1.5">WTW</th>
                  <th className="text-left py-1.5">{t('emissions_trips_method')}</th>
                </tr>
              </thead>
              <tbody>
                {selected.segments?.map((segment) => (
                  <tr key={segment.id} className="border-b border-border/50">
                    <td className="py-1.5 font-semibold">{countryName(segment.countryCode, lang as any) || segment.countryCode}</td>
                    <td className="py-1.5 text-right">{formatNumber(segment.distanceKm)}</td>
                    <td className="py-1.5 text-right">{formatNumber(segment.loadedKm)}</td>
                    <td className="py-1.5 text-right">{formatNumber(segment.emptyKm)}</td>
                    <td className="py-1.5 text-right">{formatEmission(segment.ttwKgCo2e)}</td>
                    <td className="py-1.5 text-right">{formatEmission(segment.wttKgCo2e)}</td>
                    <td className="py-1.5 text-right font-bold text-primary">{formatEmission(segment.wtwKgCo2e)}</td>
                    <td className="py-1.5 text-[10px] text-text-secondary">{segment.method?.replace(/_/g, ' ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selected && drawerTab === 'allocations' && (
          selected.allocations?.length ? (
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="text-left py-1.5">{t('emissions_customer')}</th>
                    <th className="text-right py-1.5">{t('emissions_trips_share')}</th>
                    <th className="text-right py-1.5">km</th>
                    <th className="text-right py-1.5">t·km</th>
                    <th className="text-right py-1.5">TTW</th>
                    <th className="text-right py-1.5">WTW</th>
                    <th className="text-left py-1.5">{t('emissions_trips_basis')}</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.allocations.map((allocation) => (
                    <tr key={allocation.id} className="border-b border-border/50">
                      <td className="py-1.5 font-semibold">{allocation.clientName || '—'}</td>
                      <td className="py-1.5 text-right">{formatPercent(allocation.sharePercent, 2)}</td>
                      <td className="py-1.5 text-right">{formatNumber(allocation.distanceKm)}</td>
                      <td className="py-1.5 text-right">{formatNumber((allocation as any).tonneKm, 0)}</td>
                      <td className="py-1.5 text-right">{formatEmission(allocation.ttwKgCo2e)}</td>
                      <td className="py-1.5 text-right font-bold text-primary">{formatEmission(allocation.wtwKgCo2e)}</td>
                      <td className="py-1.5 text-[10px] text-text-secondary">{allocation.basis?.replace(/_/g, ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[10px] text-text-secondary mt-2">
                Σ WTW = {formatEmission(selected.allocations.reduce((a, x) => a + (x.wtwKgCo2e || 0), 0))} /
                {' '}{formatEmission(selected.wtwKgCo2e)} · Σ share = {formatPercent(selected.allocations.reduce((a, x) => a + (x.sharePercent || 0), 0), 2)}
              </div>
            </div>
          ) : <div className="py-6 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>
        )}

        {selected && drawerTab === 'history' && (
          history.length ? (
            <ul className="divide-y divide-border">
              {history.map((run) => (
                <li key={run.id} className="py-2 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-text">{new Date(run.createdAt).toLocaleString()}</span>
                    <EmissionBadge status={run.status} />
                  </div>
                  <div className="text-text-secondary mt-0.5">
                    {run.trigger} · {run.engineVersion} · {run.inputHash || '—'}
                    {run.reason ? ` · ${run.reason}` : ''}
                  </div>
                  {run.resultSnapshot && (
                    <div className="text-text-secondary">
                      TTW {formatEmission(run.resultSnapshot.ttwKgCo2e)} · WTW {formatEmission(run.resultSnapshot.wtwKgCo2e)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : <div className="py-6 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>
        )}
      </DetailDrawer>
    </div>
  );
}

function Kpi({ label, value, strong }: { label: string; value: any; strong?: boolean }) {
  return (
    <div className="bg-surface rounded-lg px-2.5 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={`${strong ? 'text-base text-primary' : 'text-sm text-text'} font-black`}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-1">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text text-right">{value}</span>
    </div>
  );
}
