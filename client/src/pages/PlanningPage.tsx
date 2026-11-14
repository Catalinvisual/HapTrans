import {
  useEffect, useRef, useState, useCallback, useMemo
} from 'react';
import { createPortal } from 'react-dom';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle,
  Users, X, ChevronRight, ChevronLeft, Calendar, ArrowRight, Activity, Search,
  Undo2, SplitSquareHorizontal, Send, ShieldCheck,
  LayoutGrid, Clock, Map as MapIcon, Sparkles, CheckSquare, Square, RefreshCw,
  ChevronsLeft, ChevronsRight, Plus, ArrowUp, ArrowDown, Layers, Navigation,
  Printer, Maximize2, Minimize2, RotateCcw, List, FileText, Pencil, CalendarDays,
  BookmarkPlus, Save, Trash2, GitMerge, Wand2, Clock3,
  ZoomIn, ZoomOut, Unplug, Link as LinkIcon, ArrowRightLeft, Building2, Euro,
  Gauge, Repeat2, Eye, EyeOff, Command, MoreHorizontal, PanelRightClose, PanelRightOpen,
  SlidersHorizontal, Lock, Unlock,
  Info,
  CalendarClock,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../lib/api';
import { orderIsAdr, tripIsAdr } from '../lib/adrDetect';
import { driverEntityDisplayName } from '../lib/driverName';
import DateField from '../components/dashboard/DateField';
import { useShortcuts } from '../hooks/useShortcuts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import '../planning-theme.css';
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
import { buildTruckDimensionsEditUrl } from '../lib/fleetTruckDeepLink';
import ConsolidationWizard from '../components/ConsolidationWizard';
import { providerStatusMessage } from '../lib/providerStatus';
import { statusTone } from '../lib/statusColors';
import { operationalStatusForDisplay, operationalStatusKey } from '../lib/operationalI18n';
import {
  layoutTimelineTrips,
  TIMELINE_CARD_HEIGHT,
  TIMELINE_LANE_GAP,
  TIMELINE_LANE_HEIGHT,
  timelineCardTop,
  timelineRowHeight,
  tripTimePosition,
} from '../lib/timelineLayout';
import { OPERATIONAL_TIME_ZONE } from '../lib/stopAppointment';
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
import PlanningCommandPalette, { type PaletteAction } from '../components/planning/PlanningCommandPalette';
import PlanningSuggestionsPanel from '../components/planning/PlanningSuggestionsPanel';
import NearbyLoadsPanel from '../components/planning/NearbyLoadsPanel';
import PlanningScenariosPanel from '../components/planning/PlanningScenariosPanel';
import PlanningDocumentsModal from '../components/planning/PlanningDocumentsModal';
import PlanningRecoveryPanel from '../components/planning/PlanningRecoveryPanel';
import StopEditorRow from '../components/planning/StopEditorRow';
import {
  PROVENANCE,
  avgSpeedKmh,
  isMovableTrip,
  planVarianceMin,
  provenanceOf,
  shiftWindow,
  toggleHiddenTrip,
} from '../lib/planningPremium';

function useResizableSidebar(initialWidth: number = 330, minWidth: number = 300, maxWidth: number = 650) {
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
/** Step the board's date anchor by one period of the active view. */
const shiftPeriod = (value: string, mode: string, dir: number) => {
  const d = parseDay(value);
  if (mode === 'month') return dayStr(new Date(d.getFullYear(), d.getMonth() + dir, 1));
  if (mode === 'week') return dayStr(addDays(d, dir * 7));
  return dayStr(addDays(d, dir));
};
const parseDay = (s: string) => {
  const [y, m, d] = (s || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};
/**
 * "Now" on the board is the Netherlands wall clock, whatever zone the machine
 * that happens to be looking at it is set to.
 */
const TIMELINE_NOW_ZONE = 'Europe/Amsterdam';

function operationalNow(ts: number) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMELINE_NOW_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(ts));
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute')) % 60;
  return {
    dateKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour,
    minute,
    minutesOfDay: hour * 60 + minute,
  };
}

// Trip stop timestamps are UTC instants; render them in the operational zone so
// 08:00 entered is 08:00 displayed, whatever the browser zone is.
function fmtTime(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: OPERATIONAL_TIME_ZONE });
}
function fmtDate(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString([], { timeZone: OPERATIONAL_TIME_ZONE });
}
function fmtShort(d: any) {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return x.toLocaleDateString([], { day: '2-digit', month: 'short' });
}

/**
 * Simultaneous load peak for one trip, from its persisted stop tasks.
 *
 * Capacity is a statement about what is on board at the same moment, so a pallet
 * delivered before the next pickup must not be added to the pallet picked up
 * later. Returns null when no stop carries a load/unload task, so the caller can
 * fall back to the assigned total instead of inventing a peak.
 */
function tripCargoPeak(trip: any): { weight: number; pallets: number; ldm: number; volume: number } | null {
  const stops = Array.isArray(trip?.stops) ? [...trip.stops] : [];
  if (!stops.length) return null;
  stops.sort((a, b) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
  let weight = 0, pallets = 0, ldm = 0, volume = 0;
  let peak = { weight: 0, pallets: 0, ldm: 0, volume: 0 };
  let sawTask = false;
  for (const stop of stops) {
    for (const task of stop?.tasks || []) {
      const type = String(task?.type || '').toLowerCase();
      const load = type === 'load' || type === 'pickup';
      const unload = type === 'unload' || type === 'delivery' || type === 'dropoff';
      if (!load && !unload) continue;
      sawTask = true;
      const sign = load ? 1 : -1;
      const taskPallets = task.pallets != null
        ? Number(task.pallets) || 0
        : String(task.unit || '').toLowerCase() === 'pallet' ? Number(task.quantity) || 0 : 0;
      weight += sign * (Number(task.weightKg) || 0);
      pallets += sign * taskPallets;
      ldm += sign * (Number(task.loadingMeters) || 0);
      volume += sign * (Number(task.volumeCbm) || 0);
      peak = {
        weight: Math.max(peak.weight, weight),
        pallets: Math.max(peak.pallets, pallets),
        ldm: Math.max(peak.ldm, ldm),
        volume: Math.max(peak.volume, volume),
      };
    }
  }
  return sawTask ? peak : null;
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

// Timeline geometry (lane allocation, overlap detection, repositioning gaps)
// lives in lib/timelineLayout.ts so the algorithm is regression-tested without
// React, and the page only binds it to the view.

// ─── Map Component ──────────────────────────────────────────────────────────
function PlanningMap({
  mapData, selectedTripId, onSelectTrip, isLoading, hiddenTripIds, compact = false,
}: {
  mapData: any; selectedTripId: string | null; onSelectTrip: (id: string) => void; isLoading: boolean;
  hiddenTripIds?: ReadonlySet<string>; compact?: boolean;
}) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  // Clicking a truck shows the truck itself (driver, position, active trip)
  // instead of jumping straight into a trip the dispatcher did not ask for.
  const [vehicleCard, setVehicleCard] = useState<any>(null);
  const [layersOpen, setLayersOpen] = useState(false);
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
      const features = mapData.routes
        .filter((r: any) => r.points?.length >= 2 && !hiddenTripIds?.has(String(r.tripId)))
        .map((r: any) => {
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
        if (hiddenTripIds?.has(String(s.tripId))) continue;
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
        el.addEventListener('click', () => setVehicleCard(v));
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
  }, [mapReady, mapData, showRoutes, showVehicles, showStops, showTraffic, showTolls, showDropHook, showCrossDock, showConflicts, selectedTripId, onSelectTrip, fitAll, hiddenTripIds]);

  // Keep the panel pointed at what the dispatcher just selected, without
  // resetting the zoom on every data refresh.
  const lastCentredTrip = useRef<string | null>(null);
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady || !selectedTripId) return;
    if (lastCentredTrip.current === selectedTripId) return;
    const route = mapData?.routes?.find((candidate: any) => String(candidate.tripId) === String(selectedTripId));
    if (!route?.points?.length) return;
    lastCentredTrip.current = selectedTripId;
    const bounds = new maplibregl.LngLatBounds();
    route.points.forEach((point: number[]) => bounds.extend([point[1], point[0]]));
    try { map.fitBounds(bounds, { padding: compact ? 40 : 80, maxZoom: 12 }); } catch { /* map not ready */ }
  }, [selectedTripId, mapData, mapReady, compact]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      {vehicleCard && (
        <div className="absolute left-2 top-2 z-30 w-60 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface/60 px-2.5 py-1.5">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-text-primary">
              <TruckIcon className="h-3.5 w-3.5 text-primary" />
              {vehicleCard.plateNumber || t('map_truck_title', 'Truck')}
            </span>
            <button
              type="button"
              onClick={() => setVehicleCard(null)}
              className="rounded p-0.5 text-text-muted transition-colors hover:text-text-primary"
              title={t('map_truck_close', 'Close')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5 p-2.5">
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-text-muted">{t('map_truck_driver', 'Driver')}</span>
              <span className="truncate font-bold text-text-primary">{vehicleCard.driver || t('map_truck_no_driver', 'Unassigned')}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-text-muted">{t('map_truck_status', 'Status')}</span>
              <span className="rounded-full border border-border bg-surface px-1.5 py-0.5 text-[9px] font-black uppercase text-text-secondary">
                {String(vehicleCard.status || '—').replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10px]">
              <span className="text-text-muted">{t('map_truck_position', 'Position')}</span>
              <span className="font-mono text-[9px] font-bold tabular-nums text-text-secondary">
                {Number(vehicleCard.lat).toFixed(3)}, {Number(vehicleCard.lng).toFixed(3)}
              </span>
            </div>
            {vehicleCard.tripId ? (
              <button
                type="button"
                onClick={() => { onSelectTrip(String(vehicleCard.tripId)); setVehicleCard(null); }}
                className="mt-1 flex h-7 w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-[10px] font-black text-white transition-colors hover:bg-orange-600"
              >
                {t('map_truck_open_trip', 'Open current trip')}
              </button>
            ) : (
              <p className="rounded-lg bg-surface px-2 py-1.5 text-[10px] font-semibold text-text-muted">
                {t('map_truck_no_trip', 'No active trip')}
              </p>
            )}
          </div>
        </div>
      )}
      {/* Layers start collapsed so the map itself is the first thing you see. */}
      <button
        type="button"
        onClick={() => setLayersOpen((value) => !value)}
        aria-expanded={layersOpen}
        className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-lg border border-border bg-card/95 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-text-secondary shadow-sm backdrop-blur transition-colors hover:text-text-primary"
      >
        <Layers className="h-3 w-3 text-primary" />
        {t('layer_routes', 'Layers')}
      </button>
      {layersOpen && (
      <div className={`absolute z-10 bg-card/95 backdrop-blur p-2 rounded-xl border border-border shadow-lg space-y-1.5 overflow-y-auto ${compact ? 'top-11 left-3 text-[9px] max-h-[65%]' : 'top-12 left-3 text-xs max-h-[80vh]'}`}>
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
      )}
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
  order, selected, onToggle, onDetail, draggingId, setDraggingId, onTouchDragStart,
}: {
  order: any; selected?: boolean; onToggle?: (id: string, sel: boolean) => void;
  onDetail?: (order: any) => void; draggingId: string | null; setDraggingId: (id: string | null) => void;
  onTouchDragStart?: (orderId: string, event: React.PointerEvent) => void;
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
      onPointerDown={(event) => onTouchDragStart?.(order.id, event)}
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
          <span className="font-bold text-text-primary text-[12px] truncate">{order.orderNumber || '—'}</span>
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

      {/* Route gets the full width: truncated city names were the ugliest
          thing in the pool. Cargo moves down to the dates row. */}
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary min-w-0">
        <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{pickup?.city || pickup?.address?.split(',')[0] || '—'}</span>
        <ArrowRight className="w-2.5 h-2.5 shrink-0 text-text-muted" />
        <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="min-w-0 flex-1 truncate font-semibold text-text-primary">{dropoff?.city || dropoff?.address?.split(',')[0] || '—'}</span>
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
  trip, isSelected, onClick, fromDate, totalMinutes, lane = 0, overlapCount = 0, ordinal = 1, ordinalTotal = 1,
}: {
  trip: any; isSelected: boolean; onClick: () => void; fromDate: string; totalMinutes: number;
  lane?: number; overlapCount?: number; ordinal?: number; ordinalTotal?: number;
}) {
  const { t } = useTranslation();
  const pos = tripTimePosition(trip, fromDate, totalMinutes);
  if (!pos) return null;

  const legacySt = String(trip.status || 'planning').toLowerCase();
  const st = operationalStatusForDisplay(trip).toLowerCase();
  const opLabel = t(operationalStatusKey(trip), operationalStatusForDisplay(trip));
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
  const cardHeight = TIMELINE_CARD_HEIGHT;
  const cardTop = timelineCardTop(lane);
  const orderRefs = (trip.orders || []).map((o: any) => o.orderNumber || o.reference || '—').filter(Boolean);
  const stops = ((trip.stops?.length ? trip.stops : (trip.orders || []).flatMap((o: any) => o.stops || [])) || [])
    .slice().sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  // Window risk: a deterministic projection (arrival vs the customer window),
  // not a probability. "At risk" means inside the last 30 minutes of the window.
  const lateStops = (() => {
    let missed = 0;
    let atRisk = 0;
    for (const stop of stops) {
      const etaRaw = stop?.eta || stop?.plannedDate || stop?.liveEta;
      const maxRaw = stop?.timeWindowMax || stop?.dateTo;
      const eta = etaRaw ? new Date(etaRaw).getTime() : NaN;
      const max = maxRaw ? new Date(maxRaw).getTime() : NaN;
      if (!Number.isFinite(eta) || !Number.isFinite(max)) continue;
      if (eta > max) missed += 1;
      else if (eta > max - 30 * 60000) atRisk += 1;
    }
    return { missed, atRisk };
  })();
  // Everything that does not fit on a compact card lives here, in the hover
  // panel, instead of being squeezed into the timeline row.
  const detailsTooltip = [
    `${trip.tripNumber || '—'} · ${opLabel}`,
    `${origin} → ${dest}`,
    trip.plannedDeparture ? `${fmtTime(trip.plannedDeparture)}${trip.plannedArrival ? ` → ${fmtTime(trip.plannedArrival)}` : ''}` : null,
    orderRefs.length ? `${t('timeline_orders_short', 'ORD')}: ${orderRefs.join(' · ')}` : null,
    cargo.weight > 0 ? `${t('capacity_weight', 'Weight')}: ${fmtNumber(cargo.weight)} kg` : null,
    cargo.pallets > 0 ? `${t('capacity_pallets', 'Pallets')}: ${cargo.pallets}` : null,
    revenue > 0 ? `${t('revenue', 'Revenue')}: ${fmtMoney(revenue, 'EUR')}` : null,
    driverName ? `${t('driver', 'Driver')}: ${driverName}` : null,
    trailerPlate ? `${t('trailer', 'Trailer')}: ${trailerPlate}` : null,
    stops.length ? `${t('timeline_stop_sequence', 'Stop sequence')}: ${stops.slice(0, 8).map((s: any, idx: number) => `${idx + 1}. ${s.city || s.address || s.type || ''}`).join(' → ')}` : null,
    ['planning', 'planned', 'assigned'].includes(legacySt) ? t('drag_trip_to_unassign', 'Trage spre Order Pool pentru a dezasocia, sau click pentru detalii') : null,
  ].filter(Boolean).join('\n');

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
      className="absolute cursor-pointer group/block"
      style={{
        // Percentages resolve against the lane layer, so the card can never
        // extend past the end of the timeline and be clipped by the scroll box.
        left: `${pos.left}%`,
        width: `${Math.max(1.5, Math.min(pos.width, 100 - pos.left))}%`,
        // A short trip must still be readable: keep a legible floor instead of
        // collapsing the card to a 34px sliver, and let the lane scroll.
        minWidth: isVeryNarrow ? 96 : 0,
        top: `${cardTop}px`, height: `${cardHeight}px`,
        zIndex: isSelected ? 20 : 5,
      }}
      data-trip-id={trip.id}
      data-trip-lane={lane + 1}
      onClick={onClick}
      title={detailsTooltip}
    >
      <div
        className={`relative h-full rounded-lg border overflow-hidden transition-all duration-150 flex flex-col bg-card ${
          overlapCount > 0 ? 'border-red-500/70' : 'border-border/80'
        } ${
          isSelected
            ? 'ring-2 ring-offset-1 shadow-lg z-10'
            : 'shadow-sm hover:shadow-md'
        }`}
        style={{
          borderLeftWidth: 4,
          borderLeftColor: hex,
          boxShadow: isSelected ? `0 0 0 2px ${hex}40` : undefined,
        }}
      >

        <div className="pl-2 pr-1.5 pt-1 pb-1.5 flex flex-col justify-center flex-1 min-h-0 overflow-hidden gap-0.5">
          {/* Row 1: Trip number + sequence + status + fleet badge */}
          <div className="flex items-center gap-1 min-w-0 flex-nowrap overflow-hidden">
            <span className={`font-black truncate tracking-tight text-text-primary ${isVeryNarrow ? 'text-[8px]' : 'text-[12px]'}`} style={{ maxWidth: isNarrow ? '100%' : '55%' }}>
              {trip.tripNumber || '—'}
            </span>
            {!isNarrow && (trip.truck?.plateNumber || trip.truckPlate) && (
              <span className="shrink-0 px-1 py-0 text-[7px] font-black rounded-sm bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 tabular-nums" title={`${t('truck', 'Truck')}: ${trip.truck?.plateNumber || trip.truckPlate}`}>
                {trip.truck?.plateNumber || trip.truckPlate}
              </span>
            )}
            {!isVeryNarrow && (
              <span
                className="shrink-0 inline-flex items-center gap-1 px-1 py-[1px] rounded text-[7px] font-black uppercase tracking-wide border"
                style={{ color: col.text, backgroundColor: col.bg, borderColor: col.border }}
              >
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: hex }} />
                {opLabel}
              </span>
            )}
            {!isVeryNarrow && (lateStops.missed > 0 || lateStops.atRisk > 0) && (
              <span
                className={`shrink-0 px-1 py-0 text-[7px] font-black rounded-sm uppercase border ${
                  lateStops.missed > 0
                    ? 'bg-rose-500/20 text-rose-600 border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-700 border-amber-500/30 dark:text-amber-300'
                }`}
                title={`${t(
                  'win_basis',
                  'Projected arrival versus the customer window, from live or planned ETA. A projection, not a probability.',
                )}`}
              >
                {lateStops.missed > 0
                  ? `${lateStops.missed} ${t('win_missed', 'late')}`
                  : `${lateStops.atRisk} ${t('win_at_risk', 'at risk')}`}
              </span>
            )}
            {overlapCount > 0 && (
              <span className="shrink-0 inline-flex items-center gap-0.5 text-red-600" title={t('timeline_overlap', 'This trip conflicts with another trip on the same resource')}>
                <AlertTriangle className="w-2.5 h-2.5" />
                {!isVeryNarrow && <span className="text-[7px] font-black uppercase">{t('timeline_conflict_short', 'Conflict')}</span>}
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
            <div className="text-[10.5px] font-bold text-text-primary truncate flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 shrink-0 text-blue-500" />
              <span className="truncate">{origin}</span>
              {dest !== '—' && <><ArrowRight className="w-1.5 h-1.5 shrink-0 opacity-60" /><span className="truncate">{dest}</span></>}
            </div>
          )}

          {/* Row 3: the one operational detail worth keeping inline. Everything
              else (cargo, revenue, driver, trailer, orders) is in the tooltip. */}
          {!isVeryNarrow && (
            <div className="flex items-center gap-1.5 min-w-0 text-[9.5px] font-semibold text-text-secondary tabular-nums">
              {trip.plannedDeparture && (
                <span className="truncate">
                  {fmtTime(trip.plannedDeparture)}{trip.plannedArrival ? `–${fmtTime(trip.plannedArrival)}` : ''}
                </span>
              )}
              {!isNarrow && ordersCount > 0 && (
                <span className="truncate text-text-muted">· {orderRefs.length > 1 ? `${ordersCount} ${t('timeline_orders_short', 'ORD')}` : orderRefs[0]}</span>
              )}
              {!isNarrow && ordersCount > 1 && (
                <span className="truncate text-text-muted">· {ordersCount} {t('timeline_orders_short', 'ORD')}</span>
              )}
              {!isNarrow && ordinalTotal > 1 && (
                <span className="truncate text-text-muted">· {ordinal}/{ordinalTotal}</span>
              )}
            </div>
          )}
        </div>

        {/* Stop sequence rail: a 2px read of pickup → delivery order. */}
        {!isVeryNarrow && stops.length > 0 && (
          <div className="absolute left-1.5 right-1.5 bottom-[3px] flex items-center gap-0.5 opacity-80" title={t('timeline_stop_sequence', 'Stop sequence')}>
            {stops.slice(0, 10).map((s: any, idx: number) => {
              const kind = String(s.type || '').toLowerCase();
              const isDelivery = kind.includes('deliver') || kind.includes('drop') || (idx === stops.length - 1 && stops.length > 1);
              return (
                <span
                  key={s.id || idx}
                  className={`h-1 rounded-full ${isDelivery ? 'bg-emerald-500' : 'bg-blue-500'}`}
                  style={{ width: `${100 / Math.min(stops.length, 10)}%` }}
                  title={`${idx + 1}. ${s.city || s.address || s.type || ''}`}
                />
              );
            })}
          </div>
        )}
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
  resource, trips, fromDate, totalMinutes, hoursVisible, selectedTripId, onSelectTrip, onDropOrder, onDropTrip, draggingId, draggingOrder, onOpenPlanner,
  hosSummary = {}, grouping = 'truck', colWidth = 52, timelineWidth, now = Date.now(), nowOffsetMinutes,
}: {
  resource: any; trips: any[]; fromDate: string; totalMinutes: number; hoursVisible: number; selectedTripId: string | null;
  onSelectTrip: (id: string) => void; onDropOrder: (resourceId: string, orderId?: string) => void;
  onDropTrip?: (resourceId: string, tripId: string) => void;
  draggingId: string | null; draggingOrder?: any;
  onOpenPlanner: (resource: any) => void;
  hosSummary?: Record<string, any>; grouping?: 'truck' | 'driver' | 'trailer';
  colWidth?: number; timelineWidth?: number; now?: number; nowOffsetMinutes?: number;
}) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const timelineLayout = useMemo(() => layoutTimelineTrips(trips, fromDate, totalMinutes), [trips, fromDate, totalMinutes]);
  const laneCount = timelineLayout.laneCount;
  const rowHeight = timelineRowHeight(laneCount);
  // The unassigned bucket is a triage list, not a fleet resource. With six
  // simultaneous unassigned trips it grew to 400px+ and pushed every truck row
  // out of the viewport, which read as "no truck rows at all".
  const isBucketRow = resource.id === '__unassigned_trips__';
  const renderedRowHeight = isBucketRow ? Math.min(rowHeight, 156) : rowHeight;
  const todayKey = operationalNow(now).dateKey;
  // The board owns the operational clock; the row only needs its offset.
  const nowMinutes = nowOffsetMinutes ?? (now - parseDay(fromDate).getTime()) / 60000;
  const showNow = nowMinutes >= 0 && nowMinutes <= totalMinutes;
  // Every board state change (opening a drawer or wizard, the minute tick)
  // re-renders every row. Keep these per-row trip scans out of that path.
  const nextTrip = useMemo(() => [...trips]
    .filter((tr: any) => tr.plannedDeparture && new Date(tr.plannedDeparture).getTime() >= now)
    .sort((a: any, b: any) => new Date(a.plannedDeparture).getTime() - new Date(b.plannedDeparture).getTime())[0], [trips, now]);
  const activeTrips = useMemo(
    () => trips.filter((tr: any) => !['completed', 'closed', 'cancelled'].includes(tr.status)),
    [trips],
  );
  const tripPeaks = useMemo(
    () => activeTrips.map((tr: any) => tripCargoPeak(tr)).filter(Boolean) as Array<{ weight: number; pallets: number; ldm: number; volume: number }>,
    [activeTrips],
  );
  // Capacity is compared with the simultaneous peak. Summing every order on the
  // resource showed 25/24 plt for a trip whose real peak is 24/24: the single
  // pallet delivered at Soest was already off the truck before the 24 loaded.
  const cargo = useMemo(() => {
    const assignedCargo = sumCargo(activeTrips.flatMap((tr: any) => tr.orders || []));
    const peakCargo = tripPeaks.length
      ? tripPeaks.reduce((best, item) => ({
        weight: Math.max(best.weight, item.weight),
        pallets: Math.max(best.pallets, item.pallets),
        ldm: Math.max(best.ldm, item.ldm),
        volume: Math.max(best.volume, item.volume),
      }), { weight: 0, pallets: 0, ldm: 0, volume: 0 })
      : null;
    return peakCargo || assignedCargo;
  }, [activeTrips, tripPeaks]);
  // Use the same capacity the server ledger and conflict engine use. Never
  // invent 24000 kg / 33 pallets: an unknown limit must read as unknown.
  const mwValue = resource.capacity?.maxWeightKg ?? resource.payloadCapacity ?? resource.maxWeightKg;
  const mpValue = resource.capacity?.maxPallets ?? resource.maxPallets;
  const mw = mwValue != null && Number(mwValue) > 0 ? Number(mwValue) : 0;
  const mp = mpValue != null && Number(mpValue) > 0 ? Number(mpValue) : 0;
  const st = String(resource.status || 'available').toLowerCase();
  const isMaintenance = st === 'maintenance';
  const statusDot = { active:'bg-emerald-400', available:'bg-emerald-400', assigned:'bg-blue-400', driving:'bg-amber-400', maintenance:'bg-red-400', inactive:'bg-slate-400' }[st] || 'bg-slate-400';
  const hasTrips = trips.length > 0;
  const calcTimelineWidth = timelineWidth || (hoursVisible * colWidth);
  const isHourScale = hoursVisible === 24;

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
  const weightText = `${(cargo.weight / 1000).toFixed(1)}t / ${mw > 0 ? `${(mw / 1000).toFixed(1)}t` : '—'}`;
  const palletText = `${Math.round(cargo.pallets)} / ${mp > 0 ? mp : '—'} plt`;
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
    // A whole trip can be dragged from the timeline onto another truck. The
    // move still runs through the assignment review, so the preflight decides
    // feasibility; this handler only forwards the intent.
    const raw = e.dataTransfer.getData('application/json');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.type === 'assigned-trip' && parsed.tripId) {
          if (resource.id === '__unassigned_trips__') {
            toast.error(t('pv_drag_trip_hint', 'Drag the trip onto another truck to move it'));
            return;
          }
          if (!isMaintenance) onDropTrip?.(resource.id, String(parsed.tripId));
          return;
        }
      } catch {
        /* not a trip payload */
      }
    }
    const droppedId = e.dataTransfer.getData('orderId') || e.dataTransfer.getData('text/plain') || draggingId;
    if (!isMaintenance && droppedId) {
      onDropOrder(resource.id, droppedId);
    }
  };

  return (
    <div
      data-resource-id={resource.id}
      className={`flex border-b-2 border-border group transition-colors ${isMaintenance ? 'bg-red-500/[0.02] hover:bg-red-500/[0.04]' : 'hover:bg-primary/[0.02]'}`}
      style={{ minWidth: `${224 + calcTimelineWidth}px`, minHeight: `${renderedRowHeight}px` }}
      data-resource-id={resource.id}
      data-timeline-lanes={laneCount}
      data-row-bucket={isBucketRow ? 'unassigned' : 'fleet'}
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
        {/* Identity header: the vehicle is the row's anchor, its state is a pill. */}
        <div className="flex items-start justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center border shrink-0 shadow-sm transition-colors ${
              isMaintenance ? 'bg-red-500/10 border-red-500/30' : hasTrips ? 'bg-primary/10 border-primary/30 group-hover/truck:bg-primary/20' : 'bg-surface border-border'
            }`}>
              {grouping === 'driver' ? (
                <Users className={`w-3.5 h-3.5 ${hasTrips ? 'text-primary' : 'text-text-muted'}`} />
              ) : (
                <TruckIcon className={`w-3.5 h-3.5 ${isMaintenance ? 'text-red-500' : hasTrips ? 'text-primary' : 'text-text-muted'}`} />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-black text-text-primary text-[13px] leading-tight truncate tracking-tight" title={resource.brand ? `${resource.brand} ${resource.model || ''}` : ''}>
                {resource.plateNumber || resource.name || resource.user?.name || '—'}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted truncate leading-tight">
                {[resource.brand, resource.model].filter(Boolean).join(' ') || (grouping === 'trailer' ? t('trailer', 'Trailer') : t('timeline_vehicle', 'Vehicle'))}
              </p>
            </div>
          </div>
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border/70 bg-surface/80 px-1.5 py-[1px] text-[7px] font-black uppercase tracking-wide text-text-secondary"
            title={st}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
            {isMaintenance ? t('status_maintenance', 'Maintenance') : st.charAt(0).toUpperCase() + st.slice(1)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-secondary pl-6">
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

        <div className="flex items-center justify-between pl-7 pr-1 text-[10px]">
          <span className={`inline-flex items-center gap-1 font-bold ${laneCount > 1 ? 'text-red-500' : hasTrips ? 'text-text-primary' : 'text-text-muted'}`}>
            <span className={`w-1 h-1 rounded-full ${hasTrips ? 'bg-primary' : 'bg-border'}`} />
            {trips.length} {t('timeline_trips_short', 'trips')}
            {laneCount > 1 ? ` · ${t('timeline_lane_count', '{{count}} lanes', { count: laneCount })}` : ''}
          </span>
          {nextTrip?.plannedDeparture && (
            <span className="truncate" title={t('timeline_next_departure', 'Next departure')}>{t('timeline_next_short', 'next')} {fmtTime(nextTrip.plannedDeparture)}</span>
          )}
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
        style={{
          minWidth: `${calcTimelineWidth}px`,
          maxHeight: isBucketRow ? `${renderedRowHeight}px` : undefined,
          overflowY: isBucketRow ? 'auto' : undefined,
        }}
        onDragOver={handleRowDragOver}
        onDragLeave={handleRowDragLeave}
        onDrop={handleRowDrop}
      >
        {/* Day / hour grid lines. Night and weekend bands make the time axis readable. */}
        <div className="absolute inset-0 flex pointer-events-none" style={{ minWidth: `${calcTimelineWidth}px` }}>
          {Array.from({ length: hoursVisible }, (_, h) => {
            const colDate = addDays(parseDay(fromDate), h);
            const isToday = dayStr(colDate) === todayKey;
            const isWeekendDay = !isHourScale && [0, 6].includes(colDate.getDay());
            const isNightHour = isHourScale && (h < 6 || h >= 21);
            return (
              <div
                key={h}
                className={`flex-1 border-r border-border/20 last:border-0 ${
                  isToday ? 'bg-primary/[0.05]' : isWeekendDay || isNightHour ? 'bg-slate-500/[0.055]' : ''
                } ${isHourScale && h % 6 === 0 ? 'border-l border-l-border/50' : ''}`}
                style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
              />
            );
          })}
        </div>

        {/* Stacked lanes keep simultaneous trips legible instead of hiding one another. */}
        {Array.from({ length: Math.max(0, laneCount - 1) }, (_, lane) => (
          <div
            key={`lane-separator-${lane}`}
            className="absolute left-0 right-0 border-t border-dashed border-border/60 pointer-events-none"
            style={{ top: `${TIMELINE_LANE_GAP + (lane + 1) * TIMELINE_LANE_HEIGHT - 4}px` }}
          />
        ))}

        {/* Repositioning intervals between consecutive trips on the same lane. */}
        {timelineLayout.repositioning.map((gap, index) => (
          <div
            key={`reposition-${gap.fromId}-${gap.toId}-${index}`}
            className="absolute h-[2px] border-t border-dashed border-text-muted/50 pointer-events-none z-[2]"
            style={{ left: `${gap.left}%`, width: `${gap.width}%`, top: `${timelineCardTop(gap.lane) + 24}px` }}
            title={`${t('timeline_reposition', 'Repositioning')}: ${gap.minutes} min`}
          >
            {gap.width > 5 && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[7px] font-bold text-text-muted bg-card/90 px-1 rounded whitespace-nowrap">
                {t('timeline_reposition_short', 'empty')} {gap.minutes}m
              </span>
            )}
          </div>
        ))}

        {/* Current-time marker */}
        {showNow && (
          <div className="absolute top-0 bottom-0 z-[8] pointer-events-none" style={{ left: `${(nowMinutes / totalMinutes) * 100}%` }} data-testid="timeline-now-marker">
            <div className="h-full border-l-2 border-primary/70" />
          </div>
        )}

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

        {/* Trip blocks: each independent trip occupies its own lane and shows grouped orders. */}
        {trips.map(tr => {
          const meta = timelineLayout.byId.get(tr.id);
          return (
            <TripBlock
              key={tr.id}
              trip={tr}
              isSelected={selectedTripId === tr.id}
              onClick={() => onSelectTrip(tr.id)}
              fromDate={fromDate}
              totalMinutes={totalMinutes}
              lane={meta?.lane || 0}
              overlapCount={meta?.overlapCount || 0}
              ordinal={meta?.ordinal || 1}
              ordinalTotal={trips.length}
            />
          );
        })}
      </div>
    </div>
  );
}



// ─── Trip Detail Drawer ──────────────────────────────────────────────────────
function TripDetailDrawer({
  tripSummary, resources = [], drivers = [], trailers = [], conflicts = [], hosSummary = {},
  onClose, onAction, onReorderStops, onEditOrder, onSplitTrip, onCombineTrip, onAutoOrderStops,
  onDropHook, onCrossDock, onSubcontractor, onOpenDriverActivity,
  onSaveStop, onStopLockChange,
  loadingAction, refreshKey,
}: {
  tripSummary: any; resources?: any[]; drivers?: any[]; trailers?: any[]; conflicts?: any[]; hosSummary?: Record<string, any>;
  onClose: () => void; onAction: (action: string, tripId: string, payload?: any) => any;
  onReorderStops: (tripId: string, stopIds: string[]) => void;
  onEditOrder?: (orderId: string, initialStep?: number, highlight?: string) => void;
  onSplitTrip?: (trip: any) => void;
  onCombineTrip?: (trip: any) => void;
  onAutoOrderStops?: (tripId: string) => void;
  onDropHook?: (payload: { mode: 'drop' | 'hook'; trailerId?: string; tripId?: string }) => void;
  onCrossDock?: (payload: { tripId?: string }) => void;
  onSubcontractor?: (trip: any) => void;
  onOpenDriverActivity?: (driver: any) => void;
  onSaveStop?: (stopId: string, patch: any) => Promise<void>;
  onStopLockChange?: (routePlanId: string, routePlanStopId: string, locked: boolean) => Promise<void>;
  loadingAction?: string | null;
  refreshKey?: number;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [auditEvents, setAuditEvents] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'orders' | 'cargo' | 'financial' | 'audit'>('stops');
  const [tripDetail, setTripDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [cargoLedger, setCargoLedger] = useState<any>(null);
  const [cargoLedgerLoading, setCargoLedgerLoading] = useState(false);
  const [cargoLedgerError, setCargoLedgerError] = useState<string | null>(null);
  // Inline stop editing: one stop at a time, so the drawer never becomes a form.
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopSaving, setStopSaving] = useState(false);
  const [stopLockBusyId, setStopLockBusyId] = useState<string | null>(null);

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
    setCargoLedger(null);
    setCargoLedgerError(null);
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

  // The ledger is persisted as stop tasks; this endpoint returns the audited
  // cumulative projection for every route segment.
  useEffect(() => {
    if (!tripSummary?.id) return;
    let cancelled = false;
    setCargoLedgerLoading(true);
    setCargoLedgerError(null);
    api.get(`/planning/trips/${tripSummary.id}/cargo-ledger`)
      .then((response) => { if (!cancelled) setCargoLedger(response.data); })
      .catch((error) => { if (!cancelled) setCargoLedgerError(error?.response?.data?.message || t('cargo_load_failed', 'Cargo ledger could not be loaded.')); })
      .finally(() => { if (!cancelled) setCargoLedgerLoading(false); });
    return () => { cancelled = true; };
  }, [tripSummary?.id, refreshKey, t]);

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
  const opLabel = t(operationalStatusKey(trip), operationalStatusForDisplay(trip));
  
  const isPlanning = ['planning', 'planned', 'assigned'].includes(st);
  const isConfirmed = st === 'confirmed' || st === 'assigned';
  const isDispatched = ['dispatched', 'driver_accepted', 'started', 'at_pickup', 'loading', 'driving', 'at_delivery', 'unloading', 'partially_delivered'].includes(st);
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

  // The route plan carries the optimisation lock; the trip stop does not.
  const routePlanForTrip: any = (trip as any).routePlan || (tripSummary as any).routePlan || null;
  const routePlanStopFor = (stop: any): any | null => {
    const planStops: any[] = routePlanForTrip?.stops || [];
    if (!planStops.length) return null;
    const kind = String(stop?.type || '').toLowerCase() === 'pickup' ? 'pickup' : 'delivery';
    return planStops.find((candidate: any) => candidate.id && candidate.id === stop?.routePlanStopId)
      || planStops.find((candidate: any) => candidate.orderId && stop?.orderId && candidate.orderId === stop.orderId
        && String(candidate.type || '').toLowerCase().includes(kind))
      || planStops.find((candidate: any) => Number(candidate.sequence) === Number(stop?.sequence))
      || null;
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

  const validationCode = String(trip.validationStatus || '').toLowerCase();
  const validationLabelKey = ['feasible', 'warning', 'not_feasible', 'not_validated', 'validating'].includes(validationCode)
    ? `status_${validationCode}`
    : 'status_unknown';
  const validationClass = validationCode === 'feasible'
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
    : validationCode === 'warning'
      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600'
      : validationCode === 'not_feasible'
        ? 'bg-red-500/10 border-red-500/30 text-red-600'
        : 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-300';

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
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border-2 uppercase ${col.border} ${col.text}`}>{opLabel}</span>
              {trip.fleetType && trip.fleetType !== 'own_fleet' && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full border uppercase bg-violet-500/10 border-violet-500/30 text-violet-600">
                  {trip.fleetType === 'subcontractor' ? `Sub: ${trip.carrierName || 'Carrier'}` : 'Charter'}
                </span>
              )}
              {trip.validationStatus && (
                <span className={`px-2 py-0.5 text-[10px] font-black rounded-full border uppercase ${validationClass}`}>
                  {t(validationLabelKey, t('status_unknown', 'Status unavailable'))}
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
                  {etaInfo?.etaType === 'live_gps'
                    ? t('up_eta_live', 'Live ETA (GPS)')
                    : etaInfo?.etaType === 'stale_gps'
                      ? t('up_eta_stale_label', 'Stale GPS')
                      : etaInfo?.available
                        ? t('up_eta_estimated', 'Estimated ETA (no live GPS)')
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
                        <span className={`font-black tabular-nums ${Number(stop.deviationVsPlannedMin ?? stop.deviationMin) > 0 ? 'text-rose-600' : Number(stop.deviationVsPlannedMin ?? stop.deviationMin) === 0 ? 'text-emerald-600' : 'text-text-muted'}`}>
                          {etaDifferenceLabel(stop.deviationVsPlannedMin ?? stop.deviationMin)}
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
          {[['stops',`${t('jsx_stops','Stops')} (${detailLoading ? '…' : stops.length})`,MapPin],['orders',`${t('jsx_orders','Orders')} (${detailLoading ? '…' : orders.length})`,Package],['cargo',t('cargo_ledger','Cargo ledger'),WeightKgIcon],['financial',t('financial_breakdown','Financials'),Activity],['audit',t('jsx_audit','Audit'),Clock]].map(([id,label,Icon]: any) => (
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
                  <span>{stops.length} {t('stops', 'Stops')} · {isConfirmed ? t('status_confirmed', 'Confirmed') : opLabel}</span>
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
                // Shown against the planned ETA, so it must be the deviation
                // from the plan, not from the time-window end.
                const etaDeviation = etaStop?.deviationVsPlannedMin ?? etaStop?.deviationMin;
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
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setEditingStopId(editingStopId === s.id ? null : s.id)}
                          className={`rounded p-1 transition-colors hover:bg-surface ${editingStopId === s.id ? 'text-primary' : 'text-text-secondary'}`}
                          title={t('pv_stop_edit', 'Edit stop')}
                          aria-label={t('pv_stop_edit', 'Edit stop')}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {isPlanning && (
                          <div className="flex flex-col gap-0.5">
                            <button disabled={idx === 0 || !!loadingAction} onClick={() => moveStop(idx, 'up')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                            <button disabled={idx === stops.length - 1 || !!loadingAction} onClick={() => moveStop(idx, 'down')} className="p-1 rounded hover:bg-surface text-text-secondary disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </div>
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
                      {editingStopId === s.id && (
                        <StopEditorRow
                          stop={s}
                          locked={Boolean(routePlanStopFor(s)?.locked)}
                          canEdit
                          saving={stopSaving}
                          lockBusy={stopLockBusyId === s.id}
                          onSave={async (patch) => {
                            setStopSaving(true);
                            try {
                              await onSaveStop?.(s.id, patch);
                              setEditingStopId(null);
                            } finally {
                              setStopSaving(false);
                            }
                          }}
                          onToggleLock={routePlanForTrip && routePlanStopFor(s)
                            ? () => {
                              const planStop = routePlanStopFor(s);
                              setStopLockBusyId(s.id);
                              void Promise.resolve(onStopLockChange?.(routePlanForTrip.id, planStop.id, Boolean(planStop.locked)))
                                .finally(() => setStopLockBusyId(null));
                            }
                            : undefined}
                          onClose={() => setEditingStopId(null)}
                        />
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
                              const result: any = await onAction('unassign-order', tripId, { orderId: o.id });
                              // Drop the row from the open drawer immediately instead of
                              // waiting for the board refresh; a failed call returns no
                              // `ok`, so the order stays visible with its error toast.
                              if (result?.ok) {
                                setTripDetail((prev: any) => prev
                                  ? { ...prev, orders: (prev.orders || []).filter((x: any) => String(x.id) !== String(o.id)) }
                                  : prev);
                              }
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

          {activeTab === 'cargo' && (
            <div className="space-y-3" data-testid="cargo-ledger-tab">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-surface/50 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <WeightKgIcon className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-black text-text-primary">{t('cargo_ledger', 'Cargo ledger')}</h3>
                    {cargoLedger?.status && (
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        cargoLedger.status === 'invalid' ? 'bg-red-500/15 text-red-600' : cargoLedger.status === 'unverified' ? 'bg-amber-500/15 text-amber-600' : 'bg-emerald-500/15 text-emerald-600'
                      }`}>
                        {t(`cargo_${cargoLedger.status}`, cargoLedger.status)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-secondary">{t('cargo_ledger_hint', 'Persisted projection by stop. Pending tasks are marked as projected.')}</p>
                </div>
                {cargoLedger && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right">
                    {[['cargo_loaded', cargoLedger.totals?.loaded], ['cargo_delivered', cargoLedger.totals?.delivered], ['cargo_on_board', cargoLedger.totals?.remaining], ['cargo_peak', cargoLedger.peak]].map(([label, value]: any) => (
                      <div key={label} className="rounded-lg border border-border/60 bg-card px-2 py-1 min-w-[88px]">
                        <p className="text-[8px] font-bold uppercase tracking-wide text-text-muted">{t(label, label)}</p>
                        <p className="text-[11px] font-black text-text-primary">{fmtNumber(value?.pallets || 0)} <span className="text-[8px] font-bold">{t('cargo_pallets', 'plt')}</span></p>
                        <p className="text-[8px] text-text-secondary">{fmtNumber(value?.weightKg || 0)} kg</p>
                        <p className="text-[8px] text-text-muted">{fmtNumber(value?.volumeCbm || 0)} m³ · {fmtNumber(value?.loadingMeters || 0)} LDM</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cargoLedgerLoading ? (
                <div className="flex items-center justify-center gap-2 py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /><span className="text-xs text-text-secondary">{t('cargo_loading', 'Building cargo ledger…')}</span></div>
              ) : cargoLedgerError ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-600">{cargoLedgerError}</div>
              ) : !cargoLedger?.rows?.length ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-text-secondary">{t('cargo_no_rows', 'No load or unload tasks are recorded for this trip.')}</div>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-[10px]">
                      <thead className="bg-surface/60 text-text-muted">
                        <tr>
                          <th className="px-2 py-1.5 text-left font-black">{t('cargo_stop', 'Stop')}</th>
                          <th className="px-2 py-1.5 text-left font-black">{t('cargo_operation', 'Operation')}</th>
                          <th className="px-2 py-1.5 text-left font-black">{t('cargo_order', 'Order')}</th>
                          <th className="px-2 py-1.5 text-right font-black">{t('cargo_before', 'Before')}</th>
                          <th className="px-2 py-1.5 text-right font-black">{t('cargo_change', 'Change')}</th>
                          <th className="px-2 py-1.5 text-right font-black">{t('cargo_after', 'After')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cargoLedger.rows.map((row: any, index: number) => {
                          const operationLabel = row.operation === 'load' ? t('cargo_load', 'Load') : row.operation === 'unload' ? t('cargo_unload', 'Unload') : t('cargo_rejected', 'Rejected');
                          const tone = row.operation === 'load' ? 'text-blue-600' : row.operation === 'unload' ? 'text-emerald-600' : 'text-red-600';
                          return (
                            <tr key={`${row.stopId || index}-${row.orderId || index}-${index}`} className="border-t border-border/60 hover:bg-surface/30">
                              <td className="px-2 py-1.5">
                                <div className="font-bold text-text-primary">#{row.sequence} {row.city || '—'}</div>
                                <div className="text-[8px] text-text-muted">{row.companyName || row.stopType || ''} {row.projected ? `· ${t('cargo_projected', 'projected')}` : ''}</div>
                              </td>
                              <td className={`px-2 py-1.5 font-black ${tone}`}>{operationLabel}</td>
                              <td className="px-2 py-1.5 font-semibold text-text-primary">{row.orderNumber || row.orderId || '—'}</td>
                              <td className="px-2 py-1.5 text-right tabular-nums text-text-secondary">
                                <div>{fmtNumber(row.cargoBefore?.pallets || 0)}p · {fmtNumber(row.cargoBefore?.weightKg || 0)}kg</div>
                                <div className="text-[8px] text-text-muted">{fmtNumber(row.cargoBefore?.volumeCbm || 0)} m³ · {fmtNumber(row.cargoBefore?.loadingMeters || 0)} LDM</div>
                              </td>
                              <td className={`px-2 py-1.5 text-right tabular-nums font-black ${tone}`}>
                                <div>{(row.change?.pallets || 0) > 0 ? '+' : ''}{fmtNumber(row.change?.pallets || 0)}p · {(row.change?.weightKg || 0) > 0 ? '+' : ''}{fmtNumber(row.change?.weightKg || 0)}kg</div>
                                <div className="text-[8px] opacity-80">{(row.change?.volumeCbm || 0) > 0 ? '+' : ''}{fmtNumber(row.change?.volumeCbm || 0)} m³ · {(row.change?.loadingMeters || 0) > 0 ? '+' : ''}{fmtNumber(row.change?.loadingMeters || 0)} LDM</div>
                              </td>
                              <td className="px-2 py-1.5 text-right tabular-nums font-black text-text-primary">
                                <div>{fmtNumber(row.cargoAfter?.pallets || 0)}p · {fmtNumber(row.cargoAfter?.weightKg || 0)}kg</div>
                                <div className="text-[8px] text-text-secondary">{fmtNumber(row.cargoAfter?.volumeCbm || 0)} m³ · {fmtNumber(row.cargoAfter?.loadingMeters || 0)} LDM</div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('cargo_issues', 'Ledger checks')}</h4>
                      <span className="text-[9px] text-text-muted">{cargoLedger.issues?.length || 0}</span>
                    </div>
                    {!cargoLedger.issues?.length ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-600">{t('cargo_no_issues', 'No cargo ledger issues found.')}</p>
                    ) : (
                      <div className="mt-1.5 space-y-1">
                        {cargoLedger.issues.map((issue: any, index: number) => (
                          <div key={`${issue.code}-${index}`} className={`rounded-lg border px-2 py-1 text-[10px] ${issue.severity === 'error' ? 'border-red-500/20 bg-red-500/5 text-red-600' : 'border-amber-500/20 bg-amber-500/5 text-amber-700'}`}>
                            <b className="font-black">{issue.code}</b> · {issue.message}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
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
                    <CheckCircle2 className="w-4 h-4" /> {opLabel}
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
                    <CheckCircle2 className="w-4 h-4" /> {opLabel}
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
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const navigate = useNavigate();
  const confirm = useConfirm();

  // ── State ──
  const [selectedDate, setSelectedDate] = useState<string>(() => dayStr(new Date()));
  // A week is the only range where a dispatch card is still readable at 100%
  // zoom in the workspace width the board actually gets.
  // Four ways to read the same plan: a day, a week, a month, or the map panel
  // alongside any of them. The old 'all' (31 days) and 'timeline' (day with
  // lanes) modes duplicated these and only added choices, so they are no
  // longer offered — legacy saved views are coerced below.
  const [viewMode, setViewMode] = useState<'all' | 'day' | 'week' | 'timeline' | 'month' | 'map'>('week');
  const [mapOpen, setMapOpen] = useState<boolean>(() => {
    // No stored preference yet: on a wide desk the map panel starts open, so the
    // board and the map are visible together the first time. Narrow screens keep
    // it closed and offer it as a toggle.
    try {
      const saved = window.localStorage.getItem('planning_map_open');
      if (saved !== null) return saved === '1';
      return window.innerWidth >= 1440;
    } catch {
      return window.innerWidth >= 1440;
    }
  });
  const [mapWidth, setMapWidth] = useState<number>(() => {
    try {
      const saved = Number(window.localStorage.getItem('planning_map_width'));
      if (Number.isFinite(saved) && saved >= 300 && saved <= 900) return saved;
    } catch { /* ignore */ }
    return 420;
  });
  const mapResizingRef = useRef(false);
  const [hiddenTripIds, setHiddenTripIds] = useState<Set<string>>(new Set());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [redateOpen, setRedateOpen] = useState(false);
  const [touchDrag, setTouchDrag] = useState<{ orderId: string; x: number; y: number } | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState<any>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [suggestionBusyId, setSuggestionBusyId] = useState<string | null>(null);
  const [scenariosOpen, setScenariosOpen] = useState(false);
  const [scenarioApplying, setScenarioApplying] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  // Closing the drawer must not drop the selection: the contextual bar keeps the
  // trip's actions available while the board stays readable.
  const [drawerDismissed, setDrawerDismissed] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [nearby, setNearby] = useState<{
    open: boolean; loading: boolean; error: string | null; data: any; radius: number; stopId: string | null;
  }>({ open: false, loading: false, error: null, data: null, radius: 50, stopId: null });
  const [nearbyBusyOrderId, setNearbyBusyOrderId] = useState<string | null>(null);
  const [moveSourceTripId, setMoveSourceTripId] = useState<string | null>(null);
  const [repeatBusy, setRepeatBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [truckFilter, setTruckFilter] = useState('');
  const [driverFilter, setDriverFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  // The board endpoint is a full re-query. Filtering the pool is instant on the
  // client, so the server only needs the search term once typing pauses instead
  // of on every keystroke.
  const [boardSearch, setBoardSearch] = useState(search);
  useEffect(() => {
    const timer = window.setTimeout(() => setBoardSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

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
  const [assignmentReview, setAssignmentReview] = useState<{
    orderIds: string[];
    truckId: string;
    tripId: string | null;
    tripNumber?: string | null;
    mode: 'existing' | 'new';
    loading: boolean;
    error?: string | null;
    preflight?: any;
    insertion?: any;
    selectedInsertion?: { pickupIndex: number; deliveryIndex: number } | null;
    overrideReason?: string;
    overrideError?: string | null;
    proposalChanged?: boolean;
    confirmationKey?: string;
  } | null>(null);
  const [selectedPoolOrderIds, setSelectedPoolOrderIds] = useState<Set<string>>(new Set());
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);
  const [truckRecommendations, setTruckRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    const orderId = assignOrderModal?.id;
    if (!orderId) {
      setTruckRecommendations([]);
      return;
    }
    let cancelled = false;
    setRecommendationsLoading(true);
    planningApi.recommendTrucks([orderId])
      .then((res: any) => {
        if (!cancelled) setTruckRecommendations(res?.candidates || []);
      })
      .catch(() => {
        if (!cancelled) setTruckRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendationsLoading(false);
      });
    return () => { cancelled = true; };
  }, [assignOrderModal?.id]);

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
  const handledAssignOrderRef = useRef<string | null>(null);
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

  // Deep link from the dashboard's unassigned-orders panel: open the assign
  // modal for that order instead of dropping the dispatcher into the board.
  useEffect(() => {
    const orderId = searchParams.get('orderId') || searchParams.get('assignOrder');
    if (!orderId) {
      handledAssignOrderRef.current = null;
      return;
    }
    if (handledAssignOrderRef.current === orderId) return;

    const cleanParam = () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('orderId');
      nextParams.delete('assignOrder');
      setSearchParams(nextParams, { replace: true });
    };

    const fromBoard = (boardData?.orders || []).find((order: any) => order.id === orderId);
    if (fromBoard) {
      handledAssignOrderRef.current = orderId;
      setAssignOrderModal(fromBoard);
      cleanParam();
      return;
    }

    handledAssignOrderRef.current = orderId;
    api.get(`/orders/${orderId}`)
      .then((response) => {
        const order = response.data?.order || response.data;
        if (order?.id) {
          setAssignOrderModal(order);
          cleanParam();
        }
      })
      .catch(() => { /* order unavailable */ });
  }, [searchParams, setSearchParams, boardData]);

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
    }).catch(() => undefined);
  }, []);

  const handleApplySavedView = (view: any) => {
    if (!view) {
      setCurrentViewId(null);
      return;
    }
    setCurrentViewId(view.id);
    if (view.viewMode) {
      // Saved views written before the board simplification may point at a mode
      // that no longer exists; open the closest current one instead of a blank
      // board.
      if (view.viewMode === 'map') { setMapOpen(true); setViewMode('week'); }
      else if (view.viewMode === 'all' || view.viewMode === 'timeline') setViewMode('day');
      else setViewMode(view.viewMode);
    }
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
      // The planning week opens on the selected day (today by default), not on
      // the previous Monday: starting in the past pushed today's column — and
      // its now-marker — off the first screen of the board.
      const start = curr;
      return { from: dayStr(start), to: dayStr(addDays(start, 6)), totalMinutes: 7 * 24 * 60, hoursVisible: 7, fromDateObj: start };
    }
    if (viewMode === 'month') {
      // The monthly board is the whole calendar month, so the first column is
      // always the 1st and the last is always the month's final day.
      const start = new Date(curr.getFullYear(), curr.getMonth(), 1);
      const days = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
      return { from: dayStr(start), to: dayStr(addDays(start, days - 1)), totalMinutes: days * 24 * 60, hoursVisible: days, fromDateObj: start };
    }
    // day / timeline / map — same range
    return { from: selectedDate, to: selectedDate, totalMinutes: 24 * 60, hoursVisible: 24, fromDateObj: curr };
  }, [selectedDate, viewMode]);

  const poolRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const autoScrollSignatureRef = useRef<string>('');

  // Enterprise Operations States
  const [dropHookConfig, setDropHookConfig] = useState<{ isOpen: boolean; mode: 'drop' | 'hook'; trailerId?: string; tripId?: string }>({ isOpen: false, mode: 'drop' });
  const [crossDockConfig, setCrossDockConfig] = useState<{ isOpen: boolean; orderId?: string; tripId?: string }>({ isOpen: false });
  const [subcontractorTargetTrip, setSubcontractorTargetTrip] = useState<any | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [nowTick, setNowTick] = useState<number>(() => Date.now());
  const colWidth = useMemo(() => Math.max(48, Math.round(52 * zoomLevel)), [zoomLevel]);
  const totalTimelineWidth = useMemo(() => hoursVisible * colWidth, [hoursVisible, colWidth]);
  const rangeLabel = viewMode === 'day' || viewMode === 'timeline'
    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
    : viewMode === 'month'
      ? fromDateObj.toLocaleDateString([], { month: 'long', year: 'numeric' })
      : `${fmtShort(from)} – ${fmtShort(to)}`;
  const operationalClock = useMemo(() => operationalNow(nowTick), [nowTick]);
  // Minutes from the range's first column to the current operational instant.
  const nowMinutes = useMemo(() => {
    const dayOffset = Math.round((parseDay(operationalClock.dateKey).getTime() - parseDay(from).getTime()) / 86400000);
    return dayOffset * 1440 + operationalClock.minutesOfDay;
  }, [operationalClock, from]);
  const showNow = nowMinutes >= 0 && nowMinutes <= totalMinutes;

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
      if (code === 'Digit1' || code === 'Numpad1' || e.key === '1') { e.preventDefault(); setViewMode('day'); return; }
      if (code === 'Digit2' || code === 'Numpad2' || e.key === '2') { e.preventDefault(); setViewMode('week'); return; }
      if (code === 'Digit3' || code === 'Numpad3' || e.key === '3') { e.preventDefault(); setViewMode('month'); return; }
      if (code === 'Digit4' || code === 'Numpad4' || e.key === '4') { e.preventDefault(); setMapOpen((value) => !value); return; }
      if (code === 'Digit5' || code === 'Numpad5' || e.key === '5') { e.preventDefault(); setPaletteOpen(true); return; }
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
  const loadData = useCallback(async (silent = false) => {
    // A silent refresh keeps the current board on screen. Background refreshes
    // (live updates, the reload after an action) used to blank the pool with a
    // spinner, which read as a delay even though the data was already there.
    if (!silent) {
      setIsLoading(true);
      setFetchError(null);
    }
    try {
      // Operational filters are applied against the canonical status returned
      // by the board, not the legacy persistence status. Sending an operational
      // code to the legacy query would silently return nothing.
      const [boardRes, mapRes] = await Promise.allSettled([
        api.get('/planning/board', {
          params: {
            from,
            to,
            search: boardSearch || undefined,
            status: undefined,
            vehicleId: truckFilter || undefined,
            driverId: driverFilter || undefined,
            priority: priorityFilter || undefined,
          },
        }),
        // The map payload carries geometry for every trip and is only consumed
        // by the map view. Requesting it on every board refresh (each action,
        // each live update) added latency the board never used.
        viewMode === 'map' || mapOpen
          ? api.get('/planning/map-data', { params: { from, to } }).catch(() => api.get('/planning/map', { params: { from, to } }))
          : Promise.resolve(null),
      ]);

      if (boardRes.status === 'fulfilled') setBoardData(boardRes.value.data);
      else {
        const msg = boardRes.reason?.response?.data?.message || boardRes.reason?.message || 'Failed to load board data';
        setFetchError(msg);
        if (!silent) toast.error(msg);
      }
      if (mapRes.status === 'fulfilled' && mapRes.value) setMapData(mapRes.value.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load planning data';
      setFetchError(msg);
      if (!silent) toast.error(msg);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [from, to, boardSearch, statusFilter, truckFilter, driverFilter, priorityFilter, viewMode, mapOpen]);

  useEffect(() => { loadData(); }, [loadData]);

  // Keep Planning live without ever resetting the user's current filter,
  // selected trip, sort or scroll position. The API remains authoritative;
  // the socket event is only a refresh trigger.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => loadData(true), 250);
    };
    window.addEventListener('hapcargo:operational-update', refresh);
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('hapcargo:operational-update', refresh);
    };
  }, [loadData]);

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
        if (!orderId) return { ok: false };
        const response: any = await planningApi.unassignOrder(tripId, orderId);
        // The toast is raised only after the backend confirmed the change.
        offerUndo(t('order_unassigned_ok', 'Order unassigned from trip'));
        setDrawerRefreshKey(k => k + 1);
        if (response?.deleted) setSelectedTripId(null);
        // Refresh in the background: the action is already committed, and
        // awaiting the full board re-query kept the button spinner alive.
        void loadData(true);
        return { ok: true, deleted: Boolean(response?.deleted) };
      } else if (action === 'unplan-trip') {
        await planningApi.unplanTrip(tripId);
        offerUndo(t('trip_unplanned_ok', 'Trip unplanned and removed'));
        setSelectedTripId(null);
      } else if (action === 'split') {
        const tr = trips.find((t: any) => t.id === tripId) || selectedTrip;
        if (tr) setSplitTripTarget(tr);
        return;
      }
      void loadData();
      return { ok: true };
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('jsx_actionError', 'Action failed'));
      return { ok: false };
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
      void loadData(true);
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
      void loadData(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reorder stops');
    } finally {
      setLoadingAction(null);
    }
  };

  /**
   * Touch drag: HTML5 drag-and-drop does not fire on touch devices, so a long
   * press (350 ms) starts a pointer drag and the drop is resolved against the
   * timeline row under the finger. The assignment itself still goes through
   * the same preflight as a mouse drop.
   */
  const beginTouchDrag = (orderId: string, event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    let armed = false;
    const timer = window.setTimeout(() => {
      if (moved) return;
      armed = true;
      setTouchDrag({ orderId, x: startX, y: startY });
    }, 350);

    const move = (moveEvent: PointerEvent) => {
      if (!armed) {
        if (Math.abs(moveEvent.clientX - startX) > 8 || Math.abs(moveEvent.clientY - startY) > 8) moved = true;
        return;
      }
      moveEvent.preventDefault();
      setTouchDrag({ orderId, x: moveEvent.clientX, y: moveEvent.clientY });
    };

    const finish = (endEvent: PointerEvent) => {
      window.clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      if (!armed) return;
      setTouchDrag(null);
      const row = document.elementFromPoint(endEvent.clientX, endEvent.clientY)?.closest('[data-resource-id]') as HTMLElement | null;
      const resourceId = row?.getAttribute('data-resource-id');
      if (resourceId) void handleDropOrder(resourceId, orderId);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
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

    reviewAssignment(orderIds, resourceId);
  };

  const existingPlanningTrip = (resourceId: string): any | null => {
    const sameTruck = trips.filter((tr: any) =>
      String(tr.truck?.id || tr.truckId) === String(resourceId) &&
      ['planning', 'planned', 'assigned'].includes(String(tr.status).toLowerCase()),
    );
    // Never fall back to a trip on another date: the modal would show (and
    // possibly assign to) a different trip than the one the dispatcher chose.
    return sameTruck.find((tr: any) => {
      const departure = tr.plannedDeparture ? String(tr.plannedDeparture).slice(0, 10) : null;
      return departure === selectedDate;
    }) || null;
  };

  // One opaque key per reviewed proposal: retrying the same confirmation (a
  // double click or a network retry) can never allocate the orders twice.
  const newConfirmationKey = () =>
    (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
      ? (crypto as any).randomUUID()
      : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const reviewAssignment = async (
    orderIds: string[],
    resourceId: string,
    mode?: 'existing' | 'new',
    knownTrip?: any,
  ) => {
    const candidate = knownTrip || existingPlanningTrip(resourceId);
    const targetMode = mode || (candidate?.id ? 'existing' : 'new');
    setAssignmentReview({
      orderIds,
      truckId: resourceId,
      tripId: targetMode === 'existing' ? candidate?.id || null : null,
      tripNumber: candidate?.tripNumber || null,
      mode: targetMode,
      loading: true,
      error: null,
      preflight: null,
      confirmationKey: newConfirmationKey(),
    });
    try {
      let preflight: any;
      if (targetMode === 'existing' && candidate?.id) {
        preflight = await planningApi.preflightConsolidation(candidate.id, orderIds);
      } else {
        const validation = await validateNewTrip(orderIds, resourceId);
        preflight = {
          recommendation: validation.blockers.length
            ? 'BLOCKED'
            : validation.warnings.length
              ? 'MANUAL_REVIEW'
              : 'CREATE_NEW_TRIP',
          blockers: validation.blockers,
          warnings: validation.warnings,
          route: null,
          cargo: null,
        };
      }
      // The preflight already evaluates every insertion position and returns the
      // best feasible sequence, so no second routing preview is requested and
      // there is only one source of truth for the proposal.
      const insertion = preflight?.insertion || null;
      setAssignmentReview(prev => prev ? {
        ...prev,
        loading: false,
        preflight,
        insertion,
        proposalChanged: false,
        overrideReason: '',
      } : prev);
    } catch (err: any) {
      setAssignmentReview(prev => prev ? {
        ...prev,
        loading: false,
        error: err.response?.data?.message || t('cons_error', 'The feasibility check could not be completed.'),
      } : prev);
    }
  };

  const validateNewTrip = async (orderIds: string[], resourceId: string) => {
    try {
      const { data } = await api.post('/planning/orders/validate', { orderIds, truckId: resourceId, date: selectedDate });
      const list = (Array.isArray(data) ? data : []).map((c: any) => ({
        ...c,
        level: c.level === 'blocking' ? 'blocking' : 'warning',
      }));
      return {
        blockers: list.filter((c: any) => c.level === 'blocking'),
        warnings: list.filter((c: any) => c.level !== 'blocking'),
      };
    } catch (err: any) {
      return {
        blockers: [{
          id: 'preflight_failed',
          level: 'blocking',
          code: 'PREFLIGHT_FAILED',
          message: err.response?.data?.message || t('cons_error', 'The feasibility check could not be completed.'),
        }],
        warnings: [],
      };
    }
  };

  const executeAssign = async (
    orderIds: string[],
    resourceId: string,
    tripId?: string | null,
    stopOrder?: string[],
    override?: { reason: string; codes: string[] },
    preview?: { feasibility: string; addedDistanceKm: number | null; stopOrder: string[] },
    confirmationKey?: string,
  ) => {
    setLoadingAction('assign');
    try {
      await api.post('/planning/assign', {
        orderIds,
        truckId: resourceId,
        date: selectedDate,
        ...(tripId ? { tripIds: [tripId] } : {}),
        ...(tripId && stopOrder?.length ? { stopOrder } : {}),
        ...(override ? { override } : {}),
        ...(preview ? { preview } : {}),
        ...(confirmationKey ? { confirmationKey } : {}),
      });
      const sourceTripId = moveSourceTripId;
      setSelectedPoolOrderIds(new Set());
      setDraggingOrderId(null);
      setAssignmentReview(null);
      setMoveSourceTripId(null);
      // The backend already stored an undo snapshot; the toast only exposes it.
      offerUndo(t('jsx_assignedOk', 'Orders assigned'));
      void loadData(true);
      void cleanupSourceTrip(sourceTripId, orderIds);
    } catch (err: any) {
      const data = err.response?.data || {};
      // The backend revalidates at confirmation time. If the proposal moved, the
      // dispatcher must see the fresh result before confirming again.
      if (data.code === 'PROPOSAL_CHANGED' && data.preflight) {
        setAssignmentReview(prev => prev ? {
          ...prev,
          loading: false,
          preflight: data.preflight,
          insertion: data.preflight.insertion || prev.insertion,
          proposalChanged: true,
          overrideReason: '',
          selectedInsertion: null,
          confirmationKey: newConfirmationKey(),
        } : prev);
        toast.error(t('cw_proposal_changed', 'The proposal changed. Review the new result and confirm again.'));
        return;
      }
      if (['OVERRIDE_REQUIRED', 'OVERRIDE_CODES_MISMATCH', 'OVERRIDE_NOT_ALLOWED'].includes(data.code)) {
        setAssignmentReview(prev => prev ? { ...prev, overrideError: data.message || data.code } : prev);
        toast.error(data.message || t('cw_override', 'Override required'));
        return;
      }
      toast.error(data.message || 'Assignment failed');
    } finally {
      setLoadingAction(null);
    }
  };

  /** Confirm the reviewed proposal exactly as the backend previewed it. */
  const confirmAssignmentReview = () => {
    if (!assignmentReview) return;
    const insertion = assignmentReview.insertion || assignmentReview.preflight?.insertion || null;
    const options = [insertion?.recommended, ...(insertion?.alternatives || [])].filter(Boolean);
    const selectedOption: any = options.find((option: any) => assignmentReview.selectedInsertion
      && option.pickupIndex === assignmentReview.selectedInsertion.pickupIndex
      && option.deliveryIndex === assignmentReview.selectedInsertion.deliveryIndex) || options[0] || null;
    const stopOrder: string[] | undefined = assignmentReview.mode === 'existing'
      ? selectedOption?.stopOrder
      : undefined;
    const preflight = assignmentReview.preflight;
    const softCodes: string[] = [...new Set(((preflight?.warnings || []) as any[])
      .filter((entry: any) => entry.level !== 'blocking')
      .map((entry: any) => String(entry.code))
      .filter(Boolean))];
    const override = softCodes.length
      ? { reason: (assignmentReview.overrideReason || '').trim(), codes: softCodes }
      : undefined;
    const preview = preflight?.feasibility
      ? {
        feasibility: String(preflight.feasibility.status),
        addedDistanceKm: preflight.route?.addedDistanceKm ?? null,
        stopOrder: stopOrder || [],
      }
      : undefined;
    executeAssign(
      assignmentReview.orderIds,
      assignmentReview.truckId,
      assignmentReview.mode === 'existing' ? assignmentReview.tripId : null,
      stopOrder,
      override,
      preview,
      assignmentReview.confirmationKey || newConfirmationKey(),
    );
  };

  // ── Undo window (8 s) ──────────────────────────────────────────────────────
  // POST /planning/undo already existed and stored snapshots; nothing in the UI
  // exposed it. The toast is that exposure: it never writes anything itself.
  const handleUndo = async () => {
    try {
      await planningApi.undo();
      toast.success(t('pv_undo_done', 'The action was undone.'));
      void loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pv_undo_failed', 'Undo failed.'));
    }
  };

  const offerUndo = (message: string) => {
    toast.custom((instance) => (
      <div
        className={`pointer-events-auto flex w-[330px] items-center gap-2 rounded-xl border border-border bg-card px-2.5 py-2 shadow-xl ${
          instance.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
        <span className="min-w-0 flex-1 text-[11px] font-bold leading-snug text-text-primary">{message}</span>
        <button
          type="button"
          onClick={() => { toast.dismiss(instance.id); void handleUndo(); }}
          className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 text-[10px] font-black text-primary transition-colors hover:bg-primary/20"
        >
          <Undo2 className="h-3 w-3" />
          {t('pv_undo', 'Undo')}
        </button>
      </div>
    ), { duration: 8000 });
  };

  /**
   * Moving a whole trip leaves the source trip without orders. The trip itself
   * is removed only when the refreshed board confirms it is empty — never on a
   * guess, and never while it still carries other orders.
   */
  const cleanupSourceTrip = async (sourceTripId: string | null, movedOrderIds: string[]) => {
    if (!sourceTripId) return;
    try {
      const { data } = await api.get('/planning/board', { params: { from, to } });
      const source = (data?.trips || []).find((candidate: any) => String(candidate.id) === String(sourceTripId));
      if (!source) return;
      const remaining = (source.orders || []).filter((order: any) => order?.id && !movedOrderIds.includes(order.id));
      if (remaining.length === 0) {
        await planningApi.unplanTrip(sourceTripId);
        void loadData(true);
      }
    } catch {
      /* Cleanup is best effort: the board reload stays authoritative. */
    }
  };

  // ── Drag a whole trip onto another truck ──────────────────────────────────
  // The drag only opens the same review the dispatcher would get from dropping
  // an order: preflight, alternatives, override reason, confirmation key.
  const handleDropTrip = (targetResourceId: string, tripId: string) => {
    const trip = trips.find((candidate: any) => String(candidate.id) === String(tripId));
    if (!trip) return;
    if (!isMovableTrip(trip)) {
      toast.error(t('pv_drag_trip_hint', 'Drag the trip onto another truck to move it'));
      return;
    }
    if (String(trip.truck?.id || trip.truckId || '') === String(targetResourceId)) return;
    const orderIds = (trip.orders || []).map((order: any) => order?.id).filter(Boolean);
    if (!orderIds.length) {
      toast.error(t('jsx_noTrips', 'No vehicles found for this period.'));
      return;
    }
    setMoveSourceTripId(String(tripId));
    reviewAssignment(orderIds, targetResourceId);
  };

  // ── Repeat a plan (the practical form of a recurring route) ───────────────
  const handleRepeatPlan = async (days = 7) => {
    const targets = selectedTrip ? [selectedTrip] : trips.filter((trip: any) => isMovableTrip(trip));
    if (!targets.length) return;
    const ok = await confirm({
      type: 'warning',
      title: t('pv_repeat', 'Repeat plan'),
      message: `${t('pv_repeat_hint', 'Move the selected trips 7 days ahead, keeping their times.')} (${targets.length})`,
      confirmText: t('pv_repeat', 'Repeat plan'),
      cancelText: t('cancel', 'Cancel'),
    });
    if (!ok) return;
    setRepeatBusy(true);
    let done = 0;
    for (const trip of targets) {
      try {
        const orderedStops = [...(trip.stops || [])].sort(
          (a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0),
        );
        for (const stop of orderedStops) {
          const patch = shiftWindow(stop.timeWindowMin, stop.timeWindowMax, days);
          if (!patch.timeWindowMin && !patch.timeWindowMax) continue;
          await api.patch(`/trips/stops/${stop.id}`, {
            ...(patch.timeWindowMin ? { timeWindowMin: patch.timeWindowMin } : {}),
            ...(patch.timeWindowMax ? { timeWindowMax: patch.timeWindowMax } : {}),
          });
        }
        await planningApi.recalculateTrip(trip.id);
        done += 1;
      } catch {
        /* per-trip failure is reported by the summary below */
      }
    }
    setRepeatBusy(false);
    if (done > 0) {
      toast.success(t('pv_repeat_done', { count: done, defaultValue: 'Plan repeated for {{count}} trips.' }));
      void loadData();
    } else {
      toast.error(t('pv_repeat_failed', 'Repeating the plan failed.'));
    }
  };

  // ── Suggestions (backend ranking, opened through the normal review) ───────
  const loadSuggestions = async () => {
    setSuggestionsLoading(true);
    setSuggestionsError(null);
    try {
      const data = await planningApi.getSuggestions({ from, to });
      setSuggestionsData(data);
    } catch (err: any) {
      setSuggestionsError(err?.response?.data?.message || err?.message || 'Suggestions failed');
      setSuggestionsData(null);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const openSuggestions = () => {
    setSuggestionsOpen(true);
    void loadSuggestions();
  };

  /**
   * Apply a modelled scenario. The departure goes through the reschedule
   * endpoint (shifts the trip and every stop, stores an undo snapshot); a truck
   * change goes through the normal assignment review so the preflight and the
   * override step are never skipped.
   */
  const applyScenario = async (payload: { departure: string | null; truckId: string | null }) => {
    if (!selectedTrip) return;
    setScenarioApplying(true);
    try {
      if (payload.departure) {
        const result = await planningApi.rescheduleTrip(selectedTrip.id, payload.departure);
        if (result?.windowViolations > 0) {
          toast.error(
            `${result.windowViolations} ${t('sc_windows_broken', 'windows broken')}`,
          );
        }
      }
      const currentTruckId = selectedTrip.truck?.id || selectedTrip.truckId || null;
      if (payload.truckId && payload.truckId !== currentTruckId) {
        const orderIds = (selectedTrip.orders || []).map((order: any) => order?.id).filter(Boolean);
        if (!orderIds.length) {
          toast.error(t('pv_drag_trip_hint', 'Drag the trip onto another truck to move it'));
          return;
        }
        setScenariosOpen(false);
        reviewAssignment(orderIds, payload.truckId, 'existing', selectedTrip);
        return;
      }
      toast.success(t('sc_applied', 'Scenario applied.'));
      setScenariosOpen(false);
      setDrawerRefreshKey((key) => key + 1);
      void loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('jsv_actionError', 'Action failed'));
    } finally {
      setScenarioApplying(false);
    }
  };

  /**
   * Bulk assign: asks the existing recommendation endpoint which truck fits the
   * whole selection, then opens the normal assignment review for that pair. No
   * second feasibility path is introduced.
   */
  /** Bulk dispatch: sends every planned trip of the current board to its driver,
   * one call per trip on the existing endpoint. Failures are reported, not
   * swallowed, so a half-sent plan is visible. */
  const bulkSendToDrivers = async () => {
    const targets = trips.filter((trip: any) =>
      ['assigned', 'dispatched', 'planned'].includes(String(trip.status || '').toLowerCase()),
    );
    if (!targets.length) {
      toast.error(t('bulk_send_none', 'No planned trip to send.'));
      return;
    }
    if (!window.confirm(t('bulk_send_confirm', 'Send {{count}} trips to their drivers?', { count: targets.length }))) return;
    setBulkBusy(true);
    let sent = 0;
    let failed = 0;
    for (const trip of targets) {
      try {
        await planningApi.sendToDriver(trip.id);
        sent += 1;
      } catch {
        failed += 1;
      }
    }
    setBulkBusy(false);
    if (failed) toast.error(t('bulk_send_partial', 'Sent {{sent}}, failed {{failed}}.', { sent, failed }));
    else toast.success(t('bulk_send_done', 'Sent {{count}} trips to drivers.', { count: sent }));
    await loadData(true);
  };

  const bulkShiftDates = async (days: number) => {
    const ids = Array.from(selectedPoolOrderIds);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await planningApi.bulkShiftOrderDates(ids, days);
      if (result.shifted > 0) {
        toast.success(t('bulk_shift_done', '{{count}} orders moved by {{days}} days.', { count: result.shifted, days }));
      }
      if (result.skipped.length > 0) {
        toast.error(t('bulk_shift_skipped', '{{count}} orders were not moved because their trip is already running.', { count: result.skipped.length }));
      }
      setSelectedPoolOrderIds(new Set());
      setRedateOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('action_failed', 'Action failed'));
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkAssignRecommended = async () => {
    const orderIds = Array.from(selectedPoolOrderIds);
    if (!orderIds.length) return;
    setBulkBusy(true);
    try {
      const result = await planningApi.recommendTrucks(orderIds);
      const best = result?.candidates?.[0];
      const truckId = best?.truckId || best?.truck?.id || best?.id || null;
      if (!truckId) {
        toast.error(
          result?.reason === 'ORDER_COORDINATES_MISSING'
            ? t('bulk_no_coordinates', 'Orders without coordinates cannot be matched to a truck.')
            : t('bulk_no_truck', 'No truck can take this selection.'),
        );
        return;
      }
      reviewAssignment(orderIds, truckId, 'new');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('jsv_actionError', 'Action failed'));
    } finally {
      setBulkBusy(false);
    }
  };

  /** Recovery "move": reuses the normal assignment review, so the preflight and
   * the override step are the same ones the board uses everywhere else. */
  const handleRecoveryMove = (orderId: string, targetTrip: any) => {
    const truckId = targetTrip?.truck?.id || targetTrip?.truckId;
    if (!orderId || !truckId) return;
    setRecoveryOpen(false);
    reviewAssignment([orderId], truckId, 'existing', targetTrip);
  };

  const applySuggestion = (suggestion: any) => {
    if (!suggestion?.orderId || !suggestion?.truckId) return;
    setSuggestionBusyId(suggestion.id);
    setSuggestionsOpen(false);
    reviewAssignment([suggestion.orderId], suggestion.truckId);
    setSuggestionBusyId(null);
  };

  // ── Nearby loads ──────────────────────────────────────────────────────────
  const loadNearby = async (trip: any, stopId: string | null, radius: number) => {
    if (!trip?.id) return;
    setNearby((prev) => ({ ...prev, open: true, loading: true, error: null, radius, stopId }));
    try {
      const data = await planningApi.getNearbyOrders({
        tripId: trip.id,
        stopId: stopId || undefined,
        radiusKm: radius,
        limit: 30,
      });
      setNearby((prev) => ({ ...prev, loading: false, data }));
    } catch (err: any) {
      setNearby((prev) => ({
        ...prev,
        loading: false,
        data: null,
        error: err?.response?.data?.message || err?.message || 'Nearby search failed',
      }));
    }
  };

  const openNearbyForTrip = (trip: any, stopId?: string | null) => {
    void loadNearby(trip, stopId ?? null, nearby.radius);
  };

  const changeNearbyRadius = (radius: number) => {
    if (selectedTrip) void loadNearby(selectedTrip, nearby.stopId, radius);
    else setNearby((prev) => ({ ...prev, radius }));
  };

  const handleSaveStop = async (stopId: string, patch: any) => {
    try {
      await api.patch(`/trips/stops/${stopId}`, patch);
      toast.success(t('pv_stop_saved', 'The stop was saved.'));
      setDrawerRefreshKey((key) => key + 1);
      void loadData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('jsv_actionError', 'Action failed'));
    }
  };

  const handleStopLockChange = async (routePlanId: string, routePlanStopId: string, locked: boolean) => {
    try {
      if (locked) await planningApi.unlockStop(routePlanStopId, routePlanId);
      else await planningApi.lockStop(routePlanStopId, routePlanId, true);
      setDrawerRefreshKey((key) => key + 1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('jsv_actionError', 'Action failed'));
    }
  };

  const addNearbyOrder = (orderId: string) => {
    if (!selectedTrip) return;
    const truckId = selectedTrip.truck?.id || selectedTrip.truckId;
    if (!truckId || !isMovableTrip(selectedTrip)) {
      toast.error(t('pv_drag_trip_hint', 'Drag the trip onto another truck to move it'));
      return;
    }
    setNearbyBusyOrderId(orderId);
    reviewAssignment([orderId], truckId, 'existing', selectedTrip);
    setNearbyBusyOrderId(null);
  };

  // ── Map panel ─────────────────────────────────────────────────────────────
  useEffect(() => {
    try { window.localStorage.setItem('planning_map_open', mapOpen ? '1' : '0'); } catch { /* ignore */ }
  }, [mapOpen]);

  useEffect(() => {
    try { window.localStorage.setItem('planning_map_width', String(mapWidth)); } catch { /* ignore */ }
  }, [mapWidth]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!mapResizingRef.current) return;
      setMapWidth(Math.max(300, Math.min(900, window.innerWidth - event.clientX)));
    };
    const onUp = () => {
      if (!mapResizingRef.current) return;
      mapResizingRef.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

      setPastDateConflict(null);
      reviewAssignment(orderIds, resourceId);
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
  const rankedResources = useMemo(() => {
    const rank = new Map(truckRecommendations.map((c: any, index: number) => [String(c.truckId), index]));
    return [...resources].sort((a: any, b: any) => {
      const ra = rank.has(String(a.id)) ? rank.get(String(a.id))! : Number.MAX_SAFE_INTEGER;
      const rb = rank.has(String(b.id)) ? rank.get(String(b.id))! : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });
  }, [resources, truckRecommendations]);

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
    return trips.filter((tr: any) => ['PLANNING', 'ACCEPTED'].includes(operationalStatusForDisplay(tr))).length;
  }, [trips]);

  const drivingTripsCount = useMemo(() => {
    return trips.filter((tr: any) => ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'LOADING', 'EN_ROUTE_TO_DELIVERY', 'ARRIVED_AT_DELIVERY', 'UNLOADING'].includes(operationalStatusForDisplay(tr))).length;
  }, [trips]);

  const delayedTripsCount = useMemo(() => {
    return trips.filter((tr: any) => operationalStatusForDisplay(tr) === 'DELAYED' || tr.isDelayed || (tr.plannedArrival && new Date(tr.plannedArrival) < new Date() && !['COMPLETED', 'CANCELLED'].includes(operationalStatusForDisplay(tr)))).length || (boardData?.delayedTrips || 0);
  }, [trips, boardData?.delayedTrips]);

  // Open the board over the work instead of the empty head of the range: without
  // this every trip card sat to the right of the visible timeline and the board
  // read as clipped. Runs once per range/first-trip change, never on re-render.
  useEffect(() => {
    const el = timelineRef.current;
    if (!el || !trips.length) return;
    const starts = trips
      .map((trip: any) => new Date(trip.plannedDeparture || trip.createdAt || 0).getTime())
      .filter((value: number) => Number.isFinite(value) && value > 0);
    if (!starts.length) return;
    const firstStart = Math.min(...starts);
    const signature = `${from}|${totalMinutes}|${firstStart}|${trips.length}`;
    if (autoScrollSignatureRef.current === signature) return;
    autoScrollSignatureRef.current = signature;
    const offset = ((firstStart - parseDay(from).getTime()) / (totalMinutes * 60000)) * el.scrollWidth;
    el.scrollLeft = Math.max(0, offset - 96);
  }, [trips, from, totalMinutes]);

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
      const requested = String(statusFilter).toUpperCase();
      list = list.filter((r: any) => {
        const resTrips = getResTrips(r);
        if (statusFilter === 'planned') {
          return resTrips.some((tr: any) => ['PLANNING', 'ACCEPTED'].includes(operationalStatusForDisplay(tr)));
        }
        if (statusFilter === 'driving') {
          return resTrips.some((tr: any) => ['EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'LOADING', 'EN_ROUTE_TO_DELIVERY', 'ARRIVED_AT_DELIVERY', 'UNLOADING'].includes(operationalStatusForDisplay(tr)));
        }
        if (statusFilter === 'delayed') {
          return resTrips.some((tr: any) => operationalStatusForDisplay(tr) === 'DELAYED' || tr.isDelayed || (tr.plannedArrival && new Date(tr.plannedArrival) < new Date() && !['COMPLETED', 'CANCELLED'].includes(operationalStatusForDisplay(tr))));
        }
        return resTrips.some((tr: any) => operationalStatusForDisplay(tr) === requested);
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

  // ── Feature flag ──
  // The premium layer (KPI strip, scenarios, documents, recovery) can be turned
  // off per browser without a deploy: the board itself stays fully usable.
  const boardV2 = useMemo(() => {
    try {
      return localStorage.getItem('planning_board_v2') !== '0';
    } catch {
      return true;
    }
  }, []);

  // Icon per KPI keeps the strip scannable instead of a wall of numbers.
  const KPI_ICONS: Record<string, any> = {
    planned: Calendar,
    unplanned: Package,
    conflicts: AlertTriangle,
    driving: TruckIcon,
    utilisationPct: Gauge,
    emptyKmPct: Navigation,
    margin: Euro,
    driversAtRisk: Users,
    onTimePct: Clock,
  };

  // ── Headline figures ──
  // Operational counts stay client-side (they follow the active filter), every
  // financial/utilisation figure comes from the server KPI payload with its own
  // provenance. A null value renders as "—", never as 0.
  const kpiCards: Array<{
    key: string;
    label: string;
    display: string;
    value: number | null;
    tone: string;
    provenance?: 'recorded' | 'estimated' | 'unverified';
    onClick?: () => void;
    active?: boolean;
    title?: string;
  }> = (() => {
    const server = (key: string) => boardData?.kpis?.byKey?.[key] || null;
    const money = (entry: any) => (entry && entry.value != null
      ? fmtMoney(Number(entry.value), entry.currency || boardData?.kpis?.currency || 'EUR')
      : null);
    const pct = (entry: any) => (entry && entry.value != null ? `${fmtNumber(Number(entry.value), 1)}%` : null);
    const count = (entry: any) => (entry && entry.value != null ? fmtNumber(Number(entry.value), 0) : null);
    const cards = [
      {
        key: 'planned',
        label: t('kpi_planned', 'Planned'),
        display: fmtNumber(plannedTripsCount, 0),
        value: plannedTripsCount,
        tone: 'text-blue-600',
        active: statusFilter === 'planned',
        onClick: () => setStatusFilter(statusFilter === 'planned' ? '' : 'planned'),
      },
      {
        key: 'unplanned',
        label: t('kpi_unassigned', 'Unassigned'),
        display: fmtNumber(boardData?.totalUnplanned ?? orders.length, 0),
        value: boardData?.totalUnplanned ?? orders.length,
        tone: 'text-amber-600',
        active: statusFilter === 'unassigned',
        onClick: () => { setPoolCollapsed(false); setStatusFilter(statusFilter === 'unassigned' ? '' : 'unassigned'); },
      },
      {
        key: 'conflicts',
        label: t('jsx_attention', 'Attention'),
        display: fmtNumber(attentionResourceIds.size, 0),
        value: attentionResourceIds.size,
        tone: 'text-rose-600',
        active: attentionActive,
        onClick: () => setAttentionActive((value) => !value),
      },
      {
        key: 'driving',
        label: t('status_driving', 'Driving'),
        display: fmtNumber(drivingTripsCount, 0),
        value: drivingTripsCount,
        tone: 'text-emerald-600',
        active: statusFilter === 'driving',
        onClick: () => setStatusFilter(statusFilter === 'driving' ? '' : 'driving'),
      },
      {
        key: 'utilisationPct',
        label: t('kpi_utilisation', 'Utilisation'),
        display: pct(server('utilisationPct')) || '—',
        value: server('utilisationPct')?.value ?? null,
        tone: 'text-emerald-600',
        provenance: provenanceOf(server('utilisationPct')?.provenance),
        title: t('pv_kpi_unverified_hint', 'Not enough data for this figure.'),
      },
      {
        key: 'emptyKmPct',
        label: t('kpi_empty_km', 'Empty km'),
        display: pct(server('emptyKmPct')) || '—',
        value: server('emptyKmPct')?.value ?? null,
        tone: 'text-amber-600',
        provenance: provenanceOf(server('emptyKmPct')?.provenance),
        title: t('pv_kpi_unverified_hint', 'Not enough data for this figure.'),
      },
      {
        key: 'margin',
        label: t('pv_kpi_margin', 'Margin'),
        display: money(server('margin')) || '—',
        value: server('margin')?.value ?? null,
        tone: Number(server('margin')?.value) < 0 ? 'text-rose-600' : 'text-emerald-600',
        provenance: provenanceOf(server('margin')?.provenance),
        title: t('pv_kpi_unverified_hint', 'Not enough data for this figure.'),
      },
      {
        key: 'driversAtRisk',
        label: t('kpi_hos_risk', 'HOS risk'),
        display: count(server('driversAtRisk')) || '—',
        value: server('driversAtRisk')?.value ?? null,
        tone: Number(server('driversAtRisk')?.value) > 0 ? 'text-rose-600' : 'text-emerald-600',
        provenance: provenanceOf(server('driversAtRisk')?.provenance),
        title: t('pv_kpi_unverified_hint', 'Not enough data for this figure.'),
      },
      {
        key: 'onTimePct',
        label: t('pv_kpi_ontime', 'On time'),
        display: pct(server('onTimePct')) || '—',
        value: server('onTimePct')?.value ?? null,
        tone: 'text-emerald-600',
        provenance: provenanceOf(server('onTimePct')?.provenance),
      },
    ];
    return cards;
  })();

  useEffect(() => {
    setDrawerDismissed(false);
  }, [selectedTripId]);

  // ── Command palette actions ──
  // Only existing behaviour: switching the period, opening a record or a panel,
  // running the same handlers the buttons run.
  const paletteActions: PaletteAction[] = [
    { id: 'view-day', label: t('pv_day', 'Day'), group: t('pv_context', 'Selection'), run: () => setViewMode('day') },
    { id: 'view-week', label: t('pv_week', 'Week'), group: t('pv_context', 'Selection'), run: () => setViewMode('week') },
    { id: 'view-month', label: t('pv_month', 'Month'), group: t('pv_context', 'Selection'), run: () => setViewMode('month') },
    { id: 'map-toggle', label: mapOpen ? t('pv_map_hide', 'Hide map') : t('pv_map_show', 'Show map'), run: () => setMapOpen((value) => !value) },
    { id: 'suggestions', label: t('pv_suggestions', 'Suggestions'), run: openSuggestions },
    { id: 'repeat', label: t('pv_repeat', 'Repeat plan'), hint: selectedTrip?.tripNumber || '', run: () => void handleRepeatPlan(7) },
    { id: 'optimize', label: t('jsx_optimize', 'AI Auto-plan'), run: () => setShowOptimizeModal(true) },
    { id: 'export', label: t('export_planning', 'Export'), run: () => setShowExportModal(true) },
    { id: 'refresh', label: t('jsx_recalc', 'Refresh'), run: () => void loadData() },
    { id: 'new', label: t('jsx_newTransport', 'New transport'), run: () => navigate('/orders?new=1') },
  ];
  for (const trip of trips.slice(0, 80)) {
    const route = tripOriginDestination(trip);
    paletteActions.push({
      id: `trip-${trip.id}`,
      label: trip.tripNumber || trip.id,
      hint: [trip.truck?.plateNumber, `${route.origin} → ${route.dest}`].filter(Boolean).join(' · '),
      group: t('jsx_trips', 'Trips'),
      keywords: [trip.truck?.plateNumber, trip.driver?.name, ...(trip.orders || []).map((order: any) => order?.orderNumber)].filter(Boolean).join(' '),
      run: () => setSelectedTripId(trip.id),
    });
  }
  for (const order of orders.slice(0, 80)) {
    paletteActions.push({
      id: `order-${order.id}`,
      label: order.orderNumber || order.id,
      hint: [order.client?.name, order.stops?.[0]?.city].filter(Boolean).join(' · '),
      group: t('jsx_orders', 'Orders'),
      keywords: [order.customerReference, order.client?.name, ...(order.stops || []).map((stop: any) => stop?.city)].filter(Boolean).join(' '),
      run: () => setSelectedOrderId(order.id),
    });
  }

  return (
    <div className={`planning-page flex w-full min-w-0 flex-col gap-0 overflow-hidden bg-background text-text-primary print:bg-white ${isFullscreen ? 'fixed inset-0 z-[9000] p-0' : 'h-[calc(100vh-4rem)]'}`}>

                        {/* ── PLANNING HEADER ─────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-border bg-gradient-to-b from-surface to-surface/40 print:hidden">
        <div className="flex items-center gap-3 px-3 pt-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="flex items-center gap-1.5 truncate text-[13px] font-black leading-none text-text-primary">
                {t('board_title', 'Planning board')}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-emerald-600">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  {t('timeline_live', 'Live')}
                </span>
              </h1>
              <p className="mt-1 truncate text-[10px] font-semibold text-text-secondary">{rangeLabel}</p>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-stretch gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {boardV2 && kpiCards.filter((card) => card.value !== null || !card.provenance).map((card) => {
              const provenance = card.provenance ? PROVENANCE[card.provenance] : null;
              const Icon = KPI_ICONS[card.key] || Activity;
              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={card.onClick}
                  disabled={!card.onClick}
                  title={card.title ? `${card.label} · ${card.title}` : card.label}
                  className={`group relative min-w-[104px] shrink-0 items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-all ${
                    card.provenance ? 'hidden lg:flex' : 'flex'
                  } ${
                    card.active
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-card hover:bg-surface'
                  } ${card.onClick ? 'hover:shadow-sm' : 'cursor-default'}`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                    card.active ? 'bg-primary/15 text-primary' : card.value == null ? 'bg-surface text-text-muted' : `${card.tone} bg-surface`
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[8px] font-black uppercase leading-tight tracking-wide text-text-muted">
                      {card.label}
                    </span>
                    <span className={`block text-[14px] font-black leading-tight tabular-nums ${card.value == null ? 'text-text-muted' : card.tone}`}>
                      {card.display}
                    </span>
                  </span>
                  {provenance && (
                    <span className={`absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full ${provenance.dot}`} title={provenance.label} />
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => navigate('/orders?new=1')}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-3 text-[11px] font-black text-white shadow-sm transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden lg:inline">{t('jsx_newTransport', 'New transport').replace(/^\+\s*/, '')}</span>
          </button>
        </div>

        {/* One toolbar. Everything that is not daily work lives behind “⋯”. */}
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pt-2">
          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm">
            {([
              ['day', t('pv_day', 'Day'), Clock],
              ['week', t('pv_week', 'Week'), Calendar],
              ['month', t('pv_month', 'Month'), CalendarDays],
            ] as [string, string, any][]).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id as any)}
                title={label}
                aria-pressed={viewMode === id}
                className={`flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-black transition-colors ${
                  viewMode === id ? 'bg-primary/12 text-primary' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-card px-1 py-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftPeriod(d, viewMode, -1))}
              className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              title={t('timeline_previous', 'Previous period')}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <DateField
              value={selectedDate}
              onChange={(v) => v && setSelectedDate(v)}
              lang={lang}
              size="sm"
              className="w-[140px]"
              title={t('timeline_selected_date', 'Selected date')}
            />
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftPeriod(d, viewMode, 1))}
              className="rounded-md p-1 text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
              title={t('timeline_next', 'Next period')}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(dayStr(new Date()))}
              className="rounded-md px-1.5 text-[10px] font-black uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
              title={t('jsx_today', 'Today')}
            >
              {t('jsx_today', 'Today')}
            </button>
          </div>

          <div className="relative min-w-[150px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('search_order_placeholder', 'Search order, client, location…')}
              className="h-8 w-full rounded-lg border border-border bg-card pl-8 pr-14 text-[11px] text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1 text-[9px] font-black text-text-muted xl:block">
              Ctrl K
            </kbd>
          </div>

          <CustomSelect
            value={grouping}
            onChange={(val) => setGrouping(val as any)}
            size="sm"
            className="shrink-0"
            title={t('tb_group', 'Group')}
            options={[
              { value: 'truck', label: t('jsx_groupVehicle', 'Truck') },
              { value: 'driver', label: t('jsx_groupDriver', 'Driver') },
              { value: 'trailer', label: t('jsx_groupTrailer', 'Trailer') },
            ]}
          />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
              className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black transition-colors ${
                activeFilterCount > 0
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-text-secondary hover:text-text-primary'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t('filters', 'Filters')}
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-1 text-[9px] font-black text-white">{activeFilterCount}</span>
              )}
            </button>
            {filtersOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setFiltersOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-72 space-y-2 rounded-xl border border-border bg-card p-2.5 shadow-2xl">
                  <p className="text-[9px] font-black uppercase tracking-wide text-text-muted">{t('filters', 'Filters')}</p>
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-bold text-text-secondary">{t('jsx_allVehicles', 'All Trucks')}</span>
                    <CustomSelect
                      value={truckFilter}
                      onChange={setTruckFilter}
                      size="sm"
                      className="w-full"
                      options={[
                        { value: '', label: t('jsx_allVehicles', 'All Trucks') },
                        ...resources.map((resource: any) => ({ value: resource.id, label: resource.plateNumber })),
                      ]}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-bold text-text-secondary">{t('jsx_allDrivers', 'All Drivers')}</span>
                    <CustomSelect
                      value={driverFilter}
                      onChange={setDriverFilter}
                      size="sm"
                      className="w-full"
                      options={[
                        { value: '', label: t('jsx_allDrivers', 'All Drivers') },
                        ...(boardData?.drivers || resources.map((resource: any) => resource.driver).filter(Boolean))
                          .filter((driver: any, index: number, list: any[]) => driver && list.findIndex((candidate: any) => candidate.id === driver.id) === index)
                          .map((driver: any) => ({ value: driver.id, label: driverDisplayName(driver) || driver.name || '—' })),
                      ]}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-0.5 block text-[9px] font-bold text-text-secondary">{t('tb_priority', 'Priority')}</span>
                    <CustomSelect
                      value={priorityFilter}
                      onChange={setPriorityFilter}
                      size="sm"
                      className="w-full"
                      options={[
                        { value: '', label: t('tb_allPriorities', 'All priorities') },
                        ...['critical', 'high', 'normal', 'low'].map((priority) => ({ value: priority, label: t(`priority_${priority}`, priority) })),
                      ]}
                    />
                  </label>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={attentionActive}
                      onChange={(event) => setAttentionActive(event.target.checked)}
                      className="h-3.5 w-3.5 accent-orange-500"
                    />
                    <span className="text-[10px] font-bold text-text-primary">{t('jsx_attention', 'Attention')}</span>
                    <span className="ml-auto text-[10px] font-black text-rose-600">{attentionResourceIds.size}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('');
                      setTruckFilter('');
                      setDriverFilter('');
                      setPriorityFilter('');
                      setAttentionActive(false);
                      setFiltersOpen(false);
                    }}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-border text-[11px] font-black text-text-secondary transition-colors hover:text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t('jsx_clearFilters', 'Clear filters')}
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMapOpen((value) => !value)}
            title={mapOpen ? t('pv_map_hide', 'Hide map') : t('pv_map_show', 'Show map')}
            aria-pressed={mapOpen}
            className={`flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-black transition-colors ${
              mapOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-text-secondary hover:text-text-primary'
            }`}
          >
            <MapIcon className="h-3.5 w-3.5" />
            {t('pv_map_panel', 'Map')}
          </button>

          <button
            type="button"
            onClick={openSuggestions}
            title={t('pv_suggestions_hint', 'Unplanned orders with a matching truck, ranked by cost.')}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 text-[11px] font-black text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('pv_suggestions', 'Suggestions')}
            {Array.isArray(suggestionsData?.suggestions) && suggestionsData.suggestions.length > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 text-[9px] font-black text-white">{suggestionsData.suggestions.length}</span>
            )}
          </button>

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setHeaderMenuOpen((value) => !value)}
              aria-expanded={headerMenuOpen}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                headerMenuOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border bg-card text-text-secondary hover:text-text-primary'
              }`}
              title={t('pv_more', 'More')}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {headerMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setHeaderMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-40 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
                  <div className="border-b border-border p-2">
                    <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-text-muted">{t('saved_views', 'Saved views')}</p>
                    <div className="flex items-center gap-1">
                      <CustomSelect
                        value={currentViewId || ''}
                        onChange={(val) => {
                          const view = savedViews.find((candidate) => candidate.id === val);
                          handleApplySavedView(view || null);
                        }}
                        size="sm"
                        className="min-w-0 flex-1"
                        options={[
                          { value: '', label: t('default_view', 'Default view') },
                          ...savedViews.map((view) => ({ value: view.id, label: view.name })),
                        ]}
                      />
                      <button
                        type="button"
                        onClick={() => { setHeaderMenuOpen(false); setShowSaveViewModal(true); }}
                        className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-primary"
                        title={t('save_current_view', 'Save view')}
                      >
                        <BookmarkPlus className="h-4 w-4" />
                      </button>
                      {currentViewId && (
                        <>
                          <button
                            type="button"
                            onClick={handleUpdateCurrentView}
                            className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-primary"
                            title={t('update_view', 'Update view')}
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSavedView(currentViewId)}
                            className="rounded-md p-1.5 text-text-secondary hover:bg-surface hover:text-rose-500"
                            title={t('delete_view', 'Delete view')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="p-1">
                    {[
                      { key: 'combine', icon: GitMerge, label: t('combine_trips', 'Combine trips'), run: () => setShowCombineModal(true) },
                      { key: 'palette', icon: Command, label: t('pv_cmd_hint', 'Ctrl+K opens quick commands'), run: () => setPaletteOpen(true) },
                      { key: 'flag', icon: SlidersHorizontal, label: boardV2 ? t('pv_flag_off', 'Compact mode (hide premium layer)') : t('pv_flag_on', 'Premium mode'), run: () => {
                        try { localStorage.setItem('planning_board_v2', boardV2 ? '0' : '1'); } catch { /* storage unavailable */ }
                        window.location.reload();
                      } },
                      { key: 'repeat', icon: Repeat2, label: t('pv_repeat', 'Repeat plan'), run: () => void handleRepeatPlan(7), disabled: repeatBusy },
                      { key: 'optimize', icon: Wand2, label: t('jsx_optimize', 'AI Auto-plan'), run: () => setShowOptimizeModal(true) },
                      { key: 'export', icon: ExcelIcon, label: t('export_planning', 'Export'), run: () => setShowExportModal(true) },
                      { key: 'documents', icon: FileText, label: t('pv_documents', 'Documents'), run: () => setDocumentsOpen(true) },
                      { key: 'bulk-send', icon: Send, label: t('bulk_send', 'Send planned trips to drivers'), run: () => void bulkSendToDrivers() },
                      { key: 'print', icon: Printer, label: t('jsx_print', 'Print'), run: handlePrint },
                      { key: 'fullscreen', icon: isFullscreen ? Minimize2 : Maximize2, label: t('jsx_fullscreen', 'Fullscreen'), run: handleFullscreen },
                      { key: 'refresh', icon: RefreshCw, label: t('jsx_recalc', 'Refresh'), run: () => void loadData() },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        disabled={item.disabled}
                        onClick={() => { setHeaderMenuOpen(false); item.run(); }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-text-primary transition-colors hover:bg-surface disabled:opacity-50"
                      >
                        <item.icon
                          className={`h-3.5 w-3.5 ${({
                            combine: 'text-indigo-500',
                            palette: 'text-sky-500',
                            flag: 'text-slate-400',
                            repeat: 'text-cyan-500',
                            optimize: 'text-fuchsia-500',
                            export: 'text-emerald-600',
                            documents: 'text-amber-500',
                            'bulk-send': 'text-violet-500',
                            print: 'text-slate-500',
                            fullscreen: 'text-blue-500',
                            refresh: 'text-emerald-500',
                          } as Record<string, string>)[item.key] || 'text-text-muted'}`}
                        />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="h-[2px] w-full bg-gradient-to-r from-orange-500/80 via-orange-500/25 to-transparent" />
      </header>

{/* ── CONTEXTUAL BAR · appears only when something is selected ── */}
      {(selectedTrip || selectedPoolOrderIds.size > 0) && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-card px-3 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] print:hidden">
          <span className="shrink-0 rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-primary">
            {t('pv_context', 'Selection')}
          </span>

          {selectedTrip ? (
            <>
              <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                <span className="truncate text-[11px] font-black text-text-primary">{selectedTrip.tripNumber || '—'}</span>
                <span className="rounded border border-border bg-card px-1 text-[9px] font-black tabular-nums text-text-secondary">
                  {selectedTrip.truck?.plateNumber || selectedTrip.truckPlate || '—'}
                </span>
                <span className="hidden truncate text-[10px] font-semibold text-text-secondary md:inline">
                  {tripOriginDestination(selectedTrip).origin} → {tripOriginDestination(selectedTrip).dest}
                </span>
              </div>
              <span className="h-4 w-px shrink-0 bg-primary/20" />
              {[
                {
                  key: 'planner',
                  icon: Navigation,
                  label: t('pln_open_planner', 'Open Truck Route & Load Planner'),
                  short: t('planning', 'Planning'),
                  run: () => {
                    const truckId = selectedTrip.truck?.id || selectedTrip.truckId;
                    if (!truckId) return;
                    const tripParam = selectedTrip.id ? `&trip=${selectedTrip.id}` : '';
                    navigate(`/planning/planner/${truckId}?date=${selectedDate}${tripParam}`);
                  },
                  disabled: !(selectedTrip.truck?.id || selectedTrip.truckId),
                },
                {
                  key: 'nearby',
                  icon: Package,
                  label: t('pv_nearby', 'Nearby'),
                  short: t('pv_nearby', 'Nearby'),
                  run: () => openNearbyForTrip(selectedTrip),
                },
                {
                  key: 'results',
                  icon: List,
                  label: t('up_planning_results', 'Planning results'),
                  short: t('results', 'Results'),
                  run: () => setResultsSignal((value) => value + 1),
                },
                {
                  key: 'traffic',
                  icon: Clock3,
                  label: t('up_traffic_incidents', 'Traffic & incidents'),
                  short: t('up_traffic', 'Traffic'),
                  run: () => setTrafficTrip(selectedTrip),
                },
                {
                  key: 'driver',
                  icon: Activity,
                  label: t('up_driver_activity', 'Driver activity'),
                  short: t('driver', 'Driver'),
                  run: () => {
                    const driver = selectedTrip.driver || selectedTrip.truck?.driver;
                    if (driver?.id) setActivityDriver({ id: driver.id, name: driverEntityDisplayName(driver) });
                  },
                  disabled: !(selectedTrip.driver?.id || selectedTrip.truck?.driver?.id),
                },
                {
                  key: 'compare',
                  icon: ArrowRightLeft,
                  label: t('up_compare_routes', 'Compare routes'),
                  short: t('up_compare', 'Compare'),
                  run: () => setCompareTrip(selectedTrip),
                },
                {
                  key: 'recovery',
                  icon: AlertTriangle,
                  label: t('rec_title', 'Recovery'),
                  short: t('rec_title', 'Recovery'),
                  run: () => setRecoveryOpen(true),
                },
                {
                  key: 'scenarios',
                  icon: SlidersHorizontal,
                  label: t('sc_title', 'Scenarios'),
                  short: t('pv_scenarios', 'Scenarios'),
                  run: () => setScenariosOpen(true),
                },
                {
                  key: 'documents',
                  icon: FileText,
                  label: t('pv_documents', 'Documents'),
                  short: t('pv_documents', 'Documents'),
                  run: () => setDocumentsOpen(true),
                },
                {
                  key: 'repeat',
                  icon: Repeat2,
                  label: t('pv_repeat', 'Repeat plan'),
                  short: t('pv_repeat', 'Repeat plan'),
                  run: () => void handleRepeatPlan(7),
                  disabled: repeatBusy || !isMovableTrip(selectedTrip),
                },
                {
                  key: 'dispatch',
                  icon: Send,
                  label: t('action_send_to_driver', 'Send to Driver'),
                  short: t('action_send_to_driver', 'Send'),
                  run: () => setDispatchModalTrip(selectedTrip),
                  disabled: !['assigned', 'dispatched', 'confirmed'].includes(String(selectedTrip.status || '').toLowerCase()),
                },
              ].filter((action) => boardV2 || !['recovery', 'scenarios', 'documents'].includes(action.key)).map((action) => (
                <button
                  key={action.key}
                  type="button"
                  disabled={action.disabled}
                  onClick={action.run}
                  title={action.label}
                  className="pv-touch flex h-6 shrink-0 items-center gap-1 rounded-md border border-transparent px-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:border-border hover:bg-card hover:text-text-primary disabled:opacity-40"
                >
                  <action.icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{action.short}</span>
                </button>
              ))}
              <span className="min-w-2 flex-1" />
              <button
                type="button"
                onClick={() => setSelectedTripId(null)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-card hover:text-text-primary"
                title={t('pv_stop_close', 'Close')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="shrink-0 text-[11px] font-bold text-text-primary">
                {selectedPoolOrderIds.size} {t('jsx_selected', 'selected')}
              </span>
              <span className="hidden shrink-0 text-[10px] text-text-secondary md:inline">
                {t('drag_hint', 'Drag orders onto truck rows to assign')}
              </span>
              <span className="min-w-2 flex-1" />
              <div className="relative shrink-0">
                <button
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => setRedateOpen((value) => !value)}
                  aria-expanded={redateOpen}
                  className="flex h-6 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
                  title={t('bulk_redate', 'Move dates')}
                >
                  <CalendarClock className="h-3 w-3" />
                  {t('bulk_redate', 'Move dates')}
                </button>
                {redateOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setRedateOpen(false)} />
                    <div className="absolute right-0 top-7 z-50 w-44 rounded-lg border border-border bg-card p-1 shadow-xl">
                      {[1, 3, 7, -1].map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => void bulkShiftDates(days)}
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold text-text-primary transition-colors hover:bg-surface"
                        >
                          <span>{days > 0 ? `+${days}` : days} {t('days_short', 'days')}</span>
                          <span className="text-[9px] text-text-muted">{t('bulk_redate_hint', 'customer dates')}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={() => void bulkAssignRecommended()}
                className="flex h-6 shrink-0 items-center gap-1 rounded-md bg-orange-500 px-2 text-[10px] font-black text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
              >
                {bulkBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {t('bulk_recommend', 'Assign recommended truck')}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPoolOrderIds(new Set())}
                className="flex h-6 shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:text-text-primary"
              >
                <X className="h-3 w-3" />
                {t('jsx_cancel', 'Clear')}
              </button>
            </>
          )}
        </div>
      )}

{/* Touch drag ghost: the finger covers the card, so the target row needs a marker. */}
      {touchDrag && (
        <div
          className="pointer-events-none fixed z-[999] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-primary bg-card px-2 py-1 text-[10px] font-black text-primary shadow-2xl"
          style={{ left: touchDrag.x, top: touchDrag.y }}
        >
          {t('drop_on_truck', 'Drop on a truck row')}
        </div>
      )}

{/* ── MAIN CONTENT ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface/50">
        <div className="flex flex-1 min-h-0 p-0.5 gap-0.5">

        {/* ORDER POOL (left panel) */}
        <div 
          className={`relative flex flex-col border border-border rounded-2xl shadow-sm bg-card shrink-0 overflow-hidden print:hidden ${isPoolResizing ? 'select-none transition-none' : 'transition-all duration-300'} ${isPoolDragOver ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}`}
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
                    <button onClick={() => loadData()} className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1 mx-auto"><RefreshCw className="w-3 h-3" />{t('jsx_retry', 'Retry')}</button>
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
                      onTouchDragStart={beginTouchDrag}
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
            className={`group relative flex items-center justify-center w-1 cursor-col-resize shrink-0 select-none z-10 transition-colors ${
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

        {/* MAIN WORKSPACE + MAP PANEL */}
        <div className="flex-1 flex gap-2 min-w-0">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-card rounded-2xl border border-border shadow-sm">
          {viewMode === 'map' ? (
            <PlanningMap mapData={mapData} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} isLoading={isLoading} />
          ) : (
            <>
              {/* Enterprise timeline summary: title, range, live state and legend. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 border-b border-border bg-card shrink-0" data-testid="planning-timeline-summary">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-[11px] font-black text-text-primary truncate">{t('timeline_title', 'Fleet operations timeline')}</h2>
                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{t('timeline_live', 'Live')}</span>
                    </div>
                    <p className="text-[9px] text-text-secondary truncate">{rangeLabel} · {displayResources.length} {t('timeline_resources_short', 'resources')} · {trips.length} {t('timeline_trips_short', 'trips')}</p>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setLegendOpen((value) => !value)}
                      aria-expanded={legendOpen}
                      className="flex h-7 items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2 text-[10px] font-bold text-text-secondary transition-colors hover:text-text-primary"
                    >
                      <Info className="h-3 w-3" />
                      {t('legend', 'Legend')}
                    </button>
                    {legendOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setLegendOpen(false)} />
                        <div className="absolute right-0 top-9 z-40 w-56 space-y-2 rounded-xl border border-border bg-card p-2.5 shadow-2xl">
                          <p className="text-[9px] font-black uppercase tracking-wide text-text-muted">{t('timeline_legend_trip_status', 'Trip status')}</p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-text-secondary">
                            {([['planning', t('timeline_legend_planned', 'Planned')], ['assigned', t('timeline_legend_assigned', 'Assigned')], ['in_transit', t('timeline_legend_active', 'In execution')], ['delayed', t('timeline_legend_conflict', 'Conflict')]] as [string, string][]).map(([tone, label]) => (
                              <span key={tone} className="inline-flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: planningTone(tone).accent }} />
                                {label}
                              </span>
                            ))}
                          </div>
                          <p className="border-t border-border pt-2 text-[9px] font-black uppercase tracking-wide text-text-muted">{t('timeline_stop_sequence', 'Stop sequence')}</p>
                          <div className="grid grid-cols-2 gap-1 text-[10px] font-bold text-text-secondary">
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-blue-500" />{t('timeline_legend_pickup', 'Pickup')}</span>
                            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-emerald-500" />{t('timeline_legend_delivery', 'Delivery')}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-surface/60 px-1.5 py-1">
                    <button onClick={() => setZoomLevel(z => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="p-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary" title={t('zoom_out', 'Zoom out')}><ZoomOut className="w-3 h-3" /></button>
                    <span className="text-[9px] font-mono font-bold w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
                    <button onClick={() => setZoomLevel(z => Math.min(2.5, +(z + 0.15).toFixed(2)))} className="p-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary" title={t('zoom_in', 'Zoom in')}><ZoomIn className="w-3 h-3" /></button>
                    <button onClick={() => setZoomLevel(1)} className="p-0.5 rounded hover:bg-card text-text-secondary hover:text-text-primary" title={t('zoom_reset', 'Reset zoom (100%)')}><RotateCcw className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>

              {/* Timeline grid */}
              {/* The Gantt keeps a usable height of its own: the results panel
                  below is bounded, so rows can never be squeezed out of view. */}
              <div
                ref={timelineRef}
                tabIndex={0}
                data-testid="planning-timeline-scroll"
                className="flex-1 min-h-0 overflow-auto relative outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 rounded-b-xl custom-scrollbar"
              >
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
                    <button onClick={() => loadData()} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-md"><RefreshCw className="w-3.5 h-3.5" /><span>{t('jsx_retry', 'Retry')}</span></button>
                  </div>
                ) : (
                  <div className="w-full" style={{ minWidth: `${224 + totalTimelineWidth}px` }}>
                        {/* Time scale header: two-level resource / time ruler. */}
                        <div className="flex border-b border-border bg-surface/60 sticky top-0 z-20 shadow-sm h-12" style={{ minWidth: `${224 + totalTimelineWidth}px` }}>
                          <div className="w-56 shrink-0 border-r border-border/60 bg-surface/80 flex flex-col justify-center gap-0.5 px-2 py-1 sticky left-0 z-30">
                            <div className="flex items-center justify-between">
                              {viewMode === 'week' ? (
                                <span className="text-[9px] font-black uppercase tracking-wide text-text-muted tabular-nums" title={t('jsx_dateThisWeek', 'This week')}>
                                  {(() => {
                                    const d = new Date(selectedDate);
                                    const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                    tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
                                    const week1 = new Date(tmp.getFullYear(), 0, 4);
                                    const wk = 1 + Math.round(((tmp.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
                                    return `W${wk}`;
                                  })()}
                                </span>
                              ) : (
                                <button onClick={() => setSelectedDate(dayStr(new Date()))} className="text-[9px] font-bold text-primary hover:text-primary/80 px-1 rounded hover:bg-primary/10">
                                  {viewMode === 'month'
                                    ? t('jsx_dateThisMonth', 'This month')
                                    : t('jsx_today', 'Today')}
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => setSelectedDate(d => shiftPeriod(d, viewMode, -1))} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors" title={t('timeline_previous', 'Previous period')}>
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <DateField
                                value={selectedDate}
                                onChange={(v) => v && setSelectedDate(v)}
                                lang={lang}
                                size="sm"
                                className="w-[150px]"
                                title={t('timeline_selected_date', 'Selected date')}
                              />
                              <button onClick={() => setSelectedDate(d => shiftPeriod(d, viewMode, 1))} className="p-1 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors" title={t('timeline_next', 'Next period')}>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-1 relative" style={{ minWidth: `${totalTimelineWidth}px` }}>
                            {Array.from({ length: hoursVisible }, (_, h) => {
                              const hourScale = viewMode === 'day' || viewMode === 'timeline';
                              const colDate = addDays(fromDateObj, h);
                              // In an hour view every column is an hour of the selected
                              // day, so "today" is the day and "now" is one hour column.
                              const isToday = !hourScale && dayStr(colDate) === operationalClock.dateKey;
                              const isNowHour = hourScale && dayStr(fromDateObj) === operationalClock.dateKey && h === operationalClock.hour;
                              const isWeekendDay = !hourScale && [0, 6].includes(colDate.getDay());
                              const isNightHour = hourScale && (h < 6 || h >= 21);
                              return (
                                <div
                                  key={h}
                                  className={`flex-1 flex flex-col items-center justify-center text-center text-[10px] font-bold py-1 border-r border-border/30 last:border-0 transition-colors ${
                                    isToday ? 'bg-primary/10 text-primary font-black border-primary/30' : isWeekendDay || isNightHour ? 'bg-slate-500/[0.055] text-text-secondary' : 'text-text-secondary'
                                  } ${(viewMode === 'day' || viewMode === 'timeline') && h % 6 === 0 ? 'border-l border-l-border/60' : ''}`}
                                  style={{ minWidth: `${colWidth}px`, width: `${colWidth}px` }}
                                >
                                  {viewMode === 'day' || viewMode === 'timeline' ? (
                                    <>
                                      <span className="text-[10px] font-black">{String(h).padStart(2, '0')}:00</span>
                                      {isNowHour && <span className="text-[7px] uppercase tracking-wide">{t('timeline_now', 'Now')}</span>}
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-[8px] uppercase tracking-wide opacity-70">{colDate.toLocaleDateString([], { weekday: 'short' })}</span>
                                      <span className="text-[10px] font-black">{colDate.getDate()} {colDate.toLocaleDateString([], { month: 'short' })}</span>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                            {showNow && (
                              <div className="absolute bottom-0 top-0 z-30 pointer-events-none" style={{ left: `${(nowMinutes / totalMinutes) * 100}%` }}>
                                <div className="h-full border-l-2 border-primary" />
                                <span className="absolute -top-0.5 -left-1.5 w-3 h-3 rounded-full bg-primary border-2 border-card shadow" />
                              </div>
                            )}
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
                                onDropTrip={handleDropTrip}
                                draggingId={draggingOrderId}
                                draggingOrder={draggingOrder}
                                hosSummary={boardData?.hosSummary || {}}
                                grouping={grouping}
                                colWidth={colWidth}
                                timelineWidth={totalTimelineWidth}
                                now={nowTick}
                                nowOffsetMinutes={nowMinutes}
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

            </>
          )}
        </div>

        {/* Map is a panel, never a mode: the board stays visible next to it. */}
        {mapOpen && (
          <div className="hidden shrink-0 items-stretch lg:flex print:hidden">
            <div
              onMouseDown={() => {
                mapResizingRef.current = true;
                document.body.style.cursor = 'col-resize';
              }}
              className="mx-0.5 w-1.5 cursor-col-resize self-stretch rounded-full bg-border/70 transition-colors hover:bg-primary/60"
              title={t("drag_to_resize", "Drag to resize")}
              role="separator"
              aria-orientation="vertical"
            />
            <div
              style={{ width: mapWidth }}
              className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1">
                <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-text-muted">
                  <MapIcon className="h-3 w-3 text-primary" />
                  {t("pv_map_panel", "Map")}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-semibold text-text-muted">{hiddenTripIds.size > 0 ? `${hiddenTripIds.size} ${t("pr_map_hidden", "Hidden on map")}` : ""}</span>
                  <button
                    type="button"
                    onClick={() => setMapOpen(false)}
                    className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
                    title={t("pv_map_hide", "Hide map")}
                  >
                    <PanelRightClose className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <PlanningMap
                  mapData={mapData}
                  selectedTripId={selectedTripId}
                  onSelectTrip={setSelectedTripId}
                  isLoading={isLoading}
                  hiddenTripIds={hiddenTripIds}
                  compact
                />
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

</div>

        {/* The results panel owns its height (48px collapsed, resizable when
            open). A min-height wrapper left a blank region under it. */}
        {boardData ? (
      <div className="shrink-0 border-t border-border">
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
        hiddenTripIds={hiddenTripIds}
        onToggleTripVisibility={(tripId) => setHiddenTripIds((prev) => toggleHiddenTrip(prev, tripId))}
      />
      </div>
    ) : null}

    {/* Status bar footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-surface/30 text-[10px] text-text-secondary shrink-0 print:hidden">
                <span>{t('jsx_resources','Resources')}: <span className="font-bold text-text-primary">{displayResources.length}/{resources.length}</span></span>
                <span>{t('drag_hint','Drag orders onto truck rows to assign')}</span>
                <span>{t('jsx_tripsInRange','Trips in range')}: <span className="font-bold text-text-primary">{trips.length}</span></span>
              </div>
      {/* ── DRAWERS & MODALS ────────────────────────────────────────────── */}
      {selectedTrip && !drawerDismissed && (
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
            setDrawerDismissed(true);
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
          onSaveStop={handleSaveStop}
          onStopLockChange={handleStopLockChange}
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

      <PlanningCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        actions={paletteActions}
      />

      <PlanningSuggestionsPanel
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        loading={suggestionsLoading}
        error={suggestionsError}
        data={suggestionsData}
        busyId={suggestionBusyId}
        onApply={applySuggestion}
        onOpenOrder={(orderId) => {
          setSuggestionsOpen(false);
          setSelectedOrderId(orderId);
        }}
      />

      {boardV2 && recoveryOpen && selectedTrip && (
        <div
          className="fixed inset-0 z-[10045] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:items-center print:hidden"
          onClick={() => setRecoveryOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <PlanningRecoveryPanel
              open={recoveryOpen}
              onClose={() => setRecoveryOpen(false)}
              trip={selectedTrip}
              trips={trips}
              onMoveOrder={handleRecoveryMove}
              onOpenScenarios={() => {
                setRecoveryOpen(false);
                setScenariosOpen(true);
              }}
              onSubcontract={() => {
                setRecoveryOpen(false);
                setSubcontractorTargetTrip(selectedTrip);
              }}
              onSplit={() => {
                setRecoveryOpen(false);
                setSplitTripTarget(selectedTrip);
              }}
            />
          </div>
        </div>
      )}

      {boardV2 && scenariosOpen && selectedTrip && (
        <div
          className="fixed inset-0 z-[10045] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:items-center print:hidden"
          onClick={() => setScenariosOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <PlanningScenariosPanel
              open={scenariosOpen}
              onClose={() => setScenariosOpen(false)}
              trip={selectedTrip}
              resources={resources}
              onApply={applyScenario}
              applying={scenarioApplying}
            />
          </div>
        </div>
      )}

      <PlanningDocumentsModal
        open={boardV2 && documentsOpen}
        onClose={() => setDocumentsOpen(false)}
        trips={selectedTrip ? [selectedTrip] : trips.slice(0, 50)}
        company={useSettingsStore.getState().company}
      />

      {nearby.open && (
        <div
          className="fixed inset-0 z-[10045] flex items-end justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:items-center print:hidden"
          onClick={() => setNearby((prev) => ({ ...prev, open: false }))}
        >
          <div className="w-full max-w-2xl" onClick={(event) => event.stopPropagation()}>
            <NearbyLoadsPanel
              open={nearby.open}
              onClose={() => setNearby((prev) => ({ ...prev, open: false }))}
              loading={nearby.loading}
              error={nearby.error}
              data={nearby.data}
              radiusKm={nearby.radius}
              onRadiusChange={changeNearbyRadius}
              busyOrderId={nearbyBusyOrderId}
              onAdd={addNearbyOrder}
              onOpenOrder={(orderId) => {
                setNearby((prev) => ({ ...prev, open: false }));
                setSelectedOrderId(orderId);
              }}
            />
          </div>
        </div>
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
      {assignmentReview && (
        <ConsolidationWizard
          review={assignmentReview}
          resources={resources}
          busy={!!loadingAction}
          onClose={() => setAssignmentReview(null)}
          onMode={(mode: 'existing' | 'new') => reviewAssignment(assignmentReview.orderIds, assignmentReview.truckId, mode)}
          onSelectOption={(selection: { pickupIndex: number; deliveryIndex: number }) => setAssignmentReview((prev: any) => prev ? { ...prev, selectedInsertion: selection } : prev)}
          onOverrideReason={(value: string) => setAssignmentReview((prev: any) => prev ? { ...prev, overrideReason: value, overrideError: null } : prev)}
          onConfirm={confirmAssignmentReview}
          onOpenTruck={(truckId: string) => window.location.assign(buildTruckDimensionsEditUrl(truckId, '/planning'))}
          onJumpToOrder={(orderId: string | null) => { setAssignmentReview(null); if (orderId) setSelectedOrderId(orderId); }}
        />
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
              {recommendationsLoading && (
                <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  {t('rec_loading', 'Ranking available trucks…')}
                </div>
              )}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {rankedResources.map((truck, index) => {
                  const recommendation = truckRecommendations.find((c: any) => String(c.truckId) === String(truck.id));
                  const recommendationIndex = recommendation ? truckRecommendations.indexOf(recommendation) : -1;
                  const isSelected = (selectedAssignTruckId || rankedResources[0]?.id) === truck.id;
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
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-primary text-white' : 'border border-border'
                        }`}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-text-primary">{truck.plateNumber}</span>
                            {recommendationIndex === 0 && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                                {t('rec_best', 'Recommended')}
                              </span>
                            )}
                            {recommendation && recommendation.blockers?.length > 0 && (
                              <span className="text-[9px] font-bold text-red-600" title={recommendation.blockers.map((b: any) => b.message).join(' · ')}>
                                {t('cons_blocked', 'Blocked')}
                              </span>
                            )}
                            {truck.status && (
                              <span className="text-[10px] uppercase font-bold text-text-muted">
                                ({truck.status})
                              </span>
                            )}
                          </div>
                          {truck.driver?.user?.name && (
                            <p className="text-[11px] text-text-secondary mt-0.5 truncate">
                              {driverEntityDisplayName(truck.driver)}
                            </p>
                          )}
                          {recommendation && (
                            <p className="text-[10px] mt-0.5 truncate text-text-secondary">
                              {recommendation.routeStatus === 'verified'
                                ? `${recommendation.distanceKm} km · ${recommendation.durationMin} min · ${t('rec_deadhead', 'empty distance')}${recommendation.source === 'projected_trip_end' ? ` · ${t('rec_future', 'from projected trip end')}` : ''}`
                                : t('cons_route_unverified', 'Route could not be verified')}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-text-muted shrink-0">
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
                  const targetTruckId = selectedAssignTruckId || truckRecommendations[0]?.truckId || rankedResources[0]?.id;
                  if (!targetTruckId) {
                    toast.error(t('select_truck_required', 'Vă rugăm să selectați un camion'));
                    return;
                  }
                  const orderToPlan = assignOrderModal;
                  setAssignOrderModal(null);
                  handleDropOrder(targetTruckId, orderToPlan.id);
                }}
                disabled={!!loadingAction || !rankedResources.length}
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
