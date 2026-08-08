import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Search, Loader2, ArrowRight, Eye, MoreHorizontal, Calendar, Package, Trash2, Send } from 'lucide-react';
import api from '../lib/api';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import FilterDropdown from '../components/FilterDropdown';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
export default function TripsPage({
  embeddedClientId
}: {
  embeddedClientId?: string;
}) {
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const fetchTrips = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' ? '/trips' : `/trips?status=${statusFilter}`;
      const res = await api.get(url);
      // Sort trips by creation date (newest first)
      const sorted = res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTrips(sorted);
    } catch (err) {
      console.error(err);
      toast.error(t("toast_failedToLoad"));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);
  const displayTrips = embeddedClientId ? trips.filter((t: any) => t.client?.id === embeddedClientId) : trips;
  const filteredTrips = displayTrips.filter(tr => {
    const matchesSearch = (tr.tripNumber || '').toLowerCase().includes(search.toLowerCase()) || (tr.truck?.plateNumber || '').toLowerCase().includes(search.toLowerCase()) || (tr.driver?.firstName || '').toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'all') return true;
    return tr.status === statusFilter;
  });
  const paginatedTrips = filteredTrips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const handleDispatch = async (tripId: string) => {
    try {
      await api.patch(`/trips/${tripId}`, {
        status: 'dispatched'
      });
      toast.success(t("toast_cursTrimisC"));
      fetchTrips();
    } catch (e) {
      toast.error(t("toast_eroareLaTrimi"));
    }
  };
  const handleDeleteClick = (tripId: string) => {
    setTripToDelete(tripId);
    setDeleteModalOpen(true);
  };
  const confirmDelete = async () => {
    if (!tripToDelete) return;
    try {
      await api.delete(`/trips/${tripToDelete}`);
      toast.success(t('global_delete_success', 'Deleted successfully'));
      fetchTrips();
    } catch (e) {
      toast.error(t('global_delete_error', 'Failed to delete'));
    } finally {
      setDeleteModalOpen(false);
      setTripToDelete(null);
    }
  };
  return <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden border border-border">
        <div className="p-5 border-b border-border bg-surface/30 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 w-full">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input type="text" placeholder={t('searchPlaceholder', 'Search by reference, client...')} value={search} onChange={e => setSearch(e.target.value)} className="input pl-10 w-full bg-white" />
              </div>
              <FilterDropdown 
                options={['all', 'planning', 'dispatched', 'active', 'completed', 'cancelled']} 
                value={statusFilter} 
                onChange={setStatusFilter} 
              />
            </div>
          </div>
        </div>

        {loading ? <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div> : filteredTrips.length === 0 ? <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-text-primary">{t("jsx_noTripsFound")}</h3>
            <p className="text-text-secondary mt-1 max-w-sm">{t("jsx_noTripsMatch")}</p>
          </div> : <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_tripOrders")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_fleet")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_routing", "Routing")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_cargo", "Cargo")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_financials")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider">{t("jsx_status")}</th>
                  <th className="px-5 py-3 font-semibold text-sm text-text-secondary uppercase tracking-wider text-right">{t("jsx_actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTrips.map(trip => {
              const driverName = trip.driver ? (trip.driver.user?.name || (trip.driver.firstName ? `${trip.driver.firstName} ${trip.driver.lastName || ''}`.trim() : trip.driver.name) || 'Unknown Driver') : 'No Driver';
              // Get stops sorted by sequence
              const stops = trip.stops ? [...trip.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];
              const pickup = stops[0];
              const dropoff = stops[stops.length - 1];
              const revenue = trip.orders?.reduce((sum: number, o: any) => sum + Number(o.price || 0), 0) || 0;
              const cost = Number(trip.distanceKm || 0) * Number(trip.truck?.costPerKm || 0);
              const profit = revenue - cost;
              return <tr key={trip.id} className="hover:bg-surface/30 transition-colors group">
                      <td className="px-5 py-3 align-top">
                        <div className="font-semibold text-primary">{trip.tripNumber || trip.id.slice(0, 8)}</div>
                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {trip.createdAt && !isNaN(new Date(trip.createdAt).getTime()) ? new Date(trip.createdAt).toLocaleDateString() : 'Unknown Date'}
                        </div>
                        {trip.orders && trip.orders.length > 0 && <div className="mt-2 space-y-1">
                            {trip.orders.map((o: any) => <div key={o.id} className="text-[11px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full inline-block mr-1">
                                {o.orderNumber || o.referenceNumber}
                              </div>)}
                          </div>}
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="font-medium">{trip.truck?.plateNumber || 'No Truck'}</div>
                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${trip.driver ? 'bg-green-500' : 'bg-red-400'}`} />
                          {driverName}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <div className="flex flex-col gap-1.5 min-w-[280px]">
                          {pickup && <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary leading-snug">
                                  {pickup.address || pickup.city || 'TBD'}
                                </p>
                                {pickup.companyName && <p className="text-xs text-text-secondary">{pickup.companyName}</p>}
                                {pickup.requestedDateFrom && !isNaN(new Date(pickup.requestedDateFrom).getTime()) && <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold">{t("jsx_eTA")}{new Date(pickup.requestedDateFrom).toLocaleString()}
                                  </p>}
                              </div>
                            </div>}
                          {pickup && dropoff && pickup !== dropoff && <div className="ml-2 border-l-2 border-dashed border-border h-4" />}
                          {dropoff && pickup !== dropoff && <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary leading-snug">
                                  {dropoff.address || dropoff.city || 'TBD'}
                                </p>
                                {dropoff.companyName && <p className="text-xs text-text-secondary">{dropoff.companyName}</p>}
                                {dropoff.requestedDateFrom && !isNaN(new Date(dropoff.requestedDateFrom).getTime()) && <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 font-semibold">{t("jsx_eTA")}{new Date(dropoff.requestedDateFrom).toLocaleString()}
                                  </p>}
                              </div>
                            </div>}
                          {!pickup && !dropoff && <span className="text-sm text-text-muted">{t("jsx_noStopsDefine")}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3 align-top min-w-[200px]">
                        {/* Cargo Summary */}
                        {trip.orders && trip.orders.length > 0 ? <div className="flex flex-col gap-2">
                            {trip.orders.map((o: any) => {
                      const w = o.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || 0;
                      const ldm = o.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.ldm || 0), 0) || 0;
                      const items = o.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.quantity || 1), 0) || 0;
                      return w > 0 || items > 0 ? <div key={`cargo-${o.id}`} className="flex items-start gap-2 text-xs text-text-secondary bg-surface/50 p-2 rounded-lg border border-border/50">
                                  <Package className="w-4 h-4 text-primary shrink-0" />
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-text-primary">{items} {t('pallets', 'pallets')}</span>
                                    <span>{w > 0 && `${Number(w).toLocaleString()} kg`} {ldm > 0 && `• ${ldm.toFixed(1)} LDM`}</span>
                                  </div>
                                </div> : null;
                    })}
                          </div> : <span className="text-sm text-text-muted">-</span>}
                      </td>
                      <td className="px-5 py-3 align-top text-xs font-semibold space-y-1">
                        <div className="text-text-primary">{t("jsx_venit")}{revenue.toLocaleString()}</div>
                        <div className="text-text-secondary">{t("jsx_cost")}{cost.toLocaleString()}</div>
                      </td>
                      <td className="px-5 py-3 align-top">
                        <span className={`badge ${trip.status === 'planning' ? 'badge-warning' : trip.status === 'dispatched' ? 'badge-gray' : trip.status === 'active' || trip.status === 'in_progress' ? 'badge-primary' : trip.status === 'completed' ? 'badge-success' : 'badge-gray'}`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {trip.status === 'planning' && <button onClick={(e) => { e.stopPropagation(); handleDispatch(trip.id); }} title={t("jsx_trimiteDispat", "Send Dispatch")} className="p-2 text-text-secondary hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition-colors inline-flex items-center">
                            <Send className="w-5 h-5" />
                          </button>}
                          <button onClick={() => navigate(`/trips/${trip.id}`)} title="View Details" className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors inline-flex items-center">
                            <Eye className="w-5 h-5" />
                          </button>
                        <button onClick={e => {
                    e.stopPropagation();
                    handleDeleteClick(trip.id);
                  }} title="Delete Trip" className="p-2 text-text-secondary hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors inline-flex items-center">
                          <Trash2 className="w-5 h-5" />
                        </button>
                        </div>
                      </td>
                    </tr>;
            })}
              </tbody>
            </table>
          </div>}
        <Pagination currentPage={currentPage} totalItems={filteredTrips.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
      
      <ConfirmDeleteModal isOpen={deleteModalOpen} onClose={() => {
      setDeleteModalOpen(false);
      setTripToDelete(null);
    }} onConfirm={confirmDelete} />
    </div>;
}
