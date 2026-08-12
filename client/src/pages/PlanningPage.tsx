import {
  useEffect, useRef, useState, useCallback, useMemo
} from 'react';
import { createPortal } from 'react-dom';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, ExternalLink,
  Users, X, ChevronRight, ChevronLeft, Calendar, ArrowRight, Info, Activity, Search,
  Undo2, SplitSquareHorizontal, Send, ShieldCheck,
  LayoutGrid, Clock, Map as MapIcon, Sparkles, CheckSquare, Square, RefreshCw,
  ChevronsLeft, ChevronsRight, Plus, ArrowUp, ArrowDown, Layers, Navigation,
  Printer, Maximize2, Minimize2, RotateCcw, Filter,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../lib/api';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { useShortcuts } from '../hooks/useShortcuts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';

// ─── Helpers ────────────────────────────────────────────────────────────────
const dayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const parseDay = (s: string) => {
  const [y, m, d] = (s || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
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
  let weight = 0, ldm = 0, pallets = 0, volume = 0, hasLdm = false;
  for (const o of orders || []) {
    for (const c of o?.cargoItems || []) {
      weight += Number(c.weightKg) || 0;
      if (c.ldm != null && Number(c.ldm) > 0) { ldm += Number(c.ldm); hasLdm = true; }
      volume += Number(c.volumeCbm) || 0;
      if (String(c.unit || 'pallet').toLowerCase() === 'pallet') pallets += Number(c.quantity) || 0;
    }
  }
  return { weight, ldm, hasLdm, pallets, volume, ldmFormatted: hasLdm ? ldm.toFixed(1) : '—' };
}

function tripOriginDestination(trip: any) {
  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const first = stops[0];
  const last = stops[stops.length - 1];
  const origin = first?.city || first?.address?.split(',')[0] || (trip.orders?.[0]?.stops?.find((s: any) => s.type === 'pickup')?.city) || '—';
  const dest = last?.city || last?.address?.split(',')[0] || (trip.orders?.[0]?.stops?.filter((s: any) => s.type === 'delivery').pop()?.city) || '—';
  return { origin, dest };
}

const TRIP_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  planning:           { bg: 'bg-amber-500/20',  border: 'border-amber-500',  text: 'text-amber-700 dark:text-amber-400' },
  planned:            { bg: 'bg-blue-500/20',    border: 'border-blue-500',   text: 'text-blue-700 dark:text-blue-400' },
  assigned:           { bg: 'bg-violet-500/20',  border: 'border-violet-500', text: 'text-violet-700 dark:text-violet-400' },
  dispatched:         { bg: 'bg-pink-500/20',    border: 'border-pink-500',   text: 'text-pink-700 dark:text-pink-400' },
  driver_accepted:    { bg: 'bg-teal-500/20',    border: 'border-teal-500',   text: 'text-teal-700 dark:text-teal-400' },
  started:            { bg: 'bg-orange-500/20',  border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  loading:            { bg: 'bg-red-500/20',     border: 'border-red-500',    text: 'text-red-700 dark:text-red-400' },
  driving:            { bg: 'bg-amber-500/30',   border: 'border-amber-600',  text: 'text-amber-800 dark:text-amber-300' },
  partially_delivered:{ bg: 'bg-yellow-500/20',  border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-400' },
  completed:          { bg: 'bg-green-500/20',   border: 'border-green-500',  text: 'text-green-700 dark:text-green-400' },
  closed:             { bg: 'bg-slate-500/20',   border: 'border-slate-500',  text: 'text-slate-600' },
  cancelled:          { bg: 'bg-slate-400/20',   border: 'border-slate-400',  text: 'text-slate-500' },
};
const TRIP_HEX: Record<string, string> = {
  planning:'#f59e0b', planned:'#3b82f6', assigned:'#8b5cf6', dispatched:'#ec4899',
  driver_accepted:'#14b8a6', started:'#f97316', loading:'#ef4444', driving:'#f59e0b',
  partially_delivered:'#eab308', completed:'#22c55e', closed:'#64748b', cancelled:'#94a3b8',
};

// Timeline slot calculation helpers
function toMinutes(dateStr: any, baseDateStr: string): number {
  if (!dateStr) return -1;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return -1;
  const base = new Date(baseDateStr + 'T00:00:00');
  return (d.getTime() - base.getTime()) / 60000;
}

function tripTimePosition(trip: any, from: string, totalMinutes: number) {
  const dep = toMinutes(trip.plannedDeparture, from);
  const arr = toMinutes(trip.plannedArrival, from);
  if (dep < 0 && arr < 0) return null;
  const depClamped = Math.max(0, dep < 0 ? 0 : dep);
  const arrClamped = Math.min(totalMinutes, arr < 0 ? totalMinutes : arr);
  const width = Math.max(arrClamped - depClamped, 30); // minimum 30 min wide
  return {
    left: (depClamped / totalMinutes) * 100,
    width: (width / totalMinutes) * 100,
  };
}

// ─── Map Component ──────────────────────────────────────────────────────────
function PlanningMap({
  mapData, selectedTripId, onSelectTrip, isLoading,
}: {
  mapData: any; selectedTripId: string | null; onSelectTrip: (id: string) => void; isLoading: boolean;
}) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [5.29, 52.13], zoom: 6, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.on('load', () => setMapReady(true));
    mapInstance.current = map;
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const fitAll = useCallback(() => {
    const map = mapInstance.current;
    if (!map) return;
    const bounds = new maplibregl.LngLatBounds();
    let has = false;
    (mapData?.stops || []).forEach((s: any) => { if (s.lat && s.lng) { bounds.extend([s.lng, s.lat]); has = true; } });
    (mapData?.vehicles || []).forEach((v: any) => { if (v.lat && v.lng) { bounds.extend([v.lng, v.lat]); has = true; } });
    if (has) { try { map.fitBounds(bounds, { padding: 60, maxZoom: 13 }); } catch {} }
  }, [mapData]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach(m => { try { m.remove(); } catch {} });
    markersRef.current = [];
    try { if (map.getLayer('routes')) map.removeLayer('routes'); if (map.getSource('routes')) map.removeSource('routes'); } catch {}

    if (showRoutes && mapData?.routes?.length) {
      const features = mapData.routes.filter((r: any) => r.points?.length >= 2).map((r: any) => ({
        type: 'Feature',
        properties: { tripId: r.tripId, color: TRIP_HEX[r.status] || '#3b82f6', selected: r.tripId === selectedTripId },
        geometry: { type: 'LineString', coordinates: r.points.map((p: number[]) => [p[1], p[0]]) },
      }));
      if (features.length) {
        map.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features } });
        map.addLayer({ id: 'routes', type: 'line', source: 'routes',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': ['get', 'color'], 'line-width': ['case', ['get', 'selected'], 6, 3], 'line-opacity': 0.8 },
        });
        map.on('click', 'routes', (e: any) => { if (e.features?.[0]?.properties?.tripId) onSelectTrip(e.features[0].properties.tripId); });
      }
    }

    if (showStops && mapData?.stops?.length) {
      for (const s of mapData.stops) {
        if (!s.lat || !s.lng) continue;
        const el = document.createElement('div');
        el.className = `w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow cursor-pointer ${s.type === 'pickup' ? 'bg-blue-600' : 'bg-emerald-600'}`;
        el.textContent = String(s.sequence || '·');
        const marker = new maplibregl.Marker({ element: el }).setLngLat([s.lng, s.lat]).addTo(map);
        if (s.tripId) el.addEventListener('click', () => onSelectTrip(s.tripId));
        markersRef.current.push(marker);
      }
    }

    if (showVehicles && mapData?.vehicles?.length) {
      for (const v of mapData.vehicles) {
        if (!v.lat || !v.lng) continue;
        const el = document.createElement('div');
        el.className = 'flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-bold border-2 border-white shadow-md cursor-pointer';
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>${v.plateNumber || '?'}`;
        const marker = new maplibregl.Marker({ element: el }).setLngLat([v.lng, v.lat]).addTo(map);
        if (v.tripId) el.addEventListener('click', () => onSelectTrip(v.tripId));
        markersRef.current.push(marker);
      }
    }

    if (selectedTripId) {
      const r = mapData?.routes?.find((x: any) => x.tripId === selectedTripId);
      if (r?.points?.length) {
        const b = new maplibregl.LngLatBounds();
        r.points.forEach((p: number[]) => b.extend([p[1], p[0]]));
        try { map.fitBounds(b, { padding: 80, maxZoom: 12 }); } catch {}
      }
    } else fitAll();
  }, [mapReady, mapData, showRoutes, showVehicles, showStops, selectedTripId, onSelectTrip, fitAll]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur p-2 rounded-xl border border-border shadow-lg text-xs space-y-1.5">
        <div className="text-[10px] font-bold text-text-secondary uppercase px-1 flex items-center gap-1.5 border-b border-border pb-1"><Layers className="w-3 h-3 text-primary" /> {t('layer_routes','Layers')}</div>
        {([['showRoutes',showRoutes,setShowRoutes,t('layer_routes','Routes')],['showStops',showStops,setShowStops,t('layer_stops','Stops')],['showVehicles',showVehicles,setShowVehicles,t('layer_vehicles','Vehicles')]] as [string,boolean,(v:boolean)=>void,string][]).map(([k,v,sv,label]) => (
          <label key={k} className="flex items-center gap-2 px-1 cursor-pointer select-none text-text-secondary hover:text-text-primary">
            <input type="checkbox" checked={v} onChange={e => sv(e.target.checked)} className="rounded w-3.5 h-3.5 text-primary" />
            <span>{label}</span>
          </label>
        ))}
        <button onClick={fitAll} className="w-full mt-1 py-1 px-2 rounded-lg bg-surface border border-border text-text-primary font-semibold flex items-center justify-center gap-1.5 text-[10px] hover:bg-surface-hover transition-colors">
          <Navigation className="w-3 h-3 text-primary" />{t('map_fit_all','Fit all')}
        </button>
      </div>
      {isLoading && (
        <div className="absolute top-3 right-16 z-10 flex items-center gap-2 bg-card/90 px-3 py-1.5 rounded-full border border-border shadow text-xs">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="font-bold text-text-secondary">{t('map_loading','Loading…')}</span>
        </div>
      )}
    </div>
  );
}

// ─── Capacity Bar ────────────────────────────────────────────────────────────
function CapBar({ label, value, max, unit = '' }: { label: string; value: number; max: number; unit?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const color = pct > 100 ? 'bg-red-500' : pct > 80 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between text-[9px] font-bold text-text-secondary mb-0.5">
        <span>{label}</span>
        <span className={pct > 100 ? 'text-red-500' : 'text-text-primary'}>{value > 0 ? `${value.toLocaleString()}` : '—'}{unit && value > 0 ? unit : ''}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-border/50 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Order Pool Card ─────────────────────────────────────────────────────────
function PoolOrderCard({
  order, selected, onToggle, onDetail, draggingId, setDraggingId,
}: {
  order: any; selected?: boolean; onToggle?: (id: string, sel: boolean) => void;
  onDetail?: (order: any) => void; draggingId: string | null; setDraggingId: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const pickup = (order.stops || []).find((s: any) => s.type === 'pickup') || order.stops?.[0];
  const dropoff = (order.stops || []).filter((s: any) => s.type === 'delivery' || s.type === 'dropoff').pop() || order.stops?.[order.stops?.length - 1];
  const cargo = sumCargo([order]);
  const isUrgent = pickup?.dateFrom && new Date(pickup.dateFrom).getTime() - Date.now() < 86400000 * 2;
  const isDragging = draggingId === order.id;

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('orderId', order.id); e.dataTransfer.effectAllowed = 'move'; setDraggingId(order.id); }}
      onDragEnd={() => setDraggingId(null)}
      onClick={() => onDetail?.(order)}
      className={`group rounded-2xl p-3 cursor-grab active:cursor-grabbing transition-all select-none border ${
        isDragging ? 'opacity-40 scale-95 border-primary shadow-lg bg-primary/5'
        : selected ? 'border-primary ring-1 ring-primary/30 shadow bg-card'
        : 'border-border hover:border-primary/50 hover:shadow bg-card'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={e => { e.stopPropagation(); onToggle?.(order.id, !selected); }}
            className="text-text-secondary hover:text-primary shrink-0">
            {selected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <span className="font-bold text-text-primary text-xs truncate">{order.orderNumber || '—'}</span>
          {isUrgent && <span className="px-1 py-0 text-[8px] font-black bg-red-500/10 text-red-600 border border-red-500/20 rounded shrink-0">URGENT</span>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0 text-[8px] font-black rounded-full bg-primary/10 text-primary border border-primary/20">{(order.transportType || 'FTL').toUpperCase()}</span>
          <button onClick={e => { e.stopPropagation(); onDetail?.(order); }} className="p-0.5 rounded hover:bg-surface text-text-muted hover:text-primary" title={t('jsx_details','Details')}>
            <Info className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-text-secondary truncate mb-1">
        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
        <span className="truncate font-medium text-text-primary text-[11px]">{pickup?.city || pickup?.address?.split(',')[0] || '—'}</span>
        <ArrowRight className="w-2.5 h-2.5 shrink-0 text-text-muted" />
        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="truncate font-medium text-text-primary text-[11px]">{dropoff?.city || dropoff?.address?.split(',')[0] || '—'}</span>
      </div>

      <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40">
        <span className="text-text-secondary">
          {cargo.weight > 0 ? `${cargo.weight.toLocaleString()} kg` : '—'}
          {cargo.pallets > 0 ? ` · ${cargo.pallets} plt` : ''}
          {order.client?.name ? <span className="text-text-muted"> · {order.client.name}</span> : ''}
        </span>
        <span className="font-black text-text-primary">€{Number(order.price || 0).toLocaleString()}</span>
      </div>

      {pickup?.dateFrom && (
        <div className="flex items-center gap-1 mt-1 text-[10px] text-text-muted">
          <Calendar className="w-2.5 h-2.5" />
          <span>{fmtShort(pickup.dateFrom)} {pickup.timeFrom ? `· ${pickup.timeFrom}` : ''}</span>
        </div>
      )}
    </div>
  );
}

// ─── Timeline Trip Block ──────────────────────────────────────────────────────────────────────
function TripBlock({
  trip, isSelected, onClick, fromDate, totalMinutes,
}: {
  trip: any; isSelected: boolean; onClick: () => void; fromDate: string; totalMinutes: number;
}) {
  const { t } = useTranslation();
  const pos = tripTimePosition(trip, fromDate, totalMinutes);
  if (!pos) return null;

  const st = String(trip.status || 'planning').toLowerCase();
  const col = TRIP_COLORS[st] || TRIP_COLORS.planning;
  const hex = TRIP_HEX[st] || TRIP_HEX.planning;
  const { origin, dest } = tripOriginDestination(trip);
  const cargo = sumCargo(trip.orders || []);
  const revenue = (trip.orders || []).reduce((s: number, o: any) => s + (Number(o.price) || 0), 0);
  const ordersCount = (trip.orders || []).filter((o: any) => o?.id).length;
  const isNarrow = pos.width < 8; // < 8% wide = very narrow block

  return (
    <div
      className="absolute top-1.5 bottom-1.5 cursor-pointer group/block z-[5]"
      style={{ left: `${pos.left}%`, width: `${pos.width}%`, minWidth: '2.5rem' }}
      onClick={onClick}
    >
      <div
        className={`h-full rounded-xl border-2 overflow-hidden transition-all duration-150 flex flex-col justify-between ${
          col.border
        } ${
          isSelected
            ? 'ring-2 ring-offset-1 shadow-xl scale-y-[1.06] z-10'
            : 'hover:shadow-lg hover:scale-y-[1.04]'
        }`}
        style={{
          background: `linear-gradient(135deg, ${hex}28 0%, ${hex}12 100%)`,
          boxShadow: isSelected ? `0 4px 20px ${hex}50, 0 0 0 2px ${hex}` : undefined,
        }}
      >
        {/* Color accent strip at top */}
        <div className="h-0.5 w-full" style={{ background: hex }} />

        <div className="px-2 py-1 flex flex-col justify-center flex-1 min-h-0 overflow-hidden">
          {/* Trip number + status badge */}
          <div className="flex items-center gap-1 min-w-0">
            <span className={`text-[10px] font-black truncate ${col.text}`} style={{ maxWidth: isNarrow ? '100%' : '60%' }}>
              {trip.tripNumber || '—'}
            </span>
            {!isNarrow && (
              <span className={`shrink-0 px-1 py-0 text-[8px] font-black rounded-sm uppercase ${col.text} opacity-80`}>
                {t(`status_${st}`, st)}
              </span>
            )}
          </div>

          {/* Route */}
          {!isNarrow && origin !== '—' && (
            <div className="text-[9px] text-text-secondary truncate mt-0.5 hidden sm:flex items-center gap-0.5">
              <MapPin className="w-2 h-2 shrink-0 text-blue-500" />
              <span className="truncate">{origin}</span>
              {dest !== '—' && <><ArrowRight className="w-2 h-2 shrink-0" /><span className="truncate">{dest}</span></>}
            </div>
          )}

          {/* Times + metadata */}
          {!isNarrow && (
            <div className="hidden md:flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] text-text-muted font-medium">{fmtTime(trip.plannedDeparture)}</span>
              {trip.plannedArrival && <><ArrowRight className="w-2 h-2 text-text-muted" /><span className="text-[9px] text-text-muted">{fmtTime(trip.plannedArrival)}</span></>}
              {cargo.weight > 0 && <span className="text-[9px] text-text-muted">· {cargo.weight.toLocaleString()}kg</span>}
              {revenue > 0 && <span className="text-[9px] font-black" style={{ color: hex }}>€{revenue.toLocaleString()}</span>}
              {ordersCount > 0 && <span className="text-[9px] text-text-muted">· {ordersCount}&#x20;ord</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Resource Row (Gantt Row) ────────────────────────────────────────────────────────
function ResourceRow({
  resource, trips, fromDate, totalMinutes, selectedTripId, onSelectTrip, onDropOrder, draggingId,
}: {
  resource: any; trips: any[]; fromDate: string; totalMinutes: number; selectedTripId: string | null;
  onSelectTrip: (id: string) => void; onDropOrder: (resourceId: string) => void; draggingId: string | null;
}) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const cargo = sumCargo(trips.flatMap((tr: any) => tr.orders || []));
  const mw = resource.maxWeightKg || 24000;
  const mp = resource.maxPallets || 33;
  const st = String(resource.status || 'available').toLowerCase();
  const statusDot = { active:'bg-emerald-400', available:'bg-emerald-400', assigned:'bg-blue-400', driving:'bg-amber-400', maintenance:'bg-red-400', inactive:'bg-slate-400' }[st] || 'bg-slate-400';
  const hasTrips = trips.length > 0;

  return (
    <div className="flex border-b-2 border-border min-h-[76px] group hover:bg-primary/[0.02] transition-colors">
      {/* Resource Column — sticky left */}
      <div className="w-56 shrink-0 px-3 py-2.5 border-r-2 border-border flex flex-col justify-center gap-1.5 bg-card sticky left-0 z-10 shadow-[2px_0_6px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 shadow-sm ${hasTrips ? 'bg-primary/10 border-primary/20' : 'bg-surface border-border'}`}>
            <TruckIcon className={`w-4 h-4 ${hasTrips ? 'text-primary' : 'text-text-muted'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="font-black text-text-primary text-xs truncate">{resource.plateNumber || '—'}</p>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} />
            </div>
            <p className="text-[10px] text-text-muted truncate">{resource.brand || ''} {resource.model || ''}</p>
          </div>
        </div>
        {resource.driver?.name && (
          <div className="flex items-center gap-1 text-[10px] text-text-secondary">
            <Users className="w-3 h-3 shrink-0 text-text-muted" />
            <span className="truncate font-medium">{resource.driver.name}</span>
          </div>
        )}
        {cargo.weight > 0 && (
          <div className="grid grid-cols-2 gap-1 pt-1.5 border-t border-border/40">
            <CapBar label="Wt" value={Math.round(cargo.weight / 100) / 10} max={Math.round(mw / 100) / 10} unit="t" />
            <CapBar label="Plt" value={cargo.pallets} max={mp} />
          </div>
        )}
      </div>

      {/* Timeline Area */}
      <div
        className={`relative flex-1 transition-all duration-150 ${
          isDragOver && draggingId
            ? 'bg-primary/10 ring-2 ring-primary/40 ring-inset'
            : 'bg-gradient-to-b from-surface/20 via-transparent to-surface/10'
        }`}
        onDragOver={e => { if (draggingId) { e.preventDefault(); setIsDragOver(true); } }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); onDropOrder(resource.id); }}
      >
        {/* Hour grid lines */}
        <div className="absolute inset-0 flex pointer-events-none">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 border-r border-border/20 last:border-0" />
          ))}
        </div>
        {/* Drop hint */}
        {isDragOver && draggingId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="px-3 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-lg flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />{t('drop_here_label','Drop here')}
            </div>
          </div>
        )}
        {/* Trip blocks */}
        {trips.map(tr => (
          <TripBlock
            key={tr.id}
            trip={tr}
            isSelected={selectedTripId === tr.id}
            onClick={() => onSelectTrip(tr.id)}
            fromDate={fromDate}
            totalMinutes={totalMinutes}
          />
        ))}
      </div>
    </div>
  );
}



// ─── Trip Detail Drawer ──────────────────────────────────────────────────────
function TripDetailDrawer({
  tripSummary, resources = [], drivers = [], trailers = [], conflicts = [],
  onClose, onAction, onReorderStops, loadingAction,
}: {
  tripSummary: any; resources?: any[]; drivers?: any[]; trailers?: any[]; conflicts?: any[];
  onClose: () => void; onAction: (action: string, tripId: string, payload?: any) => void;
  onReorderStops: (tripId: string, stopIds: string[]) => void; loadingAction?: string | null;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [auditEvents, setAuditEvents] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'orders' | 'financial' | 'audit'>('stops');
  // Full trip detail fetched from server when drawer opens (ensures stops/orders are populated)
  const [tripDetail, setTripDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    setAuditEvents(null);
    setTripDetail(null);
    if (tripSummary?.id) {
      // Fetch full trip detail to ensure stops, orders, etc. are populated
      setDetailLoading(true);
      api.get(`/trips/${tripSummary.id}`)
        .then(r => setTripDetail(r.data))
        .catch(() => setTripDetail(tripSummary)) // fallback to summary
        .finally(() => setDetailLoading(false));
      api.get(`/planning/audit?tripId=${tripSummary.id}`)
        .then(r => setAuditEvents(r.data?.events || []))
        .catch(() => setAuditEvents([]));
    }
  }, [tripSummary?.id]);

  if (!tripSummary) return null;
  // Use fetched detail if available, otherwise use the summary from the board
  const trip = tripDetail || tripSummary;
  const truck = trip.truck || tripSummary.truck || resources.find((r: any) => r.id === (trip.truckId || tripSummary.truckId)) || null;
  const driver = trip.driver || truck?.driver || drivers.find((d: any) => d.id === (trip.driverId || tripSummary.driverId)) || null;
  const trailer = trip.trailer || tripSummary.trailer || trailers.find((trl: any) => trl.id === (trip.trailerId || tripSummary.trailerId)) || null;
  const stops = (trip.stops?.length ? trip.stops : (tripSummary.stops?.length ? tripSummary.stops : [])).slice().sort((a: any, b: any) => (a.sequence || a.stopOrder || 0) - (b.sequence || b.stopOrder || 0));
  const orders = (trip.orders?.length ? trip.orders : (tripSummary.orders?.length ? tripSummary.orders : [])).filter((o: any) => o?.id);
  const revenue = orders.reduce((s: number, o: any) => s + (Number(o.price) || 0), 0);
  const tripConflicts = (conflicts || []).filter((c: any) => c.tripId === (trip.id || tripSummary.id));
  const st = String((trip.status || tripSummary.status || 'planning')).toLowerCase();
  
  const isPlanning = ['planning', 'planned', 'assigned'].includes(st);
  const isConfirmed = ['assigned', 'dispatched', 'driver_accepted', 'started', 'driving', 'partially_delivered', 'completed', 'closed'].includes(st);
  const isDispatched = ['dispatched', 'driver_accepted', 'started', 'driving', 'partially_delivered', 'completed', 'closed'].includes(st);
  const col = TRIP_COLORS[st] || TRIP_COLORS.planning;
  const tripId = trip.id || tripSummary.id;
  const { origin, dest } = tripOriginDestination(trip);

  const formatAuditDetails = (details: string) => {
    if (!details) return null;
    try {
      const parsed = JSON.parse(details);
      return parsed.message || details;
    } catch {
      return details;
    }
  };

  const moveStop = (idx: number, dir: 'up' | 'down') => {
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= stops.length) return;
    const s = [...stops]; [s[idx], s[target]] = [s[target], s[idx]];
    onReorderStops(tripId, s.map((x: any) => x.id));
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-end" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.55)' }} onClick={onClose}>
      <div className="relative w-full max-w-xl h-full bg-card shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 border-b border-border bg-surface/40 flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-black text-text-primary">{trip.tripNumber || tripSummary.tripNumber || 'Trip'}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border-2 uppercase ${col.border} ${col.text}`}>{t(`status_${st}`, st)}</span>
              {detailLoading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
            </div>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-2">
              <span>{origin}</span>
              <ArrowRight className="w-3 h-3 text-text-muted" />
              <span>{dest}</span>
              {(trip.distanceKm || tripSummary.distanceKm) && <><span>·</span><span className="font-semibold text-text-primary">{trip.distanceKm || tripSummary.distanceKm} km</span></>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(`/trips/${tripId}`)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /><span>{t('jsx_context_openTrip','Open')}</span>
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Resources summary */}
        <div className="px-5 py-3 border-b border-border bg-surface/20 grid grid-cols-3 gap-3 text-xs shrink-0">
          {[
            [t('export_col_truck','Truck'), truck?.plateNumber || '—', `${truck?.brand || ''} ${truck?.model || ''}`.trim()],
            [t('export_col_driver','Driver'), driver?.name || driver?.user?.name || '—', driver?.phone || ''],
            [t('export_col_trailer','Trailer'), trailer?.plateNumber || '—', trailer?.type || ''],
          ].map(([lbl, val, sub]) => (
            <div key={lbl as string} className="bg-card rounded-xl p-2.5 border border-border/60">
              <p className="text-text-secondary text-[10px]">{lbl}</p>
              <p className="font-black text-text-primary text-sm truncate mt-0.5">{val}</p>
              {sub && <p className="text-[9px] text-text-muted mt-0.5 truncate">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-surface/20 px-5 gap-5 text-xs shrink-0">
          {[['stops',`${t('jsx_stops','Stops')} (${detailLoading ? '…' : stops.length})`,MapPin],['orders',`${t('jsx_orders','Orders')} (${detailLoading ? '…' : orders.length})`,Package],['financial',t('financial_breakdown','Financials'),Activity],['audit',t('jsx_audit','Audit'),Clock]].map(([id,label,Icon]: any) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${activeTab === id ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}>
              <Icon className="w-3.5 h-3.5" /><span>{label}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {detailLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs text-text-secondary">Loading trip details…</span>
            </div>
          )}
          {!detailLoading && tripConflicts.length > 0 && (
            <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-3 space-y-1.5">
              <h3 className="text-xs font-bold text-red-600 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{t('jsx_attention','Conflicts')} ({tripConflicts.length})</h3>
              {tripConflicts.map((c: any) => (
                <div key={c.id} className="text-xs flex gap-2 bg-card/80 p-2 rounded-xl border border-red-500/20">
                  <span className="px-1.5 text-[8px] font-black uppercase rounded bg-red-500 text-white shrink-0">{c.level}</span>
                  <span className="text-text-primary">{c.message}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'stops' && (
            <div className="space-y-2">
              {stops.map((s: any, idx: number) => {
                const isPu = s.type === 'pickup';
                return (
                  <div key={s.id || idx} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${isPu ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>{idx + 1}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-text-primary text-sm truncate">{s.companyName || s.city || '—'}</span>
                          <span className={`text-[8px] font-bold rounded px-1 uppercase ${isPu ? 'text-blue-600 bg-blue-500/10' : 'text-emerald-600 bg-emerald-500/10'}`}>{isPu ? t('loading_stop','Pickup') : t('unloading_stop','Delivery')}</span>
                        </div>
                        <p className="text-xs text-text-secondary truncate">{s.address}{s.postalCode ? `, ${s.postalCode}` : ''} {s.country || ''}</p>
                        {s.eta && <p className="text-[10px] text-text-muted">ETA: <span className="font-semibold text-text-primary">{fmtTime(s.eta)} {fmtShort(s.eta)}</span></p>}
                      </div>
                    </div>
                    {isPlanning && (
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button disabled={idx === 0 || !!loadingAction} onClick={() => moveStop(idx, 'up')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button disabled={idx === stops.length - 1 || !!loadingAction} onClick={() => moveStop(idx, 'down')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                );
              })}
              {stops.length === 0 && <p className="text-xs text-text-secondary text-center py-6">{t('no_stops', 'Nu există opriri (Aceasta pare o cursă goală/coruptă)')}</p>}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-2">
              {orders.map((o: any) => {
                const oc = sumCargo([o]);
                return (
                  <div key={o.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="font-bold text-primary text-sm">{o.orderNumber || '—'}</span>
                      <p className="text-xs text-text-secondary">{o.client?.name || ''} {oc.weight > 0 ? `· ${oc.weight.toLocaleString()} kg` : ''}{oc.pallets > 0 ? ` · ${oc.pallets} plt` : ''}</p>
                    </div>
                    <span className="font-black text-text-primary">€{Number(o.price || 0).toLocaleString()}</span>
                  </div>
                );
              })}
              {orders.length === 0 && <p className="text-xs text-text-secondary text-center py-6">{t('no_orders','No orders')}</p>}
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="grid grid-cols-3 gap-3">
              {[
                [t('revenue','Revenue'), `€${revenue.toLocaleString(undefined, {minimumFractionDigits:2})}`, 'text-primary'],
                [t('cost','Est. Cost'), `€${Number(trip.estimatedCost || 0).toLocaleString(undefined, {minimumFractionDigits:2})}`, 'text-text-secondary'],
                [t('margin','Margin'), `€${(revenue - Number(trip.estimatedCost || 0)).toLocaleString(undefined, {minimumFractionDigits:2})}`, revenue >= Number(trip.estimatedCost || 0) ? 'text-emerald-500' : 'text-red-500'],
              ].map(([label, val, cls]) => (
                <div key={label as string} className="bg-surface/60 rounded-xl p-3 border border-border">
                  <p className="text-xs text-text-secondary">{label}</p>
                  <p className={`font-black text-lg mt-0.5 ${cls}`}>{val}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-2">
              {!auditEvents ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              : auditEvents.length === 0 ? <p className="text-xs text-text-secondary text-center py-6">{t('jsx_noEventsLogge','No events')}</p>
              : auditEvents.map((ev: any) => (
                <div key={ev.id} className="bg-card border border-border/60 rounded-xl p-3 text-xs flex gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-text-primary capitalize">{String(ev.action || '').replace(/_/g, ' ')}</p>
                    {ev.details && <p className="text-text-secondary mt-0.5">{formatAuditDetails(ev.details)}</p>}
                    <p className="text-[10px] text-text-muted mt-1">{ev.user?.name || 'System'} · {new Date(ev.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/50 flex flex-wrap gap-2 justify-between shrink-0">
          <div className="flex flex-wrap gap-2">
            {isPlanning || isConfirmed ? (
              <button disabled={!!loadingAction || isConfirmed} onClick={() => onAction('confirm', tripId)} className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold ${isConfirmed ? 'opacity-100 cursor-default bg-emerald-500/10 text-emerald-600 border-emerald-500/30' : ''}`}>
                {loadingAction === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className={`w-4 h-4 ${isConfirmed ? '' : 'text-emerald-500'}`} />}
                <span>{isConfirmed ? t('jsx_context_confirmed','Confirmed') : t('jsx_context_confirm','Confirm')}</span>
              </button>
            ) : null}
            {isPlanning || isDispatched || st === 'assigned' ? (
              <button disabled={!!loadingAction || isDispatched || !isConfirmed} onClick={() => onAction('send', tripId)} className={`btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold ${isDispatched ? 'opacity-100 cursor-default bg-primary/10 text-primary border-primary/30' : ''} ${!isConfirmed && !isDispatched ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {loadingAction === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : (isDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4 text-primary" />)}
                <span>{isDispatched ? t('jsx_context_sent','Sent to Driver') : t('jsx_context_send','Send to Driver')}</span>
              </button>
            ) : null}
            {isPlanning && orders.length > 1 ? (
              <button disabled={!!loadingAction} onClick={() => onAction('split', tripId)} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold">
                {loadingAction === 'split' ? <Loader2 className="w-4 h-4 animate-spin" /> : <SplitSquareHorizontal className="w-4 h-4 text-amber-500" />}
                <span>{t('jsx_context_split','Split')}</span>
              </button>
            ) : null}
          </div>
          {isPlanning && (
            <button disabled={!!loadingAction} onClick={() => onAction('unplan-all', tripId, { orderIds: orders.map((o: any) => o.id) })} className="btn-secondary text-xs py-2 px-3 text-red-500 hover:bg-red-500/10 flex items-center gap-1.5 font-bold">
              {loadingAction === 'unplan-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
              <span>{orders.length === 1 ? t('jsx_context_unplan','Unplan') : t('jsx_context_unplan_all','Unplan All')}</span>
            </button>
          )}
        </div>
      </div>
    </div>, document.body
  ) : null;
}

// ─── Order Detail Drawer ─────────────────────────────────────────────────────
function OrderDetailDrawer({ order, onClose, onPlan }: { order: any; onClose: () => void; onPlan?: (order: any) => void }) {
  const { t } = useTranslation();
  if (!order) return null;
  const pickup = (order.stops || []).find((s: any) => s.type === 'pickup') || order.stops?.[0];
  const dropoff = (order.stops || []).filter((s: any) => s.type === 'delivery' || s.type === 'dropoff').pop() || order.stops?.[order.stops?.length - 1];
  const cargo = sumCargo([order]);

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="relative w-full max-w-lg bg-card shadow-2xl rounded-3xl flex flex-col overflow-y-auto border border-border animate-in zoom-in-95 duration-150" style={{ maxHeight: '85vh' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-border bg-surface/40 shrink-0">
          <div>
            <h2 className="text-xl font-black text-text-primary">{order.orderNumber || '—'}</h2>
            <p className="text-sm text-text-secondary mt-0.5">{order.client?.name || '—'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 p-5 space-y-4">
          <div className="bg-surface/50 rounded-2xl border border-border p-4 space-y-3">
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary" />{t('route_section','Route')}</h3>
            {pickup && <div className="flex gap-2.5 items-start">
              <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">↑</span>
              <div><p className="text-xs font-bold text-blue-600 uppercase">{t('loading_stop','Pickup')}</p><p className="font-semibold text-text-primary">{pickup.companyName || pickup.city || '—'}</p><p className="text-xs text-text-secondary">{pickup.address || ''}</p>{pickup.dateFrom && <p className="text-xs text-blue-500 mt-0.5">{fmtDate(pickup.dateFrom)} {pickup.timeFrom || ''}</p>}</div>
            </div>}
            {dropoff && <div className="flex gap-2.5 items-start pt-2 border-t border-border/40">
              <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">↓</span>
              <div><p className="text-xs font-bold text-emerald-600 uppercase">{t('unloading_stop','Delivery')}</p><p className="font-semibold text-text-primary">{dropoff.companyName || dropoff.city || '—'}</p><p className="text-xs text-text-secondary">{dropoff.address || ''}</p>{dropoff.dateFrom && <p className="text-xs text-emerald-500 mt-0.5">{fmtDate(dropoff.dateFrom)} {dropoff.timeFrom || ''}</p>}</div>
            </div>}
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            {[
              [t('pool_col_weight','Weight'), `${cargo.weight.toLocaleString()} kg`],
              [t('pool_col_pallets','Pallets'), `${cargo.pallets} plt`],
              [t('pool_col_volume','Volume'), `${cargo.volume.toFixed(1)} m³`],
              [t('revenue','Price'), `€${Number(order.price || 0).toLocaleString()}`],
            ].map(([l,v]) => (
              <div key={l as string} className="bg-card rounded-xl p-3 border border-border/60">
                <p className="text-text-secondary text-[10px]">{l}</p>
                <p className="font-black text-text-primary text-base mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border bg-surface/40 flex justify-end gap-2 shrink-0">
          <button onClick={() => onPlan?.(order)} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold">
            <TruckIcon className="w-4 h-4" /><span>{t('jsx_planNow','Plan Now')}</span>
          </button>
        </div>
      </div>
    </div>, document.body
  ) : null;
}

// ─── Optimization Modal ──────────────────────────────────────────────────────
function OptimizationModal({ onClose, onApply, isLoading }: { onClose: () => void; onApply: (p: any[]) => void; isLoading: boolean }) {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.post('/planning/optimize', {}).then(r => { setProposals(r.data?.proposedTrips || []); }).catch(err => toast.error(err.response?.data?.message || 'Optimization failed')).finally(() => setLoading(false));
  }, []);

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full max-w-2xl bg-card shadow-2xl rounded-3xl flex flex-col border border-border animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-border bg-surface/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles className="w-5 h-5 text-primary" /></div>
            <div><h2 className="text-lg font-black text-text-primary">{t('jsx_optimizer','Route Optimization')}</h2><p className="text-xs text-text-secondary">AI-powered route & dispatch optimization</p></div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <div className="flex flex-col items-center py-12 gap-3"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-sm font-bold text-text-secondary">{t('jsx_loadingSuggest','Calculating…')}</p></div>
          : proposals.length === 0 ? <div className="text-center py-12"><CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" /><p className="font-bold text-text-primary">{t('jsx_noOptimization','Plan already optimal')}</p></div>
          : <div className="space-y-3">
              {proposals.map((p: any, i: number) => (
                <div key={p.id || i} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div><span className="font-black text-text-primary text-sm">{p.plateNumber || 'Truck'}</span>{p.driver ? <span className="text-xs text-text-secondary ml-2">· {p.driver}</span> : ''}<p className="text-xs text-text-secondary mt-1">{p.origin || ''}{p.origin && p.destination ? ' → ' : ''}{p.destination || ''}</p></div>
                  <div className="flex items-center gap-3"><span className="px-2.5 py-1 text-xs font-black rounded-lg bg-surface border border-border">{p.orderIds?.length || 0} orders</span><span className="font-black text-primary">€{Number(p.estimatedRevenue || 0).toLocaleString()}</span></div>
                </div>
              ))}
            </div>
          }
        </div>
        <div className="px-6 py-4 border-t border-border bg-surface/50 flex justify-between shrink-0">
          <button onClick={onClose} className="btn-secondary text-xs py-2.5 px-4 font-bold">{t('jsx_cancel','Cancel')}</button>
          <button disabled={isLoading || proposals.length === 0} onClick={() => onApply(proposals)} className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}<span>{t('opt_apply_btn','Apply Optimization')}</span>
          </button>
        </div>
      </div>
    </div>, document.body
  ) : null;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── State ──
  const [selectedDate, setSelectedDate] = useState<string>(() => dayStr(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'timeline' | 'map'>('day');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [truckFilter, setTruckFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [boardData, setBoardData] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPoolOrderIds, setSelectedPoolOrderIds] = useState<Set<string>>(new Set());
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);

  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortPool, setSortPool] = useState<'priority' | 'date' | 'weight' | 'client'>('priority');
  const [grouping, setGrouping] = useState<'truck' | 'driver' | 'trailer'>('truck');

  // ── Date range ──
  const { from, to, totalMinutes, hoursVisible, fromDateObj } = useMemo(() => {
    const curr = parseDay(selectedDate);
    if (viewMode === 'week') {
      const start = addDays(curr, -((curr.getDay() + 6) % 7));
      return { from: dayStr(start), to: dayStr(addDays(start, 6)), totalMinutes: 7 * 24 * 60, hoursVisible: 7, fromDateObj: start };
    }
    // day / timeline / map — same range
    return { from: selectedDate, to: selectedDate, totalMinutes: 24 * 60, hoursVisible: 24, fromDateObj: curr };
  }, [selectedDate, viewMode]);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const [boardRes, mapRes] = await Promise.allSettled([
        api.get('/planning/board', { params: { from, to, search: search || undefined, status: statusFilter || undefined, vehicleId: truckFilter || undefined, driverId: driverFilter || undefined } }),
        api.get('/planning/map-data', { params: { from, to } }).catch(() => api.get('/planning/map', { params: { from, to } })),
      ]);

      if (boardRes.status === 'fulfilled') setBoardData(boardRes.value.data);
      else {
        const msg = boardRes.reason?.response?.data?.message || boardRes.reason?.message || 'Failed to load board data';
        setFetchError(msg); toast.error(msg);
      }
      if (mapRes.status === 'fulfilled') setMapData(mapRes.value.data);
      else console.warn('Map data unavailable:', mapRes.reason);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load planning data';
      setFetchError(msg); toast.error(msg);
    } finally { setIsLoading(false); }
  }, [from, to, search, statusFilter, truckFilter, driverFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Shortcuts ──
  useShortcuts({
    '1': () => setViewMode('day'),
    '2': () => setViewMode('week'),
    '3': () => setViewMode('timeline'),
    '4': () => setViewMode('map'),
    'u': () => setPoolCollapsed(p => !p),
    'o': () => setShowOptimizeModal(true),
    'f': () => setIsFullscreen(p => !p),
    'r': () => loadData(),
  });

  // ── Actions ──
  const handleTripAction = async (action: string, tripId: string, payload?: any) => {
    setLoadingAction(action);
    try {
      if (action === 'confirm') {
        // Uses the dedicated planning endpoint that handles planning→planned→assigned transition
        await api.post(`/planning/trips/${tripId}/confirm`);
        toast.success(t('jsx_confirmedOk','Trip confirmed'));
      } else if (action === 'send') {
        // Uses the dedicated planning endpoint that transitions to dispatched
        await api.post(`/planning/trips/${tripId}/send-to-driver`, {});
        toast.success(t('jsx_sentOk','Trip dispatched'));
      } else if (action === 'split') {
        await api.post(`/planning/trips/${tripId}/split`, {});
        toast.success(t('jsx_splitOk','Trip split'));
      } else if (action === 'unplan-all') {
        const orderIds = payload?.orderIds || [];
        if (!orderIds.length) { toast.error('No orders to unplan'); return; }
        await api.post('/planning/unplan', { orderIds });
        toast.success(t('jsx_unplannedOk','Orders unplanned'));
        setSelectedTripId(null);
      }
      loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || t('jsx_actionError','Action failed')); }
    finally { setLoadingAction(null); }
  };

  const handleReorderStops = async (tripId: string, stopIds: string[]) => {
    setLoadingAction('reorder');
    try { await api.put(`/planning/trips/${tripId}/reorder`, { order: stopIds }); toast.success(t('stops_reordered','Stops reordered')); loadData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed to reorder stops'); }
    finally { setLoadingAction(null); }
  };

  const handleDropOrder = async (resourceId: string) => {
    const orderIds = draggingOrderId ? [draggingOrderId] : Array.from(selectedPoolOrderIds);
    if (!orderIds.length) return;
    setLoadingAction('assign');
    try {
      await api.post('/planning/assign', { orderIds, truckId: resourceId, date: selectedDate });
      toast.success(t('jsx_assignedOk','Orders assigned'));
      setSelectedPoolOrderIds(new Set()); setDraggingOrderId(null); loadData();
    } catch (err: any) { toast.error(err.response?.data?.message || 'Assignment failed'); }
    finally { setLoadingAction(null); }
  };

  const handleApplyOptimization = async (proposals: any[]) => {
    setLoadingAction('optimize');
    try { await api.post('/planning/optimize/apply', { proposals }); toast.success(t('jsx_appliedOk','Optimization applied')); setShowOptimizeModal(false); loadData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Failed to apply'); }
    finally { setLoadingAction(null); }
  };

  const handleUndo = async () => {
    try { await api.post('/planning/undo', {}); toast.success(t('jsx_undone','Action undone')); loadData(); }
    catch (err: any) { toast.error(err.response?.data?.message || 'Undo failed'); }
  };

  const handlePrint = () => window.print();

  const handleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen?.();
    setIsFullscreen(p => !p);
  };

  // ── Derived data ──
  const counts = boardData?.counts || {};
  const resources: any[] = boardData?.resources || [];
  const trips: any[] = boardData?.trips || [];
  const orders: any[] = boardData?.orders || [];

  const sortedOrders = useMemo(() => {
    const o = [...orders];
    if (sortPool === 'priority') {
      const p: Record<string,number> = { critical: 0, high: 1, normal: 2, low: 3 };
      return o.sort((a, b) => (p[a.priority] ?? 2) - (p[b.priority] ?? 2));
    }
    if (sortPool === 'date') return o.sort((a, b) => {
      const da = a.stops?.[0]?.dateFrom || '9999'; const db = b.stops?.[0]?.dateFrom || '9999';
      return da < db ? -1 : 1;
    });
    if (sortPool === 'weight') return o.sort((a, b) => sumCargo([b]).weight - sumCargo([a]).weight);
    if (sortPool === 'client') return o.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || ''));
    return o;
  }, [orders, sortPool]);

  const selectedTrip = useMemo(() => trips.find(tr => tr.id === selectedTripId) || null, [trips, selectedTripId]);
  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);

  const activeFilterCount = [search, statusFilter, truckFilter, driverFilter, priorityFilter].filter(Boolean).length;

  // ── Filtered resources for display ──
  const displayResources = useMemo(() => {
    if (!truckFilter) return resources;
    return resources.filter(r => r.id === truckFilter || r.plateNumber === truckFilter);
  }, [resources, truckFilter]);

  return (
    <div className={`flex flex-col gap-0 bg-background text-text-primary print:bg-white ${isFullscreen ? 'fixed inset-0 z-[9000] p-0' : 'h-[calc(100vh-4rem)]'}`}>

      {/* ── TOP TOOLBAR ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0 print:hidden">
        {/* Left: title + views */}
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-base font-black text-text-primary whitespace-nowrap">{t('jsx_planningTitle','Planning & Dispatch')}</h1>
          <div className="flex bg-surface p-0.5 rounded-xl border border-border">
            {([['day', t('jsx_day','Day'), Clock],['week', t('jsx_week','Week'), Calendar],['timeline', t('view_timeline','Timeline'), LayoutGrid],['map', t('jsx_map','Map'), MapIcon]] as [string, string, any][]).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setViewMode(id as any)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === id ? 'bg-card text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}>
                <Icon className="w-3.5 h-3.5" /><span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {/* Grouping */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-muted font-bold uppercase">{t('jsx_groupAll','Group')}:</span>
            {([['truck', t('jsx_groupVehicle','Truck')],['driver', t('jsx_groupDriver','Driver')]] as [string,string][]).map(([id,label]) => (
              <button key={id} onClick={() => setGrouping(id as any)} className={`text-[10px] px-2 py-0.5 rounded font-bold transition-colors ${grouping === id ? 'bg-primary text-white' : 'bg-surface text-text-secondary hover:text-text-primary border border-border'}`}>{label}</button>
            ))}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleUndo} className="btn-secondary p-2 rounded-xl" title={t('jsx_undo','Undo')}><RotateCcw className="w-4 h-4" /></button>
          <button onClick={() => setShowOptimizeModal(true)} className="btn-secondary p-2 rounded-xl" title={t('jsx_optimize','Optimize')}><Sparkles className="w-4 h-4 text-primary" /></button>
          <button onClick={handlePrint} className="btn-secondary p-2 rounded-xl" title={t('jsx_print','Print')}><Printer className="w-4 h-4" /></button>
          <button onClick={handleFullscreen} className="btn-secondary p-2 rounded-xl" title={t('jsx_fullscreen','Fullscreen')}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button onClick={() => navigate('/orders/new')} className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 font-black shadow shadow-primary/20">
            <Plus className="w-4 h-4" /><span className="hidden sm:inline">{t('jsx_newTransport','+ New')}</span>
          </button>
        </div>
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-surface/50 shrink-0 flex-wrap print:hidden">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search_order_placeholder','Search order, client, location…')}
            className="pl-8 pr-3 py-1.5 text-xs bg-card border border-border rounded-xl text-text-primary focus:outline-none focus:ring-1 focus:ring-primary w-56"
          />
        </div>

        {/* Status — using the app-wide CustomSelect for consistent modern styling */}
        <div className="w-44">
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: t('status_all','All Statuses') },
              ...['planning','planned','assigned','dispatched','driver_accepted','started','loading','driving','partially_delivered','completed','closed','cancelled']
                .map(s => ({ value: s, label: t(`status_${s}`, s.replace(/_/g,' ')) }))
            ]}
          />
        </div>

        {/* Trucks */}
        <div className="w-40">
          <CustomSelect
            value={truckFilter}
            onChange={setTruckFilter}
            options={[
              { value: '', label: t('jsx_allVehicles','All Trucks') },
              ...resources.map((r: any) => ({ value: r.id, label: r.plateNumber }))
            ]}
          />
        </div>

        {/* Drivers */}
        <div className="w-40">
          <CustomSelect
            value={driverFilter}
            onChange={setDriverFilter}
            options={[
              { value: '', label: t('jsx_allDrivers','All Drivers') },
              ...(boardData?.drivers || resources.map((r: any) => r.driver).filter(Boolean))
                .filter((d: any, i: number, arr: any[]) => d && arr.findIndex((x: any) => x.id === d.id) === i)
                .map((d: any) => ({ value: d.id, label: d.name || d.user?.name || '—' }))
            ]}
          />
        </div>

        {/* Priority */}
        <div className="w-32">
          <CustomSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: '', label: t('jsx_allPriorities','Priority') },
              ...['critical','high','normal','low'].map(p => ({ value: p, label: t(`priority_${p}`, p) }))
            ]}
          />
        </div>

        {activeFilterCount > 0 && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setTruckFilter(''); setDriverFilter(''); setPriorityFilter(''); }} className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-600 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-xl transition-colors">
            <X className="w-3 h-3" />{t('jsx_clearFilters','Clear')} ({activeFilterCount})
          </button>
        )}

        {/* Refresh */}
        <button onClick={loadData} disabled={isLoading} className="ml-auto flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors" title={t('jsx_recalc','Refresh')}>
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          <span className="hidden sm:inline">{t('jsx_recalc','Refresh')}</span>
        </button>
      </div>

      {/* ── KPI STRIP ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-0 border-b border-border shrink-0 print:hidden">
        {[
          ['', t('kpi_planned','Planned'), counts.planned || trips.filter((tr: any) => ['planned','assigned','dispatched'].includes(tr.status)).length || 0, 'blue'],
          ['unassigned', t('kpi_unassigned','Unassigned'), boardData?.totalUnplanned || orders.length || 0, 'amber'],
          ['attention', t('jsx_attention','Attention'), (boardData?.conflicts || []).filter((c: any) => c.level === 'blocking').length || counts.attention || 0, 'red'],
          ['driving', t('status_driving','Driving'), counts.inProgress || trips.filter((tr: any) => ['driving','started','loading'].includes(tr.status)).length || 0, 'emerald'],
          ['delayed', t('status_delayed','Delayed'), boardData?.delayedTrips || 0, 'purple'],
        ].map(([filter, label, value, color]) => (
          <button key={label as string} onClick={() => setStatusFilter(statusFilter === filter ? '' : filter as string)}
            className={`py-2.5 px-4 flex items-center justify-between gap-2 text-xs font-bold border-r border-border last:border-0 transition-all hover:bg-surface/60 ${statusFilter === filter ? 'bg-surface' : ''}`}>
            <span className="text-text-secondary">{label}</span>
            <span className={`px-2 py-0.5 rounded-full font-black bg-${color}-500/10 text-${color}-600`}>{value}</span>
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ORDER POOL (left panel) */}
        <div className={`flex flex-col border-r border-border bg-card shrink-0 transition-all duration-300 overflow-hidden ${poolCollapsed ? 'w-10' : 'w-72'} print:hidden`}>
          {/* Pool header */}
          <div className={`flex items-center justify-between p-2.5 border-b border-border bg-surface/30 shrink-0 ${poolCollapsed ? 'flex-col gap-2' : ''}`}>
            {!poolCollapsed && (
              <div className="flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-primary" />
                <h2 className="font-bold text-text-primary text-xs">{t('unassigned_orders','Order Pool')}</h2>
                <span className="px-1.5 py-0 text-[10px] font-black rounded-full bg-surface border border-border text-primary">{orders.length}</span>
              </div>
            )}
            <button onClick={() => setPoolCollapsed(p => !p)} className="p-1.5 hover:bg-surface rounded-lg text-text-secondary hover:text-text-primary transition-colors" title={poolCollapsed ? t('jsx_expandPool','Expand') : t('jsx_collapsePool','Collapse')}>
              {poolCollapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronsLeft className="w-3.5 h-3.5" />}
            </button>
          </div>

          {!poolCollapsed && (
            <>
              {/* Sort controls */}
              <div className="flex gap-1 p-2 border-b border-border bg-surface/10 flex-wrap">
                {([['priority','Prio'],['date','Date'],['weight','Wt'],['client','Client']] as [string,string][]).map(([id,lbl]) => (
                  <button key={id} onClick={() => setSortPool(id as any)} className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors ${sortPool === id ? 'bg-primary text-white' : 'text-text-secondary border border-border hover:text-text-primary'}`}>{lbl}</button>
                ))}
              </div>

              {/* Pool cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : fetchError ? (
                  <div className="text-center py-6 px-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-text-primary">Error loading</p>
                    <p className="text-[10px] text-text-secondary mb-2">{fetchError}</p>
                    <button onClick={loadData} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 mx-auto"><RefreshCw className="w-3 h-3" />{t('jsx_recalc','Retry')}</button>
                  </div>
                ) : sortedOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-text-primary text-xs">{t('allOrdersPlanned','All planned!')}</p>
                  </div>
                ) : (
                  sortedOrders.map(o => (
                    <PoolOrderCard key={o.id} order={o} selected={selectedPoolOrderIds.has(o.id)}
                      onToggle={(id, sel) => { const next = new Set(selectedPoolOrderIds); if (sel) next.add(id); else next.delete(id); setSelectedPoolOrderIds(next); }}
                      onDetail={order => setSelectedOrderId(order.id)}
                      draggingId={draggingOrderId} setDraggingId={setDraggingOrderId}
                    />
                  ))
                )}
              </div>

              {/* Bulk assign bar */}
              {selectedPoolOrderIds.size > 0 && (
                <div className="p-2 border-t border-border bg-primary/5 shrink-0">
                  <p className="text-[10px] font-bold text-primary mb-1">{selectedPoolOrderIds.size} {t('jsx_selected','selected')} — {t('drag_hint','drag to a truck row')}</p>
                  <button onClick={() => setSelectedPoolOrderIds(new Set())} className="text-[10px] text-text-secondary hover:text-text-primary">{t('jsx_cancel','Clear')}</button>
                </div>
              )}
            </>
          )}
        </div>

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {viewMode === 'map' ? (
            <PlanningMap mapData={mapData} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} isLoading={isLoading} />
          ) : (
            <>
              {/* Date navigator */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/20 shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedDate(d => dayStr(addDays(parseDay(d), viewMode === 'week' ? -7 : -1)))} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button onClick={() => setSelectedDate(dayStr(new Date()))} className="text-xs font-bold text-text-primary hover:text-primary transition-colors px-2">
                    {viewMode === 'week' ? t('jsx_dateThisWeek','This week') : t('jsx_today','Today')}
                  </button>
                  <Flatpickr
                    value={selectedDate}
                    onChange={([d]) => d && setSelectedDate(dayStr(d))}
                    options={{ dateFormat: 'Y-m-d' }}
                    className="w-28 text-xs font-bold text-center bg-transparent border-none focus:ring-0 cursor-pointer text-text-primary"
                  />
                  <button onClick={() => setSelectedDate(d => dayStr(addDays(parseDay(d), viewMode === 'week' ? 7 : 1)))} className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {viewMode === 'week' && (
                    <span className="text-xs text-text-secondary">
                      {fmtShort(fromDateObj)} – {fmtShort(addDays(fromDateObj, 6))}
                    </span>
                  )}
                </div>
                {/* Status bar */}
                <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                  <span><span className="font-bold text-text-primary">{displayResources.length}</span> {t('jsx_resources','resources')}</span>
                  <span><span className="font-bold text-text-primary">{trips.length}</span> {t('jsx_tripsInRange','trips in range')}</span>
                </div>
              </div>

              {/* Timeline grid */}
              <div className="flex-1 overflow-auto relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-text-secondary">{t('map_loading','Loading schedule…')}</p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3"><AlertTriangle className="w-6 h-6" /></div>
                    <p className="font-bold text-text-primary text-base">Unable to load planning data</p>
                    <p className="text-xs text-text-secondary max-w-sm mt-1 mb-4">{fetchError}</p>
                    <button onClick={loadData} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-md"><RefreshCw className="w-3.5 h-3.5" /><span>{t('jsx_recalc','Retry')}</span></button>
                  </div>
                ) : (
                  <div className="min-w-[800px]">
                    {/* Time scale header */}
                    <div className="flex border-b border-border bg-surface/60 sticky top-0 z-20 shadow-sm">
                      <div className="w-56 shrink-0 border-r border-border/60 bg-surface/80 flex items-center px-3 py-2 sticky left-0 z-30">
                        <Filter className="w-3.5 h-3.5 text-text-muted mr-1.5" />
                        <span className="text-[10px] font-bold text-text-secondary uppercase">{t('jsx_resources','Resources')}</span>
                      </div>
                      <div className="flex flex-1">
                        {Array.from({ length: hoursVisible }, (_, h) => (
                          <div key={h} className="flex-1 text-center text-[10px] font-bold text-text-secondary py-2 border-r border-border/30 last:border-0 min-w-[2.5rem]">
                            {viewMode === 'week'
                              ? addDays(fromDateObj, h).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })
                              : `${String(h).padStart(2,'0')}:00`
                            }
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resource rows */}
                    {displayResources.length === 0 ? (
                      <div className="text-center py-24 px-4">
                        <TruckIcon className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
                        <p className="font-bold text-text-primary">{t('jsx_noTrips','No vehicles found for this period.')}</p>
                        <p className="text-xs text-text-secondary mt-1">Try selecting another date or clearing filters.</p>
                      </div>
                    ) : (
                      displayResources.map(res => {
                        const resTrips = trips.filter(tr => tr.truck?.id === res.id || tr.truckId === res.id);
                        return (
                          <ResourceRow
                            key={res.id}
                            resource={res}
                            trips={resTrips}
                            fromDate={from}
                            totalMinutes={totalMinutes}
                            selectedTripId={selectedTripId}
                            onSelectTrip={setSelectedTripId}
                            onDropOrder={handleDropOrder}
                            draggingId={draggingOrderId}
                          />
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Status bar footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface/30 text-[10px] text-text-secondary shrink-0 print:hidden">
                <span>{t('jsx_resources','Resources')}: <span className="font-bold text-text-primary">{displayResources.length}/{resources.length}</span></span>
                <span>{t('drag_hint','Drag orders onto truck rows to assign')}</span>
                <span>{t('jsx_tripsInRange','Trips in range')}: <span className="font-bold text-text-primary">{trips.length}</span></span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── DRAWERS & MODALS ────────────────────────────────────────────── */}
      {selectedTrip && (
        <TripDetailDrawer
          tripSummary={selectedTrip}
          resources={resources}
          drivers={boardData?.drivers || []}
          trailers={boardData?.trailers || []}
          conflicts={boardData?.conflicts || []}
          onClose={() => setSelectedTripId(null)}
          onAction={handleTripAction}
          onReorderStops={handleReorderStops}
          loadingAction={loadingAction}
        />
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          onClose={() => setSelectedOrderId(null)}
          onPlan={order => { setSelectedPoolOrderIds(new Set([order.id])); setSelectedOrderId(null); }}
        />
      )}

      {showOptimizeModal && (
        <OptimizationModal onClose={() => setShowOptimizeModal(false)} onApply={handleApplyOptimization} isLoading={!!loadingAction} />
      )}
    </div>
  );
}
