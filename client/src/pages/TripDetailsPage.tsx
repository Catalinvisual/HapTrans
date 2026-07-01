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
  const totalCost = addedCosts > 0 ? addedCosts : (Number(trip.realCost) || Number(trip.estimatedCost) || 0);
  const basePrice = Number(trip.agreedPrice || trip.price || 0);
  const profit = basePrice - totalCost;

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
          {trip.trackingToken && (
            <button 
              onClick={() => {
                const webUrl = `${window.location.origin}/track/${trip.trackingToken}`;
                navigator.clipboard.writeText(webUrl);
                toast.success(t('trackingLinkCopied', 'Link urmărire copiat!'));
              }}
              className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-primary/20 text-primary hover:bg-primary/5"
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
            <h3 className="font-bold text-lg text-text mb-6 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-primary" />
              {t('routeDetails', 'Detalii Rută')}
            </h3>
            
            <div className="relative pl-6 space-y-8">
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
            </div>
          </div>

          {/* Cargo Details */}
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              {t('cargoAndReferences', 'Detalii Marfă & Referințe')}
            </h3>
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

          {/* Financials - HIDE FOR DISPATCHERS */}
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
