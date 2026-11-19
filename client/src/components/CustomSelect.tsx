import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { moveFieldFocus } from '../lib/fieldNavigation';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  color?: string; // e.g., 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', etc.
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
  /** 'sm' renders a dense trigger for toolbars. Defaults to 'md'. */
  size?: 'sm' | 'md';
  /** Optional leading icon shown inside the trigger. Accepts an element or a component type. */
  icon?: React.ReactNode | React.ElementType;
  /** Optional tooltip for the trigger button. */
  title?: string;
}

interface DropdownPosition {
  left: number;
  top: number | null;
  bottom: number | null;
  width: number;
  maxHeight: number;
  placement: 'top' | 'bottom';
  ready: boolean;
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
  'bg-gray-400': '#9CA3AF',
  'bg-gray-500': '#6B7280',
  'text-gray-400': '#9CA3AF',
  'text-gray-500': '#6B7280',
  'text-slate-400': '#94A3B8',
  'bg-slate-400': '#94A3B8',
  'bg-teal-500': '#14B8A6',
  'text-teal-500': '#14B8A6',
  'teal': '#14B8A6',
  'bg-sky-500': '#0EA5E9',
  'text-sky-500': '#0EA5E9',
  'sky': '#0EA5E9',
  'bg-violet-500': '#8B5CF6',
  'text-violet-500': '#8B5CF6',
  'violet': '#8B5CF6',
  'bg-orange-500': '#F97316',
  'text-orange-500': '#F97316',
  'orange': '#F97316',
  'bg-primary': '#F97316',
  'text-primary': '#F97316',
  'primary': '#F97316',
  'bg-green-500': '#22C55E',
  'bg-green-600': '#16A34A',
  'text-green-500': '#22C55E',
  'text-green-600': '#16A34A',
  'green': '#22C55E',
};

function hasVisibleDot(color?: string): boolean {
  return Boolean(color && color !== 'transparent');
}

/** Flatten a ReactNode label into the plain text type-ahead compares against. */
function optionText(option: SelectOption): string {
  const flat = (node: React.ReactNode): string => {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(flat).join(' ');
    if (typeof node === 'object' && 'props' in (node as any)) return flat((node as any).props?.children);
    return '';
  };
  return `${flat(option.label)} ${option.subLabel || ''}`.replace(/\s+/g, ' ').trim().toLowerCase();
}

function resolveDotColor(color?: string): string {
  if (!color) return '#94A3B8';
  if (color.startsWith('#') || color.startsWith('rgb')) return color;
  const found = COLOR_MAP[color.toLowerCase()];
  if (found) return found;
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
  size = 'md',
  icon,
  title,
}: CustomSelectProps) {
  const isSm = size === 'sm';
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<DropdownPosition>({
    left: 0,
    top: null,
    bottom: null,
    width: 0,
    maxHeight: 288,
    placement: 'bottom',
    ready: false,
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  // Multi-character type-ahead, like a native <select> ("pl" jumps to Plătită).
  const typeAhead = useRef({ buffer: '', at: 0 });

  // Measure the trigger in viewport coordinates on every open/reflow. The menu
  // is portalled to <body>, so it cannot inherit a transformed/overflow-hidden
  // ancestor's positioning context and must be clamped to the visual viewport.
  const updatePosition = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || typeof window === 'undefined') return;

    const rect = wrapper.getBoundingClientRect();
    const margin = 10;
    const gap = 4;
    const minWidth = 190;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(
      Math.max(rect.width, minWidth),
      Math.max(minWidth, viewportWidth - margin * 2),
    );
    const left = Math.max(margin, Math.min(rect.left, viewportWidth - width - margin));
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - gap - margin);
    const spaceAbove = Math.max(0, rect.top - gap - margin);
    // Prefer opening below, but flip above when the lower half of the viewport
    // cannot comfortably contain the menu.
    const placement: 'top' | 'bottom' = spaceBelow >= 240 || spaceBelow >= spaceAbove ? 'bottom' : 'top';
    const available = placement === 'bottom' ? spaceBelow : spaceAbove;
    const maxHeight = Math.max(96, Math.min(288, available));

    setCoords({
      left,
      top: placement === 'bottom' ? rect.bottom + gap : null,
      // Anchor an above-menu by its bottom edge so it stays next to the trigger
      // even when it contains fewer options than maxHeight.
      bottom: placement === 'top' ? Math.max(margin, viewportHeight - rect.top + gap) : null,
      width,
      maxHeight,
      placement,
      ready: true,
    });
  }, []);

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

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handleReflow = (event: Event) => {
      const target = event.target as Node | null;
      // Internal menu scrolling must not move the menu; page/panel scrolling
      // re-anchors it to its trigger instead of leaving it floating.
      if (event.type === 'scroll' && target && dropdownRef.current?.contains(target)) return;
      updatePosition();
    };

    window.addEventListener('resize', handleReflow);
    window.addEventListener('scroll', handleReflow, true);
    return () => {
      window.removeEventListener('resize', handleReflow);
      window.removeEventListener('scroll', handleReflow, true);
    };
  }, [isOpen, updatePosition]);

  // Global keyboard trap: while the menu is open every arrow belongs to the
  // list, never to the page or the modal behind it.
  useEffect(() => {
    if (!isOpen) return;

    const navigateKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape', ' '];
    const closeAndReturnFocus = () => {
      setIsOpen(false);
      wrapperRef.current?.querySelector('button')?.focus();
    };
    const commit = () => {
      const option = options[focusedIndex];
      if (option && !option.disabled) {
        onChange(option.value);
        closeAndReturnFocus();
      }
    };

    // Arrows step over disabled rows instead of parking on a row Enter refuses.
    const moveFocus = (direction: 1 | -1) => {
      if (options.length === 0) return;
      setFocusedIndex((prev) => {
        let index = prev < 0 ? (direction === 1 ? -1 : 0) : prev;
        for (let step = 0; step < options.length; step += 1) {
          index = (index + direction + options.length) % options.length;
          if (!options[index]?.disabled) return index;
        }
        return prev;
      });
    };

    const jumpToPrefix = (needle: string, from: number) => {
      for (let step = 1; step <= options.length; step += 1) {
        const index = (from + step + options.length) % options.length;
        const candidate = options[index];
        if (!candidate || candidate.disabled) continue;
        if (optionText(candidate).startsWith(needle)) return index;
      }
      return -1;
    };

    const trap = (e: KeyboardEvent) => {
      // First-letter jump, like a native select.
      const isTypeAhead =
        e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== ' ';
      if (!navigateKeys.includes(e.key) && !isTypeAhead) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'ArrowDown') {
        moveFocus(1);
      } else if (e.key === 'ArrowUp') {
        moveFocus(-1);
      } else if (e.key === 'Home') {
        setFocusedIndex(options.findIndex((option) => !option.disabled));
      } else if (e.key === 'End') {
        setFocusedIndex(
          options.reduce((last, option, index) => (option.disabled ? last : index), -1),
        );
      } else if (e.key === 'Enter' || e.key === ' ') {
        commit();
      } else if (e.key === 'Escape') {
        closeAndReturnFocus();
      } else if (isTypeAhead) {
        const now = Date.now();
        const state = typeAhead.current;
        const typed = e.key.toLowerCase();
        state.buffer = now - state.at > 700 ? typed : state.buffer + typed;
        state.at = now;
        const from = focusedIndex >= 0 ? focusedIndex : options.length - 1;
        let match = jumpToPrefix(state.buffer, from);
        // A second character that matches nothing restarts from that character,
        // so "pp" still lands on the first entry beginning with "p".
        if (match < 0 && state.buffer.length > 1) {
          state.buffer = typed;
          match = jumpToPrefix(typed, from);
        }
        if (match >= 0) setFocusedIndex(match);
      }
    };

    document.addEventListener('keydown', trap, true);
    return () => document.removeEventListener('keydown', trap, true);
  }, [isOpen, options, onChange, focusedIndex]);

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
      // Enter/Space opens the list. Arrows keep the meaning they have in every
      // other field of the form: move to the previous/next one. Before this, the
      // first arrow after picking an option reopened the list and the form could
      // not be walked through from the keyboard.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleDropdown();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (moveFieldFocus(e.key === 'ArrowDown' ? 1 : -1)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const toggleDropdown = () => {
    if (isOpen) {
      setFocusedIndex(-1);
      setIsOpen(false);
      return;
    }
    setCoords((prev) => ({ ...prev, ready: false }));
    updatePosition();
    setFocusedIndex(options.findIndex((o) => o.value === value));
    setIsOpen(true);
  };

  const selectedOption = options.find((o) => o.value === value);

  const iconSize = isSm ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const renderIcon = (node: React.ReactNode | React.ElementType) => {
    if (node === null || node === undefined || typeof node === 'boolean') return null;
    if (React.isValidElement(node)) return node;
    if (typeof node === 'string' || typeof node === 'number') return <span>{node}</span>;
    const Icon = node as React.ElementType;
    return <Icon className={iconSize} />;
  };

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        title={title}
        className={`w-full flex items-center justify-between ${isSm ? 'h-7 px-2 gap-1 text-xs rounded-lg' : 'px-3.5 py-2 text-sm rounded-xl'} border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20'
        } transition-all shadow-sm`}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={`flex items-center ${isSm ? 'gap-1.5' : 'gap-2'} truncate`}>
          {icon && <span className="shrink-0 flex items-center text-slate-400">{renderIcon(icon)}</span>}
          {selectedOption ? (
            <>
              {hasVisibleDot(selectedOption.color) && (
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: resolveDotColor(selectedOption.color) }}
                />
              )}
              <span className={`font-semibold text-slate-800 dark:text-slate-100 truncate ${isSm ? 'text-xs' : 'text-[13px]'}`}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className={`text-slate-400 ${isSm ? 'text-xs' : 'text-sm'}`}>{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`${isSm ? 'w-3.5 h-3.5' : 'w-4 h-4'} text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {isOpen && coords.ready &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed z-[99999] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden animate-fade-in-up"
            data-placement={coords.placement}
            style={{
              left: coords.left,
              ...(coords.top !== null ? { top: coords.top } : { bottom: coords.bottom ?? 0 }),
              width: coords.width,
            }}
          >
            <div
              ref={dropdownRef}
              role="listbox"
              tabIndex={-1}
              className="overflow-y-auto overscroll-contain custom-scrollbar"
              style={{ maxHeight: coords.maxHeight }}
            >
            {options.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-400">{t('jsx_noOptions', 'No options')}</div>
            ) : (
              options.map((option, index) => {
                const isSelected = option.value === value;
                const isFocused = focusedIndex === index;
                const showDot = hasVisibleDot(option.color);
                const dotColor = showDot ? resolveDotColor(option.color) : undefined;

                return (
                  <div
                    key={option.value}
                    role="option"
                    data-kb-active={isFocused ? 'true' : undefined}
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
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
                      {showDot && (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: dotColor }}
                        />
                      )}
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
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}