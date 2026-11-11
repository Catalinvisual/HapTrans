import type { ComponentType, ReactNode } from 'react';
import TrendBadge from '../analytics/TrendBadge';

type IconType = ComponentType<{ className?: string }>;

interface OverviewKpiProps {
  icon: IconType;
  label: string;
  value: string;
  sub?: ReactNode;
  trend?: number | null;
  invert?: boolean;
  accent: string;
  tone?: 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'violet';
}

const TONE_SURFACE: Record<NonNullable<OverviewKpiProps['tone']>, string> = {
  primary: 'from-primary/[0.10] to-transparent',
  success: 'from-success/[0.10] to-transparent',
  danger: 'from-error/[0.10] to-transparent',
  warning: 'from-amber-400/[0.12] to-transparent',
  info: 'from-sky-400/[0.12] to-transparent',
  violet: 'from-violet-400/[0.12] to-transparent',
};

export default function OverviewKpi({
  icon: Icon, label, value, sub, trend, invert, accent, tone = 'primary',
}: OverviewKpiProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${TONE_SURFACE[tone]} opacity-70`} />
      <div
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 85%)` }}
      />
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl transition-all duration-500 group-hover:opacity-40"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <span className="text-[10px] font-black uppercase leading-tight tracking-[0.12em] text-text-secondary">
          {label}
        </span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border"
          style={{
            background: `${accent}1a`,
            borderColor: `${accent}33`,
            color: accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-2">
        <span className="text-[28px] font-black leading-none tracking-tight text-text tabular-nums">{value}</span>
        <div className="mb-0.5 shrink-0">
          <TrendBadge value={trend} invert={invert} />
        </div>
      </div>
      {sub && <div className="relative mt-2 text-[11px] font-medium text-text-secondary">{sub}</div>}
    </div>
  );
}
