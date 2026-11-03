import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export default function PlanningResultsPanel({
  boardData,
  selectedTripId,
  grouping,
  truckFilter,
  driverFilter,
  priorityFilter,
  searchFilter,
}: {
  boardData: any;
  selectedTripId: string | null;
  grouping: 'truck' | 'driver' | 'trailer';
  truckFilter: string;
  driverFilter: string;
  priorityFilter: string;
  searchFilter: string;
}) {
  const { t } = useTranslation();

  const trips = useMemo(() => {
    if (!boardData?.trips?.length) return [];
    return boardData.trips.filter((tr: any) => {
      const truckOk = !truckFilter || tr.truck?.plateNumber?.toString().includes(truckFilter);
      const driverOk =
        !driverFilter ||
        (tr.driver?.user?.name?.toString().includes(driverFilter) ||
          tr.driver?.name?.toString().includes(driverFilter));
      const searchOk =
        !searchFilter ||
        tr.tripNumber?.toString().toLowerCase().includes(searchFilter.toLowerCase()) ||
        (tr.driver?.name?.toString().toLowerCase().includes(searchFilter.toLowerCase()));
      return truckOk && driverOk && searchOk;
    });
  }, [boardData.trips, truckFilter, driverFilter, searchFilter]);

  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return trips.find((t: any) => t.id === selectedTripId) || null;
  }, [selectedTripId, trips]);

  return (
    <div className="planning-results-panel">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">
            {t('planning_results', 'Planning Calculation Results')}
          </span>
          <select className="input input-sm" onChange={() => {}}>
            <option value="results">{t('results', 'Results')}</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1 px-2">{t('export', 'Export')}</button>
        </div>
      </div>

      <div className="p-4">
        <span className="font-medium mb-2">
          {t('aggregate', 'Aggregated results for trips in range')}
        </span>
        <table className="min-w-full divide divide-border/20">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('trip', 'Trip')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('truck', 'Truck')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('driver', 'Driver')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('distance', 'Distance (km)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('duration', 'Duration (min)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('toll', 'Toll (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('fuel_cost', 'Fuel (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('driver_cost', 'Driver (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('total_cost', 'Total (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('revenue', 'Revenue (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('profit', 'Profit (€)')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('utilization', 'Utilization %')}
              </th>
              <th className="text-left text-xs font-bold py_2 px-3 text-text-secondary">
                {t('status', 'Status')}
              </th>
            </tr>
          </thead>
          <tbody>
            {trips.length > 0 ? (
              trips.map((r, i) => (
                <tr key={i} className="hover:bg-surface/50">
                  <td className="text-[10px] py-3 px-3">{r.tripNumber || '—'}</td>
                  <td className="text-[10px] py-3 px-3">{r.truckPlate || '—'}</td>
                  <td className="text-[10px] py-3 px-3">
                    {r.driver?.user?.name || r.driver?.name || '—'}
                  </td>
                  <td className="text-[10px] py-3 px-3">{r.distanceKm} km</td>
                  <td className="text-[10px] py-3 px-3">{r.durationMin} min</td>
                  <td className="text-[10px] py-3 px-3">—</td>
                  <td className="text-[10px] py-3 px-3">—</td>
                  <td className="text-[10px] py-3 px-3">—</td>
                  <td className="text-[10px] py-3 px-3">—</td>
                  <td className="text-[10px] py-3 px-3">—</td>
                  <td className="text-[10px] py-3 px-3">{r.status || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={13} className="text-center text-text-secondary py-8">
                  {t('no_trips', 'No trips in range')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}