import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, MapPin, Calendar, Clock, Truck, User, Layers, Scale, Box, Euro, FileText, FileBadge, Navigation, Eye, Wand2, Download, Share2, Plus, Trash2, Edit2, Save, X, UserCheck, Package, Scale as ScaleIcon, Dock, Clock as ClockIcon, Mail, Phone, MapPin as MapPinIcon } from 'lucide-react';
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
  overdue: 'badge-error'
};

const getOrderPallets = (o: any) => o.cargoItems?.reduce((sum: number, c: any) => sum + (c.unit === 'pallet' ? Number(c.quantity || 1) : 0), 0) || Number(o.pallets || 0);
const getOrderWeight = (o: any) => o.cargoItems?.reduce((sum: number, c: any) => sum + Number(c.weightKg || 0), 0) || Number(o.weightKg || 0);

export default function TripDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [trip, setTrip] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();
  const isDispatcher = user?.role === 'dispatcher';
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState<any>({});
  const [taskForm, setTaskForm] = useState<any>({});
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

  // Cost handlers
  const handleAddCost = async () => {
    if (!trip) return;
    if (!costForm.amount || Number(costForm.amount) <= 0) { notify.error(t("invalidAmount", "Sumă invalidă")); return; }
    try {
      await api.post(`/trips/${trip.id}/costs`, {
        type: costForm.type,
        amount: Number(costForm.amount),
        description: costForm.description,
        category: costForm.category,
        driverId: costForm.driverId || undefined,
        truckId: costForm.truckId || undefined
      });
      notify.success(t("costAdded", "Cost adăugat"));
      setCostForm({ type: "extra", amount: "", description: "", category: "extra", driverId: "", truckId: "" });
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      notify.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleStartEditCost = (cost: any) => {
    setEditingCostId(cost.id);
    setCostForm({
      type: cost.type,
      amount: cost.amount,
      description: cost.description || "",
      category: cost.category || "extra",
      driverId: cost.driverId || "",
      truckId: cost.truckId || ""
    });
  };

  const handleCancelEditCost = () => {
    setEditingCostId(null);
    setCostForm({ type: "extra", amount: "", description: "", category: "extra", driverId: "", truckId: "" });
  };

  const handleUpdateCost = async (costId: string) => {
    try {
      await api.patch(`/trips/costs/${costId}`, costForm);
      notify.success(t("costUpdated", "Cost actualizat"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
      setEditingCostId(null);
      setCostForm({ type: "extra", amount: "", description: "", category: "extra", driverId: "", truckId: "" });
    } catch (e: any) {
      notify.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleDeleteCost = async (costId: string) => {
    if (!window.confirm(t("confirmDeleteCost", "Ștergi acest cost?"))) return;
    try {
      await api.delete(`/trips/costs/${costId}`);
      notify.success(t("costDeleted", "Cost șters"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      notify.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleDeleteStop = async (stopId: string) => {
    if (!window.confirm(t("confirmDeleteStop", "Ștergi această oprire?"))) return;
    try {
      await api.delete(`/trips/stops/${stopId}`);
      toast.success(t("stopDeleted", "Oprire ștearsă"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleStartEditStop = (stop: any) => {
    setEditingStopId(stop.id);
    setStopForm({
      address: stop.address || "",
      companyName: stop.companyName || "",
      country: stop.country || "RO",
      type: stop.type || "pickup",
      timeWindowMin: stop.timeWindowMin ? new Date(stop.timeWindowMin).toISOString().slice(0, 16) : "",
      timeWindowMax: stop.timeWindowMax ? new Date(stop.timeWindowMax).toISOString().slice(0, 16) : "",
      latitude: stop.latitude || "",
      longitude: stop.longitude || "",
      contactPerson: stop.contactPerson || "",
      phone: stop.phone || "",
      email: stop.email || "",
      reference: stop.reference || "",
      rampDock: stop.rampDock || "",
    });
  };

  const handleCancelEditStop = () => {
    setEditingStopId(null);
    setStopForm({});
  };

  const handleUpdateStop = async (stopId: string) => {
    try {
      await api.patch(`/trips/stops/${stopId}`, stopForm);
      toast.success(t("stopUpdated", "Oprire actualizată"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
      setEditingStopId(null);
      setStopForm({});
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleAddTask = async (stopId: string) => {
    if (!trip) return;
    try {
      const newTask = {
        type: "load",
        pallets: 0,
        weightKg: 0,
        quantity: 0,
        plannedTime: new Date().toISOString().slice(0, 16),
        orderId: trip.orders?.[0]?.id || "",
      };
      await api.post(`/trips/stops/${stopId}/tasks`, newTask);
      toast.success(t("taskAdded", "Sarcină adăugată"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleStartEditTask = (task: any) => {
    setEditingTaskId(task.id);
    setTaskForm({
      type: task.type || "load",
      pallets: task.pallets || 0,
      weightKg: task.weightKg || 0,
      quantity: task.quantity || 0,
      plannedTime: task.plannedTime ? new Date(task.plannedTime).toISOString().slice(0, 16) : "",
      orderId: task.order?.id || "",
      reference: task.reference || "",
      issueNote: task.issueNote || "",
    });
  };

  const handleCancelEditTask = () => {
    setEditingTaskId(null);
    setTaskForm({});
  };

  const handleUpdateTask = async (taskId: string) => {
    try {
      await api.patch(`/trips/tasks/${taskId}`, taskForm);
      toast.success(t("taskUpdated", "Sarcină actualizată"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
      setEditingTaskId(null);
      setTaskForm({});
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!window.confirm(t("confirmDeleteTask", "Ștergi această sarcină?"))) return;
    try {
      // No delete endpoint yet - just update status to problem or mark deleted
      await api.patch(`/trips/tasks/${taskId}`, { status: "problem", issueNote: "Deleted by user" });
      toast.success(t("taskDeleted", "Sarcină marcată ca problemă"));
      const res = await api.get(`/trips/${trip.id}`);
      setTrip(res.data);
    } catch (e: any) {
      toast.error(e.response?.data?.message || t("error", "Eroare"));
    }
  };

  // Validation helpers
  const getLoadedPallets = (stop: any) => {
    return stop.tasks?.filter((t: any) => t.type === "load").reduce((s: number, t: any) => s + (t.pallets || 0), 0) || 0;
  };
  const getUnloadedPallets = (stop: any) => {
    return stop.tasks?.filter((t: any) => t.type === "unload").reduce((s: number, t: any) => s + (t.pallets || 0), 0) || 0;
  };
  const getLoadedWeight = (stop: any) => {
    return stop.tasks?.filter((t: any) => t.type === "load").reduce((s: number, t: any) => s + Number(t.weightKg || 0), 0) || 0;
  };
  const getUnloadedWeight = (stop: any) => {
    return stop.tasks?.filter((t: any) => t.type === "unload").reduce((s: number, t: any) => s + Number(t.weightKg || 0), 0) || 0;
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
    if (stop.tasks) {
      stop.tasks.forEach((t: any) => {
        if (t.type === 'load') { loadW += Number(t.weightKg || 0); loadP += Number(t.pallets || 0); }
        if (t.type === 'unload') { unloadW += Number(t.weightKg || 0); unloadP += Number(t.pallets || 0); }
      });
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
  
  const totalPallets = trip.orders?.reduce((sum: number, o: any) => sum + getOrderPallets(o), 0) || 0;
  const totalWeight = trip.orders?.reduce((sum: number, o: any) => sum + getOrderWeight(o), 0) || 0;
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
              <span className={`${STATUS_COLORS[trip.status] || 'badge-gray'} uppercase px-3 py-1 rounded-lg text-xs font-black shadow-sm`}>
                {t(trip.status === 'in_progress' ? 'inProgress' : trip.status) || trip.status}
              </span>
            </div>
            <p className="text-sm text-text-secondary mt-1 font-medium">
              {t('createdBy', 'Creat de')} <span className="text-primary font-bold">{trip.dispatcher?.name || trip.dispatcher?.email || trip.createdBy?.name || trip.createdBy?.email || t('systemUnknown', 'Sistem / Necunoscut')}</span> {t('onDate', 'pe')} {formatDate(trip.createdAt)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
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

                      <span className={`text-xs font-bold ${textClass} uppercase tracking-wider mb-1 block flex justify-between`}>
                        {t('stopIndex', 'Stop {{index}}', {
                    index: stop.sequence
                  }).replace('{{index}}', stop.sequence.toString())} - {t(stop.status, stop.status?.replace(/_/g, ' ') || '')}
                        {stop.eta && <span className={`px-2 py-0.5 rounded ${stop.etaStatus === 'delayed' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{t("jsx_eTA")}{formatDate(stop.eta)}
                          </span>}
                      </span>
                      <h4 className="font-bold text-lg text-text">{stop.companyName || 'N/A'}</h4>
                      <p className="text-text-secondary font-medium mt-1 flex items-start gap-2">
                        <MapPin className={`w-4 h-4 shrink-0 mt-0.5 text-${markerColor}-400`} />
                        {stop.address}
                      </p>
                      
                      {/* Tasks List for this Stop */}
                      
                       {editingStopId === stop.id && (
                         <div className="mt-3 p-4 bg-surface/50 rounded-xl border border-border space-y-4">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                             <div>
                               <label className="label">{t("address", "Adresa")}</label>
                               <input type="text" className="input" value={stopForm.address} onChange={e => setStopForm({...stopForm, address: e.target.value})} placeholder={t("addressPlaceholder", "Adresa oprire")} />
                             </div>
                             <div>
                               <label className="label">{t("companyName", "Companie")}</label>
                               <input type="text" className="input" value={stopForm.companyName} onChange={e => setStopForm({...stopForm, companyName: e.target.value})} placeholder={t("companyNamePlaceholder", "Nume companie")} />
                             </div>
                             <div>
                               <label className="label">{t("country", "Țară")}</label>
                               <input type="text" className="input" value={stopForm.country} onChange={e => setStopForm({...stopForm, country: e.target.value})} placeholder="RO" />
                             </div>
                             <div>
                               <label className="label">{t("type", "Tip")}</label>
                               <select className="input" value={stopForm.type} onChange={e => setStopForm({...stopForm, type: e.target.value})}>
                                 <option value="pickup">{t("pickup", "Încărcare")}</option>
                                 <option value="delivery">{t("delivery", "Descărcare")}</option>
                                 <option value="customs">{t("customs", "Vamă")}</option>
                                 <option value="other">{t("other", "Altele")}</option>
                               </select>
                             </div>
                             <div>
                               <label className="label">{t("timeWindowMin", "Fereastră Min")}</label>
                               <input type="datetime-local" className="input" value={stopForm.timeWindowMin} onChange={e => setStopForm({...stopForm, timeWindowMin: e.target.value})} />
                             </div>
                             <div>
                               <label className="label">{t("timeWindowMax", "Fereastră Max")}</label>
                               <input type="datetime-local" className="input" value={stopForm.timeWindowMax} onChange={e => setStopForm({...stopForm, timeWindowMax: e.target.value})} />
                             </div>
                             <div>
                               <label className="label">{t("contactPerson", "Persoană Contact")}</label>
                               <input type="text" className="input" value={stopForm.contactPerson} onChange={e => setStopForm({...stopForm, contactPerson: e.target.value})} placeholder={t("contactPersonPlaceholder", "Nume persoană contact")} />
                             </div>
                             <div>
                               <label className="label">{t("phone", "Telefon")}</label>
                               <input type="tel" className="input" value={stopForm.phone} onChange={e => setStopForm({...stopForm, phone: e.target.value})} placeholder={t("phonePlaceholder", "Număr telefon")} />
                             </div>
                             <div>
                               <label className="label">{t("email", "Email")}</label>
                               <input type="email" className="input" value={stopForm.email} onChange={e => setStopForm({...stopForm, email: e.target.value})} placeholder={t("emailPlaceholder", "Email contact")} />
                             </div>
                             <div>
                               <label className="label">{t("reference", "Referință")}</label>
                               <input type="text" className="input" value={stopForm.reference} onChange={e => setStopForm({...stopForm, reference: e.target.value})} placeholder={t("referencePlaceholder", "Referință oprire")} />
                             </div>
                             <div>
                               <label className="label">{t("rampDock", "Rampă/Doc")}</label>
                               <input type="text" className="input" value={stopForm.rampDock} onChange={e => setStopForm({...stopForm, rampDock: e.target.value})} placeholder={t("rampDockPlaceholder", "Rampă/Doc")} />
                             </div>
                           </div>
                         </div>
                       )}
                       {stop.tasks && stop.tasks.length > 0 && <div className="mt-3 space-y-2">
                          {stop.tasks.map((task: any) => {
                              const fullOrder = trip.orders?.find((o: any) => o.id === task.order?.id) || task.order;
                              const loadRef = fullOrder?.loadingReference || fullOrder?.stops?.find((s: any) => s.type === 'pickup')?.reference || fullOrder?.customerReference || fullOrder?.orderNumber || '#N/A';
                              const unloadRef = fullOrder?.unloadingReference || fullOrder?.stops?.find((s: any) => s.type === 'dropoff')?.reference || fullOrder?.customerReference || fullOrder?.orderNumber || '#N/A';
                              const displayRef = task.type === 'unload' ? unloadRef : loadRef;
                              
                              return <div key={task.id} className={`bg-${markerColor}-50/50 p-3 rounded-xl border border-${markerColor}-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                                <div>
                                  <div className={`text-sm font-semibold text-${markerColor}-900 flex items-center gap-2`}>
                                    <Box className={`w-4 h-4 text-${markerColor}-500`} />
                                    <span className="capitalize">{t(task.type === 'load' ? 'loading_stop' : task.type === 'unload' ? 'unloading_stop' : task.type)}</span> - {t('orderRef', 'Order')}: {displayRef}
                                  </div>
                                <div className="text-xs text-text-secondary mt-1">
                                  {task.plannedTime ? formatDate(task.plannedTime) : '-'} | {t('pallets')}: {task.pallets || 0} ({task.weightKg || 0}{t("jsx_kg")}</div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-1 rounded bg-white border shadow-sm ${task.status === 'completed' ? 'border-green-200 text-green-700' : 'border-gray-200 text-gray-600'}`}>
                                {t(task.status)}
                              </span><select className="ml-2 text-xs font-bold px-2 py-1 rounded bg-white border shadow-sm" value={task.status || 'pending'} onChange={async e => { const v = e.target.value; try { await api.patch('/trips/tasks/' + task.id + '/status', { status: v }); setTrip((prev: any) => ({ ...prev, stops: prev.stops?.map((st: any) => ({ ...st, tasks: (st.tasks || []).map((tk: any) => tk.id === task.id ? { ...tk, status: v } : tk) })) })); toast.success(t('saved', 'Salvat')); } catch (err: any) { toast.error(err?.response?.data?.message || t('error', 'Eroare')); } }} title={t('change_status', 'Change task status')}>
{t(['pending', 'completed', 'problem'].map(st => <option key={st} value={st}>{t(st)}</option>))}
</select>
                            </div>
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
                              <span className={overWeight ? 'text-red-600' : 'text-text-secondary'}>{t('weight', 'Greutate')}</span>
                              <span className={overWeight ? 'text-red-600' : 'text-text'}>{seg.weight} / {truckMaxWeight} kg</span>
                            </div>
                            <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                              <div className={`h-2 rounded-full ${overWeight ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${wPct}%` }}></div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex justify-between text-xs font-bold mb-1">
                              <span className={overPallets ? 'text-red-600' : 'text-text-secondary'}>{t('pallets', 'Paleți')}</span>
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

          {!isDispatcher && <div className="card p-6 bg-card border border-border rounded-2xl shadow-sm">
              <h3 className="font-bold text-lg text-text mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5 text-primary" />
                {t('financial', 'Financiar')}
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('clientPrice', 'Preț Client')}</span>
                  <span className="font-black text-lg text-success">€{basePrice.toLocaleString(i18n.language)}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('totalCost', 'Cost Total')}</span>
                  <span className="font-bold text-text">{totalCost > 0 ? `€${totalCost.toLocaleString(i18n.language)}` : '-'}</span>
                </div>
                
                <div className={`flex items-center justify-between p-3 rounded-xl border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <span className={`text-sm font-bold ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>{t('netProfit', 'Profit Net')}</span>
                  <span className={`font-black text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}€{profit.toLocaleString(i18n.language)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border">
                  <span className="text-sm font-semibold text-text-secondary">{t('profitMargin', 'Marjă Profit')}</span>
                  <span className={`font-bold ${profitMargin >= 10 ? 'text-green-600' : profitMargin >= 0 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {profitMargin.toFixed(1)}%
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
                            {t('order', 'Comanda')} {task.order?.referenceNumber || '#N/A'} - {t(task.type)}
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
                        {inv.pdfUrl ? <>
                            <button onClick={() => window.open(inv.pdfUrl, '_blank')} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <a href={inv.pdfUrl} download={`Invoice_${inv.invoiceNumber}.pdf`} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                            <button onClick={() => handleShare(inv.pdfUrl, `Invoice_${inv.invoiceNumber}.pdf`)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Share2 className="w-4 h-4" />
                            </button>
                          </> : inv.pdfData ? <>
                             <button onClick={() => {
                      const newTab = window.open();
                      if (newTab) newTab.document.write(`<iframe src="${inv.pdfData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%; position: fixed;" allowfullscreen></iframe>`);
                    }} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                             </button>
                             <a href={inv.pdfData} download={`Invoice_${inv.invoiceNumber}.pdf`} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <Download className="w-4 h-4" />
                            </a>
                          </> : null}
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