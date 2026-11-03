import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function PlanningResultsPanel() {
  const { t } = useTranslation();

  // Dummy data – in a full implementation this would come from the planning store
  const boardData = {
    resources: [],
    trips: [],
    orders: [],
    conflicts: [],
    hosSummary: {},
  };
  const selectedTripId = null;
  const grouping = 'truck';
  const truckFilter = '';
  const driverFilter = '';
  const priorityFilter = '';
  const searchFilter = '';

  const [viewMode, setViewMode] = useState<'results'>('results');

  return (
    <div className="planning-results-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">{t('planning_results', 'Planning Calculation Results')}</span>
          <select
            className="input input-sm"
            onChange={() => setViewMode('results')}
          >
            <option value="results">{t('results', 'Results')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('results')} className="btn-secondary text-xs py-1 px-2">
            {t('export', 'Export')}
          </button>
        </div>
      </div>

      <div className="p-4">
        <span className="font-medium mb-2">{t('aggregate', 'Aggregated results for trips in range')}</span>
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
            {boardData.trips.map((r, i) => (
              <tr key={i} className="hover:bg-surface/50">
                <td className="text-[10px] py-3 px-3">{r.tripNumber || '—'}</td>
                <td className="text-[10px] py-3 px-3">{r.truckPlate || '—'}</td>
                <td className="text-[10px] py-3 px-3">{r.driverName || '—'}</td>
                <td className="text-[10px] py-3 px-3">{r.distanceKm} km</td>
                <td className="text-[10px] py-3 px-3">{r.durationMin} min</td>
                <td className="text-[10px] py-3 px-3">—</td>
                <td className="text-[10px] py-3 px-3">—</td>
                <td className="text-[10px] py-3 px-3">—</td>
                <td className="text-[10px] py-3 px-3">—</td>
                <td className="text-[10px] py-3 px-3">—</td>
                <td className="text-[10px] py-3 px-3">{r.status || '—'}</td>
              </tr>
            ))}
            {boardData.trips.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center text-text-secondary py-8">{t('no_trips', 'No trips in range')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}