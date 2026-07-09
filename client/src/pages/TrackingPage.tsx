import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Navigation, MapPin, Calendar, Clock, CheckCircle2, AlertTriangle, FileText, Download, Loader2 } from 'lucide-react';
import api from '../lib/api';

export default function TrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTracking = async () => {
    try {
      const res = await api.get(`/track/${token}`);
      setData(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Link-ul de urmărire este invalid sau a expirat.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTracking();
      // Poll ETA and status every 30 seconds
      const interval = setInterval(fetchTracking, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-card-dark gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-text-secondary text-sm font-medium">Se încarcă datele de tracking live...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-card-dark p-6 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/20 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Urmărire Indisponibilă</h2>
        <p className="text-text-secondary mt-2 max-w-sm">{error || 'Nu am putut găsi detaliile transportului.'}</p>
      </div>
    );
  }

  const nextStop = data.stops?.find((s: any) => s.status !== 'completed');
  const completedStops = data.stops?.filter((s: any) => s.status === 'completed') || [];
  const progressPct = data.stops?.length ? (completedStops.length / data.stops.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-card-dark py-10 px-4 md:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-ping inline-block" />
              <span className="text-xs font-black uppercase text-green-600 tracking-wider">Urmărire Live</span>
            </div>
            <h1 className="text-2xl font-black text-text-primary mt-1">
              Referință: <span className="text-primary">{data.referenceNumber || 'HapCargo'}</span>
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Ultima actualizare: {new Date(data.updatedAt).toLocaleTimeString()}
            </p>
          </div>
          <span className={`badge uppercase px-4 py-2 font-black text-sm shadow-sm ${
            data.status === 'completed' ? 'badge-success' :
            data.status === 'active' || data.status === 'in_progress' ? 'badge-primary' : 'badge-warning'
          }`}>
            {data.status === 'dispatched' ? 'Trimis' : data.status}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between text-sm font-bold text-text-secondary mb-2">
            <span>Progres Traseu</span>
            <span>{completedStops.length} / {data.stops?.length} Opriri Finalizate</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Live ETA Card */}
        {nextStop && (
          <div className={`border rounded-2xl p-6 shadow-sm flex items-start gap-4 bg-white ${
            nextStop.etaStatus === 'delayed' 
              ? 'border-red-200 bg-red-50/20' 
              : 'border-border/80'
          }`}>
            <div className={`p-3 rounded-xl shrink-0 ${
              nextStop.etaStatus === 'delayed' ? 'bg-red-100 text-red-500' : 'bg-primary/10 text-primary'
            }`}>
              {nextStop.etaStatus === 'delayed' ? <AlertTriangle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-text-secondary">Următoarea Destinație</span>
              <h3 className="font-bold text-lg text-text-primary leading-tight">{nextStop.companyName || 'Oprire'}</h3>
              <p className="text-sm text-text-secondary">{nextStop.address}</p>
              
              <div className="flex flex-wrap gap-4 pt-3 text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-text-primary">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <span>ETA: {nextStop.eta ? new Date(nextStop.eta).toLocaleString() : 'În curând'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${
                    nextStop.etaStatus === 'delayed' ? 'bg-red-500' : 'bg-green-500'
                  }`} />
                  <span className={nextStop.etaStatus === 'delayed' ? 'text-red-600 font-bold' : 'text-green-600'}>
                    {nextStop.etaStatus === 'delayed' ? 'Întârziat' : 'În Grafic'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Timeline Stops */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm">
          <h2 className="font-black text-lg text-text-primary mb-6 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            Traseul Transportului
          </h2>

          <div className="relative pl-8 space-y-8">
            {data.stops?.map((stop: any, index: number, arr: any[]) => {
              const isLast = index === arr.length - 1;
              const isCompleted = stop.status === 'completed';
              const isCurrent = nextStop?.id === stop.id;

              return (
                <div key={stop.id} className="relative">
                  {/* Timeline Line */}
                  {!isLast && (
                    <div className={`absolute -left-[23px] top-6 w-0.5 h-10 ${
                      isCompleted ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-800'
                    }`} />
                  )}

                  {/* Timeline Bullet */}
                  <div className={`absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-4 bg-white dark:bg-card z-10 ${
                    isCompleted ? 'border-green-500' :
                    isCurrent ? 'border-amber-500 animate-pulse' : 'border-slate-300'
                  }`} />

                  <div>
                    <span className={`text-[10px] font-black uppercase tracking-wider block mb-0.5 ${
                      isCompleted ? 'text-green-600' :
                      isCurrent ? 'text-amber-600' : 'text-text-muted'
                    }`}>
                      Oprire {stop.sequence} • {stop.type === 'pickup' ? 'Încărcare' : 'Descărcare'} • {isCompleted ? 'Finalizat' : isCurrent ? 'În Tranzit' : 'În Așteptare'}
                    </span>
                    <h4 className="font-bold text-text-primary text-base">{stop.companyName || 'Oprire'}</h4>
                    <p className="text-xs text-text-secondary mt-0.5 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-text-muted mt-0.5 shrink-0" />
                      {stop.address}
                    </p>

                    {stop.eta && !isCompleted && (
                      <span className="text-[11px] font-semibold text-text-secondary mt-2 inline-block bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        ETA: {new Date(stop.eta).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Fleet Details */}
        <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs font-bold text-text-secondary uppercase">Camion</span>
            <p className="font-bold text-text-primary text-lg mt-0.5">{data.truckPlate || '—'}</p>
          </div>
          <div>
            <span className="text-xs font-bold text-text-secondary uppercase">Șofer</span>
            <p className="font-bold text-text-primary text-lg mt-0.5">{data.driverName || '—'}</p>
          </div>
        </div>

        {/* Public Documents (POD / CMR) */}
        {data.documents && data.documents.length > 0 && (
          <div className="bg-white dark:bg-card border border-border/80 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg text-text-primary flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documente atașate (POD / CMR)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-border/60">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-sm font-semibold truncate text-text-primary" title={doc.name}>
                      {doc.name || doc.type}
                    </span>
                  </div>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-text-secondary hover:text-primary transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
