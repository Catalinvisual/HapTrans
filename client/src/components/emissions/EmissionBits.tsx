import type { ReactNode, ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Inbox, RefreshCw } from 'lucide-react';

export const EMISSION_ORANGE = '#FF5A00';
export const EMISSION_NAVY = '#0D1B2A';
export const EMISSION_BLUE = '#2563EB';
export const EMISSION_AMBER = '#F59E0B';
export const EMISSION_GREY = '#94A3B8';

export const AXIS_TICK = { fill: 'rgb(var(--color-text-secondary))', fontSize: 11 };
export const TOOLTIP_STYLE = {
  background: 'rgb(var(--color-card))',
  border: '1px solid rgb(var(--color-border))',
  borderRadius: 10,
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
  color: 'rgb(var(--color-text))',
};

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value));
}

/** Emissions are stored in kg CO2e; large totals are shown in tonnes. */
export function formatEmission(kg: number | null | undefined, digits = 2): string {
  if (kg === null || kg === undefined || Number.isNaN(Number(kg))) return '—';
  const value = Number(kg);
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000, digits)} t`;
  return `${formatNumber(value, value < 10 ? 2 : 1)} kg`;
}

export function formatUnit(kg: number | null | undefined, unit: 'kg' | 't' = 'kg'): string {
  if (kg === null || kg === undefined) return '—';
  return unit === 't' ? formatNumber(Number(kg) / 1000, 3) : formatNumber(Number(kg), 1);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${formatNumber(Number(value), digits)}%`;
}

export function Panel({
  title, subtitle, icon: Icon, actions, children, className = '', dense = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <section className={`bg-card border border-border rounded-xl shadow-sm ${dense ? 'p-3' : 'p-4'} ${className}`}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              {Icon && <Icon className="w-4 h-4 text-primary shrink-0" />}
              {title}
            </h3>
            {subtitle && <p className="text-[11px] text-text-secondary mt-0.5 leading-snug">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StateBlock({
  loading, error, empty, onRetry, children, emptyMessage,
}: {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  onRetry?: () => void;
  children: ReactNode;
  emptyMessage?: ReactNode;
}) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-secondary">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        {t('emissions_loading')}
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-2 py-8 text-sm text-amber-700 dark:text-amber-300">
        <AlertTriangle className="w-5 h-5" />
        <span>{error}</span>
        {onRetry && (
          <button className="btn-secondary py-1.5 px-3 text-xs inline-flex items-center gap-1.5" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5" />{t('emissions_retry')}
          </button>
        )}
      </div>
    );
  }
  if (empty) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-sm text-text-secondary">
        <Inbox className="w-5 h-5" />
        <span>{emptyMessage || t('emissions_empty')}</span>
      </div>
    );
  }
  return <>{children}</>;
}

const LIFECYCLE_STYLES: Record<string, string> = {
  verified: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  finalized: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  preliminary: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
  estimated: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  pending_data: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  reconciliation_required: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  corrected: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/25',
  actual: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  reconciled: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25',
  missing: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  verified_doc: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  unverified: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  missing_data: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  expired: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
  requires_review: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  needs_review: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  applied: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
  skipped_idempotent: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25',
  skipped_finalized: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25',
  failed: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25',
};

export function EmissionBadge({ status, label }: { status: string | null | undefined; label?: ReactNode }) {
  const { t } = useTranslation();
  const key = String(status || 'missing').toLowerCase();
  const style = LIFECYCLE_STYLES[key] || 'bg-surface text-text-secondary border-border';
  const text = label ??
    t(`emissions_registry_status_${key}`, key.replace(/_/g, ' '));
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${style}`}>
      {text}
    </span>
  );
}

export function DataQualityLabel({ quality }: { quality: string | null | undefined }) {
  const { t } = useTranslation();
  if (!quality) return <span>—</span>;
  const map: Record<string, string> = {
    actual: t('emissions_verified'),
    reconciled: t('emissions_trips_quality'),
    estimated: t('emissions_estimated'),
    missing: t('emissions_missing_data'),
  };
  return <EmissionBadge status={quality} label={map[quality] || quality} />;
}

export function SectionHeading({ title, hint }: { title: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-black text-text tracking-tight">{title}</h2>
      {hint && <p className="text-xs text-text-secondary mt-0.5 max-w-4xl leading-relaxed">{hint}</p>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-text-secondary mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-text-secondary mt-1 leading-snug">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-2.5 py-1.5 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary ${props.className || ''}`}
    />
  );
}
