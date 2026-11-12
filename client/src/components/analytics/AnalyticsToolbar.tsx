import { useTranslation } from 'react-i18next';
import { RotateCw, CalendarRange, LoaderCircle } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import DateField from '../dashboard/DateField';

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
  /** 'embedded' drops the outer card so the toolbar can sit inside a page header. */
  variant?: 'card' | 'embedded';
}

export default function AnalyticsToolbar({
  rangeType, onRangeType, customFrom, customTo, onCustomFrom, onCustomTo,
  granularity, onGranularity, onRefresh, refreshing, variant = 'card',
}: AnalyticsToolbarProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  return (
    <div className={variant === 'embedded'
      ? 'flex flex-1 flex-wrap items-center gap-3'
      : 'flex flex-wrap items-center gap-3 bg-surface/60 backdrop-blur p-2 rounded-2xl border border-border/60 shadow-sm'}>
      {variant === 'embedded' && (
        <div className="hidden items-center gap-2 pr-1 md:flex">
          <CalendarRange className="h-4 w-4 text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-[0.14em] text-text-secondary">{t('an_period')}</span>
        </div>
      )}
      <CustomSelect
        value={rangeType}
        onChange={onRangeType}
        className="w-48 text-sm font-semibold shadow-sm"
        icon={<CalendarRange className="h-4 w-4 text-emerald-500" />}
        options={RANGE_PRESETS.map(p => ({ value: p.value, label: t(p.key) }))}
      />
      {rangeType === 'custom' && (
        <div className="flex items-center gap-2">
          <DateField
            value={customFrom}
            onChange={onCustomFrom}
            lang={lang}
            size="sm"
            className="w-[150px]"
            placeholder={t('from', 'From')}
            title={t('from', 'From')}
          />
          <DateField
            value={customTo}
            onChange={onCustomTo}
            lang={lang}
            size="sm"
            className="w-[150px]"
            placeholder={t('to', 'To')}
            title={t('to', 'To')}
          />
        </div>
      )}
      {onGranularity && (
        <>
          <div className="h-5 w-px bg-border mx-1 hidden sm:block" />
          <div className="flex rounded-xl border border-border/60 bg-card p-1 shadow-sm">
            {(['day', 'week', 'month'] as Granularity[]).map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onGranularity(g)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${granularity === g ? 'bg-primary text-white shadow-sm shadow-primary/25' : 'text-text-secondary hover:bg-surface hover:text-text'}`}
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
          type="button"
          onClick={onRefresh}
          title={t('an_refresh')}
          aria-label={t('an_refresh')}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-text-secondary shadow-sm transition-all hover:border-primary/40 hover:text-primary"
        >
          {refreshing ? <LoaderCircle className="w-4 h-4 animate-spin text-primary" /> : <RotateCw className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}
