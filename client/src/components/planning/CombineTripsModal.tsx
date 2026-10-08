import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, GitMerge, Check, AlertTriangle, ArrowRight, Loader2, Truck as TruckIcon, User, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmtNumber, fmtMoney } from '../../lib/format';
import { useConfirm } from '../SaveConfirmProvider';

interface CombineTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trips: any[];
  initialTripId?: string | null;
  onCombine: (sourceTripId: string, targetTripId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CombineTripsModal({
  isOpen,
  onClose,
  trips,
  initialTripId,
  onCombine,
  isLoading,
}: CombineTripsModalProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();

  // Eligible trips: only planning/planned/assigned
  const eligibleTrips = useMemo(() => {
    return (trips || []).filter((tr: any) =>
      ['planning', 'planned', 'assigned'].includes(String(tr.status || '').toLowerCase())
    );
  }, [trips]);

  const [targetTripId, setTargetTripId] = useState<string>(() => {
    if (initialTripId && eligibleTrips.some((tr) => tr.id === initialTripId)) {
      return initialTripId;
    }
    return eligibleTrips[0]?.id || '';
  });

  const [sourceTripId, setSourceTripId] = useState<string>(() => {
    const candidates = eligibleTrips.filter((tr) => tr.id !== targetTripId);
    return candidates[0]?.id || '';
  });

  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetTrip = eligibleTrips.find((tr) => tr.id === targetTripId);
  const sourceTrip = eligibleTrips.find((tr) => tr.id === sourceTripId);

  // Compute combined metrics
  const getTripCargo = (tr: any) => {
    const orders = (tr?.orders || []).map((o: any) => o?.order || o).filter(Boolean);
    const weight = orders.reduce((sum: number, o: any) => {
      const w = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.weightKg) || 0), 0) || Number(o.weightKg || o.weight) || 0;
      return sum + w;
    }, 0);
    const pallets = orders.reduce((sum: number, o: any) => {
      const p = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.quantity) || 0), 0) || Number(o.pallets) || 0;
      return sum + p;
    }, 0);
    const ldm = orders.reduce((sum: number, o: any) => {
      const l = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.ldm) || 0), 0) || Number(o.loadingMeters || o.ldm) || 0;
      return sum + l;
    }, 0);
    return { ordersCount: orders.length, weight, pallets, ldm };
  };

  const targetCargo = getTripCargo(targetTrip);
  const sourceCargo = getTripCargo(sourceTrip);

  const combinedOrdersCount = targetCargo.ordersCount + sourceCargo.ordersCount;
  const combinedWeight = targetCargo.weight + sourceCargo.weight;
  const combinedPallets = targetCargo.pallets + sourceCargo.pallets;
  const combinedLdm = targetCargo.ldm + sourceCargo.ldm;
  const combinedStopsCount = (targetTrip?.stops?.length || 0) + (sourceTrip?.stops?.length || 0);

  // Validation checks
  const sameTruck =
    !targetTrip?.truck?.id ||
    !sourceTrip?.truck?.id ||
    targetTrip?.truck?.id === sourceTrip?.truck?.id;

  const isDifferentTrips = targetTripId && sourceTripId && targetTripId !== sourceTripId;
  const isValid = isDifferentTrips && sameTruck && targetTrip && sourceTrip;

  const handleConfirm = async () => {
    if (!isValid || submitting || isLoading) return;

    const ok = await confirm({
      type: 'warning',
      title: t('combine_confirm', 'Confirm Merge'),
      message: `${t('combine_trips_desc', 'Merge two compatible trips into a single optimized route.')} (${sourceTrip.tripNumber || sourceTrip.id} → ${targetTrip.tripNumber || targetTrip.id})`,
      confirmText: t('combine_trips_btn', 'Combine Trips'),
      cancelText: t('cancel', 'Cancel'),
    });

    if (!ok) return;

    setSubmitting(true);
    try {
      await onCombine(sourceTripId, targetTripId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {t('combine_trips_title', 'Combine Trips')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {t('combine_trips_desc', 'Merge two compatible trips into a single optimized route.')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {eligibleTrips.length < 2 ? (
            <div className="p-6 text-center text-text-secondary">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <p className="font-bold text-text-primary">{t('combine_validation_count', 'Select at least 2 trips to combine.')}</p>
              <p className="text-xs mt-1">There are not enough active trips in planning state to perform a merge.</p>
            </div>
          ) : (
            <>
              {/* Trip Selection Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Trip */}
                <div className="border border-border/80 rounded-xl p-4 bg-surface/30">
                  <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
                    {t('combine_source_trip', 'Source Trip (will be merged & removed)')}
                  </label>
                  <select
                    value={sourceTripId}
                    onChange={(e) => setSourceTripId(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {eligibleTrips.map((tr) => (
                      <option key={tr.id} value={tr.id} disabled={tr.id === targetTripId}>
                        {tr.tripNumber || tr.id} ({tr.truck?.plateNumber || 'No truck'}) · {tr.orders?.length || 0} orders
                      </option>
                    ))}
                  </select>

                  {sourceTrip && (
                    <div className="mt-3 text-xs space-y-1.5 text-text-secondary">
                      <p><span className="font-semibold text-text-primary">Status:</span> {sourceTrip.status}</p>
                      <p><span className="font-semibold text-text-primary">Truck:</span> {sourceTrip.truck?.plateNumber || '—'}</p>
                      <p><span className="font-semibold text-text-primary">Driver:</span> {sourceTrip.driver?.name || sourceTrip.truck?.driver?.name || '—'}</p>
                      <p><span className="font-semibold text-text-primary">Weight:</span> {fmtNumber(sourceCargo.weight)} kg · {sourceCargo.pallets} pal</p>
                    </div>
                  )}
                </div>

                {/* Target Trip */}
                <div className="border border-border/80 rounded-xl p-4 bg-primary/5 border-primary/20">
                  <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                    {t('combine_target_trip', 'Target Trip (will receive orders)')}
                  </label>
                  <select
                    value={targetTripId}
                    onChange={(e) => setTargetTripId(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold text-text-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  >
                    {eligibleTrips.map((tr) => (
                      <option key={tr.id} value={tr.id} disabled={tr.id === sourceTripId}>
                        {tr.tripNumber || tr.id} ({tr.truck?.plateNumber || 'No truck'}) · {tr.orders?.length || 0} orders
                      </option>
                    ))}
                  </select>

                  {targetTrip && (
                    <div className="mt-3 text-xs space-y-1.5 text-text-secondary">
                      <p><span className="font-semibold text-text-primary">Status:</span> {targetTrip.status}</p>
                      <p><span className="font-semibold text-text-primary">Truck:</span> {targetTrip.truck?.plateNumber || '—'}</p>
                      <p><span className="font-semibold text-text-primary">Driver:</span> {targetTrip.driver?.name || targetTrip.truck?.driver?.name || '—'}</p>
                      <p><span className="font-semibold text-text-primary">Weight:</span> {fmtNumber(targetCargo.weight)} kg · {targetCargo.pallets} pal</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Warnings */}
              {!sameTruck && (
                <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{t('combine_validation_diff_truck', 'Trips use different vehicles and cannot be combined.')}</span>
                </div>
              )}

              {/* Result Preview Strip */}
              {isValid && (
                <div className="p-4 rounded-xl bg-surface/60 border border-border space-y-3">
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Combined Result Preview
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">
                      Compatible
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Orders</p>
                      <p className="text-base font-black text-text-primary mt-0.5">{combinedOrdersCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Weight</p>
                      <p className="text-base font-black text-text-primary mt-0.5">{fmtNumber(combinedWeight)} kg</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Total Pallets</p>
                      <p className="text-base font-black text-text-primary mt-0.5">{combinedPallets} pal</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Est. Stops</p>
                      <p className="text-base font-black text-text-primary mt-0.5">{combinedStopsCount} stops</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-bold"
          >
            {t('cancel', 'Cancel')}
          </button>
          <button
            type="button"
            disabled={!isValid || submitting || isLoading}
            onClick={handleConfirm}
            className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('processing', 'Processing…')}</span>
              </>
            ) : (
              <>
                <GitMerge className="w-4 h-4" />
                <span>{t('combine_trips_btn', 'Combine Trips')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
