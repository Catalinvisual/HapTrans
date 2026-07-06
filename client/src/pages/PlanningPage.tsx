import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Package, Plus, Loader2 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function PlanningPage() {
  const { t } = useTranslation();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [unassignedOrders, setUnassignedOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [trucksRes, ordersRes] = await Promise.all([
        api.get('/trucks'),
        api.get('/orders')
      ]);
      setTrucks(trucksRes.data);
      setUnassignedOrders(ordersRes.data.filter((o: any) => o.status === 'unassigned' || o.status === 'draft'));
    } catch (e) {
      console.error(e);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent, truckId: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;

    try {
      setAssigning(true);
      // Create trip for truck, then assign order
      const truck = trucks.find(t => t.id === truckId);
      const tripRes = await api.post('/trips', {
        truckId,
        driverId: truck?.driver?.id || null, // default driver if any
      });
      
      const tripId = tripRes.data.id;
      await api.post(`/trips/${tripId}/assign-orders`, { orderIds: [orderId] });

      toast.success('Order assigned to Trip successfully!');
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign order');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <h1 className="text-2xl font-bold mb-4">Planner (Drag & Drop)</h1>
      <p className="text-text-secondary mb-6">Drag unassigned orders onto a truck to create a trip and assign them automatically.</p>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Unassigned Orders */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" /> Unassigned Orders
          </h2>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {unassignedOrders.length === 0 ? (
              <div className="p-8 text-center bg-surface/50 rounded-xl text-text-secondary">
                No unassigned orders found.
              </div>
            ) : (
              unassignedOrders.map(order => (
                <div 
                  key={order.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, order.id)}
                  className="bg-card p-4 rounded-xl border border-border cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors shadow-sm"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-sm">{order.orderNumber}</span>
                    <span className="badge badge-gray text-xs">{order.status}</span>
                  </div>
                  <div className="text-sm text-text-secondary mb-2">
                    {order.client?.name || 'Unknown Client'}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {order.stops?.length || 0} stops • {order.cargoItems?.length || 0} items
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Trucks */}
        <div className="w-full lg:w-2/3 flex flex-col gap-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Truck className="w-5 h-5" /> Available Trucks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {trucks.map(truck => (
              <div 
                key={truck.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, truck.id)}
                className={`bg-card p-6 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center min-h-[150px] transition-all hover:bg-surface/50 hover:border-primary/30 ${assigning ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <Truck className="w-8 h-8 text-text-secondary mb-2" />
                <div className="font-semibold text-lg">{truck.licensePlate}</div>
                <div className="text-sm text-text-tertiary">Drop order here to assign</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
