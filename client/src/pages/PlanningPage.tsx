import { useEffect, useState } from 'react';
import { Truck as TruckIcon, Package, Loader2, MapPin, Calendar, ArrowRight, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export default function PlanningPage() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksRes, ordersRes, tripsRes, driversRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders?status=draft,unassigned,pending'),
        api.get('/trips?status=planning,dispatched'),
        api.get('/drivers'),
      ]);
      setTrucks(trucksRes.data.filter((t: any) => t.status === 'active'));
      setOrders(ordersRes.data);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Eroare la încărcarea datelor de planificare');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAssignOrderToTruck = async (orderId: string, truckId: string) => {
    await assignOrderToTruck(orderId, truckId);
    setSelectedOrderToAssign(null);
  };

  const assignOrderToTruck = async (orderId: string, truckId: string) => {
    try {
      setAssigning(orderId);
      const truck = trucks.find(t => t.id === truckId);
      const order = orders.find(o => o.id === orderId);
      if (!truck || !order) return;

      // 1. Validate Assignment via Backend
      const validateRes = await api.post('/planning/validate-assignment', {
        orderId,
        truckId
      });
      const { warnings } = validateRes.data;
      if (warnings && warnings.length > 0) {
        const proceed = window.confirm(`Atenție! S-au detectat următoarele atenționări:\n\n${warnings.join('\n')}\n\nDoriți să continuați?`);
        if (!proceed) return;
      }

      // Find if there is already a planning trip on this truck
      const existingTrip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');

      if (existingTrip) {
        // Assign to existing trip
        await api.post(`/trips/${existingTrip.id}/assign-orders`, { orderIds: [orderId] });
        await api.patch(`/orders/${orderId}`, { status: 'assigned' });
        toast.success(`Comandă adăugată la cursa existentă pentru camionul ${truck.plateNumber}!`);
      } else {
        // Create new trip and assign
        const tripRes = await api.post('/trips', {
          truckId,
          driverId: truck.driver?.id || null,
          status: 'planning',
          price: order.price ? Number(order.price) : undefined,
          currency: order.currency || 'EUR',
          tripNumber: `TR-${order.orderNumber || order.referenceNumber || Date.now().toString().slice(-6)}`,
          pickupAddress: order.stops?.find((s: any) => s.type === 'pickup')?.address || '',
          dropoffAddress: order.stops?.find((s: any) => s.type === 'dropoff')?.address || '',
          pickupDate: order.stops?.find((s: any) => s.type === 'pickup')?.scheduledDate || new Date().toISOString(),
          dropoffDate: order.stops?.find((s: any) => s.type === 'dropoff')?.scheduledDate || new Date(Date.now() + 86400000).toISOString(),
        });

        const newTripId = tripRes.data.id;
        await api.post(`/trips/${newTripId}/assign-orders`, { orderIds: [orderId] });
        await api.patch(`/orders/${orderId}`, { status: 'assigned' });
        toast.success(`Cursă nouă creată și comandă asignată pentru ${truck.plateNumber}!`);
      }

      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Eroare la asignarea comenzii');
    } finally {
      setAssigning(null);
    }
  };

  const reorderStops = async (tripId: string, stopId: string, direction: 'up' | 'down') => {
    const trip = trips.find(t => t.id === tripId);
    if (!trip || !trip.stops) return;

    const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
    const idx = sortedStops.findIndex(s => s.id === stopId);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const temp = sortedStops[idx];
      sortedStops[idx] = sortedStops[idx - 1];
      sortedStops[idx - 1] = temp;
    } else if (direction === 'down' && idx < sortedStops.length - 1) {
      const temp = sortedStops[idx];
      sortedStops[idx] = sortedStops[idx + 1];
      sortedStops[idx + 1] = temp;
    } else {
      return;
    }

    try {
      await api.post(`/trips/${tripId}/stops/reorder`, {
        stopIds: sortedStops.map(s => s.id)
      });
      toast.success('Secvența de opriri a fost actualizată!');
      loadData();
    } catch (e) {
      toast.error('Eroare la salvarea secvenței');
    }
  };

  const handleAssignDriver = async (truckId: string, driverId: string) => {
    try {
      await api.patch(`/trucks/${truckId}`, { driverId: driverId || null });
      const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
      if (trip) {
        await api.patch(`/trips/${trip.id}`, { driverId: driverId || null });
      }
      toast.success('Șoferul a fost alocat camionului!');
      loadData();
    } catch (e) {
      toast.error('Eroare la alocarea șoferului');
    }
  };

  const unassigned = orders.filter(o => ['draft', 'unassigned', 'pending'].includes(o.status));

  // Helper to calculate totals for each truck's trip
  const getTruckStats = (truckId: string) => {
    const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
    if (!trip) return { weight: 0, ldm: 0, count: 0, orders: [], tripId: null, driverId: null };

    let weight = 0;
    let ldm = 0;
    const ordersList = trip.orders || [];

    ordersList.forEach((fullOrder: any) => {
      fullOrder.cargoItems?.forEach((cargo: any) => {
        weight += Number(cargo.weightKg || 0);
        ldm += Number(cargo.ldm || 0);
      });
    });

    return { weight, ldm, count: ordersList.length, orders: ordersList, tripId: trip.id, driverId: trip.driver?.id || null };
  };
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getRecommendation = (truck: any, order: any) => {
    const stats = getTruckStats(truck.id);
    const orderWeight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
    const orderLdm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;

    const maxWeight = truck.maxWeightKg || 24000;
    const maxLdm = truck.maxLdm || 13.6;

    const weightFits = stats.weight + orderWeight <= maxWeight;
    const ldmFits = stats.ldm + orderLdm <= maxLdm;

    const pickupStop = order.stops?.find((s: any) => s.type === 'pickup');
    const orderLat = pickupStop?.latitude ? Number(pickupStop.latitude) : null;
    const orderLng = pickupStop?.longitude ? Number(pickupStop.longitude) : null;

    let distanceKm: number | null = null;
    let distanceType: 'last_stop' | 'current_loc' | null = null;

    if (orderLat !== null && orderLng !== null) {
      // Find active trip last stop
      const trip = trips.find(tr => tr.truck?.id === truck.id && tr.status === 'planning');
      if (trip && trip.stops && trip.stops.length > 0) {
        const sorted = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
        const lastStop = sorted[sorted.length - 1];
        if (lastStop.latitude && lastStop.longitude) {
          distanceKm = getDistance(orderLat, orderLng, Number(lastStop.latitude), Number(lastStop.longitude));
          distanceType = 'last_stop';
        }
      }
      
      // Fallback to truck current location
      if (distanceKm === null && truck.currentLat && truck.currentLng) {
        distanceKm = getDistance(orderLat, orderLng, Number(truck.currentLat), Number(truck.currentLng));
        distanceType = 'current_loc';
      }
    }

    let badge = t('compatible');
    let color = 'text-green-600 bg-green-50 dark:bg-green-950/20 dark:text-green-400 border-green-200';
    let isCompatible = weightFits && ldmFits;

    if (!isCompatible) {
      let warningText = '';
      if (!weightFits) warningText += t('exceeds_weight', { kg: (stats.weight + orderWeight - maxWeight) }) + ' ';
      if (!ldmFits) warningText += t('exceeds_ldm', { ldm: (stats.ldm + orderLdm - maxLdm).toFixed(1) }) + ' ';
      badge = warningText.trim() || t('capacity_exceeded');
      color = 'text-red-500 bg-red-50 dark:bg-red-950/20 dark:text-red-400 border-red-200 font-bold';
    }

    return {
      isCompatible,
      badge,
      color,
      distanceKm,
      distanceType
    };
  };

  const getSortedTrucks = (order: any) => {
    return [...trucks].map(t => {
      const rec = getRecommendation(t, order);
      return { truck: t, rec };
    }).sort((a, b) => {
      // 1. Compatible trucks first
      if (a.rec.isCompatible && !b.rec.isCompatible) return -1;
      if (!a.rec.isCompatible && b.rec.isCompatible) return 1;

      // 2. Closest trucks first (distance ascending)
      if (a.rec.distanceKm !== null && b.rec.distanceKm !== null) {
        return a.rec.distanceKm - b.rec.distanceKm;
      }
      if (a.rec.distanceKm !== null && b.rec.distanceKm === null) return -1;
      if (a.rec.distanceKm === null && b.rec.distanceKm !== null) return 1;

      return 0;
    });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('planning_tms_title')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('planning_tms_subtitle')}</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('update_data')}
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top Panel: Unassigned Orders Full-Width Rows */}
        <div className="lg:col-span-12 bg-card rounded-2xl border border-border flex flex-col shadow-sm">
          <div className="p-5 border-b border-border bg-surface/30 flex justify-between items-center">
            <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
              <Package className="w-5.5 h-5.5 text-primary" />
              {t('unassigned_orders')}
            </h2>
            <span className="badge badge-warning text-xs px-3 py-1 font-bold">{t('active_orders_count', { count: unassigned.length })}</span>
          </div>

          <div className="overflow-x-auto">
            {unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3 opacity-60" />
                <p className="font-semibold text-text-primary">{t('no_unassigned_orders')}</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-surface/50 border-b border-border text-xs uppercase font-bold text-text-secondary">
                    <th className="p-4 pl-6">{t('ref_table_header')}</th>
                    <th className="p-4">{t('type_table_header')}</th>
                    <th className="p-4">{t('pickup_table_header')}</th>
                    <th className="p-4">{t('dropoff_table_header')}</th>
                    <th className="p-4">{t('cargo_table_header')}</th>
                    <th className="p-4">{t('price_table_header')}</th>
                    <th className="p-4 pr-6 text-right">{t('action_table_header')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {unassigned.map(order => {
                    const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                    const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                    const weight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
                    const ldm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;
                    const isUrgent = pickup?.dateFrom && (new Date(pickup.dateFrom).getTime() - Date.now() < 86400000);

                    return (
                      <tr key={order.id} className="hover:bg-surface/20 transition-colors">
                        <td className="p-4 pl-6">
                          <span className="font-bold text-primary">{order.orderNumber || order.referenceNumber || 'Comandă'}</span>
                          {isUrgent && <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded">{t('urgent')}</span>}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-150">
                            {(order.transportType || 'ftl').toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-text-primary">{pickup?.companyName || '—'}</div>
                          <div className="text-xs text-text-secondary">{pickup?.address || '—'}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-text-primary">{dropoff?.companyName || '—'}</div>
                          <div className="text-xs text-text-secondary">{dropoff?.address || '—'}</div>
                        </td>
                        <td className="p-4">
                          <span className="font-semibold text-text-primary">{weight} kg</span>
                          <span className="text-text-secondary text-xs block">{ldm.toFixed(1)} LDM</span>
                        </td>
                        <td className="p-4 font-bold text-text-primary">
                          €{order.price || '0.00'}
                        </td>
                        <td className="p-4 pr-6 text-right">
                          <button
                            onClick={() => setSelectedOrderToAssign(order)}
                            className="btn-primary py-1.5 px-4 text-xs font-bold bg-primary hover:bg-primary/95 text-white rounded-lg inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <TruckIcon className="w-4 h-4" /> {t('plan_trip')}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Bottom panel: Active Fleet */}
        <div className="lg:col-span-12 flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
              <TruckIcon className="w-5.5 h-5.5 text-primary" />
              {t('active_fleet_title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trucks.map(truck => {
              const stats = getTruckStats(truck.id);
              const maxWeight = truck.maxWeightKg || 24000;
              const maxLdm = truck.maxLdm || 13.6;

              const weightPct = Math.min(100, (stats.weight / maxWeight) * 100);
              const ldmPct = Math.min(100, (stats.ldm / maxLdm) * 100);
              const hasWarning = stats.weight > maxWeight || stats.ldm > maxLdm;

              return (
                <div
                  key={truck.id}
                  onClick={() => stats.tripId && setSelectedTripId(stats.tripId)}
                  className={`relative bg-card border rounded-2xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-md
                    ${selectedTripId === stats.tripId && stats.tripId
                      ? 'border-primary shadow-sm bg-primary/5'
                      : 'border-border hover:border-primary/30 hover:bg-surface/50'
                    }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                          <TruckIcon className="w-5.5 h-5.5 text-primary" />
                          {truck.plateNumber}
                        </h3>
                        <div className="mt-2 text-xs">
                          <span className="text-text-secondary font-semibold">{t('assigned_driver')}</span>
                          <select
                            value={truck.driver?.id || stats.driverId || ''}
                            onChange={e => handleAssignDriver(truck.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-xs bg-white dark:bg-card border border-border/80 rounded-lg p-1.5 font-semibold text-text-primary focus:outline-none focus:border-primary mt-1"
                          >
                            <option value="">{t('no_driver_select')}</option>
                            {drivers.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.user?.name || 'Șofer Fără Nume'}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {hasWarning && (
                        <span className="text-red-500 animate-pulse flex items-center gap-1 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4" /> {t('overload_warning')}
                        </span>
                      )}
                    </div>

                    {/* Capacity progress bars */}
                    <div className="space-y-3 my-4">
                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1 text-text-secondary">
                          <span>{t('weight_label')}: {stats.weight} / {maxWeight} kg</span>
                          <span>{weightPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-surface dark:bg-card-dark h-2 rounded-full overflow-hidden border border-border/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${stats.weight > maxWeight ? 'bg-red-500' : 'bg-primary'}`} 
                            style={{ width: `${weightPct}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-semibold mb-1 text-text-secondary">
                          <span>{t('floor_meters_label')}: {stats.ldm.toFixed(1)} / {maxLdm} LDM</span>
                          <span>{ldmPct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-surface dark:bg-card-dark h-2 rounded-full overflow-hidden border border-border/40">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${stats.ldm > maxLdm ? 'bg-red-500' : 'bg-green-600'}`} 
                            style={{ width: `${ldmPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/60 flex justify-between items-center text-xs text-text-secondary">
                    <span className="font-semibold">
                      {t('orders_in_trip', { count: stats.count })}
                    </span>
                    {stats.tripId && (
                      <span className="text-primary font-bold hover:underline">
                        {t('view_stops')} &rarr;
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Trip stops sequence details */}
        {selectedTripId && (
          <div className="lg:col-span-12 bg-card border border-border rounded-2xl p-5 flex flex-col shrink-0 min-h-[220px] shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                <MapPin className="w-5.5 h-5.5 text-primary" />
                {t('stops_sequence_title')}
              </h3>
              <button 
                onClick={() => setSelectedTripId(null)}
                className="text-xs font-bold text-text-secondary hover:text-red-500 border border-border rounded-lg px-3 py-1 bg-surface hover:bg-surface/80 transition-all"
              >
                {t('close_panel')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {trips.find(t => t.id === selectedTripId)?.stops?.sort((a: any, b: any) => a.sequence - b.sequence).map((stop: any, idx: number, arr: any[]) => (
                <div key={stop.id} className="flex justify-between items-center bg-surface/50 border border-border p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20">
                      {stop.sequence}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{stop.companyName || t('stop_default_label')}</p>
                      <p className="text-xs text-text-secondary line-clamp-1">{stop.address}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => reorderStops(selectedTripId, stop.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 hover:bg-surface rounded-lg border border-border disabled:opacity-30 transition-all"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => reorderStops(selectedTripId, stop.id, 'down')}
                      disabled={idx === arr.length - 1}
                      className="p-1.5 hover:bg-surface rounded-lg border border-border disabled:opacity-30 transition-all"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {selectedOrderToAssign && (() => {
        const order = selectedOrderToAssign;
        const pickup = order.stops?.find((s: any) => s.type === 'pickup');
        const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
        const orderWeight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
        const orderLdm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;
        
        const sortedTrucks = getSortedTrucks(order);

        return (
          <div 
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}
          >
            <div 
              className="relative w-full max-w-3xl bg-card shadow-2xl rounded-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh', animation: 'wizardIn 0.2s ease-out' }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {t('smart_assign_title')}: {order.orderNumber || order.referenceNumber}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {t('smart_assign_desc')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrderToAssign(null)} 
                  className="text-text-secondary hover:text-red-500 font-semibold text-sm"
                >
                  {t('close')}
                </button>
              </div>

              {/* Cargo Info strip */}
              <div className="bg-primary/5 p-4 border-b border-border/80 text-sm flex flex-wrap gap-x-6 gap-y-2 shrink-0 justify-between items-center">
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('route')}</span>
                  <span className="font-bold text-text-primary">
                    {pickup?.city || pickup?.address?.split(',')[0] || 'TBD'} &rarr; {dropoff?.city || dropoff?.address?.split(',')[0] || 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('cargo_details')}</span>
                  <span className="font-bold text-text-primary">
                    {orderWeight} kg • {orderLdm.toFixed(1)} LDM • {(order.transportType || 'ftl').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('agreed_price')}</span>
                  <span className="font-bold text-primary">€{order.price || '0.00'}</span>
                </div>
              </div>

              {/* List of recommended trucks */}
              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar flex-1">
                <h3 className="text-xs uppercase font-bold tracking-widest text-text-secondary mb-2">{t('recommendations_title')}</h3>
                {sortedTrucks.map(({ truck, rec }) => {
                  const stats = getTruckStats(truck.id);
                  const maxWeight = truck.maxWeightKg || 24000;
                  const maxLdm = truck.maxLdm || 13.6;

                  const weightPct = Math.min(100, (stats.weight / maxWeight) * 100);
                  const ldmPct = Math.min(100, (stats.ldm / maxLdm) * 100);

                  const isRecommended = rec.isCompatible;

                  return (
                    <div 
                      key={truck.id} 
                      className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-surface/30
                        ${isRecommended ? 'border-green-200 dark:border-green-900/60 bg-green-50/5' : 'border-border'}
                      `}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-text-primary text-base flex items-center gap-1.5">
                            <TruckIcon className="w-5 h-5 text-primary" />
                            {truck.plateNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${rec.color}`}>
                            {rec.badge}
                          </span>
                          {rec.distanceKm !== null && (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-md">
                              📍 {rec.distanceKm.toFixed(0)} km {rec.distanceType === 'last_stop' ? t('from_last_stop') : t('from_current_loc')}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-text-secondary mt-1">
                          <div>
                            <span>{t('weight_label')}:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-24 bg-surface dark:bg-card-dark h-1.5 rounded-full overflow-hidden border border-border/40">
                                <div className="h-full bg-primary" style={{ width: `${weightPct}%` }} />
                              </div>
                              <span>{stats.weight} + {orderWeight} / {maxWeight} kg</span>
                            </div>
                          </div>
                          <div>
                            <span>{t('floor_meters_label')}:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-24 bg-surface dark:bg-card-dark h-1.5 rounded-full overflow-hidden border border-border/40">
                                <div className="h-full bg-green-600" style={{ width: `${ldmPct}%` }} />
                              </div>
                              <span>{stats.ldm.toFixed(1)} + {orderLdm.toFixed(1)} / {maxLdm} LDM</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                        <div className="w-full sm:w-44 text-xs">
                          <select
                            value={truck.driver?.id || stats.driverId || ''}
                            onChange={e => handleAssignDriver(truck.id, e.target.value)}
                            className="w-full bg-white dark:bg-card border border-border/80 rounded-lg p-1.5 font-semibold text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">{t('no_driver')}</option>
                            {drivers.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.user?.name || 'Șofer Fără Nume'}
                              </option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleAssignOrderToTruck(order.id, truck.id)}
                          disabled={assigning === order.id}
                          className={`w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5
                            ${isRecommended
                              ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/10'
                              : 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/10'
                            }
                          `}
                        >
                          {assigning === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isRecommended ? (
                            t('assign_btn')
                          ) : (
                            t('force_assign_btn')
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-border bg-surface/50 flex justify-end shrink-0">
                <button 
                  onClick={() => setSelectedOrderToAssign(null)} 
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
