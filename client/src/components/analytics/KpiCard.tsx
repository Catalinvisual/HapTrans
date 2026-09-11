import { ReactNode, ComponentType } from 'react';
import TrendBadge from './TrendBadge';

interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  accent?: string;
  trend?: number | null;
  invert?: boolean;
  trendSuffix?: 'pct' | 'pp';
  sub?: ReactNode;
  target?: number | null;
  onClick?: () => void;
}

export default function KpiCard({
  label, value, icon: Icon, accent = 'bg-primary text-primary', trend, invert, trendSuffix, sub, target, onClick,
}: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card !p-4 hover:shadow-card-hover transition-all duration-300 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className={`absolute -right-8 -top-8 w-28 h-28 rounded-full ${accent} opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-500 pointer-events-none`} />
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</span>
        <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${accent} bg-opacity-15`}>
          {Icon && <Icon className="w-4 h-4" />}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-black text-text leading-tight">{value}</span>
        <TrendBadge value={trend} invert={invert} suffix={trendSuffix} />
      </div>
      {(sub || target != null) && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-text-secondary truncate">{sub}</span>
          {target != null && <span className="text-[11px] font-semibold text-text-secondary">target {target}</span>}
        </div>
      )}
    </div>
  );
}
