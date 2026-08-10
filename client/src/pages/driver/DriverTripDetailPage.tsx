import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Truck, MapPin, CheckCircle2, PackageCheck, Navigation, FileText, PenLine, RefreshCw, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { formatDate } from '../../lib/dateUtils';
import SignaturePad from '../../components/driver/SignaturePad';

const STEPS = [
  { key: 'driver_accepted', icon: CheckCircle2, label: 'Acceptat' },
  { key: 'loading', icon: PackageCheck, label: 'Încărcat' },
  { key: 'driving', icon: Navigation, label: 'În transport' },
  { key: 'completed', icon: FileText, label: 'Predat' },
];

export default function DriverTripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showPod, setShowPod] = useState(false);
  const [podNote, setPodNote] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const timerRef = useRef<any>(null);

  const load = async (silent = false) => {
    try {
      const r = await api.get(`/driver/trips/${id}`);
      setTrip(r.data);
      setLastRefresh(new Date());
    } catch (e: any) {
      if (!silent) {
        toast.error(e?.response?.data?.message || t('error', 'Eroare'));
        navigate('/driver', { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://haptrans-production.up.railway.app/api';
    const baseUrl = apiUrl.replace('/api', '');
    const socket = io(baseUrl, { transports: ['websocket', 'polling'], reconnection: true });
    socket.on('geofenceEvent', (data: any) => {
      if (data && data.stopId) {
        toast.success(t('geofenceArrived', 'Ai ajuns la oprire!'));
        load(true);
      }
    });
    return () => { socket.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    timerRef.current = setInterval(() => load(true), 15000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const setStatus = async (status: string) => {
    setBusy(true);
    try {
      await api.patch(`/driver/trips/${id}/status`, { status });
      toast.success(t('statusUpdated', 'Status actualizat!'));
      await load(true);
    } catch { toast.error(t('error', 'Eroare')); }
    finally { setBusy(false); }
  };

  const submitPod = async () => {
    if (!signature) { toast.error(t('podSignRequired', 'Semnează pentru confirmare')); return; }
    setBusy(true);
    try {
      await api.post(`/driver/trips/${id}/pod`, { signature, note: podNote || null });
      toast.success(t('podSaved', 'POD salvat cu succes!'));
      setShowPod(false);
      setSignature(null);
      setPodNote('');
      await load(true);
      await setStatus('completed');
    } catch { toast.error(t('error', 'Eroare')); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!trip) return null;

  const stops = (trip.stops || []).slice().sort((a: any, b: any) => (a.sequence || 1) - (b.sequence || 1));
  const truck = trip.truck;
  const statusIdx = STEPS.findIndex(s => s.key === trip.status);
  const currentStep = trip.status === 'partially_delivered' ? 2 : statusIdx;
  const podDocs = (trip.documents || []).filter((d: any) => d.documentType === 'pod');
  const liveCoords = truck && (truck.currentLat || truck.currentLng) ? { lat: Number(truck.currentLat), lng: Number(truck.currentLng) } : null;

  const nextAction = () => {
    switch (trip.status) {
      case 'planning':
      case 'planned':
      case 'dispatched':
      case 'assigned':
        return { label: t('acceptTrip', 'Acceptă Cursa'), onClick: () => setStatus('driver_accepted'), color: 'btn-primary' };
      case 'driver_accepted':
        return { label: t('markLoaded', 'Marchează Încărcat'), onClick: () => setStatus('loading'), color: 'btn-primary' };
      case 'loading':
        return { label: t('startTransport', 'Începe Transportul'), onClick: () => setStatus('driving'), color: 'btn-primary' };
      case 'driving':
      case 'partially_delivered':
        return { label: t('deliverPod', 'Predare finală + POD'), onClick: () => setShowPod(true), color: 'btn-primary' };
      case 'completed':
        return null;
      default:
        return null;
    }
  };
  const action = nextAction();

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      <button onClick={() => navigate('/driver')} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" /> {t('backToTrips', 'Înapoi la cursuri')}
      </button>

      <div className="card p-5 space-y-4">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h1 className="text-xl font-bold">{trip.tripNumber || 'Cursă'}</h1>
            <p className="text-sm text-text-secondary">{trip.truck?.plateNumber || '—'}</p>
          </div>
          <span className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700">{t('status_' + trip.status, trip.status)}</span>
        </div>

        <div className="flex items-center gap-1">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-1">
                <div className={`flex flex-col items-center gap-1 flex-1 ${done ? 'text-emerald-500' : active ? 'text-primary' : 'text-text-secondary'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${done ? 'border-emerald-500 bg-emerald-50' : active ? 'border-primary bg-primary/10' : 'border-border'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-semibold text-center leading-tight">{step.label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < currentStep ? 'bg-emerald-500' : 'bg-border'}`} />}
              </div>
            );
          })}
        </div>

        {action && (
          <button onClick={action.onClick} disabled={busy} className={`w-full ${action.color} py-3 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} {action.label}
          </button>
        )}
      </div>

      {liveCoords && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> {t('liveLocation', 'Locație live')}</h3>
            <span className="text-[10px] text-text-secondary flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> {t('refreshedAt', 'Actualizat')} {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-secondary">Lat: {liveCoords.lat.toFixed(6)} · Lng: {liveCoords.lng.toFixed(6)}</span>
            <a href={`https://www.google.com/maps?q=${liveCoords.lat},${liveCoords.lng}`} target="_blank" rel="noreferrer" className="text-primary font-bold">
              {t('openMap', 'Deschide harta')} →
            </a>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="text-sm font-bold mb-3">{t('stops', 'Opriri')} ({stops.length})</h3>
        <div className="space-y-2">
          {stops.map((stop: any, idx: number) => (
            <div key={stop.id} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${stop.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-surface-hover text-text-secondary'}`}>{idx + 1}</div>
                {idx < stops.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
              </div>
              <div className="flex-1 pb-3">
                <p className="text-sm font-semibold">{stop.companyName || stop.city || stop.address || 'Oprire'}</p>
                <p className="text-xs text-text-secondary">{[stop.address, stop.city, stop.postalCode, stop.country].filter(Boolean).join(', ')}</p>
                <div className="flex items-center gap-3 mt-1 text-xs">
                  <span className={`px-2 py-0.5 rounded-md font-bold ${stop.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {stop.status === 'completed' ? '✓ Livrat' : stop.type === 'pickup' ? 'Încărcare' : 'Descărcare'}
                  </span>
                  {stop.timeWindowMax && <span className="text-text-secondary">{t('eta', 'ETA')}: {formatDate(stop.timeWindowMax)}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-bold mb-3">{t('podDocuments', 'Documente POD')} ({podDocs.length})</h3>
        {podDocs.length === 0 ? (
          <p className="text-sm text-text-secondary">{t('noPodYet', 'Niciun POD trimis încă.')}</p>
        ) : (
          <div className="space-y-2">
            {podDocs.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between bg-surface rounded-xl px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium"><FileText className="w-4 h-4 text-primary" /> {d.fileName}</span>
                <span className="text-xs text-text-secondary">{d.uploadedAt ? formatDate(d.uploadedAt) : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPod && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setShowPod(false)}>
          <div className="card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold flex items-center gap-2"><PenLine className="w-4 h-4 text-primary" /> {t('podTitle', 'Confirmare livrare — POD')}</h3>
              <button onClick={() => setShowPod(false)} className="text-text-secondary hover:text-text p-1 text-xl leading-none">×</button>
            </div>
            <p className="text-sm text-text-secondary mb-3">{t('podHint', 'Semnează pentru confirmarea livrării. Semnătura este atașată automat la cursă.')}</p>
            <SignaturePad onChange={setSignature} />
            <div className="mt-4">
              <label className="label">{t('podNote', 'Notă livrare (opțional)')}</label>
              <input className="input" value={podNote} onChange={e => setPodNote(e.target.value)} placeholder={t('podNotePlaceholder', 'Ex: marfa livrată în stare perfectă...')} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submitPod} disabled={busy || !signature} className="btn-primary flex-1 py-2.5 font-bold disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('submitPod', 'Trimite POD & Finalizează')}
              </button>
              <button onClick={() => setShowPod(false)} disabled={busy} className="btn-secondary px-4 font-bold">{t('cancel', 'Anulează')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
