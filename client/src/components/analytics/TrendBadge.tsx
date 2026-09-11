import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendBadgeProps {
  value?: number | null;
  invert?: boolean;
  suffix?: 'pct' | 'pp';
}

export default function TrendBadge({ value, invert = false, suffix = 'pct' }: TrendBadgeProps) {
  if (value === null || value === undefined || isNaN(value)) return null;
  const good = invert ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  if (neutral) {
    return <span className="text-[11px] font-semibold text-text-secondary px-1">{suffix === 'pp' ? '±0.0pp' : '±0%'}</span>;
  }
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded ${good ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value).toFixed(1)}{suffix === 'pp' ? 'pp' : '%'}
    </span>
  );
}
