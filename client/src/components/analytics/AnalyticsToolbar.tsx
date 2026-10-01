import { useTranslation } from 'react-i18next';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { RotateCw, CalendarRange, LoaderCircle } from 'lucide-react';
import CustomSelect from '../CustomSelect';

export type Granularity = 'day' | 'week' | 'month';

const RANGE_PRESETS = [
  { value: 'this_month', key: 'fin_this_month' },
  { value: 'last_month', key: 'fin_last_month' },
  { value: 'last_30_days', key: 'fin_last30d' },
  { value: 'last_90_days', key: 'fin_last90d' },
  { value: 'last_12_months', key: 'fin_last12m' },
  { value: 'this_year', key: 'fin_this_year' },
  { value: 'custom', key: 'fin_custom_range' },
];

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function computeRange(rangeType: string, customFrom: string, customTo: string): { from: string; to: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  switch (rangeType) {
    case 'this_month': return { from: toISO(new Date(now.getFullYear(), now.getMonth(), 1)), to: toISO(now) };
    case 'last_month': {
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: toISO(start), to: toISO(end) };
    }
    case 'last_30_days': return { from: toISO(new Date(now.getTime() - 29 * 86400000)), to: toISO(now) };
    case 'last_90_days': return { from: toISO(new Date(now.getTime() - 89 * 86400000)), to: toISO(now) };
    case 'last_12_months': return { from: toISO(new Date(now.getFullYear() - 1, now.getMonth(), 1)), to: toISO(now) };
    case 'this_year': return { from: toISO(new Date(now.getFullYear(), 0, 1)), to: toISO(now) };
    default: return { from: customFrom, to: customTo };
  }
}

interface AnalyticsToolbarProps {
  rangeType: string;
  onRangeType: (v: string) => void;
  customFrom: string;
  customTo: string;
  onCustomFrom: (v: string) => void;
  onCustomTo: (v: string) => void;
  granularity?: Granularity;
  onGranularity?: (v: Granularity) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AnalyticsToolbar({
  rangeType, onRangeType, customFrom, customTo, onCustomFrom, onCustomTo,
  granularity, onGranularity, onRefresh, refreshing,
}: AnalyticsToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-3 bg-surface/60 backdrop-blur p-2 rounded-2xl border border-border/60 shadow-sm">
      <CustomSelect
        value={rangeType}
        onChange={onRangeType}
        className="w-48 text-sm font-semibold shadow-sm"
        options={RANGE_PRESETS.map(p => ({ value: p.value, label: t(p.key) }))}
      />
      {rangeType === 'custom' && (
        <div className="flex items-center gap-2">
          <Flatpickr value={customFrom} onChange={d => onCustomFrom(toISO(d[0]))} className="input !py-1.5 !text-sm !rounded-xl !w-28 !bg-surface" />
          <span className="text-text-secondary text-sm">–</span>
          <Flatpickr value={customTo} onChange={d => onCustomTo(toISO(d[0]))} className="input !py-1.5 !text-sm !rounded-xl !w-28 !bg-surface" />
        </div>
      )}
      {onGranularity && (
        <>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <div className="flex bg-surface rounded-xl p-0.5 border border-border/60">
            {(['day', 'week', 'month'] as Granularity[]).map(g => (
              <button
                key={g}
                onClick={() => onGranularity(g)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${granularity === g ? 'bg-white text-primary shadow-sm border border-primary/20' : 'text-text-secondary hover:text-text'}`}
              >
                {g === 'day' ? t('an_daily') : g === 'week' ? t('fin_weekly_lbl') : t('fin_monthly_lbl')}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="flex-1" />
      {onRefresh && (
        <button
          onClick={onRefresh}
          title={t('an_refresh')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-border hover:bg-surface hover:border-primary/40 transition-all text-text-secondary"
        >
          {refreshing ? <LoaderCircle className="w-4 h-4 animate-spin text-primary" /> : <RotateCw className="w-4 h-4" />}
        </button>
      )}
      <CalendarRange className="w-4 h-4 text-text-secondary hidden md:block" />
    </div>
  );
}
