import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { localeFor } from './types';

interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  lang: string;
}

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DateField({ value, onChange, lang }: DateFieldProps) {
  const { t } = useTranslation();
  const locale = localeFor(lang);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = parseDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (value) {
      const date = parseDate(value);
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [value]);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 292;
    const height = 332;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
    let top = rect.bottom + 8;
    if (top + height > window.innerHeight && rect.top > height) top = rect.top - height - 8;
    setPosition({ top, left });
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
  const selected = value;
  const today = iso(new Date());
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, index + 1); // Monday-first
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  });

  const display = value
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value))
    : '—';

  const select = (day: number) => {
    onChange(iso(new Date(year, monthIndex, day)));
    setOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        className={`flex h-8 items-center gap-1.5 rounded-lg border border-white/30 bg-white/95 px-2 text-[11px] font-bold text-slate-800 shadow-sm transition-all hover:border-white/60 hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60 ${open ? 'ring-2 ring-white/70' : ''}`}
      >
        <CalendarDays className="h-3.5 w-3.5 text-primary" />
        <span className="whitespace-nowrap">{display}</span>
        <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
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
            {weekdays.map((label) => (
              <span key={label} className="py-1 text-center text-[9px] font-black uppercase tracking-wide text-text-light">
                {label}
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
              const isSelected = key === selected;
              const isToday = key === today;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => select(day)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-[12px] font-bold transition-all ${
                    isSelected
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
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className="rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-wide text-primary transition-colors hover:bg-primary/10"
            >
              {t('dbd_range_today')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-2 py-1 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface hover:text-text"
            >
              {t('dbd_close')}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
