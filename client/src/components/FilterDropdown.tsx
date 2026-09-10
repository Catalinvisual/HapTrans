import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, Check } from 'lucide-react';

interface FilterDropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function FilterDropdown({ options, value, onChange, className = '' }: FilterDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg
          hover:border-primary/50 hover:bg-orange-50 transition-all duration-150 shadow-sm
          text-sm font-medium text-text-secondary group ${open ? 'border-primary ring-2 ring-primary/20' : ''}`}
        title={t('filter', 'Filter')}
      >
        <Filter className="w-4 h-4 group-hover:text-primary transition-colors" />
        <span className="capitalize font-semibold text-text group-hover:text-primary transition-colors">
          {t(`status_${value}`, value.replace('_', ' '))}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg
          overflow-hidden z-50 animate-fade-in">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-100
                  ${value === option
                    ? 'bg-orange-50 text-primary font-semibold'
                    : 'text-text hover:bg-surface'}`}
              >
                <span className="capitalize">{t(`status_${option}`, option.replace('_', ' '))}</span>
                {value === option && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
