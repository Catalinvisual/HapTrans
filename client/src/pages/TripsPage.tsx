import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Search, Calendar, ChevronRight, Package, Loader2, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TripsPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTruck, setSelectedTruck] = useState<any>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [oRes, tRes, trRes] = await Promise.all([
        api.get('/orders'),
        api.get('/trucks'),
        api.get('/trips')
      ]);
      // Only show pending or unassigned orders in the backlog
      setOrders(oRes.data.filter((o: any) => o.status !== 'completed' && o.status !== 'cancelled'));
      setTrucks(tRes.data);
      setTrips(trRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dispatch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOrder = async (orderId: string, truckId: string) => {
    try {
      setIsAssigning(true);
      
      const order = orders.find(o => o.id === orderId);
      const truck = trucks.find(t => t.id === truckId);
      
      if (!order || !truck) return;

      // Ensure the driver exists for this truck
      const driverId = truck.driver?.id;
      if (!driverId) {
        toast.error('Selected truck has no assigned driver.');
        setIsAssigning(false);
        return;
      }

      // Check if truck already has an active trip
      let activeTrip = trips.find(tr => tr.truck?.id === truckId && tr.status !== 'completed' && tr.status !== 'cancelled');

      // For MVP, we will create a Trip and move the Order to "assigned".
      // In a full implementation, we'd add Stops and Tasks to the Trip.
      
      if (!activeTrip) {
        // Create new trip
        const payload = {
          clientId: order.clientId || order.client?.id,
          truckId: truckId,
          driverId: driverId,
          status: 'confirmed',
          price: order.price,
          currency: order.currency,
          pickupAddress: order.stops?.find((s:any)=>s.type==='pickup')?.address || '',
          dropoffAddress: order.stops?.find((s:any)=>s.type==='dropoff')?.address || '',
          pickupDate: order.stops?.find((s:any)=>s.type==='pickup')?.scheduledDate || new Date().toISOString(),
          dropoffDate: order.stops?.find((s:any)=>s.type==='dropoff')?.scheduledDate || new Date(Date.now() + 86400000).toISOString(),
        };
        await api.post('/trips', payload);
      }
      
      // Mark order as assigned
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
  const activeOrders = orders.filter(o => o.status === 'assigned' || o.status === 'in_progress');

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto h-[calc(100vh-4rem)] flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dispatch Board</h1>
          <p className="text-sm text-text-secondary mt-1">Drag or assign orders directly to trucks.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* Left Column: Order Backlog */}
        <div className="col-span-1 lg:col-span-4 xl:col-span-3 flex flex-col bg-surface/30 rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-white flex justify-between items-center">
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
                const pickup = order.stops?.find((s:any)=>s.type==='pickup');
                const dropoff = order.stops?.find((s:any)=>s.type==='dropoff');
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
                          <p className="text-xs font-medium text-text-primary">{pickup?.city || pickup?.address?.split(',')[0] || 'Pickup'}</p>
                          {pickup?.scheduledDate && <p className="text-[10px] text-text-muted">{new Date(pickup.scheduledDate).toLocaleDateString()}</p>}
                        </div>
                      </div>
                      <div className="ml-2 border-l-2 border-dashed border-border h-4 my-1"></div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-text-primary">{dropoff?.city || dropoff?.address?.split(',')[0] || 'Delivery'}</p>
                          {dropoff?.scheduledDate && <p className="text-[10px] text-text-muted">{new Date(dropoff.scheduledDate).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <select 
                        className="input text-xs py-1 px-2 w-[140px]"
                        onChange={(e) => {
                          if(e.target.value) handleAssignOrder(order.id, e.target.value);
                          e.target.value = "";
                        }}
                        disabled={isAssigning}
                      >
                        <option value="">Assign to truck...</option>
                        {trucks.filter(t => t.status === 'active').map(t => (
                          <option key={t.id} value={t.id}>{t.plateNumber}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right Column: Fleet / Trucks */}
        <div className="col-span-1 lg:col-span-8 xl:col-span-9 flex flex-col bg-surface/30 rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border bg-white flex justify-between items-center">
            <h2 className="font-semibold text-text-primary flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Active Fleet & Ongoing Trips
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trucks.filter(t => t.status === 'active').map(truck => {
                const driverName = truck.driver ? `${truck.driver.firstName} ${truck.driver.lastName}` : 'No Driver';
                const activeTrip = trips.find(tr => tr.truck?.id === truck.id && tr.status !== 'completed' && tr.status !== 'cancelled');
                
                return (
                  <div key={truck.id} className="bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-text-primary">{truck.plateNumber}</h3>
                        <p className="text-sm text-text-secondary flex items-center gap-1 mt-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
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
                          <span>Current Trip: {activeTrip.referenceNumber || 'TRP-Active'}</span>
                          <span className="capitalize">{activeTrip.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-primary">
                          <span className="truncate max-w-[120px]" title={activeTrip.pickupAddress}>
                            {activeTrip.pickupAddress?.split(',')[0]}
                          </span>
                          <ArrowRight className="w-3 h-3 text-text-muted" />
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
