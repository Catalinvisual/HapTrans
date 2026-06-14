'use client';
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface AddressAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function AddressAutocomplete({ value, onChange, placeholder, className, required }: AddressAutocompleteProps) {
  const { t } = useLanguage();
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://haptrans-production.up.railway.app/api';
      const res = await fetch(`${apiUrl}/routing-public/autocomplete?q=${encodeURIComponent(searchText)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data || []);
        setIsOpen(true);
      }
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
    <div className="relative" ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        className={className || ''}
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        required={required}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        autoComplete="off"
      />
      
      {loading && (
        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
          <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite', color: '#FF5A00' }} />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 50, width: '100%', marginTop: '0.25rem',
          backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden'
        }}>
          {suggestions.map((s, idx) => (
            <div
              key={s.id || idx}
              style={{
                padding: '0.75rem 1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                cursor: 'pointer', borderBottom: '1px solid #f1f5f9', color: '#334155',
                fontSize: '0.875rem', fontWeight: 500, backgroundColor: '#fff', transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fff7ed')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
              onClick={() => handleSelect(s.label)}
            >
              <MapPin style={{ width: '1rem', height: '1rem', color: '#FF5A00', flexShrink: 0, marginTop: '0.125rem' }} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      )}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
