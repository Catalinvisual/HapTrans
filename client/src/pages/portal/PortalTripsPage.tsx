import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, Search } from 'lucide-react';
import { useSearchParams, Link } from 'react-router-dom';
import portalApi from '../../lib/portalApi';
import Pagination from '../../components/Pagination';

export default function PortalTripsPage() {
  const { t } = useTranslation();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  useEffect(() => {
    portalApi.get('/portal/trips').then(r => {
      setTrips(r.data);
      setLoading(false);
    });
  }, []);

  const totalPages = Math.ceil(trips.length / limit);
  const paginatedTrips = trips.slice((page - 1) * limit, page * limit);

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString(), limit: limit.toString() });
  };

  const handleLimitChange = (newLimit: number) => {
    setSearchParams({ page: '1', limit: newLimit.toString() });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Active Trips & Tracking</h1>
      </div>

      <div className="card bg-card border border-border rounded-2xl shadow-sm p-4">
        {loading ? (
          <div className="py-12 text-center text-text-secondary">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">No active trips found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedTrips.map(trip => (
              <div key={trip.id} className="bg-surface border border-border p-4 rounded-xl hover:border-primary/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold">{trip.truck?.plateNumber || 'TBD'}</p>
                      <p className="text-xs text-text-secondary">Driver: {trip.driver?.name || 'TBD'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${trip.status === 'in-progress' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {trip.status}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-text-secondary">Current Location:</span> <span className="font-bold flex items-center"><MapPin className="w-3 h-3 mr-1 text-primary"/> In Transit (GPS Active)</span></p>
                  <p className="flex justify-between"><span className="text-text-secondary">Orders:</span> <span className="font-bold">{trip.orders?.length || 0}</span></p>
                </div>

                {trip.orders?.[0]?.trackingToken ? (
                  <Link to={`/track/${trip.orders[0].trackingToken}`} className="block text-center w-full mt-4 btn-secondary py-2 text-primary font-bold hover:bg-primary hover:text-white transition-colors">
                    View Map
                  </Link>
                ) : (
                  <button disabled className="w-full mt-4 btn-secondary py-2 text-text-secondary opacity-50 cursor-not-allowed font-bold">
                    No map available
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {trips.length > 0 && (
          <div className="p-4 border-t border-border mt-4 flex justify-center">
            <Pagination
              currentPage={page}
              totalItems={trips.length}
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
