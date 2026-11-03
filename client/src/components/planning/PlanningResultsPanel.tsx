import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { boardSelector } from '../lib/planningStore';
import { fmtMoney, fmtNumber } from '../lib/format';
import { useConfirm } from '../components/SaveConfirmProvider';
import { exportExcel } from '../lib/exportExcel';
import { statusBadgeClass as statusBadgeFromLib } from '../lib/statusColors';

const fmtMetric = (value: number | null) => (value !== null ? `${Math.round(value / 60)} min` : '—');

interface TripResult {
  tripId: string;
  tripNumber: string | null;
  truckPlate: string | null;
  driverName: string | null;
  distanceKm: number;
  durationMin: number;
  tollCost: number | null;
  fuelCost: number | null;
  driverCost: number | null;
  totalCost: number | null;
  revenue: number | null;
  profit: number | null;
  utilizationPct: number | null;
  status: string;
}

export default function PlanningResultsPanel() {
  const { t } = useTranslation();
  const { boardData, selectedTripId, grouping, truckFilter, driverFilter, priorityFilter, searchFilter } = boardSelector();
  const [viewMode, setViewMode] = useState<'results' | 'route' | 'costs' | 'driver' | 'conflicts' | 'emissions'>('results');
  const [comparisonTrips, setComparisonTrips] = useState<TripResult[]>([]);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const trips: any[] = boardData?.trips || [];
  const orders: any[] = boardData?.orders || [];
  const resources: any[] = boardData?.resources || [];

  // Helper: find trip by id
  const tripById = useMemo(() => new Map(trips.map(t => [t.id, t])), [trips]);

  // If a single trip is selected, show its details; otherwise aggregate.
  const selectedTrip = useMemo(() => tripById.get(selectedTripId) || null, [selectedTripId, trips]);

  // ---- compute per-trip results ----
  const tripResults = useMemo(() => {
    if (selectedTrip) {
      const distanceKm = Number(selectedTrip.distanceKm || 0);
      const plannedDeparture = selectedTrip.plannedDeparture;
      const plannedArrival = selectedTrip.plannedArrival;
      const durationMin = plannedDeparture && plannedArrival
        ? Math.ceil(new Date(plannedArrival).getTime() - new Date(plannedDeparture).getTime() ) / (1000 * 60)
        : 0;
      const tollCost = Number(selectedTrip.tollCost || 0);
      // revenue from orders
      let revenue = 0;
      if (selectedTrip.orders && selectedTrip.orders.length > 0) {
        for (const od of selectedTrip.orders) {
          revenue += Number((od as any).price || 0);
        }
      }
      const profit = Math.round((revenue - (selectedTrip.estimatedCost || 0)) * 100) / 100;
      // utilization: approximate using peak pallets / maxPallets from truck
      const truck = selectedTrip.truck || {};
      const maxPallets = Number(truck.maxPallets || 33);
      const peakPallets = Number(selectedTrip.optimizationMetadata?.peakPallets || 0);
      const util = maxPallets > 0 ? Math.round((peakPallets / maxPallets) * 100) : null;
      return [{
        tripId: selectedTrip.id,
        tripNumber: selectedTrip.tripNumber,
        truckPlate: truck.plateNumber,
        driverName: selectedTrip.driver?.user?.name || selectedTrip.driver?.name || '—',
        distanceKm,
        durationMin: Number(durationMin) || 0,
        tollCost: tollCost || null,
        fuelCost: null, // would need cost engine; mark unavailable
        driverCost: null,
        totalCost: null,
        revenue: revenue || null,
        profit: profit || null,
        utilizationPct: util,
        status: selectedTrip.status || 'planning',
      }];
    }
    // aggregate for trips in range
    const aggregated: TripResult[] = [];
    const unassigned = (boardData?.conflicts || []).filter((c: any) => c.level === 'blocking').map((c: any) => c.tripId).filter(Boolean);
    const tripSet = new Set(trips.map(t => t.id));
    for (const tr of trips) {
      const dKm = Number(tr.distanceKm || 0);
      const toll = Number(tr.tollCost || 0);
      let rev = 0;
      if (tr.orders && tr.orders.length > 0) {
        for (const od of tr.orders) rev += Number((od as any).price || 0);
      }
      const prof = Math.round((rev - (tr.estimatedCost || 0)) * 100) / 100;
      const truck = tr.truck || {};
      const mp = Number(truck.maxPallets || 33);
      const pp = Number(tr.optimizationMetadata?.peakPallets || 0);
      const util = mp > 0 ? Math.round((pp / mp) * 100) : null;
      aggregated.push({
        tripId: tr.id,
        tripNumber: tr.tripNumber,
        truckPlate: truck.plateNumber,
        driverName: tr.driver?.user?.name || tr.driver?.name || '—',
        distanceKm: dKm,
        durationMin: Number(durationMinFromTrip(tr)) || 0,
        tollCost: toll || null,
        fuelCost: null,
        driverCost: null,
        totalCost: null,
        revenue: rev || null,
        profit: prof || null,
        utilizationPct: util,
        status: tr.status || 'planning',
      });
    }
    return aggregated;
  }, [trips, selectedTripId, boardData?.conflicts, durationMinFromTrip]);

  const durationMinFromTrip = (tr: any) => {
    const pd = tr.plannedDeparture; const pa = tr.plannedArrival;
    if (pd && pa) return Math.ceil(new Date(pa).getTime() - new Date(pd).getTime()) / (1000 * 60);
    return null;
  };

  // ---- export ----
  const handleExport = useCallback((format: 'excel' | 'pdf') => {
    const rows = viewMode === 'results' ? tripResults.map(r => ({
      'Trip': r.tripNumber,
      'Truck': r.truckPlate,
      'Driver': r.driverName,
      'Distance (km)': r.distanceKm,
      'Duration (min)': r.durationMin,
      'Toll (€)': r.tollCost,
      'Fuel (€)': r.fuelCost,
      'Driver (€)': r.driverCost,
      'Total (€)': r.totalCost,
      'Revenue (€)': r.revenue,
      'Profit (€)': r.profit,
      'Utilization %': r.utilizationPct,
      'Status': r.status,
    })) : [];
    const filename = format === 'excel' ? 'planning-results' : 'planning-results';
    const sheetName = 'Results';
    exportExcel({ filename, sheetName, title: t('planning_results', 'Planning Calculation Results'), headers: [
      { key: 'Trip', label: t('trip', 'Trip') },
      { key: 'Truck', label: t('truck', 'Truck') },
      { key: 'Driver', label: t('driver', 'Driver') },
      { key: 'Distance (km)', label: t('distance', 'Distance (km)') },
      { key: 'Duration (min)', label: t('duration', 'Duration (min)') },
      { key: 'Toll (€)', label: t('toll', 'Toll (€)') },
      { key: 'Fuel (€)', label: t('fuel_cost', 'Fuel (€)') },
      { key: 'Driver (€)', label: t('driver_cost', 'Driver (€)') },
      { key: 'Total (€)', label: t('total_cost', 'Total (€)') },
      { key: 'Revenue (€)', label: t('revenue', 'Revenue (€)') },
      { key: 'Profit (€)', label: t('profit', 'Profit (€)') },
      { key: 'Utilization %', label: t('utilization', 'Utilization %') },
      { key: 'Status', label: t('status', 'Status') },
    ], rows });
    setExportFormat('excel');
    // trigger download via link
    const blob = new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename + '.xlsx';
    document.body.appendChild(a);
    a.click();
    setExportFormat('excel');
  }, [viewMode, tripResults, t]);

  // ---- tab switching ----
  const switchTab = (newView: typeof viewMode) => setViewMode(newView);

  return (
    <div className="planning-results-panel">
      {/* Toolbar above panel */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">{t('planning_results', 'Planning Calculation Results')}</span>
          <select
            className="input input-sm"
            onChange={(e) => setViewMode(e.target.value as any)}
          >
            <option value="results">{t('results', 'Results')}</option>
            <option value="route">{t('route', 'Route & Stops')}</option>
            <option value="costs">{t('costs', 'Costs & Revenue')}</option>
            <option value="driver">{t('driver', 'Driver Hours')}</option>
            <option value="conflicts">{t('conflicts', 'Conflicts')}</option>
            <option value="emissions">{t('emissions', 'Emissions')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('excel')} className="btn-secondary text-xs py-1 px-2">
            {t('export', 'Export')}
          </button>
          <button onClick={() => setExportFormat('pdf')} className="btn-secondary text-xs py-1 px-2">
            {t('pdf', 'PDF')}
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-x-auto">
        {viewMode === 'results' && (
          <div className="p-4">
            {selectedTrip
              ? <div className="font-medium mb-2">{t('trip_detail', 'Trip detail')}: {selectedTrip.tripNumber || '—'}</div>
              : <div className="font-medium mb-2">{t('aggregate', 'Aggregated results for trips in range')}</div>}
            <table className="min-w-full divide divide-border/20">
              <thead>
                <tr>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('trip', 'Trip')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('truck', 'Truck')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('driver', 'Driver')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('distance', 'Distance (km)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('duration', 'Duration (min)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('toll', 'Toll (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('fuel_cost', 'Fuel (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('driver_cost', 'Driver (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('total_cost', 'Total (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('revenue', 'Revenue (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('profit', 'Profit (€)')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('utilization', 'Utilization %')}</th>
                  <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">{t('status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {viewMode === 'results' && tripResults.map((r, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="text-[10px] py-3 px-3">{r.tripNumber || '—'}</td>
                    <td className="text-[10px] py-3 px-3">{r.truckPlate || '—'}</td>
                    <td className="text-[10px] py-3 px-3">{r.driverName || '—'}</td>
                    <td className="text-[10px] py-3 px-3">{r.distanceKm} km</td>
                    <td className="text-[10px] py-3 px-3">{r.durationMin} min</td>
                    <td className="text-[10px] py-3 px-3">{r.tollCost !== null ? fmtMoney(r.tollCost, t) : t('not_calculated', 'Not calculated')}</td>
                    <td className="text-[10px] py-3 px-3">{r.fuelCost !== null ? fmtMoney(r.fuelCost, t) : t('unavailable', 'Unavailable')}</td>
                    <td className="text-[10px] py-3 px-3">{r.driverCost !== null ? fmtMoney(r.driverCost, t) : t('unavailable', 'Unavailable')}</td>
                    <td className="text-[10px] py-3 px-3">{r.totalCost !== null ? fmtMoney(r.totalCost, t) : t('unavailable', 'Unavailable')}</td>
                    <td className="text-[10px] py-3 px-3">{r.revenue !== null ? fmtMoney(r.revenue, t) : t('unavailable', 'Unavailable')}</td>
                    <td className="text-[10px] py-3 px-3">{r.profit !== null ? fmtMoney(r.profit, t) : t('unavailable', 'Unavailable')}</td>
                    <td className="text-[10px] py-3 px-3">{r.utilizationPct !== null ? `${r.utilizationPct}%` : t('not_provided', 'Not provided')}</td>
                    <td className="text-[10px] py-3 px-3">{r.status || '—'}</td>
                  </tr>
                ))}
                {tripResults.length === 0 && (
                  <tr>
                    <td colSpan={13} className="text-center text-text-secondary py-8">{t('no_trips', 'No trips in range')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'route' && (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-2">{t('route', 'Route & Stops')}</h3>
            {selectedTrip
              ? <p>{t('trip', 'Trip')}: {selectedTrip.tripNumber || '—'}</p>
              : <p>{t('no_trips', 'No trip selected')}</p>}
            <p>{t('stops', 'Stops')}: {(selectedTrip?.stops || []).length}</p>
          </div>
        )}
        {viewMode === 'costs' && (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-2">{t('costs', 'Costs & Revenue')}</h3>
            {selectedTrip
              ? <p>{t('revenue', 'Revenue')}: {selectedTrip.revenue !== null ? fmtMoney(selectedTrip.revenue, t) : t('unavailable', 'Unavailable')}</p>
              : <p>{t('no_trips', 'No trip selected')}</p>}
            <p>{t('profit', 'Profit')}: {selectedTrip.profit !== null ? fmtMoney(selectedTrip.profit, t) : t('unavailable', 'Unavailable')}</p>
          </div>
        )}
        {viewMode === 'driver' && (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-2">{t('driver', 'Driver Hours')}</h3>
            {selectedTrip
              ? <p>{t('driver', 'Driver')}: {selectedTrip.driverName || '—'}</p>
              : <p>{t('no_trips', 'No trip selected')}</p>}
          </div>
        )}
        {viewMode === 'conflicts' && (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-2">{t('conflicts', 'Conflicts')}</h3>
            <p>{t('conflict_count', 'Blocking conflicts')}: {(boardData?.conflicts || []).filter((c: any) => c.level === 'blocking').length}</p>
          </div>
        )}
        {viewMode === 'emissions' && (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-2">{t('emissions', 'Emissions')}</h3>
            {selectedTrip
              ? <p>{t('distance', 'Distance')}: {selectedTrip.distanceKm} km — approximate CO₂: {Math.round(selectedTrip.distanceKm * 0.12)} kg</p>
              : <p>{t('no_trips', 'No trip selected')}</p>}
          </div>
        )}
      </div>
    </div>
  );
}