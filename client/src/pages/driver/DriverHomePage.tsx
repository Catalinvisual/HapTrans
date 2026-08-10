import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, MapPin, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/dateUtils';

const STATUS_ORDER: Record<string, number> = {
  planning: 0, planned: 0, dispatched: 0, assigned: 0,
  driver_accepted: 1, loading: 2, driving: 3,
  partially_delivered: 4, completed: 5, closed: 5,
};

export default function DriverHomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (silent = false) => {
    try {
      const r = await api.get('/driver/trips');
      setTrips(r.data);
    } catch (e: any) {
      if (!silent) {
        toast.error(e?.response?.data?.message || t('error', 'Eroare'));
        if (e?.response?.status === 401) navigate('/login', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const activeTrips = trips.filter(x => !['cancelled', 'closed', 'completed'].includes(x.status));
  const pastTrips = trips.filter(x => ['completed', 'closed', 'cancelled'].includes(x.status));

  const acceptTrip = async (id: string) => {
    try {
      await api.patch(`/driver/trips/${id}/status`, { status: 'driver_accepted' });
      toast.success(t('tripAccepted', 'Cursă acceptată!'));
      load(true);
    } catch { toast.error(t('error', 'Eroare')); }
  };

  const routeLabel = (trip: any) => {
    const stops = (trip.stops || []).slice().sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1));
    if (!stops.length) return trip.tripNumber || 'N/A';
    const loc = (s: any) => [s.city, s.country].filter(Boolean).join(', ') || s.companyName || s.address || '—';
    return `${loc(stops[0])} → ${loc(stops[stops.length - 1])}`;
  };

  const TripCard = ({ trip, past }: { trip: any; past?: boolean }) => (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors space-y-3">
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-bold text-text">{trip.tripNumber || 'Cursă'}</p>
          <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5"><Truck className="w-3 h-3" /> {trip.truck?.plateNumber || '—'}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide ${trip.status === 'completed' || trip.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : trip.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
          {t('status_' + trip.status, trip.status)}
        </span>
      </div>
      <p className="text-sm font-medium flex items-start gap-1.5"><MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {routeLabel(trip)}</p>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{t('ordersCount', 'Comenzi')}: {trip.orders?.length || 0}</span>
        <span>{trip.scheduledDate ? formatDate(trip.scheduledDate) : formatDate(trip.plannedDeparture || trip.createdAt)}</span>
      </div>
      {!past && (trip.status === 'dispatched' || trip.status === 'assigned' || trip.status === 'planned' || trip.status === 'planning') && (
        <button onClick={() => acceptTrip(trip.id)} className="w-full btn-primary py-2 text-sm font-bold flex items-center justify-center gap-1">
          <CheckCircle2 className="w-4 h-4" /> {t('acceptTrip', 'Acceptă Cursa')}
        </button>
      )}
      <button onClick={() => navigate(`/driver/trips/${trip.id}`)} className="w-full btn-secondary py-2 text-xs font-bold flex items-center justify-center gap-1">
        {t('viewDetails', 'Detalii')} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('myTrips', 'Cursurile mele')}</h1>
        <button onClick={() => load(true)} className="p-2 text-text-secondary hover:text-primary transition-colors" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-text-secondary">{t('loading', 'Se încarcă...')}</div>
      ) : (
        <>
          {activeTrips.length === 0 && (
            <div className="text-center py-16">
              <Truck className="w-12 h-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">{t('noActiveTrips', 'Nicio cursă activă')}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTrips.map(trip => <TripCard key={trip.id} trip={trip} />)}
          </div>
          {pastTrips.length > 0 && (
            <>
              <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider pt-2">{t('history', 'Istoric')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastTrips.slice(0, 6).map(trip => <TripCard key={trip.id} trip={trip} past />)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
