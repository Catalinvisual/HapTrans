import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fmtNumber } from '../lib/format';

const fmtDate = (value: any, locale: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

/** Dispatcher review of every persistent per-order StopTask allocation. */
export default function CargoAllocationsPanel({ trip }: { trip: any }) {
  const { t, i18n } = useTranslation();
  const [current, setCurrent] = useState<any>(trip);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setCurrent(trip), [trip]);

  const tasks = (current?.stops || [])
    .flatMap((stop: any) => (stop.tasks || []).map((task: any) => ({ ...task, stop })))
    .sort((a: any, b: any) => Number(a.stop?.sequence || 0) - Number(b.stop?.sequence || 0));

  const review = async (task: any, status: 'accepted' | 'disputed') => {
    const note = String(notes[task.id] || '').trim();
    if (status === 'disputed' && !note) {
      toast.error(t('alloc_review_note_required', 'A note is required when disputing the evidence.'));
      return;
    }
    setBusy(task.id);
    try {
      const res = await api.patch(`/trips/tasks/${task.id}/allocation-review`, { status, note });
      setCurrent(res.data);
      toast.success(t('alloc_review_saved', 'Allocation review recorded'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t('error', 'Error'));
    } finally {
      setBusy(null);
    }
  };

  if (tasks.length === 0) {
    return <div className="card p-4 text-sm text-text-secondary">{t('alloc_no_data', 'No order allocations are attached to this trip.')}</div>;
  }

  return (
    <div className="card p-5 border border-border rounded-2xl space-y-4">
      <div>
        <h3 className="font-bold text-lg text-text">{t('alloc_panel_title', 'Cargo allocations')}</h3>
        <p className="text-xs text-text-secondary mt-0.5">{t('alloc_panel_hint', 'Driver-submitted quantities and evidence are preserved; dispatch records the review decision separately.')}</p>
      </div>
      <div className="space-y-3">
        {tasks.map((task: any) => {
          const planned = Number(task.quantity ?? task.pallets ?? 0);
          const loaded = Number(task.loadedQuantity ?? 0);
          const delivered = Number(task.deliveredQuantity ?? 0);
          const rejected = Number(task.rejectedQuantity ?? 0);
          const remaining = Math.max(0, planned - delivered - rejected);
          const photos = Array.isArray(task.rejectionPhotoUrls) ? task.rejectionPhotoUrls : [];
          const reviewStatus = String(task.allocationReviewStatus || 'pending');
          const reviewer = task.allocationReviewedBy?.name || task.allocationReviewedBy?.email;
          const unit = task.quantity != null ? t('alloc_units', 'units') : t('alloc_pallets', 'pallets');
          const order = (current.orders || []).find((item: any) => String(item.id) === String(task.order?.id));
          const orderStops = order?.stops || task.order?.stops || [];
          const pickup = orderStops.find((stop: any) => ['pickup', 'load'].includes(String(stop.type || '').toLowerCase()));
          const delivery = [...orderStops].reverse().find((stop: any) => ['delivery', 'dropoff', 'unload'].includes(String(stop.type || '').toLowerCase()));
          return (
            <div key={task.id} className="rounded-xl border border-border bg-surface/30 p-3.5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="text-sm font-black text-text">
                    {t('alloc_order', 'Order')}: {task.order?.orderNumber || task.order?.id || '—'}
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {t('alloc_stop', 'Stop')}: {task.stop?.sequence ? `${task.stop.sequence} · ` : ''}{task.stop?.companyName || task.stop?.city || task.stop?.address || '—'}
                    {' · '}{t(task.type === 'unload' ? 'unloading_stop' : 'loading_stop', task.type === 'unload' ? 'Unloading' : 'Loading')}
                    {' · '}{t('alloc_unit', 'Unit')}: <b className="text-text">{unit}</b>
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{t('alloc_pickup', 'Pickup')}: <b className="text-text-secondary">{pickup?.city || pickup?.companyName || '—'}</b></span>
                    <span>{t('alloc_delivery_stop', 'Delivery')}: <b className="text-text-secondary">{delivery?.city || delivery?.companyName || '—'}</b></span>
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                  reviewStatus === 'accepted'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                    : reviewStatus === 'disputed'
                      ? 'border-red-500/30 bg-red-500/10 text-red-700'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                }`}>
                  {t(`alloc_review_${reviewStatus}`, reviewStatus === 'accepted' ? 'Accepted' : reviewStatus === 'disputed' ? 'Disputed' : 'Awaiting review')}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                {[
                  ['alloc_planned', 'Planned', planned],
                  ['alloc_loaded', 'Loaded', loaded],
                  ['alloc_delivered', 'Delivered', delivered],
                  ['alloc_rejected', 'Rejected', rejected],
                  ['alloc_remaining', 'Remaining', remaining],
                ].map(([key, label, value]) => (
                  <div key={String(key)} className="rounded-lg bg-card border border-border/70 px-2.5 py-2">
                    <span className="block text-text-muted font-bold uppercase text-[9px]">{t(String(key), String(label))}</span>
                    <b className="block text-text mt-0.5">{fmtNumber(Number(value))}</b>
                  </div>
                ))}
              </div>

              {rejected > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-2.5 text-[11px] space-y-1">
                  <div><b>{t('alloc_reason', 'Rejection reason')}:</b> {task.rejectionReason || '—'}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{t('alloc_evidence', 'Driver evidence')}:</b>
                    {photos.length === 0 ? <span>—</span> : photos.map((url: string, index: number) => (
                      <a key={`${task.id}-photo-${index}`} href={url} target="_blank" rel="noreferrer" className="font-bold text-primary underline">
                        {t('alloc_open_photo', 'Open photo')} {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-[10px] text-text-muted">
                {reviewer
                  ? `${t('alloc_reviewed_by', 'Reviewed by')}: ${reviewer} · ${fmtDate(task.allocationReviewedAt, i18n.language)}`
                  : t('alloc_pending_review', 'No dispatcher decision recorded yet.')}
                {task.allocationReviewNote ? ` · ${task.allocationReviewNote}` : ''}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <input
                  value={notes[task.id] ?? ''}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [task.id]: event.target.value }))}
                  placeholder={t('alloc_review_note_placeholder', 'Decision note (required when disputing)…')}
                  className="input text-xs flex-1 min-w-0"
                />
                <button type="button" disabled={busy === task.id} onClick={() => review(task, 'accepted')} className="btn-primary text-[11px] py-1.5 px-3 font-bold disabled:opacity-50">
                  {t('alloc_accept', 'Accept evidence')}
                </button>
                <button type="button" disabled={busy === task.id} onClick={() => review(task, 'disputed')} className="btn-secondary text-[11px] py-1.5 px-3 font-bold text-red-600 border-red-500/30 disabled:opacity-50">
                  {t('alloc_dispute', 'Dispute evidence')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}