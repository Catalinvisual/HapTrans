import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import {
  Truck as TruckIcon, Package, Loader2, MapPin, AlertTriangle, X, Calendar, ArrowUp, ArrowDown,
  Lock, Unlock, RotateCcw, RefreshCw, Sparkles, Save, ChevronLeft, Scale, Ruler, Box, Layers,
  CheckCircle2, Info, Route as RouteIcon, ClipboardList, Timer, GripVertical, GripHorizontal,
  ShieldAlert, CircleCheck, CircleSlash, ArrowRight, Navigation, Layers as LayersIcon,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { planningApi } from '../lib/planningApi';

const FEASIBILITY_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  feasible: { bg: 'bg-emerald-500/15 border-emerald-500/40', text: 'text-emerald-600', label: 'pln_feasible' },
  warning: { bg: 'bg-amber-500/15 border-amber-500/40', text: 'text-amber-600', label: 'pln_warning' },
  conflict: { bg: 'bg-red-500/15 border-red-500/40', text: 'text-red-600', label: 'pln_conflict' },
  no_solution: { bg: 'bg-red-500/15 border-red-500/40', text: 'text-red-600', label: 'pln_no_solution' },
};

function fmtDate(d: string | Date | null | undefined, t: (k: string, fb: string) => string) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function LoadBar({ label, value, max, icon: Icon, color }: { label: string; value: number; max: number; icon: any; color: string }) {
  const numVal = Number(value) || 0;
  const numMax = Number(max) || 1;
  const pct = numMax > 0 ? Math.min(100, (numVal / numMax) * 100) : 0;
  const over = numMax > 0 && numVal > numMax;
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${over ? 'text-red-500' : 'text-text-muted'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-[10px] mb-0.5">
          <span className="font-bold text-text-secondary uppercase tracking-wide">{label}</span>
          <span className={over ? 'text-red-500 font-black' : 'text-text-secondary'}>
            {Math.round(numVal).toLocaleString()} / {Math.round(numMax).toLocaleString()}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${over ? 'bg-red-500' : color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default function TruckRoutePlannerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { truckId = '' } = useParams<{ truckId: string }>();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryTrip = searchParams.get('trip');
  const [date, setDate] = useState<string>(queryDate || new Date().toISOString().split('T')[0]);

  const [routePlan, setRoutePlan] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [proposedPlan, setProposedPlan] = useState<any>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const sortedStops = useMemo(() => {
    return [...(routePlan?.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
  }, [routePlan]);

  const loadPlan = async (d: string, silent = false) => {
    if (!truckId) return;
    if (!silent) setLoading(true);
    try {
      let plan = await planningApi.getRoutePlan(truckId, d);
      if (!plan && queryTrip) {
        plan = await planningApi.createRoutePlanFromTrip(truckId, queryTrip);
      }
      setRoutePlan(plan);
      setDirty(false);
      setProposedPlan(null);
      setShowProposal(false);
      setValidationResult(null);
      if (plan && plan.optimizationMetadata?.profileId) {
        setSelectedProfile(plan.optimizationMetadata.profileId);
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setRoutePlan(null);
      } else {
        toast.error(err?.response?.data?.message || t('pln_load_error', 'Failed to load route plan'));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProfiles = useCallback(async () => {
    try {
      const profs = await planningApi.getProfiles();
      setProfiles(profs || []);
      if (profs?.length && !selectedProfile) setSelectedProfile(profs[0].id);
    } catch {
      // profiles are optional
    }
  }, [selectedProfile]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { loadPlan(date); }, [truckId, date]);

  // Map init
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [18.5, 47], zoom: 6, attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    map.on('load', () => {
      setMapReady(true);
      map.resize();
    });
    mapInstance.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapRef.current) resizeObserver.observe(mapRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Draw stops + route
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady) return;
    map.resize();
    markersRef.current.forEach(m => { try { m.remove(); } catch {} });
    markersRef.current = [];
    try { if (map.getLayer('plan-routes')) map.removeLayer('plan-routes'); if (map.getSource('plan-routes')) map.removeSource('plan-routes'); } catch {}

    const stopsWithCoords = sortedStops.filter((s: any) => s.latitude && s.longitude);
    const bounds = new maplibregl.LngLatBounds();

    if (stopsWithCoords.length >= 2) {
      const coords = stopsWithCoords.map((s: any) => [Number(s.longitude), Number(s.latitude)]);
      coords.forEach((c: any) => bounds.extend(c));
      map.addSource('plan-routes', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: 'plan-routes', type: 'line', source: 'plan-routes',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#f97316', 'line-width': 4, 'line-opacity': 0.9 },
      });
    }

    for (const s of sortedStops) {
      if (!s.latitude || !s.longitude) continue;
      const lng = Number(s.longitude);
      const lat = Number(s.latitude);
      bounds.extend([lng, lat]);

      const isPickup = s.type === 'pickup';
      const el = document.createElement('div');
      el.className = `w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-[11px] font-black shadow-xl cursor-pointer transition-transform hover:scale-125 ${isPickup ? 'bg-blue-600' : 'bg-emerald-600'} ${s.locked ? 'ring-2 ring-amber-400' : ''}`;
      el.textContent = String(s.sequence || '·');

      const popupHtml = `
        <div style="padding: 6px; font-family: inherit;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: ${isPickup ? '#2563eb' : '#059669'}; margin-bottom: 2px;">
            ${isPickup ? 'PICKUP' : 'DELIVERY'} #${s.sequence}
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #1e293b; line-height: 1.2;">
            ${s.companyName || s.city || s.address}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${s.address ? s.address + ', ' : ''}${s.city || ''}
          </div>
          <div style="font-size: 11px; font-weight: 600; color: #334155; margin-top: 4px; border-top: 1px solid #e2e8f0; padding-top: 4px;">
            Cargo: ${Math.round(s.pallets || 0)} pal · ${Math.round(s.weightKg || 0)} kg
          </div>
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 15, closeButton: false }).setHTML(popupHtml);
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        setActiveStopId(s.id);
      });

      markersRef.current.push(marker);
    }

    if (stopsWithCoords.length) {
      try { map.fitBounds(bounds, { padding: 80, maxZoom: 13 }); } catch {}
    }
  }, [mapReady, sortedStops, t]);

  const fitRouteBounds = () => {
    const map = mapInstance.current;
    if (!map) return;
    const stopsWithCoords = sortedStops.filter((s: any) => s.latitude && s.longitude);
    if (!stopsWithCoords.length) return;
    const bounds = new maplibregl.LngLatBounds();
    stopsWithCoords.forEach((s: any) => bounds.extend([Number(s.longitude), Number(s.latitude)]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 13 });
  };

  const focusStop = (stop: any) => {
    if (!stop?.latitude || !stop?.longitude || !mapInstance.current) return;
    setActiveStopId(stop.id);
    mapInstance.current.flyTo({
      center: [Number(stop.longitude), Number(stop.latitude)],
      zoom: 11,
      essential: true,
    });
  };

  const handleOptimize = async () => {
    setActionLoading('optimize');
    try {
      const plan = await planningApi.optimizeRoutePlan(truckId, date, selectedProfile || undefined);
      setProposedPlan(plan);
      setShowProposal(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_optimize_error', 'Optimization failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleApplyOptimization = async () => {
    if (!proposedPlan) return;
    setActionLoading('apply');
    try {
      const plan = await planningApi.saveRoutePlan(truckId, proposedPlan, 'route_optimize_apply');
      setRoutePlan(plan);
      setProposedPlan(null);
      setShowProposal(false);
      setDirty(false);
      toast.success(t('pln_optimized_ok', 'Route optimized successfully'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_optimize_error', 'Optimization failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRecalculate = async () => {
    setActionLoading('recalculate');
    try {
      const plan = await planningApi.recalculateRoutePlan(truckId, date);
      setRoutePlan(plan);
      setDirty(false);
      toast.success(t('pln_recalculated_ok', 'Loads recalculated'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_recalculate_error', 'Recalculation failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    if (!confirm(t('pln_reset_confirm', 'Reset this route plan to its original trip sequence? This cannot be undone.'))) return;
    setActionLoading('reset');
    try {
      const plan = await planningApi.resetRoutePlan(truckId, date);
      setRoutePlan(plan);
      setProposedPlan(null);
      setShowProposal(false);
      setDirty(false);
      toast.success(t('pln_reset_ok', 'Route plan reset'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_reset_error', 'Reset failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async () => {
    if (!routePlan) return;
    setActionLoading('save');
    try {
      const plan = await planningApi.saveRoutePlan(truckId, routePlan, 'route_saved');
      setRoutePlan(plan);
      setDirty(false);
      toast.success(t('pln_saved_ok', 'Route plan saved'));
    } catch (err: any) {
      const msg = err?.response?.data;
      const message = typeof msg === 'string' ? msg : msg?.message || t('pln_save_error', 'Save failed');
      toast.error(message, { duration: 6000 });
      if (msg?.conflicts?.length) {
        setShowLoadPanel(true);
        setValidationResult({ conflicts: msg.conflicts, warnings: [], completeness: [] });
      }
    } finally {
      setActionLoading(null);
    }
  };

  // Validates that all pickups occur strictly before deliveries for the same order
  const validatePickupBeforeDelivery = (stopsList: any[]): boolean => {
    const byOrder = new Map<string, { pickupIdx: number; deliveryIdx: number }>();
    for (let i = 0; i < stopsList.length; i++) {
      const s = stopsList[i];
      const key = s.orderId || s.shipmentId;
      if (!key) continue;
      const entry = byOrder.get(key) || { pickupIdx: -1, deliveryIdx: -1 };
      if (s.type === 'pickup') entry.pickupIdx = i;
      else entry.deliveryIdx = i;
      byOrder.set(key, entry);
    }
    for (const [, { pickupIdx, deliveryIdx }] of byOrder) {
      if (pickupIdx >= 0 && deliveryIdx >= 0 && deliveryIdx < pickupIdx) {
        return false;
      }
    }
    return true;
  };

  // Reorder via a compute-only call (not persisted until Save)
  const applyReorder = async (ordered: any[]) => {
    if (!validatePickupBeforeDelivery(ordered)) {
      toast.error(t('pln_pickup_before_delivery', 'Delivery cannot be scheduled before pickup for the same order!'));
      return;
    }

    setRoutePlan((prev: any) => ({
      ...prev,
      stops: ordered.map((s: any, i: number) => ({ ...s, sequence: i + 1 })),
    }));
    try {
      const plan = await planningApi.reorderStops(truckId, date, ordered.map((s: any) => s.id));
      setRoutePlan(plan);
      setDirty(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_reorder_error', 'Reorder failed'));
    }
  };

  const handleMove = async (fromIdx: number, toIdx: number) => {
    if (!routePlan || toIdx < 0 || toIdx >= sortedStops.length) return;
    const next = [...sortedStops];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    await applyReorder(next);
  };

  const handleDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    setDragOverId(null);
    setDragId(null);
    const fromIdx = sortedStops.findIndex((s: any) => s.id === dragId);
    const toIdx = sortedStops.findIndex((s: any) => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = [...sortedStops];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    applyReorder(next);
  };

  const handleValidate = async () => {
    if (!routePlan) return;
    setActionLoading('validate');
    try {
      const res = await planningApi.validateRoutePlan(truckId, date);
      setValidationResult(res);
      setShowLoadPanel(true);
      const totalIssues = (res.conflicts?.length || 0) + (res.warnings?.length || 0) + (res.completeness?.length || 0);
      if (totalIssues === 0) {
        toast.success(t('pln_validate_clean', 'Route plan is valid and feasible!'));
      } else if (res.conflicts?.length) {
        toast.error(`${res.conflicts.length} conflict(s) found in route plan.`);
      } else {
        toast((t('pln_validate_warnings', 'Plan valid with warnings.')), { icon: '⚠️' });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_validate_error', 'Validation failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLock = async (stop: any, lockSequence = false) => {
    setActionLoading(stop.id);
    try {
      if (stop.locked) {
        await planningApi.unlockStop(stop.id, routePlan.id);
        toast.success(t('pln_unlocked', 'Stop unlocked'));
      } else {
        await planningApi.lockStop(stop.id, routePlan.id, lockSequence);
        toast.success(t('pln_locked', 'Stop locked in sequence'));
      }
      await loadPlan(date, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_lock_error', 'Lock action failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const metadata = routePlan?.optimizationMetadata || {};
  const before = metadata.before;
  const after = metadata.after;
  const feasibility = routePlan?.feasibilityStatus || 'feasible';
  const fsStyle = FEASIBILITY_STYLE[feasibility] || FEASIBILITY_STYLE.feasible;

  // Real capacity limits directly from truck / routePlan
  const cap = {
    maxPallets: Number(routePlan?.maxPallets) || Number(routePlan?.truck?.maxPallets) || 26,
    maxWeightKg: Number(routePlan?.maxWeightKg) || Number(routePlan?.truck?.maxWeightKg) || 24000,
    maxLdm: Number(routePlan?.maxLdm) || Number(routePlan?.truck?.maxLdm) || 13.6,
    maxVolumeCbm: Number(routePlan?.maxVolumeCbm) || Number(routePlan?.truck?.maxVolumeCbm) || 90,
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* ── Header ── */}
      <header className="shrink-0 px-4 py-3 border-b border-border bg-card flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/planning')} className="p-2 rounded-xl hover:bg-surface text-text-secondary hover:text-primary transition-colors" title={t('pln_back', 'Back to planning board')}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <TruckIcon className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-text-primary leading-tight truncate">
              {routePlan?.truck?.plateNumber || t('pln_planner', 'Truck Route & Load Planner')}
            </h1>
            <p className="text-xs text-text-secondary truncate">
              {routePlan?.driver?.user?.name || routePlan?.driver?.name || routePlan?.truck?.driver?.user?.name || routePlan?.truck?.driver?.name || t('pln_no_driver', 'No driver')} {routePlan?.trip?.tripNumber ? `· ${routePlan.trip.tripNumber}` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-1">
          {/* Modern Flatpickr Calendar */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
            <Calendar className="w-4 h-4 text-primary" />
            <Flatpickr
              value={date}
              onChange={([d]) => {
                if (d) {
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setDate(`${y}-${m}-${day}`);
                }
              }}
              options={{ dateFormat: 'd/m/Y', allowInput: false }}
              className="bg-transparent text-xs font-bold text-text-primary outline-none w-24 cursor-pointer"
            />
          </div>

          <span className={`px-2.5 py-1 rounded-lg border text-xs font-black uppercase ${fsStyle.bg} ${fsStyle.text}`}>
            {t(fsStyle.label, feasibility)}
          </span>
          {routePlan?.isOptimized && (
            <span className="px-2.5 py-1 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-600 text-xs font-black uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" />{t('pln_optimized', 'Optimized')}
            </span>
          )}
          {dirty && (
            <span className="px-2.5 py-1 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-600 text-xs font-black uppercase flex items-center gap-1">
              <CircleSlash className="w-3 h-3" />{t('pln_unsaved', 'Unsaved changes')}
            </span>
          )}
          {validationResult && (
            <button
              onClick={() => setShowLoadPanel(v => !v)}
              className="px-2.5 py-1 rounded-lg border border-red-500/40 bg-red-500/10 text-red-600 text-xs font-black uppercase flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3" />{(validationResult.conflicts?.length || 0) + (validationResult.warnings?.length || 0) + (validationResult.completeness?.length || 0)}
            </button>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowLoadPanel(v => !v)}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold"
            title={t('pln_load_panel', 'Loading sequence & load timeline')}
          >
            <Layers className="w-4 h-4" />{t('pln_load_plan', 'Load Plan')}
          </button>
          <button onClick={handleValidate} disabled={!!actionLoading || !routePlan} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold disabled:opacity-50" title={t('pln_validate_btn', 'Check plan for capacity, pickup/delivery order and data completeness')}>
            {actionLoading === 'validate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleCheck className="w-4 h-4" />}
            {t('pln_validate_btn', 'Validate')}
          </button>
          <button onClick={handleRecalculate} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold disabled:opacity-50">
            {actionLoading === 'recalculate' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {t('pln_recalc', 'Recalculate')}
          </button>
          <button onClick={handleReset} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold disabled:opacity-50">
            <RotateCcw className="w-4 h-4" />{t('pln_reset', 'Reset')}
          </button>
          <button onClick={handleSave} disabled={!!actionLoading || !routePlan} className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 font-bold disabled:opacity-50">
            <Save className="w-4 h-4" />{t('pln_save', 'Save')}
          </button>
          <button onClick={handleOptimize} disabled={!!actionLoading || !routePlan || sortedStops.length < 2} className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-black shadow shadow-primary/20 disabled:opacity-50">
            {actionLoading === 'optimize' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {t('pln_optimize', 'Optimize')}
          </button>
        </div>
      </header>

      {/* ── Capacity strip ── */}
      <div className="shrink-0 px-4 py-2.5 border-b border-border bg-surface/40 grid grid-cols-2 md:grid-cols-4 gap-3">
        <LoadBar label={t('pallets', 'Pallets')} value={routePlan?.peakPallets || 0} max={cap.maxPallets} icon={Box} color="bg-blue-500" />
        <LoadBar label={t('weight_kg', 'Weight')} value={routePlan?.peakWeightKg || 0} max={cap.maxWeightKg} icon={Scale} color="bg-emerald-500" />
        <LoadBar label={t('jsx_ldm', 'LDM')} value={routePlan?.peakLdm || 0} max={cap.maxLdm} icon={Ruler} color="bg-violet-500" />
        <LoadBar label={t('jsx_volume', 'Volume')} value={routePlan?.peakVolumeCbm || 0} max={cap.maxVolumeCbm} icon={Box} color="bg-amber-500" />
      </div>

      {/* ── Body ── */}
      <div className="flex-1 overflow-hidden flex">
        {/* Route sequence list */}
        <section className="w-full lg:w-96 xl:w-[28rem] shrink-0 border-r border-border bg-card flex flex-col">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between shrink-0">
            <h2 className="text-sm font-black text-text-primary flex items-center gap-2">
              <RouteIcon className="w-4 h-4 text-primary" />{t('pln_route_seq', 'Route Sequence')}
              <span className="text-[10px] font-bold text-text-muted">({sortedStops.length})</span>
            </h2>
            <span className="text-[11px] font-bold text-text-secondary">
              {t('pln_total_dist', 'Dist')}: <span className="text-text-primary font-black">{Math.round(routePlan?.totalDistanceKm || 0)} km</span> ·{' '}
              {t('pln_duration', 'Dur')}: <span className="text-text-primary font-black">{Math.round((routePlan?.totalDurationMinutes || 0) / 60)}h</span>
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-primary opacity-70" />
              </div>
            )}

            {!loading && !routePlan && (
              <div className="text-center py-16 px-4">
                <RouteIcon className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                <p className="font-bold text-text-primary text-sm">{t('pln_no_plan', 'No route plan yet')}</p>
                <p className="text-xs text-text-secondary mt-1">{t('pln_no_plan_hint', 'Open a trip in the planning board and its stops will be loaded here for optimization.')}</p>
              </div>
            )}

            {!loading && routePlan && sortedStops.length === 0 && (
              <div className="text-center py-16 px-4">
                <Package className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                <p className="font-bold text-text-primary text-sm">{t('pln_no_stops', 'No stops in this plan')}</p>
                <p className="text-xs text-text-secondary mt-1">{t('pln_no_stops_hint', 'Assign orders to this truck in the planning board, then reopen the planner.')}</p>
              </div>
            )}

            {routePlan && sortedStops.map((stop: any, idx: number) => {
              const isPickup = stop.type === 'pickup';
              const conflictFor = (routePlan?.conflicts || []).filter((c: any) => c.stopId === stop.id);
              const warnFor = (routePlan?.warnings || []).filter((w: any) => w.stopId === stop.id);
              const prevIdx = idx > 0 ? idx - 1 : -1;
              const nextIdx = idx < sortedStops.length - 1 ? idx + 1 : -1;
              const isActive = activeStopId === stop.id;

              return (
                <div
                  key={stop.id}
                  onClick={() => focusStop(stop)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(stop.id); }}
                  onDragLeave={() => setDragOverId((id) => (id === stop.id ? null : id))}
                  onDrop={(e) => { e.preventDefault(); handleDrop(stop.id); }}
                  className={`rounded-xl border p-3 bg-surface/50 hover:bg-surface/80 transition-all cursor-pointer ${isPickup ? 'border-blue-500/25 hover:border-blue-500/40' : 'border-emerald-500/25 hover:border-emerald-500/40'} ${stop.locked ? 'border-amber-400/60 ring-1 ring-amber-400/30' : ''} ${dragOverId === stop.id && dragId !== stop.id ? 'ring-2 ring-primary border-primary scale-[1.01]' : ''} ${dragId === stop.id ? 'opacity-40' : ''} ${isActive ? 'ring-2 ring-primary shadow-md' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0 ${isPickup ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                      {stop.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black uppercase ${isPickup ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {isPickup ? t('pln_pickup', 'Pickup') : t('pln_delivery', 'Delivery')}
                          {stop.shipmentId && <span className="text-text-muted normal-case ml-1">· {stop.shipmentId.slice(0, 8)}</span>}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
                          {!stop.locked && (
                            <div
                              draggable={!stop.locked && !actionLoading}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', stop.id);
                                e.dataTransfer.effectAllowed = 'move';
                                setDragId(stop.id);
                              }}
                              onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                              className="p-1 rounded text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing hover:bg-surface"
                              title={t('pln_drag_hint', 'Drag to reorder')}
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <button
                            onClick={() => handleToggleLock(stop, false)}
                            disabled={!!actionLoading}
                            title={stop.locked ? t('pln_unlock', 'Unlock') : t('pln_lock', 'Lock stop')}
                            className={`p-1 rounded-md transition-colors ${stop.locked ? 'text-amber-500 hover:bg-amber-500/10' : 'text-text-muted hover:text-amber-500 hover:bg-surface'}`}
                          >
                            {stop.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => handleMove(idx, prevIdx)}
                            disabled={!!actionLoading || prevIdx < 0 || sortedStops[prevIdx]?.lockedSequence}
                            className="p-1 rounded-md text-text-muted hover:text-primary hover:bg-surface disabled:opacity-30"
                            title={t('reorder_up', 'Move up')}
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMove(idx, nextIdx)}
                            disabled={!!actionLoading || nextIdx < 0 || sortedStops[nextIdx]?.lockedSequence}
                            className="p-1 rounded-md text-text-muted hover:text-primary hover:bg-surface disabled:opacity-30"
                            title={t('reorder_down', 'Move down')}
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-text-primary truncate mt-0.5">
                        {stop.companyName || stop.city || stop.address || t('pln_no_address', 'No address')}
                      </p>
                      <p className="text-[11px] text-text-secondary truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-text-muted shrink-0" />{stop.city || ''}{stop.country ? `, ${stop.country}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[10px]">
                    <div className="rounded-lg bg-surface px-2 py-1">
                      <p className="text-text-muted uppercase font-bold text-[8px]">{t('pln_eta', 'ETA')}</p>
                      <p className="font-bold text-text-primary truncate">{fmtDate(stop.eta, t)}</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-1">
                      <p className="text-text-muted uppercase font-bold text-[8px]">{t('pln_window', 'Window')}</p>
                      <p className="font-bold text-text-primary truncate">
                        {stop.timeWindowStart ? fmtDate(stop.timeWindowStart, t).split(',')[1] : '—'}
                        {stop.timeWindowEnd ? ` – ${fmtDate(stop.timeWindowEnd, t).split(',')[1]}` : ''}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-1">
                      <p className="text-text-muted uppercase font-bold text-[8px]">{t('pln_cargo', 'Cargo')}</p>
                      <p className="font-bold text-text-primary truncate">
                        {Math.round(stop.pallets || 0)} {t('unit_pallets', 'pal')} · {Math.round(stop.weightKg || 0)} kg
                      </p>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-text-secondary">
                      {t('pln_load_after', 'Load after')}: {Math.round(stop.cumulativePallets || 0)} {t('unit_pallets', 'pal')} · {Math.round(stop.cumulativeWeightKg || 0)} kg
                    </span>
                    {stop.loadingSequence != null && (
                      <span className="text-[10px] font-bold text-violet-600">
                        {t('pln_load_seq', 'Load seq')} #{stop.loadingSequence}
                      </span>
                    )}
                    {conflictFor.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-black text-red-500">
                        <AlertTriangle className="w-3 h-3" />{conflictFor.length}
                      </span>
                    )}
                    {warnFor.length > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                        <Info className="w-3 h-3" />{warnFor.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Interactive Map on Right Side */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          <div className="flex-1 w-full h-full relative min-h-0">
            <div ref={mapRef} className="absolute inset-0 w-full h-full" />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-sm z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-75" />
              </div>
            )}

            {/* Map Floating Toolbar */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-card/90 backdrop-blur border border-border rounded-xl p-1.5 shadow-lg">
              <button
                onClick={fitRouteBounds}
                className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-primary transition-colors flex items-center gap-1 text-xs font-bold"
                title={t('pln_fit_route', 'Fit full route on map')}
              >
                <Navigation className="w-4 h-4 text-primary" />
                <span>{t('pln_fit_route', 'Fit Route')}</span>
              </button>
            </div>
          </div>

          {/* Optimization results bar */}
          {metadata.explanation && (
            <div className="shrink-0 px-4 py-2.5 border-t border-border bg-violet-500/5 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0 text-xs">
                <p className="text-text-secondary leading-relaxed">{metadata.explanation}</p>
                {before && after && (
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="text-text-muted font-bold">{t('pln_distance', 'Distance')}: <span className="text-text-secondary line-through">{Math.round(before.totalDistanceKm)} km</span> → <span className="text-emerald-600 font-black">{Math.round(after.totalDistanceKm)} km</span></span>
                    <span className="text-text-muted font-bold">{t('pln_driving', 'Driving')}: <span className="text-text-secondary line-through">{Math.round(before.totalDrivingTimeMinutes / 60)}h</span> → <span className="text-emerald-600 font-black">{Math.round(after.totalDrivingTimeMinutes / 60)}h</span></span>
                    <span className="text-text-muted font-bold">{t('pln_score', 'Score')}: <span className="text-primary font-black">{Math.round(routePlan?.optimizationScore || 0)}%</span></span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowLoadPanel(v => !v)} className="p-1.5 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary transition-colors shrink-0" title={t('pln_load_panel', 'Load plan')}>
                {showLoadPanel ? <X className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Load Plan panel (LIFO/FIFO + timeline) ── */}
      {showLoadPanel && (
        <div className="shrink-0 border-t border-border bg-card px-4 py-3 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-black text-text-primary flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />{t('pln_load_plan', 'Loading Sequence & Load Timeline')}
              {routePlan?.optimizationMetadata?.loadingRule && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-600">
                  {t(`pln_rule_${routePlan.optimizationMetadata.loadingRule}`, String(routePlan.optimizationMetadata.loadingRule).toUpperCase())}
                </span>
              )}
            </h3>
            <button onClick={() => setShowLoadPanel(false)} className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading sequence */}
          <div className="flex gap-1.5 overflow-x-auto pb-1.5">
            {sortedStops.filter((s: any) => s.type === 'pickup').length === 0 && (
              <span className="text-xs text-text-secondary">{t('pln_no_pickups', 'No pickups to sequence yet.')}</span>
            )}
            {sortedStops.filter((s: any) => s.type === 'pickup').map((stop: any, i: number) => (
              <div key={stop.id} className="flex items-center gap-1.5 shrink-0">
                {i > 0 && <ArrowRight className="w-3.5 h-3.5 text-text-muted" />}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">{stop.loadingSequence != null ? stop.loadingSequence : i + 1}</span>
                  <span className="text-xs font-bold text-text-primary whitespace-nowrap max-w-40 truncate">{stop.companyName || stop.city}</span>
                  <span className="text-[10px] text-text-secondary whitespace-nowrap">{Math.round(stop.pallets || 0)} {t('unit_pallets', 'pal')}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-text-muted mt-1">{t('pln_load_seq_hint', 'Loading order at origin. LIFO: last loaded = first delivered. Deliveries should follow reverse loading order when the truck is rear-loaded.')}</p>

          {/* Load timeline */}
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase tracking-wide text-text-secondary">{t('pln_pallets_over_route', 'Pallets on board over the route')}</span>
              <span className="text-[10px] text-text-muted">{t('pln_max', 'max')}: {Math.round(routePlan?.peakPallets || 0)} / {Math.round(cap.maxPallets)}</span>
            </div>
            <div className="flex items-end gap-1 h-20">
              {sortedStops.map((stop: any) => {
                const pct = Math.min(100, ((stop.cumulativePallets || 0) / (Number(cap.maxPallets) || 1)) * 100);
                return (
                  <div key={stop.id} className="flex-1 flex flex-col items-center gap-0.5 group cursor-pointer" onClick={() => focusStop(stop)}>
                    <div className="w-full flex items-end justify-center bg-surface/60 rounded-t overflow-hidden" style={{ height: '100%' }}>
                      <div
                        className={`w-full transition-all duration-500 ${stop.type === 'pickup' ? 'bg-blue-500' : 'bg-emerald-500'} ${stop.locked ? 'ring-1 ring-amber-400' : ''}`}
                        style={{ height: `${pct}%`, minHeight: pct > 0 ? '6px' : '2px' }}
                      />
                    </div>
                    <span className={`text-[9px] font-bold ${stop.type === 'pickup' ? 'text-blue-600' : 'text-emerald-600'}`}>
                      {stop.sequence}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conflicts / warnings / completeness */}
          <div className="mt-3 grid md:grid-cols-2 gap-2">
            {((validationResult?.conflicts?.length) || (routePlan?.conflicts || []).length) > 0 && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-2.5">
                <h4 className="text-xs font-black text-red-500 flex items-center gap-1.5 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />{t('pln_conflicts', 'Conflicts')} ({(validationResult?.conflicts || routePlan?.conflicts || []).length})
                </h4>
                <ul className="space-y-1">
                  {(validationResult?.conflicts || routePlan?.conflicts || []).slice(0, 5).map((c: any, i: number) => (
                    <li key={i} className="text-[11px] text-red-600/90 flex items-start gap-1.5">
                      <X className="w-3 h-3 shrink-0 mt-0.5" />{c.message}
                      {c.hard && <span className="text-red-500 font-black uppercase text-[8px]">· {t('pln_hard', 'hard')}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {((validationResult?.warnings?.length) || (routePlan?.warnings || []).length) > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-2.5">
                <h4 className="text-xs font-black text-amber-500 flex items-center gap-1.5 mb-1.5">
                  <Info className="w-3.5 h-3.5" />{t('pln_warnings', 'Warnings')} ({(validationResult?.warnings || routePlan?.warnings || []).length})
                </h4>
                <ul className="space-y-1">
                  {(validationResult?.warnings || routePlan?.warnings || []).slice(0, 5).map((w: any, i: number) => (
                    <li key={i} className="text-[11px] text-amber-600/90 flex items-start gap-1.5">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />{w.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(validationResult?.completeness || []).length > 0 && (
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-2.5">
                <h4 className="text-xs font-black text-sky-600 flex items-center gap-1.5 mb-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />{t('pln_missing_data', 'Missing data')} ({validationResult.completeness.length})
                </h4>
                <ul className="space-y-1">
                  {validationResult.completeness.slice(0, 6).map((c: any, i: number) => (
                    <li key={i} className="text-[11px] text-sky-700/90 flex items-start gap-1.5">
                      <Info className="w-3 h-3 shrink-0 mt-0.5" />{c.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {((validationResult?.conflicts || []).length) === 0 && ((validationResult?.warnings || []).length) === 0 &&
              (routePlan?.conflicts || []).length === 0 && (routePlan?.warnings || []).length === 0 && routePlan && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-emerald-600">{t('jsx_attentionClear', 'No conflicts. Everything is fine.')}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Optimization preview modal (Apply / Cancel) ── */}
      {showProposal && proposedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-border flex items-center gap-3 shrink-0">
              <Sparkles className="w-5 h-5 text-violet-500" />
              <div className="flex-1">
                <h3 className="text-base font-black text-text-primary">{t('pln_proposal_title', 'Optimization preview')}</h3>
                <p className="text-xs text-text-secondary">{t('pln_proposal_hint', 'Review the proposed sequence before applying it. Nothing is saved until you apply.')}</p>
              </div>
              <button onClick={() => { setShowProposal(false); setProposedPlan(null); }} className="p-1.5 rounded-lg hover:bg-surface text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              <p className="text-xs text-text-secondary leading-relaxed">{proposedPlan.optimizationMetadata?.explanation}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] uppercase font-black text-text-muted">{t('pln_distance', 'Distance')}</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">
                    <span className="line-through text-text-muted">{Math.round(proposedPlan.optimizationMetadata?.before?.totalDistanceKm || 0)} km</span>
                    {' → '}
                    <span className="text-emerald-600">{Math.round(proposedPlan.optimizationMetadata?.after?.totalDistanceKm || 0)} km</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] uppercase font-black text-text-muted">{t('pln_driving', 'Driving')}</p>
                  <p className="text-sm font-black text-text-primary mt-0.5">
                    <span className="line-through text-text-muted">{Math.round((proposedPlan.optimizationMetadata?.before?.totalDrivingTimeMinutes || 0) / 60)}h</span>
                    {' → '}
                    <span className="text-emerald-600">{Math.round((proposedPlan.optimizationMetadata?.after?.totalDrivingTimeMinutes || 0) / 60)}h</span>
                  </p>
                </div>
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] uppercase font-black text-text-muted">{t('pln_score', 'Score')}</p>
                  <p className="text-sm font-black text-primary mt-0.5">{Math.round(proposedPlan.optimizationScore || 0)}%</p>
                </div>
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] uppercase font-black text-text-muted">{t('pln_conflicts', 'Conflicts')}</p>
                  <p className={`text-sm font-black mt-0.5 ${(proposedPlan.conflicts || []).length ? 'text-red-500' : 'text-emerald-600'}`}>
                    {(proposedPlan.conflicts || []).length}
                  </p>
                </div>
              </div>

              {/* Sequence diff */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary mb-1.5">{t('pln_proposed_seq', 'Proposed sequence')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...(proposedPlan.stops || [])]
                    .sort((a: any, b: any) => a.sequence - b.sequence)
                    .map((s: any) => {
                      const orig = (routePlan?.stops || []).find((o: any) => o.id === s.id);
                      const moved = orig && orig.sequence !== s.sequence;
                      return (
                        <div key={s.id} className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-bold ${s.type === 'pickup' ? 'bg-blue-500/10 border-blue-500/30 text-blue-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700'} ${moved ? 'ring-1 ring-amber-400/70' : ''}`}>
                          <span className="w-4 h-4 rounded bg-white/60 text-[9px] font-black flex items-center justify-center">{s.sequence}</span>
                          <span className="max-w-28 truncate">{s.companyName || s.city || s.address}</span>
                          {moved && <GripHorizontal className="w-3 h-3 text-amber-500" />}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button onClick={() => { setShowProposal(false); setProposedPlan(null); }} disabled={!!actionLoading} className="btn-secondary text-xs py-2 px-4 font-bold disabled:opacity-50">
                {t('pln_cancel', 'Cancel')}
              </button>
              <button onClick={handleApplyOptimization} disabled={!!actionLoading} className="btn-primary text-xs py-2 px-5 font-black shadow shadow-primary/20 disabled:opacity-50 flex items-center gap-1.5">
                {actionLoading === 'apply' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {t('pln_apply', 'Apply optimization')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
