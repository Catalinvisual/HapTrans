import React, { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { MapPin, Loader2 } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  /**
   * Called when a suggestion is clicked with the full label plus the parts the
   * geocoder resolved: city, country, coordinates and the postal code the
   * suggestion actually belongs to.
   */
  onSelectFull?: (label: string, city?: string, country?: string, lat?: number, lng?: number, postalCode?: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Try to parse "Street, PostalCode City, Country" from a HERE-style label.
 * The label stays the address text; this only fills the structured fields so
 * the postal code is stored and shown as its own value.
 */
function parseAddressLabel(label: string): { city?: string; country?: string; postalCode?: string } {
  const parts = label.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return {};
  const country = parts[parts.length - 1];
  const cityPart = parts[parts.length - 2];
  // 1234 AB Eindhoven / 030167 București / 10115 Berlin / 43-150 Bieruń
  const match = cityPart.match(/^(\d{2,3}-?\d{3,4}|\d{4,6}(?:\s?[A-Za-z]{2})?)\s+(.+)$/);
  if (match) return { country, city: match[2], postalCode: match[1] };
  return { country, city: cityPart };
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelectFull,
  placeholder,
  className,
  required,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<{ id: string; label: string }[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fetchSuggestions = async (text: string) => {
    if (!text || text.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(`/routing/autocomplete?q=${encodeURIComponent(text)}`);
      setSuggestions(res.data || []);
      setIsOpen((res.data || []).length > 0);
      setActiveIndex(-1);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchSuggestions(val), 380);
  };

  const handleSelect = async (label: string) => {
    setQuery(label);
    onChange(label);
    setIsOpen(false);
    setLoading(true);
    try {
      const res = await api.get(`/routing/geocode?address=${encodeURIComponent(label)}`);
      const { lat, lng, city, country, countryCode, countryName, postalCode } = res.data || {};
      const parsed = parseAddressLabel(label);
      if (onSelectFull) {
        onSelectFull(
          label,
          city || parsed.city,
          countryCode || country || countryName || parsed.country,
          lat,
          lng,
          postalCode || parsed.postalCode
        );
      }
    } catch (e) {
      console.error('Failed to resolve coordinates', e);
      if (onSelectFull) {
        const { city, country, postalCode } = parseAddressLabel(label);
        onSelectFull(label, city, country, undefined, undefined, postalCode);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex].label);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        className={className || 'input w-full'}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        required={required}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        autoComplete="off"
        spellCheck={false}
      />

      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-[200] w-full mt-1 bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          style={{ animation: 'fadeUp 0.15s ease-out' }}
        >
          {suggestions.map((s, idx) => (
            <div
              key={s.id || idx}
              onMouseDown={e => { e.preventDefault(); handleSelect(s.label); }}
              className={`px-4 py-3 cursor-pointer text-sm transition-colors flex items-start gap-3 border-b border-border/60 last:border-b-0
                ${idx === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-primary/5 text-text'}`}
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span className="font-medium leading-snug">{s.label}</span>
            </div>
          ))}
          <style>{`
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(-4px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
