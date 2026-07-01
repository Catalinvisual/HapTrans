import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { MapPin, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({ value, onChange, placeholder, className, required }: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<{id: string, label: string}[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (searchText: string) => {
    if (!searchText || searchText.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/routing/autocomplete?q=${encodeURIComponent(searchText)}`);
      setSuggestions(res.data || []);
      setIsOpen(true);
    } catch (e) {
      console.error('Autocomplete error', e);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(val);
    }, 400);
  };

  const handleSelect = (label: string) => {
    setQuery(label);
    onChange(label);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className={className || 'input w-full'}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        required={required}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        autoComplete="off"
      />
      
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in-up">
          {suggestions.map((s, idx) => (
            <div
              key={s.id || idx}
              className="px-4 py-3 hover:bg-primary/5 cursor-pointer text-sm font-medium transition-colors text-text-secondary border-b border-slate-50 flex items-start gap-3"
              onClick={() => handleSelect(s.label)}
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
