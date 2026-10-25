import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Truck,
  User,
  Box,
  Euro,
  FileText,
  FileBadge,
  Navigation,
  Eye,
  Wand2,
  Download,
  Share2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import api from '../lib/api';
import { fmtMoney, fmtMoneySigned, fmtPercent } from '../lib/format';
import toast from 'react-hot-toast';
import { formatDate } from '../lib/dateUtils';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { generateTripPdf } from '../lib/pdfGenerator';
import { archiveAndDownloadPdf } from '../lib/pdfArchiveHelper';
import PalletIcon from '../components/icons/PalletIcon';
import WeightKgIcon from '../components/icons/WeightKgIcon';

const TRIP_STATUSES = [
  'planning',
  'planned',
  'assigned',
  'dispatched',
  'driver_accepted',
  'started',
  'loading',
  'driving',
  'partially_delivered',
  'completed',
  'closed',
  'cancelled',
];

const TASK_STATUS_CONFIG: Record<string, { labelKey: string; defaultLabel: string; color: string }> = {
  pending: { labelKey: 'pending', defaultLabel: 'În așteptare', color: 'bg-amber-500/10 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  assigned: { labelKey: 'status_assigned', defaultLabel: 'Atribuit', color: 'bg-blue-500/10 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
  arrived: { labelKey: 'arrived', defaultLabel: 'Sosit la rampă', color: 'bg-cyan-500/10 text-cyan-700 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800' },
  in_progress: { labelKey: 'inProgress', defaultLabel: 'În desfășurare', color: 'bg-indigo-500/10 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800' },
  loading: { labelKey: 'loading', defaultLabel: 'La Încărcare', color: 'bg-purple-500/10 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' },
  unloading: { labelKey: 'unloading', defaultLabel: 'La Descărcare', color: 'bg-orange-500/10 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
  completed: { labelKey: 'completed', defaultLabel: 'Finalizat', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
  problem: { labelKey: 'problem', defaultLabel: 'Problemă / Daună', color: 'bg-rose-500/10 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' },
  cancelled: { labelKey: 'cancelled', defaultLabel: 'Anulat', color: 'bg-gray-500/10 text-gray-700 border-gray-300 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700' },
};

const STOP_STATUS_CONFIG: Record<string, { labelKey: string; defaultLabel: string }> = {
  pending: { labelKey: 'pending', defaultLabel: 'În așteptare' },
  arrived: { labelKey: 'arrived', defaultLabel: 'Sosit la locație' },
  completed: { labelKey: 'completed', defaultLabel: 'Finalizat' },
  problem: { labelKey: 'problem', defaultLabel: 'Problemă' },
  cancelled: { labelKey: 'cancelled', defaultLabel: 'Anulat' },
};

const STATUS_COLORS: Record<string, string> = {
  planning: 'badge-warning',
  planned: 'badge-warning',
  dispatched: 'badge-primary',
  assigned: 'badge-primary',
  driver_accepted: 'badge-primary',
  started: 'badge-warning',
  loading: 'badge-warning',
  driving: 'badge-warning',
  partially_delivered: 'badge-warning',
  pending: 'badge-gray',
  confirmed: 'badge-primary',
  in_progress: 'badge-warning',
  completed: 'badge-success',
  closed: 'badge-gray',
  cancelled: 'badge-error',
  delayed: 'badge-error',
  draft: 'badge-gray',
  sent: 'badge-primary',
  paid: 'badge-success',
  overdue: 'badge-error'
};

const getOrderPallets = (o: any) => o.cargoItems?.reduce((sum: number, c: any) => sum + (c.unit === 'pallet' ? Number(c.quantity || 1) : 0), 0) || Number(o.pallets || 0);
const getOrderWeight = (o: any) => o.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || Number(o.weightKg || 0);

const normAddr = (s: any) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const addrMatch = (a: any, b: any): boolean => {
  const x = normAddr(a), y = normAddr(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length >= 12 && (x.includes(y) || y.includes(x))) return true;
  return false;
};

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [trip, setTrip] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isDispatcher = user?.role === 'dispatcher';
  useEffect(() => {
    const fetchTrip = async (isInitial = false) => {
      try {
        const [tripRes, timelineRes] = await Promise.all([
          api.get(`/trips/${id}`), 
          api.get(`/planning/audit?tripId=${id}`).catch(() => ({ data: { events: [] } }))
        ]);
        setTrip(tripRes.data);
        setTimeline(timelineRes.data?.events || []);
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
    fetchTrip(true);
  }, [id, t, navigate]);

  // Stop & Task Builder handlers
  const handleAddStop = async () => {
    if (!trip) return;
    try {
      const newStop = {
        address: "",
        companyName: "",
        country: "RO",
        type: "pickup",
        timeWindowMin: null,
        timeWindowMax: null,
        latitude: null,
        longitude: null,
        distanceToStopKm: null,
        contactPerson: "",
        phone: "",
        email: "",
        reference: "",
        rampDock: "",
      };
      await api.post(`/trips/${trip.id}/stops`, newStop);
      toast.success(t("stopAdded", "Oprire adăugată"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };



  if (loading) {
    return <div className="flex items-center justify-center h-[70vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>;
  }
  if (!trip) return null;
  
  const sortedStops = trip.stops ? [...trip.stops].sort((a: any, b: any) => a.sequence - b.sequence) : [];
  const pickupRef = trip.orders?.map((o: any) => o.loadingReference || o.stops?.find((s: any) => s.type === 'pickup')?.reference || o.customerReference).filter(Boolean).join(', ') || '-';
  const deliveryRef = trip.orders?.map((o: any) => o.unloadingReference || o.stops?.find((s: any) => s.type === 'dropoff')?.reference).filter(Boolean).join(', ') || '-';
  
  // Segment calculations
  const truckMaxWeight = trip.truck?.maxWeightKg || 24000;
  const truckMaxPallets = trip.truck?.maxPallets || 33;
  let runningWeight = 0;
  let runningPallets = 0;
  
  const segments = sortedStops.map((stop, index) => {
    let loadW = 0, loadP = 0, unloadW = 0, unloadP = 0;
    if (stop.tasks && stop.tasks.length > 0) {
      stop.tasks.forEach((t: any) => {
        if (t.type === 'load') { loadW += Number(t.weightKg || 0); loadP += Number(t.pallets || 0); }
        if (t.type === 'unload') { unloadW += Number(t.weightKg || 0); unloadP += Number(t.pallets || 0); }
      });
    }
    const taskHasCargo = loadW + loadP + unloadW + unloadP > 0;
    if (!taskHasCargo) {
      // Fallback for legacy / AI-imported trips whose stop tasks were never
      // populated: derive the load/unload from the assigned orders' cargo,
      // matched to the trip stop by address (orders carry their own stops).
      const stopAddr = stop.address || stop.city || stop.companyName || '';
      for (const o of trip.orders || []) {
        for (const s of o.stops || []) {
          const type = String(s.type || '').toLowerCase();
          const matches = addrMatch(s.address || s.city || s.companyName || '', stopAddr);
          if (!matches) continue;
          if (type === 'pickup' || type === 'load') { loadW += getOrderWeight(o); loadP += getOrderPallets(o); }
          if (type === 'dropoff' || type === 'delivery' || type === 'unload') { unloadW += getOrderWeight(o); unloadP += getOrderPallets(o); }
        }
      }
      const matched = loadW + loadP + unloadW + unloadP > 0;
      if (!matched) {
        // No address match — heuristic: first stop takes the whole load in,
        // last stop delivers it (e.g. single-leg trips without order stops).
        const totalW = (trip.orders || []).reduce((s, o) => s + getOrderWeight(o), 0);
        const totalP = (trip.orders || []).reduce((s, o) => s + getOrderPallets(o), 0);
        if (index === 0) { loadW = totalW; loadP = totalP; }
        if (index === sortedStops.length - 1) { unloadW = totalW; unloadP = totalP; }
      }
    }
    runningWeight = runningWeight + loadW - unloadW;
    runningPallets = runningPallets + loadP - unloadP;
    return {
      stopName: stop.city || stop.companyName || `Stop ${index + 1}`,
      weight: Math.max(0, runningWeight),
      pallets: Math.max(0, runningPallets)
    };
  });
  
  const addedCosts = trip.costs?.reduce((s: number, c: any) => s + Number(c.amount), 0) || 0;
  const estimatedCost = trip.orders?.reduce((sum: number, o: any) => sum + (Number(o.estimatedCost) || 0), 0) || 0;
  const totalCost = estimatedCost > 0 ? estimatedCost + addedCosts : addedCosts;
  
  const basePrice = trip.orders?.reduce((sum: number, o: any) => sum + (Number(o.price) || 0), 0) || Number(trip.price || 0);
  const profit = basePrice - totalCost;
  const profitMargin = basePrice > 0 ? profit / basePrice * 100 : 0;
  

  const handleShare = async (url: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url
        });
        toast.success(t('sharedSuccessfully', 'Distribuit cu succes!'));
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success(t('linkCopied', 'Link copiat!'));
    }
  };
  return <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/trips')} className="p-2.5 bg-card border border-border rounded-xl hover:bg-surface text-text-secondary hover:text-primary transition-all shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text">
                {trip.tripNumber || trip.referenceNumber || t('noReference', 'Trip Without Reference')}
              </h1>
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Trip status"
                  className={`appearance-none text-xs font-black uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-xl border shadow-xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${STATUS_COLORS[trip.status] || 'badge-gray'}`}
                  value={trip.status || 'planned'}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    try {
                      await api.patch(`/trips/${trip.id}`, { status: newStatus });
                      setTrip((prev: any) => ({ ...prev, status: newStatus }));
                      toast.success(t('status_updated', 'Status cursă actualizat!'));
                    } catch (err: any) {
                      toast.error(err?.response?.data?.message || t('error', 'Eroare la actualizarea statusului'));
                    }
                  }}
                >
                  {TRIP_STATUSES.map(st => (
                    <option key={st} value={st} className="bg-card text-text font-semibold capitalize">
                      {t(`status_${st}`, st.replace(/_/g, ' '))}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-70" />
              </div>
            </div>
            <p className="text-sm text-text-secondary mt-1 font-medium">
              {t('createdBy', 'Creat de')} <span className="text-primary font-bold">{trip.dispatcher?.name || trip.dispatcher?.email || trip.createdBy?.name || trip.createdBy?.email || t('systemUnknown', 'Sistem / Necunoscut')}</span> {t('onDate', 'pe')} {formatDate(trip.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 items-center">
          <button
            onClick={async () => {
              const company = useSettingsStore.getState().company;
              try {
                const { blob, filename } = await generateTripPdf(trip, company, { autoSave: false });
                await archiveAndDownloadPdf({
                  pdfBlob: blob,
                  defaultFilename: filename,
                  sourceType: 'trip',
                  sourceId: trip.id,
                  sourceReference: trip.tripNumber || String(trip.id),
                });
              } catch {
                toast.error(t('error_pdf', 'Failed to generate PDF'));
              }
            }}
            className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-border text-text hover:bg-surface"
            title={t('download_trip_pdf', { reference: trip.tripNumber || 'Trip', defaultValue: 'Download trip sheet PDF: {{reference}}' })}
          >
            <FileText className="w-4 h-4" /> {t('pdf', 'PDF')}
          </button>
          {trip.status === 'planning' && <button onClick={async () => {
          try {
            await api.patch(`/trips/${trip.id}`, {
              status: 'dispatched'
            });
            toast.success(t('tripDispatched', 'Cursa a fost trimisă către șofer!'));
            window.location.reload();
          } catch (e) {
            toast.error(t('dispatchError', 'Eroare la trimiterea cursei'));
          }
        }} className="btn-primary py-2 px-4 flex items-center gap-2 text-sm font-semibold shadow-md bg-primary text-white border-primary hover:bg-primary/95">
              <Navigation className="w-4 h-4" /> {t('dispatchTrip', 'Trimite Cursă (Dispatch)')}
            </button>}
          {trip.trackingToken && <button onClick={() => {
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
              toast.error(t("toast_nuSAPututCo"));
            }
            document.body.removeChild(textArea);
          };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(webUrl).then(() => toast.success(t('trackingLinkCopied', 'Link urmărire copiat!'))).catch(() => fallbackCopy(webUrl));
          } else {
            fallbackCopy(webUrl);
          }
        }} className="btn-secondary py-2 px-4 flex items-center gap-2 text-sm font-semibold border-border text-text hover:bg-surface">
              <Navigation className="w-4 h-4" /> {t('clientTrackingLink', 'Link Urmărire Client')}
            </button>}
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
              {trip.stops && trip.stops.length > 2 && <button onClick={async () => {
              try {
                await api.post(`/trips/${trip.id}/optimize`);
                toast.success(t("toast_routeOptimized"));
                window.location.reload();
              } catch (e) {
                toast.error(t("toast_optimizationFa"));
              }
            }} className="btn-primary py-1.5 px-3 text-xs flex items-center gap-2">
                  <Wand2 className="w-3.5 h-3.5" />{t("jsx_optimize", "Smart Optimize")}</button>}
            <button onClick={handleAddStop} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> {t("addStop", "Adaugă Oprire")}
            </button>
            </div>
            
            <div className="relative pl-6 space-y-8">
              {trip.stops && trip.stops.length > 0 ?
            // --- NEW ROUTE TIMELINE ---
            [...trip.stops].sort((a, b) => a.sequence - b.sequence).map((stop: any, index: number, arr: any[]) => {
              const isLast = index === arr.length - 1;
              const isFirst = index === 0;
              const isCompleted = stop.status === 'completed';
              const isArrived = stop.status === 'arrived';
              const isCurrent = !isCompleted && (index === 0 || arr[index - 1].status === 'completed');
              const markerColor = isCompleted ? 'green' : isArrived || isCurrent ? 'amber' : 'gray';
              const markerBorderClass = isCompleted ? 'border-green-500' : isArrived || isCurrent ? 'border-amber-500 animate-pulse' : 'border-border';
              const textClass = isCompleted ? 'text-green-600' : isArrived || isCurrent ? 'text-amber-600' : 'text-text-muted';
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
                  await api.post(`/trips/${trip.id}/stops/reorder`, {
                    stopIds: sortedStops.map(s => s.id)
                  });
                  // Reload window for simplicity
                  window.location.reload();
                } catch (e) {
                  toast.error(t("toast_failedToReord"));
                }
              };
              return <div key={stop.id} className="relative group">
                      <div className={`absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 ${markerBorderClass} bg-card z-10`}></div>
                      {!isLast && <div className="absolute -left-[28px] top-5 w-0.5 h-full bg-border -z-0"></div>}
                      
                      <div className="absolute -left-[70px] top-0  transition-opacity flex flex-col items-center">
                        <button disabled={isFirst} onClick={() => handleReorder('up')} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30">▲</button>
                        <button disabled={isLast} onClick={() => handleReorder('down')} className="p-1 text-text-secondary hover:text-primary disabled:opacity-30">▼</button>
                      </div>

                      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold ${textClass} uppercase tracking-wider`}>
                            {String(t('stopIndex', 'Stop {{index}}', {
                              index: stop.sequence
                            })).replace('{{index}}', stop.sequence.toString())}
                          </span>
                          <div className="relative inline-flex items-center">
                            <select
                              aria-label="Stop status"
                              className="appearance-none text-[11px] font-bold pl-2 pr-6 py-0.5 rounded-lg border border-border/80 bg-card text-text hover:border-primary/50 cursor-pointer transition-colors focus:outline-none"
                              value={stop.status || 'pending'}
                              onChange={async e => {
                                const v = e.target.value;
                                try {
                                  await api.patch('/trips/stops/' + stop.id + '/status', { status: v });
                                  setTrip((prev: any) => ({
                                    ...prev,
                                    stops: prev.stops?.map((st: any) => st.id === stop.id ? { ...st, status: v } : st)
                                  }));
                                  toast.success(t('saved', 'Status oprire salvat'));
                                } catch (err: any) {
                                  toast.error(err?.response?.data?.message || t('error', 'Eroare'));
                                }
                              }}
                            >
                              {Object.entries(STOP_STATUS_CONFIG).map(([stKey, cfg]) => (
                                <option key={stKey} value={stKey} className="bg-card text-text">
                                  {t(cfg.labelKey, cfg.defaultLabel)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 pointer-events-none opacity-60" />
                          </div>
                        </div>
                        {stop.eta && <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stop.etaStatus === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{t("jsx_eTA")}{formatDate(stop.eta)}</span>}
                      </div>
                      <h4 className="font-bold text-lg text-text">{stop.companyName || stop.city || stop.address || '—'}</h4>
                      <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                        <MapPin className={`w-4 h-4 shrink-0 mt-0.5 text-${markerColor}-400`} />
                        {stop.address}
                      </p>
                      
                      {/* Tasks List for this Stop */}
                       {stop.tasks && stop.tasks.length > 0 && <div className="mt-3 space-y-2">
                          {stop.tasks.map((task: any) => {
                              const fullOrder = trip.orders?.find((o: any) => o.id === task.order?.id) || task.order;
                              const loadRef = fullOrder?.loadingReference || fullOrder?.stops?.find((s: any) => s.type === 'pickup')?.reference || fullOrder?.customerReference || fullOrder?.orderNumber || '—';
                              const unloadRef = fullOrder?.unloadingReference || fullOrder?.stops?.find((s: any) => s.type === 'dropoff')?.reference || fullOrder?.customerReference || fullOrder?.orderNumber || '—';
                              const displayRef = task.type === 'unload' ? unloadRef : loadRef;
                              const currentTaskCfg = TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.pending;
                              
                              return <div key={task.id} className={`bg-card p-3 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs`}>
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-text flex items-center gap-2 flex-wrap">
                                    <Box className="w-4 h-4 text-primary shrink-0" />
                                    <span className="capitalize">{t(task.type === 'load' ? 'loading_stop' : task.type === 'unload' ? 'unloading_stop' : task.type)}</span>
                                    <span className="text-text-muted">·</span>
                                    <span className="text-xs text-text-secondary">{t('orderRef', 'Comandă')}: <strong className="text-text-primary">{displayRef}</strong></span>
                                  </div>
                                  <div className="text-xs text-text-secondary mt-1 flex items-center gap-2 flex-wrap">
                                    {task.plannedTime && (
                                      <>
                                        <span>{formatDate(task.plannedTime)}</span>
                                        <span className="text-border">·</span>
                                      </>
                                    )}
                                    <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
                                      <PalletIcon className="w-3.5 h-3.5" />
                                      {t('pallets', 'Paleți')}: {task.pallets || 0}
                                    </span>
                                    <span className="text-border">·</span>
                                    <span className="inline-flex items-center gap-1 font-semibold text-text-primary">
                                      <WeightKgIcon className="w-3.5 h-3.5" />
                                      {task.weightKg || 0} kg
                                    </span>
                                  </div>
                                </div>
                                <div className="relative inline-flex items-center shrink-0">
                                  <select
                                    aria-label={t('change_status', 'Schimbă status')}
                                    className={`appearance-none text-xs font-bold pl-3 pr-7 py-1.5 rounded-full border shadow-2xs cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${currentTaskCfg.color}`}
                                    value={task.status || 'pending'}
                                    onChange={async e => {
                                      const v = e.target.value;
                                      try {
                                        await api.patch('/trips/tasks/' + task.id + '/status', { status: v });
                                        setTrip((prev: any) => ({
                                          ...prev,
                                          stops: prev.stops?.map((st: any) => ({
                                            ...st,
                                            tasks: (st.tasks || []).map((tk: any) => tk.id === task.id ? { ...tk, status: v } : tk)
                                          }))
                                        }));
                                        toast.success(t('saved', 'Status salvat!'));
                                      } catch (err: any) {
                                        toast.error(err?.response?.data?.message || t('error', 'Eroare'));
                                      }
                                    }}
                                  >
                                    {Object.entries(TASK_STATUS_CONFIG).map(([stKey, cfg]) => (
                                      <option key={stKey} value={stKey} className="bg-card text-text font-medium">
                                        {t(cfg.labelKey, cfg.defaultLabel)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none opacity-60" />
                                </div>
                              </div>;
                          })}
                        </div>}
                    </div>;
            }) :
            // --- OLD FALLBACK UI FOR UNMIGRATED TRIPS ---
            <>
                  {/* Pickup */}
                  <div className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-blue-500 bg-card z-10"></div>
                    <div className="absolute -left-[28px] top-5 w-0.5 h-full bg-border -z-0"></div>
                    
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1 block">{t('pickupPoint', 'Punct Încărcare (Pickup)')}</span>
                    <h4 className="font-bold text-lg text-text">{trip.pickupCompanyName || trip.client?.name || trip.pickupAddress || '—'}</h4>
                    <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
                      {trip.pickupAddress}
                    </p>
                    <div className="flex items-center gap-4 mt-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 w-fit">
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        {trip.pickupDate ? formatDate(trip.pickupDate) : '-'}
                      </div>
                      {trip.pickupTime && <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                          <Clock className="w-4 h-4 text-blue-500" />
                          {trip.pickupTime}
                        </div>}
                    </div>
                  </div>

                  {/* Delivery */}
                  <div className="relative">
                    <div className="absolute -left-[35px] top-1 w-4 h-4 rounded-full border-4 border-green-500 bg-card z-10"></div>
                    
                    <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1 block">{t('deliveryPoint', 'Punct Descărcare (Delivery)')}</span>
                    <h4 className="font-bold text-lg text-text">{trip.dropoffCompanyName || trip.dropoffAddress || '—'}</h4>
                    <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-green-400" />
                      {trip.dropoffAddress}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 bg-green-50/50 p-3 rounded-xl border border-green-100/50 w-fit">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                        <Calendar className="w-4 h-4 text-green-500" />
                        {trip.dropoffDate ? formatDate(trip.dropoffDate) : '-'}
                      </div>
                      {trip.dropoffTime && <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                          <Clock className="w-4 h-4 text-green-500" />
                          {trip.dropoffTime}
                        </div>}
                      
                      {/* ETA Display */}
                      {trip.lastLiveEta && <div className={`flex items-center gap-2 text-xs font-bold bg-card px-2 py-1 rounded border ${trip.etaStatus === 'on_time' ? 'text-green-700 border-green-200' : trip.etaStatus === 'at_risk' ? 'text-yellow-700 border-yellow-200' : 'text-red-700 border-red-200'}`}>
                          {t('liveEta', 'ETA Smart')}: {formatDate(trip.lastLiveEta)} {new Date(trip.lastLiveEta).toLocaleTimeString(i18n.language, {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                        </div>}
                      {trip.appointmentTo && !trip.lastLiveEta && <div className="flex items-center gap-2 text-xs font-bold text-green-700 bg-card px-2 py-1 rounded border border-green-200">
                          {t('plannedEta', 'ETA Planificat')}: {formatDate(trip.appointmentTo)}
                        </div>}
                    </div>
                  </div>
                </>}
            </div>
          </div>

          {/* Capacity Details */}
          <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
            <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-primary" />
              {t('truckCapacity', 'Capacitate pe Segmente (Leg-by-Leg)')}
            </h3>

            {segments.length > 0 ? (
              <div className="space-y-4 mb-6">
                {segments.map((seg, i) => {
                   const wPct = Math.min(100, (seg.weight / truckMaxWeight) * 100);
                   const pPct = Math.min(100, (seg.pallets / truckMaxPallets) * 100);
                   const overWeight = seg.weight > truckMaxWeight;
                   const overPallets = seg.pallets > truckMaxPallets;
                   
                   return (
                      <div key={i} className={`p-4 rounded-xl border ${overWeight || overPallets ? 'bg-red-50/50 border-red-200' : 'bg-surface border-border'}`}>
                        <div className="font-bold text-sm mb-3 text-text">După Stop {i+1}: <span className="text-primary">{seg.stopName}</span></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className={`flex items-center gap-1 ${overWeight ? 'text-red-600' : 'text-text-secondary'}`}><WeightKgIcon className="w-3.5 h-3.5" />{t('weight', 'Greutate')}</span>
                              <span className={overWeight ? 'text-red-600' : 'text-text'}>{seg.weight} / {truckMaxWeight} kg</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                              <div className={`h-2 rounded-full ${overWeight ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${wPct}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className={`flex items-center gap-1 ${overPallets ? 'text-red-600' : 'text-text-secondary'}`}><PalletIcon className="w-3.5 h-3.5" />{t('pallets', 'Paleți')}</span>
                              <span className={overPallets ? 'text-red-600' : 'text-text'}>{seg.pallets} / {truckMaxPallets}</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                              <div className={`h-2 rounded-full ${overPallets ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${pPct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      </div>
                   );
                })}
              </div>
            ) : (
              <div className="p-4 bg-surface rounded-xl border border-border text-center text-sm text-text-muted">
                {t('noStops', 'Nu există stopuri pentru a calcula capacitatea.')}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border pt-4">
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('loadingReference', 'Loading Reference')}</span>
                <span className="font-bold text-sm text-text">{pickupRef}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('unloadingReference', 'Unloading Reference')}</span>
                <span className="font-bold text-sm text-text">{deliveryRef}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-text-secondary block">{t('cmrReference', 'CMR Reference')}</span>
                <span className="font-bold text-sm text-text">{trip.cmrReference || '-'}</span>
              </div>
            </div>
            
            {trip.notes && <div className="mt-4 p-4 bg-yellow-50/50 border border-yellow-200 rounded-xl">
                <span className="text-xs font-bold text-yellow-800 uppercase block mb-1">{t('internalNotes', 'Observații Interne')}</span>
                <p className="text-sm font-medium text-yellow-900">{trip.notes}</p>
              </div>}
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
                  <span className="font-bold text-sm text-text">{trip.driver?.user?.name || trip.carrierDriverName || t('unassigned', 'Neasignat')}</span>
                  {trip.carrierDriverPhone && <span className="text-xs text-text-secondary block">{trip.carrierDriverPhone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-text-secondary block">{t('truck', 'Camion')}</span>
                  <span className="font-bold text-sm text-text">{trip.truck?.plateNumber || trip.carrierTruckPlate || t('unassigned', 'Neasignat')}</span>
                </div>
              </div>
              {(trip.trailer?.plateNumber || trip.carrierTrailerPlate) && (
                <div className="flex items-center gap-4 p-3 bg-surface rounded-xl border border-border">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-text-secondary block">{t('trailer', 'Semiremorcă')}</span>
                    <span className="font-bold text-sm text-text">{trip.trailer?.plateNumber || trip.carrierTrailerPlate}</span>
                  </div>
                </div>
              )}
              {trip.carrierName && (
                <div className="flex items-center gap-4 p-3 bg-blue-50/50 rounded-xl border border-blue-200">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-blue-700 block">{t('subcontractorCarrier', 'Subcontractor / Cărăuș')}</span>
                    <span className="font-bold text-sm text-blue-900">{trip.carrierName}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!isDispatcher && <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                {t('financial', 'Financiar')}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('clientPrice', 'Preț Client')}</span>
                  <span className="font-black text-lg text-success">{fmtMoney(basePrice)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('totalCost', 'Cost Total')}</span>
                  <span className="font-bold text-text">{totalCost > 0 ? fmtMoney(totalCost) : '-'}</span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-xl border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>{t('netProfit', 'Profit Net')}</span>
                  <span className={`font-black text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmtMoneySigned(profit)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('profitMargin', 'Marjă Profit')}</span>
                  <span className={`font-bold ${profitMargin >= 10 ? 'text-green-600' : profitMargin >= 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {fmtPercent(profitMargin)}
                  </span>
                </div>
              </div>
            </div>}

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
              
              {trip.documents?.length > 0 ? <div className="space-y-2">
                  {trip.documents.map((doc: any) => <div key={doc.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold truncate" title={doc.fileName || doc.documentType}>
                          {doc.fileName || doc.documentType || 'Document'}
                        </span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {doc.fileUrl && <>
                            <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </a>
                            <a href={doc.fileUrl} download className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleShare(doc.fileUrl, doc.fileName || doc.documentType)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </>}
                      </div>
                    </div>)}
                </div> : <p className="text-sm text-text-secondary px-2">{t('noDocuments', 'Niciun document atașat')}</p>}

              {/* Stop Task Documents */}
              {trip.stops?.some((stop: any) => stop.tasks?.some((t: any) => t.documents?.length > 0 || t.signatureUrl)) && <div className="mt-4 pt-4 border-t border-border">
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
                  return <div key={task.id} className="bg-surface/50 p-3 rounded-xl border border-border">
                          <div className="text-xs font-bold text-text mb-2 flex items-center gap-2">
                            <Box className="w-3 h-3 text-primary" />
                            {t('order', 'Comanda')} {task.order?.orderNumber || task.order?.referenceNumber || task.order?.customerReference || '—'} - {t(task.type)}
                          </div>
                          <div className="space-y-2">
                            {task.documents?.map((doc: any) => <div key={doc.id} className="flex items-center justify-between p-2 bg-card rounded-lg border border-border">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-semibold truncate">
                                    {doc.fileName || doc.documentType || 'Document'}
                                  </span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {doc.fileUrl && <>
                                      <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-secondary hover:text-primary transition-colors">
                                        <Eye className="w-3.5 h-3.5" />
                                      </a>
                                    </>}
                                </div>
                              </div>)}
                            {task.signatureUrl && <div className="flex items-center justify-between p-2 bg-card rounded-lg border border-border">
                                <div className="flex items-center gap-2 truncate">
                                  <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="text-xs font-semibold truncate">{t('signature', 'Semnătură Șofer/Client')}</span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <a href={task.signatureUrl} target="_blank" rel="noopener noreferrer" className="p-1 text-text-secondary hover:text-primary transition-colors">
                                    <Eye className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>}
                          </div>
                        </div>;
                }))}
                  </div>
                </div>}

              {/* Invoices List */}
              <h4 className="text-sm font-semibold text-text-secondary flex items-center justify-between mt-6">
                <div className="flex items-center gap-2">
                  <Euro className="w-4 h-4" /> {t('invoices', 'Facturi (Invoices)')}
                </div>
                <span className="badge-gray px-2 py-0.5 text-xs font-bold">{trip.invoices?.length || 0}</span>
              </h4>

              {trip.invoices?.length > 0 ? <div className="space-y-2">
                  {trip.invoices.map((inv: any) => <div key={inv.id} className="flex items-center justify-between p-2.5 bg-surface rounded-xl border border-border">
                      <div className="flex items-center gap-2 truncate">
                        <FileBadge className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm font-semibold truncate">#{inv.invoiceNumber || 'Draft'}</span>
                        <span className={`${STATUS_COLORS[inv.status] || 'badge-gray'} text-[10px] px-1.5 py-0.5 rounded uppercase font-bold`}>{t(inv.status)}</span>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {(() => {
                          const invNum = (inv.invoiceNumber || '').trim();
                          const invFileName = invNum ? (invNum.toUpperCase().startsWith('INV') ? `${invNum}.pdf` : `Invoice_${invNum}.pdf`) : 'Invoice.pdf';
                          return inv.pdfUrl ? <>
                            <button onClick={() => window.open(inv.pdfUrl, '_blank')} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <a href={inv.pdfUrl} download={invFileName} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleShare(inv.pdfUrl, invFileName)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </> : inv.pdfData ? <>
                             <button onClick={() => {
                      const newTab = window.open();
                      if (newTab) newTab.document.write(`<iframe src="${inv.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`);
                    }} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                             </button>
                             <a href={inv.pdfData} download={invFileName} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                          </> : null;
                        })()}
                      </div>
                    </div>)}
                </div> : <p className="text-sm text-text-secondary px-2">{t('noInvoices', 'Nicio factură')}</p>}
            </div>
            
          </div>
          
        </div>
      </div>

      {/* Timeline Section */}
      <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm mt-6">
        <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-500" />
          {t('eventHistory', 'Istoric Evenimente')}
        </h3>
        {timeline.length === 0 ? <p className="text-text-secondary">{t('noEvents', 'Niciun eveniment înregistrat.')}</p> : <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {timeline.map((event: any, index: number) => <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-white bg-blue-100 text-blue-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-surface p-4 rounded-xl shadow-sm border border-border">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-text-primary">{event.action}</p>
                    <span className="text-xs text-text-secondary">{new Date(event.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-text-secondary">{t("jsx_by")}{event.user?.name || 'System'}</p>
                  {event.details && <pre className="mt-2 text-xs bg-black/5 p-2 rounded text-text-secondary overflow-x-auto">{event.details}</pre>}
                </div>
              </div>)}
          </div>}
      </div>

    </div>;
}