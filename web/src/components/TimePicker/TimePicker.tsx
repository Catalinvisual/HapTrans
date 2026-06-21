import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';
import styles from './TimePicker.module.css';

interface TimePickerProps {
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  const period = h >= 12 ? 'p.m.' : 'a.m.';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${period}`;
}

export default function TimePicker({ value, onChange, label, className = '', placeholder = '-- : --' }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Parse incoming value
  useEffect(() => {
    setInputValue(value);
    if (value) {
      const [h] = value.split(':').map(Number);
      if (!isNaN(h)) setSelectedHour(h);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll the selected item into view when opening
  useEffect(() => {
    if (open && listRef.current && selectedHour !== null) {
      const el = listRef.current.querySelector(`[data-hour="${selectedHour}"]`) as HTMLElement;
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [open]);

  const handleSelectHour = (h: number) => {
    setSelectedHour(h);
    const hh = h.toString().padStart(2, '0');
    const val = `${hh}:00`;
    setInputValue(val);
    onChange(val);
    setOpen(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Allow typing, only trigger onChange if it looks like a valid HH:mm
    if (/^([01]\d|2[0-3]):?([0-5]\d)$/.test(e.target.value)) {
      const formatted = e.target.value.replace(':', '');
      const hh = formatted.substring(0, 2);
      const mm = formatted.substring(2, 4);
      onChange(`${hh}:${mm}`);
      setSelectedHour(Number(hh));
    } else if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(e.target.value)) {
      onChange(e.target.value);
      setSelectedHour(Number(e.target.value.split(':')[0]));
    }
  };

  const options = HOURS.map(h => ({ h, label: formatHour(h) }));

  return (
    <div ref={containerRef} className={`${styles.container} ${className}`}>
      {/* Input trigger */}
      <div className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}>
        <Clock className={styles.icon} />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onClick={() => setOpen(true)}
          className={`${styles.input} ${inputValue ? styles.inputActive : ''}`}
          placeholder={placeholder}
        />
        <ChevronDown
          onClick={() => setOpen(!open)}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className={styles.dropdown}>
          {/* Header */}
          <div className={styles.header}>
            <span className={styles.headerTitle}>
              {label || 'Time'}
            </span>
            <ChevronUp className={styles.headerIcon} onClick={() => setOpen(false)} />
          </div>

          {/* Scrollable list */}
          <div ref={listRef} className={styles.list}>
            {options.map(({ h, label: optLabel }) => {
              const isSelected = selectedHour === h;
              return (
                <div
                  key={h}
                  data-hour={h}
                  onClick={() => handleSelectHour(h)}
                  onMouseEnter={() => setHoveredHour(h)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className={`${styles.option} ${isSelected ? styles.optionSelected : ''} ${!isSelected && hoveredHour === h ? styles.optionHovered : ''}`}
                >
                  <span>{optLabel}</span>
                  {isSelected && <Check className={styles.checkIcon} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
