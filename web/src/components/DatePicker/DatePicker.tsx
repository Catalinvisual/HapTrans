import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DatePicker.module.css';
import { useLanguage } from '@/context/LanguageContext';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const LOCALES: Record<string, string> = {
  RO: 'ro-RO',
  EN: 'en-GB',
  NL: 'nl-NL',
  DE: 'de-DE',
  FR: 'fr-FR',
  ES: 'es-ES',
  PL: 'pl-PL',
};

const LABELS: Record<string, { today: string; close: string; previous: string; next: string }> = {
  RO: { today: 'Azi', close: 'Închide', previous: 'Luna anterioară', next: 'Luna următoare' },
  EN: { today: 'Today', close: 'Close', previous: 'Previous month', next: 'Next month' },
  NL: { today: 'Vandaag', close: 'Sluiten', previous: 'Vorige maand', next: 'Volgende maand' },
  DE: { today: 'Heute', close: 'Schließen', previous: 'Vorheriger Monat', next: 'Nächster Monat' },
  FR: { today: "Aujourd'hui", close: 'Fermer', previous: 'Mois précédent', next: 'Mois suivant' },
  ES: { today: 'Hoy', close: 'Cerrar', previous: 'Mes anterior', next: 'Mes siguiente' },
  PL: { today: 'Dziś', close: 'Zamknij', previous: 'Poprzedni miesiąc', next: 'Następny miesiąc' },
};

function parseDate(value: string): Date {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function iso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function DatePicker({ value, onChange, placeholder = 'DD/MM/YYYY', className = '', required = false }: DatePickerProps) {
  const { lang } = useLanguage();
  const locale = LOCALES[lang] || 'en-GB';
  const labels = LABELS[lang] || LABELS.EN;
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => {
    const date = parseDate(value);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, ready: false });

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const date = parseDate(value);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [value]);

  const updatePosition = () => {
    const rect = wrapperRef.current?.getBoundingClientRect();
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
      if (wrapperRef.current?.contains(target) || popupRef.current?.contains(target)) return;
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

  const isPastDate = (val: string) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const pastError = isPastDate(value);

  const getErrorMessage = () => {
    if (lang === 'RO') return 'Data selectată nu poate fi în trecut.';
    if (lang === 'NL') return 'De geselecteerde datum mag niet in het verleden liggen.';
    if (lang === 'DE') return 'Das ausgewählte Datum darf nicht in der Vergangenheit liegen.';
    if (lang === 'FR') return 'La date sélectionnée ne peut pas être dans le passé.';
    if (lang === 'ES') return 'La fecha seleccionada no puede estar en el pasado.';
    if (lang === 'PL') return 'Wybrana data nie może być w przeszłości.';
    return 'Selected date cannot be in the past.';
  };

  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = iso(new Date());
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2024, 0, index + 1); // Monday-first
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  });

  const display = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(parseDate(value))
    : placeholder;

  const isDisabledDate = (key: string) => key < today;

  const select = (day: number) => {
    const key = iso(new Date(year, monthIndex, day));
    if (isDisabledDate(key)) return;
    onChange(key);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <button
        ref={wrapperRef}
        type="button"
        className={`${styles.wrapper} ${open ? styles.wrapperFocused : ''} ${className}`}
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        style={pastError ? { borderColor: '#ef4444', backgroundColor: 'rgba(254, 226, 226, 0.2)' } : {}}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
      >
        <Calendar className={styles.icon} style={pastError ? { color: '#ef4444' } : {}} />
        <span className={`${styles.input} ${value ? styles.inputHasValue : ''} ${pastError ? styles.inputError : ''}`}>
          {display}
        </span>
        <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && position.ready && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className={styles.popover}
          style={{ top: position.top, left: position.left }}
        >
          <div className={styles.popoverHeader}>
            <button
              type="button"
              onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}
              className={styles.navButton}
              aria-label={labels.previous}
            >
              <ChevronLeft className={styles.navIcon} />
            </button>
            <span className={styles.monthLabel}>
              {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}
              className={styles.navButton}
              aria-label={labels.next}
            >
              <ChevronRight className={styles.navIcon} />
            </button>
          </div>

          <div className={styles.weekdays}>
            {weekdays.map((weekday) => (
              <span key={weekday} className={styles.weekday}>{weekday}</span>
            ))}
          </div>

          <div className={styles.days}>
            {Array.from({ length: firstDay }).map((_, index) => (
              <span key={`empty-${index}`} className={styles.emptyDay} />
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
                  className={[
                    styles.day,
                    isDisabled ? styles.dayDisabled : isSelected ? styles.daySelected : isToday ? styles.dayToday : '',
                  ].filter(Boolean).join(' ')}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={() => {
                onChange(today);
                setOpen(false);
              }}
              className={styles.footerPrimary}
            >
              {labels.today}
            </button>
            <button type="button" onClick={() => setOpen(false)} className={styles.footerButton}>
              {labels.close}
            </button>
          </div>
        </div>,
        document.body,
      )}

      {pastError && (
        <span className="text-xs font-semibold pl-1 animate-fade-in" style={{ color: '#dc2626', fontSize: '0.75rem' }}>
          ⚠️ {getErrorMessage()}
        </span>
      )}
    </div>
  );
}
