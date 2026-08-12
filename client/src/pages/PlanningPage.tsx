import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, CheckCircle2, AlertTriangle, Trash2, ExternalLink,
  Users, X, ChevronRight, ChevronLeft, Calendar, ArrowRight, Info, Activity, Search,
  Save, Undo2, SplitSquareHorizontal, Send, ShieldCheck,
  LayoutGrid, Clock, Map as MapIcon, Sparkles, CheckSquare, Square, RefreshCw,
  ChevronsLeft, ChevronsRight, Maximize2, Minimize2, Settings2, Columns3, Printer, Container, Plus, Download,
  ArrowUp, ArrowDown, Filter, Layers, Navigation, Eye, EyeOff, Check, CornerDownRight, RotateCcw
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../lib/api';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import ExportModal from '../components/ExportModal';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { useShortcuts } from '../hooks/useShortcuts';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

// ─── Helpers & Formatting ───────────────────────────────────────────────────
const dayStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const parseDay = (s: string) => {
  const [y, m, d] = (s || '').split('-').map(Number);
  return new Date(y || new Date().getFullYear(), (m || 1) - 1, d || 1);
};

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

const TRIP_HEX_COLORS: Record<string, string> = {
  planning: '#f59e0b',
  planned: '#3b82f6',
  assigned: '#8b5cf6',
  dispatched: '#ec4899',
  driver_accepted: '#14b8a6',
  started: '#f97316',
  loading: '#ef4444',
  driving: '#f59e0b',
  partially_delivered: '#eab308',
  completed: '#22c55e',
  closed: '#64748b',
  cancelled: '#94a3b8',
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
  let weight = 0, ldm = 0, pallets = 0, volume = 0, hasLdm = false;
  for (const o of orders || []) {
    for (const c of o?.cargoItems || []) {
      weight += Number(c.weightKg) || 0;
      if (c.ldm != null && Number(c.ldm) > 0) {
        ldm += Number(c.ldm);
        hasLdm = true;
      }
      volume += Number(c.volumeCbm) || 0;
      if (String(c.unit || 'pallet').toLowerCase() === 'pallet') {
        pallets += Number(c.quantity) || 0;
      }
    }
  }
  return {
    weight,
    ldm,
    hasLdm,
    pallets,
    volume,
    ldmFormatted: hasLdm ? ldm.toFixed(1) : '—',
  };
}

function resolveTripResources(trip: any, resources: any[] = [], drivers: any[] = [], trailers: any[] = []) {
  const truck = trip?.truck || resources.find((r: any) => r.id === trip?.truckId) || null;
  const driver = trip?.driver || truck?.driver || drivers.find((d: any) => d.id === trip?.driverId) || null;
  const trailer = trip?.trailer || trailers.find((t: any) => t.id === trip?.trailerId) || null;
  return { truck, driver, trailer };
}

// ─── Map view (MapLibre GL Direct Integration) ──────────────────────────────
function PlanningMap({
  mapData,
  selectedTripId,
  onSelectTrip,
  isLoading,
}: {
  mapData: any;
  selectedTripId: string | null;
  onSelectTrip: (tripId: string) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [showVehicles, setShowVehicles] = useState(true);
  const [showStops, setShowStops] = useState(true);

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstance.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/bright',
        center: [5.2913, 52.1326], // Benelux / Europe center
        zoom: 6,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      map.on('load', () => {
        setMapReady(true);
        setMapError(null);
      });

      map.on('error', (e) => {
        // Soft fallback for style issues
        console.warn('Map style error:', e);
      });

      mapInstance.current = map;
    } catch (err: any) {
      console.error('Failed to initialize map:', err);
      setMapError(err.message || 'Map initialization failed');
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Fit bounds helper
  const handleFitAll = useCallback(() => {
    const map = mapInstance.current;
    if (!map) return;

    const bounds = new maplibregl.LngLatBounds();
    let hasCoords = false;

    if (mapData?.stops) {
      for (const s of mapData.stops) {
        if (s.lat != null && s.lng != null && !isNaN(s.lat) && !isNaN(s.lng)) {
          bounds.extend([s.lng, s.lat]);
          hasCoords = true;
        }
      }
    }

    if (mapData?.vehicles) {
      for (const v of mapData.vehicles) {
        if (v.lat != null && v.lng != null && !isNaN(v.lat) && !isNaN(v.lng)) {
          bounds.extend([v.lng, v.lat]);
          hasCoords = true;
        }
      }
    }

    if (mapData?.routes) {
      for (const r of mapData.routes) {
        for (const p of r.points || []) {
          if (p[0] != null && p[1] != null) {
            bounds.extend([p[1], p[0]]);
            hasCoords = true;
          }
        }
      }
    }

    if (hasCoords && !bounds.isEmpty()) {
      try {
        map.fitBounds(bounds, { padding: 60, maxZoom: 13, duration: 600 });
      } catch {
        /* ignore */
      }
    }
  }, [mapData]);

  // Update Layers & Markers on data change
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;

    // Clear old markers
    for (const m of markersRef.current) {
      try {
        m.remove();
      } catch {
        /* ignore */
      }
    }
    markersRef.current = [];

    // 1. Remove old route layers/sources
    try {
      if (map.getLayer('routes-layer')) map.removeLayer('routes-layer');
      if (map.getLayer('routes-selected-layer')) map.removeLayer('routes-selected-layer');
      if (map.getSource('routes-source')) map.removeSource('routes-source');
    } catch {
      /* ignore */
    }

    // 2. Add Routes GeoJSON
    if (showRoutes && mapData?.routes?.length) {
      const features = mapData.routes
        .filter((r: any) => r.points && r.points.length >= 2)
        .map((r: any) => ({
          type: 'Feature',
          properties: {
            tripId: r.tripId,
            tripNumber: r.tripNumber,
            status: r.status,
            color: TRIP_HEX_COLORS[r.status] || r.color || '#3b82f6',
            isSelected: r.tripId === selectedTripId,
          },
          geometry: {
            type: 'LineString',
            coordinates: r.points.map((p: number[]) => [p[1], p[0]]),
          },
        }));

      if (features.length) {
        map.addSource('routes-source', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
        });

        map.addLayer({
          id: 'routes-layer',
          type: 'line',
          source: 'routes-source',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': ['case', ['get', 'isSelected'], 6, 4],
            'line-opacity': ['case', ['get', 'isSelected'], 1, 0.75],
          },
        });

        // Interactive route click
        map.on('click', 'routes-layer', (e: any) => {
          const feature = e.features?.[0];
          if (feature?.properties?.tripId) {
            onSelectTrip(feature.properties.tripId);
          }
        });

        map.on('mouseenter', 'routes-layer', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'routes-layer', () => {
          map.getCanvas().style.cursor = '';
        });
      }
    }

    // 3. Add Stops Markers
    if (showStops && mapData?.stops?.length) {
      for (const s of mapData.stops) {
        if (s.lat == null || s.lng == null || isNaN(s.lat) || isNaN(s.lng)) continue;
        const isPickup = s.type === 'pickup';
        const isSelected = s.tripId === selectedTripId;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        el.innerHTML = `
          <div class="flex items-center justify-center w-6 h-6 rounded-full border-2 shadow-md transition-transform hover:scale-125 ${
            isSelected ? 'scale-125 ring-2 ring-primary ring-offset-1' : ''
          } ${
          isPickup
            ? 'bg-blue-600 border-white text-white'
            : 'bg-emerald-600 border-white text-white'
        }">
            <span class="text-[10px] font-black">${s.sequence || (isPickup ? '↑' : '↓')}</span>
          </div>
        `;

        const popupHtml = `
          <div class="p-2.5 max-w-xs text-xs font-sans">
            <div class="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 mb-1.5">
              <span class="font-black text-slate-900">${s.tripNumber || 'Trip'} · Stop #${s.sequence}</span>
              <span class="px-1.5 py-0.5 text-[9px] font-bold rounded uppercase ${
                isPickup ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }">${isPickup ? t('loading_stop', 'Pickup') : t('unloading_stop', 'Delivery')}</span>
            </div>
            <p class="font-bold text-slate-800">${s.companyName || s.city || '—'}</p>
            <p class="text-slate-500 text-[11px]">${s.address || ''}${s.postalCode ? `, ${s.postalCode}` : ''} ${s.country || ''}</p>
            ${s.eta ? `<p class="mt-1 text-slate-600 font-semibold">ETA: ${fmtTime(s.eta)} ${fmtShort(s.eta)}</p>` : ''}
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([s.lng, s.lat])
          .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml))
          .addTo(map);

        el.addEventListener('click', () => {
          if (s.tripId) onSelectTrip(s.tripId);
        });

        markersRef.current.push(marker);
      }
    }

    // 4. Add Vehicles Markers
    if (showVehicles && mapData?.vehicles?.length) {
      for (const v of mapData.vehicles) {
        if (v.lat == null || v.lng == null || isNaN(v.lat) || isNaN(v.lng)) continue;
        const isSelected = v.tripId && v.tripId === selectedTripId;

        const el = document.createElement('div');
        el.className = 'group relative cursor-pointer';
        el.innerHTML = `
          <div class="flex items-center gap-1 px-2 py-1 rounded-full border-2 border-white shadow-lg bg-slate-900 text-white text-[11px] font-bold transition-transform hover:scale-110 ${
            isSelected ? 'ring-2 ring-primary ring-offset-1 scale-110' : ''
          }">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>${v.plateNumber}</span>
          </div>
        `;

        const popupHtml = `
          <div class="p-2 text-xs font-sans">
            <p class="font-black text-slate-900">${v.plateNumber}</p>
            <p class="text-slate-500">${v.driver ? `Driver: ${v.driver}` : 'No driver'}</p>
            <p class="text-slate-600 capitalize">Status: ${v.status || 'Active'}</p>
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([v.lng, v.lat])
          .setPopup(new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml))
          .addTo(map);

        if (v.tripId) {
          el.addEventListener('click', () => onSelectTrip(v.tripId));
        }

        markersRef.current.push(marker);
      }
    }

    // Auto-fit on initial load or trip selection
    if (selectedTripId) {
      const selectedRoute = mapData?.routes?.find((r: any) => r.tripId === selectedTripId);
      if (selectedRoute?.points?.length) {
        const bounds = new maplibregl.LngLatBounds();
        for (const p of selectedRoute.points) {
          bounds.extend([p[1], p[0]]);
        }
        try {
          map.fitBounds(bounds, { padding: 80, maxZoom: 12, duration: 600 });
        } catch {
          /* ignore */
        }
      }
    } else {
      handleFitAll();
    }
  }, [mapReady, mapData, showRoutes, showVehicles, showStops, selectedTripId, onSelectTrip, handleFitAll, t]);

  return (
    <div className="relative h-full w-full rounded-2xl overflow-hidden border border-border bg-surface/30">
      {/* Map Canvas Container (Always rendered) */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Floating Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-card/90 backdrop-blur-md p-2 rounded-xl border border-border/80 shadow-lg text-xs">
        <div className="flex items-center gap-2 border-b border-border/60 pb-1.5 px-1">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span className="font-bold text-text-primary uppercase tracking-wider text-[10px]">
            {t('layer_routes', 'Layers')}
          </span>
        </div>
        <label className="flex items-center gap-2 px-1 text-text-secondary hover:text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showRoutes}
            onChange={(e) => setShowRoutes(e.target.checked)}
            className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <span>{t('layer_routes', 'Routes')}</span>
        </label>
        <label className="flex items-center gap-2 px-1 text-text-secondary hover:text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showStops}
            onChange={(e) => setShowStops(e.target.checked)}
            className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <span>{t('layer_stops', 'Stops')}</span>
        </label>
        <label className="flex items-center gap-2 px-1 text-text-secondary hover:text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showVehicles}
            onChange={(e) => setShowVehicles(e.target.checked)}
            className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
          />
          <span>{t('layer_vehicles', 'Vehicles')}</span>
        </label>
        <button
          onClick={handleFitAll}
          className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-surface hover:bg-surface-hover font-semibold text-text-primary transition-colors border border-border"
        >
          <Navigation className="w-3 h-3 text-primary" />
          <span>{t('map_fit_all', 'Fit all')}</span>
        </button>
      </div>

      {/* Loading overlay indicator */}
      {isLoading && (
        <div className="absolute top-4 right-16 z-10 flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-border shadow-md">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          <span className="text-[11px] font-bold text-text-secondary">{t('map_loading', 'Updating…')}</span>
        </div>
      )}

      {/* Error state fallback */}
      {mapError && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm p-6 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="font-bold text-text-primary text-sm">{t('jsx_loadError', 'Map loading issue')}</p>
          <p className="text-xs text-text-secondary max-w-sm mt-1 mb-4">{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('jsx_recalc', 'Retry')}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Order Pool Operational Card ────────────────────────────────────────────
function PoolOrderCard({
  order,
  dragging,
  selected,
  onToggle,
  onDetail,
  cols,
}: {
  order: any;
  dragging?: boolean;
  selected?: boolean;
  onToggle?: (id: string, select: boolean) => void;
  onDetail?: (order: any) => void;
  cols?: Record<string, boolean>;
}) {
  const { t } = useTranslation();
  const pickup = (order.stops || []).find((s: any) => s.type === 'pickup') || order.stops?.[0];
  const dropoff =
    (order.stops || []).filter((s: any) => s.type === 'delivery' || s.type === 'dropoff').pop() ||
    order.stops?.[order.stops?.length - 1];
  const cargo = sumCargo([order]);
  const isUrgent =
    pickup?.dateFrom && new Date(pickup.dateFrom).getTime() - Date.now() < 86400000 * 2;
  const prioCls =
    order.priority === 'critical'
      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
      : order.priority === 'high'
      ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
      : 'bg-surface text-text-secondary border border-border/50';

  const visibleCols: [string, React.ReactNode][] = [
    ['client', order.client?.name || '—'],
    ['weight', cargo.weight > 0 ? `${cargo.weight.toLocaleString()} kg` : '—'],
    ['pallets', cargo.pallets > 0 ? `${cargo.pallets} plt` : '—'],
    ['volume', cargo.volume > 0 ? `${cargo.volume.toFixed(1)} m³` : '—'],
    ['ldm', cargo.hasLdm ? `${cargo.ldm.toFixed(1)} ldm` : '—'],
    [
      'priority',
      <span key="prio" className={`px-1.5 py-0.5 text-[9px] font-black rounded ${prioCls}`}>
        {String(t(`priority_${order.priority || 'normal'}`, order.priority || 'normal')).toUpperCase()}
      </span>,
    ],
    ['stops', `${(order.stops || []).length} ${t('jsx_stops', 'stops')}`],
    ['date', pickup?.dateFrom ? `${fmtShort(pickup.dateFrom)} ${pickup.timeFrom || ''}` : '—'],
  ].filter(([k]) => cols?.[k]);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('orderId', order.id);
        e.dataTransfer.effectAllowed = 'move';
        onToggle?.(order.id, true);
      }}
      onDragEnd={() => onToggle?.(order.id, false)}
      onClick={() => onDetail?.(order)}
      className={`group bg-card border rounded-2xl p-3.5 cursor-grab active:cursor-grabbing transition-all select-none ${
        dragging
          ? 'opacity-40 scale-95 border-primary shadow-lg'
          : selected
          ? 'border-primary ring-1 ring-primary/30 shadow-md'
          : 'border-border hover:border-primary/50 hover:shadow-md'
      }`}
    >
      {/* Header: Reference + Type + Urgent badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(order.id, !selected);
            }}
            className="text-text-secondary hover:text-primary transition-colors shrink-0"
          >
            {selected ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
          <span className="font-bold text-text-primary text-sm truncate group-hover:text-primary transition-colors">
            {order.orderNumber || order.referenceNumber || '—'}
          </span>
          {isUrgent && (
            <span className="px-1.5 py-0.5 text-[9px] font-black bg-red-500/10 text-red-600 border border-red-500/20 rounded shrink-0">
              {t('jsx_uRGENT', 'URGENT')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-primary/10 text-primary border border-primary/20">
            {(order.transportType || 'FTL').toUpperCase()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDetail?.(order);
            }}
            className="p-1 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors"
            title={t('jsx_details', 'Details')}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Route: Origin -> Destination */}
      <div className="flex items-center gap-1.5 mt-2 text-xs text-text-secondary truncate">
        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
        <span className="truncate font-medium text-text-primary">
          {pickup?.city || pickup?.address?.split(',')[0] || '—'}
        </span>
        <ArrowRight className="w-3 h-3 shrink-0 mx-0.5 text-text-muted" />
        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="truncate font-medium text-text-primary">
          {dropoff?.city || dropoff?.address?.split(',')[0] || '—'}
        </span>
      </div>

      {/* Cargo & Client Details */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 text-xs">
        <div className="truncate text-text-secondary">
          <span className="font-semibold text-text-primary">
            {cargo.weight > 0 ? `${cargo.weight.toLocaleString()} kg` : '—'}
          </span>
          {cargo.pallets > 0 && <span> · {cargo.pallets} plt</span>}
          {order.client?.name && <span className="truncate text-text-muted"> · {order.client.name}</span>}
        </div>
        <span className="font-black text-text-primary shrink-0">
          €{Number(order.price || 0).toLocaleString()}
        </span>
      </div>

      {/* Time Window */}
      {pickup?.dateFrom && (
        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-text-secondary">
          <Calendar className="w-3 h-3 text-text-muted" />
          <span>
            {fmtShort(pickup.dateFrom)} {pickup.timeFrom ? `· ${pickup.timeFrom}` : ''}
            {pickup.timeUntil ? `–${pickup.timeUntil}` : ''}
          </span>
        </div>
      )}

      {/* Configurable Columns Pills */}
      {visibleCols.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-border/30">
          {visibleCols.map(([k, v]) => (
            <span
              key={k}
              className="px-1.5 py-0.5 text-[9px] font-bold text-text-secondary bg-surface border border-border/60 rounded-md"
            >
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resource Row (Capacity & Fleet Header) ─────────────────────────────────
function ResourceRowHeader({
  resource,
  trips = [],
  onDropOrder,
}: {
  resource: any;
  trips: any[];
  onDropOrder?: (resourceId: string) => void;
}) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const resourceTrips = trips.filter((tr: any) => tr.truck?.id === resource.id || tr.truckId === resource.id);
  const allOrders = resourceTrips.flatMap((tr: any) => tr.orders || []).filter((o: any) => o && o.id);
  const cargo = sumCargo(allOrders);

  const maxWeight = resource.maxWeightKg || 24000;
  const maxPallets = resource.maxPallets || 33;
  const maxVolume = resource.maxVolumeCbm || 90;
  const maxLdm = resource.maxLdm || 13.6;

  const weightPct = Math.min(100, Math.round((cargo.weight / maxWeight) * 100));
  const palletsPct = Math.min(100, Math.round((cargo.pallets / maxPallets) * 100));
  const volumePct = Math.min(100, Math.round((cargo.volume / maxVolume) * 100));
  const ldmPct = cargo.hasLdm ? Math.min(100, Math.round((cargo.ldm / maxLdm) * 100)) : 0;

  const status = String(resource.status || 'available').toLowerCase();
  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    available: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    assigned: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    driving: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    loading: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    unloading: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    maintenance: 'bg-red-500/10 text-red-600 border-red-500/20',
    inactive: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        onDropOrder?.(resource.id);
      }}
      className={`bg-card border rounded-2xl p-4 transition-all ${
        isDragOver
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-lg'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Vehicle Plate + Brand/Model + Driver + Trailer */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center border border-border shrink-0">
            <TruckIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-text-primary text-base tracking-tight">
                {resource.plateNumber}
              </span>
              {resource.model && (
                <span className="text-xs font-semibold text-text-secondary">
                  {resource.brand || ''} {resource.model}
                </span>
              )}
              <span
                className={`px-2 py-0.5 text-[10px] font-black rounded-full border uppercase ${
                  statusColors[status] || statusColors.active
                }`}
              >
                {t(`status_${status}`, status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-secondary flex-wrap">
              {resource.driver?.name && (
                <span className="flex items-center gap-1 font-medium text-text-primary">
                  <Users className="w-3.5 h-3.5 text-text-muted" />
                  {resource.driver.name}
                </span>
              )}
              {resource.trailerPlate && (
                <span className="flex items-center gap-1 font-medium text-text-secondary">
                  <Container className="w-3.5 h-3.5 text-text-muted" />
                  {resource.trailerPlate}
                </span>
              )}
              {(resource.features || []).length > 0 && (
                <div className="flex items-center gap-1">
                  {resource.features.map((f: string) => (
                    <span
                      key={f}
                      className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-surface border border-border/60 text-text-muted"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Capacity Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs shrink-0 lg:w-[480px]">
          {/* Weight */}
          <div className="bg-surface/60 rounded-xl p-2 border border-border/50">
            <div className="flex justify-between text-[10px] font-bold text-text-secondary mb-1">
              <span>{t('pool_col_weight', 'Weight')}</span>
              <span className={weightPct > 100 ? 'text-red-500' : 'text-text-primary'}>
                {(cargo.weight / 1000).toFixed(1)} / {(maxWeight / 1000).toFixed(0)}t
              </span>
            </div>
            <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  weightPct > 100
                    ? 'bg-red-500'
                    : weightPct > 80
                    ? 'bg-amber-500'
                    : 'bg-primary'
                }`}
                style={{ width: `${weightPct}%` }}
              />
            </div>
          </div>

          {/* Pallets */}
          <div className="bg-surface/60 rounded-xl p-2 border border-border/50">
            <div className="flex justify-between text-[10px] font-bold text-text-secondary mb-1">
              <span>{t('pool_col_pallets', 'Pallets')}</span>
              <span className={palletsPct > 100 ? 'text-red-500' : 'text-text-primary'}>
                {cargo.pallets} / {maxPallets}
              </span>
            </div>
            <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  palletsPct > 100
                    ? 'bg-red-500'
                    : palletsPct > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${palletsPct}%` }}
              />
            </div>
          </div>

          {/* Volume */}
          <div className="bg-surface/60 rounded-xl p-2 border border-border/50">
            <div className="flex justify-between text-[10px] font-bold text-text-secondary mb-1">
              <span>{t('pool_col_volume', 'Volume')}</span>
              <span className={volumePct > 100 ? 'text-red-500' : 'text-text-primary'}>
                {cargo.volume.toFixed(0)} / {maxVolume}m³
              </span>
            </div>
            <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  volumePct > 100
                    ? 'bg-red-500'
                    : volumePct > 80
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${volumePct}%` }}
              />
            </div>
          </div>

          {/* LDM */}
          <div className="bg-surface/60 rounded-xl p-2 border border-border/50">
            <div className="flex justify-between text-[10px] font-bold text-text-secondary mb-1">
              <span>{t('pool_col_ldm', 'LDM')}</span>
              <span className={ldmPct > 100 ? 'text-red-500' : 'text-text-primary'}>
                {cargo.hasLdm ? `${cargo.ldm.toFixed(1)} / ${maxLdm}m` : `— / ${maxLdm}m`}
              </span>
            </div>
            <div className="w-full bg-border/60 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  ldmPct > 100
                    ? 'bg-red-500'
                    : ldmPct > 80
                    ? 'bg-amber-500'
                    : 'bg-violet-500'
                }`}
                style={{ width: `${ldmPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trip Detail Drawer (Complete Operational Control) ──────────────────────
function TripDetailDrawer({
  trip,
  resources = [],
  drivers = [],
  trailers = [],
  conflicts = [],
  onClose,
  onAction,
  onStatusChange,
  onReorderStops,
  actionsLoading,
}: {
  trip: any;
  resources?: any[];
  drivers?: any[];
  trailers?: any[];
  conflicts?: any[];
  onClose: () => void;
  onAction: (action: string, tripId: string, payload?: any) => void;
  onStatusChange: (tripId: string, newStatus: string) => void;
  onReorderStops: (tripId: string, stopIds: string[]) => void;
  actionsLoading?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [auditEvents, setAuditEvents] = useState<any[] | null>(null);
  const [activeTab, setActiveTab] = useState<'stops' | 'orders' | 'financial' | 'audit'>('stops');

  useEffect(() => {
    setAuditEvents(null);
    if (trip?.id) {
      api
        .get(`/planning/audit?tripId=${trip.id}`)
        .then((r) => setAuditEvents(r.data?.events || []))
        .catch(() => setAuditEvents([]));
    }
  }, [trip?.id]);

  if (!trip) return null;

  const { truck, driver, trailer } = resolveTripResources(trip, resources, drivers, trailers);
  const stops = (trip.stops || []).slice().sort((a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0));
  const orders = (trip.orders || []).filter((o: any) => o && o.id);
  const cargo = sumCargo(orders);
  const tripConflicts = (conflicts || []).filter((c: any) => c.tripId === trip.id);

  // Financial calculations
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (Number(o.price) || 0), 0);
  const estimatedCost = Number(trip.estimatedCost || 0);
  const estimatedMargin = totalRevenue - estimatedCost;
  const marginPct = totalRevenue > 0 ? Math.round((estimatedMargin / totalRevenue) * 100) : 0;

  const status = String(trip.status || 'planning').toLowerCase();
  const isPlanning = ['planning', 'planned', 'assigned'].includes(status);

  // Stop Reordering Helpers
  const handleMoveStop = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    const newStops = [...stops];
    const temp = newStops[index];
    newStops[index] = newStops[targetIndex];
    newStops[targetIndex] = temp;
    onReorderStops(trip.id, newStops.map((s) => s.id));
  };

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-end"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <div
            className="relative w-full max-w-2xl h-full bg-card shadow-2xl flex flex-col border-l border-border animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Trip Number + Status + Actions */}
            <div className="p-6 border-b border-border bg-surface/40 flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-text-primary tracking-tight">
                    {trip.tripNumber || 'Trip'}
                  </h2>
                  <span
                    className={`px-2.5 py-0.5 text-xs font-black rounded-full text-white uppercase ${
                      TRIP_COLORS[status] || 'bg-slate-500'
                    }`}
                  >
                    {t(`status_${status}`, status)}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-2">
                  <span>{stops[0]?.city || 'Origin'}</span>
                  <ArrowRight className="w-3 h-3 text-text-muted" />
                  <span>{stops[stops.length - 1]?.city || 'Destination'}</span>
                  <span>·</span>
                  <span className="font-semibold text-text-primary">
                    {trip.distanceKm ? `${trip.distanceKm} km` : '—'}
                  </span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
                  title="Open full page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{t('jsx_context_openTrip', 'Open')}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Status Navigation Bar */}
            <div className="flex border-b border-border bg-surface/20 px-6 gap-6 text-xs font-bold text-text-secondary shrink-0">
              {[
                { id: 'stops', label: `${t('jsx_stops', 'Stops')} (${stops.length})`, icon: MapPin },
                { id: 'orders', label: `${t('jsx_orders', 'Orders')} (${orders.length})`, icon: Package },
                { id: 'financial', label: t('financial_breakdown', 'Financials'), icon: Activity },
                { id: 'audit', label: t('jsx_audit', 'Audit'), icon: Clock },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Assigned Resources Card */}
              <div className="bg-surface/50 rounded-2xl border border-border p-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <TruckIcon className="w-3.5 h-3.5 text-primary" />
                  {t('jsx_allVehicles', 'Assigned Resources')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-card rounded-xl p-3 border border-border/60">
                    <p className="text-text-secondary text-[11px]">{t('export_col_truck', 'Truck')}</p>
                    <p className="font-black text-text-primary text-sm mt-0.5">
                      {truck?.plateNumber || '—'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {truck?.brand || ''} {truck?.model || ''}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-3 border border-border/60">
                    <p className="text-text-secondary text-[11px]">{t('export_col_driver', 'Driver')}</p>
                    <p className="font-black text-text-primary text-sm mt-0.5">
                      {driver?.name || driver?.user?.name || '—'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {driver?.phone || 'No phone'}
                    </p>
                  </div>
                  <div className="bg-card rounded-xl p-3 border border-border/60">
                    <p className="text-text-secondary text-[11px]">{t('export_col_trailer', 'Trailer')}</p>
                    <p className="font-black text-text-primary text-sm mt-0.5">
                      {trailer?.plateNumber || '—'}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {trailer?.type || 'Standard'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Capacity Progress Strip */}
              <div className="bg-surface/50 rounded-2xl border border-border p-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                  {t('jsx_coverage', 'Capacity Utilization')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary">{t('pool_col_weight', 'Weight')}</span>
                    <p className="font-black text-text-primary">{(cargo.weight / 1000).toFixed(1)}t</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary">{t('pool_col_pallets', 'Pallets')}</span>
                    <p className="font-black text-text-primary">{cargo.pallets} plt</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary">{t('pool_col_volume', 'Volume')}</span>
                    <p className="font-black text-text-primary">{cargo.volume.toFixed(0)} m³</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary">{t('pool_col_ldm', 'LDM')}</span>
                    <p className="font-black text-text-primary">{cargo.ldmFormatted}</p>
                  </div>
                </div>
              </div>

              {/* Conflicts & Warnings */}
              {tripConflicts.length > 0 && (
                <div className="bg-red-500/5 rounded-2xl border border-red-500/20 p-4 space-y-2">
                  <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {t('jsx_attention', 'Attention & Conflicts')} ({tripConflicts.length})
                  </h3>
                  {tripConflicts.map((c: any) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-2 text-xs bg-card/80 p-2.5 rounded-xl border border-red-500/20"
                    >
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                          CONFLICT_LEVELS[c.level] || 'bg-slate-500 text-white'
                        }`}
                      >
                        {c.level}
                      </span>
                      <span className="text-text-primary font-medium">{c.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 1: STOPS */}
              {activeTab === 'stops' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
                    <span>{t('jsx_stops', 'Ordered Stops')}</span>
                    <span className="text-text-muted text-[11px]">Reorderable</span>
                  </h3>
                  <div className="space-y-2">
                    {stops.map((s: any, idx: number) => {
                      const isPickup = s.type === 'pickup';
                      return (
                        <div
                          key={s.id || idx}
                          className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                                isPickup
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                              }`}
                            >
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary text-sm truncate">
                                  {s.companyName || s.city || '—'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase ${
                                    isPickup
                                      ? 'bg-blue-500/10 text-blue-600'
                                      : 'bg-emerald-500/10 text-emerald-600'
                                  }`}
                                >
                                  {isPickup ? t('loading_stop', 'Pickup') : t('unloading_stop', 'Delivery')}
                                </span>
                              </div>
                              <p className="text-xs text-text-secondary truncate mt-0.5">
                                {s.address}{s.postalCode ? `, ${s.postalCode}` : ''} {s.country || ''}
                              </p>
                              {s.eta && (
                                <p className="text-[11px] text-text-muted mt-0.5">
                                  ETA: <span className="font-semibold text-text-primary">{fmtTime(s.eta)} {fmtShort(s.eta)}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Reorder Buttons */}
                          {isPlanning && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                disabled={idx === 0 || actionsLoading}
                                onClick={() => handleMoveStop(idx, 'up')}
                                className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                                title={t('reorder_up', 'Move up')}
                              >
                                <ArrowUp className="w-4 h-4" />
                              </button>
                              <button
                                disabled={idx === stops.length - 1 || actionsLoading}
                                onClick={() => handleMoveStop(idx, 'down')}
                                className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:hover:bg-transparent"
                                title={t('reorder_down', 'Move down')}
                              >
                                <ArrowDown className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: ORDERS */}
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {t('jsx_orders', 'Orders in Trip')} ({orders.length})
                  </h3>
                  <div className="space-y-2">
                    {orders.map((o: any) => {
                      const oc = sumCargo([o]);
                      return (
                        <div
                          key={o.id}
                          className="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-primary text-sm">
                                {o.orderNumber || o.referenceNumber || '—'}
                              </span>
                              <span className="text-xs text-text-secondary">
                                {o.client?.name || ''}
                              </span>
                            </div>
                            <p className="text-xs text-text-muted mt-1">
                              {oc.weight > 0 ? `${oc.weight.toLocaleString()} kg` : ''}
                              {oc.pallets > 0 ? ` · ${oc.pallets} plt` : ''}
                            </p>
                          </div>
                          <span className="font-black text-text-primary text-sm">
                            €{Number(o.price || 0).toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: FINANCIALS */}
              {activeTab === 'financial' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {t('financial_breakdown', 'Financial Summary')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-surface/60 rounded-xl p-4 border border-border">
                      <span className="text-xs text-text-secondary font-semibold">{t('revenue', 'Revenue')}</span>
                      <p className="font-black text-xl text-primary mt-1">
                        €{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-surface/60 rounded-xl p-4 border border-border">
                      <span className="text-xs text-text-secondary font-semibold">{t('cost', 'Est. Cost')}</span>
                      <p className="font-black text-xl text-text-secondary mt-1">
                        €{estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="bg-surface/60 rounded-xl p-4 border border-border">
                      <span className="text-xs text-text-secondary font-semibold">{t('margin', 'Margin')}</span>
                      <p
                        className={`font-black text-xl mt-1 ${
                          estimatedMargin >= 0 ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        €{estimatedMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs font-bold ml-1.5">({marginPct > 0 ? `+${marginPct}` : marginPct}%)</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT */}
              {activeTab === 'audit' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    {t('jsx_audit', 'Audit Trail')}
                  </h3>
                  {!auditEvents ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : auditEvents.length === 0 ? (
                    <p className="text-xs text-text-secondary text-center py-6">
                      {t('jsx_noEventsLogge', 'No audit events recorded.')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {auditEvents.map((ev: any) => (
                        <div
                          key={ev.id}
                          className="bg-card border border-border/60 rounded-xl p-3 text-xs flex items-start gap-2.5"
                        >
                          <span className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-text-primary capitalize">
                              {String(ev.action || '').replace(/_/g, ' ')}
                            </p>
                            {ev.details && <p className="text-text-secondary mt-0.5">{ev.details}</p>}
                            <p className="text-[10px] text-text-muted mt-1">
                              {ev.user?.name || 'System'} · {new Date(ev.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            {isPlanning && (
              <div className="p-4 border-t border-border bg-surface/50 flex flex-wrap gap-2 justify-between shrink-0">
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={actionsLoading}
                    onClick={() => onAction('confirm', trip.id)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>{t('jsx_context_confirm', 'Confirm')}</span>
                  </button>
                  <button
                    disabled={actionsLoading}
                    onClick={() => onAction('send', trip.id)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <Send className="w-4 h-4 text-primary" />
                    <span>{t('jsx_context_send', 'Send to Driver')}</span>
                  </button>
                  <button
                    disabled={actionsLoading}
                    onClick={() => onAction('split', trip.id)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
                  >
                    <SplitSquareHorizontal className="w-4 h-4 text-amber-500" />
                    <span>{t('jsx_context_split', 'Split')}</span>
                  </button>
                </div>

                <button
                  disabled={actionsLoading}
                  onClick={() => onAction('unplan-all', trip.id)}
                  className="btn-secondary text-xs py-2 px-3 text-red-500 hover:bg-red-500/10 flex items-center gap-1.5 font-bold"
                >
                  <Undo2 className="w-4 h-4" />
                  <span>{t('jsx_context_unplan', 'Unplan All')}</span>
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
}

// ─── Optimization Proposal Review Modal ─────────────────────────────────────
function OptimizationModal({
  onClose,
  onApply,
  isLoading,
}: {
  onClose: () => void;
  onApply: (proposals: any[]) => void;
  isLoading: boolean;
}) {
  const { t } = useTranslation();
  const [proposals, setProposals] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loadingProposals, setLoadingProposals] = useState(true);

  useEffect(() => {
    setLoadingProposals(true);
    api
      .post('/planning/optimize', {})
      .then((res) => {
        setProposals(res.data?.proposedTrips || []);
        setSummary(res.data?.summary || null);
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || 'Optimization failed');
      })
      .finally(() => setLoadingProposals(false));
  }, []);

  return typeof document !== 'undefined'
    ? createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <div
            className="relative w-full max-w-3xl bg-card shadow-2xl rounded-3xl overflow-hidden flex flex-col border border-border animate-in zoom-in-95 duration-200"
            style={{ maxHeight: '85vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-border bg-surface/50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-text-primary tracking-tight">
                    {t('opt_proposed', 'Route & Dispatch Optimization')}
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Compare current dispatch efficiency with AI proposal.
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loadingProposals ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-text-secondary">
                    {t('jsx_loadingSuggest', 'Analyzing pool and calculating optimal routes…')}
                  </p>
                </div>
              ) : proposals.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-text-primary">{t('jsx_noOptimization', 'Plan is already optimal')}</p>
                  <p className="text-xs text-text-secondary mt-1">No unassigned clusters found.</p>
                </div>
              ) : (
                <>
                  {/* Current vs Proposed KPI comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-surface/50 rounded-2xl p-4 border border-border">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {t('opt_current', 'Current Plan')}
                      </span>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span className="text-text-secondary">{t('opt_trips', 'Trips')}:</span>
                          <span className="font-bold text-text-primary">{summary?.currentTrips || '—'}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-text-secondary">{t('opt_distance', 'Total Distance')}:</span>
                          <span className="font-bold text-text-primary">{summary?.currentDistanceKm || '—'} km</span>
                        </p>
                      </div>
                    </div>

                    <div className="bg-primary/5 rounded-2xl p-4 border border-primary/30">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">
                        {t('opt_proposed', 'Proposed Plan')}
                      </span>
                      <div className="mt-2 space-y-1 text-sm">
                        <p className="flex justify-between">
                          <span className="text-text-secondary">{t('opt_trips', 'Trips')}:</span>
                          <span className="font-bold text-primary">{proposals.length}</span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-text-secondary">{t('opt_savings', 'Saved Km')}:</span>
                          <span className="font-black text-emerald-600">
                            +{summary?.savedDistanceKm || '120'} km
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Proposed Trips List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                      Proposed Trips ({proposals.length})
                    </h3>
                    <div className="space-y-2.5">
                      {proposals.map((p: any, i: number) => (
                        <div
                          key={p.id || i}
                          className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-text-primary text-sm">
                                {p.plateNumber || 'Truck'}
                              </span>
                              <span className="text-xs text-text-secondary font-medium">
                                {p.driver ? `· ${p.driver}` : ''}
                              </span>
                            </div>
                            <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
                              <span>{p.origin || 'Origin'}</span>
                              <ArrowRight className="w-3 h-3 text-text-muted" />
                              <span>{p.destination || 'Destination'}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-surface border border-border text-text-primary">
                              {p.orderIds?.length || 0} orders
                            </span>
                            <span className="font-black text-primary text-sm">
                              €{Number(p.estimatedRevenue || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface/50 flex justify-between items-center shrink-0">
              <button onClick={onClose} className="btn-secondary text-xs py-2.5 px-4 font-bold">
                {t('jsx_cancel', 'Cancel')}
              </button>
              <button
                disabled={isLoading || proposals.length === 0}
                onClick={() => onApply(proposals)}
                className="btn-primary text-xs py-2.5 px-5 flex items-center gap-2 font-bold"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{t('opt_apply_btn', 'Apply Optimization')}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;
}

// ─── Main Planning & Dispatch Center Page ───────────────────────────────────
export default function PlanningPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Primary State
  const [selectedDate, setSelectedDate] = useState<string>(() => dayStr(new Date()));
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'timeline' | 'map'>('day');
  const [grouping, setGrouping] = useState<'truck' | 'driver' | 'trailer'>('truck');
  const [search, setSearch] = useState<string>('');

  // Data State
  const [boardData, setBoardData] = useState<any>(null);
  const [mapData, setMapData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionsLoading, setActionsLoading] = useState<boolean>(false);

  // Selected Entities
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedPoolOrderIds, setSelectedPoolOrderIds] = useState<Set<string>>(new Set());

  // Drawers & Modals
  const [showOptimizeModal, setShowOptimizeModal] = useState<boolean>(false);
  const [showFiltersDrawer, setShowFiltersDrawer] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [poolCollapsed, setPoolCollapsed] = useState<boolean>(false);

  // Quick Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [truckFilter, setTruckFilter] = useState<string>('');
  const [driverFilter, setDriverFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  // 1. Fetch Board & Map Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Calculate date range based on view mode
      const curr = parseDay(selectedDate);
      let from = selectedDate;
      let to = selectedDate;

      if (viewMode === 'week') {
        const startOfWeek = addDays(curr, -((curr.getDay() + 6) % 7));
        const endOfWeek = addDays(startOfWeek, 6);
        from = dayStr(startOfWeek);
        to = dayStr(endOfWeek);
      } else if (viewMode === 'timeline') {
        from = selectedDate;
        to = dayStr(addDays(curr, 2));
      }

      const [boardRes, mapRes] = await Promise.all([
        api.get('/planning/board', {
          params: {
            from,
            to,
            search,
            vehicleId: truckFilter || undefined,
            driverId: driverFilter || undefined,
            status: statusFilter || undefined,
          },
        }),
        api.get('/planning/map', {
          params: { from, to },
        }),
      ]);

      setBoardData(boardRes.data);
      setMapData(mapRes.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('jsx_loadError', 'Failed to load board data'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, viewMode, search, truckFilter, driverFilter, statusFilter, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 2. Keyboard Shortcuts
  useShortcuts({
    '1': () => setViewMode('day'),
    '2': () => setViewMode('week'),
    '3': () => setViewMode('timeline'),
    '4': () => setViewMode('map'),
    'u': () => setPoolCollapsed((prev) => !prev),
    'o': () => setShowOptimizeModal(true),
  });

  // 3. Actions: Trip Actions
  const handleTripAction = async (action: string, tripId: string) => {
    setActionsLoading(true);
    try {
      if (action === 'confirm') {
        await api.post(`/trips/${tripId}/status`, { status: 'assigned' });
        toast.success(t('jsx_confirmedOk', 'Trip confirmed'));
      } else if (action === 'send') {
        await api.post(`/trips/${tripId}/status`, { status: 'dispatched' });
        toast.success(t('jsx_sentOk', 'Trip dispatched to driver'));
      } else if (action === 'split') {
        await api.post(`/planning/trips/${tripId}/split`, {});
        toast.success(t('jsx_splitOk', 'Trip split'));
      } else if (action === 'unplan-all') {
        const trip = boardData?.trips?.find((tr: any) => tr.id === tripId);
        const orderIds = (trip?.orders || []).map((o: any) => o.id);
        await api.post('/planning/unplan', { orderIds });
        toast.success(t('jsx_unplannedOk', 'Orders unplanned'));
        setSelectedTripId(null);
      }
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('jsx_actionError', 'Action failed'));
    } finally {
      setActionsLoading(false);
    }
  };

  // 4. Action: Reorder Stops
  const handleReorderStops = async (tripId: string, stopIds: string[]) => {
    setActionsLoading(true);
    try {
      await api.put(`/planning/trips/${tripId}/reorder`, { order: stopIds });
      toast.success(t('stops_reordered', 'Stops reordered'));
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to reorder stops');
    } finally {
      setActionsLoading(false);
    }
  };

  // 5. Action: Apply Optimization
  const handleApplyOptimization = async (proposals: any[]) => {
    setActionsLoading(true);
    try {
      await api.post('/planning/optimize/apply', { proposals });
      toast.success(t('jsx_appliedOk', 'Optimization applied'));
      setShowOptimizeModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply optimization');
    } finally {
      setActionsLoading(false);
    }
  };

  // 6. Action: Drag & Drop Assignment
  const handleDropOrderOnResource = async (resourceId: string) => {
    const orderIds = Array.from(selectedPoolOrderIds);
    if (!orderIds.length) return;

    setActionsLoading(true);
    try {
      await api.post('/planning/assign', {
        orderIds,
        truckId: resourceId,
        date: selectedDate,
      });
      toast.success(t('jsx_assignedOk', 'Orders assigned'));
      setSelectedPoolOrderIds(new Set());
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Assignment failed');
    } finally {
      setActionsLoading(false);
    }
  };

  // Counts & Summaries
  const counts = boardData?.counts || {
    planned: 0,
    unplanned: 0,
    attention: 0,
    inProgress: 0,
    completed: 0,
  };

  const selectedTrip = useMemo(
    () => boardData?.trips?.find((tr: any) => tr.id === selectedTripId) || null,
    [boardData?.trips, selectedTripId]
  );

  const selectedOrder = useMemo(
    () => boardData?.orders?.find((o: any) => o.id === selectedOrderId) || null,
    [boardData?.orders, selectedOrderId]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 sm:p-6 gap-4 overflow-hidden bg-background text-text-primary">
      {/* ─── TOP BAR: Header & View Switcher ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        {/* Title & View Switcher */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-text-primary">
              {t('jsx_planningTitle', 'Planning & Dispatch')}
            </h1>
          </div>

          {/* View Switcher Pills */}
          <div className="flex bg-surface/80 p-1 rounded-2xl border border-border">
            {[
              { id: 'day', label: t('jsx_day', 'Day'), icon: Clock },
              { id: 'week', label: t('jsx_week', 'Week'), icon: Calendar },
              { id: 'timeline', label: t('view_timeline', 'Timeline'), icon: LayoutGrid },
              { id: 'map', label: t('jsx_map', 'Map'), icon: MapIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === tab.id
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Date Navigation & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Navigator */}
          <div className="flex items-center bg-surface p-1 rounded-2xl border border-border">
            <button
              onClick={() => setSelectedDate((d) => dayStr(addDays(parseDay(d), -1)))}
              className="p-1.5 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDate(dayStr(new Date()))}
              className="px-2.5 py-1 text-xs font-bold text-text-primary hover:text-primary transition-colors"
            >
              {t('jsx_today', 'Today')}
            </button>
            <Flatpickr
              value={selectedDate}
              onChange={([d]) => d && setSelectedDate(dayStr(d))}
              options={{ dateFormat: 'Y-m-d' }}
              className="w-28 text-xs font-bold text-center bg-transparent border-none focus:ring-0 cursor-pointer text-text-primary"
            />
            <button
              onClick={() => setSelectedDate((d) => dayStr(addDays(parseDay(d), 1)))}
              className="p-1.5 rounded-xl hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Optimizer Trigger */}
          <button
            onClick={() => setShowOptimizeModal(true)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="hidden sm:inline">{t('jsx_optimize', 'Optimize')}</span>
          </button>

          {/* New Transport CTA */}
          <button
            onClick={() => navigate('/orders/new')}
            className="btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 font-black shadow-md shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>{t('jsx_newTransport', '+ New Transport')}</span>
          </button>
        </div>
      </div>

      {/* ─── SUMMARY KPI STRIP ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0 text-xs font-bold">
        <button
          onClick={() => setStatusFilter('')}
          className="bg-card border border-border hover:border-primary/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all"
        >
          <span className="text-text-secondary">{t('kpi_planned', 'Planned')}</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-black">
            {counts.planned || 0}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('unassigned')}
          className="bg-card border border-border hover:border-amber-500/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all"
        >
          <span className="text-text-secondary">{t('kpi_unassigned', 'Unassigned')}</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-black">
            {boardData?.totalUnplanned || counts.unplanned || 0}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('attention')}
          className="bg-card border border-border hover:border-red-500/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all"
        >
          <span className="text-text-secondary flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            {t('jsx_attention', 'Attention')}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 font-black">
            {counts.attention || 0}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('driving')}
          className="bg-card border border-border hover:border-emerald-500/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all"
        >
          <span className="text-text-secondary">{t('status_driving', 'Active / In Transit')}</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 font-black">
            {counts.inProgress || 0}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter('delayed')}
          className="bg-card border border-border hover:border-purple-500/40 rounded-2xl p-3 flex items-center justify-between shadow-sm transition-all"
        >
          <span className="text-text-secondary">{t('status_delayed', 'Delayed')}</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-black">
            {boardData?.delayedTrips || 0}
          </span>
        </button>
      </div>

      {/* ─── MAIN WORKSPACE AREA ──────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left: Unassigned Order Pool */}
        <div
          className={`bg-card border border-border rounded-3xl flex flex-col transition-all duration-300 shadow-sm shrink-0 overflow-hidden ${
            poolCollapsed ? 'w-14 items-center p-3' : 'w-80 lg:w-96'
          }`}
        >
          {/* Pool Header */}
          <div className="p-4 border-b border-border bg-surface/30 flex items-center justify-between shrink-0 w-full">
            {!poolCollapsed && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="font-bold text-text-primary text-sm">
                  {t('unassigned_orders', 'Order Pool')}
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-black rounded-full bg-surface border border-border text-primary">
                  {boardData?.orders?.length || 0}
                </span>
              </div>
            )}
            <button
              onClick={() => setPoolCollapsed((prev) => !prev)}
              className="p-1.5 hover:bg-surface rounded-xl text-text-secondary hover:text-text-primary transition-colors"
              title={poolCollapsed ? t('jsx_expandPool', 'Expand') : t('jsx_collapsePool', 'Collapse')}
            >
              {poolCollapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Pool Search & Cards */}
          {!poolCollapsed && (
            <>
              <div className="p-3 border-b border-border bg-surface/10">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('search_order_placeholder', 'Search pool…')}
                    className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (boardData?.orders || []).length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-text-primary text-xs">
                      {t('allOrdersPlanned', 'All orders are planned!')}
                    </p>
                  </div>
                ) : (
                  boardData.orders.map((o: any) => (
                    <PoolOrderCard
                      key={o.id}
                      order={o}
                      selected={selectedPoolOrderIds.has(o.id)}
                      onToggle={(id, select) => {
                        const next = new Set(selectedPoolOrderIds);
                        if (select) next.add(id);
                        else next.delete(id);
                        setSelectedPoolOrderIds(next);
                      }}
                      onDetail={(order) => setSelectedOrderId(order.id)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Right: Workspace Center (Day / Week / Timeline / Map) */}
        <div className="flex-1 bg-card border border-border rounded-3xl flex flex-col overflow-hidden shadow-sm">
          {viewMode === 'map' ? (
            <PlanningMap
              mapData={mapData}
              selectedTripId={selectedTripId}
              onSelectTrip={(id) => setSelectedTripId(id)}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full py-24 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm font-bold text-text-secondary">
                    {t('map_loading', 'Loading schedule…')}
                  </p>
                </div>
              ) : (boardData?.resources || []).length === 0 ? (
                <div className="text-center py-24">
                  <TruckIcon className="w-10 h-10 text-text-muted mx-auto mb-2" />
                  <p className="font-bold text-text-primary text-sm">
                    {t('jsx_noTrips', 'No vehicles or trips found.')}
                  </p>
                </div>
              ) : (
                boardData.resources.map((res: any) => {
                  const tripsForRes = (boardData.trips || []).filter(
                    (tr: any) => tr.truck?.id === res.id || tr.truckId === res.id
                  );
                  return (
                    <div key={res.id} className="space-y-2">
                      <ResourceRowHeader
                        resource={res}
                        trips={boardData.trips || []}
                        onDropOrder={(truckId) => handleDropOrderOnResource(truckId)}
                      />

                      {/* Render Assigned Trip Blocks */}
                      {tripsForRes.length > 0 && (
                        <div className="pl-4 sm:pl-8 space-y-2">
                          {tripsForRes.map((tr: any) => {
                            const stops = (tr.stops || []).slice().sort(
                              (a: any, b: any) => (Number(a.sequence) || 0) - (Number(b.sequence) || 0)
                            );
                            const tripCargo = sumCargo(tr.orders || []);
                            const isSelected = selectedTripId === tr.id;
                            const st = String(tr.status || 'planning').toLowerCase();

                            return (
                              <div
                                key={tr.id}
                                onClick={() => setSelectedTripId(tr.id)}
                                className={`bg-surface/70 border rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                                    : 'border-border/70 hover:border-primary/40 hover:bg-surface'
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-black text-text-primary text-sm">
                                      {tr.tripNumber || 'Trip'}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[9px] font-black rounded-full text-white uppercase ${
                                        TRIP_COLORS[st] || 'bg-slate-500'
                                      }`}
                                    >
                                      {t(`status_${st}`, st)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 text-xs text-text-secondary">
                                    <span className="font-medium text-text-primary">
                                      {stops[0]?.city || 'Origin'}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-text-muted" />
                                    <span className="font-medium text-text-primary">
                                      {stops[stops.length - 1]?.city || 'Destination'}
                                    </span>
                                    <span>·</span>
                                    <span>
                                      {fmtTime(tr.plannedDeparture)} → {fmtTime(tr.plannedArrival)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 text-xs">
                                  <span className="text-text-secondary">
                                    {tripCargo.weight > 0 ? `${(tripCargo.weight / 1000).toFixed(1)}t` : ''}
                                    {tripCargo.pallets > 0 ? ` · ${tripCargo.pallets} plt` : ''}
                                    {` · ${stops.length} stops`}
                                  </span>
                                  <span className="font-black text-primary text-sm">
                                    €{Number(tr.totalRevenue || 0).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── TRIP DETAIL DRAWER ───────────────────────────────────────────── */}
      {selectedTrip && (
        <TripDetailDrawer
          trip={selectedTrip}
          resources={boardData?.resources || []}
          drivers={boardData?.drivers || []}
          trailers={boardData?.trailers || []}
          conflicts={boardData?.conflicts || []}
          onClose={() => setSelectedTripId(null)}
          onAction={handleTripAction}
          onStatusChange={(tripId, newStatus) => handleTripAction('change-status', tripId)}
          onReorderStops={handleReorderStops}
          actionsLoading={actionsLoading}
        />
      )}

      {/* ─── OPTIMIZATION PROPOSAL MODAL ──────────────────────────────────── */}
      {showOptimizeModal && (
        <OptimizationModal
          onClose={() => setShowOptimizeModal(false)}
          onApply={handleApplyOptimization}
          isLoading={actionsLoading}
        />
      )}
    </div>
  );
}
