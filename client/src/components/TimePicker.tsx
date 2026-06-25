import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, Check } from 'lucide-react';

interface TimePickerProps {
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number) {
  return `${h.toString().padStart(2, '0')}:00`;
}

export function TimePicker({ value, onChange, label, className = '', placeholder = '-- : --' }: TimePickerProps) {
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
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input trigger */}
      <div
        onClick={() => setOpen(true)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer select-none
          transition-all duration-150
          ${open
            ? 'border-primary ring-2 ring-primary/20 bg-white'
            : 'border-border bg-white hover:border-primary/50'
          }
        `}
      >
        <Clock className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className={`flex-1 text-xs outline-none bg-transparent cursor-pointer ${inputValue ? 'text-text font-medium' : 'text-text-secondary'}`}
          placeholder={placeholder}
        />
        <ChevronDown
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className={`w-3.5 h-3.5 text-text-secondary cursor-pointer transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="
          absolute z-50 mt-1 w-40 bg-white rounded-xl shadow-xl border border-border
          overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150
        ">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">
              {label || 'Time'}
            </span>
            <ChevronUp className="w-3 h-3 text-text-secondary cursor-pointer" onClick={() => setOpen(false)} />
          </div>

          {/* Scrollable list */}
          <div ref={listRef} className="overflow-y-auto max-h-52 py-1 scrollbar-thin">
            {options.map(({ h, label: optLabel }) => {
              const isSelected = selectedHour === h;
              return (
                <div
                  key={h}
                  data-hour={h}
                  onClick={() => handleSelectHour(h)}
                  onMouseEnter={() => setHoveredHour(h)}
                  onMouseLeave={() => setHoveredHour(null)}
                  className={`
                    flex items-center justify-between px-4 py-1.5 cursor-pointer text-sm transition-colors
                    ${isSelected
                      ? 'text-primary font-semibold bg-primary/5'
                      : hoveredHour === h
                        ? 'text-text bg-surface'
                        : 'text-text'
                    }
                  `}
                >
                  <span>{optLabel}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
