import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Loader2, RefreshCw } from 'lucide-react';
import { planningApi } from '../../lib/planningApi';
import { appLocale, fmtNumber } from '../../lib/format';
import { formatDelay } from '../../lib/formatDuration';

/**
 * Live ETA for one trip, fetched from the planning endpoint that derives it
 * from the last GPS position and truck routing.
 */
export function useTripLiveEta(tripId?: string | null) {
  const [eta, setEta] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!tripId) {
      setEta(null);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setEta(await planningApi.getTripLiveEta(tripId));
    } catch {
      setEta(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { eta, loading, failed, reload: load };
}

/** The live ETA entry that belongs to a stop (same id, else same sequence). */
export function etaStopForStop(eta: any, stop: any) {
  if (!eta?.stops?.length || !stop) return null;
  return (
    eta.stops.find(
      (s: any) =>
        (stop.id && s.stopId === stop.id) ||
        (stop.sequence != null && s.sequence === stop.sequence),
    ) || null
  );
}

const when = (value: any) => {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleString(appLocale(), {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const tone = (minutes: any) =>
  Number(minutes) > 0 ? 'text-rose-600' : Number(minutes) === 0 ? 'text-emerald-600' : 'text-text-muted';

function deviationText(minutes: any, onTime: string) {
  if (minutes === null || minutes === undefined) return '';
  const value = Number(minutes);
  if (!Number.isFinite(value)) return '';
  return Math.round(value) === 0 ? onTime : formatDelay(value);
}

/** One line of ETA information under a stop, in the trip route list. */
export function StopEtaLine({ etaStop }: { etaStop: any }) {
  const { t } = useTranslation();
  if (!etaStop?.liveEta) return null;
  const planned = etaStop.plannedEta;
  const diff = deviationText(etaStop.deviationVsPlannedMin ?? etaStop.deviationMin, t('up_eta_on_time', 'On time'));
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg bg-primary/5 border border-primary/15 px-2 py-1 text-[10px]">
      <span className="flex items-center gap-1 font-bold text-text-primary">
        <Clock className="w-2.5 h-2.5 text-primary" />
        {t('up_eta_calculated', 'Calculated ETA')}: <span className="tabular-nums">{when(etaStop.liveEta)}</span>
      </span>
      <span className="text-text-muted">
        {t('up_eta_planned', 'Planned ETA')}:{' '}
        <b className="font-semibold text-text-secondary tabular-nums">
          {planned ? when(planned) : t('up_eta_not_planned', 'Not planned')}
        </b>
      </span>
      {diff && <span className={`font-black tabular-nums ${tone(etaStop.deviationVsPlannedMin ?? etaStop.deviationMin)}`}>{diff}</span>}
    </div>
  );
}

interface TripEtaPanelProps {
  eta: any;
  loading?: boolean;
  failed?: boolean;
  onRefresh?: () => void;
  /** Trip the ETA is fetched for; an order without a trip has no ETA. */
  tripId?: string | null;
  /** Only show the ETA of this stop (used by an order to show its delivery ETA). */
  focusStopId?: string | null;
}

/** Live ETA card: remaining distance, GPS freshness and the ETA of every remaining stop. */
export function TripEtaPanel({ eta, loading, failed, onRefresh, tripId, focusStopId }: TripEtaPanelProps) {
  const { t } = useTranslation();
  const allStops: any[] = eta?.available ? eta.stops || [] : [];
  const focused = focusStopId
    ? allStops.find((s: any) => s.stopId === focusStopId) || allStops[allStops.length - 1]
    : null;
  const visibleStops = focusStopId ? (focused ? [focused] : []) : allStops;
  const lastGps = eta?.lastGpsAt ? when(eta.lastGpsAt) : '';
  const remainingKm = focusStopId ? focused?.cumulativeDistanceKm : eta?.totalRemainingKm;

  return (
    <div className="rounded-xl border border-border bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-text-secondary">
          <Clock className="w-3 h-3 text-primary" />
          {t('up_eta_title', 'Live ETA')}
          {eta?.available && (
            <span
              className={`px-1 py-0.5 rounded text-[8px] font-black uppercase ${
                eta.etaType === 'live_gps'
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-amber-500/15 text-amber-600'
              }`}
            >
              {eta.etaType === 'live_gps'
                ? t('up_eta_fresh', 'Live GPS')
                : eta.etaType === 'stale_gps'
                  ? t('up_eta_stale_label', 'Stale GPS')
                  : t('up_eta_untimed_label', 'No GPS timestamp')}
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-bold text-text-secondary hover:text-text-primary disabled:opacity-60"
            title={t('up_eta_refresh', 'Update ETA')}
            aria-label={t('up_eta_refresh', 'Update ETA')}
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            {t('up_eta_refresh', 'Update ETA')}
          </button>
        )}
      </div>

      {loading && !eta ? (
        <div className="flex items-center gap-2 py-2 text-[11px] text-text-muted">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          …
        </div>
      ) : tripId === null || tripId === undefined ? (
        <p className="mt-1.5 text-[11px] text-text-muted">{t('up_eta_no_trip', 'The order is not planned on a trip yet, so there is no ETA.')}</p>
      ) : failed || (eta && !eta.available) ? (
        <p className="mt-1.5 text-[11px] text-text-muted">
          {eta?.reason === 'provider_unavailable'
            ? t('up_eta_unavailable', 'Live ETA unavailable — routing provider request failed.')
            : t('up_eta_no_gps_fallback', 'Live GPS ETA is unavailable. Planned ETA remains available in the stop table.')}
        </p>
      ) : !eta ? null : visibleStops.length === 0 ? (
        <p className="mt-1.5 text-[11px] text-text-muted">{t('up_eta_no_stops', 'All stops are completed; there is no remaining ETA.')}</p>
      ) : (
        <>
          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-text-secondary">
            <span>
              {t('up_eta_remaining', 'Remaining distance')}:{' '}
              <b className="text-text-primary">{fmtNumber(remainingKm, 0)} km</b>
            </span>
            <span>
              {eta.lastGpsAt ? t('up_eta_last_update', 'Last GPS update') : t('up_eta_last_position', 'Last known position')}:{' '}
              <b className="text-text-primary">
                {lastGps || t('up_eta_no_timestamp', 'no timestamp')}
              </b>
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {visibleStops.map((stop: any) => {
              const diff = deviationText(stop.deviationVsPlannedMin ?? stop.deviationMin, t('up_eta_on_time', 'On time'));
              return (
                <div key={stop.stopId || stop.sequence} className="rounded-lg border border-border/50 bg-card/60 px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="truncate text-text-secondary">
                      #{stop.sequence} {stop.city || stop.companyName || t('up_eta_stop', 'Stop')}
                    </span>
                    <span className="tabular-nums font-black text-text-primary">{when(stop.liveEta)}</span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[9px]">
                    <span className="text-text-muted">
                      {t('up_eta_planned', 'Planned ETA')}:{' '}
                      <b className="font-semibold text-text-secondary tabular-nums">
                        {stop.plannedEta ? when(stop.plannedEta) : t('up_eta_not_planned', 'Not planned')}
                      </b>
                    </span>
                    {diff && <span className={`font-black tabular-nums ${tone(stop.deviationVsPlannedMin ?? stop.deviationMin)}`}>{diff}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {eta.etaType === 'stale_gps' && (
            <p className="mt-1.5 text-[10px] text-amber-600">
              {t('up_eta_stale', 'GPS position is older than 15 minutes — treat this ETA as stale.')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default TripEtaPanel;
