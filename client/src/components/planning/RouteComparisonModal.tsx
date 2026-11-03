import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AlertTriangle, Check, Loader2, Map as MapIcon, RefreshCw, Route } from 'lucide-react';
import toast from 'react-hot-toast';
import { planningApi } from '../../lib/planningApi';
import { fmtMoney, fmtNumber } from '../../lib/format';

const ROUTE_COLORS = ['#f97316', '#1e3a8a', '#059669'];

function fmtDuration(minutes: number | null) {
  if (minutes === null || !Number.isFinite(minutes)) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

function reasonLabel(reason: string | undefined, t: any) {
  if (reason === 'missing_coordinates') return t('up_cmp_no_coords', 'This trip needs at least two geocoded stops to compare truck routes.');
  if (reason === 'provider_unavailable') return t('up_cmp_unavailable', 'Truck routing provider is not configured or returned no alternatives. Configure HERE or OpenRouteService credentials.');
  return t('up_cmp_unavailable', 'Truck routing provider is not configured or returned no alternatives. Configure HERE or OpenRouteService credentials.');
}

export default function RouteComparisonModal({
  trip,
  onClose,
  onApplied,
}: {
  trip: any;
  onClose: () => void;
  onApplied?: (trip: any) => void;
}) {
  const { t } = useTranslation();
  const tripId = trip?.id;
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidFerries, setAvoidFerries] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const mapReady = useRef(false);
  const [mapVersion, setMapVersion] = useState(0);

  const load = useCallback(async () => {
    if (!tripId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await planningApi.getTripRouteAlternatives(tripId, { avoidTolls, avoidFerries, count: 3 });
      setData(response);
    } catch (e: any) {
      setError(e?.response?.data?.message || t('up_cmp_load_error', 'Could not calculate route alternatives'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tripId, avoidTolls, avoidFerries, t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [5.29, 52.13],
      zoom: 5,
      attributionControl: false,
    });
    map.on('load', () => {
      mapReady.current = true;
      setMapVersion((v) => v + 1);
    });
    mapInstance.current = map;
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      mapReady.current = false;
    };
  }, []);

  const routes = useMemo(() => (Array.isArray(data?.routes) ? data.routes : []), [data]);

  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !mapReady.current || routes.length === 0) return;

    routes.forEach((_route: any, index: number) => {
      const layerId = `compare-route-${index}`;
      const sourceId = `compare-source-${index}`;
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        /* ignore */
      }
    });

    const bounds = new maplibregl.LngLatBounds();
    let hasBounds = false;

    routes.forEach((route: any, index: number) => {
      const coordinates = Array.isArray(route.coordinates)
        ? route.coordinates.filter((c: any) => Array.isArray(c) && c.length >= 2)
        : [];
      if (coordinates.length < 2) return;
      const sourceId = `compare-source-${index}`;
      const layerId = `compare-route-${index}`;
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } } as any,
      });
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': ROUTE_COLORS[index % ROUTE_COLORS.length], 'line-width': 4, 'line-opacity': 0.85 },
      });
      coordinates.forEach((c: number[]) => {
        bounds.extend([c[0], c[1]]);
        hasBounds = true;
      });
    });

    if (hasBounds) {
      try {
        map.fitBounds(bounds, { padding: 50, maxZoom: 11 });
      } catch {
        /* ignore */
      }
    }
  }, [routes, mapVersion]);

  const applyRoute = async (route: any) => {
    setApplying(route.index);
    try {
      const updated = await planningApi.applyTripRouteAlternative(tripId, {
        distanceKm: route.distanceKm,
        durationMin: route.durationMin,
        tollCost: route.tollCost,
        tollStatus: route.tollStatus === 'calculated' ? 'calculated' : 'unavailable',
        source: route.source,
      });
      toast.success(t('up_cmp_applied', 'Selected route applied to the trip'));
      onApplied?.(updated);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('up_cmp_apply_error', 'Could not apply the selected route'));
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-md p-3 sm:p-5" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/50 px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-black text-text-primary">
              <Route className="h-4 w-4 text-primary" />
              {t('up_cmp_title', 'Compare truck routes')}
            </h2>
            <p className="truncate text-[10px] text-text-secondary">
              {trip?.tripNumber || '—'} · {t('up_cmp_subtitle', 'Real truck routing with vehicle height, width, weight, axles and emission class')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
              <input type="checkbox" className="checkbox" checked={avoidTolls} onChange={(e) => setAvoidTolls(e.target.checked)} />
              {t('up_cmp_avoid_tolls', 'Avoid toll roads')}
            </label>
            <label className="flex items-center gap-1 text-[10px] font-bold text-text-secondary">
              <input type="checkbox" className="checkbox" checked={avoidFerries} onChange={(e) => setAvoidFerries(e.target.checked)} />
              {t('up_cmp_avoid_ferries', 'Avoid ferries')}
            </label>
            <button type="button" onClick={load} disabled={loading} className="btn-secondary px-2 py-1 text-[10px] font-bold">
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-2 py-1 text-[10px] font-bold">
              {t('close', 'Close')}
            </button>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div className="relative min-h-[260px] border-b border-border lg:border-b-0 lg:border-r">
            <div ref={mapRef} className="absolute inset-0" />
            <div className="absolute bottom-2 left-2 z-10 flex flex-col gap-1 rounded-lg border border-border bg-card/95 px-2 py-1.5 shadow-sm">
              {routes.map((route: any, index: number) => (
                <span key={route.index} className="flex items-center gap-1.5 text-[10px] font-bold text-text-secondary">
                  <span className="h-2 w-2 rounded-sm" style={{ background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
                  {t('up_cmp_route', 'Route')} {index + 1}
                  {route.recommended ? ` · ${t('up_cmp_recommended', 'Recommended')}` : ''}
                </span>
              ))}
              {routes.length === 0 && (
                <span className="flex items-center gap-1 text-[10px] text-text-muted">
                  <MapIcon className="h-3 w-3" /> {t('up_cmp_map', 'Map')}
                </span>
              )}
            </div>
          </div>

          <div className="overflow-y-auto p-3">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-text-secondary">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs">{t('up_cmp_loading', 'Calculating real truck routes…')}</span>
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            ) : !data?.available || routes.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-surface/50 p-6 text-center">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                <p className="text-xs font-bold text-text-primary">{reasonLabel(data?.reason, t)}</p>
                <p className="text-[10px] text-text-secondary">
                  {t('up_cmp_no_routes', 'No alternative routes were returned. Nothing was fabricated or estimated.')}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-surface px-2 py-1.5 text-left text-[9px] font-black uppercase tracking-wide text-text-secondary">
                          {t('up_cmp_metric', 'Metric')}
                        </th>
                        {routes.map((route: any, index: number) => (
                          <th key={route.index} className="bg-surface px-2 py-1.5 text-right text-[9px] font-black uppercase tracking-wide text-text-secondary">
                            <span className="flex items-center justify-end gap-1">
                              <span className="h-2 w-2 rounded-sm" style={{ background: ROUTE_COLORS[index % ROUTE_COLORS.length] }} />
                              {t('up_cmp_route', 'Route')} {index + 1}
                            </span>
                            {route.recommended && (
                              <span className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px] font-bold text-emerald-600">
                                <Check className="h-2.5 w-2.5" /> {t('up_cmp_recommended', 'Recommended')}
                              </span>
                            )}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: 'distance', label: t('up_cmp_distance', 'Distance'), render: (r: any) => `${fmtNumber(r.distanceKm, 1)} km` },
                        { key: 'duration', label: t('up_cmp_duration', 'Driving time'), render: (r: any) => fmtDuration(r.durationMin) },
                        { key: 'toll', label: t('up_cmp_toll', 'Toll'), render: (r: any) => (r.tollCost === null ? t('up_cmp_no_toll', 'Unavailable') : fmtMoney(r.tollCost, data?.currency || 'EUR')) },
                        { key: 'fuel', label: t('up_cmp_fuel', 'Fuel cost'), render: (r: any) => (r.fuelCost === null ? '—' : fmtMoney(r.fuelCost, data?.currency || 'EUR')) },
                        { key: 'driver', label: t('up_cmp_driver_cost', 'Driver cost'), render: (r: any) => (r.driverCost === null ? '—' : fmtMoney(r.driverCost, data?.currency || 'EUR')) },
                        { key: 'total', label: t('up_cmp_total', 'Total estimated cost'), render: (r: any) => (r.totalCost === null ? '—' : fmtMoney(r.totalCost, data?.currency || 'EUR')) },
                        { key: 'profit', label: t('up_cmp_profit', 'Estimated profit'), render: (r: any) => (r.profit === null ? t('pr.not_provided', 'Not provided') : fmtMoney(r.profit, data?.currency || 'EUR')) },
                        { key: 'source', label: t('up_cmp_profile', 'Routing profile'), render: (r: any) => r.source || '—' },
                      ].map((row) => (
                        <tr key={row.key} className="border-t border-border/50">
                          <td className="bg-card px-2 py-1 text-[10px] font-bold text-text-secondary">{row.label}</td>
                          {routes.map((route: any) => (
                            <td key={`${row.key}-${route.index}`} className="px-2 py-1 text-right tabular-nums text-text-primary">
                              {row.render(route)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr className="border-t border-border">
                        <td className="bg-card px-2 py-1.5" />
                        {routes.map((route: any) => (
                          <td key={`apply-${route.index}`} className="px-2 py-1.5 text-right">
                            <button
                              type="button"
                              onClick={() => applyRoute(route)}
                              disabled={applying !== null}
                              className="btn-primary inline-flex items-center gap-1 px-2 py-1 text-[10px] font-black disabled:opacity-60"
                            >
                              {applying === route.index ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              {t('up_cmp_apply', 'Apply route')}
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[9px] leading-relaxed text-text-secondary">
                  {data?.providerNote || t('up_cmp_provider_note', 'Alternatives come from the configured truck routing provider. The recommended route balances cost and time and is never chosen automatically.')}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
