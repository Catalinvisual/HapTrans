import { useEffect, useState, useRef } from 'react';
import { Truck, Package, Plus, Loader2, MapPin, Calendar, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function PlanningPage() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [dragOverTruck, setDragOverTruck] = useState<string | null>(null);
  const [draggingOrder, setDraggingOrder] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksRes, ordersRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders'),
      ]);
      setTrucks(trucksRes.data.filter((t: any) => t.status === 'active'));
      setOrders(ordersRes.data.filter((o: any) => ['draft', 'pending', 'confirmed', 'unassigned'].includes(o.status)));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load planning data');
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

      // Create trip and assign order
      const tripRes = await api.post('/trips', {
        truckId,
        driverId: truck?.driver?.id || null,
        status: 'confirmed',
        price: order.price,
        currency: order.currency || 'EUR',
        referenceNumber: order.orderNumber || order.referenceNumber,
        pickupAddress: order.stops?.find((s: any) => s.type === 'pickup')?.address || '',
        dropoffAddress: order.stops?.find((s: any) => s.type === 'dropoff')?.address || '',
        pickupDate: order.stops?.find((s: any) => s.type === 'pickup')?.scheduledDate || new Date().toISOString(),
        dropoffDate: order.stops?.find((s: any) => s.type === 'dropoff')?.scheduledDate || new Date(Date.now() + 86400000).toISOString(),
      });

      const tripId = tripRes.data.id;
      await api.post(`/trips/${tripId}/assign-orders`, { orderIds: [orderId] });
      await api.patch(`/orders/${orderId}`, { status: 'assigned' });

      toast.success(`✅ Order assigned to ${truck.plateNumber || truck.licensePlate}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign order');
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-text-secondary text-sm">Loading planning board...</p>
      </div>
    );
  }

  const unassigned = orders.filter(o => ['draft', 'pending', 'confirmed', 'unassigned'].includes(o.status));

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Planning Board</h1>
          <p className="text-sm text-text-secondary mt-1">Drag orders onto trucks to assign them and create trips automatically.</p>
        </div>
        <div className="flex gap-2">
          <span className="badge badge-gray">{unassigned.length} unassigned</span>
          <span className="badge badge-primary">{trucks.length} trucks</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
            <Package className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{unassigned.length}</p>
            <p className="text-xs text-text-secondary">Unassigned Orders</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <Truck className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{trucks.length}</p>
            <p className="text-xs text-text-secondary">Available Trucks</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{orders.filter(o => o.status === 'assigned').length}</p>
            <p className="text-xs text-text-secondary">Assigned Today</p>
          </div>
        </div>
      </div>

      {/* Main planning grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Unassigned Orders */}
        <div className="lg:col-span-4 bg-surface/30 rounded-2xl border border-border overflow-hidden flex flex-col h-[75vh]">
          <div className="p-4 border-b border-border bg-white dark:bg-card flex justify-between items-center shrink-0">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Unassigned Orders
            </h2>
            <span className="badge badge-warning">{unassigned.length}</span>
          </div>

          <div className="p-4 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {unassigned.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <CheckCircle2 className="w-16 h-16 text-green-400 mb-4 opacity-50" />
                <p className="font-medium text-text-primary">All orders assigned!</p>
                <p className="text-sm text-text-secondary mt-1">No pending orders to plan.</p>
              </div>
            ) : (
              unassigned.map(order => {
                const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                const isBeingAssigned = assigning === order.id;
                return (
                  <div
                    key={order.id}
                    draggable={!isBeingAssigned}
                    onDragStart={e => handleDragStart(e, order)}
                    onDragEnd={handleDragEnd}
                    className={`bg-card border rounded-xl p-4 shadow-sm transition-all select-none
                      ${isBeingAssigned ? 'opacity-50 cursor-wait border-primary' :
                        draggingOrder?.id === order.id ? 'opacity-60 cursor-grabbing scale-[0.98] border-primary shadow-md' :
                        'cursor-grab hover:border-primary/40 hover:shadow-md border-border'
                      }
                    `}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="font-bold text-primary text-sm">
                          {order.orderNumber || order.referenceNumber || 'New Order'}
                        </span>
                        <p className="text-xs text-text-secondary mt-0.5">{order.client?.name || 'Unknown Client'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {isBeingAssigned && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
                        <span className={`badge text-xs ${
                          order.status === 'draft' ? 'badge-warning' :
                          order.status === 'confirmed' ? 'badge-primary' : 'badge-gray'
                        }`}>{order.status}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-text-secondary truncate">
                          {pickup?.city || pickup?.address?.split(',')[0] || '—'}
                        </span>
                      </div>
                      <div className="ml-[7px] border-l-2 border-dashed border-border h-3" />
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3.5 h-3.5 text-green-500 shrink-0" />
                        <span className="text-text-secondary truncate">
                          {dropoff?.city || dropoff?.address?.split(',')[0] || '—'}
                        </span>
                      </div>
                    </div>

                    {pickup?.scheduledDate && (
                      <div className="mt-3 pt-2 border-t border-border flex items-center gap-1 text-xs text-text-muted">
                        <Calendar className="w-3 h-3" />
                        {new Date(pickup.scheduledDate).toLocaleDateString()}
                        {pickup.scheduledTime && ` - ${pickup.scheduledTime}`}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Trucks drop zones */}
        <div className="lg:col-span-8 flex flex-col h-[75vh]">
          <div className="p-4 border-b border-border bg-white dark:bg-card rounded-t-2xl flex items-center gap-2 shrink-0">
            <Truck className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-text-primary">Available Trucks — Drop Here to Assign</h2>
          </div>

          {trucks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-surface/30 rounded-b-2xl border-x border-b border-border text-center p-8">
              <AlertCircle className="w-16 h-16 text-text-muted mb-4 opacity-50" />
              <p className="font-medium text-text-primary">No active trucks found</p>
              <p className="text-sm text-text-secondary mt-1">Add trucks in the Trucks section first.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto bg-surface/30 rounded-b-2xl border-x border-b border-border p-4 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {trucks.map(truck => {
                  const isDragOver = dragOverTruck === truck.id;
                  const driverName = truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}` : 'No Driver';
                  return (
                    <div
                      key={truck.id}
                      onDragOver={e => handleDragOver(e, truck.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={e => handleDrop(e, truck.id)}
                      className={`relative bg-card border-2 rounded-xl p-5 transition-all duration-200 min-h-[160px] flex flex-col
                        ${isDragOver
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]'
                          : 'border-dashed border-border hover:border-primary/30 hover:bg-surface/50'
                        }`}
                    >
                      {isDragOver && (
                        <div className="absolute inset-0 rounded-xl bg-primary/5 flex items-center justify-center pointer-events-none backdrop-blur-[1px] z-10">
                          <div className="text-primary font-bold text-sm flex items-center gap-2 bg-white/90 dark:bg-card/90 px-4 py-2 rounded-lg shadow-sm border border-primary/20">
                            <Plus className="w-5 h-5" /> Drop to assign
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-text-primary text-lg">{truck.plateNumber || truck.licensePlate}</h3>
                          <p className="text-sm text-text-secondary flex items-center gap-1.5 mt-1">
                            <span className={`w-2 h-2 rounded-full inline-block ${truck.driver ? 'bg-green-500' : 'bg-red-400'}`} />
                            {driverName}
                          </p>
                        </div>
                        <span className="badge badge-gray text-xs">{truck.status}</span>
                      </div>

                      <div className="flex-1 flex items-end">
                        <div className={`w-full flex items-center justify-center py-3 rounded-lg text-xs font-medium transition-colors border ${
                          isDragOver ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted group-hover:border-primary/30'
                        }`}>
                          <Truck className="w-4 h-4 mr-2" />
                          {isDragOver ? 'Release to assign order' : 'Drag an order here'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
