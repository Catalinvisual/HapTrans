import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Plus, Search, Loader2, MapPin, Truck, ChevronRight, FileText, Activity, Link as LinkIcon, Trash2 } from 'lucide-react';
import api from '../lib/api';
import OrderWizard from '../components/orders/OrderWizard';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

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

  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      (o.orderNumber?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (o.referenceNumber?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (o.client?.name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (o.customerReference?.toLowerCase() || '').includes(search.toLowerCase());
    
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return o.status === statusFilter;
  });

  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleEdit = (id: string) => {
    setSelectedOrderId(id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setOrderToDelete(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      await api.delete(`/orders/${orderToDelete}`);
      toast.success(t('global_delete_success', 'Deleted successfully'));
      fetchOrders();
    } catch (err) {
      toast.error(t('global_delete_error', 'Failed to delete'));
    } finally {
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    }
  };

  const handleCreate = () => {
    setSelectedOrderId(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="card overflow-hidden border border-border">
        <div className="p-4 border-b border-border bg-surface/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
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
            <button 
              onClick={handleCreate}
              className="btn-primary flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Plus className="w-5 h-5" />
              {t('addOrder', 'Create Order')}
            </button>
          </div>
          
          <div className="flex flex-wrap gap-2 border-t border-border/40 pt-3">
            {['all', 'draft', 'unassigned', 'planned', 'in_transit', 'delivered', 'closed'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all ${
                  statusFilter === tab
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface border-border text-text-secondary hover:border-primary/50'
                }`}
              >
                {t(`status_${tab}`, tab.replace('_', ' ').toUpperCase())}
              </button>
            ))}
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
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Type</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Cargo</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedOrders.map(order => {
                  const pickup = order.stops?.find((s: any) => s.type === 'pickup');
                  const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
                  const cargoWeight = order.cargoItems?.reduce((sum: number, item: any) => sum + Number(item.weightKg || 0), 0) || 0;
                  const cargoLdm = order.cargoItems?.reduce((sum: number, item: any) => sum + Number(item.ldm || 0), 0) || 0;
                  const cargoCount = order.cargoItems?.length || 0;

                  return (
                    <tr 
                      key={order.id} 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-surface/30 transition-colors group cursor-pointer"
                    >
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
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                          order.transportType === 'ltl' || order.transportType === 'groupage'
                            ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/50'
                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50'
                        }`}>
                          {(order.transportType || 'FTL').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col text-sm font-medium">
                          <span>{cargoCount} item(s)</span>
                          <span className="text-xs text-text-secondary">
                            {Number(cargoWeight).toLocaleString()} kg • {cargoLdm.toFixed(2)} LDM
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`badge ${
                            order.status === 'draft' ? 'badge-warning' :
                            order.status === 'unassigned' ? 'badge-gray' :
                            order.status === 'assigned' ? 'badge-primary' :
                            order.status === 'in_transit' ? 'badge-primary' :
                            'badge-success'
                          }`}>
                          {order.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {order.status === 'completed' && (
                          <button 
                            title="Create Invoice"
                            onClick={(e) => { e.stopPropagation(); toast.success('Invoice generation started'); }}
                            className="p-2 text-text-secondary hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors "
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {(order.status === 'in_transit' || order.status === 'assigned') && order.trip?.trackingToken && (() => {
                          const trackingToken = order.trip.trackingToken;
                          const trackingUrl = `${window.location.origin}/track/${trackingToken}`;
                          
                          const handleCopyTrackingLink = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (navigator.clipboard && window.isSecureContext) {
                              navigator.clipboard.writeText(trackingUrl)
                                .then(() => toast.success(t('copiedToClipboard', 'Tracking link copied to clipboard!')))
                                .catch(() => toast.error('Failed to copy link'));
                            } else {
                              const textArea = document.createElement("textarea");
                              textArea.value = trackingUrl;
                              document.body.appendChild(textArea);
                              textArea.select();
                              try {
                                document.execCommand('copy');
                                toast.success(t('copiedToClipboard', 'Tracking link copied to clipboard!'));
                              } catch (err) {
                                toast.error('Failed to copy link');
                              }
                              document.body.removeChild(textArea);
                            }
                          };

                          return (
                            <button 
                              title="Live Tracking Link"
                              onClick={handleCopyTrackingLink}
                              className="p-2 text-text-secondary hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors "
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          );
                        })()}
                        <button 
                          title="Edit Order"
                          onClick={(e) => { e.stopPropagation(); handleEdit(order.id); }}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors "
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button 
                          title="Delete Order"
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}
                          className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors "
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      <OrderWizard 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        orderId={selectedOrderId || undefined}
        onSaved={fetchOrders}
      />

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setOrderToDelete(null); }}
        onConfirm={confirmDelete}
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
