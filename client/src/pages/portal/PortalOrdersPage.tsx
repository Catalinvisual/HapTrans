import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Package, MapPin, Calendar, ArrowRight } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import portalApi from '../../lib/portalApi';
import { formatDate } from '../../lib/dateUtils';
import Pagination from '../../components/Pagination';

export default function PortalOrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const search = searchParams.get('search') || '';
  const filter = searchParams.get('filter') || 'all';

  useEffect(() => {
    portalApi.get('/portal/orders').then(r => {
      setOrders(r.data);
      setLoading(false);
    });
  }, []);

  const filteredOrders = orders.filter(o => {
    const s = search.toLowerCase();
    const matchSearch = o.referenceNumber?.toLowerCase().includes(s) || 
                       o.pickupCity?.toLowerCase().includes(s) ||
                       o.deliveryCity?.toLowerCase().includes(s);
    if (!matchSearch) return false;
    
    if (filter === 'active') return ['pending', 'assigned', 'in-transit'].includes(o.status);
    if (filter === 'completed') return o.status === 'delivered';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / limit);
  const paginatedOrders = filteredOrders.slice((page - 1) * limit, page * limit);

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
      else newParams.delete(k);
    });
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage: number) => updateParams({ page: newPage.toString() });
  const handleLimitChange = (newLimit: number) => updateParams({ page: '1', limit: newLimit.toString() });
  const handleSearchChange = (val: string) => updateParams({ page: '1', search: val });
  const handleFilterChange = (val: string) => updateParams({ page: '1', filter: val });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">My Orders</h1>
        <button className="btn-primary py-2 px-4 flex items-center gap-2">
          <Package className="w-4 h-4" /> New Transport Request
        </button>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input 
              className="input pl-9" 
              placeholder="Search reference, city..." 
              value={search} 
              onChange={e => handleSearchChange(e.target.value)} 
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {['all', 'active', 'completed', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize whitespace-nowrap transition-colors ${
                  filter === f ? 'bg-primary text-white' : 'bg-surface hover:bg-surface-hover border border-border'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-text-secondary">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">No orders found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedOrders.map(o => (
              <div 
                key={o.id} 
                onClick={() => navigate(`/portal/orders/${o.id}`)}
                className="bg-surface border border-border p-4 rounded-xl hover:border-primary/50 cursor-pointer transition-colors group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-text-secondary font-medium mb-1">REF: {o.referenceNumber}</p>
                    <span className={`px-2 py-1 rounded text-xs font-bold capitalize
                      ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                        o.status === 'in-transit' ? 'bg-blue-100 text-blue-700' : 
                        o.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                        'bg-orange-100 text-orange-700'}`}>
                      {o.status.replace('-', ' ')}
                    </span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-text-secondary group-hover:text-primary transition-colors" />
                </div>
                
                <div className="space-y-3 relative">
                  <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-border"></div>
                  
                  <div className="flex gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-surface border-2 border-primary flex items-center justify-center shrink-0 mt-0.5 bg-white z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary"><Calendar className="w-3 h-3 inline mr-1"/>{formatDate(o.pickupDate)}</p>
                      <p className="font-bold text-sm">{o.pickupCity}</p>
                    </div>
                  </div>

                  <div className="flex gap-3 relative">
                    <div className="w-5 h-5 rounded-full bg-surface border-2 border-primary flex items-center justify-center shrink-0 mt-0.5 bg-white z-10">
                      <MapPin className="w-3 h-3 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary"><Calendar className="w-3 h-3 inline mr-1"/>{formatDate(o.deliveryDate)}</p>
                      <p className="font-bold text-sm">{o.deliveryCity}</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-border flex justify-between text-xs text-text-secondary font-medium">
                  <span>Weight: {o.weight} kg</span>
                  {o.trip?.truck && <span>Truck: {o.trip.truck.plateNumber}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredOrders.length > 0 && (
          <div className="p-4 border-t border-border mt-4 flex justify-center">
            <Pagination
              currentPage={page}
              totalItems={filteredOrders.length}
              itemsPerPage={limit}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleLimitChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
