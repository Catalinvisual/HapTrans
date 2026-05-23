import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = (e: Event) => {
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

  const toggleDropdown = () => {
    if (!isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({
        left: rect.left,
        top: rect.bottom + window.scrollY,
        width: rect.width,
      });
    }
    setIsOpen(!isOpen);
  };

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <button
        type="button"
        disabled={disabled}
        className={`w-full flex items-center justify-between input bg-white text-left ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'} transition-colors`}
        onClick={toggleDropdown}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedOption ? (
            <>
              {selectedOption.color && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedOption.color.replace('text-', 'bg-')}`} />}
              <span className={`font-medium truncate ${selectedOption.color || 'text-text'}`}>
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-text-secondary">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-text-secondary transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="absolute z-[9999] mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-y-auto max-h-60 animate-fade-in-up py-1"
          style={{ left: coords.left, top: coords.top, width: coords.width }}
        >
          {options.length === 0 ? (
            <div className="px-4 py-3 text-sm text-text-secondary">No options</div>
          ) : (
            options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                className={`px-4 py-2.5 flex flex-col cursor-pointer transition-colors border-b border-gray-300 last:border-b-0 ${
                  option.disabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-50'
                    : 'hover:bg-primary/5'
                } ${value === option.value ? 'bg-primary/5 border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
              >
                <div className="flex items-center gap-2">
                  {option.color && <div className={`w-2 h-2 rounded-full flex-shrink-0 ${option.color.replace('text-', 'bg-')}`} />}
                  <span className={`font-medium text-sm truncate ${option.color || 'text-text'}`}>
                    {option.label}
                  </span>
                </div>
                {option.subLabel && (
                  <span className="text-xs text-text-secondary mt-0.5 ml-4 truncate">
                    {option.subLabel}
                  </span>
                )}
              </div>
            ))
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
