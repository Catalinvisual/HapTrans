import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { localeFor } from './types';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  lang: string;
  label?: ReactNode;
  min?: string;
  max?: string;
  /** Dashboard ranges need the past; booking forms normally do not. */
  allowPast?: boolean;
  variant?: 'default' | 'hero';
  size?: 'sm' | 'md';
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  icon?: ElementType;
  title?: string;
  invalid?: boolean;
}

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DateField({
  value,
  onChange,
  lang,
  label,
  min,
  max,
  allowPast = true,
  variant = 'default',
  size = 'md',
  className = '',
  placeholder = '—',
  disabled = false,
  icon,
  title,
  invalid = false,
}: DateFieldProps) {
  const { t } = useTranslation();
  const locale = localeFor(lang);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = parseDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const date = parseDate(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 292;
    const margin = 8;
    const gap = 8;
    const popupHeight = popupRef.current?.offsetHeight || 330;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
    const openAbove = spaceBelow < popupHeight && rect.top > popupHeight + gap + margin;
    let top = openAbove ? rect.top - popupHeight - gap : rect.bottom + gap;
    top = Math.max(margin, Math.min(top, window.innerHeight - popupHeight - margin));
    setPosition({ top, left, ready: true });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = iso(new Date());
  const minKey = min || (!allowPast ? today : '');
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, index + 1); // Monday-first
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  });

  const display = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value))
    : placeholder;

  const isDisabledDate = (key: string) =>
    (Boolean(minKey) && key < minKey) || (max != null && key > max);

  const select = (day: number) => {
    const key = iso(new Date(year, monthIndex, day));
    if (isDisabledDate(key)) return;
    onChange(key);
    setOpen(false);
  };

  const HeroIcon = icon || CalendarDays;
  const triggerClass = variant === 'hero'
    ? `flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/95 px-2 text-[11px] font-bold text-slate-800 shadow-sm transition-all hover:border-white/60 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50 ${open ? 'ring-2 ring-white/70' : ''}`
    : `flex w-full items-center gap-2 rounded-lg border px-3 font-medium shadow-sm transition-all focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-8 text-xs' : 'h-[38px] text-sm'} ${invalid ? 'border-red-500 bg-red-50/20 text-red-600 hover:border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-border bg-card text-text hover:border-primary/50 focus:border-primary focus:ring-primary/20'} ${open ? (invalid ? 'ring-2 ring-red-200' : 'border-primary ring-2 ring-primary/20') : ''}`;

  return (
    <div className={`relative min-w-0 ${className}`}>
      {label && (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-secondary">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        className={triggerClass}
        title={title}
        aria-label={title}
        aria-invalid={invalid || undefined}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <HeroIcon className={variant === 'hero' ? 'h-3.5 w-3.5 shrink-0 text-primary' : 'h-4 w-4 shrink-0 text-text-secondary'} />
        <span className={`min-w-0 flex-1 truncate text-left ${!value ? 'text-text-muted' : ''}`}>{display}</span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && position.ready && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[20010] w-[292px] rounded-2xl border border-border/70 bg-card p-3 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-black capitalize text-text">
              {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-primary"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {weekdays.map((weekday) => (
              <span key={weekday} className="py-1 text-center text-[9px] font-black uppercase tracking-wide text-text-light">
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, index) => (
              <span key={`empty-${index}`} className="h-9 w-9" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const key = iso(new Date(year, monthIndex, day));
              const isSelected = key === value;
              const isToday = key === today;
              const isDisabled = isDisabledDate(key);
              return (
                <button
                  key={key}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => select(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-[12px] font-bold transition-all ${
                    isDisabled
                      ? 'cursor-not-allowed text-text-muted/45 line-through'
                      : isSelected
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : isToday
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/35'
                          : 'text-text hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
            <button
              type="button"
              disabled={isDisabledDate(today)}
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('dbd_range_today', 'Today')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface hover:text-text"
            >
              {t('dbd_close', 'Close')}
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
