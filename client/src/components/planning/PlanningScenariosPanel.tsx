import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, Fuel, Loader2, Route, SlidersHorizontal, Truck, X } from 'lucide-react';
import { fmtNumber } from '../../lib/format';
import {
  evaluateScenario,
  evaluateBaseline,
  fromLocalInputValue,
  scenarioDelta,
  scenarioWindowCheck,
  toLocalInputValue,
} from '../../lib/planningScenarios';

export interface ScenarioApplyPayload {
  departure: string | null;
  truckId: string | null;
}

interface ScenarioRow {
  id: string;
  departure: string;
  truckId: string;
  includeFixedCost: boolean;
}

/**
 * Scenario strip: what happens if this trip leaves at a different hour or is
 * pulled by another truck.
 *
 * Cost and CO₂ come from the truck's own configured profile (cost/km, fixed
 * cost/day, consumption, fuel factor). Distance never changes, because the stops
 * stay exactly where they are — the panel says so instead of printing a fake
 * saving. Applying a departure change goes through the reschedule endpoint,
 * which shifts every stop and reports the customer windows it breaks.
 */
export default function PlanningScenariosPanel({
  open,
  onClose,
  trip,
  resources = [],
  onApply,
  applying = false,
}: {
  open: boolean;
  onClose: () => void;
  trip: any | null;
  resources?: any[];
  onApply: (payload: ScenarioApplyPayload) => void;
  applying?: boolean;
}) {
  const { t } = useTranslation();
  const truckOf = (resource: any) => resource?.truck || resource || null;
  const truckOptions = useMemo(
    () =>
      (resources || [])
        .map((resource) => truckOf(resource))
        .filter((truck: any, index: number, list: any[]) => truck?.id && list.findIndex((candidate: any) => candidate?.id === truck.id) === index),
    [resources],
  );

  const baseline = useMemo(() => {
    if (!trip) return null;
    const departure = trip.plannedDeparture || null;
    const arrival = trip.plannedArrival || null;
    const elapsedMin =
      departure && arrival
        ? Math.max(0, Math.round((new Date(arrival).getTime() - new Date(departure).getTime()) / 60000))
        : null;
    return {
      departure,
      distanceKm: trip.distanceKm ?? null,
      elapsedMin,
      toll: trip.tollCosts ?? null,
      truck: truckOf(trip.truck || trip) || null,
    };
  }, [trip]);

  const [rows, setRows] = useState<ScenarioRow[]>([]);

  useEffect(() => {
    if (!trip) return;
    const start = toLocalInputValue(trip.plannedDeparture);
    const truckId = String(trip.truck?.id || '');
    setRows([
      { id: 'a', departure: start, truckId, includeFixedCost: true },
      { id: 'b', departure: start, truckId, includeFixedCost: true },
    ]);
  }, [trip?.id, trip?.plannedDeparture, trip?.truck?.id]);

  if (!open || !trip || !baseline) return null;

  const baseEvaluation = evaluateBaseline(baseline as any);
  const currency = trip.currency || 'EUR';
  const stops = trip.stops || [];

  const money = (value: number | null) =>
    value === null ? '—' : `${fmtNumber(value, 0)} ${currency}`;
  const signed = (value: number | null, suffix: string, digits = 0) => {
    if (value === null) return '—';
    const sign = value > 0 ? '+' : '';
    return `${sign}${fmtNumber(value, digits)}${suffix}`;
  };

  const evaluationFor = (row: ScenarioRow) => {
    const truck = truckOptions.find((candidate: any) => String(candidate.id) === row.truckId) || baseline.truck;
    const driver =
      row.truckId === String(trip.truck?.id || '')
        ? trip.driver?.name || trip.truck?.driver?.name || null
        : resources.find((resource) => String(truckOf(resource)?.id) === row.truckId)?.driver?.name || null;
    const evaluation = evaluateScenario(baseline as any, {
      label: row.id.toUpperCase(),
      departure: fromLocalInputValue(row.departure),
      truck: truck as any,
      includeFixedCost: row.includeFixedCost,
      driverName: driver,
    });
    const delta = scenarioDelta(baseEvaluation, evaluation);
    const windows = scenarioWindowCheck(stops, delta.departureMin);
    return { evaluation, delta, windows, truck };
  };

  const update = (id: string, patch: Partial<ScenarioRow>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const shiftRow = (row: ScenarioRow, minutes: number) => {
    const current = fromLocalInputValue(row.departure) || baseline.departure;
    if (!current) return;
    const next = new Date(new Date(current).getTime() + minutes * 60000);
    update(row.id, { departure: toLocalInputValue(next) });
  };

  return (
    <section
      className="rounded-xl border border-border bg-card shadow-sm"
      aria-label={t('sc_title', 'Scenarios')}
    >
      <header className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[11px] font-black text-text-primary">
            {t('sc_title', 'Scenarios')}
            <span className="font-semibold text-text-secondary"> · {trip.tripNumber || '—'}</span>
          </h3>
          <p className="truncate text-[9px] text-text-muted">
            {t('sc_hint', 'Compare another departure hour or another truck before you commit.')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          aria-label={t('pv_stop_close', 'Close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="space-y-2 p-2.5">
        {/* Baseline */}
        <div className="rounded-lg border border-border bg-surface/60 px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-text-secondary">
            <span className="rounded border border-border bg-card px-1 text-[8px] font-black uppercase tracking-wide text-text-muted">
              {t('sc_baseline', 'Current plan')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {baseline.departure ? new Date(baseline.departure).toLocaleString() : '—'}
            </span>
            <span className="flex items-center gap-1">
              <Route className="h-3 w-3" />
              {baseline.distanceKm === null ? '—' : `${fmtNumber(baseline.distanceKm, 0)} km`}
            </span>
            <span className="flex items-center gap-1">
              <Truck className="h-3 w-3" />
              {baseline.truck?.plateNumber || '—'}
            </span>
            <span className="font-black text-text-primary">{money(baseEvaluation.totalCost)}</span>
            <span className="text-text-muted">
              {baseEvaluation.co2Kg === null ? '—' : `${fmtNumber(baseEvaluation.co2Kg, 1)} kg CO₂`}
            </span>
          </div>
        </div>

        {rows.map((row) => {
          const { evaluation, delta, windows } = evaluationFor(row);
          const changedDeparture = Boolean(row.departure) && row.departure !== toLocalInputValue(baseline.departure);
          const changedTruck = row.truckId !== String(trip.truck?.id || '');
          const canApply = (changedDeparture || changedTruck) && !applying;
          return (
            <div key={row.id} className="rounded-lg border border-border bg-card p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-black text-primary">
                  {t('sc_scenario', 'Scenario')} {row.id.toUpperCase()}
                </span>
                <input
                  type="datetime-local"
                  value={row.departure}
                  onChange={(event) => update(row.id, { departure: event.target.value })}
                  className="h-6 rounded-md border border-border bg-card px-1.5 text-[10px] font-bold text-text-primary focus:border-primary focus:outline-none"
                  aria-label={t('sc_departure', 'Departure')}
                />
                {[-60, 60, 1440].map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => shiftRow(row, minutes)}
                    className="h-6 rounded-md border border-border px-1.5 text-[9px] font-black text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    {minutes > 0 ? '+' : ''}
                    {minutes === 1440 ? '24h' : `${minutes / 60}h`}
                  </button>
                ))}
                <select
                  value={row.truckId}
                  onChange={(event) => update(row.id, { truckId: event.target.value })}
                  className="h-6 max-w-[130px] rounded-md border border-border bg-card px-1 text-[10px] font-bold text-text-primary focus:border-primary focus:outline-none"
                  aria-label={t('sc_truck', 'Truck')}
                >
                  {truckOptions.map((truck: any) => (
                    <option key={truck.id} value={truck.id}>
                      {truck.plateNumber || truck.id}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-[9px] font-bold text-text-secondary">
                  <input
                    type="checkbox"
                    checked={row.includeFixedCost}
                    onChange={(event) => update(row.id, { includeFixedCost: event.target.checked })}
                    className="h-3 w-3 accent-orange-500"
                  />
                  {t('sc_fixed_cost', 'Fixed cost')}
                </label>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]">
                <span className={`font-black ${delta.cost === null ? 'text-text-muted' : delta.cost > 0 ? 'text-rose-600' : delta.cost < 0 ? 'text-emerald-600' : 'text-text-secondary'}`}>
                  {t('sc_cost', 'Cost')}: {signed(delta.cost, ` ${currency}`)}
                </span>
                <span className="font-bold text-text-secondary">
                  {t('sc_time', 'Time')}: {signed(delta.arrivalMin, ' min')}
                </span>
                <span className="font-bold text-text-secondary">
                  {t('sc_km', 'Distance')}: {signed(delta.distanceKm, ' km')}
                </span>
                <span className="flex items-center gap-1 font-bold text-text-secondary">
                  <Fuel className="h-3 w-3" />
                  {signed(delta.co2Kg === null ? null : delta.co2Kg, ' kg CO₂', 1)}
                </span>
                {windows.checked > 0 && (
                  <span className={`rounded border px-1 text-[8px] font-black ${windows.violations > 0 ? 'border-rose-500/30 bg-rose-500/10 text-rose-600' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600'}`}>
                    {windows.violations > 0
                      ? `${windows.violations}/${windows.checked} ${t('sc_windows_broken', 'windows broken')}`
                      : `${windows.checked} ${t('sc_windows_ok', 'windows still fit')}`}
                  </span>
                )}
                <span className="text-[9px] text-text-muted">
                  {evaluation.arrival ? new Date(evaluation.arrival).toLocaleString() : t('sc_no_eta', 'No ETA without a planned arrival time')}
                </span>
                <button
                  type="button"
                  disabled={!canApply}
                  onClick={() =>
                    onApply({
                      departure: changedDeparture ? fromLocalInputValue(row.departure) : null,
                      truckId: changedTruck ? row.truckId : null,
                    })
                  }
                  className="ml-auto flex h-6 items-center gap-1 rounded-md bg-orange-500 px-2 text-[10px] font-black text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
                >
                  {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRight className="h-3 w-3" />}
                  {t('sc_apply', 'Apply')}
                </button>
              </div>
            </div>
          );
        })}

        <p className="text-[9px] leading-relaxed text-text-muted">
          {t(
            'sc_basis_note',
            'Distance is identical in every scenario: the stops do not move. Cost and CO₂ are estimated from the selected truck’s configured profile.',
          )}
        </p>
      </div>
    </section>
  );
}
