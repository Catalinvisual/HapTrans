import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRight, Loader2, MapPin, Navigation, Plus, X } from 'lucide-react';
import { fmtNumber } from '../../lib/format';

export interface NearbyData {
  candidates?: any[];
  considered?: number;
  withoutCoordinates?: number;
  radiusKm?: number;
  distanceBasis?: string;
  referenceCity?: string | null;
  nextCity?: string | null;
}

/**
 * "Search in the direct vicinity" — loads around the selected stop.
 *
 * Distances are great-circle and labelled as such; the empty-km figure is an
 * estimate. Adding a candidate goes through the normal assignment review, so
 * this panel can never plan something the preflight would block.
 */
export default function NearbyLoadsPanel({
  open,
  onClose,
  loading,
  error,
  data,
  radiusKm,
  onRadiusChange,
  busyOrderId,
  onAdd,
  onOpenOrder,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error?: string | null;
  data?: NearbyData | null;
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  busyOrderId?: string | null;
  onAdd: (orderId: string) => void;
  onOpenOrder?: (orderId: string) => void;
}) {
  const { t } = useTranslation();
  if (!open) return null;
  const candidates = data?.candidates || [];

  const fitBadge = (fit: string) => {
    if (fit === 'over') {
      return <span className="rounded border border-rose-500/30 bg-rose-500/10 px-1 py-0.5 text-[8px] font-black text-rose-600">{t('pv_nearby_fit_over', 'Over capacity')}</span>;
    }
    if (fit === 'unverified') {
      return <span className="rounded border border-slate-500/30 bg-slate-500/10 px-1 py-0.5 text-[8px] font-black text-text-secondary">{t('pv_nearby_fit_unverified', 'Capacity unverified')}</span>;
    }
    return <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-0.5 text-[8px] font-black text-emerald-600">{t('pv_nearby_fit_fits', 'Fits')}</span>;
  };

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm" aria-label={t('pv_nearby', 'Nearby')}>
      <header className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Navigation className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[11px] font-black text-text-primary">
            {t('pv_nearby', 'Nearby')}
            {data?.referenceCity ? <span className="font-semibold text-text-secondary"> · {data.referenceCity}</span> : null}
            {data?.nextCity ? <span className="font-semibold text-text-muted"> → {data.nextCity}</span> : null}
          </h3>
          <p className="truncate text-[9px] text-text-secondary">{t('pv_nearby_hint', 'Loads available around this stop (straight-line distances).')}</p>
        </div>
        <label className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-text-secondary">
          {t('pv_nearby_radius', 'Radius')}
          <select
            value={String(radiusKm)}
            onChange={(event) => onRadiusChange(Number(event.target.value))}
            className="h-6 rounded-md border border-border bg-card px-1 text-[10px] font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={t('pv_nearby_radius', 'Radius')}
          >
            {[25, 50, 100, 200].map((radius) => (
              <option key={radius} value={radius}>{radius} km</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
          aria-label={t('pv_stop_close', 'Close')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-bold text-text-secondary">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            {t('pv_suggestions_loading', 'Calculating suggestions…')}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-1 py-6 text-center">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-[10px] font-bold text-text-primary">{error}</p>
          </div>
        ) : candidates.length === 0 ? (
          <p className="py-6 text-center text-[10px] text-text-secondary">{t('pv_nearby_empty', 'No orders available within the radius.')}</p>
        ) : (
          <ul className="space-y-1">
            {candidates.map((candidate: any) => {
              const busy = busyOrderId === candidate.orderId;
              return (
                <li key={candidate.orderId} className="rounded-lg border border-border bg-surface/40 p-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" onClick={() => onOpenOrder?.(candidate.orderId)} className="min-w-0 text-left">
                      <span className="block truncate text-[11px] font-black text-text-primary">{candidate.orderNumber || '—'}</span>
                      <span className="block truncate text-[9px] text-text-secondary">{candidate.clientName || '—'}</span>
                    </button>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-[10px] font-black tabular-nums text-text-primary">{fmtNumber(candidate.pickupDistanceKm, 1)} km</span>
                      {candidate.onTheWay && (
                        <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1 text-[8px] font-black uppercase text-emerald-600">
                          {t('pv_nearby', 'Nearby')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                    <MapPin className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                    <span className="truncate">{candidate.pickup?.city || '—'}</span>
                    <ArrowRight className="h-2.5 w-2.5 shrink-0 text-text-muted" />
                    <span className="truncate">{candidate.delivery?.city || '—'}</span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-text-muted">
                    {candidate.weightKg ? <span>{fmtNumber(candidate.weightKg)} kg</span> : null}
                    {candidate.pallets ? <span>· {candidate.pallets} plt</span> : null}
                    {candidate.ldm ? <span>· {fmtNumber(candidate.ldm, 1)} ldm</span> : null}
                    {fitBadge(candidate.capacityFit)}
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[9px] font-semibold text-emerald-600">
                      ≈ {fmtNumber(candidate.emptyKmSavingEstimateKm, 1)} {t('pv_nearby_saving', 'empty km saved (estimate)')}
                    </span>
                    <button
                      type="button"
                      onClick={() => onAdd(candidate.orderId)}
                      disabled={busy}
                      className="flex h-6 items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 text-[9px] font-black text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      {t('pv_nearby_add', 'Add to trip')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border px-2.5 py-1.5 text-[8.5px] font-semibold text-text-muted">
        <span>{t('pv_nearby_basis', 'Great-circle distance, not road distance.')}</span>
        {Boolean(data?.withoutCoordinates) && (
          <span className="shrink-0" title={t('pv_nearby_no_geo', '{{count}} orders without coordinates cannot be searched.', { count: data?.withoutCoordinates })}>
            {data?.withoutCoordinates} ⚠
          </span>
        )}
      </footer>
    </section>
  );
}
