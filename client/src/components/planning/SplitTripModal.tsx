import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, SplitSquareHorizontal, CheckSquare, Square, Package, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fmtNumber, fmtMoney } from '../../lib/format';
import { useConfirm } from '../SaveConfirmProvider';

interface SplitTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: any;
  onSplit: (tripId: string, orderIds: string[]) => Promise<void>;
  isLoading?: boolean;
}

export default function SplitTripModal({ isOpen, onClose, trip, onSplit, isLoading }: SplitTripModalProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const orders = useMemo(() => {
    return (trip?.orders || []).map((o: any) => o?.order || o).filter((o: any) => o && o.id);
  }, [trip]);

  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !trip) return null;

  const toggleOrder = (orderId: string) => {
    const next = new Set(selectedOrderIds);
    if (next.has(orderId)) next.delete(orderId);
    else next.add(orderId);
    setSelectedOrderIds(next);
  };

  const selectAll = () => {
    // Select all except one to remain valid
    if (orders.length > 1) {
      setSelectedOrderIds(new Set(orders.slice(1).map((o: any) => o.id)));
    }
  };

  const deselectAll = () => {
    setSelectedOrderIds(new Set());
  };

  const selectedOrders = orders.filter((o: any) => selectedOrderIds.has(o.id));

  // Compute metrics for selected orders
  const selectedWeight = selectedOrders.reduce((sum: number, o: any) => {
    const w = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.weightKg) || 0), 0) || Number(o.weightKg || o.weight) || 0;
    return sum + w;
  }, 0);

  const selectedPallets = selectedOrders.reduce((sum: number, o: any) => {
    const p = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.quantity) || 0), 0) || Number(o.pallets) || 0;
    return sum + p;
  }, 0);

  const selectedLdm = selectedOrders.reduce((sum: number, o: any) => {
    const l = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.ldm) || 0), 0) || Number(o.loadingMeters || o.ldm) || 0;
    return sum + l;
  }, 0);

  // Count stops associated with selected orders
  const selectedStopsCount = selectedOrders.reduce((sum: number, o: any) => {
    return sum + (o.stops?.length || 2);
  }, 0);

  const isNoneSelected = selectedOrderIds.size === 0;
  const isAllSelected = selectedOrderIds.size === orders.length && orders.length > 0;
  const isValid = !isNoneSelected && !isAllSelected;

  const handleConfirm = async () => {
    if (!isValid || submitting || isLoading) return;

    const ok = await confirm({
      type: 'warning',
      title: t('split_trip_confirm', 'Confirm Split'),
      message: `${t('split_trip_desc', 'Select orders to move into a new planning trip.')} (${selectedOrderIds.size} ${t('orders', 'orders')})`,
      confirmText: t('split_trip_btn', 'Split Trip'),
      cancelText: t('cancel', 'Cancel'),
    });

    if (!ok) return;

    setSubmitting(true);
    try {
      await onSplit(trip.id, Array.from(selectedOrderIds));
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
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <SplitSquareHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <span>{t('split_trip_title', 'Split Trip')}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-black">
                  {trip.tripNumber || trip.id}
                </span>
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                {t('split_trip_desc', 'Select orders to move into a new planning trip.')}
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

        {/* Orders Selection Table */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-text-secondary">
              {orders.length} {t('orders', 'Orders on this trip')}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-primary hover:underline font-semibold"
              >
                {t('select_split_preset', 'Select all except one')}
              </button>
              <span className="text-text-muted">·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-text-secondary hover:text-text-primary hover:underline font-semibold"
              >
                {t('deselect_all', 'Deselect all')}
              </button>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
            {orders.map((o: any, idx: number) => {
              const isSelected = selectedOrderIds.has(o.id);
              const pickup = (o.stops || []).find((s: any) => s.type === 'pickup') || o.stops?.[0];
              const dropoff = (o.stops || []).filter((s: any) => s.type === 'delivery' || s.type === 'dropoff').pop() || o.stops?.[o.stops?.length - 1];
              const w = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.weightKg) || 0), 0) || Number(o.weightKg || o.weight) || 0;
              const p = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.quantity) || 0), 0) || Number(o.pallets) || 0;
              const l = (o.cargoItems || []).reduce((s: number, c: any) => s + (Number(c.ldm) || 0), 0) || Number(o.loadingMeters || o.ldm) || 0;

              return (
                <div
                  key={o.id}
                  onClick={() => toggleOrder(o.id)}
                  className={`p-3.5 flex items-center justify-between gap-4 cursor-pointer transition-colors select-none ${
                    isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'bg-card hover:bg-surface/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleOrder(o.id); }}
                      className="text-primary shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5 text-text-muted hover:text-text-primary" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-text-primary">{o.orderNumber || `Order #${idx + 1}`}</span>
                        {o.client?.name && (
                          <span className="text-xs font-semibold text-text-secondary truncate">
                            · {o.client.name}
                          </span>
                        )}
                        {o.customerReference && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border text-text-muted">
                            Ref: {o.customerReference}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary mt-1 truncate">
                        <span className="font-medium text-text-primary">
                          {pickup?.city || pickup?.address?.split(',')[0] || 'Pickup'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-text-muted shrink-0" />
                        <span className="font-medium text-text-primary">
                          {dropoff?.city || dropoff?.address?.split(',')[0] || 'Delivery'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div className="text-xs">
                      <p className="font-bold text-text-primary">{fmtNumber(w)} kg</p>
                      <p className="text-[10px] text-text-secondary">
                        {p > 0 ? `${p} pal` : ''} {l > 0 ? `· ${l} LDM` : ''}
                      </p>
                    </div>
                    {o.price > 0 && (
                      <span className="text-xs font-black text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-md">
                        {fmtMoney(Number(o.price), 'EUR')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validation Warnings */}
          {isNoneSelected && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('split_validation_none', 'Please select at least one order to split off.')}</span>
            </div>
          )}

          {isAllSelected && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('split_validation_all', 'Cannot split off all orders. At least one order must remain on the original trip.')}</span>
            </div>
          )}

          {/* Summary Strip */}
          <div className="p-4 rounded-xl bg-surface/60 border border-border grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t('selected_orders_count', 'Selected Orders')}</p>
              <p className="text-base font-black text-text-primary mt-0.5">{selectedOrderIds.size} / {orders.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t('selected_weight', 'Total Weight')}</p>
              <p className="text-base font-black text-text-primary mt-0.5">{fmtNumber(selectedWeight)} kg</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t('selected_pallets', 'Total Pallets')}</p>
              <p className="text-base font-black text-text-primary mt-0.5">{selectedPallets} pal</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{t('selected_stops', 'Stops Count')}</p>
              <p className="text-base font-black text-text-primary mt-0.5">{selectedStopsCount} stops</p>
            </div>
          </div>
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
                <SplitSquareHorizontal className="w-4 h-4" />
                <span>{t('split_trip_btn', 'Split Trip')} ({selectedOrderIds.size})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
