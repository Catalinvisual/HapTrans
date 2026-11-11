import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, Building2, Clock, Gauge, Radio, Route as RouteIcon, Truck, Wifi, WifiOff,
} from 'lucide-react';
import PanelCard from './PanelCard';
import { fmtNumber, fmtPercent } from '../../lib/format';
import type { OverviewData, OverviewHeatmap, OverviewTelemetry } from './types';
import { formatDayShort, formatTime } from './types';

function minutesLabel(minutes: number): string {
  if (!Number.isFinite(minutes)) return '—';
  const safe = Math.max(0, Math.round(minutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export function ReliabilityPanel({ data, lang }: { data: OverviewData; lang: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'clients' | 'lanes'>('clients');
  const clients = data.reliability?.clients || [];
  const lanes = data.reliability?.lanes || [];
  const rows = tab === 'clients'
    ? clients.map((row) => ({
        key: row.id,
        title: row.name,
        subtitle: t('dbd_orders_count', { count: row.total }),
        rate: row.onTimeRate,
        delay: row.avgDelay,
      }))
    : lanes.map((row, index) => ({
        key: `${row.from}-${row.to}-${index}`,
        title: `${row.from} → ${row.to}`,
        subtitle: `${row.trips} ${t('dbd_trips').toLowerCase()} · ${formatDayShort(data.meta.from, lang)}`,
        rate: row.onTimeRate,
        delay: row.avgDelay,
      }));

  return (
    <PanelCard
      title={t('dbd_reliability_title')}
      subtitle={t('dbd_reliability_sub')}
      icon={Gauge}
      className="h-full"
      action={
        <div className="flex rounded-lg border border-border/70 bg-surface p-0.5">
          {(['clients', 'lanes'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-2 py-1 text-[9px] font-black uppercase tracking-wide transition-all ${
                tab === key ? 'bg-card text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              {key === 'clients' ? t('dbd_reliability_clients') : t('dbd_reliability_lanes')}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex min-h-[180px] items-center justify-center text-center text-xs font-semibold text-text-secondary">
          {t('dbd_no_reliability')}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const rate = Math.max(0, Math.min(100, row.rate));
            const color = rate >= 90 ? '#10B981' : rate >= 75 ? '#F59E0B' : '#EF4444';
            return (
              <div key={row.key}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-text">{row.title}</p>
                    <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-text-light">{row.subtitle}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black tabular-nums" style={{ color }}>{fmtPercent(rate, 0)}</p>
                    <p className="text-[9px] font-semibold text-text-secondary">
                      {row.delay > 0 ? `+${row.delay} ${t('dbd_min')}` : t('dbd_on_time')}
                    </p>
                  </div>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(3, rate)}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

export function HeatmapPanel({ heatmap, lang }: { heatmap?: OverviewHeatmap; lang: string }) {
  const { t } = useTranslation();
  const buckets = heatmap?.buckets || [];
  const cells = heatmap?.cells || [];
  const max = heatmap?.max || 1;
  const dayLabels = Array.from({ length: 7 }, (_, day) => {
    const base = new Date(`${heatmapDate(day)}T00:00:00`);
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : lang, { weekday: 'short' }).format(base);
  });
  const hasData = cells.some((cell) => cell.late > 0);

  return (
    <PanelCard title={t('dbd_heatmap_title')} subtitle={t('dbd_heatmap_sub')} icon={Activity} className="h-full" bodyClassName="!p-4">
      {!hasData ? (
        <div className="flex min-h-[180px] items-center justify-center text-center text-xs font-semibold text-text-secondary">
          {t('dbd_heatmap_empty')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[360px]">
            <div className="mb-1 grid grid-cols-[32px_repeat(8,1fr)] gap-1">
              <span />
              {buckets.map((bucket) => (
                <span key={bucket} className="text-center text-[8px] font-bold text-text-light">{bucket}</span>
              ))}
            </div>
            {dayLabels.map((label, day) => (
              <div key={label} className="mb-1 grid grid-cols-[32px_repeat(8,1fr)] items-center gap-1">
                <span className="text-[9px] font-black uppercase text-text-secondary">{label}</span>
                {buckets.map((_, bucket) => {
                  const cell = cells.find((entry) => entry.day === day && entry.bucket === bucket);
                  const late = cell?.late || 0;
                  const intensity = late > 0 ? 0.22 + (late / max) * 0.78 : 0;
                  return (
                    <div
                      key={bucket}
                      title={`${label} ${buckets[bucket]} · ${late} ${t('dbd_heatmap_late')} / ${cell?.total || 0} ${t('dbd_heatmap_trips')}`}
                      className="flex h-7 items-center justify-center rounded-md border border-border/30 text-[9px] font-black tabular-nums"
                      style={{
                        background: late > 0 ? `rgba(255,90,0,${intensity})` : 'rgb(var(--color-surface))',
                        color: intensity > 0.55 ? '#fff' : 'rgb(var(--color-text-secondary))',
                      }}
                    >
                      {late > 0 ? late : ''}
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="mt-2 flex items-center justify-end gap-1.5 text-[8px] font-bold uppercase tracking-wide text-text-light">
              {t('dbd_heatmap_low')}
              {[0.15, 0.35, 0.55, 0.8, 1].map((alpha) => (
                <span key={alpha} className="h-2.5 w-2.5 rounded-sm" style={{ background: `rgba(255,90,0,${alpha})` }} />
              ))}
              {t('dbd_heatmap_high')}
            </div>
          </div>
        </div>
      )}
    </PanelCard>
  );
}

function heatmapDate(offset: number): string {
  // Anchor weekday labels on the current week's Monday; the server always sends
  // day 0..6 with Monday-first ordering.
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function DriverHoursPanel({ rows }: { rows: OverviewData['driverHours'] }) {
  const { t } = useTranslation();
  const list = rows || [];
  return (
    <PanelCard
      title={t('dbd_driver_hours_title')}
      subtitle={t('dbd_driver_hours_sub')}
      icon={Clock}
      className="h-full"
      action={
        <Link to="/tachograph" className="text-[9px] font-black uppercase tracking-wide text-primary hover:underline">
          {t('dbd_open_tachograph')}
        </Link>
      }
    >
      {list.length === 0 ? (
        <div className="flex min-h-[170px] items-center justify-center text-center text-xs font-semibold text-text-secondary">
          {t('dbd_no_tacho')}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((row) => {
            const critical = row.drivingRemainingMin <= 60 || row.breakInMin <= 15;
            const warning = row.drivingRemainingMin <= 120 || row.breakInMin <= 30;
            const color = critical ? '#EF4444' : warning ? '#F59E0B' : '#10B981';
            return (
              <div key={`${row.driverId || row.truckPlate}-${row.truckPlate}`} className="rounded-xl border border-border/70 bg-surface/40 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-black text-text">{row.driverName}</p>
                    <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-text-secondary">
                      <Truck className="h-2.5 w-2.5" /> {row.truckPlate} · {row.activity}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-black tabular-nums" style={{ color }}>{minutesLabel(row.drivingRemainingMin)}</p>
                    <p className="text-[8px] font-bold uppercase tracking-wide text-text-light">{t('dbd_driving_left')}</p>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[9px] font-semibold text-text-secondary">
                  <span className={row.breakInMin <= 30 ? 'text-error' : ''}>
                    {t('dbd_break_in')} {minutesLabel(row.breakInMin)}
                  </span>
                  <span className="text-text-light">·</span>
                  <span>{t('dbd_weekly_left')} {minutesLabel(row.weeklyRemainingMin)}</span>
                  {row.updatedAt && (
                    <span className="ml-auto text-text-light">{formatTime(row.updatedAt, 'ro')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PanelCard>
  );
}

export function TelemetryPanel({ telemetry }: { telemetry?: OverviewTelemetry }) {
  const { t } = useTranslation();
  const data = telemetry || { total: 0, online: 0, offline: 0, noDevice: 0, stale: [] };
  const items = [
    { key: 'online', label: t('dbd_telemetry_online'), value: data.online, icon: Wifi, color: '#10B981' },
    { key: 'offline', label: t('dbd_telemetry_offline'), value: data.offline, icon: WifiOff, color: '#EF4444' },
    { key: 'noDevice', label: t('dbd_telemetry_no_device'), value: data.noDevice, icon: Radio, color: '#94A3B8' },
  ];

  return (
    <PanelCard title={t('dbd_telemetry_title')} subtitle={t('dbd_telemetry_sub')} icon={Radio} className="h-full">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-xl border border-border/70 bg-surface/40 p-2.5 text-center">
            <item.icon className="mx-auto h-4 w-4" style={{ color: item.color }} />
            <p className="mt-1 text-lg font-black leading-none text-text tabular-nums">{fmtNumber(item.value)}</p>
            <p className="mt-1 text-[8px] font-black uppercase leading-tight tracking-wide text-text-secondary">{item.label}</p>
          </div>
        ))}
      </div>
      {data.stale.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-wide text-text-light">{t('dbd_telemetry_stale')}</p>
          {data.stale.slice(0, 4).map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg bg-error/5 px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-text">
                <AlertTriangle className="h-3 w-3 text-error" /> {row.plate}
              </span>
              <span className="text-[9px] font-semibold text-text-secondary">
                {row.lastSeenAt ? formatTime(row.lastSeenAt, 'ro') : '—'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-success/10 px-2 py-1.5 text-[10px] font-semibold text-success">
          <Building2 className="h-3 w-3" /> {t('dbd_telemetry_all_good')}
        </p>
      )}
      <Link to="/telematics" className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-border/70 py-1.5 text-[9px] font-black uppercase tracking-wide text-text-secondary hover:border-primary/40 hover:text-primary">
        <RouteIcon className="h-3 w-3" /> {t('dbd_open_telematics')}
      </Link>
    </PanelCard>
  );
}
