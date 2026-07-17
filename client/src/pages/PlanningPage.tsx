import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Pagination from '../components/Pagination';
import { Truck as TruckIcon, Package, Loader2, MapPin, ArrowRight, CheckCircle2, AlertTriangle, ArrowUp, ArrowDown, Trash2, ExternalLink, Users } from 'lucide-react';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export default function PlanningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
      if (!silent) toast.error('Eroare la încărcarea datelor de planificare');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleAssignOrderToTruck = async (orderId: string, truckId: string) => {
    await assignOrderToTruck(orderId, truckId);
    setSelectedOrderToAssign(null);
  };

  const assignOrderToTruck = async (orderId: string, truckId: string) => {
    try {
      setAssigning(orderId);
      const truck = trucks.find(t => t.id === truckId);
      const order = orders.find(o => o.id === orderId);
      if (!truck || !order) {
        toast.error('Comanda sau camionul nu a fost găsit');
        return;
      }

      // Validate Assignment via Backend
      let warnings: string[] = [];
      try {
        const validateRes = await api.post('/planning/validate-assignment', { orderId, truckId });
        warnings = validateRes.data?.warnings || [];
      } catch {
        // validation not available, continue
      }

      if (warnings.length > 0) {
        const proceed = window.confirm(`${t('assignment_warnings', 'Atenție! Probleme detectate')}:\n\n${warnings.join('\n')}\n\n${t('proceed_question', 'Continuați?')}`);
        if (!proceed) return;
      }

      // Find if there is already a planning trip on this truck
      const existingTrip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');

      if (existingTrip) {
        await api.post(`/trips/${existingTrip.id}/assign-orders`, { orderIds: [orderId] });
        await api.patch(`/orders/${orderId}`, { status: 'assigned' });
        toast.success(`✅ Comandă adăugată la cursa existentă (${truck.plateNumber})`);
      } else {
        const tripRes = await api.post('/trips', {
          truckId,
          driverId: truck.driver?.id || null,
          status: 'planning',
          price: order.price ? Number(order.price) : undefined,
          currency: order.currency || 'EUR',
          tripNumber: order.orderNumber || order.referenceNumber || `TR-${Date.now().toString().slice(-6)}`,
          pickupAddress: order.stops?.find((s: any) => s.type === 'pickup')?.address || '',
          dropoffAddress: order.stops?.find((s: any) => s.type === 'dropoff')?.address || '',
          pickupDate: order.stops?.find((s: any) => s.type === 'pickup')?.scheduledDate || new Date().toISOString(),
          dropoffDate: order.stops?.find((s: any) => s.type === 'dropoff')?.scheduledDate || new Date(Date.now() + 86400000).toISOString(),
        });

        const newTripId = tripRes.data.id;
        await api.post(`/trips/${newTripId}/assign-orders`, { orderIds: [orderId] });
        await api.patch(`/orders/${orderId}`, { status: 'assigned' });
        toast.success(`✅ Cursă nouă creată și comanda asignată (${truck.plateNumber})`);
      }

      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(msg || 'Eroare la asignarea comenzii');
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
      await api.post(`/trips/${tripId}/stops/reorder`, { stopIds: sortedStops.map(s => s.id) });
      toast.success('Secvența de opriri actualizată!');
      loadData(true);
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
      loadData(true);
    } catch (e) {
      toast.error('Eroare la alocarea șoferului');
    }
  };

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/orders/${orderToDelete}`);
      toast.success('Comandă ștearsă cu succes');
      loadData();
    } catch (err) {
      toast.error('Eroare la ștergere');
    } finally {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (window.confirm('Confirmi ștergerea acestei curse?')) {
      try {
        await api.delete(`/trips/${tripId}`);
        toast.success('Cursă ștearsă cu succes');
        loadData();
      } catch (err) {
        toast.error('Eroare la ștergere');
      }
    }
  };

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (source.droppableId === 'unassigned-orders' && destination.droppableId !== 'unassigned-orders') {
      await assignOrderToTruck(draggableId, destination.droppableId);
    }
  };

  const unassigned = orders.filter(o => ['draft', 'unassigned', 'pending'].includes(o.status));

  // Helper to calculate totals for each truck's trip
  const getTruckStats = (truckId: string) => {
    const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
    if (!trip) return { weight: 0, ldm: 0, count: 0, orders: [], tripId: null, driverId: null, stops: [] };

    let weight = 0;
    let ldm = 0;
    const ordersList = trip.orders || [];

    ordersList.forEach((fullOrder: any) => {
      fullOrder.cargoItems?.forEach((cargo: any) => {
        weight += Number(cargo.weightKg || 0);
        ldm += Number(cargo.ldm || 0);
      });
    });

    return { weight, ldm, count: ordersList.length, orders: ordersList, tripId: trip.id, driverId: trip.driver?.id || null, stops: trip.stops || [] };
  };

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
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
      const lastStop = stats.stops?.sort((a: any, b: any) => b.sequence - a.sequence)[0];
      if (lastStop?.latitude && lastStop?.longitude) {
        distanceKm = getDistance(Number(lastStop.latitude), Number(lastStop.longitude), orderLat, orderLng);
        distanceType = 'last_stop';
      } else if (truck.lastLatitude && truck.lastLongitude) {
        distanceKm = getDistance(Number(truck.lastLatitude), Number(truck.lastLongitude), orderLat, orderLng);
        distanceType = 'current_loc';
      }
    }

    const isCompatible = weightFits && ldmFits;
    let badge = t('compatible', 'Compatibil');
    let color = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200';

    if (!weightFits) {
      badge = t('exceeds_weight', 'Depășit Greutate (+{{kg}} kg)', { kg: Math.round(stats.weight + orderWeight - maxWeight) });
      color = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200';
    } else if (!ldmFits) {
      badge = t('exceeds_ldm', 'Depășit LDM (+{{ldm}} LDM)', { ldm: (stats.ldm + orderLdm - maxLdm).toFixed(1) });
      color = 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200';
    }

    return { isCompatible, badge, color, distanceKm, distanceType };
  };

  const getSortedTrucks = (order: any) => {
    return trucks.map(truck => ({ truck, rec: getRecommendation(truck, order) }))
      .sort((a, b) => {
        if (a.rec.isCompatible && !b.rec.isCompatible) return -1;
        if (!a.rec.isCompatible && b.rec.isCompatible) return 1;
        if (a.rec.distanceKm !== null && b.rec.distanceKm !== null) return a.rec.distanceKm - b.rec.distanceKm;
        if (a.rec.distanceKm !== null && b.rec.distanceKm === null) return -1;
        if (a.rec.distanceKm === null && b.rec.distanceKm !== null) return 1;
        return 0;
      });
  };

  const paginatedUnassigned = unassigned.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1800px] mx-auto space-y-6">
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Main Layout: Left = Orders, Right = Trucks */}
        <div className="flex flex-col lg:flex-row gap-6 items-start">

          {/* ───────── LEFT COLUMN: Unassigned Orders ───────── */}
          <div className="w-full lg:flex-1 bg-card rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border bg-surface/30 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-text-primary text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {t('unassigned_orders', 'Comenzi Neasignate')}
              </h2>
              <span className="badge badge-warning text-xs px-3 py-1 font-bold">
                {unassigned.length} {t('active_orders_count_label', 'active')}
              </span>
            </div>

            {unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mb-3 opacity-60" />
                <p className="font-semibold text-text-primary">{t('no_unassigned_orders', 'Toate comenzile sunt planificate!')}</p>
              </div>
            ) : (
              <Droppable droppableId="unassigned-orders" direction="vertical">
                {(provided) => (
                  <>
                    <div className="overflow-x-auto">
                      <table
                        className="w-full text-left border-collapse min-w-[700px]"
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                      >
                        <thead>
                          <tr className="bg-surface/50 border-b border-border text-xs uppercase font-bold text-text-secondary">
                            <th className="p-4 pl-6">{t('ref_table_header', 'Referință')}</th>
                            <th className="p-4">{t('type_table_header', 'Tip')}</th>
                            <th className="p-4">{t('pickup_table_header', 'Pickup (Origine)')}</th>
                            <th className="p-4">{t('dropoff_table_header', 'Dropoff (Destinație)')}</th>
                            <th className="p-4">{t('cargo_table_header', 'Marfă')}</th>
                            <th className="p-4">{t('price_table_header', 'Preț')}</th>
                            <th className="p-4 pr-6 text-right">{t('action_table_header', 'Acțiune')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-sm">
                          {paginatedUnassigned.map((order, index) => {
                            const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                            const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                            const weight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
                            const ldm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;
                            const isUrgent = pickup?.dateFrom && (new Date(pickup.dateFrom).getTime() - Date.now() < 86400000);

                            return (
                              <Draggable key={order.id} draggableId={order.id} index={index}>
                                {(provided, snapshot) => (
                                  <tr
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`hover:bg-surface/20 transition-colors cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'bg-surface shadow-lg opacity-90 ring-2 ring-primary' : ''}`}
                                    style={{ ...provided.draggableProps.style, display: snapshot.isDragging ? 'table' : '' }}
                                  >
                                    <td className="p-4 pl-6">
                                      <span className="font-bold text-primary">{order.orderNumber || order.referenceNumber || '—'}</span>
                                      {isUrgent && <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 rounded">{t('urgent', 'Urgent')}</span>}
                                    </td>
                                    <td className="p-4">
                                      <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200">
                                        {(order.transportType || 'ftl').toUpperCase()}
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-medium text-text-primary truncate max-w-[140px]">{pickup?.companyName || pickup?.city || '—'}</div>
                                      <div className="text-xs text-text-secondary truncate max-w-[140px]">{pickup?.address || '—'}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="font-medium text-text-primary truncate max-w-[140px]">{dropoff?.companyName || dropoff?.city || '—'}</div>
                                      <div className="text-xs text-text-secondary truncate max-w-[140px]">{dropoff?.address || '—'}</div>
                                    </td>
                                    <td className="p-4">
                                      <span className="font-semibold text-text-primary">{weight} kg</span>
                                      <span className="text-text-secondary text-xs block">{ldm.toFixed(1)} LDM</span>
                                    </td>
                                    <td className="p-4 font-bold text-text-primary">€{order.price || '0.00'}</td>
                                    <td className="p-4 pr-6 text-right space-x-2">
                                      <button
                                        title="Plan Trip"
                                        onClick={() => setSelectedOrderToAssign(order)}
                                        className="btn-primary py-1.5 px-3 text-xs font-bold bg-primary hover:bg-primary/95 text-white rounded-lg inline-flex items-center gap-1.5 shadow-sm"
                                      >
                                        <TruckIcon className="w-4 h-4" /> {t('plan_trip', 'Planifică')}
                                      </button>
                                      <button
                                        title="Delete Order"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}
                                        className="p-1.5 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                )}
                              </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </tbody>
                      </table>
                    </div>

                    <Pagination
                      currentPage={currentPage}
                      totalItems={unassigned.length}
                      itemsPerPage={itemsPerPage}
                      onPageChange={setCurrentPage}
                      onItemsPerPageChange={setItemsPerPage}
                    />
                  </>
                )}
              </Droppable>
            )}
          </div>

          {/* ───────── RIGHT COLUMN: Active Fleet ───────── */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-text-primary text-lg">{t('active_fleet_title', 'Flotă Activă')}</h2>
            </div>

            {trucks.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <TruckIcon className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
                <p className="text-text-secondary text-sm">Niciun camion activ</p>
              </div>
            ) : (
              trucks.map(truck => {
                const stats = getTruckStats(truck.id);
                const maxWeight = truck.maxWeightKg || 24000;
                const maxLdm = truck.maxLdm || 13.6;
                const weightPct = Math.min(100, (stats.weight / maxWeight) * 100);
                const ldmPct = Math.min(100, (stats.ldm / maxLdm) * 100);
                const hasWarning = stats.weight > maxWeight || stats.ldm > maxLdm;

                return (
                  <Droppable key={truck.id} droppableId={truck.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`relative bg-card border rounded-2xl p-5 transition-all duration-200 shadow-sm
                          ${snapshot.isDraggingOver
                            ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg ring-2 ring-primary/50'
                            : 'border-border hover:border-primary/40 hover:shadow-md'
                          }`}
                      >
                        {/* Drag-over label */}
                        {snapshot.isDraggingOver && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none">
                            <span className="text-primary font-black text-base bg-white/90 dark:bg-card/90 px-4 py-2 rounded-xl shadow border border-primary/20">
                              ⬇ Plasează comanda aici
                            </span>
                          </div>
                        )}

                        {/* Truck header */}
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-text-primary text-base flex items-center gap-2">
                              <TruckIcon className="w-5 h-5 text-primary" />
                              {truck.plateNumber}
                              {truck.brand && <span className="text-xs font-normal text-text-secondary">({truck.brand})</span>}
                            </h3>
                            {hasWarning && (
                              <span className="text-red-500 flex items-center gap-1 text-xs font-bold mt-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> {t('overload_warning', 'Suprasarcină!')}
                              </span>
                            )}
                          </div>
                          {stats.tripId && (
                            <button
                              onClick={() => navigate(`/trips/${stats.tripId}`)}
                              className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/5 border border-primary/20 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-primary/10"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              {t('view_stops', 'Vezi Cursa')}
                            </button>
                          )}
                        </div>

                        {/* Driver assignment */}
                        <div className="mb-4">
                          <label className="text-xs font-semibold text-text-secondary flex items-center gap-1 mb-1">
                            <Users className="w-3.5 h-3.5" />
                            {t('assigned_driver', 'Șofer Alocat')}:
                          </label>
                          <select
                            value={truck.driver?.id || stats.driverId || ''}
                            onChange={e => handleAssignDriver(truck.id, e.target.value)}
                            onClick={e => e.stopPropagation()}
                            className="w-full text-xs bg-white dark:bg-card border border-border/80 rounded-lg p-2 font-semibold text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">{t('no_driver_select', 'Fără Șofer (Selectează...)')}</option>
                            {drivers.map((d: any) => (
                              <option key={d.id} value={d.id}>
                                {d.user?.name || 'Șofer'}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Capacity bars */}
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1 text-text-secondary">
                              <span>{t('weight_label', 'Greutate')}: {stats.weight.toLocaleString()} / {maxWeight.toLocaleString()} kg</span>
                              <span className={weightPct > 90 ? 'text-red-500' : ''}>{weightPct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-surface dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border border-border/40">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${stats.weight > maxWeight ? 'bg-red-500' : weightPct > 80 ? 'bg-orange-500' : 'bg-primary'}`}
                                style={{ width: `${weightPct}%` }}
                              />
                            </div>
                          </div>

                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1 text-text-secondary">
                              <span>{t('floor_meters_label', 'LDM')}: {stats.ldm.toFixed(1)} / {maxLdm} LDM</span>
                              <span className={ldmPct > 90 ? 'text-red-500' : ''}>{ldmPct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-surface dark:bg-gray-800 h-2.5 rounded-full overflow-hidden border border-border/40">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${stats.ldm > maxLdm ? 'bg-red-500' : ldmPct > 80 ? 'bg-orange-500' : 'bg-green-500'}`}
                                style={{ width: `${ldmPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Trip info footer */}
                        <div className="mt-4 pt-3 border-t border-border/60">
                          <div className="flex justify-between items-center text-xs text-text-secondary">
                            <span className="font-semibold">
                              {stats.count === 0
                                ? t('no_orders_in_truck', 'Nicio comandă asignată')
                                : `${stats.count} ${t('orders_in_trip_label', 'comenzi în cursă')}`}
                            </span>
                            {stats.tripId && (
                              <button
                                onClick={() => navigate(`/trips/${stats.tripId}`)}
                                className="text-primary font-bold hover:underline flex items-center gap-1"
                              >
                                <MapPin className="w-3.5 h-3.5" />
                                {stats.stops.length} {t('stops_count', 'opriri')}
                              </button>
                            )}
                          </div>

                          {/* Show orders in trip */}
                          {stats.orders.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {stats.orders.slice(0, 3).map((o: any) => (
                                <div key={o.id} className="flex items-center justify-between text-xs bg-surface/50 border border-border/40 rounded-lg px-2 py-1">
                                  <span className="font-bold text-primary">{o.orderNumber || o.referenceNumber || '—'}</span>
                                  <span className="text-text-secondary">{o.client?.name || '—'}</span>
                                </div>
                              ))}
                              {stats.orders.length > 3 && (
                                <p className="text-xs text-text-secondary text-center">+{stats.orders.length - 3} mai multe...</p>
                              )}
                            </div>
                          )}
                        </div>

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })
            )}
          </div>

        </div>
      </DragDropContext>

      {/* Delete Order Confirmation */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setOrderToDelete(null); }}
        onConfirm={confirmDelete}
        title={t('global_delete_title', 'Confirmare Ștergere')}
        message={t('global_delete_message', 'Ești sigur că vrei să ștergi această comandă? Acțiunea este ireversibilă.')}
      />

      {/* Smart Assign Modal */}
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
              style={{ maxHeight: '90vh' }}
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {t('smart_assign_title', 'Asignare Inteligentă')}: {order.orderNumber || order.referenceNumber}
                  </h2>
                  <p className="text-sm text-text-secondary mt-1">
                    {t('smart_assign_desc', 'Alege camionul optim recomandat de sistem.')}
                  </p>
                </div>
                <button onClick={() => setSelectedOrderToAssign(null)} className="text-text-secondary hover:text-red-500 font-semibold text-sm">
                  {t('close', 'Închide')}
                </button>
              </div>

              {/* Cargo Info strip */}
              <div className="bg-primary/5 p-4 border-b border-border/80 text-sm flex flex-wrap gap-x-6 gap-y-2 shrink-0 justify-between items-center">
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('route', 'Rută')}</span>
                  <span className="font-bold text-text-primary">
                    {pickup?.city || pickup?.address?.split(',')[0] || 'TBD'} → {dropoff?.city || dropoff?.address?.split(',')[0] || 'TBD'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('cargo_details', 'Marfă')}</span>
                  <span className="font-bold text-text-primary">
                    {orderWeight} kg • {orderLdm.toFixed(1)} LDM • {(order.transportType || 'ftl').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-text-secondary block text-xs uppercase tracking-wide">{t('agreed_price', 'Preț Agreat')}</span>
                  <span className="font-bold text-primary">€{order.price || '0.00'}</span>
                </div>
              </div>

              {/* List of recommended trucks */}
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                <h3 className="text-xs uppercase font-bold tracking-widest text-text-secondary mb-2">
                  {t('recommendations_title', 'Recomandări (sortate după proximitate)')}
                </h3>
                {sortedTrucks.map(({ truck, rec }) => {
                  const stats = getTruckStats(truck.id);
                  const maxWeight = truck.maxWeightKg || 24000;
                  const maxLdm = truck.maxLdm || 13.6;
                  const weightPct = Math.min(100, (stats.weight / maxWeight) * 100);
                  const ldmPct = Math.min(100, (stats.ldm / maxLdm) * 100);

                  return (
                    <div
                      key={truck.id}
                      className={`border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:bg-surface/30
                        ${rec.isCompatible ? 'border-green-200 dark:border-green-900/60 bg-green-50/30 dark:bg-green-950/10' : 'border-border'}`}
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-bold text-text-primary text-base flex items-center gap-1.5">
                            <TruckIcon className="w-5 h-5 text-primary" /> {truck.plateNumber}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border ${rec.color}`}>{rec.badge}</span>
                          {rec.distanceKm !== null && (
                            <span className="px-2 py-0.5 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 rounded-md">
                              📍 {rec.distanceKm.toFixed(0)} km {rec.distanceType === 'last_stop' ? t('from_last_stop', 'de la ultima oprire') : t('from_current_loc', 'de la locație curentă')}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-text-secondary mt-1">
                          <div>
                            <span>{t('weight_label', 'Greutate')}:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-24 bg-surface dark:bg-gray-800 h-1.5 rounded-full overflow-hidden border border-border/40">
                                <div className="h-full bg-primary" style={{ width: `${weightPct}%` }} />
                              </div>
                              <span>{stats.weight} + {orderWeight} / {maxWeight} kg</span>
                            </div>
                          </div>
                          <div>
                            <span>{t('floor_meters_label', 'LDM')}:</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="w-24 bg-surface dark:bg-gray-800 h-1.5 rounded-full overflow-hidden border border-border/40">
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
                            <option value="">{t('no_driver', 'Fără Șofer')}</option>
                            {drivers.map((d: any) => (
                              <option key={d.id} value={d.id}>{d.user?.name || 'Șofer'}</option>
                            ))}
                          </select>
                        </div>

                        <button
                          onClick={() => handleAssignOrderToTruck(order.id, truck.id)}
                          disabled={assigning === order.id}
                          className={`w-full sm:w-auto py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5
                            ${rec.isCompatible
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                            }`}
                        >
                          {assigning === order.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : rec.isCompatible ? (
                            t('assign_btn', 'Asignează')
                          ) : (
                            t('force_assign_btn', 'Forțează Asignare')
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
                  {t('cancel', 'Anulează')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
