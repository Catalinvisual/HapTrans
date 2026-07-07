import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Truck, MapPin, Search, Loader2, ArrowRight, Eye, MoreHorizontal, Calendar, Package } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function TripsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const res = await api.get('/trips');
      // Sort trips by creation date (newest first)
      const sorted = res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTrips(sorted);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

  const filteredTrips = trips.filter(tr => 
    tr.tripNumber?.toLowerCase().includes(search.toLowerCase()) ||
    tr.truck?.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    tr.driver?.firstName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trips Management</h1>
          <p className="text-sm text-text-secondary mt-1">Manage, track, and review all active and completed trips.</p>
        </div>
      </div>

      <div className="card overflow-hidden border border-border">
        <div className="p-4 border-b border-border bg-surface/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search by Trip ID, Truck, or Driver..."
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
        ) : filteredTrips.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mb-4 text-text-muted">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-text-primary">No trips found</h3>
            <p className="text-text-secondary mt-1 max-w-sm">No trips match your search or you haven't assigned any orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface/50 border-b border-border">
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Trip & Orders</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Fleet</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Routing & Cargo</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="p-4 font-semibold text-sm text-text-secondary uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTrips.map(trip => {
                  const driverName = trip.driver ? (trip.driver.firstName ? `${trip.driver.firstName} ${trip.driver.lastName || ''}`.trim() : trip.driver.name || 'Unknown Driver') : 'No Driver';
                  // Get stops sorted by sequence
                  const stops = trip.stops ? [...trip.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];
                  const pickup = stops[0];
                  const dropoff = stops[stops.length - 1];

                  return (
                    <tr key={trip.id} className="hover:bg-surface/30 transition-colors group">
                      <td className="p-4 align-top">
                        <div className="font-semibold text-primary">{trip.tripNumber || trip.id.slice(0, 8)}</div>
                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </div>
                        {trip.orders && trip.orders.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {trip.orders.map((o: any) => (
                              <div key={o.id} className="text-[11px] bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-full inline-block mr-1">
                                {o.orderNumber || o.referenceNumber}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <div className="font-medium">{trip.truck?.plateNumber || 'No Truck'}</div>
                        <div className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${trip.driver ? 'bg-green-500' : 'bg-red-400'}`} />
                          {driverName}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-col gap-2 min-w-[280px]">
                          {pickup && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary leading-snug">
                                  {pickup.address || pickup.city || 'TBD'}
                                </p>
                                {pickup.companyName && <p className="text-xs text-text-secondary">{pickup.companyName}</p>}
                                {pickup.requestedDateFrom && (
                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5 font-semibold">
                                    ETA: {new Date(pickup.requestedDateFrom).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {pickup && dropoff && pickup !== dropoff && (
                            <div className="ml-2 border-l-2 border-dashed border-border h-4" />
                          )}
                          {dropoff && pickup !== dropoff && (
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary leading-snug">
                                  {dropoff.address || dropoff.city || 'TBD'}
                                </p>
                                {dropoff.companyName && <p className="text-xs text-text-secondary">{dropoff.companyName}</p>}
                                {dropoff.requestedDateFrom && (
                                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 font-semibold">
                                    ETA: {new Date(dropoff.requestedDateFrom).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                          {!pickup && !dropoff && (
                            <span className="text-sm text-text-muted">No stops defined</span>
                          )}
                          
                          {/* Cargo Summary */}
                          {trip.orders && trip.orders.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-border flex flex-wrap gap-3">
                              {trip.orders.map((o: any) => {
                                const w = o.cargoItems?.reduce((sum: number, c: any) => sum + (c.weightKg || 0), 0) || 0;
                                const items = o.cargoItems?.reduce((sum: number, c: any) => sum + (c.quantity || 1), 0) || 0;
                                return (w > 0 || items > 0) ? (
                                  <div key={`cargo-${o.id}`} className="flex items-center gap-1 text-xs text-text-secondary">
                                    <Package className="w-3.5 h-3.5" />
                                    <span>{items} items {w > 0 && `(${Number(w).toLocaleString()} kg)`}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`badge ${
                            trip.status === 'planning' ? 'badge-warning' :
                            trip.status === 'active' || trip.status === 'in_progress' ? 'badge-primary' :
                            trip.status === 'completed' ? 'badge-success' :
                            'badge-gray'
                          }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="p-2 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5" />
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
    </div>
  );
}
