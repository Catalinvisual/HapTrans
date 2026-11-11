'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Clock, X } from 'lucide-react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // "HH:mm"
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

const MINUTES = ['00', '15', '30', '45'];

export default function TimePicker({ value, onChange, label, className = '', placeholder = '--:--' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const [rawHour, rawMinute] = String(value || '').split(':');
  const hour = /^\d{2}$/.test(rawHour || '') ? rawHour : '';
  const minute = /^\d{2}$/.test(rawMinute || '') ? rawMinute : '00';
  const minutes = minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES;

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 228;
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
    requestAnimationFrame(() => {
      popupRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'center' });
    });
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const chooseHour = (nextHour: string) => onChange(`${nextHour}:${minute}`);
  const chooseMinute = (nextMinute: string) => {
    onChange(`${hour || '00'}:${nextMinute}`);
    setOpen(false);
  };

  return (
    <div className={`${styles.container} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          updatePosition();
          setOpen((current) => !current);
        }}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label || 'Select time'}
      >
        <Clock className={styles.icon} />
        <span className={`${styles.value} ${value ? styles.valueActive : ''}`}>{value || placeholder}</span>
        <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          className={styles.popover}
          style={{ top: position.top, left: position.left }}
        >
          <div className={styles.popoverHeader}>
            <span className={styles.popoverValue}>{hour || '--'} : {minute}</span>
            <button type="button" onClick={() => setOpen(false)} className={styles.closeButton} aria-label="Close">
              <X className={styles.closeIcon} />
            </button>
          </div>

          <div className={styles.columns}>
            <div className={styles.column}>
              {Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0')).map((option) => (
                <button
                  key={option}
                  type="button"
                  data-selected={option === hour ? 'true' : undefined}
                  onClick={() => chooseHour(option)}
                  className={`${styles.option} ${option === hour ? styles.optionSelected : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className={styles.column}>
              {minutes.map((option) => (
                <button
                  key={option}
                  type="button"
                  data-selected={option === minute ? 'true' : undefined}
                  onClick={() => chooseMinute(option)}
                  className={`${styles.option} ${option === minute ? styles.optionSelected : ''}`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
