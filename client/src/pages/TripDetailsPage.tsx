import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, MapPin, Calendar, Clock, Truck, User, 
  Layers, Scale, Box, DollarSign, FileText, FileBadge, 
  Navigation
} from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import { useAuthStore } from '../store/authStore';

const STATUS_COLORS: Record<string, string> = {
  pending: 'badge-gray', 
  confirmed: 'badge-primary', 
  in_progress: 'badge-warning',
  completed: 'badge-success', 
  cancelled: 'badge-error', 
  delayed: 'badge-error',
};

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isDispatcher = user?.role === 'dispatcher';

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const { data } = await api.get(`/trips/${id}`);
        setTrip(data);
      } catch (err) {
        toast.error('Cursa nu a putut fi încărcată');
        navigate('/trips');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchTrip();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) return null;

  const addedCosts = trip.costs?.reduce((s: number, c: any) => s + Number(c.amount), 0) || 0;
  const totalCost = addedCosts > 0 ? addedCosts : (Number(trip.realCost) || Number(trip.estimatedCost) || 0);
  const profit = Number(trip.price || 0) - totalCost;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/trips')} 
            className="p-2.5 bg-white border border-border rounded-xl hover:bg-surface text-text-secondary hover:text-primary transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">
                {trip.referenceNumber || 'RIT Fără Referință'}
              </h1>
              <span className={`${STATUS_COLORS[trip.status] || 'badge-gray'} uppercase px-3 py-1 rounded-lg text-xs font-black shadow-sm`}>
                {t(trip.status === 'in_progress' ? 'inProgress' : trip.status) || trip.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1 font-medium">
              Creat de <span className="text-primary font-bold">{trip.createdBy?.name || 'Sistem / Necunoscut'}</span> pe {formatDate(trip.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {trip.trackingToken && (
            <button 
              onClick={() => {
                const webUrl = `${window.location.origin}/track/${trip.trackingToken}`;
                navigator.clipboard.writeText(webUrl);
                toast.success('Link urmările copiat!');
              }}
              className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-primary/20 text-primary hover:bg-primary/5"
            >
              <Navigation className="w-4 h-4" /> Link Urmărire Client
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Route Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-white border border-border rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-green-500"></div>
            <h3 className="font-bold text-lg text-text mb-6 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              Detalii Rută
            </h3>
            
            <div className="relative pl-6 space-y-8">
              {/* Pickup */}
              <div className="relative">
                <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-blue-500 bg-white z-10"></div>
                <div className="absolute -left-[28px] top-5 w-0.5 h-full bg-border -z-0"></div>
                
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 block">Punct Încărcare (Pickup)</span>
                <h4 className="font-bold text-lg text-text">{trip.pickupCompanyName || trip.client?.name || 'N/A'}</h4>
                <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                  {trip.pickupAddress}
                </p>
                <div className="flex items-center gap-4 mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 w-fit">
                  <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    {trip.pickupDate ? formatDate(trip.pickupDate) : '-'}
                  </div>
                  {trip.pickupTime && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                      <Clock className="w-4 h-4 text-blue-500" />
                      {trip.pickupTime}
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery */}
              <div className="relative">
                <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-green-500 bg-white z-10"></div>
                
                <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">Punct Descărcare (Delivery)</span>
                <h4 className="font-bold text-lg text-text">{trip.dropoffCompanyName || 'N/A'}</h4>
                <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-green-400" />
                  {trip.dropoffAddress}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 bg-green-50/50 p-3 rounded-xl border border-green-100/50 w-fit">
                  <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                    <Calendar className="w-4 h-4 text-green-500" />
                    {trip.dropoffDate ? formatDate(trip.dropoffDate) : '-'}
                  </div>
                  {trip.dropoffTime && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                      <Clock className="w-4 h-4 text-green-500" />
                      {trip.dropoffTime}
                    </div>
                  )}
                  {trip.appointmentTo && (
                    <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-white px-2 py-1 rounded border border-green-200">
                      ETA Fixat: {formatDate(trip.appointmentTo)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Cargo Details */}
          <div className="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              Detalii Marfă & Referințe
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">PALEȚI</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Layers className="w-4 h-4 text-primary" />
                  {trip.pallets || 0} {trip.palletType ? `(${trip.palletType})` : ''}
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">GREUTATE</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Scale className="w-4 h-4 text-primary" />
                  {trip.weightKg || 0} kg
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">VOLUM</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Box className="w-4 h-4 text-primary" />
                  {trip.volumeCbm || 0} m³
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">DISTANȚĂ</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Navigation className="w-4 h-4 text-primary" />
                  {trip.distanceKm || 0} km
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <span className="text-xs font-semibold text-text-secondary block">Loading Reference</span>
                <span className="font-bold text-sm text-text">{trip.loadingReference || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">Unloading Reference</span>
                <span className="font-bold text-sm text-text">{trip.unloadingReference || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">CMR Reference</span>
                <span className="font-bold text-sm text-text">{trip.cmrReference || '-'}</span>
              </div>
            </div>
            
            {trip.notes && (
              <div className="mt-4 p-4 bg-yellow-50/50 border border-yellow-200 rounded-xl">
                <span className="text-xs font-bold text-yellow-800 uppercase block mb-1">Observații Interne</span>
                <p className="text-sm font-medium text-yellow-900">{trip.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financials & Assignments */}
        <div className="space-y-6">
          
          {/* Assignment */}
          <div className="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Alocare Echipaj
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-secondary block">Șofer</span>
                  <span className="font-bold text-sm text-text">{trip.driver?.user?.name || 'Neasignat'}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-secondary block">Camion</span>
                  <span className="font-bold text-sm text-text">{trip.truck?.plateNumber || 'Neasignat'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Financiar
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                <span className="text-sm font-semibold text-text-secondary">Preț Client</span>
                <span className="font-black text-lg text-success">€{Number(trip.price || 0).toLocaleString(i18n.language)}</span>
              </div>
              
              {!isDispatcher && (
                <>
                  <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                    <span className="text-sm font-semibold text-text-secondary">Cost Total</span>
                    <span className="font-bold text-text">€{totalCost.toLocaleString(i18n.language)}</span>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-xl border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>Profit Net</span>
                    <span className={`font-black text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profit >= 0 ? '+' : ''}€{profit.toLocaleString(i18n.language)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Documents summary */}
          <div className="card p-6 bg-white border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <FileBadge className="w-5 h-5 text-primary" />
              Atașamente
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Documente Cursă
                </span>
                <span className="badge-gray px-2 py-0.5 text-xs font-bold">{trip.documents?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Facturi (Invoices)
                </span>
                <span className="badge-gray px-2 py-0.5 text-xs font-bold">{trip.invoices?.length || 0}</span>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
