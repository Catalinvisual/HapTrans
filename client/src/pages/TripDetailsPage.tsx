import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, MapPin, Calendar, Clock, Truck, User, 
  Layers, Scale, Box, DollarSign, FileText, FileBadge, 
  Navigation, Eye, Download, Share2
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
  draft: 'badge-gray',
  sent: 'badge-primary',
  paid: 'badge-success',
  overdue: 'badge-error',
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
    const fetchTrip = async (isInitial = false) => {
      try {
        const { data } = await api.get(`/trips/${id}`);
        setTrip(data);
      } catch (err) {
        if (isInitial) {
          toast.error(t('errorLoadingTrip', 'Cursa nu a putut fi încărcată'));
          navigate('/trips');
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };
    
    if (id) {
      fetchTrip(true);
      const intervalId = setInterval(() => fetchTrip(false), 5000);
      return () => clearInterval(intervalId);
    }
  }, [id, navigate, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!trip) return null;

  const addedCosts = trip.costs?.reduce((s: number, c: any) => s + Number(c.amount), 0) || 0;
  const estimatedCost = Number(trip.distanceKm || 0) * Number(trip.truck?.costPerKm || 0);
  const totalCost = estimatedCost + addedCosts;
  const basePrice = trip.orders?.reduce((sum: number, o: any) => sum + (Number(o.price) || 0), 0) || Number(trip.price || 0);
  const profit = basePrice - totalCost;
  const profitMargin = basePrice > 0 ? (profit / basePrice) * 100 : 0;

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast.success(t('sharedSuccessfully', 'Distribuit cu succes!'));
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('linkCopied', 'Link copiat!'));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/trips')} 
            className="p-2.5 bg-card border border-border rounded-xl hover:bg-surface text-text-secondary hover:text-primary transition-all shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">
                {trip.referenceNumber || t('noReference', 'RIT Fără Referință')}
              </h1>
              <span className={`${STATUS_COLORS[trip.status] || 'badge-gray'} uppercase px-3 py-1 rounded-lg text-xs font-black shadow-sm`}>
                {t(trip.status === 'in_progress' ? 'inProgress' : trip.status) || trip.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1 font-medium">
              {t('createdBy', 'Creat de')} <span className="text-primary font-bold">{trip.createdBy?.name || t('systemUnknown', 'Sistem / Necunoscut')}</span> {t('onDate', 'pe')} {formatDate(trip.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {trip.status === 'planning' && (
            <button
              onClick={async () => {
                try {
                  await api.patch(`/trips/${trip.id}`, { status: 'dispatched' });
                  toast.success(t('tripDispatched', 'Cursa a fost trimisă către șofer!'));
                  window.location.reload();
                } catch (e) {
                  toast.error(t('dispatchError', 'Eroare la trimiterea cursei'));
                }
              }}
              className="btn-primary py-2 px-4 flex items-center gap-2 text-sm font-semibold shadow-md bg-primary text-white border-primary hover:bg-primary/95"
            >
              <Navigation className="w-4 h-4" /> {t('dispatchTrip', 'Trimite Cursă (Dispatch)')}
            </button>
          )}
          {trip.trackingToken && (
            <button 
              onClick={() => {
                const webUrl = `${window.location.origin}/track/${trip.trackingToken}`;
                const fallbackCopy = (text: string) => {
                  const textArea = document.createElement('textarea');
                  textArea.value = text;
                  textArea.style.position = 'fixed';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  try {
                    document.execCommand('copy');
                    toast.success(t('trackingLinkCopied', 'Link urmărire copiat!'));
                  } catch (err) {
                    toast.error('Nu s-a putut copia link-ul.');
                  }
                  document.body.removeChild(textArea);
                };

                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(webUrl)
                    .then(() => toast.success(t('trackingLinkCopied', 'Link urmărire copiat!')))
                    .catch(() => fallbackCopy(webUrl));
                } else {
                  fallbackCopy(webUrl);
                }
              }}
              className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-border text-text hover:bg-surface"
            >
              <Navigation className="w-4 h-4" /> {t('clientTrackingLink', 'Link Urmărire Client')}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Route Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-green-500"></div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg text-text flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                {t('routeDetails', 'Detalii Rută')}
              </h3>
              {trip.stops && trip.stops.length > 2 && (
                <button 
                  onClick={async () => {
                    try {
                      await api.post(`/trips/${trip.id}/optimize`);
                      toast.success('Route optimized successfully');
                      window.location.reload();
                    } catch (e) {
                      toast.error('Optimization failed');
                    }
                  }}
                  className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5" /> Optimize
                </button>
              )}
            </div>
            
            <div className="relative pl-6 space-y-8">
              {trip.stops && trip.stops.length > 0 ? (
                // --- NEW ROUTE TIMELINE ---
                [...trip.stops].sort((a, b) => a.sequence - b.sequence).map((stop: any, index: number, arr: any[]) => {
                  const isLast = index === arr.length - 1;
                  const isFirst = index === 0;
                  const isCompleted = stop.status === 'completed';
                  const isArrived = stop.status === 'arrived';
                  const isCurrent = !isCompleted && (index === 0 || arr[index - 1].status === 'completed');
                  
                  const markerColor = isCompleted ? 'green' : (isArrived || isCurrent ? 'amber' : 'gray');
                  const markerBorderClass = isCompleted ? 'border-green-500' : (isArrived || isCurrent ? 'border-amber-500 animate-pulse' : 'border-border');
                  const textClass = isCompleted ? 'text-green-600' : (isArrived || isCurrent ? 'text-amber-600' : 'text-text-muted');

                  const handleReorder = async (direction: 'up' | 'down') => {
                    const sortedStops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);
                    const stopIndex = sortedStops.findIndex(s => s.id === stop.id);
                    if (direction === 'up' && stopIndex > 0) {
                      const temp = sortedStops[stopIndex];
                      sortedStops[stopIndex] = sortedStops[stopIndex - 1];
                      sortedStops[stopIndex - 1] = temp;
                    } else if (direction === 'down' && stopIndex < sortedStops.length - 1) {
                      const temp = sortedStops[stopIndex];
                      sortedStops[stopIndex] = sortedStops[stopIndex + 1];
                      sortedStops[stopIndex + 1] = temp;
                    }
                    try {
                      await api.post(`/trips/${trip.id}/stops/reorder`, { stopIds: sortedStops.map(s => s.id) });
                      // Reload window for simplicity
                      window.location.reload();
                    } catch (e) {
                      toast.error('Failed to reorder stops');
                    }
                  };

                  return (
                    <div key={stop.id} className="relative group">
                      <div className={`absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 ${markerBorderClass} bg-card z-10`}></div>
                      {!isLast && <div className="absolute -left-[28px] top-5 w-0.5 h-full bg-border -z-0"></div>}
                      
                      <div className="absolute -left-[70px] top-0  transition-opacity flex flex-col items-center">
                        <button disabled={isFirst} onClick={() => handleReorder('up')} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30">▲</button>
                        <button disabled={isLast} onClick={() => handleReorder('down')} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30">▼</button>
                      </div>

                      <span className={`text-xs font-bold ${textClass} uppercase tracking-wider mb-1 block flex justify-between`}>
                        {t('stopIndex', 'Stop {{index}}', { index: stop.sequence })} - {t(stop.status)}
                        {stop.eta && (
                          <span className={`px-2 py-0.5 rounded ${stop.etaStatus === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            ETA: {formatDate(stop.eta)}
                          </span>
                        )}
                      </span>
                      <h4 className="font-bold text-lg text-text">{stop.companyName || 'N/A'}</h4>
                      <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                        <MapPin className={`w-4 h-4 shrink-0 mt-0.5 text-${markerColor}-400`} />
                        {stop.address}
                      </p>
                      
                      {/* Tasks List for this Stop */}
                      {stop.tasks && stop.tasks.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {stop.tasks.map((task: any) => (
                            <div key={task.id} className={`bg-${markerColor}-50/50 p-3 rounded-xl border border-${markerColor}-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                              <div>
                                <div className={`text-sm font-semibold text-${markerColor}-900 flex items-center gap-2`}>
                                  <Box className={`w-4 h-4 text-${markerColor}-500`} />
                                  <span className="capitalize">{t(task.type)}</span> - {t('orderRef', 'Order')}: {task.order?.referenceNumber || '#N/A'}
                                </div>
                                <div className="text-xs text-text-secondary mt-1">
                                  {task.plannedTime ? formatDate(task.plannedTime) : '-'} | {t('pallets')}: {task.pallets || 0} ({task.weightKg || 0} kg)
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded bg-white border shadow-sm ${task.status === 'completed' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                                {t(task.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                // --- OLD FALLBACK UI FOR UNMIGRATED TRIPS ---
                <>
                  {/* Pickup */}
                  <div className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-blue-500 bg-card z-10"></div>
                    <div className="absolute -left-[28px] top-5 w-0.5 h-full bg-border -z-0"></div>
                    
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 block">{t('pickupPoint', 'Punct Încărcare (Pickup)')}</span>
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
                    <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-green-500 bg-card z-10"></div>
                    
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">{t('deliveryPoint', 'Punct Descărcare (Delivery)')}</span>
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
                      
                      {/* ETA Display */}
                      {trip.lastLiveEta && (
                        <div className={`flex items-center gap-2 text-xs font-bold bg-card px-2 py-1 rounded border ${trip.etaStatus === 'on_time' ? 'text-green-700 border-green-200' : trip.etaStatus === 'at_risk' ? 'text-yellow-700 border-yellow-200' : 'text-red-700 border-red-200'}`}>
                          {t('liveEta', 'ETA Smart')}: {formatDate(trip.lastLiveEta)} {new Date(trip.lastLiveEta).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                      {trip.appointmentTo && !trip.lastLiveEta && (
                        <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-card px-2 py-1 rounded border border-green-200">
                          {t('plannedEta', 'ETA Planificat')}: {formatDate(trip.appointmentTo)}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Orders & Capacity Details */}
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              {trip.orders && trip.orders.length > 0 ? t('tripOrders', 'Comenzi (Orders)') : t('cargoAndReferences', 'Detalii Marfă & Referințe')}
            </h3>

            {trip.orders && trip.orders.length > 0 ? (
              <div className="space-y-4 mb-6">
                {trip.orders.map((order: any) => (
                  <div key={order.id} className="p-4 bg-surface rounded-xl border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="font-bold text-lg">{order.referenceNumber || t('noReference', 'Fără referință')}</div>
                      <div className="text-sm text-text-secondary">{order.client?.name || '-'}</div>
                    </div>
                    <div className="flex gap-4 text-sm font-semibold">
                      <div className="flex items-center gap-1"><Layers className="w-4 h-4 text-primary" /> {order.pallets || 0} pal</div>
                      <div className="flex items-center gap-1"><Scale className="w-4 h-4 text-primary" /> {order.weightKg || 0} kg</div>
                      <span className={`px-2 py-1 rounded badge badge-gray capitalize`}>{t(order.status)}</span>
                    </div>
                  </div>
                ))}

                {/* Capacity Summary */}
                <div className="mt-6 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <h4 className="text-sm font-bold text-primary mb-3">{t('truckCapacity', 'Capacitate Camion (Total estimat)')}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>{t('weight', 'Greutate')}</span>
                        <span>{trip.orders.reduce((sum: number, o: any) => sum + (o.weightKg || 0), 0)} kg / 24000 kg</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (trip.orders.reduce((sum: number, o: any) => sum + (o.weightKg || 0), 0) / 24000) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-bold mb-1">
                        <span>{t('pallets', 'Paleți')}</span>
                        <span>{trip.orders.reduce((sum: number, o: any) => sum + (o.pallets || 0), 0)} / 33</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${Math.min(100, (trip.orders.reduce((sum: number, o: any) => sum + (o.pallets || 0), 0) / 33) * 100)}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">{t('pallets', 'PALEȚI').toUpperCase()}</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Layers className="w-4 h-4 text-primary" />
                  {trip.pallets || 0} {trip.palletType ? `(${trip.palletType})` : ''}
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">{t('weight', 'GREUTATE').toUpperCase()}</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Scale className="w-4 h-4 text-primary" />
                  {trip.weightKg || 0} kg
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">{t('volume', 'VOLUM').toUpperCase()}</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Box className="w-4 h-4 text-primary" />
                  {trip.volumeCbm || 0} m³
                </div>
              </div>
              <div className="p-4 bg-surface rounded-xl border border-border">
                <span className="text-xs text-text-secondary font-bold block mb-1">{t('distance', 'DISTANȚĂ').toUpperCase()}</span>
                <div className="flex items-center gap-2 font-bold text-lg text-text">
                  <Navigation className="w-4 h-4 text-primary" />
                  {trip.distanceKm || 0} km
                </div>
              </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('loadingReference', 'Loading Reference')}</span>
                <span className="font-bold text-sm text-text">{trip.loadingReference || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('unloadingReference', 'Unloading Reference')}</span>
                <span className="font-bold text-sm text-text">{trip.unloadingReference || '-'}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('cmrReference', 'CMR Reference')}</span>
                <span className="font-bold text-sm text-text">{trip.cmrReference || '-'}</span>
              </div>
            </div>
            
            {trip.notes && (
              <div className="mt-4 p-4 bg-yellow-50/50 border border-yellow-200 rounded-xl">
                <span className="text-xs font-bold text-yellow-800 uppercase block mb-1">{t('internalNotes', 'Observații Interne')}</span>
                <p className="text-sm font-medium text-yellow-900">{trip.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Financials & Assignments */}
        <div className="space-y-6">
          
          {/* Assignment */}
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              {t('crewAllocation', 'Alocare Echipaj')}
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-secondary block">{t('driver', 'Șofer')}</span>
                  <span className="font-bold text-sm text-text">{trip.driver?.user?.name || t('unassigned', 'Neasignat')}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-secondary block">{t('truck', 'Camion')}</span>
                  <span className="font-bold text-sm text-text">{trip.truck?.plateNumber || t('unassigned', 'Neasignat')}</span>
                </div>
              </div>
            </div>
          </div>

          {!isDispatcher && (
            <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                {t('financial', 'Financiar')}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('clientPrice', 'Preț Client')}</span>
                  <span className="font-black text-lg text-success">€{basePrice.toLocaleString(i18n.language)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('totalCost', 'Cost Total')}</span>
                  <span className="font-bold text-text">€{totalCost.toLocaleString(i18n.language)}</span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-xl border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>{t('netProfit', 'Profit Net')}</span>
                  <span className={`font-black text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}€{profit.toLocaleString(i18n.language)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">Marjă Profit</span>
                  <span className={`font-bold ${
                    profitMargin >= 10 ? 'text-green-600' :
                    profitMargin >= 0 ? 'text-yellow-600' : 'text-red-500'
                  }`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Documents summary */}
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <FileBadge className="w-5 h-5 text-primary" />
              {t('attachments', 'Atașamente')}
            </h3>
            
            {/* Documents List */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-text-secondary flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" /> {t('tripDocuments', 'Documente Cursă')}
                </div>
                <span className="badge-gray px-2 py-0.5 text-xs font-bold">{trip.documents?.length || 0}</span>
              </h4>
              
              {trip.documents?.length > 0 ? (
                <div className="space-y-2">
                  {trip.documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold truncate" title={doc.fileName || doc.documentType}>
                          {doc.fileName || doc.documentType || 'Document'}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {doc.fileUrl && (
                          <>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </a>
                            <a href={doc.fileUrl} download className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleShare(doc.fileUrl, doc.fileName || doc.documentType)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary px-2">{t('noDocuments', 'Niciun document atașat')}</p>
              )}

              {/* Stop Task Documents */}
              {trip.stops?.some((stop: any) => stop.tasks?.some((t: any) => t.documents?.length > 0 || t.signatureUrl)) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold text-text-secondary flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileBadge className="w-4 h-4" /> {t('taskDocuments', 'Documente de la Opriri')}
                    </div>
                  </h4>
                  <div className="space-y-3">
                    {trip.stops.map((stop: any) => stop.tasks?.map((task: any) => {
                      const hasDocs = task.documents?.length > 0;
                      const hasSig = !!task.signatureUrl;
                      if (!hasDocs && !hasSig) return null;

                      return (
                        <div key={task.id} className="bg-surface/50 p-3 rounded-xl border border-border">
                          <div className="text-xs font-bold text-text mb-2 flex items-center gap-2">
                            <Box className="w-3 h-3 text-primary" />
                            {t('order', 'Comanda')} {task.order?.referenceNumber || '#N/A'} - {t(task.type)}
                          </div>
                          <div className="space-y-2">
                            {task.documents?.map((doc: any) => (
                              <div key={doc.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-semibold truncate">
                                    {doc.fileName || doc.documentType || 'Document'}
                                  </span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {doc.fileUrl && (
                                    <>
                                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-secondary hover:text-primary transition-colors">
                                        <Eye className="w-3.5 h-3.5" />
                                      </a>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                            {task.signatureUrl && (
                              <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-semibold truncate">{t('signature', 'Semnătură Șofer/Client')}</span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <a href={task.signatureUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-secondary hover:text-primary transition-colors">
                                    <Eye className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }))}
                  </div>
                </div>
              )}

              {/* Invoices List */}
              <h4 className="text-sm font-semibold text-text-secondary flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> {t('invoices', 'Facturi (Invoices)')}
                </div>
                <span className="badge-gray px-2 py-0.5 text-xs font-bold">{trip.invoices?.length || 0}</span>
              </h4>

              {trip.invoices?.length > 0 ? (
                <div className="space-y-2">
                  {trip.invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                      <div className="flex items-center gap-2 truncate">
                        <FileBadge className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold truncate">#{inv.invoiceNumber || 'Draft'}</span>
                        <span className={`${STATUS_COLORS[inv.status] || 'badge-gray'} text-[10px] px-1.5 py-0.5 rounded uppercase font-bold`}>{t(inv.status)}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {inv.pdfUrl ? (
                          <>
                            <button onClick={() => window.open(inv.pdfUrl, '_blank')} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <a href={inv.pdfUrl} download={`Invoice_${inv.invoiceNumber}.pdf`} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleShare(inv.pdfUrl, `Invoice_${inv.invoiceNumber}.pdf`)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : inv.pdfData ? (
                          <>
                             <button onClick={() => {
                                const newTab = window.open();
                                if (newTab) newTab.document.write(`<iframe src="${inv.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`);
                             }} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                             </button>
                             <a href={inv.pdfData} download={`Invoice_${inv.invoiceNumber}.pdf`} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary px-2">{t('noInvoices', 'Nicio factură')}</p>
              )}
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
