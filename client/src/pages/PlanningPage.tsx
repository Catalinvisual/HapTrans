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
  const [dragOverTruck, setDragOverTruck] = useState<string | null>(null);
  const [draggingOrder, setDraggingOrder] = useState<any | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksRes, ordersRes, tripsRes, driversRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders'),
        api.get('/trips'),
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

  const handleDragStart = (e: React.DragEvent, order: any) => {
    e.dataTransfer.setData('orderId', order.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingOrder(order);
  };

  const handleDragEnd = () => {
    setDraggingOrder(null);
    setDragOverTruck(null);
  };

  const handleDragOver = (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTruck(truckId);
  };

  const handleDragLeave = () => setDragOverTruck(null);

  const handleDrop = async (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    setDragOverTruck(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;
    await assignOrderToTruck(orderId, truckId);
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
      const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
      if (trip) {
        await api.patch(`/trips/${trip.id}`, { driverId: driverId || null });
        toast.success('Șoferul a fost actualizat pe cursă!');
      } else {
        await api.post('/trips', {
          truckId,
          driverId: driverId || null,
          status: 'planning',
          tripNumber: `TR-${Date.now().toString().slice(-6)}`,
          pickupAddress: '',
          dropoffAddress: '',
          pickupDate: new Date().toISOString(),
          dropoffDate: new Date(Date.now() + 86400000).toISOString(),
        });
        toast.success('Cursă nouă creată cu șoferul selectat!');
      }
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
    const ordersList: any[] = [];

    // Map orders currently associated with stops/tasks of this trip
    if (trip.stops) {
      const seenOrders = new Set<string>();
      trip.stops.forEach((s: any) => {
        s.tasks?.forEach((t: any) => {
          if (t.order && !seenOrders.has(t.order.id)) {
            seenOrders.add(t.order.id);
            const fullOrder = orders.find(o => o.id === t.order.id);
            if (fullOrder) {
              ordersList.push(fullOrder);
              fullOrder.cargoItems?.forEach((cargo: any) => {
                weight += Number(cargo.weightKg || 0);
                ldm += Number(cargo.ldm || 0);
              });
            }
          }
        });
      });
    }

    return { weight, ldm, count: ordersList.length, orders: ordersList, tripId: trip.id, driverId: trip.driver?.id || null };
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Planificator HapCargo (TMS)</h1>
          <p className="text-sm text-text-secondary mt-1">Trageți comenzile nealocate peste camioane pentru a crea sau extinde rutele (LTL).</p>
        </div>
        <button onClick={loadData} className="btn-secondary flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Actualizează datele
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left panel: Unassigned Orders */}
        <div className="lg:col-span-4 bg-surface/30 rounded-2xl border border-border flex flex-col h-[75vh]">
          <div className="p-4 border-b border-border bg-white dark:bg-card flex justify-between items-center shrink-0">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Comenzi Nealocate
            </h2>
            <span className="badge badge-warning">{unassigned.length}</span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <CheckCircle2 className="w-16 h-16 text-green-400 mb-4 opacity-50" />
                <p className="font-medium text-text-primary">Toate comenzile sunt alocate!</p>
              </div>
            ) : (
              unassigned.map(order => {
                const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                const isBeingAssigned = assigning === order.id;
                
                const weight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
                const ldm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;

                // Color deadline indicator if dateFrom is close (within 24h)
                const isUrgent = pickup?.dateFrom && (new Date(pickup.dateFrom).getTime() - Date.now() < 86400000);

                return (
                  <div
                    key={order.id}
                    draggable={!isBeingAssigned}
                    onDragStart={e => handleDragStart(e, order)}
                    onDragEnd={handleDragEnd}
                    className={`bg-card border rounded-xl p-4 shadow-sm transition-all select-none
                      ${isBeingAssigned ? 'opacity-50 cursor-wait border-primary' :
                        draggingOrder?.id === order.id ? 'opacity-60 cursor-grabbing scale-[0.98] border-primary shadow-md' :
                        isUrgent 
                          ? 'border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/5 cursor-grab hover:border-red-400' 
                          : 'cursor-grab hover:border-primary/40 hover:shadow-md border-border'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-primary text-sm">
                          {order.orderNumber || order.referenceNumber || 'Comandă'}
                        </span>
                        <span className="ml-2 text-xs uppercase font-bold text-text-secondary">
                          ({(order.transportType || 'ftl').toUpperCase()})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-text-primary">€{order.price || '0'}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 my-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-text-secondary truncate" title={pickup?.address}>
                          {pickup?.companyName ? `${pickup.companyName} (${pickup.address || pickup.city})` : (pickup?.address || '—')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-text-secondary truncate" title={dropoff?.address}>
                          {dropoff?.companyName ? `${dropoff.companyName} (${dropoff.address || dropoff.city})` : (dropoff?.address || '—')}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-xs text-text-muted mt-2 pt-2 border-t border-border">
                      <span className="font-semibold text-text-secondary">
                        {weight} kg • {ldm.toFixed(1)} LDM
                      </span>
                      {pickup?.dateFrom && (
                        <span className={`flex items-center gap-1 font-semibold ${isUrgent ? 'text-red-500 font-bold' : ''}`}>
                          <Calendar className="w-3 h-3" />
                          {pickup.dateFrom}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel: Trucks & Drop Zones */}
        <div className="lg:col-span-8 flex flex-col h-[75vh] space-y-4">
          <div className="flex-1 overflow-y-auto bg-surface/30 rounded-2xl border border-border p-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {trucks.map(truck => {
                const isDragOver = dragOverTruck === truck.id;
                const stats = getTruckStats(truck.id);
                const maxWeight = truck.maxWeightKg || 24000;
                const maxLdm = truck.maxLdm || 13.6;

                const weightPct = Math.min(100, (stats.weight / maxWeight) * 100);
                const ldmPct = Math.min(100, (stats.ldm / maxLdm) * 100);

                const hasWarning = stats.weight > maxWeight || stats.ldm > maxLdm;

                return (
                  <div
                    key={truck.id}
                    onDragOver={e => handleDragOver(e, truck.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, truck.id)}
                    onClick={() => stats.tripId && setSelectedTripId(stats.tripId)}
                    className={`relative bg-card border-2 rounded-xl p-5 transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[220px]
                      ${isDragOver
                        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]'
                        : selectedTripId === stats.tripId && stats.tripId
                          ? 'border-primary shadow-sm bg-primary/5'
                          : 'border-border hover:border-primary/30 hover:bg-surface/50'
                      }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-text-primary text-lg flex items-center gap-2">
                            <TruckIcon className="w-5 h-5 text-primary" />
                            {truck.plateNumber}
                          </h3>
                          <div className="mt-2 text-xs">
                            <span className="text-text-secondary font-semibold">Șofer alocat:</span>
                            <select
                              value={stats.driverId || ''}
                              onChange={e => handleAssignDriver(truck.id, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              className="w-full text-xs bg-white dark:bg-card border border-border/80 rounded-lg p-1.5 font-semibold text-text-primary focus:outline-none focus:border-primary mt-1"
                            >
                              <option value="">Fără Șofer (Alege...)</option>
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
                            <AlertTriangle className="w-4 h-4" /> Supraîncărcare
                          </span>
                        )}
                      </div>

                      {/* Capacity progress bars */}
                      <div className="space-y-2.5 my-4">
                        <div>
                          <div className="flex justify-between text-xs font-semibold mb-1 text-text-secondary">
                            <span>Greutate: {stats.weight} / {maxWeight} kg</span>
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
                            <span>Metri podea: {stats.ldm.toFixed(1)} / {maxLdm} LDM</span>
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

                    <div className="pt-2 border-t border-border/60 flex justify-between items-center text-xs">
                      <span className="font-semibold text-text-secondary">
                        {stats.count} comenzi în cursă (LTL)
                      </span>
                      {stats.tripId && (
                        <span className="text-primary font-bold hover:underline">
                          Vezi Opriri &rarr;
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom panel: Stops sequencing */}
          {selectedTripId && (
            <div className="bg-card border border-border rounded-2xl p-4 flex flex-col shrink-0 min-h-[220px]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary" />
                  Secvența de Opriri (Stops Routing)
                </h3>
                <button 
                  onClick={() => setSelectedTripId(null)}
                  className="text-xs font-semibold text-text-secondary hover:text-red-500"
                >
                  Închide
                </button>
              </div>

              <div className="overflow-y-auto max-h-[200px] space-y-2 pr-1 custom-scrollbar">
                {trips.find(t => t.id === selectedTripId)?.stops?.sort((a: any, b: any) => a.sequence - b.sequence).map((stop: any, idx: number, arr: any[]) => (
                  <div key={stop.id} className="flex justify-between items-center bg-surface/50 border border-border p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {stop.sequence}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{stop.companyName || 'Oprire'}</p>
                        <p className="text-xs text-text-secondary">{stop.address}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => reorderStops(selectedTripId, stop.id, 'up')}
                        disabled={idx === 0}
                        className="p-1 hover:bg-surface rounded border border-border disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => reorderStops(selectedTripId, stop.id, 'down')}
                        disabled={idx === arr.length - 1}
                        className="p-1 hover:bg-surface rounded border border-border disabled:opacity-30"
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
      </div>
    </div>
  );
}
