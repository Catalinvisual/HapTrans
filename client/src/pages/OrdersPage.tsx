import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Plus, Search, Loader2, MapPin, Truck, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import OrderWizard from '../components/orders/OrderWizard';

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(o => 
    o.referenceNumber?.toLowerCase().includes(search.toLowerCase()) ||
    o.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.customerReference?.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (id: string) => {
    setSelectedOrderId(id);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedOrderId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Orders</h1>
          <p className="text-sm text-text-secondary mt-1">Manage transport orders, cargo items, and routings.</p>
        </div>
        <button 
          onClick={handleCreate}
          className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
        >
          <Plus className="w-5 h-5" />
          {t('addOrder', 'Create Order')}
        </button>
      </div>

      <div className="card overflow-hidden border border-border">
        <div className="p-4 border-b border-border bg-surface/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by reference, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-full bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted">
              <Box className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-text-primary">No orders found</h3>
            <p className="text-text-secondary mt-1 max-w-sm">Get started by creating a new transport order. It will appear here once saved.</p>
            <button 
              onClick={handleCreate}
              className="btn-secondary mt-6 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create your first Order
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Order Ref</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Client</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Route Info</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Cargo</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredOrders.map(order => {
                  const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                  const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                  const cargoWeight = order.cargoItems?.reduce((sum: number, item: any) => sum + (item.weightKg || 0), 0) || 0;
                  const cargoCount = order.cargoItems?.length || 0;

                  return (
                    <tr key={order.id} className="hover:bg-surface/30 transition-colors group">
                      <td className="p-4">
                        <div className="font-semibold text-primary">{order.orderNumber || order.referenceNumber || '—'}</div>
                        <div className="text-xs text-text-secondary mt-1">{order.customerReference && `Ref: ${order.customerReference}`}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{order.client?.name || '-'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate max-w-[150px]" title={pickup?.city || pickup?.address || 'TBD'}>
                            {pickup?.city || pickup?.address?.split(',')[0] || 'TBD'}
                          </span>
                          <ArrowRightIcon />
                          <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                          <span className="truncate max-w-[150px]" title={dropoff?.city || dropoff?.address || 'TBD'}>
                            {dropoff?.city || dropoff?.address?.split(',')[0] || 'TBD'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Box className="w-4 h-4 text-text-secondary" />
                          <span className="text-sm font-medium">{cargoCount} item(s)</span>
                          {cargoWeight > 0 && <span className="text-xs text-text-secondary">({Math.round(cargoWeight).toLocaleString()} kg)</span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`badge ${
                            order.status === 'draft' ? 'badge-warning' :
                            order.status === 'pending' ? 'badge-gray' :
                            order.status === 'assigned' ? 'badge-primary' :
                            order.status === 'in_transit' ? 'badge-primary' :
                            'badge-success'
                          }`}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => handleEdit(order.id)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderWizard 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchOrders}
        orderId={selectedOrderId}
      />
    </div>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted shrink-0">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
