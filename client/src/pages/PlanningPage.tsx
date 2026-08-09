import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, Trash2, ExternalLink, Users, X, Weight, ChevronRight, Calendar, Euro, ArrowRight, Info } from 'lucide-react';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import CustomSelect from '../components/CustomSelect';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// ─── Order Detail Drawer ──────────────────────────────────────────────────────
function OrderDetailDrawer({
  order,
  onClose,
  onPlanTrip,
  onDelete
}: {
  order: any;
  onClose: () => void;
  onPlanTrip: (order: any) => void;
  onDelete: (id: string) => void;
}) {
  const {
    t
  } = useTranslation();
  if (!order) return null;
  const pickup = order.stops?.find((s: any) => s.type === 'pickup');
  const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
  const weight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
  const ldm = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
  const volume = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.volumeCbm || 0), 0) || 0;
  const qty = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.quantity || 1), 0) || 0;
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    new: 'bg-blue-100 text-blue-700 border-blue-200',
    planned: 'bg-orange-100 text-orange-700 border-orange-200',
    unassigned: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    assigned: 'bg-purple-100 text-purple-700 border-purple-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };
  return typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-card shadow-2xl flex flex-col h-full overflow-y-auto border-l border-border" style={{
      animation: 'slideInRight 0.22s ease-out'
    }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-surface/40 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-text-primary">{order.orderNumber || order.referenceNumber || '—'}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border uppercase ${statusColors[order.status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                {order.status}
              </span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 border border-blue-200">
                {(order.transportType || 'FTL').toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1">{order.client?.name || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 space-y-5">

          {/* Route */}
          <div className="bg-surface/50 rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {t('route_section', 'Rută')}
            </h3>
            <div className="space-y-3">
              {pickup && <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-600 uppercase">{t('loading_stop', '📦 ÎNCĂRCARE')}</p>
                    <p className="font-semibold text-sm text-text-primary">{pickup.companyName || pickup.city || 'TBD'}</p>
                    <p className="text-xs text-text-secondary">{pickup.address || '—'}</p>
                    {pickup.dateFrom && <p className="text-xs text-blue-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(pickup.dateFrom).toLocaleDateString()}
                      </p>}
                  </div>
                </div>}
              {pickup && dropoff && <div className="ml-3 border-l-2 border-dashed border-border h-3" />}
              {dropoff && <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-green-600 uppercase">{t('unloading_stop', '🚛 DESCĂRCARE')}</p>
                    <p className="font-semibold text-sm text-text-primary">{dropoff.companyName || dropoff.city || 'TBD'}</p>
                    <p className="text-xs text-text-secondary">{dropoff.address || '—'}</p>
                    {dropoff.dateFrom && <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(dropoff.dateFrom).toLocaleDateString()}
                      </p>}
                  </div>
                </div>}
            </div>
          </div>

          {/* Cargo */}
          <div className="bg-surface/50 rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" /> {t('cargo_section', 'Marfă')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-lg p-3 border border-border/60">
                <p className="text-xs text-text-secondary">{t('weight_kg', 'Greutate')}</p>
                <p className="font-black text-lg text-text-primary">{weight.toLocaleString()} <span className="text-sm font-semibold">kg</span></p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/60">
                <p className="text-xs text-text-secondary">{t("jsx_lDM")}</p>
                <p className="font-black text-lg text-text-primary">{ldm.toFixed(1)} <span className="text-sm font-semibold">{t("jsx_lDM")}</span></p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/60">
                <p className="text-xs text-text-secondary">{t('volume_cbm', 'Volum')}</p>
                <p className="font-black text-lg text-text-primary">{volume.toFixed(1)} <span className="text-sm font-semibold">m³</span></p>
              </div>
              <div className="bg-card rounded-lg p-3 border border-border/60">
                <p className="text-xs text-text-secondary">{t('quantity_pcs', 'Cantitate')}</p>
                <p className="font-black text-lg text-text-primary">{qty} <span className="text-sm font-semibold">{t("jsx_buc")}</span></p>
              </div>
            </div>

            {order.cargoItems && order.cargoItems.length > 0 && <div className="mt-3 space-y-1.5">
                {order.cargoItems.map((item: any, idx: number) => <div key={idx} className="text-xs flex justify-between items-center bg-card border border-border/40 rounded-lg px-2.5 py-1.5">
                    <span className="font-semibold">{item.quantity}x {item.type} <span className="text-text-secondary font-normal">{item.description ? `— ${item.description}` : ''}</span></span>
                    <span className="text-text-secondary">{item.weightKg} kg{item.ldm > 0 ? ` · ${item.ldm} LDM` : ''}</span>
                  </div>)}
              </div>}
          </div>

          {/* Financial */}
          <div className="bg-surface/50 rounded-xl border border-border p-4">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Euro className="w-3.5 h-3.5" />{t("jsx_financiar")}</h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center bg-blue-50 dark:bg-blue-950/20 rounded-lg p-2.5 border border-blue-100 dark:border-blue-900/30">
                <p className="text-[10px] text-blue-600 font-bold uppercase">{t("jsx_pre")}</p>
                <p className="font-black text-base text-blue-700">€{order.price || 0}</p>
              </div>
              <div className="text-center bg-red-50 dark:bg-red-950/20 rounded-lg p-2.5 border border-red-100 dark:border-red-900/30">
                <p className="text-[10px] text-red-600 font-bold uppercase">{t("jsx_costEst")}</p>
                <p className="font-black text-base text-red-700">€{order.estimatedCost || 0}</p>
              </div>
              <div className="text-center bg-green-50 dark:bg-green-950/20 rounded-lg p-2.5 border border-green-100 dark:border-green-900/30">
                <p className="text-[10px] text-green-600 font-bold uppercase">{t("jsx_profit")}</p>
                <p className="font-black text-base text-green-700">€{order.estimatedProfit || 0}</p>
              </div>
            </div>
          </div>

          {/* References */}
          {(order.customerReference || order.cmrReference || order.loadingReference || order.internalNotes) && <div className="bg-surface/50 rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />{t("jsx_referinE")}</h3>
              <div className="space-y-1.5 text-sm">
                {order.customerReference && <div className="flex justify-between"><span className="text-text-secondary text-xs">{t("jsx_refClient")}</span><span className="font-bold text-xs">{order.customerReference}</span></div>}
                {order.cmrReference && <div className="flex justify-between"><span className="text-text-secondary text-xs">{t("jsx_cMR")}</span><span className="font-bold text-xs">{order.cmrReference}</span></div>}
                {order.loadingReference && <div className="flex justify-between"><span className="text-text-secondary text-xs">{t("jsx_refNcRcare")}</span><span className="font-bold text-xs">{order.loadingReference}</span></div>}
                {order.internalNotes && <div className="mt-2 pt-2 border-t border-border"><p className="text-xs text-text-secondary">{t("jsx_noteInterne")}</p><p className="text-sm mt-0.5">{order.internalNotes}</p></div>}
              </div>
            </div>}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-border bg-surface/40 shrink-0 flex gap-2">
          <button onClick={() => {
          onDelete(order.id);
          onClose();
        }} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/30 transition-colors" title="Șterge comandă">
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={() => {
          onClose();
          onPlanTrip(order);
        }} className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm">
            <TruckIcon className="w-4 h-4" />{t("jsx_planificPeCa")}</button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>, document.body) : null;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedOrderToAssign, setSelectedOrderToAssign] = useState<any | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverTruckId, setDragOverTruckId] = useState<string | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [trucksRes, ordersRes, tripsRes, driversRes] = await Promise.all([api.get('/trucks'), api.get('/orders?status=draft,new,pending'), api.get('/trips?status=planning,planned,dispatched,assigned,driver_accepted,started,loading,driving,partially_delivered'), api.get('/drivers')]);
      setTrucks(trucksRes.data.filter((t: any) => t.status === 'active'));
      setOrders(ordersRes.data);
      setTrips(tripsRes.data);
      setDrivers(driversRes.data);
    } catch (e) {
      console.error(e);
      if (!silent) toast.error(t("toast_eroareLaNcR"));
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);
  const assignOrderToTruck = async (orderId: string, truckId: string) => {
    try {
      setAssigning(orderId);
      const truck = trucks.find(t => t.id === truckId);
      const order = orders.find(o => o.id === orderId);
      if (!truck || !order) {
        toast.error(t("toast_comandaSauCam"));
        return;
      }
      let warnings: string[] = [];
      try {
        const validateRes = await api.post('/planning/validate-assignment', {
          orderId,
          truckId
        });
        warnings = validateRes.data?.warnings || [];
      } catch {/* validation not available */}
      if (warnings.length > 0) {
        const proceed = window.confirm(`Atenție! Probleme detectate:\n\n${warnings.join('\n')}\n\nContinuați?`);
        if (!proceed) return;
      }
      // Smart TMS logic: find the right trip to add the order to
      const { trip: targetTrip, isNew } = getTargetTripForOrder(truckId, order);

      const pickupStop = order.stops?.find((s: any) => s.type === 'pickup');
      const dropoffStop = order.stops?.find((s: any) => s.type === 'dropoff');

      if (!isNew && targetTrip) {
        // GROUPAGE: Add to existing planned trip in same time window
        await api.post(`/trips/${targetTrip.id}/assign-orders`, { orderIds: [orderId] });
        toast.success(`✅ Comanda adăugată la Cursa ${targetTrip.tripNumber || ''} (${truck.plateNumber})`);
      } else {
        // NEW TRIP: Create a dedicated trip and assign
        const tripRes = await api.post('/trips', {
          truckId,
          driverId: truck.driver?.id || null,
          status: 'planned',
          price: order.price ? Number(order.price) : undefined,
          currency: order.currency || 'EUR',
          plannedDeparture: pickupStop?.dateFrom || pickupStop?.scheduledDate || new Date().toISOString(),
          plannedArrival: dropoffStop?.dateFrom || dropoffStop?.scheduledDate || new Date(Date.now() + 86400000).toISOString(),
          pickupAddress: pickupStop?.address || '',
          dropoffAddress: dropoffStop?.address || '',
        });
        await api.post(`/trips/${tripRes.data.id}/assign-orders`, { orderIds: [orderId] });
        toast.success(`✅ Cursă nouă creată pentru ${truck.plateNumber}`);
      }
      await loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || err?.message || 'Eroare la asignarea comenzii');
    } finally {
      setAssigning(null);
    }
  };
  const handleAssignDriver = async (truckId: string, driverId: string) => {
    try {
      await api.patch(`/trucks/${truckId}`, {
        driverId: driverId || null
      });
      const activeStatuses = ['planning', 'planned', 'dispatched', 'assigned', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];
      const trip = trips.find(tr => tr.truck?.id === truckId && activeStatuses.includes(tr.status));
      if (trip) await api.patch(`/trips/${trip.id}`, {
        driverId: driverId || null
      });
      toast.success(t("toast_OferAlocat"));
      loadData(true);
    } catch {
      toast.error(t("toast_eroareLaAloca"));
    }
  };
  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/orders/${orderToDelete}`);
      toast.success(t("toast_comandTears"));
      loadData();
    } catch {
      toast.error(t("toast_eroareLaTerg"));
    } finally {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };
  // ── Native HTML5 Drag handlers ──────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingOrderId(orderId);
  };

  const handleDragEnd = () => {
    setDraggingOrderId(null);
    setDragOverTruckId(null);
  };

  const handleTruckDragOver = (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTruckId(truckId);
  };

  const handleTruckDragLeave = (e: React.DragEvent) => {
    // Only clear if truly leaving the truck card (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverTruckId(null);
    }
  };

  const handleTruckDrop = async (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    setDragOverTruckId(null);
    setDraggingOrderId(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (orderId) {
      await assignOrderToTruck(orderId, truckId);
    }
  };

  const unassigned = orders.filter(o => ['draft', 'new', 'pending'].includes(o.status));
  const filteredUnassigned = searchQuery ? unassigned.filter(o => (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || o.stops?.some((s: any) => (s.address || '').toLowerCase().includes(searchQuery.toLowerCase()))) : unassigned;
  // TMS Logic: a truck can have multiple trips planned (sequential).
  // We show ONE trip at a time: the ACTIVE trip if currently on road,
  // or the NEXT PLANNED trip. Capacity = that single trip's load only.
  const IN_PROGRESS_STATUSES = ['dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];
  const PLANNED_STATUSES = ['planning', 'planned', 'assigned'];

  const getTruckAllTrips = (truckId: string) => {
    const all = trips.filter(tr => tr.truck?.id === truckId);
    const inProgress = all.filter(tr => IN_PROGRESS_STATUSES.includes(tr.status));
    const planned = all
      .filter(tr => PLANNED_STATUSES.includes(tr.status))
      .sort((a: any, b: any) => {
        const da = a.plannedDeparture ? new Date(a.plannedDeparture).getTime() : new Date(a.createdAt || 0).getTime();
        const db = b.plannedDeparture ? new Date(b.plannedDeparture).getTime() : new Date(b.createdAt || 0).getTime();
        return da - db;
      });
    return { inProgress, planned, all };
  };

  const getTruckStats = (truckId: string) => {
    const empty = { weight: 0, ldm: 0, pallets: 0, count: 0, orders: [], tripId: null, tripNumber: null, driverId: null, stops: [], isActive: false, status: null, plannedDeparture: null, futureTripsCount: 0 };
    const { inProgress, planned, all } = getTruckAllTrips(truckId);
    // Priority: active trip first, then next planned
    const currentTrip: any = inProgress[0] || planned[0] || null;
    if (!currentTrip) return empty;

    let weight = 0, ldm = 0, pallets = 0;
    (currentTrip.orders || []).forEach((o: any) => o.cargoItems?.forEach((c: any) => {
      weight += Number(c.weightKg || 0);
      ldm += Number(c.ldm || 0);
      pallets += Number(c.quantity || 0);
    }));

    const isActive = IN_PROGRESS_STATUSES.includes(currentTrip.status);
    const futureTripsCount = all.filter(tr =>
      [...IN_PROGRESS_STATUSES, ...PLANNED_STATUSES].includes(tr.status) && tr.id !== currentTrip.id
    ).length;

    return {
      weight, ldm, pallets,
      count: (currentTrip.orders || []).length,
      orders: currentTrip.orders || [],
      tripId: currentTrip.id,
      tripNumber: currentTrip.tripNumber,
      driverId: currentTrip.driver?.id || null,
      stops: currentTrip.stops || [],
      isActive,
      status: currentTrip.status,
      plannedDeparture: currentTrip.plannedDeparture,
      futureTripsCount,
    };
  };

  // Find which trip an order should be added to when assigned to this truck.
  // Uses time-window matching (within 3 days) for groupage logic.
  const getTargetTripForOrder = (truckId: string, order: any) => {
    const { inProgress, planned } = getTruckAllTrips(truckId);
    const orderPickupDate = order.stops?.find((s: any) => s.type === 'pickup')?.dateFrom
      || order.stops?.find((s: any) => s.type === 'pickup')?.scheduledDate;

    const findSamePeriodTrip = (tripList: any[]) => {
      if (!orderPickupDate) return tripList[0] || null; // no date = use first
      const pickupTime = new Date(orderPickupDate).getTime();
      return tripList.find((tr: any) => {
        if (!tr.plannedDeparture) return true;
        const diff = Math.abs(pickupTime - new Date(tr.plannedDeparture).getTime());
        return diff <= 3 * 24 * 60 * 60 * 1000; // within 3 days
      }) || null;
    };

    if (inProgress.length === 0 && planned.length > 0) {
      const match = findSamePeriodTrip(planned);
      if (match) return { trip: match, isNew: false };
    }
    return { trip: null, isNew: true }; // create a new trip
  };
  const getRecommendation = (truck: any, order: any) => {
    const { trip: targetTrip, isNew } = getTargetTripForOrder(truck.id, order);
    const orderWeight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
    const orderLdm = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
    const orderPallets = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.quantity || 0), 0) || 0;
    const maxWeight = truck.maxWeightKg || 24000;
    const maxLdm = truck.maxLdm || 13.6;
    const maxPallets = truck.maxPallets || 33;
    // Current load of the TARGET trip (not all trips combined!)
    let currentWeight = 0, currentLdm = 0, currentPallets = 0;
    if (!isNew && targetTrip) {
      (targetTrip.orders || []).forEach((o: any) => o.cargoItems?.forEach((c: any) => {
        currentWeight += Number(c.weightKg || 0);
        currentLdm += Number(c.ldm || 0);
        currentPallets += Number(c.quantity || 0);
      }));
    }
    const isCompatible = isNew || (
      currentWeight + orderWeight <= maxWeight
      && currentLdm + orderLdm <= maxLdm
      && currentPallets + orderPallets <= maxPallets
    );
    let badge = isNew
      ? `+ Cursă nouă`
      : t('compatible', 'Compatibil');
    let color = isNew
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-green-100 text-green-800 border-green-200';
    if (!isNew) {
      if (currentWeight + orderWeight > maxWeight) {
        badge = `Dep. Greutate (+${Math.round(currentWeight + orderWeight - maxWeight)} kg)`;
        color = 'bg-red-100 text-red-800 border-red-200';
      } else if (currentLdm + orderLdm > maxLdm) {
        badge = `Dep. LDM`;
        color = 'bg-orange-100 text-orange-800 border-orange-200';
      } else if (currentPallets + orderPallets > maxPallets) {
        badge = `Dep. Paleți`;
        color = 'bg-orange-100 text-orange-800 border-orange-200';
      }
    }
    return { isCompatible, badge, color, isNew, targetTrip, currentWeight, currentLdm, currentPallets };
  };
  const getSortedTrucks = (order: any) => trucks.map(truck => ({
    truck,
    rec: getRecommendation(truck, order)
  })).sort((a, b) => a.rec.isCompatible === b.rec.isCompatible ? 0 : a.rec.isCompatible ? -1 : 1);
  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  return <div className="pt-2 px-4 md:px-6 lg:px-8 pb-8 max-w-[1800px] mx-auto h-full">
      <div className="flex gap-6 items-start">

          {/* ═══════════════════════════════════════
              LEFT — Compact Order Cards
           ════════════════════════════════════════ */}
          <div className="w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-text-primary text-base flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                {t('unassigned_orders', 'Comenzi Neasignate')}
              </h2>
              <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                {unassigned.length}
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <input type="text" placeholder={t('search_order_placeholder', 'Caută comandă...')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="input w-full text-xs py-2 pl-3 pr-8" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500">
                  <X className="w-3.5 h-3.5" />
                </button>}
            </div>

            {/* Empty state */}
            {filteredUnassigned.length === 0 && <div className="bg-card border border-border rounded-2xl py-10 flex flex-col items-center text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 mb-2 opacity-60" />
                <p className="text-sm font-semibold text-text-primary">
                  {unassigned.length === 0 ? t("allOrdersPlanned") : t('noResult')}
                </p>
              </div>}

            {/* Order cards droppable zone */}
            <div className="space-y-2">
                {filteredUnassigned.map((order, index) => {
                const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                const weight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
                const isUrgent = pickup?.dateFrom && new Date(pickup.dateFrom).getTime() - Date.now() < 86400000 * 2;
                const isBeingDragged = draggingOrderId === order.id;
                return <div
                  key={order.id}
                  draggable
                  onDragStart={e => handleDragStart(e, order.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-card border rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all select-none
                              ${isBeingDragged ? 'opacity-40 scale-95 border-primary' : 'border-border hover:border-primary/40 hover:shadow-md'}`}
                >
                            {/* Top row */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-primary text-sm truncate">
                                  {order.orderNumber || order.referenceNumber || '—'}
                                </span>
                                {isUrgent && <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-100 text-red-600 border border-red-200 rounded shrink-0">{t("jsx_uRGENT")}</span>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  {(order.transportType || 'FTL').toUpperCase()}
                                </span>
                                {/* Detail button */}
                                <button onClick={e => {
                          e.stopPropagation();
                          setSelectedOrderDetail(order);
                        }} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-primary transition-colors" title="Detalii comandă">
                                  <Info className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Route row */}
                            <div className="flex items-center gap-1 mt-1.5 text-xs text-text-secondary truncate">
                              <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                              <span className="truncate">{pickup?.city || pickup?.address?.split(',')[0] || '—'}</span>
                              <ArrowRight className="w-3 h-3 shrink-0 mx-0.5" />
                              <MapPin className="w-3 h-3 text-green-400 shrink-0" />
                              <span className="truncate">{dropoff?.city || dropoff?.address?.split(',')[0] || '—'}</span>
                            </div>

                            {/* Bottom row */}
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs text-text-secondary">
                                {weight > 0 ? `${weight.toLocaleString()} kg` : '—'} · {order.client?.name || '—'}
                              </span>
                              <span className="text-xs font-bold text-primary">€{order.price || '0'}</span>
                            </div>
                          </div>;
              })}
                </div>

            {/* Hint */}
            <p className="text-center text-[10px] text-text-muted py-1">
              {t('drag_hint', '☰ Trage comanda pe un camion din dreapta')} <Info className="inline w-3 h-3" />
            </p>
          </div>

          {/* ═══════════════════════════════════════
              RIGHT — Trucks / Active Fleet
           ════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <TruckIcon className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-text-primary text-lg">{t('active_fleet_title', 'Flotă Activă')}</h2>
              <span className="text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">{trucks.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {trucks.length === 0 ? <div className="col-span-3 bg-card border border-border rounded-2xl p-12 text-center">
                  <TruckIcon className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
                  <p className="text-text-secondary text-sm">{t("jsx_niciunCamionA")}</p>
                </div> : trucks.map(truck => {
              const stats = getTruckStats(truck.id);
              const maxWeight = truck.maxWeightKg || 24000;
              const maxLdm = truck.maxLdm || 13.6;
              const maxPallets = truck.maxPallets || 33;
              const weightPct = Math.min(100, stats.weight / maxWeight * 100);
              const ldmPct = Math.min(100, stats.ldm / maxLdm * 100);
              const palletPct = Math.min(100, (stats.pallets || 0) / maxPallets * 100);
              const hasWarning = stats.weight > maxWeight || stats.ldm > maxLdm || (stats.pallets || 0) > maxPallets;
              return <div
                    key={truck.id}
                    onDragOver={e => handleTruckDragOver(e, truck.id)}
                    onDragLeave={handleTruckDragLeave}
                    onDrop={e => handleTruckDrop(e, truck.id)}
                    className={`relative bg-card border rounded-2xl p-5 transition-all duration-200 shadow-sm flex flex-col min-h-[200px]
                          ${dragOverTruckId === truck.id ? 'border-primary bg-primary/8 shadow-xl ring-2 ring-primary/40' : 'border-border hover:border-primary/30 hover:shadow-md'}`}>
                      {/* Drop overlay */}
                      {dragOverTruckId === truck.id && <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none z-10">
                            <div className="bg-primary text-white font-black text-sm px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                              <TruckIcon className="w-4 h-4" /> {t('drop_here_label', 'Plasează aici')}
                            </div>
                          </div>}

                        {/* Truck header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h3 className="font-bold text-text-primary text-base flex items-center gap-1.5">
                                <TruckIcon className="w-4 h-4 text-primary" />
                                {truck.plateNumber}
                                {truck.brand && <span className="text-xs text-text-secondary font-normal">({truck.brand})</span>}
                              </h3>
                              {stats.isActive
                                ? <span className="px-1.5 py-0.5 text-[9px] font-black rounded border bg-green-100 text-green-700 border-green-200 uppercase">🟢 În Cursă</span>
                                : stats.tripId
                                ? <span className="px-1.5 py-0.5 text-[9px] font-black rounded border bg-blue-100 text-blue-700 border-blue-200 uppercase">📋 Planificat</span>
                                : <span className="px-1.5 py-0.5 text-[9px] font-black rounded border bg-surface text-text-muted border-border uppercase">Liber</span>}
                              {stats.futureTripsCount > 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded border bg-purple-100 text-purple-700 border-purple-200">+{stats.futureTripsCount} cursă</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-blue-50 text-blue-700 border-blue-200">
                                {truck.truckType === 'frigo' ? 'Frigo' : truck.truckType === 'mega' ? 'Mega' : truck.truckType === 'flatbed' ? 'Flatbed' : truck.truckType === 'box' ? 'Box' : truck.truckType === 'isoterm' ? 'Izoterm' : 'Tautliner'}
                              </span>
                              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-gray-100 text-gray-700 border-gray-200">
                                {truck.euronorm || 'Euro 6'}
                              </span>
                              {truck.features?.includes('adr') && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-red-50 text-red-700 border-red-200">ADR</span>}
                              {truck.features?.includes('lift') && <span className="px-1.5 py-0.5 text-[9px] font-bold rounded border bg-orange-50 text-orange-700 border-orange-200">Lift</span>}
                            </div>
                            {hasWarning && <span className="text-red-500 flex items-center gap-1 text-xs font-bold mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />{t("jsx_suprasarcin")}</span>}
                          </div>
                          {stats.tripId && <button onClick={() => navigate(`/trips/${stats.tripId}`)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/5 border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors">
                              <ExternalLink className="w-3 h-3" /> {stats.tripNumber || t('truck_label', 'Cursă')}
                            </button>}
                        </div>

                        {/* Driver */}
                        <div className="mb-3">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3" /> {t('assigned_driver', 'Șofer')}
                          </label>
                          <div onClick={e => e.stopPropagation()}>
                            <CustomSelect value={truck.driver?.id || stats.driverId || ''} onChange={val => handleAssignDriver(truck.id, val)} options={[{
                            value: '',
                            label: t('no_driver_option', 'Fără Șofer')
                          }, ...drivers.map((d: any) => ({
                            value: d.id,
                            label: d.user?.name || 'Șofer'
                          }))]} className="w-full text-xs" />
                          </div>
                        </div>

                        {/* Capacity bars */}
                        <div className="space-y-2 mb-3">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-0.5 text-text-secondary">
                              <span>{t("jsx_greutate")}{stats.weight.toLocaleString()} / {maxWeight.toLocaleString()} kg</span>
                              <span className={weightPct > 90 ? 'text-red-500' : ''}>{weightPct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/30">
                              <div className={`h-full rounded-full transition-all duration-500 ${stats.weight > maxWeight ? 'bg-red-500' : weightPct > 80 ? 'bg-orange-400' : 'bg-primary'}`} style={{
                          width: `${weightPct}%`
                        }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-0.5 text-text-secondary">
                              <span>{t("jsx_lDM")}{stats.ldm.toFixed(1)} / {maxLdm}{t("jsx_lDM")}</span>
                              <span className={ldmPct > 90 ? 'text-red-500' : ''}>{ldmPct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/30">
                              <div className={`h-full rounded-full transition-all duration-500 ${stats.ldm > maxLdm ? 'bg-red-500' : ldmPct > 80 ? 'bg-orange-400' : 'bg-green-500'}`} style={{
                          width: `${ldmPct}%`
                        }} />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-0.5 text-text-secondary">
                              <span>{t('pallets', 'Paleți')} {stats.pallets || 0} / {maxPallets}</span>
                              <span className={palletPct > 90 ? 'text-red-500' : ''}>{palletPct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border/30">
                              <div className={`h-full rounded-full transition-all duration-500 ${(stats.pallets || 0) > maxPallets ? 'bg-red-500' : palletPct > 80 ? 'bg-orange-400' : 'bg-orange-500'}`} style={{
                          width: `${palletPct}%`
                        }} />
                            </div>
                          </div>
                        </div>

                        {/* Orders in current trip */}
                        <div className="mt-auto pt-3 border-t border-border/60">
                          {!stats.tripId ? (
                            <p className="text-[11px] text-text-muted text-center py-2 italic">Camion liber · Trage o comandă aici</p>
                          ) : (
                            <>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] font-bold text-text-secondary">
                                  {stats.count === 0 ? 'Nicio comandă' : `${stats.count} comenzi în cursă`}
                                  {stats.stops.length > 0 && <span className="ml-1 text-primary">· {stats.stops.length} opriri</span>}
                                </p>
                                {stats.plannedDeparture && (
                                  <span className="text-[9px] text-text-muted flex items-center gap-0.5">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(stats.plannedDeparture).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' })}
                                  </span>
                                )}
                              </div>
                              {stats.orders.slice(0, 3).map((o: any) => <div key={o.id} className="flex items-center justify-between text-[11px] bg-surface/60 border border-border/30 rounded-lg px-2 py-1 mb-1">
                                  <span className="font-bold text-primary">{o.orderNumber || o.referenceNumber || '—'}</span>
                                  <span className="text-text-secondary truncate ml-2">{o.client?.name || '—'}</span>
                                </div>)}
                              {stats.orders.length > 3 && <p className="text-[10px] text-text-muted text-center">+{stats.orders.length - 3} mai multe</p>}
                            </>
                          )}
                        </div>

                      </div>;
            })}
            </div>
          </div>

        </div>

      {/* Order Detail Drawer */}
      {selectedOrderDetail && <OrderDetailDrawer order={selectedOrderDetail} onClose={() => setSelectedOrderDetail(null)} onPlanTrip={order => {
      setSelectedOrderDetail(null);
      setSelectedOrderToAssign(order);
    }} onDelete={id => {
      setOrderToDelete(id);
      setDeleteModalOpen(true);
    }} />}

      {/* Delete Confirmation */}
      <ConfirmDeleteModal isOpen={deleteModalOpen} onClose={() => {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }} onConfirm={confirmDelete} title="Confirmare Ștergere" message="Ești sigur că vrei să ștergi această comandă? Acțiunea este ireversibilă." />

      {/* Smart Assign Modal */}
      {selectedOrderToAssign && (() => {
      const order = selectedOrderToAssign;
      const pickup = order.stops?.find((s: any) => s.type === 'pickup');
      const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
      const orderWeight = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
        const orderLdm = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;
        const orderPallets = order.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.quantity || 0), 0) || 0;
        const sortedTrucks = getSortedTrucks(order);
      return typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{
        backdropFilter: 'blur(4px)',
        backgroundColor: 'rgba(0,0,0,0.55)'
      }}>
            <div className="relative w-full max-w-2xl bg-card shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{
          maxHeight: '85vh'
        }}>
              <div className="px-6 py-4 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-text-primary">{t("jsx_asignareInteli")}{order.orderNumber || order.referenceNumber}</h2>
                  <p className="text-xs text-text-secondary mt-0.5">{t("jsx_alegeCamionul")}</p>
                </div>
                <button onClick={() => setSelectedOrderToAssign(null)} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-primary/5 px-6 py-3 border-b border-border/80 text-xs flex flex-wrap gap-x-6 gap-y-1 shrink-0 items-center">
                <span className="font-semibold text-text-secondary">{t("jsx_rut")}</span>
                <span className="font-bold">{pickup?.city || '?'} → {dropoff?.city || '?'}</span>
                <span className="font-semibold text-text-secondary">{t("jsx_marf")}</span>
                <span className="font-bold">{orderWeight}{t("jsx_kg")}{orderLdm.toFixed(1)}{t("jsx_lDM")}</span>
                <span className="font-semibold text-text-secondary">{t("jsx_pre")}</span>
                <span className="font-bold text-primary">€{order.price || 0}</span>
              </div>

              <div className="p-5 overflow-y-auto space-y-3 flex-1">
                {sortedTrucks.map(({
              truck,
              rec
            }) => {
              const stats = getTruckStats(truck.id);
              const maxWeight = truck.maxWeightKg || 24000;
              const maxLdm = truck.maxLdm || 13.6;
              const maxPallets = truck.maxPallets || 33;
              const weightPct = Math.min(100, (stats.weight + orderWeight) / maxWeight * 100);
              const ldmPct = Math.min(100, (stats.ldm + orderLdm) / maxLdm * 100);
              const palletPct = Math.min(100, ((stats.pallets || 0) + orderPallets) / maxPallets * 100);
              return <div key={truck.id} className={`border rounded-xl p-4 flex justify-between items-center gap-4 hover:bg-surface/30 transition-all ${rec.isCompatible ? 'border-green-200 bg-green-50/20' : 'border-border'}`}>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-text-primary flex items-center gap-1.5"><TruckIcon className="w-4 h-4 text-primary" />{truck.plateNumber}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase rounded border ${rec.color}`}>{rec.badge}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <div className="flex justify-between text-text-secondary mb-0.5"><span>{t("jsx_greutate")}</span><span>{stats.weight}+{orderWeight}/{maxWeight}kg</span></div>
                            <div className="w-full bg-surface h-1.5 rounded-full"><div className="h-full bg-primary rounded-full" style={{
                          width: `${weightPct}%`
                        }} /></div>
                          </div>
                          <div>
                            <div className="flex justify-between text-text-secondary mb-0.5"><span>{t("jsx_lDM")}</span><span>{stats.ldm.toFixed(1)}+{orderLdm.toFixed(1)}/{maxLdm}</span></div>
                            <div className="w-full bg-surface h-1.5 rounded-full"><div className="h-full bg-green-500 rounded-full" style={{
                          width: `${ldmPct}%`
                        }} /></div>
                          </div>
                          <div className="col-span-2">
                            <div className="flex justify-between text-text-secondary mb-0.5"><span>{t('pallets', 'Paleți')}</span><span>{(stats.pallets || 0)}+{orderPallets}/{maxPallets}</span></div>
                            <div className="w-full bg-surface h-1.5 rounded-full"><div className="h-full bg-orange-500 rounded-full" style={{
                          width: `${palletPct}%`
                        }} /></div>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => {
                  assignOrderToTruck(order.id, truck.id);
                  setSelectedOrderToAssign(null);
                }} disabled={assigning === order.id} className={`py-2 px-4 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all ${rec.isCompatible ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'}`}>
                        {assigning === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><TruckIcon className="w-3.5 h-3.5" /> {rec.isCompatible ? 'Asignează' : 'Forțează'}</>}
                      </button>
                    </div>;
            })}
              </div>

              <div className="px-6 py-3 border-t border-border bg-surface/50 flex justify-end shrink-0">
                <button onClick={() => setSelectedOrderToAssign(null)} className="btn-secondary text-xs py-2 px-4">{t("jsx_anuleaz")}</button>
              </div>
            </div>
          </div>, document.body) : null;
    })()}
    </div>;
}
