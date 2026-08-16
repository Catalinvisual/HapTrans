import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Package, Loader2, MapPin, AlertTriangle, X, ArrowUp, ArrowDown,
  Lock, Unlock, RotateCcw, Sparkles, Save,
  CheckCircle2, Info, Route as RouteIcon, ClipboardList, GripVertical, GripHorizontal,
  ShieldAlert, ArrowRight, Navigation, ArrowLeft, ShieldCheck,
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { planningApi } from '../lib/planningApi';

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function TruckRoutePlannerPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { truckId = '' } = useParams<{ truckId: string }>();
  const [searchParams] = useSearchParams();
  const queryDate = searchParams.get('date');
  const queryTrip = searchParams.get('trip');
  const [date] = useState<string>(queryDate || new Date().toISOString().split('T')[0]);

  const [routePlan, setRoutePlan] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [proposedPlan, setProposedPlan] = useState<any>(null);
  const [showProposal, setShowProposal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const effectiveTripId = useMemo(() => {
    return queryTrip || routePlan?.tripId || routePlan?.trip?.id || null;
  }, [queryTrip, routePlan]);

  const tripStatus = useMemo(() => {
    return String(routePlan?.tripStatus || routePlan?.trip?.status || 'planning').toLowerCase();
  }, [routePlan]);

  const isConfirmed = tripStatus === 'confirmed';
  const isDispatched = ['dispatched', 'driver_received', 'driver_accepted', 'started', 'loading', 'driving', 'in_transit', 'partially_delivered', 'completed', 'closed'].includes(tripStatus);
  const isPlanningLocked = isConfirmed || isDispatched;

  const loadPlan = async (d: string, silent = false) => {
    if (!truckId) return;
    if (!silent) setLoading(true);
    try {
      let plan: any = null;
      if (queryTrip) {
        try {
          plan = await planningApi.getRoutePlanByTrip(queryTrip);
        } catch {
          plan = await planningApi.createRoutePlanFromTrip(truckId, queryTrip);
        }
      }
      if (!plan) {
        plan = await planningApi.getRoutePlan(truckId, d);
      }
      setRoutePlan(plan);
      setDirty(false);
      setProposedPlan(null);
      setShowProposal(false);
      if (plan?.validationIssues?.length || plan?.conflicts?.length) {
        const blocking = (plan.validationIssues || plan.conflicts || []).filter((c: any) => c.blocking || c.hard || c.severity === 'error');
        const warns = (plan.validationIssues || plan.warnings || []).filter((c: any) => !c.blocking && !c.hard && c.severity !== 'error');
        setValidationResult({ conflicts: blocking, warnings: warns, completeness: [] });
      } else {
        setValidationResult(null);
      }
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
      if (profs?.length && !selectedProfile) setSelectedProfile(profs[0].id);
    } catch {
    }
  }, [selectedProfile]);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);
  useEffect(() => { loadPlan(date); }, [truckId, date, queryTrip]);

  const sortedStops = useMemo(() => {
    const raw = [...(routePlan?.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));

    const orderCargo = new Map<string, { pal: number; wt: number; ldm: number; vol: number }>();
    raw.forEach((s: any) => {
      if (s.orderId && s.type === 'pickup') {
        const p = Number(s.pallets) || 0;
        const w = Number(s.weightKg) || 0;
        const l = Number(s.loadingMeters) || (p > 0 ? Math.round(p * 0.4 * 100) / 100 : 0);
        const v = Number(s.volumeCbm) || (p > 0 ? Math.round(p * 2.5 * 10) / 10 : 0);
        orderCargo.set(s.orderId, { pal: p, wt: w, ldm: l, vol: v });
      }
    });

    let cumPal = 0;
    let cumWt = 0;
    let cumLdm = 0;
    let cumVol = 0;

    return raw.map((s: any) => {
      let pal = Number(s.pallets) || 0;
      let wt = Number(s.weightKg) || 0;
      let ldm = Number(s.loadingMeters) || 0;
      let vol = Number(s.volumeCbm) || 0;

      if (s.orderId && s.type === 'delivery') {
        const matched = orderCargo.get(s.orderId);
        if (matched) {
          pal = matched.pal;
          wt = matched.wt;
          ldm = matched.ldm;
          vol = matched.vol;
        }
      }

      if (ldm === 0 && pal > 0) ldm = Math.round(pal * 0.4 * 100) / 100;
      if (vol === 0 && pal > 0) vol = Math.round(pal * 2.5 * 10) / 10;

      if (s.type === 'pickup') {
        cumPal += pal;
        cumWt += wt;
        cumLdm += ldm;
        cumVol += vol;
      } else {
        cumPal = Math.max(0, cumPal - pal);
        cumWt = Math.max(0, cumWt - wt);
        cumLdm = Math.max(0, cumLdm - ldm);
        cumVol = Math.max(0, cumVol - vol);
      }

      return {
        ...s,
        pallets: pal,
        weightKg: wt,
        loadingMeters: ldm,
        volumeCbm: vol,
        liveCumPal: Math.max(0, cumPal),
        liveCumWt: Math.max(0, cumWt),
        liveCumLdm: Math.max(0, cumLdm),
        liveCumVol: Math.max(0, cumVol),
      };
    });
  }, [routePlan]);

  const metrics = useMemo(() => {
    let cumPal = 0;
    let cumWt = 0;
    let cumLdm = 0;
    let cumVol = 0;
    let peakPal = 0;
    let peakWt = 0;
    let peakLdm = 0;
    let peakVol = 0;
    let totalDist = Number(routePlan?.totalDistanceKm) || 0;
    let totalDur = Number(routePlan?.totalDurationMinutes) || 0;

    for (let i = 0; i < sortedStops.length; i++) {
      const s = sortedStops[i];
      const pal = Number(s.pallets) || 0;
      const wt = Number(s.weightKg) || 0;
      let ldm = Number(s.loadingMeters) || 0;
      let vol = Number(s.volumeCbm) || 0;
      if (ldm === 0 && pal > 0) ldm = Math.round(pal * 0.4 * 100) / 100;
      if (vol === 0 && pal > 0) vol = Math.round(pal * 2.5 * 10) / 10;

      if (s.type === 'pickup') {
        cumPal += pal;
        cumWt += wt;
        cumLdm += ldm;
        cumVol += vol;
      } else {
        cumPal = Math.max(0, cumPal - pal);
        cumWt = Math.max(0, cumWt - wt);
        cumLdm = Math.max(0, cumLdm - ldm);
        cumVol = Math.max(0, cumVol - vol);
      }

      peakPal = Math.max(peakPal, cumPal);
      peakWt = Math.max(peakWt, cumWt);
      peakLdm = Math.max(peakLdm, cumLdm);
      peakVol = Math.max(peakVol, cumVol);

      if (i < sortedStops.length - 1 && totalDist === 0) {
        const next = sortedStops[i + 1];
        if (s.latitude && s.longitude && next.latitude && next.longitude) {
          const lat1 = Number(s.latitude);
          const lon1 = Number(s.longitude);
          const lat2 = Number(next.latitude);
          const lon2 = Number(next.longitude);
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLon = (lon2 - lon1) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          totalDist += 6371 * c * 1.25;
        }
      }
    }

    if (totalDur === 0 && totalDist > 0) {
      totalDur = Math.round((totalDist / 65) * 60 + sortedStops.length * 30);
    }

    return {
      peakPallets: Number(routePlan?.peakPallets) || peakPal,
      peakWeightKg: Number(routePlan?.peakWeightKg) || peakWt,
      peakLdm: Number(routePlan?.peakLdm) || peakLdm,
      peakVolumeCbm: Number(routePlan?.peakVolumeCbm) || peakVol,
      totalDistanceKm: Math.round(totalDist),
      totalDurationMinutes: Math.round(totalDur),
    };
  }, [sortedStops, routePlan]);

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
          <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 2px;">
            ${s.companyName || s.city || 'Stop'}
          </div>
          <div style="font-size: 11px; color: #64748b;">
            ${s.address ? s.address + ', ' : ''}${s.city || ''}
          </div>
          ${s.pallets ? `<div style="font-size: 10px; color: #475569; margin-top: 4px;">📦 ${s.pallets} pal · ${s.weightKg || 0} kg</div>` : ''}
          ${s.timeFrom || s.timeUntil ? `<div style="font-size: 10px; color: #d97706; margin-top: 2px;">⏰ ${s.timeFrom || ''} - ${s.timeUntil || ''}</div>` : ''}
        </div>
      `;

      const popup = new maplibregl.Popup({ offset: 12, closeButton: false }).setHTML(popupHtml);
      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    }

    if (stopsWithCoords.length > 0) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 13, duration: 600 });
    }
  }, [sortedStops, mapReady]);

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

  const handleConfirmPlan = async () => {
    if (!effectiveTripId) {
      toast.error('No associated TRP found to confirm.');
      return;
    }
    setActionLoading('confirm');
    try {
      await planningApi.confirmTrip(effectiveTripId);
      toast.success(t('jsx_confirmedOk', 'Trip confirmed'));
      setShowConfirmModal(false);
      await loadPlan(date, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_validate_error', 'Confirmation failed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenPlanning = async () => {
    if (!effectiveTripId) {
      toast.error('No associated TRP found to reopen.');
      return;
    }
    setActionLoading('reopen');
    try {
      await planningApi.reopenPlanning(effectiveTripId);
      toast.success(t('reopen_planning_ok', 'Planning reopened. Plan is now editable.'));
      setShowReopenModal(false);
      await loadPlan(date, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reopen planning');
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

  const applyReorder = async (ordered: any[]) => {
    if (isPlanningLocked) {
      toast.error(t('pln_confirmed_locked', 'Plan is confirmed and locked. Click Reopen Planning to make edits.'));
      return;
    }
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

  const handleMove = (fromIdx: number, toIdx: number) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= sortedStops.length || toIdx >= sortedStops.length) return;
    const next = [...sortedStops];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    applyReorder(next);
  };

  const handleToggleLock = async (stop: any, forceValue?: boolean) => {
    if (isPlanningLocked) {
      toast.error(t('pln_confirmed_locked', 'Plan is confirmed and locked. Click Reopen Planning to make edits.'));
      return;
    }
    const nextLocked = forceValue !== undefined ? forceValue : !stop.locked;
    try {
      if (nextLocked) {
        await planningApi.lockStop(stop.id, routePlan?.id || '', true);
      } else {
        await planningApi.unlockStop(stop.id, routePlan?.id || '');
      }
      await loadPlan(date, true);
      toast.success(nextLocked ? t('pln_locked_ok', 'Stop locked') : t('pln_unlocked_ok', 'Stop unlocked'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update stop lock');
    }
  };

  const handleDrop = (targetStopId: string) => {
    if (!dragId || dragId === targetStopId) return;
    const fromIdx = sortedStops.findIndex((s: any) => s.id === dragId);
    const toIdx = sortedStops.findIndex((s: any) => s.id === targetStopId);
    if (fromIdx >= 0 && toIdx >= 0) {
      handleMove(fromIdx, toIdx);
    }
    setDragId(null);
    setDragOverId(null);
  };

  const trip = routePlan?.trip || {};
  const truck = routePlan?.truck || trip.truck || null;
  const driver = routePlan?.driver || trip.driver || truck?.driver || null;
  const trailer = routePlan?.trailer || trip.trailer || null;
  const trpNumber = routePlan?.tripNumber || trip.tripNumber || (queryTrip ? `TRP` : t('pln_planner', 'Route Planner'));

  const effectiveTripStatus = String(routePlan?.tripStatus || trip.status || 'planning').toLowerCase();
  const effectiveValidationStatus = String(routePlan?.validationStatus || trip.validationStatus || 'not_validated').toLowerCase();

  const isNotFeasible = effectiveValidationStatus === 'not_feasible' || (validationResult?.conflicts?.length > 0);

  const statusBadgeClass = useMemo(() => {
    switch (effectiveTripStatus) {
      case 'confirmed': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      case 'dispatched': return 'bg-blue-500/10 border-blue-500/30 text-blue-600';
      case 'driver_received':
      case 'driver_accepted':
      case 'started':
      case 'in_transit': return 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600';
      case 'completed': return 'bg-purple-500/10 border-purple-500/30 text-purple-600';
      default: return 'bg-surface border-border text-text-secondary';
    }
  }, [effectiveTripStatus]);

  const validationBadgeClass = useMemo(() => {
    switch (effectiveValidationStatus) {
      case 'feasible': return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600';
      case 'warning': return 'bg-amber-500/10 border-amber-500/30 text-amber-600';
      case 'not_feasible': return 'bg-red-500/10 border-red-500/30 text-red-600';
      default: return 'bg-surface border-border text-text-secondary';
    }
  }, [effectiveValidationStatus]);

  const cap = useMemo(() => {
    return {
      maxWeightKg: Number(truck?.payloadCapacity || truck?.maxWeightKg || 24000),
      maxPallets: Number(truck?.maxPallets || 33),
      maxLdm: Number(truck?.loadingMeters || 13.6),
      maxVolumeCbm: Number(truck?.volumeCbm || 86),
    };
  }, [truck]);

  const metadata = routePlan?.optimizationMetadata || {};
  const before = metadata?.before;
  const after = metadata?.after;

  const handleValidate = async () => {
    if (!effectiveTripId) {
      toast.error('No associated TRP found to validate.');
      return;
    }
    setActionLoading('validate');
    try {
      const res = await planningApi.validateTrip(effectiveTripId);
      setValidationResult(res);
      if (res.validationStatus === 'feasible') {
        toast.success(t('validation_feasible_ok', 'Route plan is feasible and validated.'));
      } else if (res.validationStatus === 'warning') {
        toast(t('validation_warning_msg', 'Route plan is feasible with warnings.'), { icon: '⚠️' });
      } else {
        toast.error(t('validation_not_feasible_err', 'Plan is not feasible. Resolve blocking issues before confirming.'));
      }
      await loadPlan(date, true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('pln_validate_error', 'Validation failed'));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-full overflow-hidden bg-background text-text-primary">
      {/* Header bar */}
      <header className="px-5 py-3 border-b border-border bg-card/80 backdrop-blur shrink-0 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/planning')} className="p-2 rounded-xl bg-surface hover:bg-border text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black">
                {trpNumber}
              </span>
              <h1 className="text-base font-black text-text-primary flex items-center gap-2">
                <span>{truck?.plateNumber || t('pln_planner', 'Route Planner')}</span>
                {truck?.brand && <span className="text-xs text-text-muted font-semibold">({truck.brand} {truck.model || ''})</span>}
              </h1>
              {/* TRP Lifecycle Status Badge */}
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border uppercase ${statusBadgeClass}`}>
                {t(`status_${effectiveTripStatus}`, effectiveTripStatus)}
              </span>
              {/* Feasibility Status Badge */}
              <span className={`px-2.5 py-0.5 text-xs font-black rounded-full border uppercase flex items-center gap-1 ${validationBadgeClass}`}>
                <ShieldCheck className="w-3 h-3" />
                {t(`status_${effectiveValidationStatus}`, effectiveValidationStatus)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
              <span>{t('export_col_driver', 'Driver')}: <strong className="text-text-primary">{driver?.user?.name || driver?.user?.email || '—'}</strong></span>
              <span>·</span>
              <span>{t('export_col_trailer', 'Trailer')}: <strong className="text-text-primary">{trailer?.plateNumber || '—'}</strong></span>
              <span>·</span>
              <span>{sortedStops.length} {t('jsx_stops', 'stops')}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Action buttons */}
          <button
            onClick={handleSave}
            disabled={!dirty || !!actionLoading || isPlanningLocked}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold disabled:opacity-40"
            title={t('save_draft', 'Save Draft')}
          >
            <Save className="w-4 h-4" />
            <span>{t('save_draft', 'Save Draft')}</span>
          </button>

          <button
            onClick={handleRecalculate}
            disabled={!!actionLoading}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1 font-bold disabled:opacity-40"
            title={t('pln_recalculate_loads', 'Recalculate Loads')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('pln_recalculate', 'Recalculate')}</span>
          </button>

          <button
            onClick={handleReset}
            disabled={!!actionLoading || isPlanningLocked}
            className="btn-secondary text-xs py-2 px-3 flex items-center gap-1 font-bold text-text-muted hover:text-red-600 disabled:opacity-40"
            title={t('pln_reset_plan', 'Reset Route')}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{t('pln_reset', 'Reset')}</span>
          </button>

          <button
            onClick={() => handleOptimize()}
            disabled={!!actionLoading || isPlanningLocked}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold border-violet-500/30 text-violet-600 hover:bg-violet-500/10 disabled:opacity-40"
            title={t('optimize_plan_btn', 'Optimize Route')}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('optimize_plan_btn', 'Optimize')}</span>
          </button>

          <button
            onClick={handleValidate}
            disabled={!!actionLoading}
            className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold disabled:opacity-40"
            title={t('validate_plan_btn', 'Validate Plan')}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{t('validate_plan_btn', 'Validate')}</span>
          </button>

          {isPlanningLocked ? (
            <button
              onClick={() => setShowReopenModal(true)}
              disabled={!!actionLoading}
              className="btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
              title={t('action_reopen_planning', 'Reopen Planning')}
            >
              <Unlock className="w-4 h-4" />
              <span>{t('action_reopen_planning', 'Reopen Planning')}</span>
            </button>
          ) : (
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={!!actionLoading || isNotFeasible}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-black shadow-md shadow-primary/20 disabled:opacity-40"
              title={t('action_confirm_plan', 'Confirm Plan')}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t('action_confirm_plan', 'Confirm Plan')}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main split view: Stops sequence on left, Map on right */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sequence List on Left */}
        <section className="w-96 lg:w-[420px] shrink-0 border-r border-border bg-card flex flex-col min-h-0">
          <div className="p-3 border-b border-border/70 flex items-center justify-between text-xs bg-surface/30">
            <span className="font-bold text-text-primary">{t('pln_stop_sequence', 'Stop Sequence')} ({sortedStops.length})</span>
            <span className="text-[11px] text-text-muted">{t('pln_drag_to_reorder', 'Drag to reorder')}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {/* Blocking issues banner */}
            {!loading && validationResult?.conflicts?.length > 0 && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-2 mb-3">
                <div className="flex items-center gap-2 text-red-600 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t('pln_blocking_issues', 'Blocking Issues')} ({validationResult.conflicts.length})</span>
                </div>
                <p className="text-[11px] text-red-500/90 leading-tight">
                  {t('pln_blocking_hint', 'These issues must be resolved before confirming the transport plan.')}
                </p>
                <div className="space-y-1.5 pt-1">
                  {validationResult.conflicts.map((c: any, ci: number) => (
                    <div key={ci} className="text-xs p-2 rounded-lg bg-card border border-red-500/20 text-red-700 font-medium flex items-start gap-1.5 shadow-xs">
                      <span className="font-bold text-red-500 shrink-0">⛔</span>
                      <span className="flex-1 leading-snug">{c.message}</span>
                    </div>
                  ))}
                </div>
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
                      <p className="font-bold text-text-primary truncate">{fmtDate(stop.eta)}</p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-1">
                      <p className="text-text-muted uppercase font-bold text-[8px]">{t('pln_window', 'Window')}</p>
                      <p className="font-bold text-text-primary truncate">
                        {stop.timeWindowStart ? fmtDate(stop.timeWindowStart).split(',')[1] : '—'}
                        {stop.timeWindowEnd ? ` – ${fmtDate(stop.timeWindowEnd).split(',')[1]}` : ''}
                      </p>
                    </div>
                    <div className="rounded-lg bg-surface px-2 py-1">
                      <p className="text-text-muted uppercase font-bold text-[8px]">
                        {isPickup ? t('pln_to_load', 'To load') : t('pln_to_unload', 'To unload')}
                      </p>
                      <p className={`font-bold truncate ${isPickup ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {Math.round(stop.pallets || 0)} {t('unit_pallets', 'pal')} · {Math.round(stop.weightKg || 0)} kg
                      </p>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-text-secondary">
                      {isPickup ? (
                        <span>{t('pln_onboard_after', 'On board after')}: <strong className="text-text-primary">{Math.round(stop.liveCumPal ?? stop.cumulativePallets ?? 0)} pal · {Math.round(stop.liveCumWt ?? stop.cumulativeWeightKg ?? 0)} kg</strong></span>
                      ) : (
                        <span>{t('pln_remaining_truck', 'Remaining on truck')}: <strong className="text-text-primary">{Math.round(stop.liveCumPal ?? stop.cumulativePallets ?? 0)} pal · {Math.round(stop.liveCumWt ?? stop.cumulativeWeightKg ?? 0)} kg</strong></span>
                      )}
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
                  {String(t(`pln_rule_${routePlan.optimizationMetadata.loadingRule}`, String(routePlan.optimizationMetadata.loadingRule).toUpperCase()))}
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
              <span className="text-[10px] text-text-muted">{t('pln_max', 'max')}: {Math.round(metrics.peakPallets)} / {Math.round(cap.maxPallets)}</span>
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

      {/* Confirm Plan Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-text-primary">{t('confirm_plan_title', 'Confirm Plan')}</h3>
                <p className="text-xs text-text-secondary">{routePlan?.tripNumber || (queryTrip ? `TRP` : 'Transport Plan')}</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('confirm_plan_dialog', 'Confirm this transport plan? This will lock the route, stop sequence, and cargo as an operational commitment.')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={!!actionLoading}
                className="btn-secondary text-xs py-2 px-4 font-bold"
              >
                {t('pln_cancel', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmPlan}
                disabled={!!actionLoading}
                className="btn-primary text-xs py-2 px-4 font-black flex items-center gap-1.5"
              >
                {actionLoading === 'confirm' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('action_confirm_plan', 'Confirm Plan')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reopen Planning Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-text-primary">{t('reopen_planning_title', 'Reopen Planning')}</h3>
                <p className="text-xs text-text-secondary">{routePlan?.tripNumber || (queryTrip ? `TRP` : 'Transport Plan')}</p>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              {t('reopen_planning_dialog', 'This change will invalidate the current confirmed plan and require re-validation. Are you sure you want to reopen planning?')}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowReopenModal(false)}
                disabled={!!actionLoading}
                className="btn-secondary text-xs py-2 px-4 font-bold"
              >
                {t('pln_cancel', 'Cancel')}
              </button>
              <button
                onClick={handleReopenPlanning}
                disabled={!!actionLoading}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
              >
                {actionLoading === 'reopen' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {t('action_reopen_planning', 'Reopen Planning')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
