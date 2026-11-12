import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  Loader2,
  MapPin,
  Sparkles,
  Truck as TruckIcon,
  X,
} from 'lucide-react';
import { fmtNumber } from '../../lib/format';
import { groupSuggestions } from '../../lib/planningPremium';

/**
 * "Suggestions" — the backend already ranks unplanned orders against trucks by
 * cost. This panel only renders that ranking and hands one order/truck pair to
 * the normal assignment review, so the preflight still decides feasibility.
 */
export default function PlanningSuggestionsPanel({
  open,
  onClose,
  loading,
  error,
  data,
  busyId,
  onApply,
  onOpenOrder,
}: {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error?: string | null;
  data?: { suggestions?: any[]; summary?: any } | null;
  busyId?: string | null;
  onApply: (suggestion: any) => void;
  onOpenOrder?: (orderId: string) => void;
}) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const suggestions = data?.suggestions || [];
  const groups = useMemo(() => groupSuggestions(suggestions), [suggestions]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[10040] flex justify-end bg-slate-950/40 backdrop-blur-[2px] print:hidden" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('pv_suggestions', 'Suggestions')}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-black text-text-primary">
              <Sparkles className="h-4 w-4 text-amber-500" />
              {t('pv_suggestions', 'Suggestions')}
              {suggestions.length > 0 && (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-1.5 text-[10px] font-black text-primary">
                  {suggestions.length}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[10px] leading-snug text-text-secondary">
              {t('pv_suggestions_hint', 'Unplanned orders with a matching truck, ranked by cost.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text-primary"
            aria-label={t('pv_stop_close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-[11px] font-bold">{t('pv_suggestions_loading', 'Calculating suggestions…')}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-[11px] font-bold text-text-primary">{t('pv_suggestions_error', 'Suggestions could not be loaded.')}</p>
              <p className="max-w-xs text-[10px] text-text-secondary">{error}</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="py-16 text-center text-[11px] text-text-secondary">
              {t('pv_suggestions_empty', 'No suggestions for the selected range.')}
            </div>
          ) : (
            <div className="space-y-2">
              {groups.map((group) => {
                const isCollapsed = collapsed[group.truckId] === true;
                return (
                  <section key={group.truckId} className="overflow-hidden rounded-xl border border-border bg-surface/40">
                    <button
                      type="button"
                      onClick={() => setCollapsed((prev) => ({ ...prev, [group.truckId]: !isCollapsed }))}
                      className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-surface"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                        <TruckIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-black text-text-primary">{group.plateNumber}</span>
                        {group.driver && <span className="block truncate text-[9px] text-text-secondary">{group.driver}</span>}
                      </span>
                      <span className="rounded-full border border-border bg-card px-1.5 text-[9px] font-black text-text-secondary">
                        {group.items.length}
                      </span>
                      <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>

                    {!isCollapsed && (
                      <ul className="space-y-1.5 border-t border-border/70 p-1.5">
                        {group.items.map((suggestion: any) => {
                          const busy = busyId === suggestion.id;
                          return (
                            <li key={suggestion.id} className="rounded-lg border border-border bg-card p-2">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenOrder?.(suggestion.orderId)}
                                  className="min-w-0 text-left"
                                >
                                  <span className="block truncate text-[11px] font-black text-text-primary">{suggestion.orderNumber || '—'}</span>
                                  {suggestion.clientName && (
                                    <span className="block truncate text-[9px] text-text-secondary">{suggestion.clientName}</span>
                                  )}
                                </button>
                                <span className="shrink-0 text-[9px] font-bold tabular-nums text-text-muted">
                                  {suggestion.distance != null ? `${fmtNumber(suggestion.distance, 0)} km` : ''}
                                </span>
                              </div>

                              <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-text-secondary">
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                                <span className="truncate">{suggestion.origin || '—'}</span>
                                <ArrowRight className="h-2.5 w-2.5 shrink-0 text-text-muted" />
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-emerald-500" />
                                <span className="truncate">{suggestion.destination || '—'}</span>
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] text-text-muted">
                                {suggestion.cargo?.weight ? <span>{fmtNumber(suggestion.cargo.weight)} kg</span> : null}
                                {suggestion.cargo?.pallets ? <span>· {suggestion.cargo.pallets} plt</span> : null}
                                {suggestion.date && <span>· {suggestion.date}</span>}
                                {suggestion.reason && <span className="truncate" title={suggestion.reason}>· {suggestion.reason}</span>}
                              </div>

                              <div className="mt-1.5 flex items-center justify-between gap-2">
                                <span className="truncate text-[9px] text-text-muted">
                                  {suggestion.window?.start
                                    ? `${new Date(suggestion.window.start).toLocaleDateString()} ${new Date(suggestion.window.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                    : ''}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onApply(suggestion)}
                                  disabled={busy}
                                  className="flex h-6 items-center gap-1 rounded-md bg-primary px-2 text-[10px] font-black text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
                                >
                                  {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                  {t('pv_suggestions_apply', 'Plan it')}
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </div>

        {data?.summary && (
          <footer className="flex items-center justify-between gap-2 border-t border-border bg-surface/50 px-3 py-2 text-[9px] font-semibold text-text-secondary">
            <span>
              {fmtNumber(data.summary.unassignedCount || 0, 0)} {t('jsx_orders', 'Orders')}
              {' · '}
              {fmtNumber(data.summary.availableTrucks || 0, 0)} {t('tb_trucks', 'Trucks')}
            </span>
            {data.summary.suggestedRate != null && (
              <span className="font-black text-text-primary">{data.summary.suggestedRate}%</span>
            )}
          </footer>
        )}
      </aside>
    </div>,
    document.body,
  );
}
