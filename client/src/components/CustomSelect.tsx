import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
export interface SelectOption {
  value: string;
  label: React.ReactNode;
  color?: string; // Tailwind color class for dot or text, e.g., 'text-red-500'
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
export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false
}: CustomSelectProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({
    left: 0,
    top: 0,
    width: 0
  });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node) && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
      // Don't close if scroll happens inside the dropdown itself
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

  // ── Global keyboard trap: when dropdown is open, capture arrow/enter/escape
  // at document level (capture phase) so they never reach useShortcuts or
  // the browser's native scroll handlers. Restored automatically on close.
  useEffect(() => {
    if (!isOpen) return;

    const trap = (e: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'Enter', 'Escape', ' '].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'ArrowDown') {
          setFocusedIndex(prev => (prev + 1) % options.length);
        } else if (e.key === 'ArrowUp') {
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        } else if (e.key === 'Enter') {
          setFocusedIndex(prev => {
            if (prev >= 0 && prev < options.length && !options[prev].disabled) {
              onChange(options[prev].value);
              setIsOpen(false);
            }
            return prev;
          });
        } else if (e.key === 'Escape') {
          setIsOpen(false);
          // Return focus to the trigger button
          wrapperRef.current?.querySelector('button')?.focus();
        }
      }
    };

    // Use capture phase so we intercept before any bubbling handlers
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
    // When open, the global trap handles everything — just prevent default here too
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
        width: rect.width
      });
      setFocusedIndex(options.findIndex(o => o.value === value));
    }
    setIsOpen(nextOpen);
  };
  const selectedOption = options.find(o => o.value === value);
  return <div className={`relative ${className}`} ref={wrapperRef}>
      <button type="button" disabled={disabled} className={`w-full flex items-center justify-between input bg-card text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'} transition-colors`} onClick={toggleDropdown} onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? <>
              {selectedOption.color && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedOption.color.replace('text-', 'bg-')}`} />}
              <span className={`font-medium truncate ${selectedOption.color || 'text-text'}`}>
                {selectedOption.label}
              </span>
            </> : <span className="text-text-secondary">{placeholder}</span>}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(<div ref={dropdownRef} className="absolute z-[9999] mt-1 bg-card border border-border rounded-xl shadow-xl overflow-y-auto max-h-60 animate-fade-in-up py-1" style={{
      left: coords.left,
      top: coords.top,
      width: coords.width
    }}>
          {options.length === 0 ? <div className="px-4 py-3 text-sm text-text-secondary">{t("jsx_noOptions", "No options")}</div> : options.map((option, index) => <div key={option.value} onClick={() => {
        if (!option.disabled) {
          onChange(option.value);
          setIsOpen(false);
        }
      }} className={`px-4 py-2.5 flex flex-col cursor-pointer transition-colors border-b border-border last:border-b-0 ${option.disabled ? 'opacity-50 cursor-not-allowed bg-surface' : focusedIndex === index ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-primary/5 border-l-2 border-l-transparent'}`}>
                <div className="flex items-center gap-2">
                  {option.color && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${option.color.replace('text-', 'bg-')}`} />}
                  <span className={`font-medium text-sm truncate ${option.color || 'text-text'}`}>
                    {option.label}
                  </span>
                </div>
                {option.subLabel && <span className="text-xs text-text-secondary mt-0.5 ml-4 truncate">
                    {option.subLabel}
                  </span>}
              </div>)}
        </div>, document.body)}
    </div>;
}