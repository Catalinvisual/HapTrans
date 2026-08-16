import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  color?: string; // e.g., 'bg-emerald-500', 'text-emerald-500', '#10B981', etc.
  disabled?: boolean;
  subLabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  'bg-emerald-500': '#10B981',
  'bg-emerald-600': '#059669',
  'text-emerald-500': '#10B981',
  'text-emerald-600': '#059669',
  'emerald': '#10B981',
  'bg-amber-500': '#F59E0B',
  'bg-amber-600': '#D97706',
  'text-amber-500': '#F59E0B',
  'text-amber-600': '#D97706',
  'amber': '#F59E0B',
  'bg-rose-500': '#EF4444',
  'bg-rose-600': '#DC2626',
  'text-rose-500': '#EF4444',
  'text-rose-600': '#DC2626',
  'rose': '#EF4444',
  'red': '#EF4444',
  'bg-indigo-500': '#6366F1',
  'bg-indigo-600': '#4F46E5',
  'text-indigo-500': '#6366F1',
  'text-indigo-600': '#4F46E5',
  'indigo': '#6366F1',
  'bg-blue-500': '#3B82F6',
  'bg-blue-600': '#2563EB',
  'text-blue-500': '#3B82F6',
  'text-blue-600': '#2563EB',
  'blue': '#3B82F6',
  'bg-purple-500': '#8B5CF6',
  'bg-purple-600': '#7C3AED',
  'text-purple-500': '#8B5CF6',
  'text-purple-600': '#7C3AED',
  'purple': '#8B5CF6',
  'bg-fuchsia-500': '#D946EF',
  'bg-fuchsia-600': '#C026D3',
  'text-fuchsia-500': '#D946EF',
  'text-fuchsia-600': '#C026D3',
  'fuchsia': '#D946EF',
  'bg-cyan-500': '#06B6D4',
  'bg-cyan-600': '#0891B2',
  'text-cyan-500': '#06B6D4',
  'text-cyan-600': '#0891B2',
  'cyan': '#06B6D4',
  'bg-slate-400': '#94A3B8',
  'bg-slate-500': '#64748B',
  'text-slate-400': '#94A3B8',
  'text-slate-500': '#64748B',
  'slate': '#94A3B8',
};

function resolveDotColor(color?: string): string {
  if (!color) return '#94A3B8';
  if (color.startsWith('#') || color.startsWith('rgb')) return color;
  const found = COLOR_MAP[color.toLowerCase()];
  if (found) return found;
  // Try extracting core color name
  for (const [k, v] of Object.entries(COLOR_MAP)) {
    if (color.includes(k)) return v;
  }
  return '#94A3B8';
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({
    left: 0,
    top: 0,
    width: 0,
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      if (isOpen && dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return;
      if (isOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [isOpen]);

  // Global keyboard trap
  useEffect(() => {
    if (!isOpen) return;

    const trap = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', ' '].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowDown') {
          setFocusedIndex((prev) => (prev + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
          setFocusedIndex((prev) => (prev - 1 + options.length) % options.length);
        } else if (e.key === 'Enter') {
          setFocusedIndex((prev) => {
            if (prev >= 0 && prev < options.length && !options[prev].disabled) {
              onChange(options[prev].value);
              setIsOpen(false);
            }
            return prev;
          });
        } else if (e.key === 'Escape') {
          setIsOpen(false);
          wrapperRef.current?.querySelector('button')?.focus();
        }
      }
    };

    document.addEventListener('keydown', trap, true);
    return () => document.removeEventListener('keydown', trap, true);
  }, [isOpen, options, onChange]);

  // Auto-scroll to focused item
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[focusedIndex] as HTMLElement;
      if (el && el.scrollIntoView) {
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        toggleDropdown();
      }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const toggleDropdown = () => {
    const nextOpen = !isOpen;
    if (!nextOpen) {
      setFocusedIndex(-1);
    } else if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        top: rect.bottom + window.scrollY,
        width: Math.max(rect.width, 190),
      });
      setFocusedIndex(options.findIndex((o) => o.value === value));
    }
    setIsOpen(nextOpen);
  };

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
        } transition-all shadow-sm`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedOption ? (
            <>
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                style={{ backgroundColor: resolveDotColor(selectedOption.color) }}
              />
              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[13px]">
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-slate-400 text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="absolute z-[9999] mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden max-h-72 animate-fade-in-up"
            style={{
              left: coords.left,
              top: coords.top,
              width: coords.width,
            }}
          >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">{t('jsx_noOptions', 'No options')}</div>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value;
                const isFocused = focusedIndex === index;
                const dotColor = resolveDotColor(option.color);

                return (
                  <div
                    key={option.value}
                    onClick={() => {
                      if (!option.disabled) {
                        onChange(option.value);
                        setIsOpen(false);
                      }
                    }}
                    className={`px-3.5 py-2.5 flex items-center justify-between cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800/80 last:border-b-0 ${
                      option.disabled
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                        : isSelected
                        ? 'bg-primary/10 text-primary font-bold'
                        : isFocused
                        ? 'bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: dotColor }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className={`text-[13px] truncate ${isSelected ? 'font-black text-primary' : 'font-medium'}`}>
                          {option.label}
                        </span>
                        {option.subLabel && (
                          <span className="text-[11px] text-slate-400 truncate mt-0.5">
                            {option.subLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 ml-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
}