import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import api from '../lib/api';

const RESOLUTIONS = [
  'RETURN_TO_ORIGIN', 'DELIVER_REMAINING', 'REDELIVERY',
  'AWAIT_CUSTOMER', 'REPLACEMENT', 'OTHER',
] as const;

function formatDate(value: any, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(locale, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Dispatcher review of immutable driver evidence plus a recorded resolution. */
export default function DeliveryIncidentsPanel({ tripId }: { tripId: string }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language || 'en';
  const [incidents, setIncidents] = useState<any[]>([]);
  const [resolution, setResolution] = useState<Record<string, { code: string; notes: string }>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tripId) return;
    try {
      const res = await api.get(`/trips/${tripId}/delivery-incidents`);
      setIncidents(Array.isArray(res.data) ? res.data : []);
    } catch {
      setIncidents([]);
    }
  }, [tripId]);

  useEffect(() => {
    load();
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.tripId || String(detail.tripId) === String(tripId)) load();
    };
    window.addEventListener('hapcargo:operational-update', refresh);
    return () => window.removeEventListener('hapcargo:operational-update', refresh);
  }, [load, tripId]);

  const resolve = async (incident: any) => {
    const value = resolution[incident.id] || { code: '', notes: '' };
    if (!value.code) return toast.error(t('incident_resolution', 'Dispatcher resolution'));
    if (!value.notes.trim()) return toast.error(t('incident_resolution_placeholder', 'Record the agreed operational decision…'));
    setBusyId(incident.id);
    try {
      await api.patch(`/trips/${tripId}/delivery-incidents/${incident.id}/resolution`, {
        resolutionCode: value.code,
        resolutionNotes: value.notes.trim(),
      });
      toast.success(t('incident_resolved', 'Resolution recorded'));
      await load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t('error', 'Error'));
    } finally {
      setBusyId(null);
    }
  };

  if (incidents.length === 0) {
    return <div className="card p-4 text-sm text-text-secondary">{t('incident_none', 'No delivery incidents reported')}</div>;
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => {
        const value = resolution[incident.id] || { code: '', notes: '' };
        const full = incident.outcome === 'FULL_REJECTION';
        const partial = incident.outcome === 'PARTIAL_REJECTION';
        return (
          <div key={incident.id} className="card p-4 border border-border rounded-xl space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="font-black text-text flex items-center gap-2 flex-wrap">
                  <span>{t('incident_title', 'Delivery incident')}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase border ${
                    full
                      ? 'bg-red-500/10 text-red-600 border-red-500/30'
                      : partial
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                        : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                  }`}>
                    {t(`outcome_${incident.outcome}`, incident.outcome)}
                  </span>
                </div>
                <div className="text-[11px] text-text-muted mt-1">
                  {t('incident_reported', 'Reported')}: {formatDate(incident.createdAt, locale)}
                  {incident.driver?.name ? ` · ${incident.driver.name}` : ''}
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                incident.status === 'OPEN'
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'
                  : 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
              }`}>
                {incident.status === 'OPEN'
                  ? t('incident_open', 'Awaiting dispatcher review')
                  : t('incident_resolved', 'Resolution recorded')}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div><b>{t('incident_trip', 'Trip')}:</b> {incident.tripId}</div>
              <div><b>{t('incident_order', 'Order')}:</b> {incident.order?.orderNumber || incident.orderId || '—'}</div>
              <div>
                <b>{t('incident_stop', 'Delivery stop')}:</b>{' '}
                {incident.stop
                  ? `${incident.stop.sequence ?? ''} · ${incident.stop.city || incident.stop.address || '—'}`
                  : incident.stopId || '—'}
              </div>
              <div><b>{t('incident_driver', 'Driver')}:</b> {incident.driver?.name || '—'}</div>
              <div><b>{t('incident_pallets', 'Affected pallets')}:</b> {incident.affectedPallets ?? '—'}</div>
              <div>
                <b>{t('incident_affected', 'Affected quantity')}:</b>{' '}
                {incident.affectedQuantity ?? '—'} {incident.quantityUnit || ''}
              </div>
            </div>

            {/* The driver's exact reason is the primary evidence and is never
                replaced by a generic category or a humanised enum. */}
            <div className="rounded-lg border border-red-500/25 bg-red-500/5 p-3">
              <div className="text-[10px] font-black uppercase tracking-wide text-red-600 dark:text-red-300 mb-1">
                {t('incident_request', 'Rejection reason')}
              </div>
              <div className="text-sm text-text whitespace-pre-wrap leading-relaxed">{incident.description}</div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              {incident.driverNotes && (
                <div>
                  <b className="text-text">{t('incident_driver_notes', 'Additional driver notes')}:</b>
                  <div className="text-text-secondary whitespace-pre-wrap">{incident.driverNotes}</div>
                </div>
              )}
              {incident.customerName && (
                <div><b>{t('incident_customer', 'Customer')}:</b> {incident.customerName}</div>
              )}
              {incident.customerExplanation && (
                <div className="sm:col-span-2">
                  <b>{t('incident_customer_explanation', "Customer's explanation")}:</b>
                  <div className="text-text-secondary whitespace-pre-wrap">{incident.customerExplanation}</div>
                </div>
              )}
              <div>
                <b>{t('incident_signature_refused', 'Customer refused to sign')}:</b>{' '}
                {incident.signatureRefused ? '✓' : '—'}
              </div>
              {!incident.signatureRefused && (
                <div className="text-text-secondary">{t('incident_signature_on_file', 'Customer acknowledgement available')}</div>
              )}
            </div>

            {incident.photos?.length > 0 && (
              <div>
                <div className="text-[10px] font-black uppercase tracking-wide text-text-secondary mb-1.5">
                  {t('incident_photos', 'Photographs')} ({incident.photos.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {incident.photos.map((photo: any) => (
                    <a
                      key={photo.id}
                      href={photo.url}
                      target="_blank"
                      rel="noreferrer"
                      title={photo.fileName || t('incident_photos', 'Photographs')}
                      className="block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                    >
                      <img
                        src={photo.url}
                        alt={photo.fileName || t('incident_photos', 'Photographs')}
                        className="w-24 h-24 object-cover"
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {incident.status === 'OPEN' ? (
              <div className="pt-3 border-t border-border space-y-2">
                <div className="text-xs font-black text-text">{t('incident_resolution', 'Dispatcher resolution')}</div>
                <select
                  className="input w-full"
                  value={value.code}
                  onChange={(e) => setResolution((prev) => ({ ...prev, [incident.id]: { ...value, code: e.target.value } }))}
                >
                  <option value="">{t('incident_resolution', 'Dispatcher resolution')}</option>
                  {RESOLUTIONS.map((code) => <option key={code} value={code}>{t(`resolution_${code}`, code)}</option>)}
                </select>
                <textarea
                  className="input w-full"
                  rows={3}
                  placeholder={t('incident_resolution_placeholder', 'Record the agreed operational decision…')}
                  value={value.notes}
                  onChange={(e) => setResolution((prev) => ({ ...prev, [incident.id]: { ...value, notes: e.target.value } }))}
                />
                <button
                  className="btn-primary text-sm"
                  disabled={busyId === incident.id}
                  onClick={() => resolve(incident)}
                >
                  {busyId === incident.id ? '…' : t('incident_resolve', 'Record resolution')}
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-border space-y-2 text-sm">
                <div>
                  <b>{t('incident_resolution', 'Dispatcher resolution')}:</b>{' '}
                  {t(`resolution_${incident.resolutionCode}`, incident.resolutionCode || '—')}
                </div>
                {incident.resolutionNotes && (
                  <div className="rounded-lg bg-surface p-2.5 text-text whitespace-pre-wrap">{incident.resolutionNotes}</div>
                )}
                <div className="text-xs text-text-secondary">
                  <b>{t('incident_resolved_by', 'Resolved by')}:</b> {incident.resolvedBy?.name || '—'}
                  {' · '}{formatDate(incident.resolvedAt, locale)}
                </div>
                {Array.isArray(incident.resolutionHistory) && incident.resolutionHistory.length > 0 && (
                  <div>
                    <div className="text-[10px] font-black uppercase text-text-secondary mb-1">
                      {t('incident_resolution_history', 'Resolution history')}
                    </div>
                    {incident.resolutionHistory.map((h: any) => (
                      <div key={h.id} className="text-xs text-text-secondary border-l-2 border-border pl-2 mb-1">
                        {formatDate(h.at, locale)} · {h.actorName || '—'} ·{' '}
                        {t(`resolution_${h.resolutionCode}`, h.resolutionCode || '—')}
                        {h.resolutionNotes ? ` — ${h.resolutionNotes}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
