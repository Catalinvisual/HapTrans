import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Clock, X } from 'lucide-react';

interface TimeFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: ReactNode;
  className?: string;
  placeholder?: string;
  minuteStep?: number;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function TimeField({
  value,
  onChange,
  label,
  className = '',
  placeholder = '--:--',
  minuteStep = 15,
  disabled = false,
  size = 'md',
}: TimeFieldProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });

  const [rawHour, rawMinute] = String(value || '').split(':');
  const hour = /^\d{2}$/.test(rawHour || '') ? rawHour : '';
  const minute = /^\d{2}$/.test(rawMinute || '') ? rawMinute : '00';

  const minutes = Array.from({ length: Math.floor(60 / minuteStep) }, (_, index) =>
    String(index * minuteStep).padStart(2, '0'),
  );
  if (minute && !minutes.includes(minute)) minutes.push(minute);
  minutes.sort();

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 228;
    const margin = 8;
    const gap = 8;
    const popupHeight = popupRef.current?.offsetHeight || 300;
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
    requestAnimationFrame(() => {
      popupRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
    });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chooseHour = (nextHour: string) => {
    onChange(`${nextHour}:${minute}`);
  };

  const chooseMinute = (nextMinute: string) => {
    onChange(`${hour || '00'}:${nextMinute}`);
    setOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
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
        className={`flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 font-medium text-text shadow-sm transition-all hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 ${size === 'sm' ? 'h-8 text-xs' : 'h-[38px] text-sm'} ${open ? 'border-primary ring-2 ring-primary/20' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t('select_time', 'Select time')}
      >
        <Clock className="h-4 w-4 shrink-0 text-text-secondary" />
        <span className={`min-w-0 flex-1 truncate text-left tabular-nums ${!value ? 'text-text-muted' : ''}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && position.ready && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className="fixed z-[20011] w-[228px] rounded-2xl border border-border/70 bg-card p-3 shadow-2xl ring-1 ring-black/5 dark:ring-white/10 animate-fade-in-up"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-black tabular-nums text-text">
              {hour || '--'} : {minute}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-surface hover:text-text"
              aria-label={t('dbd_close', 'Close')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="max-h-52 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
              {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map((option) => {
                const selected = option === hour;
                return (
                  <button
                    key={option}
                    type="button"
                    data-selected={selected ? 'true' : undefined}
                    onClick={() => chooseHour(option)}
                    className={`mb-1 flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-bold tabular-nums transition-colors ${
                      selected ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-text hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
            <div className="max-h-52 overflow-y-auto overscroll-contain pr-1 custom-scrollbar">
              {minutes.map((option) => {
                const selected = option === minute;
                return (
                  <button
                    key={option}
                    type="button"
                    data-selected={selected ? 'true' : undefined}
                    onClick={() => chooseMinute(option)}
                    className={`mb-1 flex h-8 w-full items-center justify-center rounded-lg text-[12px] font-bold tabular-nums transition-colors ${
                      selected ? 'bg-primary text-white shadow-md shadow-primary/25' : 'text-text hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
