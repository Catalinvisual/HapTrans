import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock3, Loader2, RefreshCw, TrafficCone } from 'lucide-react';
import { planningApi } from '../../lib/planningApi';
import { providerStatusMessage } from '../../lib/providerStatus';

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-slate-500/15 text-slate-600',
  moderate: 'bg-amber-500/15 text-amber-600',
  major: 'bg-orange-500/15 text-orange-600',
  critical: 'bg-rose-500/15 text-rose-600',
};

export default function TrafficIncidentsModal({ trip, onClose }: { trip: any; onClose: () => void }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!trip?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await planningApi.checkTripTraffic(trip.id);
      setData(response);
    } catch (e: any) {
      setError(e?.response?.data?.message || t('traffic_check_failed', 'Could not query live traffic'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [trip?.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const delay = Number(data?.currentDelayMinutes ?? data?.delayMinutes ?? 0) || 0;
  const incidents = Array.isArray(data?.incidents) ? data.incidents : [];
  const lastUpdate = data?.calculatedAt ? new Date(data.calculatedAt) : null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border bg-surface/50 px-4 py-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-text-primary">
              <TrafficCone className="h-4 w-4 text-primary" />
              {t('up_traffic_incidents', 'Traffic & incidents')}
            </h2>
            <p className="text-[10px] text-text-secondary">{trip?.tripNumber || '—'}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={load} disabled={loading} className="btn-secondary p-1.5 text-[10px] font-bold" title={t('refresh', 'Refresh')}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" onClick={onClose} className="btn-secondary px-2 py-1 text-[10px] font-bold">
              {t('close', 'Close')}
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-text-secondary">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-xs">{t('loading', 'Loading…')}</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          ) : !data?.available ? (
            <div className="rounded-xl border border-border bg-surface/60 p-4 text-center">
              <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-amber-500" />
              <p className="text-xs font-bold text-text-primary">
                {providerStatusMessage(
                  t,
                  data?.code,
                  data?.message || t('traffic_unavailable', 'Live traffic unavailable'),
                )}
              </p>
              <p className="mt-1 text-[10px] text-text-secondary">
                {t('up_eta_unavailable', 'Live ETA unavailable until the provider returns traffic data.')}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
                  <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide text-text-secondary">
                    <Clock3 className="h-3 w-3" /> {t('traffic_delay', 'Delay')}
                  </div>
                  <div className={`mt-0.5 text-sm font-black ${delay > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                    {delay > 0 ? `+${delay} min` : t('normal_traffic', 'Normal traffic')}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface/60 px-3 py-2">
                  <div className="text-[9px] font-black uppercase tracking-wide text-text-secondary">
                    {t('traffic_congestion', 'Congestion')}
                  </div>
                  <div className="mt-0.5 text-sm font-black capitalize text-text-primary">
                    {String(data?.congestionLevel || '—').replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              {incidents.length === 0 ? (
                <p className="rounded-xl border border-border bg-surface/60 p-3 text-xs text-text-secondary">
                  {t('traffic_no_incidents', 'No incidents reported on this corridor by the provider.')}
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {incidents.map((incident: any, index: number) => (
                    <li key={incident.id || index} className="rounded-xl border border-border bg-card p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-bold text-text-primary">{incident.description || incident.type}</p>
                          <p className="text-[9px] uppercase tracking-wide text-text-muted">{incident.type || '—'}</p>
                        </div>
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${SEVERITY_STYLES[incident.severity] || SEVERITY_STYLES.low}`}>
                          {incident.severity || 'low'}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {lastUpdate && !isNaN(lastUpdate.getTime()) && (
            <p className="mt-3 text-[9px] text-text-muted">
              {t('up_eta_last_update', 'Last GPS update')}: {lastUpdate.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
