import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, Trash2, ExternalLink, Users, X, Weight, ChevronRight, Calendar, Euro, ArrowRight, Info } from 'lucide-react';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
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
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [trucksRes, ordersRes, tripsRes, driversRes] = await Promise.all([api.get('/trucks'), api.get('/orders?status=draft,unassigned,pending'), api.get('/trips?status=planning,dispatched'), api.get('/drivers')]);
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
      const existingTrip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
      if (existingTrip) {
        await api.post(`/trips/${existingTrip.id}/assign-orders`, {
          orderIds: [orderId]
        });
        await api.patch(`/orders/${orderId}`, {
          status: 'assigned'
        });
        toast.success(`✅ ${t('assigned_to_existing_trip', {
          plate: truck.plateNumber
        })}`);
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
          dropoffDate: order.stops?.find((s: any) => s.type === 'dropoff')?.scheduledDate || new Date(Date.now() + 86400000).toISOString()
        });
        await api.post(`/trips/${tripRes.data.id}/assign-orders`, {
          orderIds: [orderId]
        });
        await api.patch(`/orders/${orderId}`, {
          status: 'assigned'
        });
        toast.success(`✅ ${t('new_trip_created_assigned', {
          plate: truck.plateNumber
        })}`);
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
      const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
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
  const handleDragEnd = async (result: any) => {
    // Fix for Chromium Windows bug where cursor turns white/invisible after dropping
    // Must be in setTimeout because react-beautiful-dnd restores focus asynchronously AFTER this callback
    setTimeout(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    }, 50);
    const {
      destination,
      source,
      draggableId
    } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (source.droppableId === 'unassigned-orders' && destination.droppableId !== 'unassigned-orders') {
      await assignOrderToTruck(draggableId, destination.droppableId);
    }
  };
  const unassigned = orders.filter(o => ['draft', 'unassigned', 'pending'].includes(o.status));
  const filteredUnassigned = searchQuery ? unassigned.filter(o => (o.orderNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) || (o.client?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || o.stops?.some((s: any) => (s.address || '').toLowerCase().includes(searchQuery.toLowerCase()))) : unassigned;
  const getTruckStats = (truckId: string) => {
    const trip = trips.find(tr => tr.truck?.id === truckId && tr.status === 'planning');
    if (!trip) return {
      weight: 0,
      ldm: 0,
      count: 0,
      orders: [],
      tripId: null,
      driverId: null,
      stops: []
    };
    let weight = 0;
    let ldm = 0;
    (trip.orders || []).forEach((o: any) => o.cargoItems?.forEach((c: any) => {
      weight += Number(c.weightKg || 0);
      ldm += Number(c.ldm || 0);
    }));
    return {
      weight,
      ldm,
      count: (trip.orders || []).length,
      orders: trip.orders || [],
      tripId: trip.id,
      driverId: trip.driver?.id || null,
      stops: trip.stops || []
    };
  };
  const getRecommendation = (truck: any, order: any) => {
    const stats = getTruckStats(truck.id);
    const orderWeight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
    const orderLdm = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.ldm || 0), 0) || 0;
    const maxWeight = truck.maxWeightKg || 24000;
    const maxLdm = truck.maxLdm || 13.6;
    const isCompatible = stats.weight + orderWeight <= maxWeight && stats.ldm + orderLdm <= maxLdm;
    let badge = t('compatible', 'Compatibil');
    let color = 'bg-green-100 text-green-800 border-green-200';
    if (stats.weight + orderWeight > maxWeight) {
      badge = `Dep. Greutate (+${Math.round(stats.weight + orderWeight - maxWeight)} kg)`;
      color = 'bg-red-100 text-red-800 border-red-200';
    } else if (stats.ldm + orderLdm > maxLdm) {
      badge = `Dep. LDM`;
      color = 'bg-orange-100 text-orange-800 border-orange-200';
    }
    return {
      isCompatible,
      badge,
      color
    };
  };
  const getSortedTrucks = (order: any) => trucks.map(truck => ({
    truck,
    rec: getRecommendation(truck, order)
  })).sort((a, b) => a.rec.isCompatible === b.rec.isCompatible ? 0 : a.rec.isCompatible ? -1 : 1);
  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  return <div className="pt-2 px-4 md:px-6 lg:px-8 pb-8 max-w-[1800px] mx-auto h-full">
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-6 items-start h-full">

          {/* ═══════════════════════════════════════
              LEFT — Compact Order Cards
           ════════════════════════════════════════ */}
          <div className="w-[320px] xl:w-[360px] shrink-0 flex flex-col gap-3 sticky top-2 z-50" style={{
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto'
        }}>

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
            <Droppable droppableId="unassigned-orders" direction="vertical">
              {provided => <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                  {filteredUnassigned.map((order, index) => {
                const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                const weight = order.cargoItems?.reduce((s: number, c: any) => s + Number(c.weightKg || 0), 0) || 0;
                const isUrgent = pickup?.dateFrom && new Date(pickup.dateFrom).getTime() - Date.now() < 86400000 * 2;
                return <Draggable key={order.id} draggableId={order.id} index={index}>
                        {(provided, snapshot) => <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-card border rounded-xl px-3 py-2.5 cursor-grab-custom active:cursor-grabbing-custom transition-all select-none
                              ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-primary border-primary rotate-1 scale-105' : 'border-border hover:border-primary/40 hover:shadow-md'}`} style={{
                    ...provided.draggableProps.style,
                    zIndex: snapshot.isDragging ? 9999 : 'auto'
                  }}>
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
                          </div>}
                      </Draggable>;
              })}
                  {provided.placeholder}
                </div>}
            </Droppable>

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
              const weightPct = Math.min(100, stats.weight / maxWeight * 100);
              const ldmPct = Math.min(100, stats.ldm / maxLdm * 100);
              const hasWarning = stats.weight > maxWeight || stats.ldm > maxLdm;
              return <Droppable key={truck.id} droppableId={truck.id}>
                    {(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`relative bg-card border rounded-2xl p-5 transition-all duration-200 shadow-sm flex flex-col min-h-[200px]
                          ${snapshot.isDraggingOver ? 'border-primary bg-primary/8 scale-[1.01] shadow-xl ring-2 ring-primary/40 z-[-1]' : 'border-border hover:border-primary/30 hover:shadow-md'}`}>
                        {/* Drop overlay */}
                        {snapshot.isDraggingOver && <div className="absolute inset-0 flex items-center justify-center rounded-2xl pointer-events-none z-10">
                            <div className="bg-primary text-white font-black text-sm px-5 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
                              <TruckIcon className="w-4 h-4" /> {t('drop_here_label', 'Plasează aici')}
                            </div>
                          </div>}

                        {/* Truck header */}
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-text-primary text-base flex items-center gap-1.5">
                              <TruckIcon className="w-4 h-4 text-primary" />
                              {truck.plateNumber}
                              {truck.brand && <span className="text-xs text-text-secondary font-normal">({truck.brand})</span>}
                            </h3>
                            {hasWarning && <span className="text-red-500 flex items-center gap-1 text-xs font-bold mt-0.5">
                                <AlertTriangle className="w-3.5 h-3.5" />{t("jsx_suprasarcin")}</span>}
                          </div>
                          {stats.tripId && <button onClick={() => navigate(`/trips/${stats.tripId}`)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-primary/5 border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/10 transition-colors">
                              <ExternalLink className="w-3 h-3" /> {t('truck_label', 'Cursă')}
                            </button>}
                        </div>

                        {/* Driver */}
                        <div className="mb-3">
                          <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Users className="w-3 h-3" /> {t('assigned_driver', 'Șofer')}
                          </label>
                          <select value={truck.driver?.id || stats.driverId || ''} onChange={e => handleAssignDriver(truck.id, e.target.value)} onClick={e => e.stopPropagation()} className="w-full text-xs bg-white dark:bg-card border border-border/80 rounded-lg px-2 py-1.5 font-semibold text-text-primary focus:outline-none focus:border-primary">
                            <option value="">{t('no_driver_option', 'Fără Șofer')}</option>
                            {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.user?.name || 'Șofer'}</option>)}
                          </select>
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
                        </div>

                        {/* Orders in trip */}
                        <div className="mt-auto pt-3 border-t border-border/60">
                          <p className="text-[10px] font-bold text-text-secondary mb-1.5">
                            {stats.count === 0 ? t('no_orders_assigned', 'Nicio comandă asignată') : `${stats.count} ${t('orders_in_trip_label', 'comenzi în cursă')}`}
                            {stats.stops.length > 0 && <span className="ml-1 text-primary">· {stats.stops.length} {t('stops_count', 'opriri')}</span>}
                          </p>
                          {stats.orders.slice(0, 3).map((o: any) => <div key={o.id} className="flex items-center justify-between text-[11px] bg-surface/60 border border-border/30 rounded-lg px-2 py-1 mb-1">
                              <span className="font-bold text-primary">{o.orderNumber || o.referenceNumber || '—'}</span>
                              <span className="text-text-secondary truncate ml-2">{o.client?.name || '—'}</span>
                            </div>)}
                          {stats.orders.length > 3 && <p className="text-[10px] text-text-muted text-center">+{stats.orders.length - 3}{t("jsx_maiMulte")}</p>}
                        </div>

                        {provided.placeholder}
                      </div>}
                  </Droppable>;
            })}
            </div>
          </div>

        </div>
      </DragDropContext>

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
              const weightPct = Math.min(100, stats.weight / maxWeight * 100);
              const ldmPct = Math.min(100, stats.ldm / maxLdm * 100);
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