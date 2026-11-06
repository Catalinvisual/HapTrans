import {
  useEffect, useRef, useState, useCallback, useMemo
} from 'react';
import { createPortal } from 'react-dom';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, ExternalLink,
  Users, X, ChevronRight, ChevronLeft, Calendar, ArrowRight, Activity, Search,
  Undo2, SplitSquareHorizontal, Send, ShieldCheck,
  LayoutGrid, Clock, Map as MapIcon, Sparkles, CheckSquare, Square, RefreshCw,
  ChevronsLeft, ChevronsRight, Plus, ArrowUp, ArrowDown, Layers, Navigation,
  Printer, Maximize2, Minimize2, RotateCcw, List, FileText, Pencil,
  BookmarkPlus, Save, Trash2, GitMerge, Wand2, Clock3,
  ZoomIn, ZoomOut, Unplug, Link as LinkIcon, ArrowRightLeft, Building2, Euro,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../lib/api';
import { orderIsAdr, tripIsAdr } from '../lib/adrDetect';
import { driverEntityDisplayName } from '../lib/driverName';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { useShortcuts } from '../hooks/useShortcuts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomSelect from '../components/CustomSelect';
import { useSettingsStore } from '../store/settingsStore';
import PalletIcon from '../components/icons/PalletIcon';
import WeightKgIcon from '../components/icons/WeightKgIcon';
import { useConfirm } from '../components/SaveConfirmProvider';
import PlanningResultsPanel from '../components/planning/PlanningResultsPanel';
import { generateTripPdf } from '../lib/pdfGenerator';
import { archiveAndDownloadPdf } from '../lib/pdfArchiveHelper';
import { planningApi } from '../lib/planningApi';
import OrderWizard from '../components/orders/OrderWizard';
import OrderDetailDrawer from '../components/orders/OrderDetailDrawer';
import AdrBadge from '../components/common/AdrBadge';
import ExcelIcon from '../components/icons/ExcelIcon';
import { fmtMoney, fmtNumber } from '../lib/format';
import { providerStatusMessage } from '../lib/providerStatus';
import { statusTone } from '../lib/statusColors';
import SplitTripModal from '../components/planning/SplitTripModal';
import CombineTripsModal from '../components/planning/CombineTripsModal';
import PlanningExportModal from '../components/planning/PlanningExportModal';
import SavedViewsModal from '../components/planning/SavedViewsModal';
import DropHookModal from '../components/planning/DropHookModal';
import CrossDockModal from '../components/planning/CrossDockModal';
import SubcontractorModal from '../components/planning/SubcontractorModal';
import FleetOptimizationModal from '../components/planning/FleetOptimizationModal';
import RouteComparisonModal from '../components/planning/RouteComparisonModal';
import DriverActivityTimeline from '../components/planning/DriverActivityTimeline';
import TrafficIncidentsModal from '../components/planning/TrafficIncidentsModal';

function useResizableSidebar(initialWidth: number = 300, minWidth: number = 220, maxWidth: number = 650) {
  const [width, setWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('planning_pool_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) return parsed;
      }
    }
    return initialWidth;
  });
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);
  const startXRef = useRef(0);
  const startWidthRef = useRef(width);

  useEffect(() => { 
    widthRef.current = width; 
    if (typeof window !== 'undefined') {
      localStorage.setItem('planning_pool_width', String(width));
    }
  }, [width]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startXRef.current = e.clientX;
    startWidthRef.current = widthRef.current;
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      let newWidth = startWidthRef.current + delta;
      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, minWidth, maxWidth]);

  return { width, isResizing, startResizing };
}

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
    let orderPallets = 0;
    let orderWeight = 0;
    let orderVolume = 0;
    let orderLdm = 0;
    let orderHasLdm = false;

    if (Array.isArray(o?.cargoItems) && o.cargoItems.length > 0) {
      for (const c of o.cargoItems) {
        orderWeight += Number(c.weightKg) || 0;
        if (c.ldm != null && Number(c.ldm) > 0) {
          orderLdm += Number(c.ldm);
          orderHasLdm = true;
        }
        orderVolume += Number(c.volumeCbm) || 0;
        orderPallets += Number(c.quantity != null ? c.quantity : 0);
      }
    } else {
      orderWeight = Number(o?.weightKg || o?.totalWeightKg || 0);
      orderPallets = Number(o?.pallets || o?.totalPallets || 0);
      orderVolume = Number(o?.volumeCbm || o?.totalVolumeCbm || 0);
      if (o?.loadingMeters != null && Number(o.loadingMeters) > 0) {
        orderLdm = Number(o.loadingMeters);
        orderHasLdm = true;
      }
    }

    weight += orderWeight;
    pallets += orderPallets;
    volume += orderVolume;
    ldm += orderLdm;
    if (orderHasLdm) hasLdm = true;
  }
  return { weight, ldm, hasLdm, pallets, volume, ldmFormatted: hasLdm ? fmtNumber(ldm, 1) : '—' };
}

// Human-friendly driver name: prefer a real name, otherwise derive a readable
// full name from the e-mail local part (e.g. "sofer.bogdan.popa3@…" -> "Bogdan Popa").
function driverDisplayName(driver: any): string {
  if (!driver) return '';
  const n = driverEntityDisplayName(driver);
  return n === '—' ? '' : n;
}

function tripOriginDestination(trip: any) {
  const stops = (trip?.stops || []).slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  const first = stops[0];
  const last = stops[stops.length - 1];
  const origin = first?.city || first?.address?.split(',')[0] || (trip.orders?.[0]?.stops?.find((s: any) => s.type === 'pickup')?.city) || '—';
  const dest = last?.city || last?.address?.split(',')[0] || (trip.orders?.[0]?.stops?.filter((s: any) => s.type === 'delivery').pop()?.city) || '—';
  return { origin, dest };
}

// Planning blocks use the same semantic tones as every other status surface.
const planningTone = (status: string) => statusTone(status);

// KPI pill palette: a coloured dot + a discreet chip background for each state.
const KPI_COLORS: Record<string, { dot: string; active: string; idle: string }> = {
  blue:    { dot: 'bg-blue-500',    active: 'bg-blue-500 text-white border-transparent',    idle: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20' },
  amber:   { dot: 'bg-amber-500',   active: 'bg-amber-500 text-white border-transparent',   idle: 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20' },
  red:     { dot: 'bg-red-500',     active: 'bg-red-500 text-white border-transparent',     idle: 'bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20' },
  emerald: { dot: 'bg-emerald-500', active: 'bg-emerald-500 text-white border-transparent', idle: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' },
  purple:  { dot: 'bg-purple-500',  active: 'bg-purple-500 text-white border-transparent',  idle: 'bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20' },
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
  const [showTraffic, setShowTraffic] = useState(true);
  const [showTolls, setShowTolls] = useState(false);
  const [showDropHook, setShowDropHook] = useState(true);
  const [showCrossDock, setShowCrossDock] = useState(true);
  const [showConflicts, setShowConflicts] = useState(true);

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
    (mapData?.droppedTrailers || []).forEach((d: any) => { if (d.lat && d.lng) { bounds.extend([d.lng, d.lat]); has = true; } });
    (mapData?.crossDockFacilities || []).forEach((c: any) => { if (c.lat && c.lng) { bounds.extend([c.lng, c.lat]); has = true; } });
    if (has) { try { map.fitBounds(bounds, { padding: 60, maxZoom: 13 }); } catch {} }
  }, [mapData]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    markersRef.current.forEach(m => { try { m.remove(); } catch {} });
    markersRef.current = [];
    try { if (map.getLayer('routes')) map.removeLayer('routes'); if (map.getSource('routes')) map.removeSource('routes'); } catch {}

    if (showRoutes && mapData?.routes?.length) {
      const features = mapData.routes.filter((r: any) => r.points?.length >= 2).map((r: any) => {
        const isDelayed = showTraffic && (r.trafficDelayMinutes > 0 || r.isDelayed);
        const color = isDelayed ? '#ef4444' : planningTone(r.status).accent;
        return {
          type: 'Feature',
          properties: { tripId: r.tripId, color, selected: r.tripId === selectedTripId },
          geometry: { type: 'LineString', coordinates: r.points.map((p: number[]) => [p[1], p[0]]) },
        };
      });
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
        const hasConflict = showConflicts && s.hasConflict;
        el.className = `w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-black shadow cursor-pointer ${
          hasConflict ? 'bg-red-600 ring-2 ring-red-400 animate-bounce' : s.type === 'pickup' ? 'bg-blue-600' : 'bg-emerald-600'
        }`;
        el.textContent = hasConflict ? '!' : String(s.sequence || '·');
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

    // Drop & Hook Dropped Trailer Layer
    if (showDropHook && mapData?.droppedTrailers?.length) {
      for (const d of mapData.droppedTrailers) {
        if (!d.lat || !d.lng) continue;
        const el = document.createElement('div');
        el.className = 'flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-black border border-white shadow-md cursor-pointer hover:scale-105 transition-transform';
        el.innerHTML = `<span>⏚</span><span>${d.plateNumber || 'Trailer'}</span>`;
        el.title = `Dropped Trailer: ${d.plateNumber} @ ${d.location || 'Yard'}`;
        const marker = new maplibregl.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(map);
        markersRef.current.push(marker);
      }
    }

    // Cross-Dock Facilities Layer
    if (showCrossDock && mapData?.crossDockFacilities?.length) {
      for (const c of mapData.crossDockFacilities) {
        if (!c.lat || !c.lng) continue;
        const el = document.createElement('div');
        el.className = 'flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-700 text-white text-[9px] font-black border border-white shadow-md cursor-pointer hover:scale-105 transition-transform';
        el.innerHTML = `<span>⇄</span><span>${c.name || 'Hub'}</span>`;
        el.title = `Cross-Dock Hub: ${c.name}`;
        const marker = new maplibregl.Marker({ element: el }).setLngLat([c.lng, c.lat]).addTo(map);
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
  }, [mapReady, mapData, showRoutes, showVehicles, showStops, showTraffic, showTolls, showDropHook, showCrossDock, showConflicts, selectedTripId, onSelectTrip, fitAll]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      <div className="absolute top-4 left-4 z-10 bg-card/90 backdrop-blur p-2 rounded-xl border border-border shadow-lg text-xs space-y-1.5 max-h-[85vh] overflow-y-auto">
        <div className="text-[10px] font-bold text-text-secondary uppercase px-1 flex items-center gap-1.5 border-b border-border pb-1"><Layers className="w-3 h-3 text-primary" /> {t('layer_routes','Layers')}</div>
        {([
          ['showRoutes',showRoutes,setShowRoutes,t('layer_routes','Routes')],
          ['showStops',showStops,setShowStops,t('layer_stops','Stops')],
          ['showVehicles',showVehicles,setShowVehicles,t('layer_vehicles','Vehicles')],
          ['showTraffic',showTraffic,setShowTraffic,t('layer_traffic','Traffic & Delay')],
          ['showTolls',showTolls,setShowTolls,t('layer_tolls','Toll Cost Estimates')],
          ['showDropHook',showDropHook,setShowDropHook,t('layer_drop_hook','Drop & Hook')],
          ['showCrossDock',showCrossDock,setShowCrossDock,t('layer_cross_dock','Cross-Dock Hubs')],
          ['showConflicts',showConflicts,setShowConflicts,t('layer_conflicts','Conflicts')],
        ] as [string,boolean,(v:boolean)=>void,string][]).map(([k,v,sv,label]) => (
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
  const p = String(order.priority || 'normal').trim().toLowerCase();
  const isCritical = p === 'critical' || p === 'urgent';
  const isHigh = p === 'high';
  const isDragging = draggingId === order.id;

  // Real ADR detection: order must have actual dangerous goods items or classified UN / ADR class
  const adrItem = order.cargoItems?.find((c: any) => c.unNumber || c.adrClass);
  const isAdr = Boolean(adrItem || (order.isAdr && order.cargoItems?.some((c: any) => c.unNumber || c.adrClass)));

  // Date formatting for pickup and delivery
  const fmtStopDate = (stop: any) => {
    const dStr = stop?.dateFrom || stop?.scheduledDate;
    if (!dStr) return null;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return String(dStr).slice(0, 10);
    const dateFormatted = d.toLocaleDateString([], { day: 'numeric', month: 'short' });
    return stop.timeFrom ? `${dateFormatted} ${stop.timeFrom}` : dateFormatted;
  };
  const pickupDate = fmtStopDate(pickup);
  const dropoffDate = fmtStopDate(dropoff);

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('orderId', order.id);
        e.dataTransfer.setData('text/plain', order.id);
        e.dataTransfer.effectAllowed = 'move';
        setDraggingId(order.id);
      }}
      onDragEnd={() => setDraggingId(null)}
      onClick={() => onDetail?.(order)}
      className={`group rounded-xl p-2 cursor-pointer transition-all select-none border flex flex-col justify-between ${
        isDragging ? 'opacity-40 scale-95 border-primary shadow-lg bg-primary/5'
        : selected ? 'border-primary ring-1 ring-primary/30 shadow bg-card'
        : 'border-border hover:border-primary/50 hover:shadow bg-card'
      }`}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={e => { e.stopPropagation(); onToggle?.(order.id, !selected); }}
            className="text-text-secondary hover:text-primary shrink-0">
            {selected ? <CheckSquare className="w-3.5 h-3.5 text-primary" /> : <Square className="w-3.5 h-3.5" />}
          </button>
          <span className="font-bold text-text-primary text-[11px] truncate">{order.orderNumber || '—'}</span>
          {isCritical && (
            <span className="px-1 py-0 text-[7px] font-black bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 rounded shrink-0">
              {t('priority_critical', 'CRITICAL')}
            </span>
          )}
          {isHigh && (
            <span className="px-1 py-0 text-[7px] font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded shrink-0">
              {t('priority_high', 'HIGH')}
            </span>
          )}
          {isAdr && (
            <span
              className="px-1 py-0 text-[7px] font-black bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 rounded shrink-0"
              title={adrItem?.unNumber ? `ADR ${adrItem.unNumber}` : "ADR Dangerous Goods"}
            >
              {adrItem?.unNumber ? `ADR ${adrItem.unNumber}` : "ADR"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-1.5 py-0 text-[8px] font-black rounded-full bg-primary/10 text-primary border border-primary/20">{(order.transportType || 'FTL').toUpperCase()}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 text-[10px] text-text-secondary truncate">
        <div className="flex items-center gap-1 truncate">
          <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
          <span className="truncate font-medium text-text-primary">{pickup?.city || pickup?.address?.split(',')[0] || '—'}</span>
          <ArrowRight className="w-2 h-2 shrink-0 text-text-muted" />
          <MapPin className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
          <span className="truncate font-medium text-text-primary">{dropoff?.city || dropoff?.address?.split(',')[0] || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-black text-text-primary text-[10px]">
          {cargo.pallets > 0 && (
            <span className="inline-flex items-center gap-1">
              <PalletIcon className="w-3.5 h-3.5" />
              {cargo.pallets}p
            </span>
          )}
          {cargo.weight > 0 && (
            <span className="inline-flex items-center gap-1">
              <WeightKgIcon className="w-3.5 h-3.5" />
              {fmtNumber(cargo.weight)}kg
            </span>
          )}
        </div>
      </div>

      {(pickupDate || dropoffDate) && (
        <div className="flex items-center justify-between text-[9px] text-text-secondary pt-1 mt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            {pickupDate && (
              <span className="flex items-center gap-0.5 text-blue-600 dark:text-blue-400 font-semibold" title={t('loading_stop', 'Încărcare')}>
                <span className="text-[10px] leading-none font-black">↑</span>
                <span>{pickupDate}</span>
              </span>
            )}
            {pickupDate && dropoffDate && <ArrowRight className="w-2 h-2 text-text-muted shrink-0" />}
            {dropoffDate && (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-semibold" title={t('unloading_stop', 'Descărcare')}>
                <span className="text-[10px] leading-none font-black">↓</span>
                <span>{dropoffDate}</span>
              </span>
            )}
          </div>
          {order.client?.name && (
            <span className="text-[9px] text-text-muted truncate max-w-[80px]" title={order.client.name}>
              {order.client.name}
            </span>
          )}
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
  const tone = planningTone(st);
  const col = { border: tone.border, text: tone.text, bg: tone.soft };
  const hex = tone.accent;
  const { origin, dest } = tripOriginDestination(trip);
  const cargo = sumCargo(trip.orders || []);
  const revenue = (trip.orders || []).reduce((s: number, o: any) => s + (Number(o.price) || 0), 0);
  const ordersCount = (trip.orders || []).filter((o: any) => o?.id).length;
  const driverName = driverDisplayName(trip.driver || trip.truck?.driver);
  const trailerPlate = trip.trailer?.plateNumber || trip.trailerPlate || trip.truck?.trailer?.plateNumber || '';
  const blockWidthPct = pos.width;
  const isVeryNarrow = blockWidthPct < 4;
  const isNarrow = blockWidthPct < 10;

  return (
    <div
      draggable={['planning', 'planned', 'assigned'].includes(st)}
      onDragStart={(e) => {
        e.stopPropagation();
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'assigned-trip',
          tripId: trip.id,
          tripNumber: trip.tripNumber,
          orderIds: (trip.orders || []).map((o: any) => o.id).filter(Boolean),
        }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="absolute top-1 bottom-1 cursor-pointer group/block z-[5]"
      style={{ left: `${pos.left}%`, width: `${pos.width}%`, minWidth: '3rem' }}
      onClick={onClick}
      title={['planning', 'planned', 'assigned'].includes(st) ? t('drag_trip_to_unassign', 'Trage spre Order Pool pentru a dezasocia, sau click pentru detalii') : undefined}
    >
      <div
        className={`h-full rounded-xl border-2 overflow-hidden transition-all duration-150 flex flex-col ${
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
        <div className="h-[3px] w-full shrink-0" style={{ background: hex }} />

        <div className="px-2 py-1 flex flex-col justify-between flex-1 min-h-0 overflow-hidden gap-px">
          {/* Row 1: Trip number + status + fleet badge */}
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <span className={`font-black truncate ${col.text} ${isVeryNarrow ? 'text-[8px]' : 'text-[10px]'}`} style={{ maxWidth: isNarrow ? '100%' : '65%' }}>
              {trip.tripNumber || '—'}
            </span>
            {!isVeryNarrow && (
              <span className={`shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase ${col.text} opacity-80`}>
                {t(`status_${st}`, st)}
              </span>
            )}
            {trip.fleetType === 'subcontractor' && (
              <span className="shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30" title={`Subcontractor: ${trip.carrierName || 'External'}`}>
                SUB
              </span>
            )}
            {trip.fleetType === 'charter' && (
              <span className="shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase bg-pink-500/20 text-pink-700 dark:text-pink-300 border border-pink-500/30" title="Spot Charter Carrier">
                CHARTER
              </span>
            )}
            {tripIsAdr(trip) && (
              <span className="shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30" title="ADR Hazardous Trip">
                ADR
              </span>
            )}
            {trip.trafficDelayMinutes > 0 && (
              <span className="shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase bg-red-500/20 text-red-600 border border-red-500/30" title={`Traffic delay: +${trip.trafficDelayMinutes} min`}>
                +{trip.trafficDelayMinutes}m
              </span>
            )}
          </div>

          {/* Row 2: Route */}
          {!isNarrow && origin !== '—' && (
            <div className="text-[8px] text-text-primary truncate flex items-center gap-0.5">
              <MapPin className="w-2 h-2 shrink-0 text-blue-500" />
              <span className="truncate">{origin}</span>
              {dest !== '—' && <><ArrowRight className="w-1.5 h-1.5 shrink-0 opacity-60" /><span className="truncate">{dest}</span></>}
            </div>
          )}

          {/* Row 3: Driver + departure/arrival */}
          {!isVeryNarrow && (
            <div className="flex items-center gap-1 flex-wrap">
              {driverName && (
                <span className="text-[8px] text-text-secondary font-semibold truncate flex items-center gap-0.5">
                  <Users className="w-2 h-2 shrink-0" />{driverName}
                </span>
              )}
              {trailerPlate && (
                <span className="text-[8px] text-text-secondary font-semibold truncate flex items-center gap-0.5" title={t('trailer', 'Trailer')}>
                  <TruckIcon className="w-2 h-2 shrink-0 opacity-80" />{trailerPlate}
                </span>
              )}
              {!isNarrow && trip.plannedDeparture && (
                <span className="text-[8px] text-text-secondary">
                  {fmtTime(trip.plannedDeparture)}{trip.plannedArrival ? ` → ${fmtTime(trip.plannedArrival)}` : ''}
                </span>
              )}
            </div>
          )}

          {/* Row 4: Cargo + revenue */}
          {!isVeryNarrow && (cargo.weight > 0 || revenue > 0) && (
            <div className="flex items-center gap-1.5">
              {cargo.weight > 0 && <span className="text-[8px] text-text-secondary inline-flex items-center gap-0.5"><WeightKgIcon className="w-3 h-3" />{fmtNumber(cargo.weight)}kg</span>}
              {cargo.pallets > 0 && <span className="text-[8px] text-text-secondary inline-flex items-center gap-0.5"><PalletIcon className="w-3 h-3" />{cargo.pallets}p</span>}
              {revenue > 0 && <span className="text-[8px] font-black" style={{ color: hex }}>{fmtMoney(revenue, 'EUR')}</span>}
              {ordersCount > 0 && <span className="text-[8px] text-text-secondary">·{ordersCount}ord</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact Capacity Micro-Bar (Weight & Pallets) ───────────────────────────
function CapacityIndicator({ icon: Icon, text, pct, tooltip }: {
  icon: any; text: string; pct: number; tooltip: string;
}) {
  const over = pct > 100;
  const tone = over || pct >= 91 ? '#EF4444' : pct >= 71 ? '#F59E0B' : '#22C55E';
  return (
    <div className="flex-1 min-w-0" title={tooltip}>
      <div className="flex items-center gap-1" style={{ color: tone }}>
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className={`text-[8px] font-bold truncate ${over ? 'animate-pulse' : ''}`}>{text}</span>
      </div>
      <div className="h-[3px] w-full rounded-full bg-border/50 overflow-hidden mt-0.5">
        <div
          className={`h-full rounded-full transition-all duration-300 ${over ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, background: tone }}
        />
      </div>
    </div>
  );
}

// ─── Resource Row (Gantt Row) ────────────────────────────────────────────────────────
function ResourceRow({
  resource, trips, fromDate, totalMinutes, hoursVisible, selectedTripId, onSelectTrip, onDropOrder, draggingId, draggingOrder, onOpenPlanner,
  hosSummary = {}, grouping = 'truck', colWidth = 52, timelineWidth,
}: {
  resource: any; trips: any[]; fromDate: string; totalMinutes: number; hoursVisible: number; selectedTripId: string | null;
  onSelectTrip: (id: string) => void; onDropOrder: (resourceId: string, orderId?: string) => void; draggingId: string | null; draggingOrder?: any;
  onOpenPlanner: (resource: any) => void;
  hosSummary?: Record<string, any>; grouping?: 'truck' | 'driver' | 'trailer';
  colWidth?: number; timelineWidth?: number;
}) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const cargo = sumCargo(trips.filter((tr: any) => !['completed', 'closed', 'cancelled'].includes(tr.status)).flatMap((tr: any) => tr.orders || []));
  const mw = resource.maxWeightKg || 24000;
  const mp = resource.maxPallets || 33;
  const st = String(resource.status || 'available').toLowerCase();
  const isMaintenance = st === 'maintenance';
  const statusDot = { active:'bg-emerald-400', available:'bg-emerald-400', assigned:'bg-blue-400', driving:'bg-amber-400', maintenance:'bg-red-400', inactive:'bg-slate-400' }[st] || 'bg-slate-400';
  const hasTrips = trips.length > 0;
  const calcTimelineWidth = timelineWidth || (hoursVisible * colWidth);

  // Smart capacity feedback for drag-over
  const draggingWeight = draggingOrder ? sumCargo([draggingOrder]).weight : 0;
  const weightRemaining = mw - cargo.weight;
  const resultWeight = cargo.weight + draggingWeight;
  const capPct = mw > 0 ? Math.round((resultWeight / mw) * 100) : 0;
  const isOverloaded = resultWeight > mw;
  const isNearCap = !isOverloaded && capPct >= 90;
  const canAcceptDrag = !isMaintenance && (draggingWeight === 0 || !isOverloaded);

  // Dynamic capacity indicators (weight + pallets)
  const weightPct = mw > 0 ? (cargo.weight / mw) * 100 : 0;
  const palletPct = mp > 0 ? (cargo.pallets / mp) * 100 : 0;
  const driverLabel = driverDisplayName(resource.driver);
  const weightText = `${(cargo.weight / 1000).toFixed(1)}t / ${(mw / 1000).toFixed(0)}t`;
  const palletText = `${Math.round(cargo.pallets)} / ${mp} plt`;
  const weightTooltip = `${t('capacity_weight', 'Weight')}: ${fmtNumber(cargo.weight)} kg / ${fmtNumber(mw)} kg (${Math.round(weightPct)}%), ${t('remaining', 'remaining')}: ${fmtNumber(Math.max(0, weightRemaining))} kg`;
  const palletTooltip = `${t('capacity_pallets', 'Pallets')}: ${Math.round(cargo.pallets)} / ${mp} EUROPAL (${Math.round(palletPct)}%)`;

  // Driver HOS summary lookup
  const driverId = grouping === 'driver' ? resource.id : (resource.driver?.id || null);
  const hos = driverId ? hosSummary?.[driverId] : null;

  const dragZoneClass = isDragOver
    ? (isMaintenance
        ? 'bg-red-500/10 ring-2 ring-red-500/40 ring-inset'
        : canAcceptDrag
          ? isNearCap
            ? 'bg-amber-500/10 ring-2 ring-amber-500/40 ring-inset'
            : 'bg-emerald-500/10 ring-2 ring-emerald-500/40 ring-inset'
          : 'bg-red-500/10 ring-2 ring-red-500/40 ring-inset')
    : 'bg-gradient-to-b from-surface/20 via-transparent to-surface/10';

  const handleRowDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOver) setIsDragOver(true);
  };

  const handleRowDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleRowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedId = e.dataTransfer.getData('orderId') || e.dataTransfer.getData('text/plain') || draggingId;
    if (!isMaintenance && droppedId) {
      onDropOrder(resource.id, droppedId);
    }
  };

  return (
    <div
      className={`flex border-b-2 border-border min-h-[96px] group transition-colors ${isMaintenance ? 'bg-red-500/[0.02] hover:bg-red-500/[0.04]' : 'hover:bg-primary/[0.02]'}`}
      style={{ minWidth: `${224 + calcTimelineWidth}px` }}
    >
      {/* Resource Column — sticky left — CLICKABLE & DROP TARGET */}
      <div
        className={`w-56 shrink-0 px-2 py-1 border-r flex flex-col justify-center gap-0.5 sticky left-0 z-10 shadow-[2px_0_6px_rgba(0,0,0,0.06)] cursor-pointer group/truck transition-all ${
          isDragOver
            ? (isMaintenance ? 'bg-red-500/20 ring-2 ring-red-500 ring-inset' : 'bg-primary/20 ring-2 ring-primary ring-inset scale-[1.01]')
            : isMaintenance ? 'bg-red-500/5 border-red-500/30 hover:bg-red-500/10' : 'bg-card border-border hover:bg-primary/5'
        }`}
        onClick={() => onOpenPlanner(resource)}
        onDragOver={handleRowDragOver}
        onDragLeave={handleRowDragLeave}
        onDrop={handleRowDrop}
        title={t('pln_open_planner', 'Open Truck Route & Load Planner')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 shadow-sm transition-colors ${
              isMaintenance ? 'bg-red-500/10 border-red-500/30' : hasTrips ? 'bg-primary/10 border-primary/20 group-hover/truck:bg-primary/20' : 'bg-surface border-border'
            }`}>
              {grouping === 'driver' ? (
                <Users className={`w-3 h-3 ${hasTrips ? 'text-primary' : 'text-text-muted'}`} />
              ) : grouping === 'trailer' || resource.isTrailer ? (
                <TruckIcon className={`w-3 h-3 opacity-80 ${hasTrips ? 'text-primary' : 'text-text-muted'}`} />
              ) : (
                <TruckIcon className={`w-3 h-3 ${isMaintenance ? 'text-red-500' : hasTrips ? 'text-primary' : 'text-text-muted'}`} />
              )}
            </div>
            <p className="font-bold text-text-primary text-[11px] truncate" title={resource.brand ? `${resource.brand} ${resource.model || ''}` : ''}>
              {resource.plateNumber || resource.name || resource.user?.name || '—'} {isMaintenance ? '🔧' : ''}
            </p>
          </div>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot}`} title={st} />
        </div>

        <div className="flex items-center justify-between text-[10px] text-text-secondary pl-6">
          <div className="flex items-center gap-1 min-w-0 truncate">
            {grouping === 'truck' && driverLabel && (
              <>
                <span className="truncate" title={driverLabel}>{driverLabel}</span>
                {resource.trailer && <span className="text-text-muted">| T: {resource.trailer.plateNumber}</span>}
              </>
            )}
            {grouping === 'driver' && hos && (
               <span className="truncate">{hos.remaining}h rem</span>
            )}
            {(grouping === 'trailer' || resource.isTrailer) && resource.isDropped && (
              <span className="text-amber-600 truncate">Dropped @ {resource.dropLocation}</span>
            )}
          </div>
        </div>

        {/* Dynamic capacity micro-bars (weight + pallets) */}
        {grouping !== 'driver' && (
          <div className="flex items-center gap-2 pl-6 pr-1">
            <CapacityIndicator icon={WeightKgIcon} text={weightText} pct={weightPct} tooltip={weightTooltip} />
            <CapacityIndicator icon={PalletIcon} text={palletText} pct={palletPct} tooltip={palletTooltip} />
          </div>
        )}
      </div>

      {/* Timeline Area */}
      <div
        className={`relative flex-1 transition-all duration-150 ${dragZoneClass}`}
        style={{ minWidth: `${calcTimelineWidth}px` }}
        onDragOver={handleRowDragOver}
        onDragLeave={handleRowDragLeave}
        onDrop={handleRowDrop}
      >
        {/* Day / hour grid lines */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ minWidth: `${calcTimelineWidth}px` }}>
          {Array.from({ length: hoursVisible }, (_, h) => {
            const colDate = addDays(parseDay(fromDate), h);
            const isToday = dayStr(colDate) === dayStr(new Date());
            return (
              <div
                key={h}
                className={`flex-1 border-r border-border/20 last:border-0 ${
                  isToday ? 'bg-primary/[0.04]' : ''
                }`}
                style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
              />
            );
          })}
        </div>

        {/* Maintenance overlay */}
        {isMaintenance && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-[4]"
            style={{ background: 'repeating-linear-gradient(-45deg, rgba(239,68,68,0.06) 0px, rgba(239,68,68,0.06) 10px, transparent 10px, transparent 20px)' }}
          >
            <span className="text-[10px] font-black text-red-500/50 uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20 bg-card/80">
              🔧 {t('status_maintenance', 'Maintenance')}
            </span>
          </div>
        )}

        {/* Dynamic Capacity Drag Feedback Overlay */}
        {isDragOver && draggingId && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            {isMaintenance ? (
              <div className="px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-lg flex items-center gap-1.5 bg-red-500">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('maintenance_cannot_assign', 'In maintenance — cannot assign')}</span>
              </div>
            ) : (
              <div className="bg-card/95 backdrop-blur border border-border shadow-2xl rounded-2xl px-4 py-2.5 flex items-center gap-4 text-xs">
                <div>
                  <div className="text-[10px] text-text-muted font-bold uppercase">{t('capacity_preview', 'Capacity Preview')}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-text-secondary">{fmtNumber(cargo.weight)} kg</span>
                    <span className="text-primary font-bold">+{fmtNumber(draggingWeight)} kg</span>
                    <span className="text-text-primary font-black">→ {fmtNumber(resultWeight)} / {fmtNumber(mw)} kg</span>
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1.5 text-white ${
                  isOverloaded ? 'bg-red-500 shadow-red-500/30 shadow' : isNearCap ? 'bg-amber-500 shadow-amber-500/30 shadow' : 'bg-emerald-500 shadow-emerald-500/30 shadow'
                }`}>
                  {isOverloaded ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{t('capacity_exceeded', 'Capacity Exceeded')} ({capPct}%)</span>
                    </>
                  ) : isNearCap ? (
                    <>
                      <Clock3 className="w-3.5 h-3.5" />
                      <span>{t('capacity_near_limit', 'Near Capacity')} ({capPct}%)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('drop_here_label', 'Drop here')} ({capPct}%)</span>
                    </>
                  )}
                </div>
              </div>
            )}
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
  tripSummary, resources = [], drivers = [], trailers = [], conflicts = [], hosSummary = {},
  onClose, onAction, onReorderStops, onEditOrder, onSplitTrip, onCombineTrip, onAutoOrderStops,
  onDropHook, onCrossDock, onSubcontractor, onOpenDriverActivity,
  loadingAction, refreshKey,
}: {
  tripSummary: any; resources?: any[]; drivers?: any[]; trailers?: any[]; conflicts?: any[]; hosSummary?: Record<string, any>;
  onClose: () => void; onAction: (action: string, tripId: string, payload?: any) => void;
  onReorderStops: (tripId: string, stopIds: string[]) => void;
  onEditOrder?: (orderId: string, initialStep?: number, highlight?: string) => void;
  onSplitTrip?: (trip: any) => void;
  onCombineTrip?: (trip: any) => void;
  onAutoOrderStops?: (tripId: string) => void;
  onDropHook?: (payload: { mode: 'drop' | 'hook'; trailerId?: string; tripId?: string }) => void;
  onCrossDock?: (payload: { tripId?: string }) => void;
  onSubcontractor?: (trip: any) => void;
  onOpenDriverActivity?: (driver: any) => void;
  loadingAction?: string | null;
  refreshKey?: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [auditEvents, setAuditEvents] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'orders' | 'financial' | 'audit'>('stops');
  const [tripDetail, setTripDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Live traffic & European toll state
  const [checkingTraffic, setCheckingTraffic] = useState(false);
  const [trafficInfo, setTrafficInfo] = useState<any | null>(null);
  const [calculatingTolls, setCalculatingTolls] = useState(false);
  const [tollInfo, setTollInfo] = useState<any | null>(null);
  const [etaInfo, setEtaInfo] = useState<any | null>(null);
  const [loadingEta, setLoadingEta] = useState(false);

  useEffect(() => {
    setAuditEvents(null);
    setTripDetail(null);
    setTrafficInfo(null);
    setTollInfo(null);
    setEtaInfo(null);
    if (tripSummary?.id) {
      setDetailLoading(true);
      api.get(`/trips/${tripSummary.id}`)
        .then(r => setTripDetail(r.data))
        .catch(() => setTripDetail(tripSummary))
        .finally(() => setDetailLoading(false));
      api.get(`/planning/audit?tripId=${tripSummary.id}`)
        .then(r => setAuditEvents(r.data?.events || []))
        .catch(() => setAuditEvents([]));
    }
  }, [tripSummary?.id, refreshKey]);

  // Load the ETA automatically so the stop schedule is visible without an
  // extra click. The response still labels untimestamped positions honestly.
  useEffect(() => {
    if (!tripSummary?.id) return;
    let cancelled = false;
    planningApi.getTripLiveEta(tripSummary.id)
      .then((res) => { if (!cancelled) setEtaInfo(res); })
      .catch(() => { if (!cancelled) setEtaInfo(null); });
    return () => { cancelled = true; };
  }, [tripSummary?.id, refreshKey]);

  if (!tripSummary) return null;
  const trip = tripDetail || tripSummary;
  const assignment = tripSummary.assignment || trip.assignment || null;
  const summaryTruck = tripSummary.truck || null;
  const detailTruck = trip.truck || null;
  const truck =
    detailTruck ||
    summaryTruck ||
    resources.find((r: any) => r.id === (trip.truckId || tripSummary.truckId)) ||
    null;
  const driverId =
    assignment?.driverId ||
    trip.driverId ||
    tripSummary.driverId ||
    detailTruck?.driver?.id ||
    summaryTruck?.driver?.id ||
    null;
  // Explicit trip assignment wins; then the truck's attached driver. The detail
  // endpoint can load the truck without its driver, so keep the summary fallback.
  const driver =
    trip.driver ||
    tripSummary.driver ||
    detailTruck?.driver ||
    summaryTruck?.driver ||
    drivers.find((d: any) => d.id === driverId) ||
    null;
  const trailerId =
    assignment?.trailerId ||
    trip.trailerId ||
    tripSummary.trailerId ||
    detailTruck?.trailer?.id ||
    summaryTruck?.trailer?.id ||
    null;
  const trailer =
    trip.trailer ||
    tripSummary.trailer ||
    detailTruck?.trailer ||
    summaryTruck?.trailer ||
    trailers.find((trl: any) => trl.id === trailerId) ||
    null;
  const driverSource =
    assignment?.driverSource ||
    (trip.driver?.id || tripSummary.driver?.id
      ? 'assigned'
      : summaryTruck?.driver?.id || detailTruck?.driver?.id
        ? 'truck'
        : trip.carrierDriverName || tripSummary.carrierDriverName
          ? 'carrier'
          : 'none');
  // The board assignment is authoritative and carries the resolved name/plate
  // even when the detail endpoint has not loaded that relation yet.
  const assignedDriverName = String(assignment?.driverName || '').trim();
  const assignedTrailerPlate = String(assignment?.trailerPlate || '').trim();
  const notAssigned = t('not_assigned', 'Not assigned');
  const stops = (trip.stops?.length ? trip.stops : (tripSummary.stops?.length ? tripSummary.stops : [])).slice().sort((a: any, b: any) => (a.sequence || a.stopOrder || 0) - (b.sequence || b.stopOrder || 0));
  const etaStopFor = (stop: any) => (etaInfo?.stops || []).find(
    (etaStop: any) => etaStop.stopId === stop?.id || etaStop.sequence === stop?.sequence,
  ) || null;
  const etaDifferenceLabel = (value: any) => {
    if (value === null || value === undefined) return '—';
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return '—';
    const rounded = Math.round(minutes);
    if (rounded === 0) return t('up_eta_on_time', 'On time');
    return `${rounded > 0 ? '+' : '-'}${Math.abs(rounded)} ${t('up_eta_minutes', 'min')}`;
  };
  const orders = (trip.orders?.length ? trip.orders : (tripSummary.orders?.length ? tripSummary.orders : [])).map((o: any) => o?.order || o).filter((o: any) => o?.id);
  const revenue = orders.reduce((s: number, o: any) => s + (Number(o.price) || 0), 0);
  const tripConflicts = (conflicts || []).filter((c: any) => c.tripId === (trip.id || tripSummary.id));
  const blockingConflicts = tripConflicts.filter((c: any) => c.level === 'blocking' || c.severity === 'BLOCKING');
  const st = String((trip.status || tripSummary.status || 'planning')).toLowerCase();
  
  const isPlanning = ['planning', 'planned', 'assigned'].includes(st);
  const isConfirmed = st === 'confirmed' || st === 'assigned';
  const isDispatched = ['dispatched', 'driver_accepted', 'started', 'driving', 'partially_delivered'].includes(st);
  const isCompleted = ['completed', 'closed', 'delivered'].includes(st);
  const tone = planningTone(st);
  const col = { border: tone.border, text: tone.text, bg: tone.soft };
  const tripId = trip.id || tripSummary.id;
  const { origin, dest } = tripOriginDestination(trip);
  const trafficDelay = Number(trafficInfo?.currentDelayMinutes ?? trafficInfo?.delayMinutes ?? trip.trafficDelayMinutes ?? 0) || 0;
  const trafficLevel = trafficInfo?.congestionLevel || trafficInfo?.status || trip.trafficStatus || '';
  const tollAmount = tollInfo?.totalCost ?? tollInfo?.totalAmount ?? null;
  const hasTollAmount = tollAmount !== null && tollAmount !== undefined && Number.isFinite(Number(tollAmount));
  const costBreakdown = (trip as any).estimatedCostBreakdown || null;
  const storedTollAmount = Number(trip.tollCost ?? trip.tollAmount);
  const hasStoredToll = ['calculated', 'calculated_zero', 'estimated'].includes(String(trip.tollStatus || '')) && Number.isFinite(storedTollAmount);
  const tollStatusLabel = (status?: string) => {
    const key = `toll_status_${status || 'not_calculated'}`;
    return t(key, t('toll_status_not_calculated', 'Not calculated'));
  };

  const handleCheckTraffic = async () => {
    setCheckingTraffic(true);
    try {
      const res = await planningApi.checkTripTraffic(tripId);
      setTrafficInfo(res);
      if (res.available) {
        const delay = Number(res.currentDelayMinutes ?? res.delayMinutes ?? 0);
        if (delay > 0) toast.success(t('traffic_delay_success', { minutes: delay, defaultValue: 'Live traffic: +{{minutes}} min delay' }));
        else if ((res.incidents || []).length === 0) toast.success(t('traffic_no_incidents_success', 'Live traffic: no incidents reported on the route'));
        else toast.success(t('traffic_normal_success', 'Live traffic: normal conditions on the route'));
      } else {
        toast.error(providerStatusMessage(t, res.code, res.message || t('traffic_unavailable', 'Live traffic unavailable')));
      }
    } catch (err: any) {
      toast.error(providerStatusMessage(t, err?.response?.data?.code, t('traffic_request_failed', 'Live traffic request failed')));
    } finally {
      setCheckingTraffic(false);
    }
  };

  const handleCalculateTolls = async () => {
    setCalculatingTolls(true);
    try {
      const res = await planningApi.calculateTripTolls(tripId);
      setTollInfo(res);
      const totalCost = Number(res.totalCost);
      if (res.available && res.totalCost !== null && res.totalCost !== undefined && Number.isFinite(totalCost)) {
        const amount = fmtMoney(totalCost, res.currency || 'EUR');
        if (res.status === 'calculated_zero' || Number(res.totalCost) === 0) {
          toast.success(t('toll_confirmed_zero', { amount, defaultValue: 'Tolls confirmed: {{amount}} (provider returned zero)' }));
        } else {
          toast.success(t('toll_estimated_amount', { amount, defaultValue: 'Tolls estimated: {{amount}}' }));
        }
      } else {
        toast.error(providerStatusMessage(t, res.code, res.message || t('toll_unavailable', 'Toll calculation unavailable')));
      }
    } catch (err: any) {
      toast.error(providerStatusMessage(t, err?.response?.data?.code, t('toll_request_failed', 'Toll calculation request failed')));
    } finally {
      setCalculatingTolls(false);
    }
  };

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

  const handleResolveConflict = (c: any) => {
    const msg = String(c?.message || '').toLowerCase();
    const type = String(c?.type || '').toLowerCase();

    // ADR conflicts -> opens cargo items or vehicle profile
    if (type.includes('adr') || msg.includes('adr')) {
      if (type.includes('driver') || msg.includes('driver')) {
        navigate('/drivers' + (driver?.name ? `?search=${encodeURIComponent(driver.name)}` : ''));
        return;
      }
      if (type.includes('vehicle') || msg.includes('vehicle')) {
        navigate('/trucks?editId=' + encodeURIComponent(truck?.id || '') + '&search=' + encodeURIComponent(truck?.plateNumber || ''));
        return;
      }
      const targetId = c.orderId || orders[0]?.id;
      if (targetId && onEditOrder) {
        onEditOrder(targetId, 2, 'cargo');
        return;
      }
      setActiveTab('orders');
      return;
    }

    // Drop/Hook conflict
    if (type.includes('drop') || type.includes('hook') || msg.includes('drop') || msg.includes('hook')) {
      if (onDropHook) {
        onDropHook({ mode: trailer?.isDropped ? 'hook' : 'drop', trailerId: trailer?.id, tripId });
        return;
      }
    }

    // Subcontractor conflict
    if (type.includes('subcontractor') || msg.includes('subcontractor') || msg.includes('carrier')) {
      if (onSubcontractor) {
        onSubcontractor(trip);
        return;
      }
    }

    // Cross-dock conflict
    if (type.includes('cross_dock') || msg.includes('cross-dock')) {
      if (onCrossDock) {
        onCrossDock({ tripId });
        return;
      }
    }

    // Truck maintenance / vehicle status
    if (type.includes('vehicle') || msg.includes('maintenance') || msg.includes('truck') || msg.includes('itp') || (truck?.plateNumber && msg.includes(truck.plateNumber.toLowerCase()))) {
      navigate('/trucks?editId=' + encodeURIComponent(truck?.id || '') + '&search=' + encodeURIComponent(truck?.plateNumber || '') + '&highlight=status&returnToTrip=' + encodeURIComponent(tripId));
      return;
    }

    // Capacity overload
    if (type.includes('capacity') || msg.includes('weight') || msg.includes('exceed') || msg.includes('ldm') || msg.includes('volume') || msg.includes('pallet')) {
      let conflictField: 'weight' | 'ldm' | 'volume' | 'pallets' | 'cargo' = 'cargo';
      if (msg.includes('weight')) conflictField = 'weight';
      else if (msg.includes('ldm')) conflictField = 'ldm';
      else if (msg.includes('volume')) conflictField = 'volume';
      else if (msg.includes('pallet')) conflictField = 'pallets';

      let targetOrder = orders[0];
      if (orders.length > 1) {
        if (conflictField === 'ldm') {
          targetOrder = [...orders].sort((a, b) => sumCargo([b]).ldm - sumCargo([a]).ldm)[0] || orders[0];
        } else if (conflictField === 'weight') {
          targetOrder = [...orders].sort((a, b) => sumCargo([b]).weight - sumCargo([a]).weight)[0] || orders[0];
        } else if (conflictField === 'volume') {
          targetOrder = [...orders].sort((a, b) => sumCargo([b]).volume - sumCargo([a]).volume)[0] || orders[0];
        } else if (conflictField === 'pallets') {
          targetOrder = [...orders].sort((a, b) => sumCargo([b]).pallets - sumCargo([a]).pallets)[0] || orders[0];
        }
      }

      const targetId = targetOrder?.id || c.orderId || (stops.find((s: any) => s.orderId)?.orderId);
      if (targetId && onEditOrder) {
        onEditOrder(targetId, 2, conflictField);
        return;
      }
      setActiveTab('orders');
      return;
    }

    // Driver issues / HOS
    if (type.includes('driver') || msg.includes('driver') || msg.includes('hos') || msg.includes('rest')) {
      navigate('/drivers' + (driver?.name ? `?search=${encodeURIComponent(driver.name)}` : ''));
      return;
    }

    // Time window / Stop sequence / Route / GPS
    if (type.includes('time') || type.includes('route') || type.includes('stop') || type.includes('window') || type.includes('sequence') || msg.includes('time') || msg.includes('window') || msg.includes('late') || msg.includes('delay') || msg.includes('route') || msg.includes('gps') || msg.includes('stop')) {
      const targetId = c.orderId || (stops.find((s: any) => s.orderId)?.orderId) || orders[0]?.id;
      if (targetId && onEditOrder) {
        onEditOrder(targetId, 1, 'stops');
        return;
      }
      setActiveTab('stops');
      return;
    }

    if (c.orderId) {
      if (onEditOrder) onEditOrder(c.orderId, 2, 'cargo');
      else navigate(`/orders/${c.orderId}`);
      return;
    }

    setActiveTab('stops');
  };

  const getConflictActionLabel = (c: any) => {
    const msg = String(c?.message || '').toLowerCase();
    const type = String(c?.type || '').toLowerCase();
    if (type.includes('adr') || msg.includes('adr')) return 'Inspect ADR';
    if (type.includes('drop') || type.includes('hook')) return 'Manage Drop/Hook';
    if (type.includes('subcontractor')) return 'Manage Carrier';
    if (type.includes('cross_dock')) return 'Manage Cross-Dock';
    if (type.includes('equipment') || msg.includes('equipment')) return t('pln_edit_order_equipment', 'Edit Equipment Req');
    if (type.includes('vehicle') || msg.includes('maintenance') || msg.includes('truck') || msg.includes('itp') || (truck?.plateNumber && msg.includes(truck.plateNumber.toLowerCase()))) {
      return t('pln_fix_truck', 'Manage Truck') + (truck?.plateNumber ? ` (${truck.plateNumber})` : '');
    }
    if (type.includes('capacity') || msg.includes('weight') || msg.includes('exceed') || msg.includes('ldm') || msg.includes('volume') || msg.includes('pallet')) {
      return orders.length === 1
        ? `${t('pln_edit_order', 'Edit Order')} (${orders[0].orderNumber || ''})`
        : `${t('pln_review_orders', 'Review Orders')} (${orders.length})`;
    }
    if (type.includes('driver') || msg.includes('driver') || msg.includes('hos')) return t('pln_fix_driver', 'Manage Driver');
    if (c.orderId) return t('pln_edit_order', 'Edit Order');
    return t('pln_view_stops', 'View Stops');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return typeof document !== 'undefined' ? createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/60 backdrop-blur-md transition-all animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className={`relative w-[96vw] ${isExpanded ? 'max-w-[1800px]' : 'max-w-[1600px]'} max-h-[94vh] bg-card shadow-2xl flex flex-col rounded-3xl border border-border overflow-hidden animate-in zoom-in-95 duration-200 transition-all`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header: identity zone + actions zone */}
        <div className="p-4 sm:p-5 border-b border-border bg-surface/50 flex flex-wrap items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-black text-text-primary">{trip.tripNumber || tripSummary.tripNumber || 'Trip'}</h2>
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border-2 uppercase ${col.border} ${col.text}`}>{t(`status_${st}`, st)}</span>
              {trip.fleetType && trip.fleetType !== 'own_fleet' && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full border uppercase bg-violet-500/10 border-violet-500/30 text-violet-600">
                  {trip.fleetType === 'subcontractor' ? `Sub: ${trip.carrierName || 'Carrier'}` : 'Charter'}
                </span>
              )}
              {trip.validationStatus && (
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border uppercase ${
                  trip.validationStatus === 'feasible' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' :
                  trip.validationStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/30 text-amber-600' :
                  'bg-red-500/10 border-red-500/30 text-red-600'
                }`}>
                  {String(t(`status_${trip.validationStatus}`, trip.validationStatus))}
                </span>
              )}
              {detailLoading && <Loader2 className="w-4 h-4 animate-spin text-text-muted" />}
            </div>
            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 truncate">
              <span className="font-semibold text-text-primary">{origin}</span>
              <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
              <span className="font-semibold text-text-primary">{dest}</span>
              {(trip.distanceKm || tripSummary.distanceKm) && <><span>·</span><span className="font-semibold text-primary">{trip.distanceKm || tripSummary.distanceKm} km</span></>}
            </p>
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {/* Subcontractor / Charter allocation action */}
            <button
              onClick={() => onSubcontractor?.(trip)}
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-bold"
              title={t('subcontractor_planning', 'Subcontractor / Charter Planning')}
            >
              <Building2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t('fleet_subcontractor', 'Carrier')}</span>
            </button>
            {/* Cross-dock action */}
            <button
              onClick={() => onCrossDock?.({ tripId })}
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1 font-bold"
              title={t('cross_dock_title', 'Cross-Docking & Transshipment')}
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">{t('transshipment', 'Cross-Dock')}</span>
            </button>
            {truck?.id && (
              <button
                onClick={() => navigate(`/planning/planner/${truck.id}?date=${trip.plannedDeparture ? String(trip.plannedDeparture).split('T')[0] : ''}&trip=${tripId}`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-primary text-white shadow-sm hover:opacity-90 active:scale-95 transition-all"
                title={t('pln_open_planner', 'Route & Load Planner')}
              >
                <Sparkles className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('pln_planner', 'Route Planner')}</span>
              </button>
            )}
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
              className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
              title={t('download_trip_pdf', { reference: trip.tripNumber || 'Trip', defaultValue: 'Download trip sheet PDF: {{reference}}' })}
            >
              <FileText className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('pdf', 'PDF')}</span>
            </button>
            <button onClick={() => navigate(`/trips/${tripId}`)} className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /><span className="hidden sm:inline">{t('jsx_context_openTrip','Open')}</span>
            </button>
            <button onClick={() => setIsExpanded(p => !p)} className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors" title={isExpanded ? t('collapse', 'Collapse') : t('expand', 'Expand')}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              aria-label={t('close', 'Close')}
              className="p-1.5 shrink-0 hover:bg-red-500/10 hover:text-red-600 rounded-xl text-text-secondary transition-colors border border-border/40 hover:border-red-500/30"
              title={t('close', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Single scrollable content pane: header and footer stay fixed inside the rounded shell */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain custom-scrollbar">
        {/* Resources summary */}
        <div className="px-5 py-3 border-b border-border bg-surface/20 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="bg-card rounded-xl p-2.5 border border-border/60">
            <p className="text-text-secondary text-[10px]">{t('export_col_truck', 'Truck')}</p>
            <p className="font-black text-text-primary text-sm truncate mt-0.5">{truck?.plateNumber || trip.carrierTruckPlate || notAssigned}</p>
            {`${truck?.brand || ''} ${truck?.model || ''}`.trim() ? (
              <p className="text-[9px] text-text-muted mt-0.5 truncate">{`${truck?.brand || ''} ${truck?.model || ''}`.trim()}</p>
            ) : null}
          </div>

          <div className="bg-card rounded-xl p-2.5 border border-border/60">
            <div className="flex items-center justify-between">
              <p className="text-text-secondary text-[10px]">{t('export_col_driver', 'Driver')}</p>
              {driver?.id && hosSummary[driver.id] && (
                <span className={`text-[8px] font-black px-1 rounded uppercase ${
                  hosSummary[driver.id].over ? 'bg-red-500/15 text-red-600' : hosSummary[driver.id].remaining <= 5 ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'
                }`}>
                  {hosSummary[driver.id].over ? t('over_limit', 'Exceeded') : `${hosSummary[driver.id].remaining}h ${t('remaining', 'rem')}`}
                </span>
              )}
            </div>
            <p
              className="font-black text-text-primary text-sm truncate mt-0.5"
              title={
                driverSource === 'truck'
                  ? t('up_res_inherited_from_truck', 'Inherited from the truck’s default assignment')
                  : driverSource === 'carrier'
                    ? t('up_res_from_carrier', 'carrier')
                    : undefined
              }
            >
              {(driver && driverEntityDisplayName(driver) !== '—')
                ? driverEntityDisplayName(driver)
                : assignedDriverName || trip.carrierDriverName || tripSummary.carrierDriverName || notAssigned}
            </p>
            {driver?.id && hosSummary[driver.id] ? (
              <p className="text-[9px] text-text-muted mt-0.5 truncate flex items-center gap-1" title={`${hosSummary[driver.id].weeklyDriving}h used / 56h limit`}>
                <Clock3 className="w-2.5 h-2.5 shrink-0" />
                <span>{hosSummary[driver.id].weeklyDriving}h used / 56h limit</span>
              </p>
            ) : (
              (driver?.phone || trip.carrierDriverPhone) ? <p className="text-[9px] text-text-muted mt-0.5 truncate">{driver?.phone || trip.carrierDriverPhone}</p> : null
            )}
          </div>

          <div className="bg-card rounded-xl p-2.5 border border-border/60 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-text-secondary text-[10px]">{t('export_col_trailer', 'Trailer')}</p>
              <p
                className="font-black text-text-primary text-sm truncate mt-0.5"
                title={
                  assignment?.trailerSource === 'truck'
                    ? t('up_res_inherited_from_truck', 'Inherited from the truck’s default assignment')
                    : assignment?.trailerSource === 'carrier'
                      ? t('up_res_from_carrier', 'carrier')
                      : undefined
                }
              >
                {trailer?.plateNumber || assignedTrailerPlate || trip.carrierTrailerPlate || tripSummary.carrierTrailerPlate || notAssigned}
              </p>
              {trailer?.isDropped ? (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded truncate inline-block mt-0.5">
                  DROPPED @ {trailer.dropLocation || 'Yard'}
                </span>
              ) : trailer?.type ? (
                <p className="text-[9px] text-text-muted mt-0.5 truncate">{trailer.type}</p>
              ) : null}
            </div>
            {trailer?.id && (
              <button
                onClick={() => onDropHook?.({ mode: trailer.isDropped ? 'hook' : 'drop', trailerId: trailer.id, tripId })}
                className="btn-secondary text-[10px] py-1 px-2 font-bold flex items-center gap-1 shrink-0 ml-2"
                title={trailer.isDropped ? t('hook_trailer_title', 'Hook Trailer') : t('drop_trailer_title', 'Drop Trailer')}
              >
                {trailer.isDropped ? <LinkIcon className="w-3 h-3 text-emerald-600" /> : <Unplug className="w-3 h-3 text-amber-600" />}
                <span>{trailer.isDropped ? t('mode_hook', 'Hook') : t('mode_drop', 'Drop')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Traffic & European Tolls Strip (§6 & §7) */}
        <div className="px-5 py-2.5 border-b border-border bg-surface/30 grid grid-cols-2 gap-3 text-xs shrink-0">
          <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/70">
            <div className="flex items-center gap-2 min-w-0">
              <Clock3 className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-text-muted font-bold uppercase">{t('live_traffic', 'Live Traffic')}</p>
                <p className="text-xs font-bold text-text-primary truncate">
                  {trafficInfo?.available
                    ? (trafficDelay > 0 ? `+${trafficDelay}m delay${trafficLevel ? ` (${trafficLevel.replace(/_/g, ' ')})` : ''}` : t('normal_traffic', 'Normal traffic'))
                    : (trafficDelay > 0
                      ? `+${trafficDelay}m delay`
                      : providerStatusMessage(t, trafficInfo?.code, t('traffic_unavailable', 'Live traffic unavailable')))
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleCheckTraffic}
              disabled={checkingTraffic}
              className="btn-secondary text-[10px] py-1 px-2 font-bold flex items-center gap-1 shrink-0 ml-2"
            >
              {checkingTraffic ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>{t('check_live_traffic', 'Check')}</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/70">
            <div className="flex items-center gap-2 min-w-0">
              <Euro className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] text-text-muted font-bold uppercase">{t('toll_calculation', 'European Tolls')}</p>
                <p className="text-xs font-bold text-emerald-600 truncate">
                  {tollInfo?.available && hasTollAmount
                    ? `${fmtMoney(Number(tollAmount), tollInfo.currency || 'EUR')}${tollInfo.status === 'calculated_zero' ? ` · ${tollStatusLabel('calculated_zero')}` : ''}${(tollInfo.countries || []).length ? ` (${tollInfo.countries.join(', ')})` : ''}`
                    : (hasStoredToll
                      ? `${fmtMoney(storedTollAmount, trip.tollCurrency || 'EUR')}${String(trip.tollStatus) === 'calculated_zero' ? ` · ${tollStatusLabel('calculated_zero')}` : ''}`
                      : (tollInfo?.code ? providerStatusMessage(t, tollInfo.code, t('toll_unavailable', 'Toll calculation unavailable')) : tollStatusLabel(tollInfo?.status || trip.tollStatus)))
                  }
                </p>
              </div>
            </div>
            <button
              onClick={handleCalculateTolls}
              disabled={calculatingTolls}
              className="btn-secondary text-[10px] py-1 px-2 font-bold flex items-center gap-1 shrink-0 ml-2"
            >
              {calculatingTolls ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              <span>{t('calculate_tolls', 'Calculate')}</span>
            </button>
          </div>
        </div>





        {/* Live ETA + driver activity preview */}
        <div className="px-5 py-2 border-b border-border bg-surface/20 grid grid-cols-1 lg:grid-cols-2 gap-2 shrink-0">
          <div className="rounded-xl border border-border bg-card p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wide text-text-secondary truncate">
                  {etaInfo?.available && etaInfo?.etaType !== 'live_gps'
                    ? t('up_eta_calculated', 'Calculated ETA')
                    : t('up_eta_title', 'Live ETA')}
                </span>
                {etaInfo?.freshness && (
                  <span className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${etaInfo.etaType === 'live_gps' ? 'bg-emerald-500/15 text-emerald-600' : 'bg-amber-500/15 text-amber-600'}`}>
                    {etaInfo.etaType === 'live_gps'
                      ? t('up_eta_fresh', 'Live GPS')
                      : etaInfo.etaType === 'stale_gps'
                        ? t('up_eta_stale_label', 'Stale GPS')
                        : t('up_eta_untimed_label', 'No GPS timestamp')}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  setLoadingEta(true);
                  try {
                    const res = await planningApi.getTripLiveEta(tripId);
                    setEtaInfo(res);
                    if (!res.available) {
                      const fallback = res.message || t('up_eta_no_gps', 'No GPS position available for the assigned truck. Live ETA cannot be calculated.');
                      if (res.reason === 'provider_unavailable') toast.error(providerStatusMessage(t, res.code, fallback));
                      else toast(fallback, { icon: 'i' });
                    }
                  } catch (err: any) {
                    const fallback = err?.response?.data?.message || t('up_eta_unavailable', 'Live ETA unavailable — routing provider request failed.');
                    toast.error(providerStatusMessage(t, err?.response?.data?.code, fallback));
                  } finally {
                    setLoadingEta(false);
                  }
                }}
                disabled={loadingEta}
                className="btn-secondary text-[10px] py-1 px-2 font-bold flex items-center gap-1 shrink-0"
                title={t('up_eta_refresh', 'Update ETA')}
                aria-label={t('up_eta_refresh', 'Update ETA')}
              >
                {loadingEta ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                <span>{t('up_eta_refresh', 'Update ETA')}</span>
              </button>
            </div>
            {etaInfo ? (
              etaInfo.available ? (
                <div className="mt-1 space-y-1">
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-text-secondary">
                    <span>{t('up_eta_remaining', 'Remaining distance')}: <b className="text-text-primary">{fmtNumber(etaInfo.totalRemainingKm, 0)} km</b></span>
                    <span>{etaInfo.lastGpsAt ? t('up_eta_last_update', 'Last GPS update') : t('up_eta_last_position', 'Last known position')}: <b className="text-text-primary">{etaInfo.lastGpsAt ? new Date(etaInfo.lastGpsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('up_eta_no_timestamp', 'no timestamp')}</b></span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-text-secondary">
                    <span>{t('up_eta_source', 'Data source')}: <b className="text-text-primary">{etaInfo.source || '—'}</b></span>
                    <span>{t('up_eta_position_source', 'Position')}: <b className="text-text-primary">
                      {etaInfo.positionSource === 'telematics_device'
                        ? t('up_eta_source_telematics', 'Telematics device')
                        : etaInfo.positionSource === 'truck_record'
                          ? t('up_eta_source_truck', 'Truck position')
                          : '—'}
                    </b></span>
                  </div>
                  {(etaInfo.stops || []).slice(0, 3).map((stop: any) => (
                    <div key={stop.stopId} className="rounded-lg border border-border/50 bg-surface/40 px-2 py-1">
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="truncate text-text-secondary">#{stop.sequence} {stop.city || stop.companyName || t('up_eta_stop', 'Stop')}</span>
                        <span className="tabular-nums font-black text-text-primary">{fmtTime(stop.liveEta)}</span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[9px]">
                        <span className="text-text-muted">
                          {t('up_eta_planned', 'Planned ETA')}: <b className="tabular-nums text-text-secondary">{stop.plannedEta ? fmtTime(stop.plannedEta) : t('up_eta_not_planned', 'Not planned')}</b>
                        </span>
                        <span className={`font-black tabular-nums ${Number(stop.deviationMin) > 0 ? 'text-rose-600' : Number(stop.deviationMin) === 0 ? 'text-emerald-600' : 'text-text-muted'}`}>
                          {etaDifferenceLabel(stop.deviationMin)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {etaInfo.etaType === 'last_known_position' && (
                    <p className="text-[9px] text-amber-600">{t('up_eta_untimed_note', 'Calculated from the last saved truck position. No GPS timestamp is stored, so this is not a live GPS ETA.')}</p>
                  )}
                  {etaInfo.freshness === 'stale' && (
                    <p className="text-[9px] text-amber-600">{t('up_eta_stale', 'GPS position is older than 15 minutes — treat this ETA as stale.')}</p>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-text-muted">
                  {etaInfo.reason === 'provider_unavailable'
                    ? providerStatusMessage(t, etaInfo.code, etaInfo.message || t('up_eta_unavailable', 'Live ETA unavailable — routing provider request failed.'))
                    : (etaInfo.reason === 'no_gps'
                      ? t('up_eta_no_gps_fallback', 'Live GPS ETA is unavailable. Planned ETA remains available in the stop table.')
                      : (etaInfo.message || t('up_eta_no_gps', 'No GPS position available for the assigned truck. Live ETA cannot be calculated.')))}
                </p>
              )
            ) : (
              <p className="mt-1 text-[10px] text-text-muted">{t('up_eta_note', 'ETA uses the latest timestamped truck position and truck routing. Service time at stops is not included.')}</p>
            )}
          </div>
          {driver?.id ? (
            <DriverActivityTimeline
              driverId={driver.id}
              driverName={driverEntityDisplayName(driver)}
              compact
              onOpenFull={() => onOpenDriverActivity?.(driver)}
            />
          ) : (
            <div className="rounded-xl border border-border bg-card p-2.5 text-[10px] text-text-muted">
              {t('up_act_no_data', 'No tachograph activity records for this driver.')}
            </div>
          )}
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
        <div className="p-5 space-y-4">
          {detailLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-xs text-text-secondary">{t('loading_trip_details', 'Loading trip details…')}</span>
            </div>
          )}
          {!detailLoading && tripConflicts.length > 0 && (
            <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-red-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {t('jsx_attention', 'Attention / Conflicts')} ({tripConflicts.length})
                </h3>
                <span className="text-[10px] text-red-500 font-semibold">{t('pln_click_to_resolve', 'Click an issue to resolve')}</span>
              </div>
              {tripConflicts.map((c: any, cIdx: number) => {
                const isBlocking = c.level === 'blocking' || c.severity === 'BLOCKING';
                return (
                  <div
                    key={c.id || cIdx}
                    onClick={() => handleResolveConflict(c)}
                    className="group text-xs flex flex-col gap-1 bg-card hover:bg-red-500/10 p-2.5 rounded-xl border border-red-500/25 hover:border-red-500/50 cursor-pointer transition-all shadow-xs active:scale-[0.99]"
                    title={c.recommendedResolution || 'Click to navigate and fix this issue'}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase rounded text-white shrink-0 shadow-xs ${
                          isBlocking ? 'bg-red-500' : 'bg-amber-500'
                        }`}>
                          {isBlocking ? t('conflict_blocking', 'BLOCKING') : t('conflict_warning', 'WARNING')}
                        </span>
                        <span className="text-text-primary font-bold truncate">{c.message}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 shrink-0 group-hover:text-red-700">
                        <span className="hidden sm:inline">{getConflictActionLabel(c)}</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                    {c.recommendedResolution && (
                      <p className="text-[10px] text-text-secondary pl-1 italic">
                        💡 {c.recommendedResolution}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'stops' && (
            <div className="space-y-2.5">
              {/* Stops Top Action Bar */}
              <div className="flex items-center justify-between p-3 bg-surface/70 rounded-xl border border-border">
                <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span>{stops.length} {t('stops', 'Stops')} · {isConfirmed ? t('status_confirmed', 'Confirmed') : t(`status_${st}`, st)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isPlanning && stops.length > 1 && (
                    <button
                      disabled={!!loadingAction}
                      onClick={async () => {
                        const ok = await confirm({
                          type: 'info',
                          title: t('auto_order_stops', 'Auto-Order Stops'),
                          message: t('auto_order_confirm', 'Optimize stop sequence for this trip based on route coordinates?'),
                          confirmText: t('optimize', 'Optimize'),
                          cancelText: t('cancel', 'Cancel'),
                        });
                        if (ok) {
                          if (onAutoOrderStops) onAutoOrderStops(tripId);
                          else onAction('auto-order', tripId);
                        }
                      }}
                      className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1.5 font-bold"
                      title={t('auto_order_tooltip', 'Auto-order stops using route optimization')}
                    >
                      {loadingAction === 'auto-order' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5 text-primary" />}
                      <span>{t('auto_order_stops', 'Auto-order Stops')}</span>
                    </button>
                  )}
                  {st === 'planning' || st === 'planned' ? (
                    <button
                      disabled={!!loadingAction || blockingConflicts.length > 0}
                      onClick={() => onAction('confirm', tripId)}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-black shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{t('action_confirm_plan', 'Confirm Plan')}</span>
                    </button>
                  ) : (
                    <button
                      disabled={!!loadingAction}
                      onClick={() => onAction('send', tripId, { routeInfo: 'Dispatched from Stops Ordering' })}
                      className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 font-black shadow-md shadow-primary/20"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isDispatched ? t('action_send_update', 'Send Update') : t('action_send_to_driver', 'Send to Driver')}</span>
                    </button>
                  )}
                </div>
              </div>

              {stops.map((s: any, idx: number) => {
                const isPu = s.type === 'pickup';
                const hasTimeWindow = s.dateFrom || s.timeFrom;
                const etaStop = etaStopFor(s);
                const plannedStopEta = etaStop?.plannedEta || s.eta || null;
                const etaDeviation = etaStop?.deviationMin;
                return (
                  <div key={s.id || idx} className={`bg-card border rounded-xl overflow-hidden ${isPu ? 'border-blue-500/25' : 'border-emerald-500/25'}`}>
                    {/* Stop header */}
                    <div className={`px-3 py-2 flex items-center justify-between gap-2 ${isPu ? 'bg-blue-500/5' : 'bg-emerald-500/5'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 text-white ${
                          isPu ? 'bg-blue-500' : 'bg-emerald-500'
                        }`}>{idx + 1}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-text-primary text-sm truncate">{s.companyName || s.city || '—'}</span>
                            <span className={`text-[8px] font-bold rounded px-1 uppercase ${isPu ? 'text-blue-600 bg-blue-500/10' : 'text-emerald-600 bg-emerald-500/10'}`}>{isPu ? t('loading_stop','Pickup') : t('unloading_stop','Delivery')}</span>
                          </div>
                          <p className="text-xs text-text-secondary truncate">{s.address}{s.postalCode ? `, ${s.postalCode}` : ''} {s.country || ''}</p>
                        </div>
                      </div>
                      {isPlanning && (
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button disabled={idx === 0 || !!loadingAction} onClick={() => moveStop(idx, 'up')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                          <button disabled={idx === stops.length - 1 || !!loadingAction} onClick={() => moveStop(idx, 'down')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                    {/* Stop operational details */}
                    <div className="px-3 py-2 space-y-1.5">
                      {hasTimeWindow && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <Clock className="w-3 h-3 text-text-muted shrink-0" />
                          <span className="font-semibold text-text-primary">
                            {s.dateFrom ? fmtShort(s.dateFrom) : ''}{s.timeFrom ? ` ${s.timeFrom}` : ''}
                            {(s.dateTo || s.timeUntil) ? ` → ${s.dateTo ? fmtShort(s.dateTo) : ''}${s.timeUntil ? ` ${s.timeUntil}` : ''}` : ''}
                          </span>
                          <span className="text-text-muted">time window</span>
                        </div>
                      )}
                      <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border/60 bg-surface/50 px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-text-muted">{t('up_eta_calculated', 'Calculated ETA')}</p>
                          <p className="text-sm font-black tabular-nums text-text-primary">{etaStop?.liveEta ? fmtTime(etaStop.liveEta) : '—'}</p>
                          <p className="truncate text-[8px] text-text-muted">{etaStop?.liveEta ? fmtShort(etaStop.liveEta) : t('up_eta_no_estimate', 'No estimate')}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-text-muted">{t('up_eta_planned', 'Planned ETA')}</p>
                          <p className={`text-sm font-black tabular-nums ${plannedStopEta ? 'text-text-primary' : 'text-text-muted'}`}>{plannedStopEta ? fmtTime(plannedStopEta) : t('up_eta_not_planned', 'Not planned')}</p>
                          <p className="truncate text-[8px] text-text-muted">{plannedStopEta ? fmtShort(plannedStopEta) : '—'}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[8px] font-bold uppercase tracking-wide text-text-muted">{t('up_eta_difference', 'Difference')}</p>
                          <p className={`text-sm font-black tabular-nums ${Number(etaDeviation) > 0 ? 'text-rose-600' : Number(etaDeviation) === 0 ? 'text-emerald-600' : etaDeviation === null || etaDeviation === undefined ? 'text-text-muted' : 'text-emerald-600'}`}>{etaDifferenceLabel(etaDeviation)}</p>
                          <p className="truncate text-[8px] text-text-muted">{t('up_eta_schedule', 'vs schedule')}</p>
                        </div>
                      </div>
                      {s.reference && (
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <FileText className="w-3 h-3 text-text-muted shrink-0" />
                          <span className="text-text-muted">Ref:</span>
                          <span className="font-semibold text-text-primary">{s.reference}</span>
                        </div>
                      )}
                      {s.notes && (
                        <p className="text-[10px] text-text-secondary italic border-t border-border/40 pt-1">{s.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {stops.length === 0 && <p className="text-xs text-text-secondary text-center py-6">{t('no_stops', 'No stops defined')}</p>}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-2.5">
              {orders.map((o: any) => {
                const oc = sumCargo([o]);
                let activeHighlight = 'cargo';
                const conflict = tripConflicts.find((c: any) => c.level === 'blocking') || tripConflicts[0];
                if (conflict) {
                  const cm = String(conflict.message || '').toLowerCase();
                  if (cm.includes('weight')) activeHighlight = 'weight';
                  else if (cm.includes('ldm')) activeHighlight = 'ldm';
                  else if (cm.includes('volume')) activeHighlight = 'volume';
                  else if (cm.includes('pallet')) activeHighlight = 'pallets';
                }
                return (
                  <div
                    key={o.id}
                    className="bg-card border border-border/80 hover:border-primary/50 hover:bg-surface/50 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group shadow-xs"
                  >
                    <div
                      onClick={() => {
                        if (onEditOrder) onEditOrder(o.id, 2, activeHighlight);
                        else navigate(`/orders/${o.id}`);
                      }}
                      className="min-w-0 flex-1 cursor-pointer"
                      title={t('click_to_edit_order', 'Click to edit cargo')}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-black text-primary text-sm">{o.orderNumber || '—'}</span>
                        {o.client?.name && <span className="text-xs font-semibold text-text-primary truncate">· {o.client.name}</span>}
                        {orderIsAdr(o) && (
                          <AdrBadge
                            status={o.adrStatus}
                            points={o.adrTotalPoints}
                            exemptionType={o.adrExemptionApplied}
                          />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-[11px] text-text-secondary mt-1.5">
                        <span className="px-1.5 py-0.5 bg-surface rounded font-medium inline-flex items-center gap-1"><PalletIcon className="w-3.5 h-3.5" />{oc.pallets || o.pallets || 0} pal</span>
                        <span className="px-1.5 py-0.5 bg-surface rounded font-medium inline-flex items-center gap-1"><WeightKgIcon className="w-3.5 h-3.5" />{fmtNumber(oc.weight || o.weightKg || 0)} kg</span>
                        {(oc.ldm || o.loadingMeters) && <span className="px-1.5 py-0.5 bg-surface rounded font-medium">{oc.ldm || o.loadingMeters} LDM</span>}
                        {(oc.volume || o.volumeCbm) && <span className="px-1.5 py-0.5 bg-surface rounded font-medium">{oc.volume || o.volumeCbm} m³</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-text-primary text-sm mr-1">{fmtMoney(Number(o.price || 0), 'EUR')}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEditOrder) onEditOrder(o.id, 2, activeHighlight);
                          else navigate(`/orders/${o.id}`);
                        }}
                        className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                        title={t('edit_order_cargo', 'Edit Cargo Items')}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('edit', 'Edit')}</span>
                      </button>
                      {isPlanning && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const ok = await confirm({
                              type: 'warning',
                              title: t('unassign_order', 'Unassign Order'),
                              message: t('unassign_order_dialog', 'Remove this order from the trip and return it to the Unassigned Orders list?'),
                              confirmText: t('action_unassign_order', 'Unassign'),
                              cancelText: t('cancel', 'Cancel'),
                            });
                            if (ok) {
                              onAction('unassign-order', tripId, { orderId: o.id });
                            }
                          }}
                          className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
                          title={t('action_unassign_order', 'Unassign Order')}
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{t('action_unassign_order', 'Unassign')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {orders.length === 0 && <p className="text-xs text-text-secondary text-center py-6">{t('no_orders','No orders')}</p>}
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  [t('revenue','Revenue'), fmtMoney(revenue, 'EUR'), 'text-primary'],
                  [t('cost','Est. Cost'), fmtMoney(Number(trip.estimatedCost || 0), 'EUR'), 'text-text-secondary'],
                  [t('margin','Margin'), fmtMoney(revenue - Number(trip.estimatedCost || 0), 'EUR'), revenue >= Number(trip.estimatedCost || 0) ? 'text-emerald-500' : 'text-red-500'],
                ].map(([label, val, cls]) => (
                  <div key={label as string} className="bg-surface/60 rounded-xl p-3 border border-border">
                    <p className="text-xs text-text-secondary">{label}</p>
                    <p className={`font-black text-lg mt-0.5 ${cls}`}>{val}</p>
                  </div>
                ))}
              </div>

              {costBreakdown ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-surface/70 px-3 py-2 border-b border-border">
                    <span className="text-xs font-black text-text-primary">
                      {t('up_res_estimated_breakdown', 'Estimated cost breakdown')}
                    </span>
                    <span className="text-[9px] text-text-muted">
                      {t('up_res_cost_engine', 'CostEngine')}
                      {trip.costCalculatedAt ? ` · ${new Date(trip.costCalculatedAt).toLocaleString()}` : ''}
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {[
                      ['up_res_fuel', 'Fuel', 'fuelCost'],
                      ['up_res_toll', 'Toll', 'tollCost'],
                      ['up_res_driver', 'Driver', 'driverCost'],
                      ['up_res_maintenance', 'Maintenance', 'maintenanceCost'],
                      ['up_res_fixed', 'Fixed / ownership', 'fixedCost'],
                      ['up_res_manual', 'Manual / other', 'manualCost'],
                    ].map(([key, fallback, field]) => (
                      <div key={key} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                        <span className="text-text-secondary">{t(key, fallback)}</span>
                        <span className="font-bold tabular-nums text-text-primary">
                          {field === 'driverCost' && costBreakdown.driverCostSource === 'unavailable'
                            ? t('up_res_driver_unavailable', 'No valid driver compensation profile')
                            : costBreakdown[field] === null || costBreakdown[field] === undefined
                              ? t('pr.not_calculated', 'Not calculated')
                              : fmtMoney(Number(costBreakdown[field]), 'EUR')}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 bg-surface/70 px-3 py-2 text-xs font-black">
                      <span>{t('up_res_total', 'Total')}</span>
                      <span className="tabular-nums">
                        {costBreakdown.total === null || costBreakdown.total === undefined
                          ? t('pr.not_calculated', 'Not calculated')
                          : fmtMoney(Number(costBreakdown.total), 'EUR')}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-text-secondary">
                  {t('up_res_breakdown_missing', 'Estimated breakdown is not available. Recalculate the trip to generate it.')}
                </p>
              )}
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface/50 flex flex-col gap-2.5 shrink-0">
          {/* Blocking conflict alert */}
          {blockingConflicts.length > 0 && (
            <div
              onClick={() => handleResolveConflict(blockingConflicts[0])}
              className="flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/15 cursor-pointer transition-colors group"
              title="Click to resolve this blocking conflict"
            >
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-red-600">⛔ {t('cannot_confirm_blocking', 'Cannot confirm — blocking conflict')}</p>
                  <p className="text-[10px] text-red-500/80 mt-0.5 truncate">{blockingConflicts[0]?.message || t('resolve_blocking_first', 'Resolve blocking issues before confirming')}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 shrink-0 mt-1">
                <span className="hidden sm:inline">{getConflictActionLabel(blockingConflicts[0])}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <div className="flex flex-wrap gap-2 items-center">
              {st === 'planning' || st === 'planned' ? (
                <button
                  disabled={!!loadingAction || blockingConflicts.length > 0}
                  onClick={() => onAction('confirm', tripId)}
                  title={blockingConflicts.length > 0 ? t('resolve_blocking_first', 'Resolve blocking issues before confirming') : undefined}
                  className={`btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-black shadow-md shadow-primary/20 ${
                    blockingConflicts.length > 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loadingAction === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{t('action_confirm_plan', 'Confirm Plan')}</span>
                </button>
              ) : isConfirmed ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t('status_confirmed', 'Confirmed')}
                  </span>
                  <button
                    disabled={!!loadingAction}
                    onClick={() => onAction('send', tripId, { routeInfo: 'Dispatched from TRP' })}
                    className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-black shadow-md shadow-primary/20"
                  >
                    {loadingAction === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{t('action_send_to_driver', 'Send to Driver')}</span>
                  </button>
                  <button
                    disabled={!!loadingAction}
                    onClick={() => onAction('reopen', tripId)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('action_reopen_planning', 'Reopen Planning')}</span>
                  </button>
                </div>
              ) : isDispatched ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t(`status_${st}`, st)}
                  </span>
                  <button
                    onClick={() => navigate(`/tracking?tripId=${tripId}`)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold text-primary hover:bg-primary/10 border-primary/30"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{t('view_tracking_btn', 'View Tracking')}</span>
                  </button>
                  <button
                    disabled={!!loadingAction}
                    onClick={() => onAction('send', tripId, { routeInfo: 'Updated Route Plan' })}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    {loadingAction === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span>{t('action_send_update', 'Send Update')}</span>
                  </button>
                  <button
                    disabled={!!loadingAction}
                    onClick={() => onAction('reopen', tripId)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('action_reopen_planning', 'Reopen Planning')}</span>
                  </button>
                </div>
              ) : isCompleted ? (
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-xs font-black flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> {t(`status_${st}`, st)}
                  </span>
                  <button
                    onClick={() => navigate(`/tracking?tripId=${tripId}`)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold text-primary hover:bg-primary/10 border-primary/30"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>{t('view_tracking_btn', 'View Tracking')}</span>
                  </button>
                </div>
              ) : null}

              {isPlanning && orders.length > 1 ? (
                <button
                  disabled={!!loadingAction}
                  onClick={() => {
                    if (onSplitTrip) onSplitTrip(trip);
                    else onAction('split', tripId);
                  }}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold text-amber-600 hover:text-amber-700"
                  title={t('jsx_context_split', 'Split Trip')}
                >
                  <SplitSquareHorizontal className="w-4 h-4 text-amber-500" />
                  <span>{t('jsx_context_split', 'Split')}</span>
                </button>
              ) : null}

              {isPlanning && (
                <button
                  disabled={!!loadingAction}
                  onClick={() => {
                    if (onCombineTrip) onCombineTrip(trip);
                  }}
                  className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  title={t('combine_trips', 'Combine Trips')}
                >
                  <GitMerge className="w-4 h-4 text-primary" />
                  <span>{t('combine_trips', 'Combine')}</span>
                </button>
              )}
            </div>

            {isPlanning && (
              <button
                disabled={!!loadingAction}
                onClick={async () => {
                  const ok = await confirm({
                    type: 'danger',
                    title: t('unplan_trip_title', 'Unplan Trip'),
                    message: t('unplan_trip_dialog', 'Unplan this trip? All orders will be removed from this TRP and returned to the unassigned list.'),
                    confirmText: t('action_unplan_trip', 'Unplan Trip'),
                    cancelText: t('cancel', 'Cancel'),
                  });
                  if (ok) {
                    onAction('unplan-trip', tripId);
                  }
                }}
                className="btn-secondary text-xs py-2 px-3 text-red-500 hover:bg-red-500/10 flex items-center gap-1.5 font-bold border-red-500/30"
              >
                {loadingAction === 'unplan-trip' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Undo2 className="w-4 h-4" />}
                <span>{t('action_unplan_trip', 'Unplan Trip')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
              aria-label={t('close', 'Close')}
            >
              <X className="w-3.5 h-3.5" />
              <span>{t('close', 'Close')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  ) : null;
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function PlanningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();

  // ── State ──
  const [selectedDate, setSelectedDate] = useState<string>(() => dayStr(new Date()));
  const [viewMode, setViewMode] = useState<'all' | 'day' | 'week' | 'timeline' | 'map'>('all');
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
  const [orderDrawerTab, setOrderDrawerTab] = useState('overview');
  const [assignOrderModal, setAssignOrderModal] = useState<any | null>(null);
  const [selectedAssignTruckId, setSelectedAssignTruckId] = useState<string>('');
  const [selectedPoolOrderIds, setSelectedPoolOrderIds] = useState<Set<string>>(new Set());
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);

  const [wizardConfig, setWizardConfig] = useState<{ orderId: string; initialStep: number; highlight: string | null } | null>(null);
  const [drawerRefreshKey, setDrawerRefreshKey] = useState(0);
  const [pastDateConflict, setPastDateConflict] = useState<{
    orders: any[];
    resourceId: string;
    orderIds: string[];
    actionType: 'roll' | 'retro' | 'wizard';
  } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const handledOpenTripRef = useRef<string | null>(null);
  useEffect(() => {
    const openTripParam = searchParams.get('openTrip') || searchParams.get('tripId');
    if (!openTripParam) {
      handledOpenTripRef.current = null;
      return;
    }
    // Never reopen a trip that was just closed while the query string is still
    // being cleaned up by the router.
    if (handledOpenTripRef.current === openTripParam) return;
    handledOpenTripRef.current = openTripParam;
    setSelectedTripId(openTripParam);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('openTrip');
    nextParams.delete('tripId');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [compareTrip, setCompareTrip] = useState<any | null>(null);
  const [activityDriver, setActivityDriver] = useState<{ id: string; name?: string } | null>(null);
  const [trafficTrip, setTrafficTrip] = useState<any | null>(null);
  const [resultsSignal, setResultsSignal] = useState(0);
  const [dispatchModalTrip, setDispatchModalTrip] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sortPool, setSortPool] = useState<'priority' | 'date' | 'weight' | 'client'>('priority');
  const [grouping, setGrouping] = useState<'truck' | 'driver' | 'trailer'>('truck');
  const [attentionActive, setAttentionActive] = useState(false);

  // Enterprise Modals and Saved Views State
  const [splitTripTarget, setSplitTripTarget] = useState<any | null>(null);
  const [showCombineModal, setShowCombineModal] = useState(false);
  const [combineInitialTrip, setCombineInitialTrip] = useState<any | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [savedViews, setSavedViews] = useState<any[]>([]);
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  const { width: poolWidth, isResizing: isPoolResizing, startResizing: startPoolResizing } = useResizableSidebar(288, 200, 600);

  // Load Saved Views on Mount
  useEffect(() => {
    planningApi.getViews().then(views => {
      if (Array.isArray(views)) setSavedViews(views);
    }).catch(err => {
      console.warn('Failed to load saved views:', err);
    });
  }, []);

  const handleApplySavedView = (view: any) => {
    if (!view) {
      setCurrentViewId(null);
      return;
    }
    setCurrentViewId(view.id);
    if (view.viewMode) setViewMode(view.viewMode);
    if (view.grouping) setGrouping(view.grouping);
    if (view.dateRange?.from) setSelectedDate(view.dateRange.from);
    if (view.filters) {
      if (view.filters.status !== undefined) setStatusFilter(view.filters.status);
      if (view.filters.truckId !== undefined) setTruckFilter(view.filters.truckId);
      if (view.filters.driverId !== undefined) setDriverFilter(view.filters.driverId);
      if (view.filters.priority !== undefined) setPriorityFilter(view.filters.priority);
      if (view.filters.search !== undefined) setSearch(view.filters.search);
    }
    toast.success(`${t('view_loaded', 'Loaded view')}: ${view.name}`);
  };

  const handleUpdateCurrentView = async () => {
    if (!currentViewId) return;
    try {
      await planningApi.updateView(currentViewId, {
        viewMode,
        grouping,
        filters: { status: statusFilter, truckId: truckFilter, driverId: driverFilter, priority: priorityFilter, search },
        dateRange: { from: selectedDate },
      });
      toast.success(t('view_updated', 'Saved view updated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update view');
    }
  };

  const handleDeleteSavedView = async (id: string) => {
    const ok = await confirm({
      type: 'danger',
      title: t('delete_view', 'Delete View'),
      message: t('confirm_delete_view', 'Are you sure you want to delete this saved view?'),
      confirmText: t('delete', 'Delete'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    try {
      await planningApi.deleteView(id);
      setSavedViews(prev => prev.filter(v => v.id !== id));
      if (currentViewId === id) setCurrentViewId(null);
      toast.success(t('view_deleted', 'Saved view deleted'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete view');
    }
  };

  // ── Date range ──
  const { from, to, totalMinutes, hoursVisible, fromDateObj } = useMemo(() => {
    const curr = parseDay(selectedDate);
    if (viewMode === 'all') {
      const start = curr;
      const end = addDays(curr, 30);
      return { from: dayStr(start), to: dayStr(end), totalMinutes: 31 * 24 * 60, hoursVisible: 31, fromDateObj: start };
    }
    if (viewMode === 'week') {
      const start = addDays(curr, -((curr.getDay() + 6) % 7));
      return { from: dayStr(start), to: dayStr(addDays(start, 6)), totalMinutes: 7 * 24 * 60, hoursVisible: 7, fromDateObj: start };
    }
    // day / timeline / map — same range
    return { from: selectedDate, to: selectedDate, totalMinutes: 24 * 60, hoursVisible: 24, fromDateObj: curr };
  }, [selectedDate, viewMode]);

  const poolRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Enterprise Operations States
  const [dropHookConfig, setDropHookConfig] = useState<{ isOpen: boolean; mode: 'drop' | 'hook'; trailerId?: string; tripId?: string }>({ isOpen: false, mode: 'drop' });
  const [crossDockConfig, setCrossDockConfig] = useState<{ isOpen: boolean; orderId?: string; tripId?: string }>({ isOpen: false });
  const [subcontractorTargetTrip, setSubcontractorTargetTrip] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const colWidth = useMemo(() => Math.max(48, Math.round(52 * zoomLevel)), [zoomLevel]);
  const totalTimelineWidth = useMemo(() => hoursVisible * colWidth, [hoursVisible, colWidth]);

  // Continuous Timeline Zoom with Ctrl/Cmd + Mouse Wheel
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoomLevel(prev => {
          const delta = e.deltaY < 0 ? 0.1 : -0.1;
          const next = Math.max(0.5, Math.min(2.5, +(prev + delta).toFixed(2)));
          return next;
        });
      }
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName);
      if (isInput) return;

      const code = e.code;
      if (code === 'Digit1' || code === 'Numpad1' || e.key === '1') { e.preventDefault(); setViewMode('all'); return; }
      if (code === 'Digit2' || code === 'Numpad2' || e.key === '2') { e.preventDefault(); setViewMode('day'); return; }
      if (code === 'Digit3' || code === 'Numpad3' || e.key === '3') { e.preventDefault(); setViewMode('week'); return; }
      if (code === 'Digit4' || code === 'Numpad4' || e.key === '4') { e.preventDefault(); setViewMode('timeline'); return; }
      if (code === 'Digit5' || code === 'Numpad5' || e.key === '5') { e.preventDefault(); setViewMode('map'); return; }
      if (/^(Digit[6-9]|Digit0|Numpad[6-9]|Numpad0)$/.test(code) || /^[6-90]$/.test(e.key)) {
         e.preventDefault();
         return; 
      }

      const pool = poolRef.current;
      const timeline = timelineRef.current;
      if (!pool || !timeline) return;
      const active = document.activeElement;

      if (e.key === 'ArrowLeft' && active === timeline && timeline.scrollLeft <= 0) {
        e.preventDefault();
        pool.focus();
      } else if (e.key === 'ArrowRight' && active === pool) {
        e.preventDefault();
        timeline.focus();
      } else if (e.key.startsWith('Arrow') && active !== pool && active !== timeline) {
        timeline.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // ── Load data ──
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const isSpecificStatus = statusFilter && !['planned', 'driving', 'delayed', 'unassigned'].includes(statusFilter);
      const [boardRes, mapRes] = await Promise.allSettled([
        api.get('/planning/board', {
          params: {
            from,
            to,
            search: search || undefined,
            status: isSpecificStatus ? statusFilter : undefined,
            vehicleId: truckFilter || undefined,
            driverId: driverFilter || undefined,
            priority: priorityFilter || undefined,
          },
        }),
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
  }, [from, to, search, statusFilter, truckFilter, driverFilter, priorityFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Shortcuts ──
  useShortcuts({
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
        await planningApi.confirmTrip(tripId);
        toast.success(t('jsx_confirmedOk', 'Trip confirmed'));
      } else if (action === 'reopen') {
        await planningApi.reopenPlanning(tripId);
        toast.success(t('reopen_planning_ok', 'Planning reopened'));
      } else if (action === 'send' || action === 'open-dispatch-modal') {
        await planningApi.sendToDriver(tripId, payload || { routeInfo: 'Dispatched from Planning' });
        toast.success(t('jsx_sentOk', 'Trip dispatched to driver'));
      } else if (action === 'unassign-order') {
        const orderId = payload?.orderId;
        if (!orderId) return;
        await planningApi.unassignOrder(tripId, orderId);
        toast.success(t('order_unassigned_ok', 'Order unassigned from trip'));
        setDrawerRefreshKey(k => k + 1);
      } else if (action === 'unplan-trip') {
        await planningApi.unplanTrip(tripId);
        toast.success(t('trip_unplanned_ok', 'Trip unplanned and removed'));
        setSelectedTripId(null);
      } else if (action === 'split') {
        const tr = trips.find((t: any) => t.id === tripId) || selectedTrip;
        if (tr) setSplitTripTarget(tr);
        return;
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('jsx_actionError', 'Action failed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAutoOrderStops = async (tripId: string) => {
    setLoadingAction('auto-order');
    try {
      await planningApi.autoOrderStops(tripId);
      toast.success(t('auto_order_stops_success', 'Stops reordered and optimized successfully'));
      setDrawerRefreshKey(k => k + 1);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('auto_order_stops_failed', 'Failed to auto-order stops'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleReorderStops = async (tripId: string, stopIds: string[]) => {
    setLoadingAction('reorder');
    try {
      await planningApi.reorderTripStops(tripId, stopIds);
      toast.success(t('stops_reordered', 'Stops reordered'));
      setDrawerRefreshKey(k => k + 1);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reorder stops');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDropOrder = async (resourceId: string, droppedOrderId?: string) => {
    if (resourceId === '__unassigned_trips__') {
      toast.error(t('drop_unassigned_err', 'Please drop the order onto a valid truck row.'));
      return;
    }
    const oId = droppedOrderId || draggingOrderId;
    const orderIds = oId ? [oId] : Array.from(selectedPoolOrderIds);
    if (!orderIds.length) return;

    // Check if any order has dates in the past (< today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastOrders = orderIds.map(id => orders.find((o: any) => o.id === id)).filter((o: any) => {
      if (!o) return false;
      const pickupDateStr = o.stops?.[0]?.dateFrom || o.stops?.[0]?.timeWindowMin;
      if (!pickupDateStr) return false;
      const d = new Date(pickupDateStr);
      return !isNaN(d.getTime()) && d < today;
    });

    if (pastOrders.length > 0) {
      setPastDateConflict({
        orders: pastOrders,
        resourceId,
        orderIds,
        actionType: 'roll',
      });
      return;
    }

    executeAssign(orderIds, resourceId);
  };

  const executeAssign = async (orderIds: string[], resourceId: string) => {
    setLoadingAction('assign');
    try {
      await api.post('/planning/assign', { orderIds, truckId: resourceId, date: selectedDate });
      toast.success(t('jsx_assignedOk', 'Orders assigned'));
      setSelectedPoolOrderIds(new Set());
      setDraggingOrderId(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleConfirmPastDate = async () => {
    if (!pastDateConflict) return;
    const { orders: conflictingOrders, resourceId, orderIds, actionType } = pastDateConflict;

    if (actionType === 'wizard') {
      setPastDateConflict(null);
      if (conflictingOrders[0]?.id) {
        setWizardConfig({ orderId: conflictingOrders[0].id, initialStep: 1, highlight: 'stops' });
      }
      return;
    }

    setLoadingAction('assign');
    try {
      if (actionType === 'roll') {
        // Automatically roll dates forward to selectedDate, preserving transit duration
        for (const po of conflictingOrders) {
          if (!po.stops || po.stops.length === 0) continue;
          const oldPickup = po.stops[0]?.dateFrom || po.stops[0]?.timeWindowMin;
          const oldDelivery = po.stops[po.stops.length - 1]?.dateFrom || po.stops[po.stops.length - 1]?.timeWindowMin;
          let deltaDays = 0;
          if (oldPickup && oldDelivery) {
            const t1 = new Date(oldPickup).getTime();
            const t2 = new Date(oldDelivery).getTime();
            if (!isNaN(t1) && !isNaN(t2) && t2 > t1) {
              deltaDays = Math.round((t2 - t1) / (1000 * 60 * 60 * 24));
            }
          }
          const newPickupDate = selectedDate;
          const dTarget = new Date(selectedDate);
          dTarget.setDate(dTarget.getDate() + deltaDays);
          const newDeliveryDate = dTarget.toISOString().split('T')[0];

          const updatedStops = po.stops.map((s: any, idx: number) => {
            const isDelivery = idx === po.stops.length - 1 && po.stops.length > 1;
            const targetDate = isDelivery ? newDeliveryDate : newPickupDate;
            return {
              ...s,
              dateFrom: targetDate,
              timeWindowMin: s.timeFrom ? `${targetDate}T${s.timeFrom}:00` : `${targetDate}T09:00:00`,
              timeWindowMax: s.timeUntil ? `${targetDate}T${s.timeUntil}:00` : `${targetDate}T18:00:00`,
            };
          });

          try {
            await api.patch(`/orders/${po.id}`, { stops: updatedStops });
          } catch {
            // best effort stop update
          }
        }
      }

      await api.post('/planning/assign', { orderIds, truckId: resourceId, date: selectedDate });
      toast.success(t('jsx_assignedOk', 'Orders assigned'));
      setSelectedPoolOrderIds(new Set());
      setDraggingOrderId(null);
      setPastDateConflict(null);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePrint = () => window.print();

  const handleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen?.();
    setIsFullscreen(p => !p);
  };

  // ── Derived data ──
  const resources: any[] = boardData?.resources || [];
  const trips: any[] = boardData?.trips || [];
  const orders: any[] = boardData?.orders || [];

  const unassignedTrips = useMemo(() => {
    return trips.filter((tr: any) => !tr.truckId && !tr.truck?.id);
  }, [trips]);

  const unassignedResource = useMemo(() => {
    if (unassignedTrips.length === 0) return null;
    return {
      id: '__unassigned_trips__',
      plateNumber: t('unassigned_trips_plate', 'No Truck'),
      brand: t('unassigned_trips_label', 'Unassigned Trips'),
      model: `${unassignedTrips.length} ${t('jsx_trips', 'trips')}`,
      status: 'unassigned',
      isVirtualUnassigned: true,
      maxWeightKg: 24000,
      maxLdm: 13.6,
      maxVolumeCbm: 90,
      maxPallets: 33,
      driver: null,
      trailer: null,
      maintenance: [],
      hasMaintenance: false,
      available: false,
    };
  }, [unassignedTrips, t]);

  const searchFilter = search.trim().toLowerCase();

  const sortedOrders = useMemo(() => {
    let o = [...orders];
    if (searchFilter) {
      o = o.filter((item: any) =>
        (item.orderNumber || '').toLowerCase().includes(searchFilter) ||
        (item.customerReference || '').toLowerCase().includes(searchFilter) ||
        (item.client?.name || '').toLowerCase().includes(searchFilter) ||
        (item.stops || []).some((s: any) => (s.city || '').toLowerCase().includes(searchFilter) || (s.address || '').toLowerCase().includes(searchFilter))
      );
    }
    if (priorityFilter) {
      o = o.filter((item: any) => item.priority === priorityFilter);
    }
    if (sortPool === 'priority') {
      const p: Record<string,number> = { critical: 0, high: 1, normal: 2, low: 3 };
      return o.sort((a, b) => {
        const pa = p[a.priority] ?? 2;
        const pb = p[b.priority] ?? 2;
        if (pa !== pb) return pa - pb;
        const da = new Date(a.createdAt || 0).getTime();
        const db = new Date(b.createdAt || 0).getTime();
        return db - da;
      });
    }
    if (sortPool === 'date') return o.sort((a, b) => {
      const da = a.stops?.[0]?.dateFrom || '9999'; const db = b.stops?.[0]?.dateFrom || '9999';
      return da < db ? -1 : 1;
    });
    if (sortPool === 'weight') return o.sort((a, b) => sumCargo([b]).weight - sumCargo([a]).weight);
    if (sortPool === 'client') return o.sort((a, b) => (a.client?.name || '').localeCompare(b.client?.name || ''));
    return o;
  }, [orders, sortPool, searchFilter, priorityFilter]);

  const selectedTrip = useMemo(() => {
    if (!selectedTripId) return null;
    return trips.find(tr => tr.id === selectedTripId || (tr.tripNumber && tr.tripNumber === selectedTripId)) || null;
  }, [trips, selectedTripId]);
  const selectedOrder = useMemo(() => orders.find(o => o.id === selectedOrderId) || null, [orders, selectedOrderId]);
  const draggingOrder = useMemo(() => draggingOrderId ? orders.find(o => o.id === draggingOrderId) || null : null, [orders, draggingOrderId]);

  // Trips & resources with blocking conflicts (for attention filter)
  const attentionResourceIds = useMemo(() => {
    const blocking = (boardData?.conflicts || []).filter((c: any) => c.level === 'blocking');
    const conflictTripSet = new Set(blocking.map((c: any) => c.tripId).filter(Boolean));
    const conflictResSet = new Set(blocking.map((c: any) => c.resourceId).filter(Boolean));
    const resIds = new Set<string>();

    for (const r of resources) {
      if (conflictResSet.has(r.id) || r.hasMaintenance || r.status === 'maintenance') {
        resIds.add(r.id);
        continue;
      }
      const resTrips = trips.filter(tr =>
        grouping === 'driver'
          ? tr.driver?.id === r.id
          : grouping === 'trailer'
            ? (tr.trailerId === r.id || tr.trailer?.id === r.id || tr.truck?.trailer?.id === r.id)
            : (tr.truck?.id === r.id || tr.truckId === r.id)
      );
      if (resTrips.some(tr => conflictTripSet.has(tr.id))) {
        resIds.add(r.id);
      }
    }

    if (unassignedTrips.some(tr => conflictTripSet.has(tr.id) || !tr.truckId)) {
      resIds.add('__unassigned_trips__');
    }

    return resIds;
  }, [boardData?.conflicts, resources, trips, grouping, unassignedTrips]);

  const activeFilterCount = [search, statusFilter, truckFilter, driverFilter, priorityFilter, attentionActive].filter(Boolean).length;

  const plannedTripsCount = useMemo(() => {
    return trips.filter((tr: any) => ['planning', 'planned', 'assigned', 'dispatched'].includes(tr.status)).length;
  }, [trips]);

  const drivingTripsCount = useMemo(() => {
    return trips.filter((tr: any) => ['driving', 'started', 'loading', 'driver_accepted', 'partially_delivered'].includes(tr.status)).length;
  }, [trips]);

  const delayedTripsCount = useMemo(() => {
    return trips.filter((tr: any) => tr.isDelayed || (tr.plannedArrival && new Date(tr.plannedArrival) < new Date() && !['completed', 'closed', 'cancelled'].includes(tr.status))).length || (boardData?.delayedTrips || 0);
  }, [trips, boardData?.delayedTrips]);

  // ── Filtered resources for display ──
  const displayResources = useMemo(() => {
    let list = [...resources];
    if (unassignedResource) {
      list.unshift(unassignedResource);
    }
    if (grouping === 'driver') {
      list = (boardData?.drivers || resources.map((r: any) => r.driver).filter(Boolean))
        .filter((d: any, i: number, arr: any[]) => d && arr.findIndex((x: any) => x.id === d.id) === i);
    } else if (grouping === 'trailer') {
      list = (boardData?.trailers || []).map((trl: any) => ({
        id: trl.id,
        plateNumber: trl.plateNumber,
        name: trl.plateNumber,
        brand: trl.type || 'Trailer',
        model: `${trl.maxWeightKg ? Math.round(trl.maxWeightKg / 1000) + 't' : '34t'} · ${trl.maxPallets || 33} plt`,
        status: trl.status || 'available',
        maxWeightKg: trl.maxWeightKg || 28000,
        maxPallets: trl.maxPallets || 33,
        maxVolumeCbm: trl.maxVolumeCbm || 90,
        isTrailer: true,
      }));
    }
    
    if (grouping === 'truck') {
      if (truckFilter) list = list.filter((r: any) => r.id === truckFilter || r.plateNumber === truckFilter);
      if (driverFilter) list = list.filter((r: any) => r.driver?.id === driverFilter);
    } else if (grouping === 'driver') {
      if (driverFilter) list = list.filter((d: any) => d.id === driverFilter);
    }

    const getResTrips = (r: any) => {
      if (r.id === '__unassigned_trips__') return unassignedTrips;
      if (grouping === 'driver') return trips.filter(tr => tr.driver?.id === r.id);
      if (grouping === 'trailer') return trips.filter(tr => tr.trailerId === r.id || tr.trailer?.id === r.id || tr.truck?.trailer?.id === r.id);
      return trips.filter(tr => tr.truck?.id === r.id || tr.truckId === r.id);
    };

    // Attention filter: show only resources with blocking conflicts or maintenance
    if (attentionActive) {
      list = list.filter((r: any) => attentionResourceIds.has(r.id));
    }

    // Status filter
    if (statusFilter && statusFilter !== 'unassigned') {
      list = list.filter((r: any) => {
        const resTrips = getResTrips(r);
        if (statusFilter === 'planned') {
          return resTrips.some((tr: any) => ['planning', 'planned', 'assigned', 'dispatched'].includes(tr.status));
        }
        if (statusFilter === 'driving') {
          return resTrips.some((tr: any) => ['driving', 'started', 'loading', 'driver_accepted', 'partially_delivered'].includes(tr.status));
        }
        if (statusFilter === 'delayed') {
          return resTrips.some((tr: any) => tr.isDelayed || (tr.plannedArrival && new Date(tr.plannedArrival) < new Date() && !['completed', 'closed', 'cancelled'].includes(tr.status)));
        }
        return resTrips.some((tr: any) => tr.status === statusFilter) || r.status === statusFilter;
      });
    }

    // Priority filter
    if (priorityFilter) {
      list = list.filter((r: any) => {
        const resTrips = getResTrips(r);
        return resTrips.some((tr: any) => tr.orders?.some((o: any) => o.priority === priorityFilter));
      });
    }

    // Search filter
    if (searchFilter) {
      list = list.filter((r: any) => {
        if (r.plateNumber?.toLowerCase().includes(searchFilter)) return true;
        if (r.brand?.toLowerCase().includes(searchFilter) || r.model?.toLowerCase().includes(searchFilter)) return true;
        if (r.driver?.name?.toLowerCase().includes(searchFilter)) return true;
        if (r.trailer?.plateNumber?.toLowerCase().includes(searchFilter)) return true;
        const resTrips = getResTrips(r);
        return resTrips.some((tr: any) => {
          if (tr.tripNumber?.toLowerCase().includes(searchFilter)) return true;
          if (tr.driver?.name?.toLowerCase().includes(searchFilter)) return true;
          if (tr.trailer?.plateNumber?.toLowerCase().includes(searchFilter)) return true;
          if (tr.stops?.some((s: any) => (s.city || '').toLowerCase().includes(searchFilter) || (s.address || '').toLowerCase().includes(searchFilter) || (s.country || '').toLowerCase().includes(searchFilter))) return true;
          if (tr.orders?.some((o: any) => (o.orderNumber || '').toLowerCase().includes(searchFilter) || (o.customerReference || '').toLowerCase().includes(searchFilter) || (o.client?.name || '').toLowerCase().includes(searchFilter))) return true;
          return false;
        });
      });
    }

    return list;
  }, [resources, unassignedResource, unassignedTrips, truckFilter, driverFilter, grouping, boardData, attentionActive, attentionResourceIds, statusFilter, priorityFilter, searchFilter, trips]);

  return (
    <div className={`flex flex-col gap-0 bg-background text-text-primary print:bg-white ${isFullscreen ? 'fixed inset-0 z-[9000] p-0' : 'h-[calc(100vh-4rem)]'}`}>

            {/* ── SINGLE COMPACT CONTROL TOOLBAR ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface shrink-0 print:hidden overflow-x-auto min-h-[44px]">
        {/* Left: Views & Grouping */}
        <div className="flex bg-card p-0.5 rounded-lg border border-border shadow-sm shrink-0">
          {([['all', t('jsx_all','All'), List],['day', t('jsx_day','Day'), Clock],['week', t('jsx_week','Week'), Calendar],['timeline', t('view_timeline','Timeline'), LayoutGrid],['map', t('jsx_map','Map'), MapIcon]] as [string, string, any][]).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setViewMode(id as any)} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${viewMode === id ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:text-text-primary'}`} title={label}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="w-32 shrink-0">
          <CustomSelect
            value={grouping}
            onChange={(val) => setGrouping(val as any)}
            size="sm"
            icon={Layers}
            options={[
              { value: 'truck', label: t('jsx_groupVehicle','Truck') },
              { value: 'driver', label: t('jsx_groupDriver','Driver') },
              { value: 'trailer', label: t('jsx_groupTrailer','Trailer') }
            ]}
          />
        </div>

        <div className="w-[1px] h-5 bg-border mx-1 shrink-0"></div>

        {/* Center: Search & Filters & KPI Pills */}
        <div className="relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('search_order_placeholder','Search order, client, location…')}
            className="pl-8 pr-3 py-1 text-[11px] h-[28px] bg-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-primary w-48"
          />
        </div>

        <div className="flex gap-1.5 shrink-0">
          <div className="w-32">
            <CustomSelect size="sm" icon={TruckIcon} title={t('jsx_allVehicles','All Trucks')} value={truckFilter} onChange={setTruckFilter} options={[{ value: '', label: t('tb_trucks','Trucks') }, ...resources.map((r: any) => ({ value: r.id, label: r.plateNumber }))] } />
          </div>
          <div className="w-32">
            <CustomSelect size="sm" icon={Users} title={t('jsx_allDrivers','All Drivers')} value={driverFilter} onChange={setDriverFilter} options={[{ value: '', label: t('tb_drivers','Drivers') }, ...(boardData?.drivers || resources.map((r: any) => r.driver).filter(Boolean)).filter((d: any, i: number, arr: any[]) => d && arr.findIndex((x: any) => x.id === d.id) === i).map((d: any) => ({ value: d.id, label: driverDisplayName(d) || d.name || d.user?.name || '—' }))] } />
          </div>
          <div className="w-28">
            <CustomSelect size="sm" icon={AlertTriangle} value={priorityFilter} onChange={setPriorityFilter} options={[{ value: '', label: t('jsx_allPriorities','Priority') }, ...['critical','high','normal','low'].map(p => ({ value: p, label: t(`priority_${p}`, p) }))] } />
          </div>
        </div>

        {activeFilterCount > 0 && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setTruckFilter(''); setDriverFilter(''); setPriorityFilter(''); setAttentionActive(false); }} className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors shrink-0" title={`${t('jsx_clearFilters','Clear')} (${activeFilterCount})`}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        {/* KPI Pills */}
        <div className="flex gap-1 bg-card rounded-lg p-0.5 border border-border shrink-0 ml-1">
          {([
            { filter: 'planned', value: plannedTripsCount, color: 'blue', isAttention: false },
            { filter: 'unassigned', value: boardData?.totalUnplanned || orders.length || 0, color: 'amber', isAttention: false },
            { filter: 'attention', value: attentionResourceIds.size, color: 'red', isAttention: true },
            { filter: 'driving', value: drivingTripsCount, color: 'emerald', isAttention: false },
            { filter: 'delayed', value: delayedTripsCount, color: 'purple', isAttention: false },
          ] as { filter: string; value: number; color: string; isAttention: boolean }[]).map(({ filter, value, color, isAttention }) => {
            const isActive = isAttention ? attentionActive : statusFilter === filter;
            const kpiStyle = KPI_COLORS[color] || KPI_COLORS.blue;
            return (
              <button
                key={filter}
                onClick={() => {
                  if (isAttention) { setAttentionActive(a => !a); }
                  else if (filter === 'unassigned') { setPoolCollapsed(false); setStatusFilter(statusFilter === 'unassigned' ? '' : 'unassigned'); }
                  else { setStatusFilter(statusFilter === filter ? '' : filter); }
                }}
                className={`flex items-center gap-1 min-w-[34px] h-[22px] px-1.5 rounded-md text-[11px] font-black border transition-all ${isActive ? `${kpiStyle.active} shadow-sm` : kpiStyle.idle}`}
                title={t(isAttention ? 'jsx_attention' : (filter === 'unassigned' ? 'kpi_unassigned' : (filter === 'planned' ? 'kpi_planned' : `status_${filter}`)), filter)}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white/90' : kpiStyle.dot}`} />
                {value}
              </button>
            );
          })}
        </div>

        <div className="flex-1"></div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Saved Views Control */}
          <div className="flex items-center gap-1 bg-card p-0.5 rounded-lg border border-border shadow-sm">
            <button
              onClick={() => setShowSaveViewModal(true)}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors"
              title={t('save_current_view', 'Save View')}
            >
              <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
            </button>
            {savedViews.length > 0 && (
              <select
                value={currentViewId || ''}
                onChange={e => {
                  const v = savedViews.find(s => s.id === e.target.value);
                  handleApplySavedView(v || null);
                }}
                className="bg-transparent text-[11px] font-medium text-text-secondary pr-2 py-0.5 border-none focus:outline-none cursor-pointer max-w-[110px] truncate"
                title={t('select_saved_view', 'Select Saved View')}
              >
                <option value="">{t('default_view', 'Default View')}</option>
                {savedViews.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
            {currentViewId && (
              <>
                <button
                  onClick={handleUpdateCurrentView}
                  className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors"
                  title={t('update_view', 'Update View')}
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteSavedView(currentViewId)}
                  className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-red-500 transition-colors"
                  title={t('delete_view', 'Delete View')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <button onClick={() => setShowCombineModal(true)} className="btn-secondary h-[28px] px-2.5 rounded-lg flex items-center gap-1.5 text-[11px] font-bold" title={t('combine_trips', 'Combine Trips')}>
            <GitMerge className="w-3.5 h-3.5 text-primary" /><span className="hidden xl:inline">{t('combine_trips', 'Combine')}</span>
          </button>
          
          {/* Contextual planning tools */}
          <div className="flex items-center gap-0.5 bg-card p-0.5 rounded-lg border border-border shadow-sm">
            <button
              type="button"
              onClick={() => selectedTrip && setCompareTrip(selectedTrip)}
              disabled={!selectedTrip}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('up_compare_routes', 'Compare routes')}
              aria-label={t('up_compare_routes', 'Compare routes')}
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const truckId = selectedTrip?.truck?.id || selectedTrip?.truckId;
                if (truckId) navigate(`/fleet?tab=trucks&editId=${truckId}&highlight=profile`);
              }}
              disabled={!selectedTrip?.truck?.id && !selectedTrip?.truckId}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('up_cmp_profile', 'Routing profile')}
              aria-label={t('up_cmp_profile', 'Routing profile')}
            >
              <TruckIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const drv = selectedTrip?.driver || selectedTrip?.truck?.driver;
                if (drv?.id) setActivityDriver({ id: drv.id, name: driverEntityDisplayName(drv) });
              }}
              disabled={!(selectedTrip?.driver?.id || selectedTrip?.truck?.driver?.id)}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('up_driver_activity', 'Driver activity')}
              aria-label={t('up_driver_activity', 'Driver activity')}
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => selectedTrip && setTrafficTrip(selectedTrip)}
              disabled={!selectedTrip}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={t('up_traffic_incidents', 'Traffic & incidents')}
              aria-label={t('up_traffic_incidents', 'Traffic & incidents')}
            >
              <Clock3 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setResultsSignal((value) => value + 1)}
              className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors"
              title={t('up_planning_results', 'Planning results')}
              aria-label={t('up_planning_results', 'Planning results')}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex bg-card p-0.5 rounded-lg border border-border shadow-sm">
            <button onClick={() => setShowExportModal(true)} className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors" title={t('export_planning', 'Export')}>
              <ExcelIcon className="w-3.5 h-3.5" />
            </button>
            <button onClick={loadData} disabled={isLoading} className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors" title={t('jsx_recalc','Refresh')}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </button>
            <button onClick={() => setShowOptimizeModal(true)} className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors" title={t('jsx_optimize','AI Auto-plan')}>
              <Wand2 className="w-3.5 h-3.5 text-amber-500" />
            </button>
            <button onClick={handlePrint} className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors" title={t('jsx_print','Print')}>
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleFullscreen} className="p-1 hover:bg-surface rounded-md text-text-secondary hover:text-primary transition-colors" title={t('jsx_fullscreen','Fullscreen')}>
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button onClick={() => navigate('/orders/new')} className="h-[28px] px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg flex items-center gap-1.5 text-[11px] font-black shadow-sm transition-colors">
            <Plus className="w-3.5 h-3.5" /><span className="hidden lg:inline">{t('jsx_newTransport','New transport')}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden bg-surface/50 p-2 gap-0">

        {/* ORDER POOL (left panel) */}
        <div 
          className={`relative flex flex-col border border-border rounded-xl shadow-sm bg-card shrink-0 overflow-hidden print:hidden ${isPoolResizing ? 'select-none transition-none' : 'transition-all duration-300'} ${isPoolDragOver ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}`}
          style={{ width: poolCollapsed ? 40 : poolWidth }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!isPoolDragOver) setIsPoolDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsPoolDragOver(false);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setIsPoolDragOver(false);
            try {
              const rawData = e.dataTransfer.getData('application/json');
              const textData = e.dataTransfer.getData('text/plain');
              let parsed: any = null;
              if (rawData) {
                try { parsed = JSON.parse(rawData); } catch {}
              }
              if (parsed?.type === 'assigned-trip') {
                const tripId = parsed.tripId;
                const ok = await confirm({
                  type: 'warning',
                  title: t('unassign_trip_title', 'Dezasociază cursa'),
                  message: t('unassign_trip_msg', `Sigur doriți să dezasociați cursa ${parsed.tripNumber || ''} și să trimiteți comenzile înapoi în lista de comenzi nealocate?`),
                  confirmText: t('unassign', 'Dezasociază'),
                  cancelText: t('cancel', 'Anulează'),
                });
                if (!ok) return;
                await planningApi.unplanTrip(tripId);
                toast.success(t('trip_unplanned_pool', 'Cursa a fost dezasociată. Comenzile au revenit în lista de comenzi nealocate.'));
                loadData();
              } else if (parsed?.type === 'assigned-order' || (textData && !parsed)) {
                const orderId = parsed?.orderId || textData;
                if (!orderId) return;
                await api.post('/planning/unplan', { orderIds: [orderId] });
                toast.success(t('order_unassigned_pool', 'Comanda a fost returnată la comenzi nealocate.'));
                loadData();
              }
            } catch (err: any) {
              toast.error(err?.response?.data?.message || t('action_failed', 'Acțiunea a eșuat'));
            }
          }}
        >
          {isPoolDragOver && (
            <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-[2px] border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center p-4 text-center pointer-events-none">
              <Undo2 className="w-8 h-8 text-primary animate-bounce mb-2" />
              <p className="font-black text-sm text-primary">{t('drop_to_unassign', 'Eliberează aici pentru a dezasocia')}</p>
              <p className="text-[11px] text-text-secondary mt-1">{t('drop_to_unassign_hint', 'Comanda sau cursa va fi returnată la nealocate')}</p>
            </div>
          )}
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
              <div className="flex items-center justify-between p-2 border-b border-border bg-surface/10 flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <input 
                    type="checkbox" 
                    className="rounded text-primary focus:ring-primary w-3.5 h-3.5 cursor-pointer border-border" 
                    checked={sortedOrders.length > 0 && selectedPoolOrderIds.size === sortedOrders.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedPoolOrderIds(new Set(sortedOrders.map(o => o.id)));
                      else setSelectedPoolOrderIds(new Set());
                    }}
                    title={t('jsx_selectAll','Select All')}
                  />
                  <span className="text-[10px] font-bold text-text-secondary">{t('jsx_selectAll','All')}</span>
                </div>
                <div className="flex gap-1">
                  {([['priority','Prio'],['date','Date'],['weight','Wt'],['client','Client']] as [string,string][]).map(([id,lbl]) => (
                    <button key={id} onClick={() => setSortPool(id as any)} className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors ${sortPool === id ? 'bg-primary text-white' : 'text-text-secondary border border-border hover:text-text-primary'}`}>{lbl}</button>
                  ))}
                </div>
              </div>

              {/* Pool cards */}
              <div ref={poolRef} tabIndex={0} className="flex-1 overflow-y-auto p-2 space-y-2 outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 custom-scrollbar">
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : fetchError ? (
                  <div className="text-center py-6 px-2">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-text-primary">{t('error_loading_orders', 'Error loading orders')}</p>
                    <p className="text-[10px] text-text-secondary mb-2">{fetchError}</p>
                    <button onClick={loadData} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 mx-auto"><RefreshCw className="w-3 h-3" />{t('jsx_retry', 'Retry')}</button>
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

        {/* Resizer Splitter (between Order Pool and Main Workspace) */}
        {!poolCollapsed && (
          <div
            onMouseDown={startPoolResizing}
            className={`group relative flex items-center justify-center w-3 cursor-col-resize shrink-0 select-none z-10 mx-0.5 transition-colors ${
              isPoolResizing ? 'bg-primary/20' : 'hover:bg-primary/10'
            } rounded-lg`}
            title={t('drag_to_resize', 'Drag to resize')}
          >
            <div
              className={`w-1 rounded-full transition-all ${
                isPoolResizing
                  ? 'bg-primary h-12'
                  : 'bg-border/90 group-hover:bg-primary/80 h-8 group-hover:h-12'
              }`}
            />
          </div>
        )}

        {/* MAIN WORKSPACE */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card rounded-xl border border-border shadow-sm">
          {viewMode === 'map' ? (
            <PlanningMap mapData={mapData} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} isLoading={isLoading} />
          ) : (
            <>
              {/* Timeline grid */}
              <div ref={timelineRef} tabIndex={0} className="flex-1 overflow-auto relative outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm font-bold text-text-secondary">{t('map_loading','Loading schedule…')}</p>
                  </div>
                ) : fetchError ? (
                  <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3"><AlertTriangle className="w-6 h-6" /></div>
                    <p className="font-bold text-text-primary text-base">{t('unable_load_planning', 'Unable to load planning data')}</p>
                    <p className="text-xs text-text-secondary max-w-sm mt-1 mb-4">{fetchError}</p>
                    <button onClick={loadData} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-md"><RefreshCw className="w-3.5 h-3.5" /><span>{t('jsx_retry', 'Retry')}</span></button>
                  </div>
                ) : (
                  <div className="w-full" style={{ minWidth: `${224 + totalTimelineWidth}px` }}>
                        {/* Time scale header */}
                        <div className="flex border-b border-border bg-surface/60 sticky top-0 z-20 shadow-sm h-10" style={{ minWidth: `${224 + totalTimelineWidth}px` }}>
                          <div className="w-56 shrink-0 border-r border-border/60 bg-surface/80 flex items-center justify-between px-2 py-1 sticky left-0 z-30">
                            {/* Temporal navigation placed here! */}
                            <div className="flex items-center gap-1">
                              <button onClick={() => setSelectedDate(d => dayStr(addDays(parseDay(d), viewMode === 'week' ? -7 : -1)))} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <Flatpickr
                                value={selectedDate}
                                onChange={([d]) => d && setSelectedDate(dayStr(d))}
                                options={{ dateFormat: 'Y-m-d' }}
                                className="w-20 text-[11px] font-bold text-center bg-transparent border-none focus:ring-0 cursor-pointer text-text-primary p-0"
                              />
                              <button onClick={() => setSelectedDate(d => dayStr(addDays(parseDay(d), viewMode === 'week' ? 7 : 1)))} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors">
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <button onClick={() => setSelectedDate(dayStr(new Date()))} className="text-[10px] font-bold text-primary hover:text-primary/80 px-1">
                              {viewMode === 'week' ? t('jsx_dateThisWeek','This week') : t('jsx_today','Today')}
                            </button>
                          </div>
                          <div className="flex flex-1 relative" style={{ minWidth: `${totalTimelineWidth}px` }}>
                            {Array.from({ length: hoursVisible }, (_, h) => {
                              const colDate = addDays(fromDateObj, h);
                              const colDateStr = dayStr(colDate);
                              const isToday = colDateStr === dayStr(new Date());
                              return (
                                <div
                                  key={h}
                                  className={`flex-1 flex items-center justify-center text-center text-[10px] font-bold py-1.5 border-r border-border/30 last:border-0 transition-colors ${
                                    isToday ? 'bg-primary/10 text-primary font-black border-primary/30' : 'text-text-secondary'
                                  }`}
                                  style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                                >
                                  {viewMode === 'all' ? (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="text-[10px] font-bold">
                                        {colDate.toLocaleDateString([], { day: 'numeric', month: 'short' })}
                                      </span>
                                    </div>
                                  ) : viewMode === 'week' ? (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="text-[10px] font-bold">
                                        {colDate.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
                                      </span>
                                    </div>
                                  ) : (
                                    `${String(h).padStart(2,'0')}:00`
                                  )}
                                </div>
                              );
                            })}
                            {/* Right absolute positioned block for indicators and zoom controls */}
                            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-3 bg-surface/80 backdrop-blur-sm border border-border/60 rounded-lg px-2 py-1 shadow-sm">
                              <div className="flex items-center gap-1">
                                <button onClick={() => setZoomLevel(z => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="p-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary"><ZoomOut className="w-3 h-3" /></button>
                                <span className="text-[9px] font-mono font-bold w-7 text-center">{Math.round(zoomLevel * 100)}%</span>
                                <button onClick={() => setZoomLevel(z => Math.min(2.5, +(z + 0.15).toFixed(2)))} className="p-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary"><ZoomIn className="w-3 h-3" /></button>
                              </div>
                              <div className="w-px h-3 bg-border" />
                              <div className="flex items-center gap-2 text-[10px] font-bold text-text-secondary">
                                <span>{displayResources.length} res</span>
                                <span>{trips.length} trips</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Resource rows */}
                        {displayResources.length === 0 ? (
                          <div className="text-center py-24 px-4">
                            <TruckIcon className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-40" />
                            <p className="font-bold text-text-primary">{t('jsx_noTrips','No vehicles found for this period.')}</p>
                            <p className="text-xs text-text-secondary mt-1">{t('try_selecting_other_date', 'Try selecting another date or clearing filters.')}</p>
                          </div>
                        ) : (
                          displayResources.map(res => {
                            const resTrips = res.id === '__unassigned_trips__'
                              ? unassignedTrips
                              : trips.filter(tr =>
                                  grouping === 'driver'
                                    ? tr.driver?.id === res.id
                                    : grouping === 'trailer'
                                      ? (tr.trailerId === res.id || tr.trailer?.id === res.id || tr.truck?.trailer?.id === res.id)
                                      : (tr.truck?.id === res.id || tr.truckId === res.id)
                                );
                            return (
                              <ResourceRow
                                key={res.id}
                                resource={res}
                                trips={resTrips}
                                fromDate={from}
                                totalMinutes={totalMinutes}
                                hoursVisible={hoursVisible}
                                selectedTripId={selectedTripId}
                                onSelectTrip={setSelectedTripId}
                                onDropOrder={handleDropOrder}
                                draggingId={draggingOrderId}
                                draggingOrder={draggingOrder}
                                hosSummary={boardData?.hosSummary || {}}
                                grouping={grouping}
                                colWidth={colWidth}
                                timelineWidth={totalTimelineWidth}
                                onOpenPlanner={(r) => {
                                  if (r.id === '__unassigned_trips__') {
                                    if (resTrips[0]?.id) setSelectedTripId(resTrips[0].id);
                                    return;
                                  }
                                  const activeTrip = resTrips.find(tr => !['completed', 'closed', 'cancelled'].includes(String(tr.status).toLowerCase()));
                                  const tripParam = activeTrip?.id ? `&trip=${activeTrip.id}` : '';
                                  navigate(`/planning/planner/${r.id}?date=${selectedDate}${tripParam}`);
                                }}
                              />
                            );
                          })
                        )}
                      </div>
                )}
</div>

{boardData ? (
      <PlanningResultsPanel
        boardData={boardData}
        selectedTripId={selectedTripId}
        grouping={grouping}
        truckFilter={truckFilter}
        driverFilter={driverFilter}
        priorityFilter={priorityFilter}
        searchFilter={searchFilter}
        from={from}
        to={to}
        onSelectTrip={setSelectedTripId}
        onRefresh={loadData}
        focusSignal={resultsSignal}
      />
    ) : null}

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
          hosSummary={boardData?.hosSummary || {}}
          onClose={() => {
            const openParam = searchParams.get('openTrip') || searchParams.get('tripId');
            if (openParam) handledOpenTripRef.current = openParam;
            setSelectedTripId(null);
            if (openParam) {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('openTrip');
              nextParams.delete('tripId');
              setSearchParams(nextParams, { replace: true });
            }
          }}
          onAction={handleTripAction}
          onReorderStops={handleReorderStops}
          onSplitTrip={(tr) => setSplitTripTarget(tr)}
          onCombineTrip={(tr) => {
            setCombineInitialTrip(tr);
            setShowCombineModal(true);
          }}
          onAutoOrderStops={handleAutoOrderStops}
          onDropHook={(cfg) => setDropHookConfig({ isOpen: true, mode: cfg.mode, trailerId: cfg.trailerId, tripId: cfg.tripId })}
          onCrossDock={(cfg) => setCrossDockConfig({ isOpen: true, tripId: cfg.tripId })}
          onSubcontractor={(tr) => setSubcontractorTargetTrip(tr)}
          onOpenDriverActivity={(drv) => drv?.id && setActivityDriver({ id: drv.id, name: driverEntityDisplayName(drv) })}
          onEditOrder={(orderId, step, highlight) => {
            const h = highlight || 'cargo';
            const s = (step !== undefined && step !== null)
              ? step
              : (['cargo', 'weight', 'ldm', 'volume', 'pallets', 'quantity'].includes(h) ? 2 : (['stops', 'pickup', 'delivery', 'route', 'time'].includes(h) ? 1 : 0));
            setWizardConfig({ orderId, initialStep: s, highlight: h });
          }}
          loadingAction={loadingAction}
          refreshKey={drawerRefreshKey}
        />
      )}

      {selectedOrder && (
        <OrderDetailDrawer
          order={selectedOrder}
          activeTab={orderDrawerTab}
          setActiveTab={setOrderDrawerTab}
          onClose={() => setSelectedOrderId(null)}
          onEdit={(orderId) => {
            setSelectedOrderId(null);
            setWizardConfig({ orderId, initialStep: 0, highlight: null });
          }}
          onPlan={(order) => {
            setSelectedOrderId(null);
            setSelectedAssignTruckId(resources[0]?.id || '');
            setAssignOrderModal(order);
          }}
          t={t}
          navigate={navigate}
        />
      )}

      {/* Fleet-Wide VRP Optimization Modal */}
      {showOptimizeModal && (
        <FleetOptimizationModal
          isOpen={showOptimizeModal}
          onClose={() => setShowOptimizeModal(false)}
          onApplySuccess={() => {
            setShowOptimizeModal(false);
            loadData();
          }}
          orders={orders}
          resources={resources}
          selectedDate={selectedDate}
        />
      )}

      {/* Enterprise Drop & Hook Modal */}
      <DropHookModal
        isOpen={dropHookConfig.isOpen}
        onClose={() => setDropHookConfig(p => ({ ...p, isOpen: false }))}
        onSuccess={() => {
          setDropHookConfig(p => ({ ...p, isOpen: false }));
          loadData();
        }}
        mode={dropHookConfig.mode}
        initialTrailerId={dropHookConfig.trailerId}
        initialTripId={dropHookConfig.tripId}
        trailers={boardData?.trailers || []}
        trucks={resources}
        drivers={boardData?.drivers || []}
      />

      {/* Enterprise Cross-Docking Modal */}
      <CrossDockModal
        isOpen={crossDockConfig.isOpen}
        onClose={() => setCrossDockConfig({ isOpen: false })}
        onSuccess={() => {
          setCrossDockConfig({ isOpen: false });
          loadData();
        }}
        initialOrderId={crossDockConfig.orderId}
        initialTripId={crossDockConfig.tripId}
        orders={orders}
        trips={trips}
      />

      {/* Enterprise Subcontractor / Charter Modal */}
      <SubcontractorModal
        isOpen={!!subcontractorTargetTrip}
        onClose={() => setSubcontractorTargetTrip(null)}
        onSuccess={() => {
          setSubcontractorTargetTrip(null);
          loadData();
        }}
        trip={subcontractorTargetTrip}
      />

      {/* Enterprise Split Trip Modal */}
      {splitTripTarget && (
        <SplitTripModal
          isOpen={!!splitTripTarget}
          trip={splitTripTarget}
          onClose={() => setSplitTripTarget(null)}
          onSplit={async (tripId, orderIds) => {
            await planningApi.splitTrip(tripId, orderIds);
            setSplitTripTarget(null);
            setSelectedTripId(null);
            loadData();
          }}
        />
      )}

      {/* Enterprise Combine Trips Modal */}
      {showCombineModal && (
        <CombineTripsModal
          isOpen={showCombineModal}
          trips={trips}
          initialTripId={combineInitialTrip?.id || null}
          onClose={() => {
            setShowCombineModal(false);
            setCombineInitialTrip(null);
          }}
          onCombine={async (sourceTripId, targetTripId) => {
            await planningApi.combineTrips(sourceTripId, targetTripId);
            setShowCombineModal(false);
            setCombineInitialTrip(null);
            setSelectedTripId(null);
            loadData();
          }}
        />
      )}

      {compareTrip && (
        <RouteComparisonModal
          trip={compareTrip}
          onClose={() => setCompareTrip(null)}
          onApplied={(updated) => {
            loadData();
            if (updated?.id) setSelectedTripId(updated.id);
          }}
        />
      )}

      {trafficTrip && <TrafficIncidentsModal trip={trafficTrip} onClose={() => setTrafficTrip(null)} />}

      {activityDriver && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-md" onClick={() => setActivityDriver(null)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <DriverActivityTimeline
              driverId={activityDriver.id}
              driverName={activityDriver.name}
              onClose={() => setActivityDriver(null)}
            />
          </div>
        </div>,
        document.body,
      )}

      {/* Enterprise Planning Export Modal */}
      {showExportModal && (
        <PlanningExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          trips={trips}
          resources={resources}
          selectedDate={selectedDate}
          conflicts={boardData?.conflicts || []}
        />
      )}

      {/* Enterprise Saved Views Modal */}
      {showSaveViewModal && (
        <SavedViewsModal
          isOpen={showSaveViewModal}
          onClose={() => setShowSaveViewModal(false)}
          onSave={async (name, isDefault) => {
            const newView = await planningApi.saveView({
              name,
              isDefault,
              viewMode,
              grouping,
              filters: {
                search,
                status: statusFilter,
                truckId: truckFilter,
                driverId: driverFilter,
                priority: priorityFilter,
              },
              dateRange: { from: selectedDate },
            });
            setSavedViews(prev => [...prev, newView]);
            setCurrentViewId(newView.id);
            toast.success(t('view_saved', 'View saved successfully'));
          }}
        />
      )}

      {wizardConfig && (
        <OrderWizard
          key={`${wizardConfig.orderId}-${wizardConfig.initialStep}-${wizardConfig.highlight}`}
          isOpen={true}
          orderId={wizardConfig.orderId}
          initialStep={wizardConfig.initialStep}
          highlightSection={wizardConfig.highlight}
          onClose={() => setWizardConfig(null)}
          onSaved={() => {
            setWizardConfig(null);
            loadData();
            setDrawerRefreshKey(k => k + 1);
          }}
        />
      )}
      {dispatchModalTrip && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDispatchModalTrip(null)}>
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">{t('dispatch_modal_title', 'Dispatch Trip')}</h3>
                  <p className="text-xs text-text-secondary">{dispatchModalTrip.tripNumber || 'Trip'}</p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-black">
                {t('dispatch_version', 'Dispatch Version')} v{(dispatchModalTrip.dispatchVersion || 0) + 1}
              </span>
            </div>

            <div className="bg-surface/50 rounded-2xl p-4 border border-border/80 space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-text-secondary text-[10px] uppercase font-bold">{t('export_col_driver', 'Driver')}</span>
                  <p className="font-black text-text-primary text-sm mt-0.5">{[dispatchModalTrip.driver, dispatchModalTrip.truck?.driver].map(d => d && driverEntityDisplayName(d) !== '—' ? driverEntityDisplayName(d) : null).find(Boolean) || dispatchModalTrip.carrierDriverName || '—'}</p>
                  {dispatchModalTrip.driver?.phone && <p className="text-[10px] text-text-muted mt-0.5">{dispatchModalTrip.driver.phone}</p>}
                </div>
                <div>
                  <span className="text-text-secondary text-[10px] uppercase font-bold">{t('export_col_truck', 'Truck & Trailer')}</span>
                  <p className="font-black text-text-primary text-sm mt-0.5">{dispatchModalTrip.truck?.plateNumber || '—'}</p>
                  {dispatchModalTrip.trailer?.plateNumber && <p className="text-[10px] text-text-muted mt-0.5">{dispatchModalTrip.trailer.plateNumber}</p>}
                </div>
              </div>

              <div className="border-t border-border/60 pt-2.5 grid grid-cols-3 gap-2">
                <div>
                  <span className="text-text-secondary text-[10px] uppercase font-bold">{t('jsx_stops', 'Stops')}</span>
                  <p className="font-bold text-text-primary mt-0.5">{dispatchModalTrip.stops?.length || 0}</p>
                </div>
                <div>
                  <span className="text-text-secondary text-[10px] uppercase font-bold">{t('jsx_orders', 'Orders')}</span>
                  <p className="font-bold text-text-primary mt-0.5">{dispatchModalTrip.orders?.length || 0}</p>
                </div>
                <div>
                  <span className="text-text-secondary text-[10px] uppercase font-bold">{t('departure', 'Departure')}</span>
                  <p className="font-bold text-text-primary mt-0.5">{dispatchModalTrip.plannedDeparture ? new Date(dispatchModalTrip.plannedDeparture).toLocaleDateString() : 'Today'}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              {t('dispatch_modal_desc', 'Send trip instructions to driver mobile application.')}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button onClick={() => setDispatchModalTrip(null)} disabled={!!loadingAction} className="btn-secondary text-xs py-2.5 px-4 font-bold">
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={() => handleTripAction('send', dispatchModalTrip.id, {})}
                disabled={!!loadingAction}
                className="btn-primary text-xs py-2.5 px-5 font-black shadow-md shadow-primary/20 flex items-center gap-1.5"
              >
                {loadingAction === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {dispatchModalTrip.status === 'dispatched' ? t('dispatch_update_btn', 'Send Update') : t('dispatch_send_btn', 'Send Dispatch')}
              </button>
            </div>
          </div>
        </div>
      )}
      {pastDateConflict && (
        <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setPastDateConflict(null)}>
          <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">{t('past_date_modal_title', 'Comandă cu date în trecut detectată')}</h3>
                  <p className="text-xs text-text-secondary">{t('past_date_modal_desc', 'Comanda selectată are date de încărcare sau descărcare în trecut. Cum doriți să procedați?')}</p>
                </div>
              </div>
              <button
                onClick={() => setPastDateConflict(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of orders with old dates */}
            <div className="bg-surface/60 rounded-2xl p-3 border border-border/80 space-y-1.5 text-xs max-h-40 overflow-y-auto">
              {pastDateConflict.orders.map((po) => {
                const pDate = po.stops?.[0]?.dateFrom ? new Date(po.stops[0].dateFrom).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                const dDate = po.stops?.[po.stops.length - 1]?.dateFrom ? new Date(po.stops[po.stops.length - 1].dateFrom).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                return (
                  <div key={po.id} className="flex items-center justify-between py-1 px-2 rounded-lg bg-card/80 border border-border/50 text-xs">
                    <div className="font-bold text-text-primary flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      <span>{po.orderNumber}</span>
                      {po.client?.name && <span className="text-text-muted font-normal">· {po.client.name}</span>}
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <span>{pDate}</span>
                      <ArrowRight className="w-3 h-3 text-text-muted" />
                      <span>{dDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selection cards */}
            <div className="space-y-2">
              <div
                onClick={() => setPastDateConflict(prev => prev ? ({ ...prev, actionType: 'roll' }) : null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  pastDateConflict.actionType === 'roll'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                    : 'border-border bg-surface/30 hover:bg-surface/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    pastDateConflict.actionType === 'roll' ? 'bg-primary text-white' : 'border border-border'
                  }`}>
                    {pastDateConflict.actionType === 'roll' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-text-primary">
                        {t('past_date_opt_roll_title', 'Actualizează automat la data planificată (Recomandat)')}
                      </span>
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {t('jsx_recommended', 'Recomandat')}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      {t('past_date_opt_roll_desc', 'Setează încărcarea la data planificată și recalculează livrarea, păstrând durata de tranzit.')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setPastDateConflict(prev => prev ? ({ ...prev, actionType: 'retro' }) : null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  pastDateConflict.actionType === 'retro'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                    : 'border-border bg-surface/30 hover:bg-surface/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    pastDateConflict.actionType === 'retro' ? 'bg-primary text-white' : 'border border-border'
                  }`}>
                    {pastDateConflict.actionType === 'retro' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-text-primary">
                      {t('past_date_opt_retro_title', 'Păstrează datele originale (Cursă retroactivă)')}
                    </span>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      {t('past_date_opt_retro_desc', 'Salvează ca înregistrare istorică/efectuată fără a modifica datele originale.')}
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={() => setPastDateConflict(prev => prev ? ({ ...prev, actionType: 'wizard' }) : null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  pastDateConflict.actionType === 'wizard'
                    ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                    : 'border-border bg-surface/30 hover:bg-surface/60'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    pastDateConflict.actionType === 'wizard' ? 'bg-primary text-white' : 'border border-border'
                  }`}>
                    {pastDateConflict.actionType === 'wizard' && <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-black text-text-primary">
                      {t('past_date_opt_wizard_title', 'Deschide în Order Wizard')}
                    </span>
                    <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
                      {t('past_date_opt_wizard_desc', 'Ajustează manual ferestrele de timp și detaliile mărfii înainte de alocare.')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setPastDateConflict(null)}
                disabled={!!loadingAction}
                className="btn-secondary text-xs py-2 px-4 font-bold"
              >
                {t('past_date_cancel', 'Anulează')}
              </button>
              <button
                onClick={handleConfirmPastDate}
                disabled={!!loadingAction}
                className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                {loadingAction === 'assign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('past_date_confirm', 'Confirmă și Alocă')}
              </button>
            </div>
          </div>
        </div>
      )}
      {assignOrderModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setAssignOrderModal(null)}
        >
          <div
            className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <TruckIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-text-primary">
                    {t('plan_order_title', 'Alocă comanda pe camion')}
                  </h3>
                  <p className="text-xs text-text-secondary">
                    {assignOrderModal.orderNumber || '—'} · {assignOrderModal.client?.name || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssignOrderModal(null)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Order quick overview */}
            <div className="bg-surface/50 rounded-2xl p-3.5 border border-border/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text-primary">{assignOrderModal.orderNumber}</span>
                <span className="text-[11px] font-black text-primary uppercase px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                  {assignOrderModal.transportType || 'FTL'}
                </span>
              </div>
              {(() => {
                const stops = [...(assignOrderModal.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
                const pick = stops.find((s: any) => s.type === 'pickup') || stops[0];
                const drop = [...stops].reverse().find((s: any) => s.type === 'delivery' || s.type === 'dropoff') || stops[stops.length - 1];
                return (
                  <div className="space-y-1 text-[11px] text-text-secondary">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="font-semibold text-text-primary">{pick?.companyName || pick?.city || '—'}</span>
                      {pick?.dateFrom && <span className="text-text-muted">({fmtDate(pick.dateFrom)})</span>}
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-text-primary">{drop?.companyName || drop?.city || '—'}</span>
                      {drop?.dateFrom && <span className="text-text-muted">({fmtDate(drop.dateFrom)})</span>}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Truck Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-primary">
                {t('plan_order_select_truck', 'Selectați camionul')} *
              </label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {resources.map((truck) => {
                  const isSelected = (selectedAssignTruckId || resources[0]?.id) === truck.id;
                  return (
                    <div
                      key={truck.id}
                      onClick={() => setSelectedAssignTruckId(truck.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 ring-1 ring-primary shadow-xs'
                          : 'border-border bg-surface/30 hover:bg-surface/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'border border-border'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-text-primary">{truck.plateNumber}</span>
                            {truck.status && (
                              <span className="text-[10px] uppercase font-bold text-text-muted">
                                ({truck.status})
                              </span>
                            )}
                          </div>
                          {truck.driver?.user?.name && (
                            <p className="text-[11px] text-text-secondary mt-0.5">
                              {driverEntityDisplayName(truck.driver)}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-text-muted">
                        {truck.maxPayloadKg ? `${fmtNumber(truck.maxPayloadKg / 1000, 1)}t` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={() => setAssignOrderModal(null)}
                disabled={!!loadingAction}
                className="btn-secondary text-xs py-2 px-4 font-bold"
              >
                {t('cancel', 'Anulează')}
              </button>
              <button
                onClick={async () => {
                  const targetTruckId = selectedAssignTruckId || resources[0]?.id;
                  if (!targetTruckId) {
                    toast.error(t('select_truck_required', 'Vă rugăm să selectați un camion'));
                    return;
                  }
                  const orderToPlan = assignOrderModal;
                  setAssignOrderModal(null);
                  handleDropOrder(targetTruckId, orderToPlan.id);
                }}
                disabled={!!loadingAction || !resources.length}
                className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-1.5 shadow-md shadow-primary/20"
              >
                {loadingAction === 'assign' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('plan_order_confirm_btn', 'Confirmă și Planifică')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
