import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, Trash2, ExternalLink,
  Users, X, ChevronRight, ChevronLeft, Calendar, ArrowRight, Info, Activity, Search,
  Save, Undo2, SplitSquareHorizontal, Send, ShieldCheck,
  LayoutGrid, Clock, Map as MapIcon, Sparkles, CheckSquare, Square, RefreshCw,
  ChevronsLeft, ChevronsRight, Maximize2, Minimize2, Settings2, Columns3, Printer, Container, Plus, Download
} from 'lucide-react';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import ExportModal from '../components/ExportModal';
import KpiStrip from '../components/ui/KpiStrip';
import { useShortcuts } from '../hooks/useShortcuts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

declare global {
  interface Window { maplibregl: any; }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const dayStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };

const TRIP_COLORS: Record<string, string> = {
  planning: 'bg-amber-500',
  planned: 'bg-blue-500',
  assigned: 'bg-violet-500',
  dispatched: 'bg-pink-500',
  driver_accepted: 'bg-teal-500',
  started: 'bg-orange-500',
  loading: 'bg-red-500',
  driving: 'bg-amber-500',
  partially_delivered: 'bg-yellow-500',
  completed: 'bg-green-500',
  closed: 'bg-slate-500',
  cancelled: 'bg-slate-400',
};

const CONFLICT_LEVELS: Record<string, string> = {
  blocking: 'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-sky-500 text-white',
};

const DEFAULT_POOL_COLS: Record<string, boolean> = {
  client: true,
  weight: true,
  pallets: true,
  volume: true,
  ldm: true,
  priority: true,
  stops: true,
  date: true,
};

const TRIP_TRANSITIONS: Record<string, string[]> = {
  planning: ['planned', 'assigned'],
  planned: ['assigned', 'planning'],
  assigned: ['dispatched', 'planned', 'planning'],
  dispatched: ['driver_accepted', 'assigned'],
  driver_accepted: ['started', 'dispatched'],
  started: ['loading'],
  loading: ['driving'],
  driving: ['partially_delivered', 'completed'],
  partially_delivered: ['completed'],
  completed: ['closed'],
  closed: [],
  cancelled: [],
};

function fmtTime(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString();
}
function fmtShort(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

function sumCargo(orders: any[]) {
  let weight = 0, ldm = 0, pallets = 0, volume = 0;
  for (const o of orders || []) {
    for (const c of o?.cargoItems || []) {
      weight += Number(c.weightKg) || 0;
      ldm += Number(c.ldm) || 0;
      volume += Number(c.volumeCbm) || 0;
      if (String(c.unit || 'pallet') === 'pallet') pallets += Number(c.quantity) || 0;
    }
  }
  return { weight, ldm, pallets, volume };
}

// ─── Map view (maplibre, imperative) ─────────────────────────────────────────
function PlanningMap({ mapData }: { mapData: any }) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!mapRef.current) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js';
    script.onload = () => {
      if (!mapRef.current || !window.maplibregl) return;
      mapInstance.current = new window.maplibregl.Map({
        container: mapRef.current,
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: [5.2913, 52.1326],
        zoom: 7,
        attributionControl: false,
      });
      setReady(true);
    };
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const map = mapInstance.current;
    try {
      if (map.getLayer('routes')) map.removeLayer('routes');
      if (map.getSource('routes')) map.removeSource('routes');
    } catch { /* ignore */ }
    for (const m of markersRef.current) { try { m.remove(); } catch { /* ignore */ } }
    markersRef.current = [];
    const routeFeatures = (mapData?.routes || []).map((r: any) => ({
      type: 'Feature',
      properties: { tripNumber: r.tripNumber, status: r.status, color: r.color || '#3b82f6' },
      geometry: { type: 'LineString', coordinates: r.points.map((p: number[]) => [p[1], p[0]]) },
    }));
    if (routeFeatures.length) {
      map.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: routeFeatures } });
      map.addLayer({ id: 'routes', type: 'line', source: 'routes', paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': 0.85 } });
    }
    const bounds = new window.maplibregl.LngLatBounds();
    for (const v of mapData?.vehicles || []) {
      if (v.lat == null || v.lng == null) continue;
      bounds.extend([v.lng, v.lat]);
      const color = v.color || '#22c55e';
      const marker = new window.maplibregl.Marker({ color })
        .setLngLat([v.lng, v.lat])
        .setPopup(new window.maplibregl.Popup({ offset: 20 }).setHTML(`<b>${v.plateNumber}</b><br/>${v.driver || ''}<br/>${v.status || ''}`))
        .addTo(map);
      markersRef.current.push(marker);
    }
    for (const r of mapData?.routes || []) {
      for (const p of r.points) bounds.extend([p[1], p[0]]);
    }
    try {
      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 40, maxZoom: 12, duration: 0 });
    } catch { /* ignore */ }
  }, [ready, mapData]);

  if (!ready) {
    return <div className="h-full w-full flex items-center justify-center bg-surface/40 rounded-xl"><Loader2 className="w-6 h-6 animate-spin text-primary" /><span className="ml-2 text-sm text-text-secondary">{t('map_loading')}</span></div>;
  }
  return <div ref={mapRef} className="h-full w-full rounded-xl overflow-hidden border border-border" />;
}

// ─── Order pool card ─────────────────────────────────────────────────────────
function PoolOrderCard({ order, dragging, selected, onToggle, onDetail, cols }: any) {
  const { t } = useTranslation();
  const pickup = order.stops?.find((s: any) => s.type === 'pickup');
  const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
  const cargo = sumCargo([order]);
  const isUrgent = pickup?.dateFrom && new Date(pickup.dateFrom).getTime() - Date.now() < 86400000 * 2;
  const prioCls = order.priority === 'critical' ? 'bg-red-100 text-red-700 border border-red-200' : order.priority === 'high' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface text-text-muted border border-border';
  const colMap: [string, React.ReactNode][] = [
    ['client', order.client?.name || '—'],
    ['weight', cargo.weight > 0 ? `${cargo.weight.toLocaleString()} kg` : '—'],
    ['pallets', cargo.pallets > 0 ? `${cargo.pallets}` : '—'],
    ['volume', cargo.volume > 0 ? `${cargo.volume.toFixed(1)} m³` : '—'],
    ['ldm', cargo.ldm > 0 ? `${cargo.ldm.toFixed(1)} ldm` : '—'],
    ['priority', <span className={`px-1.5 py-0.5 text-[9px] font-black rounded ${prioCls}`}>{String(t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')).toUpperCase()}</span>],
    ['stops', `${(order.stops || []).length} ${t('jsx_stops', 'opriri')}`],
    ['date', pickup?.dateFrom ? `${fmtShort(pickup.dateFrom)} ${pickup.timeFrom || ''}` : '—'],
  ];
  const visibleCols = colMap.filter(([k]) => cols?.[k]);
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('orderId', order.id); e.dataTransfer.effectAllowed = 'move'; onToggle?.(order.id, true); }}
      onDragEnd={() => onToggle?.(order.id, false)}
      onClick={() => onDetail?.(order)}
      className={`bg-card border rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing transition-all select-none ${dragging ? 'opacity-40 scale-95 border-primary' : 'border-border hover:border-primary/40 hover:shadow-md'}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span onClick={(e) => e.stopPropagation()} className="shrink-0">
            <button onClick={(e) => { e.stopPropagation(); onToggle?.(order.id, selected); }} className="text-text-secondary hover:text-primary">
              {selected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
            </button>
          </span>
          <span className="font-bold text-primary text-sm truncate">{order.orderNumber || order.referenceNumber || '—'}</span>
          {isUrgent && <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-100 text-red-600 border border-red-200 rounded shrink-0">{t('jsx_uRGENT', 'URGENT')}</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-blue-50 text-blue-700 border border-blue-200">{(order.transportType || 'FTL').toUpperCase()}</span>
          <button onClick={(e) => { e.stopPropagation(); onDetail?.(order); }} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-primary transition-colors" title={t('jsx_details', 'Detalii')}>
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5 text-xs text-text-secondary truncate">
        <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
        <span className="truncate">{pickup?.city || pickup?.address?.split(',')[0] || '—'}</span>
        <ArrowRight className="w-3 h-3 shrink-0 mx-0.5" />
        <MapPin className="w-3 h-3 text-green-400 shrink-0" />
        <span className="truncate">{dropoff?.city || dropoff?.address?.split(',')[0] || '—'}</span>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-xs text-text-secondary">{cargo.weight > 0 ? `${cargo.weight.toLocaleString()} kg` : '—'}{order.client?.name ? ` · ${order.client.name}` : ''}</span>
        <span className="text-xs font-bold text-primary">€{order.price || '0'}</span>
      </div>
      {pickup?.dateFrom && <div className="flex items-center gap-1 mt-1 text-[10px] text-text-secondary"><Calendar className="w-3 h-3" />{fmtShort(pickup.dateFrom)} {pickup.timeFrom || ''}</div>}
      {visibleCols.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/40">
          {visibleCols.map(([k, v]) => <span key={k} className="px-1.5 py-0.5 text-[9px] font-bold text-text-secondary bg-surface/70 border border-border/50 rounded">{v}</span>)}
        </div>
      )}
    </div>
  );
}

// ─── Order detail drawer (compact) ───────────────────────────────────────────
function OrderDetailDrawer({ order, onClose, onPlan, onDelete }: any) {
  const { t } = useTranslation();
  if (!order) return null;
  const pickup = order.stops?.find((s: any) => s.type === 'pickup');
  const dropoff = order.stops?.find((s: any) => s.type === 'dropoff');
  const cargo = sumCargo([order]);
  return typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[9999] flex justify-end" onClick={onClose}>
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
    <div className="relative w-full max-w-md bg-card shadow-2xl flex flex-col h-full overflow-y-auto border-l border-border" style={{ animation: 'slideInRight 0.22s ease-out' }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start justify-between p-5 border-b border-border bg-surface/40 shrink-0">
        <div>
          <h2 className="text-xl font-black text-text-primary">{order.orderNumber || order.referenceNumber || '—'}</h2>
          <p className="text-sm text-text-secondary mt-1">{order.client?.name || '—'}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500 transition-colors"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 p-5 space-y-5">
        <div className="bg-surface/50 rounded-xl border border-border p-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {t('route_section', 'Rută')}</h3>
          {pickup && <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-500" /></div>
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase">{t('loading_stop', 'Încărcare')}</p>
              <p className="font-semibold text-sm text-text-primary">{pickup.companyName || pickup.city || t('jsx_tbd')}</p>
              <p className="text-xs text-text-secondary">{pickup.address || '—'}</p>
              {pickup.dateFrom && <p className="text-xs text-blue-500 mt-0.5"><Calendar className="w-3 h-3 inline" /> {fmtDate(pickup.dateFrom)} {pickup.timeFrom || ''}</p>}
            </div>
          </div>}
          {pickup && dropoff && <div className="ml-3 border-l-2 border-dashed border-border h-3" />}
          {dropoff && <div className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center shrink-0 mt-0.5"><div className="w-2 h-2 rounded-full bg-green-500" /></div>
            <div>
              <p className="text-xs font-bold text-green-600 uppercase">{t('unloading_stop', 'Descărcare')}</p>
              <p className="font-semibold text-sm text-text-primary">{dropoff.companyName || dropoff.city || t('jsx_tbd')}</p>
              <p className="text-xs text-text-secondary">{dropoff.address || '—'}</p>
              {dropoff.dateFrom && <p className="text-xs text-green-500 mt-0.5"><Calendar className="w-3 h-3 inline" /> {fmtDate(dropoff.dateFrom)} {dropoff.timeFrom || ''}</p>}
            </div>
          </div>}
        </div>
        <div className="bg-surface/50 rounded-xl border border-border p-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5"><Package className="w-3.5 h-3.5" /> {t('cargo_section', 'Marfă')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-lg p-3 border border-border/60"><p className="text-xs text-text-secondary">{t('weight_kg', 'Greutate')}</p><p className="font-black text-lg text-text-primary">{cargo.weight.toLocaleString()} {t('unit_kg')}</p></div>
            <div className="bg-card rounded-lg p-3 border border-border/60"><p className="text-xs text-text-secondary">{t('jsx_ldm')}</p><p className="font-black text-lg text-text-primary">{cargo.ldm.toFixed(1)}</p></div>
            <div className="bg-card rounded-lg p-3 border border-border/60"><p className="text-xs text-text-secondary">{t('pallets', 'Paleți')}</p><p className="font-black text-lg text-text-primary">{cargo.pallets}</p></div>
            <div className="bg-card rounded-lg p-3 border border-border/60"><p className="text-xs text-text-secondary">{t('jsx_pre', 'Preț')}</p><p className="font-black text-lg text-primary">€{order.price || 0}</p></div>
          </div>
          {(order.equipmentRequirements || []).length > 0 && <div className="flex flex-wrap gap-1 mt-3">{order.equipmentRequirements.map((r: string) => <span key={r} className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-500/10 text-green-600 border border-green-500/20">{r}</span>)}</div>}
        </div>
        {order.notes && <div className="bg-surface/50 rounded-xl border border-border p-4"><h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">{t('jsx_notes')}</h3><p className="text-sm text-text-primary">{order.notes}</p></div>}
      </div>
      <div className="px-5 py-4 border-t border-border bg-surface/40 flex gap-2 shrink-0">
        <button onClick={() => onPlan?.(order)} className="btn-primary flex-1 text-sm py-2.5 flex items-center justify-center gap-1.5"><TruckIcon className="w-4 h-4" /> {t('jsx_planNow', 'Planifică acum')}</button>
        <button onClick={() => onDelete?.(order.id)} className="p-2.5 text-error hover:bg-error/10 rounded-xl transition-colors" title={t('jsx_deleteOrder', 'Șterge')}><Trash2 className="w-4 h-4" /></button>
      </div>
    </div>
  </div>, document.body) : null;
}

// ─── Trip side panel ─────────────────────────────────────────────────────────
function TripSidePanel({ trip, conflicts, onClose, onAction, onStatus, onOpenTrip, actionsLoading }: any) {
  const { t } = useTranslation();
  const [audit, setAudit] = useState<any[] | null>(null);
  const [orderFilter, setOrderFilter] = useState('');

  useEffect(() => {
    setAudit(null);
    if (trip?.id) {
      api.get(`/planning/audit?tripId=${trip.id}`).then(r => setAudit(r.data?.events || [])).catch(() => setAudit([]));
    }
  }, [trip?.id]);

  if (!trip) return null;
  const tripConflicts = (conflicts || []).filter((c: any) => c.tripId === trip.id);
  const stops = (trip.stops || []).slice().sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
  const orders = (trip.orders || []).filter((o: any) => o?.id && (o.orderNumber || '').toLowerCase().includes(orderFilter.toLowerCase()));
  const cargo = sumCargo(trip.orders);
  const truck = trip.truck;
  const maxWeight = truck?.maxWeightKg || 24000;
  const maxLdm = truck?.maxLdm || 13.6;
  const maxPallets = truck?.maxPallets || 33;
  const status = String(trip.status || '');
  const isPlanning = ['planning', 'planned', 'assigned'].includes(status);

  return (
    <div className="w-[380px] xl:w-[420px] shrink-0 flex flex-col gap-3 overflow-y-auto h-full">
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/40 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => onOpenTrip?.(trip.id)} className="font-black text-text-primary hover:text-primary flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" />{trip.tripNumber || '—'}</button>
              <span className={`px-2 py-0.5 text-[10px] font-black rounded-full text-white uppercase ${TRIP_COLORS[status] || 'bg-slate-500'}`}>{t(`status_${status}`, status)}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1"><TruckIcon className="w-3 h-3" />{truck?.plateNumber || '—'}{truck?.driver?.user?.name ? ` · ${truck.driver.user.name}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-surface/50 rounded-lg p-2.5"><p className="text-text-secondary">{t('jsx_departure', 'Plecare')}</p><p className="font-bold text-text-primary">{fmtTime(trip.plannedDeparture)} {fmtShort(trip.plannedDeparture)}</p></div>
            <div className="bg-surface/50 rounded-lg p-2.5"><p className="text-text-secondary">{t('jsx_arrival', 'Sosire')}</p><p className="font-bold text-text-primary">{fmtTime(trip.plannedArrival)} {fmtShort(trip.plannedArrival)}</p></div>
            <div className="bg-surface/50 rounded-lg p-2.5"><p className="text-text-secondary">{t('jsx_distance', 'Distanță')}</p><p className="font-bold text-text-primary">{trip.distanceKm ? `${Number(trip.distanceKm).toLocaleString()} ${t('unit_km')}` : '—'}</p></div>
            <div className="bg-surface/50 rounded-lg p-2.5"><p className="text-text-secondary">{t('jsx_revenue', 'Venit')}</p><p className="font-bold text-primary">€{Number(trip.estimatedProfit ?? trip.estimatedCost ?? 0).toLocaleString()}</p></div>
          </div>

          {/* Capacity */}
          <div className="space-y-1.5">
            {[
              { label: t('weight_kg', 'Greutate'), val: cargo.weight, max: maxWeight, suffix: t('unit_kg') },
              { label: t('jsx_ldm'), val: cargo.ldm, max: maxLdm, suffix: '' },
              { label: t('pallets', 'Paleți'), val: cargo.pallets, max: maxPallets, suffix: '' },
            ].map(b => {
              const pct = Math.min(100, (b.val / (b.max || 1)) * 100);
              const over = b.val > b.max;
              return <div key={b.label}>
                <div className="flex justify-between text-[10px] font-bold text-text-secondary"><span>{b.label}</span><span className={over ? 'text-red-500' : ''}>{Number(b.val).toLocaleString()} / {Number(b.max).toLocaleString()} {b.suffix}</span></div>
                <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden"><div className={`h-full ${over ? 'bg-red-500' : pct > 80 ? 'bg-orange-400' : 'bg-primary'}`} style={{ width: `${pct}%` }} /></div>
              </div>;
            })}
          </div>

          {/* Conflicts */}
          {tripConflicts.length > 0 && <div className="rounded-xl border border-border bg-surface/40 p-2.5 space-y-1">
            {tripConflicts.map((c: any) => <div key={c.id} className="flex items-start gap-1.5 text-[11px]">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${CONFLICT_LEVELS[c.level] || 'bg-slate-500 text-white'}`}>{c.level}</span>
              <span className="text-text-primary">{c.message}</span>
            </div>)}
          </div>}

          {/* Actions */}
          {isPlanning && <div className="flex flex-wrap gap-1.5 pt-1">
            {status !== 'planned' && <button disabled={actionsLoading} onClick={() => onAction?.('confirm', trip.id)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />{t('jsx_confirm', 'Confirmă')}</button>}
            <button disabled={actionsLoading} onClick={() => onAction?.('send', trip.id)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"><Send className="w-3.5 h-3.5" />{t('jsx_sendDriver', 'Trimite la șofer')}</button>
            <button disabled={actionsLoading} onClick={() => onAction?.('split', trip.id)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"><SplitSquareHorizontal className="w-3.5 h-3.5" />{t('jsx_split', 'Split')}</button>
            <button disabled={actionsLoading} onClick={() => onAction?.('unplan-all', trip.id)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 text-error"><Undo2 className="w-3.5 h-3.5" />{t('jsx_unplanAll', 'Deplanifică')}</button>
          </div>}

          {/* Status transition */}
          {isPlanning && TRIP_TRANSITIONS[status]?.length > 0 && <div className="pt-1">
            <label className="text-[10px] font-bold text-text-secondary uppercase">{t('jsx_changeStatus', 'Schimbă statusul')}</label>
            <CustomSelect value="" onChange={(to) => onStatus?.(trip.id, to)} options={[
              { value: '', label: t('jsx_chooseStatus', 'Alege status…') },
              ...(TRIP_TRANSITIONS[status] || []).map((s: string) => ({ value: s, label: t(`status_${s}`, s) })),
            ]} className="w-full text-xs mt-1" />
          </div>}
        </div>
      </div>

      {/* Orders */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />{t('jsx_orders', 'Comenzi')} <span className="text-primary">({orders.length})</span></h3>
          <div className="relative"><input value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} placeholder={t('search_order_placeholder', 'Caută…')} className="input text-xs py-1 pl-2 pr-6 w-28" /><Search className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted" /></div>
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {orders.length === 0 && <p className="text-xs text-text-secondary text-center py-4">{t('no_orders', 'Nicio comandă')}</p>}
          {orders.map((o: any) => {
            const oc = sumCargo([o]);
            return <div key={o.id} className="flex items-center justify-between text-[11px] bg-surface/60 border border-border/30 rounded-lg px-2 py-1.5">
              <div className="min-w-0">
                <p className="font-bold text-primary truncate">{o.orderNumber || o.referenceNumber || '—'}</p>
                <p className="text-text-secondary truncate">{o.client?.name || ''}{oc.weight > 0 ? ` · ${oc.weight.toLocaleString()} kg` : ''}</p>
              </div>
              <span className="text-[10px] text-text-secondary shrink-0">€{o.price || 0}</span>
            </div>;
          })}
        </div>
      </div>

      {/* Stops */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{t('jsx_stops', 'Opriri')} <span className="text-primary">({stops.length})</span></h3>
        <div className="space-y-1">
          {stops.map((s: any, i: number) => {
            const taskTypes = (s.tasks || []).map((tk: any) => tk.type === 'load' ? '⬆' : '⬇');
            return <div key={s.id} className="flex items-start gap-2 text-[11px]">
              <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center font-black text-[9px] shrink-0">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text-primary truncate">{s.companyName || s.city || s.address || '—'}</p>
                <p className="text-text-secondary truncate">{s.address}{s.postalCode ? `, ${s.postalCode}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-text-secondary">{fmtTime(s.eta)}</p>
                <p className="text-[10px]">{taskTypes.join(' ')} {s.tasks?.length ? `(${(s.tasks||[]).reduce((a: number, tk: any) => a + (Number(tk.pallets) || 0), 0)} pal)` : ''}</p>
              </div>
            </div>;
          })}
        </div>
      </div>

      {/* Audit */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-4">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" />{t('jsx_audit', 'Audit')}</h3>
        {!audit ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> : audit.length === 0 ? <p className="text-xs text-text-secondary text-center py-4">{t('jsx_noEventsLogge', 'Niciun eveniment')}</p> : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {audit.map((ev: any) => <div key={ev.id} className="flex items-start gap-2 text-[11px]">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${ev.type === 'system' ? 'bg-slate-400' : 'bg-primary'}`} />
              <div className="min-w-0">
                <p className="font-bold text-text-primary capitalize">{String(ev.action || '').replace(/_/g, ' ')}</p>
                {ev.details && <p className="text-text-secondary truncate">{String(ev.details || '').slice(0, 120)}</p>}
                <p className="text-[9px] text-text-muted">{ev.user?.name || ev.user?.email || 'system'} · {new Date(ev.createdAt).toLocaleString()}</p>
              </div>
            </div>)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Smart assign modal ──────────────────────────────────────────────────────
function SmartAssignModal({ order, resources, trips, onClose, onAssign }: any) {
  const { t } = useTranslation();
  const cargo = sumCargo([order]);
  const [mode, setMode] = useState<'trip' | 'new'>('trip');
  const [tripId, setTripId] = useState('');
  const [truckId, setTruckId] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);

  useEffect(() => {
    if (!order?.id || order.id === '__bulk__') return;
    const pickup = order?.stops?.find((s: any) => s.type === 'pickup');
    const day = (pickup?.dateFrom || new Date().toISOString().slice(0, 10));
    setSuggLoading(true);
    api.get('/planning/suggestions', { params: { from: day, to: day } })
      .then((res: any) => {
        const list = res.data?.suggestions || [];
        setSuggestions(list.filter((s: any) => s.orderId === order.id).slice(0, 3));
      })
      .catch(() => setSuggestions([]))
      .finally(() => setSuggLoading(false));
  }, [order?.id]);

  const eligibleTrips = (trips || []).filter((tr: any) => ['planning', 'planned', 'assigned'].includes(String(tr.status)));
  const resById = new Map<string, any>((resources || []).map((r: any) => [r.id, r] as [string, any]));
  const tripOptions = eligibleTrips.map((tr: any) => ({ value: tr.id, label: `${tr.tripNumber || tr.id.slice(0, 8)} · ${tr.truck?.plateNumber || '—'}` }));
  const truckOptions = (resources || []).filter((r: any) => String(r.status) !== 'inactive').map((r: any) => ({ value: r.id, label: `${r.plateNumber}${r.driver?.name ? ` · ${r.driver.name}` : ''}` }));

  return typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <div className="relative w-full max-w-lg bg-card shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
      <div className="px-6 py-4 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold text-text-primary">{t('jsx_assignOrder', 'Asignare comandă')} · {order.orderNumber || '—'}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{order.client?.name || ''} · {cargo.weight.toLocaleString()} kg · €{order.price || 0}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 space-y-4 overflow-y-auto flex-1">
        <div className="flex gap-2">
          <button onClick={() => setMode('trip')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${mode === 'trip' ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary'}`}>{t('jsx_toExistingTrip', 'La o cursă existentă')}</button>
          <button onClick={() => setMode('new')} className={`flex-1 py-2 rounded-xl text-xs font-bold border ${mode === 'new' ? 'bg-primary text-white border-primary' : 'border-border text-text-secondary'}`}>{t('jsx_newTrip', 'Cursă nouă')}</button>
        </div>
        {mode === 'trip' ? (
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase">{t('jsx_selectTrip', 'Selectează cursa')}</label>
            <CustomSelect value={tripId} onChange={setTripId} options={tripOptions} placeholder={t('jsx_selectTrip', 'Selectează cursa')} className="w-full mt-1" />
            {tripId && <p className="text-[10px] text-text-secondary mt-2">{t('jsx_tip_addToTrip', 'Comanda va fi adăugată în cursa selectată, cu validare automată a capacității.')}</p>}
          </div>
        ) : (
          <div>
            <label className="text-[10px] font-bold text-text-secondary uppercase">{t('jsx_selectTruck', 'Selectează camionul')}</label>
            <CustomSelect value={truckId} onChange={setTruckId} options={truckOptions} placeholder={t('jsx_selectTruck', 'Selectează camionul')} className="w-full mt-1" />
            {suggLoading ? <p className="text-[10px] text-text-muted mt-2 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />{t('jsx_loadingSuggest', 'Calculăm recomandările...')}</p> : suggestions.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] font-bold text-text-secondary uppercase mb-1.5">{t('jsx_smartSuggest', 'Vehicule recomandate')}</p>
                <div className="space-y-1.5">
                  {suggestions.map((s: any, i: number) => (
                    <button key={s.id} onClick={() => setTruckId(s.truckId)} className={`w-full text-left px-3 py-2 rounded-xl border flex items-center justify-between gap-2 transition-all ${truckId === s.truckId ? 'border-primary bg-primary-light' : 'border-border bg-card hover:border-primary/40'}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">{s.plateNumber}</span>
                          <span className="px-1 py-0.5 rounded text-[9px] font-black bg-green-100 text-green-700">{Math.round(s.score || 0)}%</span>
                        </div>
                        <p className="text-[10px] text-text-secondary truncate">{s.truckType} · {s.driver || '—'}</p>
                        <p className="text-[10px] text-text-muted truncate">{s.reason}</p>
                      </div>
                      {i === 0 && <span className="text-[9px] font-black uppercase text-primary shrink-0">{t('jsx_bestMatch', 'Cel mai bun')}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {truckId && (() => {
              const r = resById.get(truckId);
              const w = Math.min(100, (cargo.weight / (r?.maxWeightKg || 24000)) * 100);
              return <div className="mt-2 space-y-1">
                {r?.hasMaintenance && <p className="text-[10px] font-bold text-red-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />{t('jsx_maintWarn', 'În mentenanță!')}</p>}
                <div className="flex justify-between text-[10px] font-bold text-text-secondary"><span>{t('weight_kg', 'Greutate')}</span><span>{cargo.weight.toLocaleString()} / {r?.maxWeightKg || 24000} kg</span></div>
                <div className="w-full bg-surface h-1.5 rounded-full"><div className="h-full bg-primary rounded-full" style={{ width: `${w}%` }} /></div>
              </div>;
            })()}
          </div>
        )}
      </div>
      <div className="px-6 py-3 border-t border-border bg-surface/50 flex justify-end gap-2 shrink-0">
        <button onClick={onClose} className="btn-secondary text-xs py-2 px-4">{t('jsx_anuleaz', 'Anulează')}</button>
        <button disabled={mode === 'trip' ? !tripId : !truckId} onClick={() => onAssign(mode === 'trip' ? { tripIds: [tripId] } : { truckId })} className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{t('jsx_assignBtn', 'Asignează')}</button>
      </div>
    </div>
  </div>, document.body) : null;
}

// ─── Optimize modal ──────────────────────────────────────────────────────────
function OptimizeModal({ open, onClose, onApply, onRun, result, running }: any) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (result?.proposedTrips) {
      const map: Record<string, boolean> = {};
      result.proposedTrips.forEach((p: any) => { map[p.id] = true; });
      setSelected(map);
    }
  }, [result]);
  if (!open) return null;
  const props = result?.proposedTrips || [];
  const selCount = props.filter((p: any) => selected[p.id]).length;
  return typeof document !== 'undefined' ? createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
    <div className="relative w-full max-w-3xl bg-card shadow-2xl rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: '88vh' }}>
      <div className="px-6 py-4 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />{t('jsx_optimizer', 'Asistent optimizare')}</h2>
          {result?.summary && <p className="text-xs text-text-secondary mt-0.5">{t('jsx_coverage', 'Acoperire')}: {result.summary.coverage}% · {t('jsx_estProfit', 'Profit estimat')}: €{result.summary.estimatedProfit} · {t('jsx_savings', 'Economii')}: €{result.summary.savings}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-5 overflow-y-auto flex-1 space-y-2">
        {running && <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
        {!running && props.length === 0 && <p className="text-center text-sm text-text-secondary py-8">{t('jsx_noOptimization', 'Nicio propunere generată.')}</p>}
        {!running && props.map((p: any) => {
          const tSel = !!selected[p.id];
          return <div key={p.id} className={`border rounded-xl p-3.5 transition-all ${tSel ? 'border-primary bg-primary/5' : 'border-border'}`}>
            <div className="flex items-start gap-3">
              <button onClick={() => setSelected({ ...selected, [p.id]: !tSel })} className="mt-0.5 text-primary">{tSel ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-text-secondary" />}</button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <TruckIcon className="w-4 h-4 text-primary" />
                  <span className="font-bold text-text-primary text-sm">{p.plateNumber}</span>
                  <span className="text-[10px] font-bold uppercase rounded px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">{p.truckType || '—'}</span>
                  <span className="text-[10px] text-text-secondary">{p.driver || '—'}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${p.driverHosOk === false ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{p.driverHosOk === false ? t('jsx_hos') : t('jsx_hosOk')}</span>
                </div>
                <p className="text-xs text-text-secondary mt-1 truncate">{p.origin || '?'} → {p.destination || '?'} · {p.orderIds?.length || 0} {t('jsx_orders', 'comenzi')} · {p.distanceKm || 0} {t('unit_km')}</p>
                <div className="flex items-center justify-between mt-1.5 text-[11px]">
                  <span className="text-text-secondary">{t('jsx_orders', 'Comenzi')}: <b className="text-text-primary">{p.orders?.map((o: any) => o.orderNumber).join(', ') || '—'}</b></span>
                  <div className="text-right">
                    <span className="font-black text-green-600">€{p.estimatedProfit || 0}</span>
                    <span className="text-text-secondary"> · util {p.utilization || 0}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>;
        })}
      </div>
      <div className="px-6 py-3 border-t border-border bg-surface/50 flex justify-between items-center shrink-0">
        <span className="text-xs text-text-secondary">{t('jsx_selected', 'Selectate')}: {selCount}</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary text-xs py-2 px-4">{t('jsx_close', 'Închide')}</button>
          <button disabled={running} onClick={() => onRun()} className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" />{t('jsx_recalc', 'Recalculează')}</button>
          <button disabled={running || selCount === 0} onClick={() => onApply(props.filter((p: any) => selected[p.id]))} className="btn-primary text-xs py-2 px-5 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />{t('jsx_apply', 'Aplică')} ({selCount})</button>
        </div>
      </div>
    </div>
  </div>, document.body) : null;
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const localeMap: Record<string, string> = { ro: 'ro-RO', en: 'en-GB', nl: 'nl-NL', de: 'de-DE', fr: 'fr-FR' };
  const locale = localeMap[i18n.language?.split('-')[0]] || 'en-GB';

  const today = dayStr(new Date());
  const [from, setFrom] = useState<string>(today);
  const [to, setTo] = useState<string>(today);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'timeline' | 'map'>('day');

  // Board data
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mapData, setMapData] = useState<any>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [trailerFilter, setTrailerFilter] = useState('');
  const [clients, setClients] = useState<any[]>([]);
  const [trailers, setTrailers] = useState<any[]>([]);
  const [poolGroupBy, setPoolGroupBy] = useState<'none' | 'day' | 'client' | 'priority'>('none');
  const [poolSortBy, setPoolSortBy] = useState<'priority' | 'date' | 'weight' | 'pallets' | 'price' | 'client'>('priority');
  const [boardGroup, setBoardGroup] = useState<'vehicle' | 'driver' | 'trailer'>('vehicle');
  const [truckFilter, setTruckFilter] = useState<'all' | 'busy' | 'planned' | 'free' | 'warning'>('all');

  // Saved views
  const [views, setViews] = useState<any[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // Selection / modals
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<any | null>(null);
  const [assignOrder, setAssignOrder] = useState<any | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [optimizeRunning, setOptimizeRunning] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [splitModal, setSplitModal] = useState<{ open: boolean; tripId: string | null; orderIds: string[] }>({ open: false, tripId: null, orderIds: [] });

  // Drag
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverResourceId, setDragOverResourceId] = useState<string | null>(null);
  const [actionsLoading, setActionsLoading] = useState(false);

  // Layout / UX
  const [poolCollapsed, setPoolCollapsed] = useState<boolean>(() => localStorage.getItem('planning_pool_collapsed') === '1');
  const [poolWidth, setPoolWidth] = useState<number>(() => Math.min(480, Math.max(240, Number(localStorage.getItem('planning_pool_width')) || 320)));
  const [draggingDivider, setDraggingDivider] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(!!document.fullscreenElement);
  const [showKpi, setShowKpi] = useState<boolean>(() => localStorage.getItem('planning_show_kpi') !== '0');
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; trip: any } | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [attentionOpen, setAttentionOpen] = useState(false);
  const [attentionTab, setAttentionTab] = useState<'all' | 'blocking' | 'warning' | 'info'>('all');
  const [highlightResourceId, setHighlightResourceId] = useState<string | null>(null);
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [poolColsOpen, setPoolColsOpen] = useState(false);
  const [poolCols, setPoolCols] = useState<Record<string, boolean>>(() => {
    try { return { ...DEFAULT_POOL_COLS, ...(JSON.parse(localStorage.getItem('planning_pool_cols') || '{}')) }; }
    catch { return { ...DEFAULT_POOL_COLS }; }
  });

  useEffect(() => { localStorage.setItem('planning_pool_collapsed', poolCollapsed ? '1' : '0'); }, [poolCollapsed]);
  useEffect(() => { localStorage.setItem('planning_pool_width', String(poolWidth)); }, [poolWidth]);
  useEffect(() => { localStorage.setItem('planning_show_kpi', showKpi ? '1' : '0'); }, [showKpi]);
  useEffect(() => { localStorage.setItem('planning_pool_cols', JSON.stringify(poolCols)); }, [poolCols]);
  useEffect(() => {
    document.body.classList.toggle('print-mode', printOpen);
    return () => document.body.classList.remove('print-mode');
  }, [printOpen]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('contextmenu', close);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('contextmenu', close);
    };
  }, [contextMenu]);

  const startDividerDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingDivider(true);
    const startX = e.clientX;
    const startW = poolWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => setPoolWidth(Math.min(480, Math.max(220, startW + (ev.clientX - startX))));
    const onUp = () => {
      setDraggingDivider(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  };

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadBoard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params: any = { from, to };
      if (debouncedSearch) params.search = debouncedSearch;
      if (statusFilter) params.status = statusFilter;
      if (vehicleFilter) params.vehicleId = vehicleFilter;
      if (driverFilter) params.driverId = driverFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (equipmentFilter) params.equipment = equipmentFilter;
      if (clientFilter) params.clientId = clientFilter;
      if (trailerFilter) params.trailerId = trailerFilter;
      const res = await api.get('/planning/board', { params });
      setData(res.data);
    } catch (e: any) {
      if (!silent) toast.error(e?.response?.data?.message || t('jsx_loadError', 'Eroare la încărcarea board-ului'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [from, to, debouncedSearch, statusFilter, vehicleFilter, driverFilter, priorityFilter, equipmentFilter, clientFilter, trailerFilter, t]);

  useEffect(() => { loadBoard(); }, [loadBoard]);
  useEffect(() => { const id = setTimeout(() => setDebouncedSearch(search), 400); return () => clearTimeout(id); }, [search]);
  useEffect(() => { const id = setInterval(() => loadBoard(true), 30000); return () => clearInterval(id); }, [loadBoard]);

  useEffect(() => {
    if (viewMode !== 'map') return;
    let cancelled = false;
    api.get('/planning/map-data', { params: { from, to } }).then(r => { if (!cancelled) setMapData(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [viewMode, from, to]);

  useEffect(() => {
    api.get('/planning/views').then(r => setViews(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    api.get('/clients').then(r => setClients(r.data || [])).catch(() => {});
    api.get('/trailers').then(r => setTrailers(r.data || [])).catch(() => {});
  }, []);

  // Auto-select a trip when board reloads and a trip is selected
  useEffect(() => {
    if (!selectedTripId || !data) return;
    const exists = (data.trips || []).some((tr: any) => tr.id === selectedTripId);
    if (!exists) setSelectedTripId(null);
  }, [data, selectedTripId]);

  const selectedTrip = useMemo(() => {
    if (!selectedTripId || !data) return null;
    return (data.trips || []).find((tr: any) => tr.id === selectedTripId) || null;
  }, [selectedTripId, data]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const conflictsByResource = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const c of data?.conflicts || []) { if (c.resourceId) (m[c.resourceId] ||= []).push(c); }
    return m;
  }, [data]);
  const conflictsByOrder = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const c of data?.conflicts || []) { if (c.orderId) (m[c.orderId] ||= []).push(c); }
    return m;
  }, [data]);

  const attentionCounts = useMemo(() => {
    const c = { blocking: 0, warning: 0, info: 0 };
    for (const x of data?.conflicts || []) if (c[x.level] !== undefined) c[x.level]++;
    return c;
  }, [data]);

  const attentionTotal = attentionCounts.blocking + attentionCounts.warning + attentionCounts.info;

  const focusConflict = useCallback((c: any) => {
    setAttentionOpen(false);
    if (c.tripId) { setSelectedTripId(c.tripId); return; }
    if (c.resourceId) {
      setBoardGroup('vehicle');
      setTruckFilter('all');
      setDriverFilter('all');
      setHighlightResourceId(c.resourceId);
      window.setTimeout(() => setHighlightResourceId(null), 4000);
      if (viewMode !== 'day') setViewMode('day');
    }
  }, [setSelectedTripId, setBoardGroup, setTruckFilter, setDriverFilter, viewMode]);

  const resources = data?.resources || [];
  const trips = data?.trips || [];
  const orders = data?.orders || [];
  const drivers = data?.drivers || [];
  const hosSummary = data?.hosSummary || {};
  const counts = data?.counts || {};
  const conflicts = data?.conflicts || [];

  const IN_PROGRESS = ['dispatched', 'driver_accepted', 'started', 'loading', 'driving', 'partially_delivered'];
  const PLANNING = ['planning', 'planned', 'assigned'];

  const getResourceCurrentTrip = (resId: string) => {
    const all = trips.filter((tr: any) => tr.truck?.id === resId);
    const inProgress = all.find((tr: any) => IN_PROGRESS.includes(String(tr.status)));
    if (inProgress) return inProgress;
    const planned = all.filter((tr: any) => PLANNING.includes(String(tr.status))).sort((a: any, b: any) => new Date(a.plannedDeparture || 0).getTime() - new Date(b.plannedDeparture || 0).getTime());
    return planned[0] || null;
  };
  const getResourceTrips = (resId: string) => trips.filter((tr: any) => tr.truck?.id === resId);
  const getResourceStats = (resId: string) => {
    const cur = getResourceCurrentTrip(resId);
    const cargo = sumCargo(cur?.orders);
    const future = getResourceTrips(resId).filter((tr: any) => tr.id !== cur?.id).length;
    return { cur, cargo, future, busy: !!cur && IN_PROGRESS.includes(String(cur.status)) };
  };

  const busyCount = resources.filter((r: any) => getResourceStats(r.id).busy).length;
  const plannedResCount = resources.filter((r: any) => { const s = getResourceStats(r.id); return !!s.cur && !s.busy; }).length;
  const freeCount = resources.filter((r: any) => !getResourceStats(r.id).cur).length;
  const warningCount = resources.filter((r: any) => (conflictsByResource[r.id] || []).some((c: any) => c.level !== 'info')).length;

  const visibleResources = useMemo(() => {
    let list = resources;
    if (truckFilter === 'busy') list = list.filter((r: any) => getResourceStats(r.id).busy);
    else if (truckFilter === 'planned') list = list.filter((r: any) => { const s = getResourceStats(r.id); return !!s.cur && !s.busy; });
    else if (truckFilter === 'free') list = list.filter((r: any) => !getResourceStats(r.id).cur);
    else if (truckFilter === 'warning') list = list.filter((r: any) => (conflictsByResource[r.id] || []).some((c: any) => c.level !== 'info'));
    return list;
  }, [resources, truckFilter, conflictsByResource]);

  // Board rows — supports grouping by vehicle / driver / trailer
  const boardRows = useMemo(() => {
    const rangeTrips = trips.filter((tr: any) => tr.plannedDeparture && new Date(tr.plannedDeparture) >= parseDay(from) && new Date(tr.plannedDeparture) <= new Date(parseDay(to).getTime() + 86400000));
    if (boardGroup === 'driver') {
      const byId = new Map<string, any>();
      for (const tr of rangeTrips) {
        if (!tr.driver?.id) continue;
        if (!byId.has(tr.driver.id)) byId.set(tr.driver.id, { kind: 'driver', id: tr.driver.id, name: tr.driver.name, trips: [] });
        byId.get(tr.driver.id)!.trips.push(tr);
      }
      for (const d of drivers) { if (d?.id && !byId.has(d.id)) byId.set(d.id, { kind: 'driver', id: d.id, name: d.name, trips: [] }); }
      return Array.from(byId.values());
    }
    if (boardGroup === 'trailer') {
      const byId = new Map<string, any>();
      for (const tr of rangeTrips) {
        if (!tr.trailer?.id) continue;
        if (!byId.has(tr.trailer.id)) byId.set(tr.trailer.id, { kind: 'trailer', id: tr.trailer.id, name: tr.trailer.plateNumber || tr.trailer.registrationNumber || '—', trips: [] });
        byId.get(tr.trailer.id)!.trips.push(tr);
      }
      for (const tl of trailers) { if (tl?.id && !byId.has(tl.id)) byId.set(tl.id, { kind: 'trailer', id: tl.id, name: tl.plateNumber || tl.registrationNumber || '—', trips: [] }); }
      return Array.from(byId.values());
    }
    return visibleResources;
  }, [boardGroup, trips, drivers, trailers, visibleResources, from, to]);

  // Excel export rows (dispatch board)
  const exportRows = useMemo(() => trips.map((tr: any) => {
    const orders = tr.orders || [];
    const firstOrder = orders[0];
    const op = firstOrder?.stops?.find((s: any) => s.type === 'pickup');
    const od = firstOrder?.stops?.find((s: any) => s.type === 'dropoff');
    return {
      trip: tr.tripNumber || '',
      truck: tr.truck?.plateNumber || tr.truck?.registrationNumber || '',
      driver: tr.driver?.name || '',
      trailer: tr.trailer?.plateNumber || tr.trailer?.registrationNumber || '',
      client: orders.map((o: any) => o.client?.name).filter(Boolean).join(', '),
      orders: orders.map((o: any) => o.orderNumber).filter(Boolean).join(', '),
      pickup: op ? (op.city || String(op.address || '').split(',')[0] || '—') : '—',
      dropoff: od ? (od.city || String(od.address || '').split(',')[0] || '—') : '—',
      departure: tr.plannedDeparture || '',
      arrival: tr.plannedArrival || '',
      weight: Math.round(sumCargo(orders).weight),
      distance: tr.distanceKm || 0,
      revenue: tr.estimatedProfit != null ? tr.estimatedProfit : 0,
      cost: tr.estimatedCost || 0,
      status: String(tr.status || '').replace(/_/g, ' '),
    };
  }), [trips]);

  // Pool grouping
  const groupedPool = useMemo(() => {
    const list = orders;
    const groups: { key: string; label: string; items: any[] }[] = [];
    const bucket = new Map<string, { label: string; items: any[] }>();
    for (const o of list) {
      let key = '_all';
      let label: string = t('jsx_all', 'Toate');
      const pickup = o.stops?.find((s: any) => s.type === 'pickup');
      if (poolGroupBy === 'day') { key = pickup?.dateFrom || '_none'; label = pickup?.dateFrom ? fmtShort(pickup.dateFrom) : String(t('jsx_noDate', 'Fără dată')); }
      else if (poolGroupBy === 'client') { key = o.client?.id || '_none'; label = o.client?.name || String(t('jsx_noClient', 'Fără client')); }
      else if (poolGroupBy === 'priority') { key = o.priority || 'normal'; label = String(t(`priority_${o.priority || 'normal'}`, o.priority || 'normal')); }
      if (!bucket.has(key)) bucket.set(key, { label, items: [] });
      bucket.get(key)!.items.push(o);
    }
    for (const [key, b] of bucket) {
      groups.push({ key, label: key === '_all' ? '' : `${b.label} (${b.items.length})`, items: b.items });
    }
    const orderPriority: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    for (const g of groups) {
      const items = g.items;
      if (poolSortBy === 'date') items.sort((a: any, b: any) => (a.stops?.find((s: any) => s.type === 'pickup')?.dateFrom || '').localeCompare(b.stops?.find((s: any) => s.type === 'pickup')?.dateFrom || ''));
      else if (poolSortBy === 'weight') items.sort((a: any, b: any) => sumCargo([b]).weight - sumCargo([a]).weight);
      else if (poolSortBy === 'pallets') items.sort((a: any, b: any) => sumCargo([b]).pallets - sumCargo([a]).pallets);
      else if (poolSortBy === 'price') items.sort((a: any, b: any) => Number(b.price || b.estimatedProfit || 0) - Number(a.price || a.estimatedProfit || 0));
      else if (poolSortBy === 'client') items.sort((a: any, b: any) => String(a.client?.name || '').localeCompare(String(b.client?.name || '')));
      else items.sort((a: any, b: any) => (orderPriority[a.priority || 'normal'] ?? 9) - (orderPriority[b.priority || 'normal'] ?? 9));
    }
    return groups;
  }, [orders, poolGroupBy, poolSortBy, t]);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = [
    { key: 'unassigned', label: t('kpi_unassigned', 'Neasignate'), value: counts.unplanned ?? orders.length, icon: Package, color: '#f97316', onClick: () => { setTruckFilter('all'); setStatusFilter(''); }, active: truckFilter === 'all' && !statusFilter },
    { key: 'trucks', label: t('kpi_active_trucks', 'Camioane'), value: resources.length, icon: TruckIcon, onClick: () => setTruckFilter('all'), active: truckFilter === 'all' },
    ...(boardGroup === 'vehicle' ? [
      { key: 'planned', label: t('kpi_planned', 'Planificate'), value: counts.planned ?? plannedResCount, color: '#f59e0b', icon: Calendar, onClick: () => setTruckFilter('planned'), active: truckFilter === 'planned' },
      { key: 'busy', label: t('kpi_in_trip', 'În cursă'), value: counts.inProgress ?? busyCount, color: '#6366f1', icon: Activity, onClick: () => setTruckFilter('busy'), active: truckFilter === 'busy' },
      { key: 'free', label: t('kpi_free', 'Libere'), value: counts.sent ?? freeCount, color: '#22c55e', icon: CheckCircle2, onClick: () => setTruckFilter('free'), active: truckFilter === 'free' },
      { key: 'attention', label: t('kpi_overload', 'Atenționări'), value: counts.attention ?? warningCount, color: (counts.attention ?? warningCount) > 0 ? '#ef4444' : '#22c55e', icon: AlertTriangle, onClick: () => setTruckFilter('warning'), active: truckFilter === 'warning' },
    ] : []),
  ];

  // ── Date navigation ────────────────────────────────────────────────────────
  const shiftRange = (days: number) => {
    const d0 = parseDay(from);
    const d1 = parseDay(to);
    const span = Math.max(1, Math.round((d1.getTime() - d0.getTime()) / 86400000));
    setFrom(dayStr(addDays(d0, days)));
    setTo(dayStr(addDays(d0, days + span)));
  };
  const setRange = (days: number) => {
    const d = new Date();
    if (days === 7) {
      const dow = (d.getDay() + 6) % 7; // Monday start
      const monday = addDays(d, -dow);
      setFrom(dayStr(monday));
      setTo(dayStr(addDays(monday, 6)));
    } else {
      setFrom(dayStr(d));
      setTo(dayStr(d));
    }
  };
  const applyDatePreset = (preset: 'today' | 'tomorrow' | 'thisWeek' | 'nextWeek') => {
    const d = new Date();
    const mondayOf = (x: Date) => addDays(x, -((x.getDay() + 6) % 7));
    if (preset === 'today') { setFrom(dayStr(d)); setTo(dayStr(d)); }
    else if (preset === 'tomorrow') { const t = addDays(d, 1); setFrom(dayStr(t)); setTo(dayStr(t)); }
    else if (preset === 'thisWeek') { const m = mondayOf(d); setFrom(dayStr(m)); setTo(dayStr(addDays(m, 6))); }
    else { const m = mondayOf(addDays(d, 7)); setFrom(dayStr(m)); setTo(dayStr(addDays(m, 6))); }
    setDateMenuOpen(false);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const runAction = async (fn: () => Promise<any>, successMsg: string) => {
    setActionsLoading(true);
    try {
      const res = await fn();
      toast.success(successMsg);
      await loadBoard(true);
      return res;
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || e?.message || t('jsx_actionError', 'Eroare'));
      return null;
    } finally {
      setActionsLoading(false);
    }
  };

  const handleAssign = (orderIds: string[], opts: any) =>
    runAction(async () => {
      const res = await api.post('/planning/orders/validate', { orderIds, tripIds: opts.tripIds || [], truckId: opts.truckId || undefined });
      const warnings = (res.data || []).filter((c: any) => c.level === 'blocking');
      if (warnings.length) throw { response: { data: { message: warnings.map((w: any) => w.message) } } };
      return api.post('/planning/assign', { orderIds, tripIds: opts.tripIds || [], truckId: opts.truckId || undefined, driverId: opts.driverId });
    }, t('jsx_assignedOk', 'Comandă(zi) planificată cu succes'));

  const handleUnplan = (orderIds: string[]) =>
    runAction(() => api.post('/planning/unplan', { orderIds }), t('jsx_unplannedOk', 'Comandă(zi) deplanificată'));

  const handleConfirm = (tripId: string) =>
    runAction(() => api.post(`/planning/trips/${tripId}/confirm`, {}), t('jsx_confirmedOk', 'Cursă confirmată'));

  const handleSend = (tripId: string) =>
    runAction(() => api.post(`/planning/trips/${tripId}/send-to-driver`, {}), t('jsx_sentOk', 'Cursă trimisă la șofer'));

  const handleStatus = (tripId: string, to: string) =>
    runAction(() => api.post(`/planning/trips/${tripId}/status`, { to }), t('jsx_statusOk', 'Status actualizat'));

  const handleUndo = () =>
    runAction(() => api.post('/planning/undo', {}), t('jsx_undone', 'Acțiune anulată'));

  const handleSplit = (tripId: string, orderIds: string[]) =>
    runAction(() => api.post(`/planning/trips/${tripId}/split`, { orderIds }), t('jsx_splitOk', 'Cursă divizată'));

  const handleOptimize = async () => {
    setOptimizeRunning(true);
    try {
      const res = await api.post('/planning/optimize', { from, to });
      setOptimizeResult(res.data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('jsx_actionError', 'Eroare'));
    } finally {
      setOptimizeRunning(false);
    }
  };

  const handleApplyOptimization = (proposals: any[]) =>
    runAction(() => api.post('/planning/optimize/apply', { proposals }), t('jsx_appliedOk', 'Optimizare aplicată')).then(r => { if (r) { setOptimizeOpen(false); setOptimizeResult(null); } });

  const handleDeleteOrder = async () => {
    if (!deleteModal.orderId) return;
    await runAction(() => api.delete(`/orders/${deleteModal.orderId}`), t('jsx_deletedOk', 'Comandă ștearsă'));
    setDeleteModal({ open: false, orderId: null });
  };

  const handleSaveView = async () => {
    const name = newViewName.trim();
    if (!name) return;
    const res = await runAction(() => api.post('/planning/views', {
      name,
      filters: { status: statusFilter, vehicleId: vehicleFilter, driverId: driverFilter, priority: priorityFilter, equipment: equipmentFilter, clientId: clientFilter, trailerId: trailerFilter },
      dateRange: { from, to },
      viewMode,
    }), t('jsx_viewSaved', 'Vizualizare salvată'));
    if (res) { setViews(await api.get('/planning/views').then(r => r.data || []).catch(() => views)); setSaveViewOpen(false); setNewViewName(''); }
  };

  const applyView = async (v: any) => {
    setActiveViewId(v.id);
    const d = v.data || {};
    if (d.dateRange?.from) { setFrom(d.dateRange.from); if (d.dateRange.to) setTo(d.dateRange.to); }
    if (d.viewMode) setViewMode(d.viewMode);
    const f = d.filters || {};
    setStatusFilter(f.status || ''); setVehicleFilter(f.vehicleId || ''); setDriverFilter(f.driverId || '');
    setPriorityFilter(f.priority || ''); setEquipmentFilter(f.equipment || '');
    setClientFilter(f.clientId || ''); setTrailerFilter(f.trailerId || '');
  };

  const handleDeleteView = async (v: any) => {
    await runAction(() => api.delete(`/planning/views/${v.id}`), t('jsx_viewDeleted', 'Vizualizare ștearsă'));
    setViews((await api.get('/planning/views').then(r => r.data || []).catch(() => [])));
    if (activeViewId === v.id) setActiveViewId('');
  };

  // ── Drag & drop ────────────────────────────────────────────────────────────
  const handleOrderDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('orderId', orderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingOrderId(orderId);
  };
  const handleDropOnResource = async (e: React.DragEvent, resourceId: string) => {
    e.preventDefault();
    setDragOverResourceId(null);
    setDraggingOrderId(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;
    const cur = getResourceCurrentTrip(resourceId);
    await handleAssign([orderId], cur ? { tripIds: [cur.id] } : { truckId: resourceId });
  };
  const handleDropOnTrip = async (e: React.DragEvent, tripId: string) => {
    e.preventDefault();
    setDragOverResourceId(null);
    setDraggingOrderId(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;
    await handleAssign([orderId], { tripIds: [tripId] });
  };
  const handleDropOnGroupRow = async (e: React.DragEvent, row: any) => {
    e.preventDefault();
    setDragOverResourceId(null);
    setDraggingOrderId(null);
    const orderId = e.dataTransfer.getData('orderId');
    if (!orderId) return;
    if (row.kind === 'driver') {
      const truck = resources.find((r: any) => r.driver?.id === row.id || r.driverId === row.id);
      if (!truck) { toast.error(t('jsx_driverNoTruck', 'Șoferul nu are un camion asignat')); return; }
      await handleAssign([orderId], { truckId: truck.id });
      return;
    }
    const truck = resources.find((r: any) => r.trailer?.id === row.id || r.trailerId === row.id);
    if (!truck) { toast.error(t('jsx_trailerNoTruck', 'Remorca nu este atașată la un camion')); return; }
    await handleAssign([orderId], { truckId: truck.id });
  };

  // ── Shortcuts ──────────────────────────────────────────────────────────────
  useShortcuts({
    '1': () => setViewMode('day'),
    '2': () => setViewMode('week'),
    '3': () => setViewMode('timeline'),
    '4': () => setViewMode('map'),
    'ctrl+z': () => { if (!actionsLoading) handleUndo(); },
    'ctrl+t': () => setViewMode('timeline'),
    'ctrl+m': () => setViewMode('map'),
    'f': () => toggleFullscreen(),
    'a': () => document.getElementById('planning-search')?.focus(),
    'u': () => setPoolCollapsed(p => !p),
    'o': () => setOptimizeOpen(true),
    'escape': () => {
      if (document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
      setContextMenu(null); setDateMenuOpen(false); setLayoutMenuOpen(false);
      setAssignOrder(null); setSelectedOrderDetail(null); setOptimizeOpen(false); setSaveViewOpen(false); setPoolColsOpen(false);
    },
  }, !loading);

  const clearFilters = () => {
    setSearch(''); setDebouncedSearch(''); setStatusFilter(''); setVehicleFilter(''); setDriverFilter(''); setPriorityFilter(''); setEquipmentFilter(''); setClientFilter(''); setTrailerFilter(''); setTruckFilter('all');
  };

  const toggleBulk = (id: string) => {
    const s = new Set(bulkSelected);
    if (s.has(id)) s.delete(id); else s.add(id);
    setBulkSelected(s);
  };

  // ── View rendering: trip bars ──────────────────────────────────────────────
  const renderBars = (res: any, mode: 'day' | 'week' | 'timeline', resTripsIn?: any[]) => {
    const resTrips = resTripsIn || getResourceTrips(res.id);
    if (mode === 'day') {
      const day = parseDay(from);
      const start = new Date(day); start.setHours(0, 0, 0, 0);
      const end = new Date(day); end.setHours(23, 59, 59, 999);
      const dayMs = end.getTime() - start.getTime();
      const isToday = dayStr(new Date()) === from;
      const nowPct = isToday ? Math.min(100, Math.max(0, ((Date.now() - start.getTime()) / dayMs) * 100)) : -1;
      const hourLines = Array.from({ length: 24 }, (_, h) => <div key={h} className="absolute inset-y-0 border-l border-border/25 pointer-events-none" style={{ left: `${(h / 24) * 100}%` }} />);
      const nowLine = isToday ? (
        <div className="absolute inset-y-0 z-10 pointer-events-none" style={{ left: `${nowPct}%` }}>
          <div className="absolute inset-y-0 w-px bg-red-500" />
          <span className="absolute top-0 -translate-x-1/2 bg-red-500 text-white text-[8px] font-black px-1 rounded-b shadow-sm">NOW</span>
        </div>
      ) : null;
      return <>
        {hourLines}
        {nowLine}
        {resTrips.filter((tr: any) => tr.plannedDeparture && new Date(tr.plannedDeparture).getTime() >= start.getTime() && new Date(tr.plannedDeparture).getTime() <= end.getTime())
          .map((tr: any) => {
            const st = new Date(tr.plannedDeparture).getTime();
            const en = tr.plannedArrival ? new Date(tr.plannedArrival).getTime() : st + 4 * 3600000;
            const left = Math.max(0, ((st - start.getTime()) / dayMs) * 100);
            const width = Math.max(1.2, Math.min(100 - left, ((en - st) / dayMs) * 100));
            return <button key={tr.id} onClick={() => setSelectedTripId(tr.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, trip: tr }); }} title={`${tr.tripNumber} · ${tr.truck?.plateNumber || ''}`}
              className={`absolute top-1 h-8 rounded-md ${TRIP_COLORS[tr.status] || 'bg-slate-500'} text-white text-[10px] font-bold px-1.5 shadow-sm hover:brightness-110 hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden text-left whitespace-nowrap`}
              style={{ left: `${left}%`, width: `${width}%` }}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTrip(e, tr.id)}>
              <span className="drop-shadow">{tr.tripNumber} · {fmtTime(tr.plannedDeparture)}</span>
            </button>;
          })}
      </>;
    }
    if (mode === 'week') {
      const d0 = parseDay(from);
      const cells = Array.from({ length: 7 }, (_, i) => addDays(d0, i));
      return cells.map((day, i) => {
        const ds = dayStr(day);
        return <div key={ds} className={`absolute inset-y-0 border-l border-border/30 ${i === 6 ? '' : ''}`} style={{ left: `${(i / 7) * 100}%`, width: `${100 / 7}%` }}>
          {resTrips.filter((tr: any) => tr.plannedDeparture && dayStr(new Date(tr.plannedDeparture)) === ds).map((tr: any) =>
            <button key={tr.id} onClick={() => setSelectedTripId(tr.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, trip: tr }); }} title={`${tr.tripNumber}`}
              className={`mt-1 h-7 w-[calc(100%-4px)] ml-0.5 rounded-md ${TRIP_COLORS[tr.status] || 'bg-slate-500'} text-white text-[9px] font-bold px-1 shadow-sm hover:brightness-110 hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden text-left whitespace-nowrap block`}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTrip(e, tr.id)}>
              {tr.tripNumber}
            </button>)}
        </div>;
      });
    }
    // timeline (multi-day gantt)
    const d0 = parseDay(from).getTime();
    const d1 = parseDay(to).getTime();
    const span = Math.max(1, d1 - d0);
    return resTrips
      .filter((tr: any) => tr.plannedDeparture)
      .map((tr: any) => {
        const st = new Date(tr.plannedDeparture).getTime();
        const en = tr.plannedArrival ? new Date(tr.plannedArrival).getTime() : st + 4 * 3600000;
        const left = Math.max(0, ((st - d0) / span) * 100);
        const width = Math.max(1.2, Math.min(100 - left, ((en - st) / span) * 100));
        return <button key={tr.id} onClick={() => setSelectedTripId(tr.id)} onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, trip: tr }); }} title={`${tr.tripNumber} · ${fmtDate(tr.plannedDeparture)}`}
          className={`absolute top-1 h-8 rounded-md ${TRIP_COLORS[tr.status] || 'bg-slate-500'} text-white text-[10px] font-bold px-1.5 shadow-sm hover:brightness-110 hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden text-left whitespace-nowrap`}
          style={{ left: `${left}%`, width: `${width}%` }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDropOnTrip(e, tr.id)}>
          <span className="drop-shadow">{tr.tripNumber} · {fmtShort(tr.plannedDeparture)}</span>
        </button>;
      });
  };

  const renderResourceRow = (res: any, mode: 'day' | 'week' | 'timeline') => {
    if (res.kind === 'driver' || res.kind === 'trailer') {
      const rowTrips: any[] = res.trips || [];
      const dropKey = `${res.kind}:${res.id}`;
      const rowConflicts = conflicts.filter((c: any) => c.level !== 'info' && c.tripId && rowTrips.some((tr: any) => tr.id === c.tripId));
      return (
        <div className={`grid grid-cols-[150px_1fr] items-stretch border-b border-border/60 ${dragOverResourceId === dropKey ? 'bg-primary/5' : ''} ${highlightResourceId === res.id ? 'ring-2 ring-red-400 ring-inset' : ''}`}
          onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverResourceId(dropKey); }}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverResourceId(null); }}
          onDrop={(e) => handleDropOnGroupRow(e, res)}>
          <div className="px-2 py-1.5 bg-card border-r border-border/50 flex flex-col justify-center gap-0.5 min-h-[56px]">
            <div className="flex items-center gap-1.5 min-w-0">
              {res.kind === 'driver' ? <Users className="w-3.5 h-3.5 text-primary shrink-0" /> : <Container className="w-3.5 h-3.5 text-primary shrink-0" />}
              <span className="text-[11px] font-bold text-text-primary truncate">{res.name || '—'}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[9px] text-text-secondary">{rowTrips.length} {t('jsx_trips', 'curse')}</span>
              {rowConflicts.length > 0 && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-amber-100 text-amber-700 border border-amber-200">{rowConflicts.length} ⚠</span>}
            </div>
          </div>
          <div className="relative bg-card" style={{ minHeight: 56 }}>
            {renderBars(res, mode, rowTrips)}
            {dragOverResourceId === dropKey && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="bg-primary text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">{res.kind === 'driver' ? <Users className="w-4 h-4" /> : <Container className="w-4 h-4" />}{t('drop_here_label', 'Plasează aici')}</div>
            </div>}
          </div>
        </div>
      );
    }
    const stats = getResourceStats(res.id);
    const resConflicts = (conflictsByResource[res.id] || []).filter((c: any) => c.level !== 'info');
    const hasMaint = res.hasMaintenance;
    const weight = sumCargo(stats.cur?.orders || []).weight;
    const ldm = sumCargo(stats.cur?.orders || []).ldm;
    const pallets = sumCargo(stats.cur?.orders || []).pallets;
    const wPct = Math.min(100, (weight / (res.maxWeightKg || 24000)) * 100);
    const lPct = Math.min(100, (ldm / (res.maxLdm || 13.6)) * 100);
    const pPct = Math.min(100, (pallets / (res.maxPallets || 33)) * 100);
    const over = weight > (res.maxWeightKg || 24000) || ldm > (res.maxLdm || 13.6) || pallets > (res.maxPallets || 33);
    const hos = res.driver?.id ? hosSummary[res.driver.id] : null;
    return (
      <div className={`grid grid-cols-[150px_1fr] items-stretch border-b border-border/60 ${dragOverResourceId === res.id ? 'bg-primary/5' : ''} ${highlightResourceId === res.id ? 'ring-2 ring-red-400 ring-inset' : ''}`}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverResourceId(res.id); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverResourceId(null); }}
        onDrop={(e) => handleDropOnResource(e, res.id)}>
        <div className="px-2 py-1.5 bg-card border-r border-border/50 flex flex-col justify-center gap-0.5 min-h-[56px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <TruckIcon className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-bold text-text-primary truncate">{res.plateNumber}</span>
            {res.brand && <span className="text-[9px] text-text-secondary truncate">{res.brand}</span>}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {res.driver && <span className="text-[9px] text-text-secondary truncate max-w-[90px]"><Users className="w-2.5 h-2.5 inline mr-0.5" />{res.driver.name || '—'}</span>}
            {stats.busy && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-green-100 text-green-700 border border-green-200 uppercase">{t('status_badge_in_trip', 'În cursă')}</span>}
            {!stats.busy && stats.cur && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-blue-100 text-blue-700 border border-blue-200 uppercase">{t('status_badge_planned', 'Planificat')}</span>}
            {!stats.cur && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-surface text-text-muted border border-border uppercase">{t('status_badge_free', 'Liber')}</span>}
            {stats.future > 0 && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-purple-100 text-purple-700 border border-purple-200">+{stats.future}</span>}
            {hos?.over && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-red-100 text-red-700 border border-red-200" title={t('jsx_hosOver')}>{t('jsx_hos')}</span>}
            {hasMaint && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-orange-100 text-orange-700 border border-orange-200" title={t('jsx_maint', 'Mentenanță')}>🔧</span>}
            {over && <AlertTriangle className="w-3 h-3 text-red-500" />}
            {resConflicts.length > 0 && <span className="px-1 py-0.5 text-[8px] font-black rounded bg-amber-100 text-amber-700 border border-amber-200">{resConflicts.length} ⚠</span>}
          </div>
          {(stats.cur || over) && <div className="flex gap-1 mt-0.5">
            {[
              { v: wPct, cls: 'bg-primary', over: weight > (res.maxWeightKg || 24000) },
              { v: lPct, cls: 'bg-green-500', over: ldm > (res.maxLdm || 13.6) },
              { v: pPct, cls: 'bg-orange-500', over: pallets > (res.maxPallets || 33) },
            ].map((b, i) => <div key={i} className={`h-1 flex-1 rounded-full bg-surface overflow-hidden ${b.over ? 'bg-red-500' : ''}`}><div className={`h-full ${b.over ? 'bg-red-500' : b.cls}`} style={{ width: `${b.v}%` }} /></div>)}
          </div>}
        </div>
        <div className="relative bg-card" style={{ minHeight: 56 }}>
          {renderBars(res, mode)}
          {dragOverResourceId === res.id && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-primary text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg flex items-center gap-2"><TruckIcon className="w-4 h-4" />{t('drop_here_label', 'Plasează aici')}</div>
          </div>}
        </div>
      </div>
    );
  };

  const renderTimelineHeader = (mode: 'day' | 'week' | 'timeline') => {
    if (mode === 'day') {
      const day = parseDay(from);
      const dayConflicts = conflicts.filter((c: any) => {
        if (!c.tripId) return false;
        const tr = trips.find((x: any) => x.id === c.tripId);
        return !!tr?.plannedDeparture && dayStr(new Date(tr.plannedDeparture)) === dayStr(day);
      });
      const dayBlocking = dayConflicts.filter((c: any) => c.level === 'blocking').length;
      const dayWarnings = dayConflicts.filter((c: any) => c.level === 'warning').length;
      return <div className="grid grid-cols-[150px_1fr] border-b border-border bg-surface/60 sticky top-0 z-20">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-text-secondary">{t('jsx_resources', 'Resurse')}</div>
        <div className="relative">
          <div className="px-2 py-1 text-[10px] font-bold uppercase text-text-secondary flex items-center gap-2">{fmtShort(day)} {day.toLocaleDateString(locale, { weekday: 'short' })}
            {dayConflicts.length > 0 && <span title={dayConflicts.map((c: any) => c.message || c.code).join('\n')} className={`px-1.5 py-0.5 text-[9px] font-black rounded ${dayBlocking > 0 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>{dayBlocking > 0 ? `${dayBlocking} 🚫` : `${dayWarnings} ⚠`}</span>}
            {dayConflicts.length === 0 && <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-green-100 text-green-700 border border-green-200">✓</span>}
          </div>
          <div className="relative h-4 border-t border-border/40">
            {Array.from({ length: 24 }, (_, h) => <span key={h} className="absolute text-[8px] font-bold text-text-secondary/70" style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}>{h}:00</span>)}
          </div>
        </div>
      </div>;
    }
    if (mode === 'week') {
      const d0 = parseDay(from);
      const cells = Array.from({ length: 7 }, (_, i) => addDays(d0, i));
      return <div className="grid grid-cols-[150px_1fr] border-b border-border bg-surface/60 sticky top-0 z-20">
        <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-text-secondary">{t('jsx_resources', 'Resurse')}</div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => <div key={i} className={`px-1 py-1.5 text-[9px] font-bold uppercase ${i === 0 || i === 6 ? 'text-red-400' : 'text-text-secondary'}`}>{d.toLocaleDateString(locale, { weekday: 'short', day: '2-digit' })}</div>)}
        </div>
      </div>;
    }
    const d0 = parseDay(from); const d1 = parseDay(to);
    return <div className="grid grid-cols-[150px_1fr] border-b border-border bg-surface/60 sticky top-0 z-20">
      <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-text-secondary">{t('jsx_resources', 'Resurse')}</div>
      <div className="px-2 py-1.5 text-[10px] font-bold uppercase text-text-secondary">{fmtShort(d0)} → {fmtShort(d1)}</div>
    </div>;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pt-2 px-4 md:px-6 lg:px-8 pb-6 max-w-[1900px] mx-auto h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-black text-text-primary text-lg flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-primary" />{t('jsx_planningTitle', 'Planificare & Dispecerat')}</h1>

        <div className="ml-2 flex items-center gap-1 bg-surface border border-border rounded-xl p-0.5">
          <button onClick={() => setRange(1)} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'day' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}>{t('jsx_day', 'Zi')}</button>
          <button onClick={() => { setRange(7); setViewMode('week'); }} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'week' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}>{t('jsx_week', 'Săptămână')}</button>
          <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}><Clock className="w-3 h-3 inline mr-1" />{t('view_timeline', 'Cronologie')}</button>
          <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === 'map' ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-primary'}`}><MapIcon className="w-3 h-3 inline mr-1" />{t('jsx_map', 'Hartă')}</button>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Print / dispatch view */}
          <button onClick={() => { setPrintOpen(true); setLayoutMenuOpen(false); }} title={t('jsx_print', 'Tipărește / Dispecerat')} className="p-2 hover:bg-surface rounded-xl text-text-secondary hover:text-primary"><Printer className="w-4 h-4" /></button>
          {/* Excel export */}
          <button onClick={() => { setExportOpen(true); setLayoutMenuOpen(false); }} title={t('jsx_export', 'Export Excel')} className="p-2 hover:bg-surface rounded-xl text-text-secondary hover:text-primary"><Download className="w-4 h-4" /></button>
          {/* Attention center */}
          <button onClick={() => { setAttentionOpen(true); setLayoutMenuOpen(false); }} title={t('jsx_attention', 'Atenție')} className="relative p-2 hover:bg-surface rounded-xl text-text-secondary hover:text-primary">
            {attentionTotal > 0 ? <AlertTriangle className={`w-4 h-4 ${attentionCounts.blocking > 0 ? 'text-red-500' : attentionCounts.warning > 0 ? 'text-amber-500' : 'text-text-secondary'}`} /> : <ShieldCheck className="w-4 h-4" />}
            {attentionTotal > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">{attentionTotal}</span>}
          </button>
          {/* New transport */}
          <button onClick={() => navigate('/orders')} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl shadow-md shadow-primary/20"><Plus className="w-4 h-4" />{t('jsx_newTransport', '+ Transport nou')}</button>
          {/* Layout settings */}
          <div className="relative">
            <button onClick={() => setLayoutMenuOpen(!layoutMenuOpen)} title={t('jsx_layout', 'Aspect')} className="p-2 hover:bg-surface rounded-xl text-text-secondary hover:text-primary"><Settings2 className="w-4 h-4" /></button>
            {layoutMenuOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-3 text-xs">
                <p className="font-bold text-text-primary mb-2 flex items-center gap-1.5"><Settings2 className="w-3.5 h-3.5 text-primary" />{t('jsx_layout', 'Aspect')}</p>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <input type="checkbox" checked={showKpi} onChange={(e) => setShowKpi(e.target.checked)} className="accent-primary" />
                  <span className="text-text-primary">{t('jsx_showKpi', 'Afișează cardurile KPI')}</span>
                </label>
                <div className="py-1.5">
                  <div className="flex justify-between mb-1"><span className="text-text-primary">{t('jsx_poolWidth', 'Lățime panou')}</span><span className="font-bold text-text-primary">{poolCollapsed ? '—' : poolWidth}</span></div>
                  <input type="range" min={240} max={480} value={poolCollapsed ? 240 : poolWidth} onChange={(e) => { setPoolWidth(Number(e.target.value)); setPoolCollapsed(false); }} className="w-full accent-primary" />
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title={t(isFullscreen ? 'jsx_exitFullscreen' : 'jsx_fullscreen', isFullscreen ? 'Ieșire din ecran complet' : 'Ecran complet')} className="p-2 hover:bg-surface rounded-xl text-text-secondary hover:text-primary">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>

          {/* Saved views */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl px-2 py-1">
            <Save className="w-3.5 h-3.5 text-text-secondary" />
            <CustomSelect value={activeViewId} onChange={(v) => { const f = views.find((x) => x.id === v); if (f) applyView(f); }} options={views.map((v: any) => ({ value: v.id, label: v.name }))} placeholder={t('jsx_views', 'Vizualizări')} className="w-36 text-xs" />
            <button onClick={() => setSaveViewOpen(true)} title={t('jsx_saveView', 'Salvează vizualizare')} className="p-1 hover:bg-surface rounded-lg text-text-secondary hover:text-primary"><Save className="w-3.5 h-3.5" /></button>
            {activeViewId && <button onClick={() => handleDeleteView(views.find((v) => v.id === activeViewId))} title={t('jsx_delView', 'Șterge vizualizare')} className="p-1 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>

          {/* Undo */}
          <button onClick={handleUndo} disabled={actionsLoading} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" title={t('jsx_undo', 'Undo (Ctrl+Z)')}><Undo2 className="w-3.5 h-3.5" />{t('jsx_undo', 'Undo')}</button>

          {/* Optimize */}
          <button onClick={() => setOptimizeOpen(true)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1" title={t('jsx_optimizer', 'Asistent optimizare')}><Sparkles className="w-3.5 h-3.5 text-primary" />{t('jsx_optimize', 'Optimizare')}</button>
        </div>
      </div>

      {/* KPI */}
      {showKpi && data && <KpiStrip items={kpis} />}

      {/* Filters bar */}
      <div className="flex items-center gap-2 flex-wrap bg-card border border-border rounded-xl px-3 py-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input id="planning-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('search_order_placeholder', 'Caută comandă / client / locație…')} className="input text-xs py-1.5 pl-8 pr-7 w-64" />
          {search && <button onClick={() => setSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <CustomSelect value={statusFilter} onChange={setStatusFilter} options={[
          { value: '', label: t('status_all', 'Toate statusurile') },
          { value: 'draft', label: t('status_draft') }, { value: 'new', label: t('status_new', 'Nou') }, { value: 'planned', label: t('status_planned', 'Planificat') },
        ]} className="w-36 text-xs" />
        <CustomSelect value={vehicleFilter} onChange={setVehicleFilter} options={[{ value: '', label: t('jsx_allVehicles', 'Toate camioanele') }, ...resources.map((r: any) => ({ value: r.id, label: r.plateNumber }))]} className="w-36 text-xs" />
        <CustomSelect value={driverFilter} onChange={setDriverFilter} options={[{ value: '', label: t('jsx_allDrivers', 'Toți șoferii') }, ...drivers.map((d: any) => ({ value: d.id, label: d.name }))]} className="w-36 text-xs" />
        <CustomSelect value={priorityFilter} onChange={setPriorityFilter} options={[{ value: '', label: t('jsx_allPriorities', 'Prioritate') }, { value: 'critical', label: t('priority_critical') }, { value: 'high', label: t('priority_high') }, { value: 'normal', label: t('priority_normal') }]} className="w-32 text-xs" />
        <CustomSelect value={equipmentFilter} onChange={setEquipmentFilter} options={[{ value: '', label: t('jsx_allEquip', 'Echipament') }, { value: 'frigo', label: t('equip_frigo') }, { value: 'adr', label: t('equip_adr') }, { value: 'mega', label: t('equip_mega') }, { value: 'lift', label: t('equip_lift') }]} className="w-32 text-xs" />
        <CustomSelect value={clientFilter} onChange={setClientFilter} options={[{ value: '', label: t('jsx_allClients', 'Toți clienții') }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]} className="w-40 text-xs" />
        <CustomSelect value={trailerFilter} onChange={setTrailerFilter} options={[{ value: '', label: t('jsx_allTrailers', 'Toate remorcile') }, ...trailers.map((x: any) => ({ value: x.id, label: x.plateNumber || x.registrationNumber }))]} className="w-32 text-xs" />
        {(statusFilter || vehicleFilter || driverFilter || priorityFilter || equipmentFilter || clientFilter || trailerFilter || truckFilter !== 'all') && <button onClick={clearFilters} className="text-[11px] font-bold text-red-500 hover:underline flex items-center gap-1"><X className="w-3 h-3" />{t('jsx_clearFilters', 'Șterge filtrele')}</button>}
      </div>

      {/* Main layout */}
      <div className="flex gap-3 flex-1 min-h-0 items-start">
        {/* LEFT — pool (collapsible + resizable) */}
        <div className="shrink-0 flex flex-col gap-2 max-h-full overflow-hidden transition-[width] duration-150" style={{ width: poolCollapsed ? 0 : poolWidth }}>
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-bold text-text-primary text-sm flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" />{t('unassigned_orders', 'Comenzi Neasignate')}</h2>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">{orders.length}</span>
              <div className="relative">
                <button onClick={() => setPoolColsOpen(!poolColsOpen)} title={t('jsx_cols', 'Configurează coloanele')} className={`p-1 hover:bg-surface rounded text-text-secondary hover:text-primary ${poolColsOpen ? 'bg-surface text-primary' : ''}`}><Columns3 className="w-3.5 h-3.5" /></button>
                {poolColsOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 w-48 bg-card border border-border rounded-xl shadow-xl p-2 text-[11px]">
                    <p className="font-bold text-text-primary px-1 mb-1">{t('jsx_cols', 'Configurează coloanele')}</p>
                    {Object.keys(DEFAULT_POOL_COLS).map((k) => (
                      <label key={k} className="flex items-center gap-2 px-1 py-1 rounded-lg hover:bg-surface cursor-pointer">
                        <input type="checkbox" checked={!!poolCols[k]} onChange={(e) => setPoolCols({ ...poolCols, [k]: e.target.checked })} className="accent-primary" />
                        <span className="capitalize text-text-primary">{t(`pool_col_${k}`, k)}</span>
                      </label>
                    ))}
                    <div className="flex justify-between mt-1 pt-1 border-t border-border">
                      <button onClick={() => setPoolCols({ ...DEFAULT_POOL_COLS })} className="px-1.5 py-0.5 rounded hover:bg-surface text-text-secondary font-bold">{t('jsx_reset', 'Reset')}</button>
                      <button onClick={() => setPoolColsOpen(false)} className="px-1.5 py-0.5 rounded hover:bg-surface text-primary font-bold">{t('jsx_done', 'Gata')}</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => { const s = new Set<string>(); if (bulkSelected.size < orders.length) orders.forEach((o: any) => s.add(o.id)); setBulkSelected(s); }} className="p-1 hover:bg-surface rounded text-text-secondary hover:text-primary" title={t('jsx_selectAll', 'Selectează toate')}><CheckSquare className="w-3.5 h-3.5" /></button>
              <button onClick={() => setPoolCollapsed(true)} title={t('jsx_collapsePool', 'Restrânge panoul')} className="p-1 hover:bg-surface rounded text-text-secondary hover:text-primary"><ChevronsLeft className="w-3.5 h-3.5" /></button>
              <CustomSelect value={poolGroupBy} onChange={(v) => setPoolGroupBy(v as any)} options={[{ value: 'none', label: t('jsx_noGroup', 'Fără grupare') }, { value: 'day', label: t('jsx_groupDay', 'Pe zi') }, { value: 'client', label: t('jsx_groupClient', 'Pe client') }, { value: 'priority', label: t('jsx_groupPriority', 'Pe prioritate') }]} className="w-32 text-xs" />
              <CustomSelect value={poolSortBy} onChange={(v) => setPoolSortBy(v as any)} options={[
                { value: 'priority', label: t('jsx_sortPriority', 'Prioritate') },
                { value: 'date', label: t('jsx_sortDate', 'Dată') },
                { value: 'weight', label: t('jsx_sortWeight', 'Greutate') },
                { value: 'pallets', label: t('jsx_sortPallets', 'Paleți') },
                { value: 'price', label: t('jsx_sortPrice', 'Preț') },
                { value: 'client', label: t('jsx_sortClient', 'Client') },
              ]} className="w-28 text-xs" />
            </div>
          </div>

          {/* Bulk bar */}
          {bulkSelected.size > 0 && <div className="bg-primary/10 border border-primary/30 rounded-xl px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-bold text-primary">{bulkSelected.size} {t('jsx_selected', 'selectate')}</span>
            <div className="flex gap-1.5">
              <button onClick={() => { setAssignOrder({ id: '__bulk__' } as any); }} className="btn-primary text-[10px] py-1 px-2.5">{t('jsx_assignBtn', 'Asignează')}</button>
              <button onClick={() => handleUnplan(Array.from(bulkSelected))} className="btn-secondary text-[10px] py-1 px-2.5">{t('jsx_unplan', 'Deplanifică')}</button>
              <button onClick={() => setBulkSelected(new Set())} className="p-1 text-text-secondary hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>}

          {/* Pool list */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
            {orders.length === 0 && !loading && <div className="bg-card border border-border rounded-2xl py-10 flex flex-col items-center text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mb-2 opacity-60" />
              <p className="text-sm font-semibold text-text-primary">{t("allOrdersPlanned", 'Toate comenzile sunt planificate!')}</p>
            </div>}
            {groupedPool.map((g) => (
              <div key={g.key}>
                {g.label && <div className="text-[10px] font-bold uppercase text-text-secondary px-1 mb-1">{g.label}</div>}
                <div className="space-y-2">
                  {g.items.map((o: any) => {
                    const isBulk = bulkSelected.has(o.id);
                    return <div key={o.id} onDragStart={(e) => handleOrderDragStart(e, o.id)} onDragEnd={() => setDraggingOrderId(null)}>
                      <PoolOrderCard
                        order={o}
                        dragging={draggingOrderId === o.id}
                        selected={isBulk}
                        cols={poolCols}
                        onToggle={(id: string) => toggleBulk(id)}
                        onDetail={(ord: any) => setSelectedOrderDetail(ord)}
                      />
                      {(conflictsByOrder[o.id] || []).filter((c: any) => c.level !== 'info').length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 px-1">
                          {(conflictsByOrder[o.id] || []).filter((c: any) => c.level !== 'info').map((c: any) => <span key={c.id} className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${CONFLICT_LEVELS[c.level] || 'bg-slate-500 text-white'}`}>{c.code}</span>)}
                        </div>
                      )}
                    </div>;
                  })}
                </div>
              </div>
            ))}
            <p className="text-center text-[10px] text-text-muted py-1">{t('drag_hint', '☰ Trage comanda pe un camion sau pe o cursă')}</p>
          </div>
        </div>

        {/* Divider / expand gutter */}
        {poolCollapsed ? (
          <button onClick={() => setPoolCollapsed(false)} title={t('jsx_expandPool', 'Extinde panoul')} className="shrink-0 self-stretch w-6 flex items-center justify-center rounded-lg text-text-secondary hover:text-primary hover:bg-surface">
            <ChevronsRight className="w-4 h-4" />
          </button>
        ) : (
          <div
            onMouseDown={startDividerDrag}
            title=""
            className={`shrink-0 self-stretch w-[3px] rounded-full cursor-col-resize transition-colors ${draggingDivider ? 'bg-primary' : 'bg-border/70 hover:bg-primary/50'}`}
          />
        )}

        {/* CENTER — board */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-surface border border-border rounded-xl px-1.5 py-1">
              <button onClick={() => shiftRange(-1)} className="p-1.5 hover:bg-card rounded-lg text-text-secondary hover:text-primary"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => { const d = new Date(); setFrom(dayStr(d)); setTo(dayStr(d)); }} className="px-2 py-1 text-xs font-bold text-text-secondary hover:text-primary rounded-lg hover:bg-card">{t('jsx_today', 'Azi')}</button>
              <button onClick={() => shiftRange(1)} className="p-1.5 hover:bg-card rounded-lg text-text-secondary hover:text-primary"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="relative">
              <button onClick={() => setDateMenuOpen(!dateMenuOpen)} className="flex items-center gap-1.5 text-xs font-bold text-text-primary px-2 py-1.5 rounded-xl bg-surface border border-border hover:bg-card">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{fmtShort(from)}</span>
                {from !== to && <><ArrowRight className="w-3 h-3 text-text-secondary" /><span>{fmtShort(to)}</span></>}
                <ChevronRight className={`w-3 h-3 text-text-secondary transition-transform ${dateMenuOpen ? 'rotate-90' : ''}`} />
              </button>
              {dateMenuOpen && (
                <div className="absolute left-0 top-full mt-1 z-50 w-64 bg-card border border-border rounded-xl shadow-xl p-3 text-xs">
                  {([['today', t('jsx_dateToday', 'Azi')], ['tomorrow', t('jsx_dateTomorrow', 'Mâine')], ['thisWeek', t('jsx_dateThisWeek', 'Săptămâna aceasta')], ['nextWeek', t('jsx_dateNextWeek', 'Săptămâna viitoare')]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => applyDatePreset(k)} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-surface font-bold text-text-primary">{label}</button>
                  ))}
                  <div className="border-t border-border my-1.5" />
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-secondary">{t('jsx_dateFrom', 'De la')}</span>
                      <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); if (parseDay(e.target.value) > parseDay(to)) setTo(e.target.value); }} className="input text-xs py-1 px-2" />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-text-secondary">{t('jsx_dateTo', 'Până la')}</span>
                      <input type="date" value={to} onChange={(e) => { setTo(e.target.value); if (parseDay(e.target.value) < parseDay(from)) setFrom(e.target.value); }} className="input text-xs py-1 px-2" />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-[10px] text-text-secondary">
              <CustomSelect value={boardGroup} onChange={(v) => { setBoardGroup(v as any); setTruckFilter('all'); }} options={[
                { value: 'vehicle', label: t('jsx_groupVehicle', 'După camion') },
                { value: 'driver', label: t('jsx_groupDriver', 'După șofer') },
                { value: 'trailer', label: t('jsx_groupTrailer', 'După remorcă') },
              ]} className="w-32 text-xs" />
              <span className="hidden lg:inline">{t('jsx_hotkeys', 'Scurtături: 1-4 vederi · F/U/O · Ctrl+Z')}</span>
            </div>
          </div>

          {!loading && orders.length > 0 && freeCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-100/70 border border-amber-200 rounded-xl px-3 py-2 text-xs shadow-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-amber-800 font-black">{t('jsx_unplannedBanner', 'Comenzi neplanificate')}: {orders.length}</span>
              <span className="text-amber-700 text-[11px] hidden md:inline">{t('jsx_unplannedHint', 'Există resurse disponibile în interval.')}</span>
              <div className="ml-auto flex gap-1.5">
                <button onClick={() => { setPoolCollapsed(false); setPoolGroupBy('priority'); }} className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 rounded-lg">{t('jsx_showPool', 'Vezi panou')}</button>
                <button onClick={() => setOptimizeOpen(true)} className="btn-primary px-2.5 py-1 text-[11px]">{t('jsx_optimize', 'Optimizează')}</button>
              </div>
            </div>
          )}

          {loading ? <div className="flex-1 flex justify-center items-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : viewMode === 'map' ? (
            <div className="flex-1 min-h-[500px]"><PlanningMap mapData={mapData} /></div>
          ) : (
            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card shadow-sm">
              {renderTimelineHeader(viewMode === 'week' ? 'week' : viewMode)}
              <div>
                {boardRows.length === 0 ? (
                  <div className="p-12 text-center text-sm text-text-secondary flex flex-col items-center gap-2">
                    <TruckIcon className="w-10 h-10 text-text-muted opacity-40" />
                    {t("jsx_niciunCamionA", 'Niciun camion în această categorie.')}
                  </div>
                ) : boardRows.map((r: any) => <div key={r.id || `${r.kind}:${r.id}`}>{renderResourceRow(r, viewMode as any)}</div>)}
              </div>
              <div className="px-3 py-2 flex items-center justify-between text-[10px] text-text-secondary border-t border-border">
                <span>{t('jsx_resources', 'Resurse')}: {boardGroup === 'vehicle' ? `${visibleResources.length}/${resources.length}` : `${boardRows.length} ${boardGroup}`}</span>
                <span>{t('jsx_tripsInRange', 'Curse în interval')}: {trips.filter((tr: any) => tr.plannedDeparture && new Date(tr.plannedDeparture) >= parseDay(from) && new Date(tr.plannedDeparture) <= new Date(parseDay(to).getTime() + 86400000)).length}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — side panel */}
        {selectedTrip && <TripSidePanel
          trip={selectedTrip}
          conflicts={conflicts}
          onClose={() => setSelectedTripId(null)}
          onOpenTrip={(id: string) => navigate(`/trips/${id}`)}
          onAction={(action: string, tripId: string) => {
            if (action === 'confirm') handleConfirm(tripId);
            else if (action === 'send') handleSend(tripId);
            else if (action === 'split') setSplitModal({ open: true, tripId, orderIds: [] });
            else if (action === 'unplan-all') handleUnplan((selectedTrip.orders || []).map((o: any) => o.id));
          }}
          onStatus={(tripId: string, to: string) => { if (to) handleStatus(tripId, to); }}
          actionsLoading={actionsLoading}
        />}
      </div>

      {/* Modals */}
      {selectedOrderDetail && <OrderDetailDrawer
        order={selectedOrderDetail}
        onClose={() => setSelectedOrderDetail(null)}
        onPlan={(ord: any) => { setSelectedOrderDetail(null); setAssignOrder(ord); }}
        onDelete={(id: string) => setDeleteModal({ open: true, orderId: id })}
      />}

      {assignOrder && <SmartAssignModal
        order={{ ...assignOrder, id: '__bulk__' in assignOrder && assignOrder.id === '__bulk__' ? undefined : assignOrder.id }}
        resources={resources}
        trips={trips}
        onClose={() => setAssignOrder(null)}
        onAssign={async (opts: any) => {
          const ids = assignOrder.id === '__bulk__' ? Array.from(bulkSelected) : [assignOrder.id];
          setAssignOrder(null);
          if (!ids.length) return;
          await handleAssign(ids, opts);
          setBulkSelected(new Set());
        }}
      />}

      <OptimizeModal
        open={optimizeOpen}
        onClose={() => { setOptimizeOpen(false); setOptimizeResult(null); }}
        onRun={handleOptimize}
        onApply={handleApplyOptimization}
        result={optimizeResult}
        running={optimizeRunning}
      />

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, orderId: null })}
        onConfirm={handleDeleteOrder}
        title={t('jsx_deleteOrder', 'Șterge comanda')}
        message={t('jsx_deleteConfirm', 'Ești sigur că vrei să ștergi această comandă? Acțiunea este ireversibilă.')}
        type="danger"
      />

      {splitModal.open && splitModal.tripId && (() => {
        const tr = trips.find((x: any) => x.id === splitModal.tripId);
        if (!tr) return null;
        return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="relative w-full max-w-md bg-card shadow-2xl rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-surface/50 flex justify-between items-center">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2"><SplitSquareHorizontal className="w-4 h-4 text-primary" />{t('jsx_split', 'Split')} · {tr.tripNumber}</h2>
              <button onClick={() => setSplitModal({ open: false, tripId: null, orderIds: [] })} className="p-1 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 max-h-72 overflow-y-auto space-y-1.5">
              <p className="text-xs text-text-secondary mb-2">{t('jsx_splitHint', 'Selectează comenzile care să treacă în noua cursă:')}</p>
              {(tr.orders || []).map((o: any) => {
                const checked = splitModal.orderIds.includes(o.id);
                return <label key={o.id} className="flex items-center gap-2 text-xs bg-surface/50 rounded-lg px-2.5 py-2 cursor-pointer hover:bg-surface">
                  <button onClick={() => { const s = checked ? splitModal.orderIds.filter((x: any) => x !== o.id) : [...splitModal.orderIds, o.id]; setSplitModal({ ...splitModal, orderIds: s }); }} className="text-primary">{checked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-text-secondary" />}</button>
                  <span className="font-bold text-text-primary">{o.orderNumber || '—'}</span>
                  <span className="text-text-secondary ml-auto">{o.client?.name || ''}</span>
                </label>;
              })}
            </div>
            <div className="px-5 py-3 border-t border-border bg-surface/50 flex justify-end gap-2">
              <button onClick={() => setSplitModal({ open: false, tripId: null, orderIds: [] })} className="btn-secondary text-xs py-2 px-4">{t('jsx_cancel', 'Anulează')}</button>
              <button disabled={splitModal.orderIds.length === 0} onClick={() => { handleSplit(splitModal.tripId!, splitModal.orderIds); setSplitModal({ open: false, tripId: null, orderIds: [] }); }} className="btn-primary text-xs py-2 px-5">{t('jsx_split', 'Split')}</button>
            </div>
          </div>
        </div>, document.body);
      })()}

      {saveViewOpen && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <div className="relative w-full max-w-sm bg-card shadow-2xl rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-surface/50 flex justify-between items-center">
            <h2 className="text-base font-bold text-text-primary">{t('jsx_saveView', 'Salvează vizualizare')}</h2>
            <button onClick={() => setSaveViewOpen(false)} className="p-1 hover:bg-surface rounded-lg text-text-secondary hover:text-red-500"><X className="w-4 h-4" /></button>
          </div>
          <div className="p-5">
            <input value={newViewName} onChange={(e) => setNewViewName(e.target.value)} placeholder={t('jsx_viewName', 'Numele vizualizării')} className="input w-full text-sm" autoFocus />
          </div>
          <div className="px-5 py-3 border-t border-border bg-surface/50 flex justify-end gap-2">
            <button onClick={() => setSaveViewOpen(false)} className="btn-secondary text-xs py-2 px-4">{t('jsx_cancel', 'Anulează')}</button>
            <button disabled={!newViewName.trim()} onClick={handleSaveView} className="btn-primary text-xs py-2 px-5">{t('jsx_save', 'Salvează')}</button>
          </div>
        </div>
      </div>, document.body)}

      {/* Trip context menu */}
      {contextMenu && createPortal(
        <div className="fixed z-[9999] min-w-[210px] bg-card border border-border rounded-xl shadow-2xl py-1.5 text-xs"
          style={{ left: Math.min(contextMenu.x, window.innerWidth - 230), top: Math.min(contextMenu.y, window.innerHeight - 330) }}>
          <div className="px-3 py-1.5 font-bold text-text-primary border-b border-border truncate">{contextMenu.trip.tripNumber}</div>
          <button onClick={() => { navigate(`/trips/${contextMenu.trip.id}`); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-text-primary"><ExternalLink className="w-3.5 h-3.5" />{t('jsx_context_openTrip', 'Deschide cursa')}</button>
          <button disabled={contextMenu.trip.status === 'planned'} onClick={() => { handleConfirm(contextMenu.trip.id); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-text-primary disabled:opacity-40"><ShieldCheck className="w-3.5 h-3.5" />{t('jsx_context_confirm', 'Confirmă')}</button>
          <button onClick={() => { handleSend(contextMenu.trip.id); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-text-primary"><Send className="w-3.5 h-3.5" />{t('jsx_context_send', 'Trimite la șofer')}</button>
          <button onClick={() => { setSplitModal({ open: true, tripId: contextMenu.trip.id, orderIds: [] }); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-text-primary"><SplitSquareHorizontal className="w-3.5 h-3.5" />{t('jsx_context_split', 'Split')}</button>
          <button onClick={() => { handleUnplan((contextMenu.trip.orders || []).map((o: any) => o.id)); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-error"><Undo2 className="w-3.5 h-3.5" />{t('jsx_context_unplan', 'Deplanifică')}</button>
          <div className="border-t border-border my-1" />
          <div className="px-3 py-1 text-text-secondary font-bold uppercase text-[9px] tracking-wider">{t('jsx_context_status', 'Schimbă statusul')}</div>
          {(TRIP_TRANSITIONS[contextMenu.trip.status] || []).map((to: string) => (
            <button key={to} onClick={() => { handleStatus(contextMenu.trip.id, to); setContextMenu(null); }} className="w-full text-left px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-text-primary"><Activity className="w-3.5 h-3.5" />{t(`status_${to}`, to.replace(/_/g, ' '))}</button>
          ))}
        </div>, document.body)}

      {/* Print / dispatch view */}
      {exportOpen && <ExportModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        data={exportRows}
        filename={`planning_dispatch_${from}_${to}`}
        title={t('jsx_planningTitle', 'Planificare & Dispecerat')}
        sheetName="Planning"
        getDateField={(item: any) => item.departure || null}
        headers={[
          { key: 'trip', label: t('export_col_trip', 'Cursă') },
          { key: 'truck', label: t('export_col_truck', 'Camion') },
          { key: 'driver', label: t('export_col_driver', 'Șofer') },
          { key: 'trailer', label: t('export_col_trailer', 'Remorcă') },
          { key: 'client', label: t('export_col_client', 'Client') },
          { key: 'orders', label: t('export_col_orders', 'Comenzi') },
          { key: 'pickup', label: t('export_col_pickup', 'Preluare') },
          { key: 'dropoff', label: t('export_col_dropoff', 'Predare') },
          { key: 'departure', label: t('export_col_departure', 'Plecare'), transform: (v: any) => v ? new Date(v).toLocaleString(locale) : '—' },
          { key: 'arrival', label: t('export_col_arrival', 'Sosire'), transform: (v: any) => v ? new Date(v).toLocaleString(locale) : '—' },
          { key: 'weight', label: `${t('export_col_weight', 'Greutate')} (kg)` },
          { key: 'distance', label: t('export_col_distance', 'Distanță (km)') },
          { key: 'revenue', label: `${t('export_col_revenue', 'Venit')} (€)` },
          { key: 'cost', label: `${t('export_col_cost', 'Cost')} (€)` },
          { key: 'status', label: t('export_col_status', 'Status') },
        ]}
      />}

      {/* Attention center */}
      {attentionOpen && (
        <div className="fixed inset-0 z-[999]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAttentionOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-[min(400px,90vw)] bg-card border-l border-border shadow-2xl flex flex-col">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h2 className="text-sm font-bold text-text-primary flex items-center gap-2"><AlertTriangle className={`w-4 h-4 ${attentionCounts.blocking > 0 ? 'text-red-500' : 'text-amber-500'}`} />{t('jsx_attention', 'Atenție')}</h2>
              <button onClick={() => setAttentionOpen(false)} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-4 py-2 border-b border-border flex gap-1.5 flex-wrap">
              {([['all', t('jsx_attentionAll', 'Toate')], ['blocking', t('jsx_attentionBlocking', 'Blocante')], ['warning', t('jsx_attentionWarning', 'Avertismente')], ['info', t('jsx_attentionInfo', 'Info')]] as [any, string][]).map(([lv, lb]) => (
                <button key={lv} onClick={() => setAttentionTab(lv)} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${attentionTab === lv ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-primary'}`}>
                  {lb}{lv !== 'all' ? ` (${attentionCounts[lv as 'blocking'] ?? 0})` : ''}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {conflicts.length === 0 && <p className="text-xs text-text-muted text-center py-10 flex flex-col items-center gap-2"><ShieldCheck className="w-8 h-8" />{t('jsx_attentionClear', 'Niciun conflict. Totul este în regulă.')}</p>}
              {(attentionTab === 'all' ? conflicts : conflicts.filter((c: any) => c.level === attentionTab)).map((c: any) => {
                const res = resources.find((r: any) => r.id === c.resourceId);
                const lvl = c.level as 'blocking' | 'warning' | 'info';
                return (
                  <button key={c.tripId + c.code + c.resourceId + c.orderId} onClick={() => focusConflict(c)} className={`w-full text-left p-2.5 rounded-xl border transition-all ${lvl === 'blocking' ? 'border-red-200 bg-red-50 hover:bg-red-100' : lvl === 'warning' ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'}`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-text-secondary">
                        {lvl === 'blocking' ? <X className="w-3 h-3 text-red-500" /> : lvl === 'warning' ? <AlertTriangle className="w-3 h-3 text-amber-500" /> : <Info className="w-3 h-3 text-blue-500" />}
                        {c.code}
                      </span>
                      {res && <span className="text-[9px] font-bold text-text-muted">{res.plateNumber}</span>}
                    </div>
                    <p className="text-xs font-semibold text-text-primary">{c.message}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {printOpen && createPortal(
        <div className="print-overlay fixed inset-0 z-[9999] flex items-start justify-center p-4 overflow-y-auto" style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div className="print-panel w-full max-w-4xl bg-white text-black rounded-2xl shadow-2xl overflow-hidden">
            <div className="print-toolbar px-5 py-3 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Printer className="w-4 h-4 text-primary" />{t('jsx_printDispatch', 'Dispecerat')}</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="btn-primary text-xs py-2 px-4">{t('jsx_printBtn', 'Tipărește')}</button>
                <button onClick={() => setPrintOpen(false)} className="btn-secondary text-xs py-2 px-4">{t('jsx_close', 'Închide')}</button>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-end justify-between border-b-2 border-gray-800 pb-3 mb-4">
                <div>
                  <h1 className="text-xl font-black text-gray-900 uppercase">{t('jsx_printDispatch', 'Dispecerat')}</h1>
                  <p className="text-xs text-gray-500">{new Date().toLocaleString(locale)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{fmtShort(from)}{from !== to && <> → {fmtShort(to)}</>}</p>
                  <p className="text-xs text-gray-500">{trips.length} {t('jsx_trips', 'curse')} · {resources.length} {t('jsx_resources', 'resurse')}</p>
                </div>
              </div>
              {trips.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-10">{t('jsx_noTrips', 'Nicio cursă în interval.')}</p>
              ) : (
                <div className="space-y-5">
                  {trips.map((tr: any) => {
                    const w = sumCargo(tr.orders || []).weight;
                    return (
                      <div key={tr.id} className="border border-gray-300 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="px-3 py-2 bg-gray-100 flex items-center justify-between">
                          <span className="text-sm font-black text-gray-900">{tr.truck?.plateNumber || tr.truck?.registrationNumber || '—'}</span>
                          <span className="text-xs font-bold text-gray-700">{tr.driver?.name || '—'}</span>
                          <span className="text-xs font-bold text-gray-700">{tr.tripNumber}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${tr.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : tr.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{t(`status_${tr.status}`, String(tr.status).replace(/_/g, ' '))}</span>
                        </div>
                        <table className="w-full text-xs">
                          <tbody>
                            {(tr.orders || []).map((o: any) => {
                              const op = o.stops?.find((s: any) => s.type === 'pickup');
                              const od = o.stops?.find((s: any) => s.type === 'dropoff');
                              const ow = sumCargo([o]).weight;
                              return (
                                <tr key={o.id} className="border-t border-gray-200">
                                  <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">{o.orderNumber || '—'}</td>
                                  <td className="px-3 py-2 text-gray-700">{o.client?.name || '—'}</td>
                                  <td className="px-3 py-2 text-gray-700">{op?.city || op?.address?.split(',')[0] || '—'}<span className="text-gray-400"> {op?.timeFrom ? `${fmtShort(op.dateFrom)} ${op.timeFrom}` : ''}</span></td>
                                  <td className="px-3 py-2 text-gray-400">→</td>
                                  <td className="px-3 py-2 text-gray-700">{od?.city || od?.address?.split(',')[0] || '—'}<span className="text-gray-400"> {od?.timeTo ? `${fmtShort(od.dateTo)} ${od.timeTo}` : ''}</span></td>
                                  <td className="px-3 py-2 text-gray-700 text-right whitespace-nowrap">{ow > 0 ? `${ow.toLocaleString()} kg` : '—'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>, document.body)}
    </div>
  );
}
