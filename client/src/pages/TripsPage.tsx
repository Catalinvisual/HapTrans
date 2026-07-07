import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Package, Loader2, ArrowRight, Trash2, AlertTriangle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Only these statuses mean a truck is truly "on trip" (not just planning)
const ACTIVE_TRIP_STATUSES = ['active', 'confirmed', 'in_progress', 'in_transit'];

export default function TripsPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [ghostTrips, setGhostTrips] = useState<any[]>([]);
  const [showGhostAlert, setShowGhostAlert] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oRes, tRes, trRes] = await Promise.all([
        api.get('/orders'),
        api.get('/trucks'),
        api.get('/trips'),
      ]);
      setOrders(oRes.data.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled'));
      setTrucks(tRes.data);
      setTrips(trRes.data);

      // Detect ghost trips: status 'planning' with no orders assigned
      const ghosts = (trRes.data as any[]).filter(
        tr =>
          tr.status === 'planning' &&
          (!tr.orders || tr.orders.length === 0) &&
          (!tr.stops || tr.stops.length === 0),
      );
      setGhostTrips(ghosts);
      if (ghosts.length > 0) setShowGhostAlert(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGhostTrips = async () => {
    try {
      await Promise.all(ghostTrips.map(g => api.delete(`/trips/${g.id}`)));
      toast.success(`Cleared ${ghostTrips.length} ghost trip(s)`);
      setGhostTrips([]);
      setShowGhostAlert(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error deleting ghost trips');
    }
  };

  const handleAssignOrder = async (orderId: string, truckId: string) => {
    try {
      setIsAssigning(true);
      const order = orders.find(o => o.id === orderId);
      const truck = trucks.find(t => t.id === truckId);
      if (!order || !truck) return;

      const driverId = truck.driver?.id;
      if (!driverId) {
        toast.error('Selected truck has no assigned driver.');
        return;
      }

      let activeTrip = trips.find(
        tr =>
          tr.truck?.id === truckId &&
          ACTIVE_TRIP_STATUSES.includes(tr.status),
      );

      if (!activeTrip) {
        const payload = {
          clientId: order.clientId || order.client?.id,
          truckId,
          driverId,
          status: 'confirmed',
          price: order.price,
          currency: order.currency,
          pickupAddress: order.stops?.find((s: any) => s.type === 'pickup')?.address || '',
          dropoffAddress: order.stops?.find((s: any) => s.type === 'dropoff')?.address || '',
          pickupDate:
            order.stops?.find((s: any) => s.type === 'pickup')?.scheduledDate ||
            new Date().toISOString(),
          dropoffDate:
            order.stops?.find((s: any) => s.type === 'dropoff')?.scheduledDate ||
            new Date(Date.now() + 86400000).toISOString(),
        };
        await api.post('/trips', payload);
      }

      await api.patch(`/orders/${orderId}`, { status: 'assigned' });
      toast.success(`Order ${order.referenceNumber} assigned to ${truck.plateNumber}`);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error assigning order');
    } finally {
      setIsAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  const unassignedOrders = orders.filter(o => o.status === 'pending');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col gap-4">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dispatch Board</h1>
          <p className="text-sm text-text-secondary mt-1">Drag or assign orders directly to trucks.</p>
        </div>
      </div>

      {/* Ghost trip alert */}
      {showGhostAlert && ghostTrips.length > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <span className="text-amber-800 dark:text-amber-200 font-medium flex-1">
            {ghostTrips.length} ghost trip{ghostTrips.length > 1 ? 's' : ''} detected (status: planning, no orders).
            {' '}Trucks:{' '}
            {ghostTrips.map(g => g.truck?.plateNumber || g.id).join(', ')}
          </span>
          <button
            onClick={handleDeleteGhostTrips}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Ghost Trips
          </button>
          <button
            onClick={() => setShowGhostAlert(false)}
            className="text-amber-500 hover:text-amber-700 text-xs underline ml-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">

        {/* Left: Order Backlog */}
        <div className="col-span-1 lg:col-span-4 xl:col-span-3 flex flex-col bg-surface/30 rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-white dark:bg-card flex justify-between items-center">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Unassigned Orders
            </h2>
            <span className="badge badge-gray">{unassignedOrders.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {unassignedOrders.length === 0 ? (
              <div className="text-center p-8 text-text-secondary text-sm">
                No pending orders.
              </div>
            ) : (
              unassignedOrders.map(order => {
                const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                return (
                  <div key={order.id} className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-primary text-sm">{order.referenceNumber}</span>
                      <span className="text-xs font-medium bg-surface px-2 py-1 rounded text-text-secondary">
                        {order.transportType?.toUpperCase()}
                      </span>
                    </div>

                    <div className="space-y-2 mt-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-primary">
                            {pickup?.city || pickup?.address?.split(',')[0] || 'Pickup'}
                          </p>
                          {pickup?.scheduledDate && (
                            <p className="text-[10px] text-text-muted">
                              {new Date(pickup.scheduledDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-2 border-l-2 border-dashed border-border h-4 my-1" />
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-primary">
                            {dropoff?.city || dropoff?.address?.split(',')[0] || 'Delivery'}
                          </p>
                          {dropoff?.scheduledDate && (
                            <p className="text-[10px] text-text-muted">
                              {new Date(dropoff.scheduledDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        className="input text-xs py-1 px-2 w-[145px]"
                        onChange={e => {
                          if (e.target.value) handleAssignOrder(order.id, e.target.value);
                          e.target.value = '';
                        }}
                        disabled={isAssigning}
                      >
                        <option value="">Assign to truck...</option>
                        {trucks
                          .filter(t => t.status === 'active')
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.plateNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Fleet */}
        <div className="col-span-1 lg:col-span-8 xl:col-span-9 flex flex-col bg-surface/30 rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-white dark:bg-card flex justify-between items-center">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Active Fleet & Ongoing Trips
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.filter(t => t.status === 'active').map(truck => {
                const driverName = truck.driver
                  ? `${truck.driver.firstName} ${truck.driver.lastName}`
                  : 'No Driver';

                // Only count truly active trips, NOT planning ghost trips
                const activeTrip = trips.find(
                  tr =>
                    tr.truck?.id === truck.id &&
                    ACTIVE_TRIP_STATUSES.includes(tr.status),
                );

                return (
                  <div key={truck.id} className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />

                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{truck.plateNumber}</h3>
                        <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                          <span className={`w-2 h-2 rounded-full ${activeTrip ? 'bg-orange-400' : 'bg-green-500'}`} />
                          {driverName}
                        </p>
                      </div>
                      <span className={`badge ${activeTrip ? 'badge-primary' : 'badge-gray'}`}>
                        {activeTrip ? 'On Trip' : 'Available'}
                      </span>
                    </div>

                    {activeTrip ? (
                      <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                        <div className="flex items-center justify-between text-xs font-medium text-text-secondary mb-2">
                          <span>Current Trip: {activeTrip.referenceNumber || activeTrip.tripNumber || 'TRP-Active'}</span>
                          <span className="capitalize">{activeTrip.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <span className="truncate max-w-[120px]" title={activeTrip.pickupAddress}>
                            {activeTrip.pickupAddress?.split(',')[0]}
                          </span>
                          <ArrowRight className="w-3 h-3 text-text-muted flex-shrink-0" />
                          <span className="truncate max-w-[120px]" title={activeTrip.dropoffAddress}>
                            {activeTrip.dropoffAddress?.split(',')[0]}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface/50 rounded-lg p-3 border border-border border-dashed flex items-center justify-center h-[76px]">
                        <span className="text-sm text-text-muted">No active orders</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
