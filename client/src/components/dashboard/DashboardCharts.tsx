import { useTranslation } from 'react-i18next';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Activity, Globe } from 'lucide-react';
import { fmtNumber } from '../../lib/format';
import { statusAccent } from '../../lib/statusColors';
import PanelCard from './PanelCard';
import type { OverviewData, OverviewSeriesPoint } from './types';
import { bucketLabel, countryName, flagFor, humanizeStatus } from './types';

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid rgb(var(--color-border))',
  background: 'rgb(var(--color-card))',
  color: 'rgb(var(--color-text))',
  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.25)',
  fontSize: 12,
  padding: '8px 12px',
};

const AXIS_TICK = { fontSize: 10, fill: 'rgb(var(--color-text-secondary))' };

export function TrendChart({
  points, granularity, weekly, lang,
}: {
  points: OverviewSeriesPoint[];
  granularity: string;
  weekly: boolean;
  lang: string;
}) {
  const { t } = useTranslation();
  const data = points.map((point) => ({
    ...point,
    short: bucketLabel(point.key, granularity, lang, weekly),
  }));

  return (
    <PanelCard
      title={t('dbd_trend_title')}
      subtitle={t('dbd_trend_sub')}
      icon={Activity}
      action={
        <span className="rounded-full border border-border/70 bg-surface px-2.5 py-1 text-[10px] font-bold text-text-secondary">
          {weekly ? t('dbd_trend_week') : t('dbd_trend_range')}
        </span>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-text-secondary">
        {[
          { label: t('dbd_trips'), color: '#FF5A00' },
          { label: t('dbd_completed'), color: '#10B981' },
          { label: t('dbd_delayed'), color: '#EF4444' },
        ].map((item) => (
          <span key={item.label} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="dbdTripsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5A00" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#FF5A00" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dbdDoneFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="dbdLateFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="rgb(var(--color-border))" strokeOpacity={0.55} />
            <XAxis
              dataKey="short"
              axisLine={false}
              tickLine={false}
              tick={AXIS_TICK}
              dy={8}
              minTickGap={14}
              interval="preserveStartEnd"
            />
            <YAxis axisLine={false} tickLine={false} tick={AXIS_TICK} allowDecimals={false} width={34} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: 'rgb(var(--color-border))', strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="trips"
              name={t('dbd_trips')}
              stroke="#FF5A00"
              strokeWidth={2.5}
              fill="url(#dbdTripsFill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--color-card))' }}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name={t('dbd_completed')}
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#dbdDoneFill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--color-card))' }}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="delayed"
              name={t('dbd_delayed')}
              stroke="#EF4444"
              strokeWidth={2}
              strokeDasharray="5 4"
              fill="url(#dbdLateFill)"
              activeDot={{ r: 4, strokeWidth: 2, stroke: 'rgb(var(--color-card))' }}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  );
}

export function StatusDonut({ data }: { data: OverviewData['statusDistribution'] }) {
  const { t } = useTranslation();
  const items = data.slice(0, 6).map((row) => ({
    ...row,
    label: t(`status_${row.status}`, humanizeStatus(row.status)),
    fill: statusAccent(row.status),
  }));
  const total = data.reduce((sum, row) => sum + row.count, 0);
  const top = items[0];

  return (
    <PanelCard title={t('dbd_status_title')} subtitle={t('dbd_status_sub')} icon={Globe}>
      {total === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/30 text-center">
          <span className="h-10 w-10 rounded-full bg-surface" />
          <p className="text-xs font-semibold text-text-secondary">{t('dbd_no_data_msg')}</p>
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-[190px] w-full max-w-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={60}
                  outerRadius={86}
                  paddingAngle={2.5}
                  stroke="none"
                  startAngle={90}
                  endAngle={-270}
                >
                  {items.map((item) => (
                    <Cell key={item.status} fill={item.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[26px] font-black leading-none text-text tabular-nums">{fmtNumber(total)}</span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-secondary">
                {t('dbd_trips')}
              </span>
            </div>
          </div>
          <div className="mt-2 space-y-1.5">
            {items.map((item) => (
              <div key={item.status} className="flex items-center gap-2 text-[11px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.fill }} />
                <span className="min-w-0 flex-1 truncate font-semibold text-text-secondary">{item.label}</span>
                <span className="font-black text-text tabular-nums">{fmtNumber(item.count)}</span>
                <span className="w-10 text-right text-text-light tabular-nums">
                  {total > 0 ? Math.round((item.count / total) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
          {top && (
            <div className="mt-3 flex items-center justify-between rounded-xl border border-border/60 bg-surface/50 px-3 py-2 text-[10px] font-bold text-text-secondary">
              <span className="uppercase tracking-wider">{t('dbd_share')}</span>
              <span className="text-text">{top.label} · {Math.round((top.count / total) * 100)}%</span>
            </div>
          )}
        </>
      )}
    </PanelCard>
  );
}

export function CountryBars({ data, lang }: { data: OverviewData['byCountry']; lang: string }) {
  const { t } = useTranslation();
  const rows = data.slice(0, 8).map((row) => ({
    ...row,
    label: `${flagFor(row.country)} ${countryName(row.country, lang)}`.trim(),
  }));
  const height = Math.max(240, rows.length * 40);

  return (
    <PanelCard
      title={t('dbd_country_title')}
      subtitle={t('dbd_country_sub')}
      icon={Globe}
      action={
        <div className="flex items-center gap-2.5 text-[10px] font-bold text-text-secondary">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#FF5A00' }} />{t('dbd_pickups')}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: '#0EA5E9' }} />{t('dbd_deliveries')}</span>
        </div>
      }
    >
      {rows.length === 0 ? (
        <div className="flex h-[260px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/30 text-center">
          <span className="h-10 w-10 rounded-full bg-surface" />
          <p className="text-xs font-semibold text-text-secondary">{t('dbd_no_data_msg')}</p>
        </div>
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 6, bottom: 4 }} barSize={16}>
              <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="rgb(var(--color-border))" strokeOpacity={0.5} />
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                width={132}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'rgb(var(--color-text-secondary))', fontWeight: 600 }}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgb(var(--color-surface))', fillOpacity: 0.5 }} />
              <Bar dataKey="pickups" name={t('dbd_pickups')} stackId="country" fill="#FF5A00" radius={[6, 0, 0, 6]} />
              <Bar dataKey="deliveries" name={t('dbd_deliveries')} stackId="country" fill="#0EA5E9" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelCard>
  );
}
