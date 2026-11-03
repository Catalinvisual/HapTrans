import { useCallback, useMemo, useState, useEffect, MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { exportExcel } from '../lib/exportExcel';
import { fmtMoney, fmtNumber } from '../lib/format';

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

  // --- helpers ---
  const safeNum = (v: any) => (Number.isFinite(v) ? Number(v) : null);
  const fmtNum = (v: any, dec = 0) => {
    const n = safeNum(v);
    if (n === null) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
  };
  const fmtMoney = (v: any, currency = 'EUR') => {
    const n = safeNum(v);
    if (n === null) return '—';
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n);
    return sign + fmtNum(abs, 2) + ' ' + currency;
  };
  const fmtDuration = (min: any) => {
    const m = safeNum(min);
    if (m === null) return '—';
    const h = Math.floor(m / 60);
    const mins = m % 60;
    return `${h > 0 ? h + 'h ' : ''}${mins}min`;
  };

  // --- filter trips ---
  const filteredTrips = useMemo(() => {
    if (!boardData?.trips?.length) return [];
    return boardData.trips.filter((tr: any) => {
      const matchesTruck = truckFilter
        ? (tr.truck?.plateNumber?.toString().includes(truckFilter) || false)
        : true;
      const matchesDriver = driverFilter
        ? (
            tr.driver?.user?.name?.toString().includes(driverFilter) ||
            tr.driver?.name?.toString().includes(driverFilter) ||
            false
          )
        : true;
      const matchesSearch = searchFilter
        ? (
            tr.tripNumber?.toString().toLowerCase().includes(searchFilter.toLowerCase()) ||
            (tr.driver?.name?.toString().toLowerCase().includes(searchFilter.toLowerCase()))
          )
        : true;
      return matchesTruck && matchesDriver && matchesSearch;
    });
  }, [boardData.trips, truckFilter, driverFilter, searchFilter]);

  // --- selected trip ---
  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return filteredTrips.find((t: any) => t.id === selectedTripId) || null;
  }, [selectedTripId, filteredTrips]);

  // --- view mode / tab ---
  const [viewMode, setViewMode] = useState<
    | 'results'
    | 'route'
    | 'costs'
    | 'driver'
    | 'conflicts'
    | 'emissions'
  >('results');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const minHeight = 260;
  const maxHeight = 800;
  const panelRef = useRef<HTMLDivElement>(null);

  // --- resize handle state ---
  const [resizeStartY, setResizeStartY] = useState(0);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    let active = true;
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;
      const newHeight = Math.max(
        minHeight,
        Math.min(maxHeight, panelRef.clientHeight + (e.clientY - resizeStartY))
      );
      panelRef.current.style.height = `${newHeight}px`;
    };
    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    const onMouseDown = (e: MouseEvent) => {
      setResizeStartY(e.clientY);
      setIsResizing(true);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
    const handle = panelRef.current?.querySelector('.drag-handle');
    if (handle) {
      handle.addEventListener('mousedown', onMouseDown);
    }
    return () => {
      active = false;
    };
  }, [isResizing]);

  // --- export ---
  const handleExport = useCallback(() => {
    let rows: any[] = [];
    if (viewMode === 'results') {
      if (selectedTrip) {
        const totalCost =
          (selectedTrip.tollCost ?? 0) +
          (selectedTrip.fuelCost ?? 0) +
          (selectedTrip.driverCost ?? 0) +
          (selectedTrip.maintenanceCost ?? 0) +
          (selectedTrip.fixedCost ?? 0);
        const revenue = selectedTrip.revenue ?? 0;
        const profit = revenue - totalCost;
        rows = [
          {
            Trip: selectedTrip.tripNumber || '',
            Truck: selectedTrip.truck?.plateNumber || '',
            Driver: selectedTrip.driver?.user?.name || selectedTrip.driver?.name || '',
            Distance_km: selectedTrip.distanceKm,
            Duration_min: selectedTrip.durationMin,
            Toll_: selectedTrip.tollCost,
            Fuel_: selectedTrip.fuelCost,
            Driver_: selectedTrip.driverCost,
            Total_: totalCost,
            Revenue_: revenue,
            Profit_: profit,
            Utilization_:
              selectedTrip.utilizationPct !== null
                ? `${selectedTrip.utilizationPct}%`
                : '—',
            Status: selectedTrip.status || '',
          },
        ];
      } else if (filteredTrips.length > 0) {
        const agg = filteredTrips.reduce(
          (a: any, c: any) => ({
            totalDistanceKm: (a.totalDistanceKm ?? 0) + (c.distanceKm ?? 0),
            totalDurationMin: (a.totalDurationMin ?? 0) + (c.durationMin ?? 0),
            totalToll: (a.totalToll ?? 0) + (c.tollCost ?? 0),
            totalFuel: (a.totalFuel ?? 0) + (c.fuelCost ?? 0),
            totalDriver: (a.totalDriver ?? 0) + (c.driverCost ?? 0),
            totalMaint: (a.totalMaint ?? 0) + (c.maintenanceCost ?? 0),
            totalFixed: (a.totalFixed ?? 0) + (c.fixedCost ?? 0),
            totalRevenue: (a.totalRevenue ?? 0) + (c.revenue ?? 0),
          }),
          {
            totalDistanceKm: 0,
            totalDurationMin: 0,
            totalToll: 0,
            totalFuel: 0,
            totalDriver: 0,
            totalMaint: 0,
            totalFixed: 0,
            totalRevenue: 0,
          }
        );
        const totalCost =
          agg.totalToll +
          agg.totalFuel +
          agg.totalDriver +
          agg.totalMaint +
          agg.totalFixed;
        const revenue = agg.totalRevenue;
        const profit = revenue - totalCost;
        rows = [
          {
            Trip: '-',
            Truck: '-',
            Driver: '-',
            Distance_km: agg.totalDistanceKm,
            Duration_min: agg.totalDurationMin,
            Toll_: agg.totalToll,
            Fuel_: agg.totalFuel,
            Driver_: agg.totalDriver,
            Total_: totalCost,
            Revenue_: revenue,
            Profit_: profit,
            Utilization_:
              filteredTrips.reduce(
                (s, t) => s + (t.utilizationPct ?? 0),
                0
              ) / filteredTrips.length + '%',
            Status: '-',
          },
        ];
      } else {
        rows = [{ Note: t('no_trips', 'No trips in range') }];
      }
    }
    exportExcel({
      filename: 'planning-results',
      sheetName: 'Results',
      title: t('planning_results', 'Planning Calculation Results'),
      headers: [
        { key: 'Trip', label: t('trip', 'Trip') },
        { key: 'Truck', label: t('truck', 'Truck') },
        { key: 'Driver', label: t('driver', 'Driver') },
        { key: 'Distance_km', label: t('distance', 'Distance (km)') },
        { key: 'Duration_min', label: t('duration', 'Duration (min)') },
        { key: 'Toll_', label: t('toll', 'Toll (€)') },
        { key: 'Fuel_', label: t('fuel_cost', 'Fuel (€)') },
        { key: 'Driver_', label: t('driver_cost', 'Driver (€)') },
        { key: 'Total_', label: t('total_cost', 'Total (€)') },
        { key: 'Revenue_', label: t('revenue', 'Revenue (€)') },
        { key: 'Profit_', label: t('profit', 'Profit (€)') },
        { key: 'Utilization_', label: t('utilization', 'Utilization %') },
        { key: 'Status', label: t('status', 'Status') },
      ],
      rows,
    });
  }, [viewMode, selectedTrip, filteredTrips, t]);

  // --- render tab content ---
  const renderResultsTab = useMemo(() => {
    if (selectedTrip) {
      const totalCost =
        (selectedTrip.tollCost ?? 0) +
        (selectedTrip.fuelCost ?? 0) +
        (selectedTrip.driverCost ?? 0) +
        (selectedTrip.maintenanceCost ?? 0) +
        (selectedTrip.fixedCost ?? 0);
      const revenue = selectedTrip.revenue ?? 0;
      const profit = revenue - totalCost;
      return (
        <div className="p-4">
          <h3 className="text-sm font-bold mb-2">{t('results', 'Results')}</h3>
          <p>{t('trip', 'Trip')}: {selectedTrip.tripNumber || '—'}</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>{t('truck', 'Truck')}</dt>
              <dd>{selectedTrip.truck?.plateNumber || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('driver', 'Driver')}</dt>
              <dd>
                selectedTrip.driver?.user?.name || selectedTrip.driver?.name || '—'
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('distance', 'Distance (km)')}</dt>
              <dd>{selectedTrip.distanceKm} km</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('duration', 'Duration (min)')}</dt>
              <dd>{fmtDuration(selectedTrip.durationMin)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('toll', 'Toll (€)')}</dt>
              <dd>{fmtMoney(selectedTrip.tollCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('fuel_cost', 'Fuel (€)')}</dt>
              <dd>{fmtMoney(selectedTrip.fuelCost)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('driver_cost', 'Driver (€)')}</dt>
              <dd>{fmtMoney(selectedTrip.driverCost)}</dd>
            </div>
            <div className="flex justify-between text-primary">
              <dt>{t('total_cost', 'Total (€)')}</dt>
              <dd>{fmtMoney(totalCost)}</dd>
            </div>
            <div className="flex justify-between text-success">
              <dt>{t('revenue', 'Revenue (€)')}</dt>
              <dd>{fmtMoney(revenue)}</dd>
            </div>
            <div className="flex justify-between text-success">
              <dt>{t('profit', 'Profit (€)')}</dt>
              <dd>{fmtMoney(profit)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('utilization', 'Utilization %')}</dt>
              <dd>
                selectedTrip.utilizationPct !== null
                  ? `${selectedTrip.utilizationPct}%`
                  : '—'
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('status', 'Status')}</dt>
              <dd>{selectedTrip.status || '—'}</dd>
            </div>
          </dl>
        </div>
      );
    }
    if (filteredTrips.length === 0) {
      return <p>{t('no_trips', 'No trips in range')}</p>;
    }
    // aggregate
    const agg = filteredTrips.reduce(
      (a: any, c: any) => ({
        totalDistanceKm: (a.totalDistanceKm ?? 0) + (c.distanceKm ?? 0),
        totalDurationMin: (a.totalDurationMin ?? 0) + (c.durationMin ?? 0),
        totalToll: (a.totalToll ?? 0) + (c.tollCost ?? 0),
        totalFuel: (a.totalFuel ?? 0) + (c.fuelCost ?? 0),
        totalDriver: (a.totalDriver ?? 0) + (c.driverCost ?? 0),
        totalMaint: (a.totalMaint ?? 0) + (c.maintenanceCost ?? 0),
        totalFixed: (a.totalFixed ?? 0) + (c.fixedCost ?? 0),
        totalRevenue: (a.totalRevenue ?? 0) + (c.revenue ?? 0),
      }),
      {
        totalDistanceKm: 0,
        totalDurationMin: 0,
        totalToll: 0,
        totalFuel: 0,
        totalDriver: 0,
        totalMaint: 0,
        totalFixed: 0,
        totalRevenue: 0,
      }
    );
    const totalCost =
      agg.totalToll + agg.totalFuel + agg.totalDriver + agg.totalMaint + agg.totalFixed;
    const revenue = agg.totalRevenue;
    const profit = revenue - totalCost;
    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('results', 'Results')}</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t('truck', 'Truck')}</dt>
            <dd>-</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('driver', 'Driver')}</dt>
            <dd>-</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('distance', 'Distance (km)')}</dt>
            <dd>{agg.totalDistanceKm} km</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('duration', 'Duration (min)')}</dt>
            <dd>{fmtDuration(agg.totalDurationMin)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('toll', 'Toll (€)')}</dt>
            <dd>{fmtMoney(agg.totalToll)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('fuel_cost', 'Fuel (€)')}</dt>
            <dd>{fmtMoney(agg.totalFuel)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('driver_cost', 'Driver (€)')}</dt>
            <dd>{fmtMoney(agg.totalDriver)}</dd>
          </div>
          <div className="flex justify-between text-primary">
            <dt>{t('total_cost', 'Total (€)')}</dt>
            <dd>{fmtMoney(totalCost)}</dd>
          </div>
          <div className="flex justify-between text-success">
            <dt>{t('revenue', 'Revenue (€)')}</dt>
            <dd>{fmtMoney(revenue)}</dd>
          </div>
          <div className="flex justify-between text-success">
            <dt>{t('profit', 'Profit (€)')}</dt>
            <dd>{fmtMoney(profit)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('utilization', 'Utilization %')}</dt>
            <dd>
              filteredTrips.reduce(
                (s, t) => s + (t.utilizationPct ?? 0),
                0
              ) / filteredTrips.length + '%'
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('status', 'Status')}</dt>
            <dd>-</dd>
          </div>
        </dl>
      </div>
    );
  }, [selectedTrip, filteredTrips, t]);

  const renderRouteTab = useMemo(() => {
    const trip =
      selectedTrip || (filteredTrips.length > 0 ? filteredTrips[0] : null);
    if (!trip) return <p>{t('no_trips', 'No trip selected')</p}>;

    const legs = useMemo(() => {
      const stops = trip.stops || [];
      const legs: any[] = [];
      stops.forEach((s: any, i: number) => {
        const from = stops[i - 1]?.companyName || '—';
        const to = s.companyName || '—';
        legs.push({
          from,
          to,
          distanceKm: s.distanceKm ?? 0,
          durationMin: s.durationMin ?? 0,
          loadingDur: s.loadingDuration ?? 0,
          unloadingDur: s.unloadingDuration ?? 0,
          waitDur: s.waitDuration ?? 0,
        });
      });
      return legs;
    }, [trip]);

    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('route', 'Route & Stops')}</h3>
        <p>{t('trip', 'Trip')}: {trip.tripNumber || '—'}</p>
        <p>{t('stops', 'Stops')}: { (trip.stops || []).length }</p>
        <table className="min-w-full divide divide-border/20">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('from', 'From')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('to', 'To')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('distance', 'Distance (km)')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('duration', 'Duration (min)')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('loading', 'Loading')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('unloading', 'Unloading')}
              </th>
              <th className="text-left text-xs font-bold py-2 px-3 text-text-secondary">
                {t('waiting', 'Waiting')}
              </th>
            </tr>
          </thead>
          <tbody>
            {legs.map((l: any, i: number) => (
              <tr key={i} className="hover:bg-surface/50">
                <td className="text-[10px] py-3 px-3">{l.from}</td>
                <td className="text-[10px] py-3 px-3">{l.to}</td>
                <td className="text-[10px] py-3 px-3">{l.distanceKm} km</td>
                <td className="text-[10px] py-3 px-3">{l.durationMin} min</td>
                <td className="text-[10px] py-3 px-3">{l.loadingDur} min</td>
                <td className="text-[10px] py-3 px-3">{l.unloadingDur} min</td>
                <td className="text-[10px] py-3 px-3">{l.waitDur} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [selectedTrip, filteredTrips, t]);

  const renderCostsTab = useMemo(() => {
    const trip =
      selectedTrip || (filteredTrips.length > 0 ? filteredTrips[0] : null);
    if (!trip) return <p>{t('no_trips', 'No trip selected')</p}>;

    const totalCost =
      (trip.tollCost ?? 0) +
      (trip.fuelCost ?? 0) +
      (trip.driverCost ?? 0) +
      (trip.maintenanceCost ?? 0) +
      (trip.fixedCost ?? 0);
    const revenue = trip.revenue ?? 0;
    const profit = revenue - totalCost;

    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('costs', 'Costs & Revenue')}</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t('fuel_cost', 'Fuel cost')}</dt>
            <dd>{fmtMoney(trip.fuelCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('toll', 'Toll cost')}</dt>
            <dd>{fmtMoney(trip.tollCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('driver_cost', 'Driver cost')}</dt>
            <dd>{fmtMoney(trip.driverCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('maintenance_cost', 'Maintenance cost')}</dt>
            <dd>{fmtMoney(trip.maintenanceCost)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('fixed_cost', 'Fixed cost')}</dt>
            <dd>{fmtMoney(trip.fixedCost)}</dd>
          </div>
          <div className="flex justify-between text-primary">
            <dt>{t('total_cost', 'Total cost')}</dt>
            <dd>{fmtMoney(totalCost)}</dd>
          </div>
          <div className="flex justify-between text-success">
            <dt>{t('revenue', 'Revenue')}</dt>
            <dd>{fmtMoney(revenue)}</dd>
          </div>
          <div className="flex justify-between text-success">
            <dt>{t('profit', 'Profit')}</dt>
            <dd>{fmtMoney(profit)}</dd>
          </div>
        </dl>
      </div>
    );
  }, [selectedTrip, filteredTrips, t]);

  const renderDriverTab = useMemo(() => {
    const trip =
      selectedTrip || (filteredTrips.length > 0 ? filteredTrips[0] : null);
    if (!trip) return <p>{t('no_trips', 'No trip selected')</p}>;

    const hos = boardData?.hosSummary?.[trip.id] || {};
    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('driver', 'Driver Hours')}</h3>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>{t('driving', 'Driving')}</dt>
            <dd>
              hos.drivingMin !== undefined
                ? fmtDuration(hos.drivingMin)
                : t('not_provided', 'Not provided')
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('breaks', 'Breaks')}</dt>
            <dd>
              hos.breakMin !== undefined ? fmtDuration(hos.breakMin) : t('not_provided', 'Not provided')
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('rest', 'Rest')}</dt>
            <dd>
              hos.restMin !== undefined ? fmtDuration(hos.restMin) : t('not_provided', 'Not provided')
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('other_work', 'Other work')}</dt>
            <dd>
              hos.otherMin !== undefined ? fmtDuration(hos.otherMin) : t('not_provided', 'Not provided')
            </dd>
          </div>
          <div className="flex justify-between">
            <dt>{t('remaining_driving', 'Remaining driving time')}</dt>
            <dd>
              hos.remainingMin !== undefined
                ? fmtDuration(hos.remainingMin)
                : t('not_provided', 'Not provided')
            </dd>
          </div>
        </dl>
      </div>
    );
  }, [selectedTrip, filteredTrips, boardData?.hosSummary, t]);

  const renderConflictsTab = useMemo(() => {
    const conflicts = boardData?.conflicts || [];
    const blocking = conflicts.filter((c: any) => c.level === 'blocking');
    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('conflicts', 'Conflicts')}</h3>
        <p>{t('conflict_count', 'Blocking conflicts')}: {blocking.length}</p>
        <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
          {blocking.map((c: any, i: number) => (
            <li key={i} className="text-red-600/90">{c.message}</li>
          ))}
        </ul>
        {blocking.length === 0 && <p>{t('no_conflicts', 'No blocking conflicts')}</p>}
        <p className="mt-2 text-sm text-text-muted">
          {t('conflict_warning', '⚠️ Check for overlapping tasks')}
        </p>
      </div>
    );
  }, [boardData?.conflicts, t]);

  const renderEmissionsTab = useMemo(() => {
    const trip =
      selectedTrip || (filteredTrips.length > 0 ? filteredTrips[0] : null);
    if (!trip) return <p>{t('no_trips', 'No trip selected')</p}>;

    const CO2_PER_KM = 0.12; // kg CO2 per km average diesel
    const estimatedCO2 = Math.round(
      (trip.distanceKm ?? 0) * CO2_PER_KM
    );

    return (
      <div className="p-4">
        <h3 className="text-sm font-bold mb-2">{t('emissions', 'Emissions')}</h3>
        <p>
          {t('distance', 'Distance')}: {(trip.distanceKm ?? 0)} km&nbsp;–&nbsp;{
            t('estimated_emissions', 'Estimated CO₂')
          }:{estimatedCO2} kg
        </p>
        <p className="text-sm text-text-muted">
          {t(
            'emission_assumption',
            'Assumes average diesel consumption of 32 L/100 km and a CO₂ emission factor of 0.12 kg/L.'
          )}
        </p>
      </div>
    );
  }, [selectedTrip, filteredTrips, t]);

  // --- render tabs selector ---
  const renderTabsSelector = useMemo(() => (
    <div className="flex items-center gap-2 mb-4">
      <select
        className="input input-sm bg-surface border border-border rounded-md hover:bg-surface/10 focus:outline-none focus:ring-primary"
        value={viewMode}
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
  ), [viewMode, t]);

  // --- panel layout ---
  return (
    <div
      className="planning-results-panel"
      style={{ height: isCollapsed ? '0' : 'auto' }}
      ref={panelRef}
    >
      {/* Resize handle - visible when not collapsed */}
      {!isCollapsed && (
        <div
          onMouseDown={(e: MouseEvent) => {
            setResizeStartY(e.clientY);
            setIsResizing(true);
            document.addEventListener('mousemove', (e: MouseEvent) => {
              if (!panelRef.current) return;
              const newHeight = Math.max(
                minHeight,
                Math.min(
                  maxHeight,
                  panelRef.clientHeight + (e.clientY - resizeStartY)
                )
              );
              panelRef.style.height = `${newHeight}px`;
            });
            document.addEventListener('mouseup', () => {
              setIsResizing(false);
              document.removeEventListener('mousemove', (e: MouseEvent) => {});
              document.removeEventListener('mouseup', () => {});
            });
          }}
          className="drag-handle cursor-row-resize select-none p-1 bg-surface/30 hover:bg-primary/10 transition-colors"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="icon"
          >
            <path d="M15 6l6-6M9 6l6 6M6 9l6 6" />
          </svg>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/30">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text-primary">
            {t('planning_results', 'Planning Calculation Results')}
          </span>
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
          <button onClick={handleExport} className="btn-secondary text-xs py-1 px-2" title={t('export', 'Export')}>
            {t('export', 'Export')}
          </button>
          <button
            onClick={() => window.open(`/export?format=pdf&filename=planning-results.pdf`, '_blank')}
            className="btn-secondary text-xs py-1 px-2"
            title={t('pdf', 'PDF')}
          >
            {t('pdf', 'PDF')}
          </button>
        </div>
      </div>

      <div className="p-4">{renderTabsSelector}</div>

      <div className="p-4">{renderResultsTab}</div>

      {/* Collapse button when collapsed */}
      {isCollapsed ? (
        <button
          onClick={() => setIsCollapsed(false)}
          className="mt-2 btn-secondary text-xs py-1 px-2"
          title={t('expand', 'Expand')}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 6l6 6M9 6l-6 6M6 9l6-6" />
          </svg>
          {t('expand', 'Expand')}
        </button>
      ) : null}
    </div>
  );
}