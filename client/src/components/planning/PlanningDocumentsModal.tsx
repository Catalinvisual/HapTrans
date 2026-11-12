import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { FileText, Loader2, Printer, X } from 'lucide-react';
import type { CompanySettings } from '../../store/settingsStore';
import { generateCmrPdf, generateDaySheetPdf } from '../../lib/planningDocumentsPdf';

/**
 * Bulk documents for the current selection: one CMR per transport order and one
 * day sheet per trip. Generated as real PDFs (same company header as the rest of
 * the app), sequentially, so the browser is not asked to build thirty documents
 * at once.
 */
export default function PlanningDocumentsModal({
  open,
  onClose,
  trips = [],
  company = null,
}: {
  open: boolean;
  onClose: () => void;
  trips?: any[];
  company?: CompanySettings | null;
}) {
  const { t } = useTranslation();
  const [includeCmr, setIncludeCmr] = useState(true);
  const [includeDaySheet, setIncludeDaySheet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const orders = useMemo(
    () => (trips || []).flatMap((trip: any) => (trip?.orders || []).filter((order: any) => order?.id)),
    [trips],
  );

  if (!open) return null;

  const total = (includeCmr ? orders.length : 0) + (includeDaySheet ? trips.length : 0);

  const generate = async () => {
    if (!total) return;
    setBusy(true);
    let done = 0;
    try {
      for (const trip of trips) {
        if (includeDaySheet) {
          setProgress(`${done + 1}/${total} · ${trip.tripNumber || trip.id}`);
          await generateDaySheetPdf(trip, company);
          done += 1;
        }
        if (includeCmr) {
          for (const order of trip.orders || []) {
            if (!order?.id) continue;
            setProgress(`${done + 1}/${total} · ${order.orderNumber || order.id}`);
            await generateCmrPdf(order, company);
            done += 1;
          }
        }
      }
      toast.success(t('doc_generated', 'Documents generated: {{count}}', { count: done }));
      onClose();
    } catch (error: any) {
      toast.error(error?.message || t('doc_failed', 'The documents could not be generated.'));
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm print:hidden"
      onClick={() => !busy && onClose()}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('doc_title', 'Documents')}
      >
        <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[12px] font-black text-text-primary">{t('doc_title', 'Documents')}</h2>
            <p className="truncate text-[9px] text-text-muted">
              {trips.length} {t('timeline_trips_short', 'trips')} · {orders.length} {t('jsx_orders', 'orders')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md p-1 text-text-muted transition-colors hover:bg-surface hover:text-text-primary disabled:opacity-40"
            aria-label={t('pv_stop_close', 'Close')}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-2 p-3">
          <label className="flex items-start gap-2 rounded-lg border border-border bg-surface/50 p-2">
            <input
              type="checkbox"
              checked={includeCmr}
              onChange={(event) => setIncludeCmr(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-orange-500"
            />
            <span className="min-w-0">
              <span className="block text-[11px] font-black text-text-primary">
                {t('doc_cmr', 'CMR / vrachtbrief')}
              </span>
              <span className="block text-[9px] text-text-secondary">
                {t('doc_cmr_hint', 'One document per transport order, with signature blocks.')} · {orders.length}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2 rounded-lg border border-border bg-surface/50 p-2">
            <input
              type="checkbox"
              checked={includeDaySheet}
              onChange={(event) => setIncludeDaySheet(event.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 accent-orange-500"
            />
            <span className="min-w-0">
              <span className="block text-[11px] font-black text-text-primary">
                {t('doc_day_sheet', 'Day sheet per truck')}
              </span>
              <span className="block text-[9px] text-text-secondary">
                {t('doc_day_sheet_hint', 'Stops, windows, ETA and cargo totals for the driver.')} · {trips.length}
              </span>
            </span>
          </label>

          {total === 0 && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-700">
              {t('doc_empty', 'Select at least one trip or order first.')}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
          <span className="truncate text-[9px] text-text-muted">{progress || t('doc_print_hint', 'Downloads as PDF; print or attach as needed.')}</span>
          <button
            type="button"
            onClick={generate}
            disabled={busy || total === 0}
            className="flex h-7 items-center gap-1.5 rounded-lg bg-orange-500 px-3 text-[11px] font-black text-white transition-colors hover:bg-orange-600 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
            {t('doc_generate', 'Generate')} ({total})
          </button>
        </footer>
      </div>
    </div>
  );
}
