import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Loader2, RefreshCw, Truck, User } from 'lucide-react';
import { planningApi } from '../../lib/planningApi';
import { appLocale } from '../../lib/format';

type RangeMode = 'daily' | 'weekly';

const CATEGORY_STYLES: Record<string, { bar: string; dot: string; labelKey: string }> = {
  DRIVING: { bar: 'bg-emerald-500', dot: 'bg-emerald-500', labelKey: 'up_act_driving' },
  BREAK: { bar: 'bg-amber-400', dot: 'bg-amber-400', labelKey: 'up_act_break' },
  REST: { bar: 'bg-indigo-500', dot: 'bg-indigo-500', labelKey: 'up_act_rest' },
  WORKING: { bar: 'bg-blue-500', dot: 'bg-blue-500', labelKey: 'up_act_work' },
  AVAILABILITY: { bar: 'bg-slate-400', dot: 'bg-slate-400', labelKey: 'up_act_availability' },
  LOADING: { bar: 'bg-purple-500', dot: 'bg-purple-500', labelKey: 'up_act_loading' },
  UNLOADING: { bar: 'bg-fuchsia-500', dot: 'bg-fuchsia-500', labelKey: 'up_act_unloading' },
  UNKNOWN: { bar: 'bg-slate-300 border border-dashed border-slate-400', dot: 'bg-slate-300', labelKey: 'up_act_unknown' },
};

const CATEGORY_ORDER = ['DRIVING', 'BREAK', 'REST', 'WORKING', 'LOADING', 'UNLOADING', 'AVAILABILITY', 'UNKNOWN'];

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeek = (date: Date) => {
  const d = startOfDay(date);
  const offset = (d.getDay() + 6) % 7; // Monday-first week
  return addDays(d, -offset);
};

const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function fmtTime(value: any) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' });
}

function fmtDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  const total = Math.max(0, Math.round(seconds / 60));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

interface ActivityBlock {
  activity: string;
  start: string;
  end: string | null;
  durationSeconds: number;
  source?: string;
  gap?: boolean;
}

interface DaySegment {
  activity: string;
  leftPct: number;
  widthPct: number;
  block: ActivityBlock;
}

function segmentDay(blocks: ActivityBlock[], day: Date): DaySegment[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const segments: DaySegment[] = [];

  for (const block of blocks) {
    const blockStart = new Date(block.start).getTime();
    const inferredEnd = block.end
      ? new Date(block.end).getTime()
      : blockStart + Math.max(0, Number(block.durationSeconds) || 0) * 1000;
    const blockEnd = Number.isFinite(inferredEnd) ? inferredEnd : blockStart;
    if (blockEnd <= dayStart || blockStart >= dayEnd) continue;
    const clippedStart = Math.max(blockStart, dayStart);
    const clippedEnd = Math.min(blockEnd, dayEnd);
    if (clippedEnd <= clippedStart) continue;
    const leftPct = ((clippedStart - dayStart) / (24 * 60 * 60 * 1000)) * 100;
    const widthPct = Math.max(0.25, ((clippedEnd - clippedStart) / (24 * 60 * 60 * 1000)) * 100);
    segments.push({ activity: block.activity, leftPct, widthPct, block });
  }
  return segments;
}

export default function DriverActivityTimeline({
  driverId,
  driverName,
  compact = false,
  onOpenFull,
  onClose,
}: {
  driverId: string;
  driverName?: string;
  compact?: boolean;
  onOpenFull?: () => void;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [mode, setMode] = useState<RangeMode>('daily');
  const [anchor, setAnchor] = useState<Date>(() => startOfDay(new Date()));

  const range = useMemo(() => {
    if (mode === 'weekly') {
      const start = startOfWeek(anchor);
      return { from: start, to: addDays(start, 7) };
    }
    const start = startOfDay(anchor);
    return { from: start, to: addDays(start, 1) };
  }, [mode, anchor]);

  const load = useCallback(async () => {
    if (!driverId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await planningApi.getDriverActivity(driverId, {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      setData(response);
    } catch (e: any) {
      setError(e?.response?.data?.message || t('up_act_load_error', 'Could not load driver activity'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [driverId, range.from, range.to, t]);

  useEffect(() => {
    load();
  }, [load]);

  const blocks: ActivityBlock[] = useMemo(() => (Array.isArray(data?.blocks) ? data.blocks : []), [data]);

  const days = useMemo(() => {
    if (mode === 'weekly') {
      const start = startOfWeek(anchor);
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }
    return [startOfDay(anchor)];
  }, [mode, anchor]);

  const totals = useMemo(() => {
    const values: Record<string, number> = {};
    for (const block of blocks) {
      values[block.activity] = (values[block.activity] || 0) + (Number(block.durationSeconds) || 0);
    }
    return values;
  }, [blocks]);

  const categoryLabel = (category: string) => {
    const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.UNKNOWN;
    return t(style.labelKey, category);
  };

  const unavailable = !loading && (!data?.available || blocks.length === 0);

  if (compact) {
    const last24 = blocks.filter((b) => {
      const start = new Date(b.start).getTime();
      return Date.now() - start <= 24 * 60 * 60 * 1000;
    });
    return (
      <div className="rounded-xl border border-border bg-card p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-[10px] font-black uppercase tracking-wide text-text-secondary truncate">
              {t('up_act_preview_title', 'Driver activity (last 24h)')}
            </span>
          </div>
          {onOpenFull && (
            <button type="button" onClick={onOpenFull} className="text-[10px] font-bold text-primary hover:underline shrink-0">
              {t('up_act_open', 'Open timeline')}
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-1.5 text-text-secondary">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-[10px]">{t('up_act_loading', 'Loading activity…')}</span>
          </div>
        ) : unavailable ? (
          <p className="mt-1 text-[10px] text-text-muted">
            {t('up_act_no_data', 'No tachograph activity records for this driver.')}
          </p>
        ) : (
          <>
            <div className="mt-1.5 h-2.5 w-full rounded-full overflow-hidden flex bg-surface border border-border/60">
              {last24.map((block, index) => {
                const style = CATEGORY_STYLES[block.activity] || CATEGORY_STYLES.UNKNOWN;
                const width = Math.max(0.6, ((Number(block.durationSeconds) || 0) / (24 * 3600)) * 100);
                return (
                  <div
                    key={`${block.start}-${index}`}
                    className={`h-full ${style.bar}`}
                    style={{ width: `${width}%` }}
                    title={`${categoryLabel(block.activity)} · ${fmtTime(block.start)} – ${fmtTime(block.end)} · ${fmtDuration(block.durationSeconds)}`}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] text-text-secondary">
              <span>{t('up_act_driving', 'Driving')}: <b className="text-text-primary">{fmtDuration(totals.DRIVING)}</b></span>
              <span>{t('up_act_break', 'Break')}: <b className="text-text-primary">{fmtDuration(totals.BREAK)}</b></span>
              <span>{t('up_act_rest', 'Rest')}: <b className="text-text-primary">{fmtDuration(totals.REST)}</b></span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-1 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          <div className="min-w-0">
            <h3 className="text-sm font-black text-text-primary truncate">{t('up_act_title', 'Driver activity timeline')}</h3>
            <p className="text-[10px] text-text-secondary truncate flex items-center gap-1">
              <User className="w-3 h-3" />
              {driverName || data?.driverName || '—'}
              <span className="text-text-muted">·</span>
              <span className="text-text-muted">{t('up_act_source_tacho', 'Source: tachograph records')}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['daily', 'weekly'] as RangeMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-2 py-1 text-[10px] font-bold ${mode === m ? 'bg-primary text-white' : 'bg-card text-text-secondary hover:text-text-primary'}`}
              >
                {m === 'daily' ? t('up_act_daily', 'Daily') : t('up_act_weekly', 'Weekly')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setAnchor((prev) => addDays(prev, mode === 'weekly' ? -7 : -1))}
              className="p-1 rounded border border-border bg-card hover:border-primary/60 text-text-secondary"
              title={t('up_act_prev', 'Previous')}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor((prev) => addDays(prev, mode === 'weekly' ? 7 : 1))}
              className="p-1 rounded border border-border bg-card hover:border-primary/60 text-text-secondary"
              title={t('up_act_next', 'Next')}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-1 rounded border border-border bg-card hover:border-primary/60 text-text-secondary disabled:opacity-50"
            title={t('up_act_refresh', 'Refresh')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="btn-secondary text-[10px] py-1 px-2 font-bold">
              {t('close', 'Close')}
            </button>
          )}
        </div>
      </div>

      <div className="px-1 pt-2 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-text-secondary">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs">{t('up_act_loading', 'Loading activity…')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs text-rose-600">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </div>
        ) : unavailable ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <Truck className="w-7 h-7 text-text-muted" />
            <p className="text-xs font-bold text-text-primary">{t('up_act_no_data', 'No tachograph activity records for this driver.')}</p>
            <p className="max-w-md text-[10px] text-text-secondary">
              {t('up_act_no_data_hint', 'Connect an authorised tachograph or telematics provider to display real driving, break and rest activities. Planned trip schedules are never converted into activity records.')}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 pb-2">
              {CATEGORY_ORDER.filter((c) => totals[c] > 0).map((category) => {
                const style = CATEGORY_STYLES[category];
                return (
                  <span key={category} className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[9px] font-bold text-text-secondary">
                    <span className={`w-2 h-2 rounded-sm ${style.dot}`} />
                    {categoryLabel(category)} · <b className="text-text-primary">{fmtDuration(totals[category])}</b>
                  </span>
                );
              })}
            </div>

            <div className="mb-1 flex items-center justify-between text-[9px] font-bold text-text-muted">
              <span>{t('up_act_remaining', 'Remaining daily driving')}: <b className="text-text-primary">{fmtDuration(data?.summary?.drivingRemainingSeconds)}</b></span>
              <span>{t('up_act_week_remaining', 'Remaining weekly driving')}: <b className="text-text-primary">{fmtDuration(data?.summary?.weeklyDrivingRemainingSeconds)}</b></span>
            </div>

            <div className="space-y-2">
              {days.map((day) => {
                const segments = segmentDay(blocks, day);
                return (
                  <div key={dayKey(day)} className="rounded-lg border border-border bg-card p-1.5">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-text-secondary">
                      <span>{day.toLocaleDateString(appLocale(), { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <span className="text-text-muted">
                        {t('up_act_driving', 'Driving')} {fmtDuration(segments.filter((s) => s.activity === 'DRIVING').reduce((sum, s) => sum + s.block.durationSeconds, 0))}
                      </span>
                    </div>
                    <div className="relative h-6 w-full rounded-md bg-surface border border-border/60 overflow-hidden">
                      {[0, 25, 50, 75].map((pct) => (
                        <div key={pct} className="absolute top-0 bottom-0 border-l border-border/40" style={{ left: `${pct}%` }} />
                      ))}
                      {segments.map((segment, index) => {
                        const style = CATEGORY_STYLES[segment.activity] || CATEGORY_STYLES.UNKNOWN;
                        return (
                          <div
                            key={`${segment.block.start}-${index}`}
                            className={`absolute top-0 bottom-0 ${style.bar} opacity-90 hover:opacity-100`}
                            style={{ left: `${segment.leftPct}%`, width: `${segment.widthPct}%` }}
                            title={`${categoryLabel(segment.activity)}
${t('up_act_start', 'Start')}: ${fmtTime(segment.block.start)}
${t('up_act_end', 'End')}: ${fmtTime(segment.block.end)}
${t('up_act_duration', 'Duration')}: ${fmtDuration(segment.block.durationSeconds)}
${t('up_act_source', 'Source')}: ${segment.block.source || '—'}${segment.block.gap ? ` (${t('up_act_gap', 'missing data')})` : ''}`}
                          />
                        );
                      })}
                    </div>
                    <div className="mt-0.5 flex justify-between text-[8px] text-text-muted">
                      <span>00:00</span>
                      <span>06:00</span>
                      <span>12:00</span>
                      <span>18:00</span>
                      <span>24:00</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-2 rounded-lg border border-border bg-surface/60 p-2 text-[9px] leading-relaxed text-text-secondary">
              {t('up_act_note', 'Activities are actual tachograph/telematics records only. Missing periods are shown as unknown. EU Regulation (EC) No 561/2006 limits are informational — legal compliance cannot be confirmed from incomplete data.')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
