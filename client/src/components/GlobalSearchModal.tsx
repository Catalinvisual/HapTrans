import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, X, Users, Truck, Map } from 'lucide-react';
import api from '../lib/api';
import { useShortcuts } from '../hooks/useShortcuts';
import { matchesSearch } from '../lib/search';
import { composeCityLine } from '../lib/address';
import { navItems, filterNavItems } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SearchResult = {
  id: string;
  type: 'page' | 'client' | 'trip' | 'truck' | 'driver' | 'invoice';
  title: string;
  subtitle?: string;
  url: string;
  icon: React.ReactNode;
};

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Exactly the pages the sidebar lists, in the same order and only those the
  // account may open: the palette used to carry a fixed shortlist, so planning,
  // orders, fleet, reports and the other modules were missing from it.
  const staticPages: SearchResult[] = useMemo(
    () =>
      filterNavItems(user, navItems).map((item) => {
        const Icon = item.icon;
        return {
          id: `page_${item.to}`,
          type: 'page' as const,
          title: item.labelKey ? t(item.labelKey, 'Payroll & Settlements') : t(item.key),
          url: item.to,
          icon: <Icon className="w-5 h-5" />,
        };
      }),
    [user, t],
  );

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults(staticPages);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, staticPages]);

  useEffect(() => {
    if (!isOpen) return;
    
    if (!query.trim()) {
      setResults(staticPages);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Local page search
        const pageResults = staticPages.filter(p => matchesSearch(query, p.title));

        // API Searches (parallel)
        const [clientsRes, tripsRes, trucksRes] = await Promise.all([
          api.get(`/clients?search=${query}`).catch(() => ({ data: [] })),
          api.get(`/trips?search=${query}`).catch(() => ({ data: { data: [] } })),
          api.get(`/trucks?search=${query}`).catch(() => ({ data: [] }))
        ]);

        const clientResults: SearchResult[] = (clientsRes.data || []).slice(0, 5).map((c: any) => ({
          id: `c_${c.id}`,
          type: 'client',
          title: c.name,
          subtitle: c.cui,
          url: `/clients`, // Redirect to clients page (ideally opens edit, but we just navigate to page)
          icon: <Users className="w-5 h-5" />
        }));

        // A postal code or a city has to find the trip too, so the whole stop
        // address is part of the match and of the result subtitle.
        const tripStops = (t: any) => [...(t.stops || [])].sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
        const tripText = (t: any) => [
          t.referenceNumber, t.tripNumber, t.pickupAddress, t.dropoffAddress,
          ...tripStops(t).flatMap((s: any) => [s.companyName, s.address, s.postalCode, s.city, s.country]),
        ].filter(Boolean).join(' ');
        const tripRoute = (t: any) => {
          const stops = tripStops(t);
          const pickup = stops.find((s: any) => s.type === 'pickup') || stops[0];
          const dropoff = [...stops].reverse().find((s: any) => s.type === 'delivery' || s.type === 'dropoff');
          if (pickup || dropoff) return `${pickup ? composeCityLine(pickup) : '?'} -> ${dropoff ? composeCityLine(dropoff) : '?'}`;
          return `${t.pickupAddress || '?'} -> ${t.dropoffAddress || '?'}`;
        };
        const tripResults: SearchResult[] = (tripsRes.data?.data || [])
          .filter((t: any) => matchesSearch(query, tripText(t)))
          .slice(0, 5).map((t: any) => ({
            id: `t_${t.id}`,
            type: 'trip',
            title: `Cursa ${t.referenceNumber || t.id.slice(0, 6)}`,
            subtitle: tripRoute(t),
            url: `/trips`,
            icon: <Map className="w-5 h-5" />
          }));

        const truckResults: SearchResult[] = (trucksRes.data || []).slice(0, 3).map((t: any) => ({
          id: `tr_${t.id}`,
          type: 'truck',
          title: t.licensePlate,
          subtitle: t.brand,
          url: `/trucks`,
          icon: <Truck className="w-5 h-5" />
        }));

        const combined = [...pageResults, ...tripResults, ...clientResults, ...truckResults];
        setResults(combined);
        setSelectedIndex(0);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isOpen, staticPages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      setSelectedIndex(prev => {
        const next = e.key === 'ArrowDown' ? prev + 1 : prev - 1;
        return (next + results.length) % results.length;
      });
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      if (results.length === 0) return;
      setSelectedIndex(e.key === 'Home' ? 0 : results.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        navigate(results[selectedIndex].url);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useShortcuts({
    'escape': onClose
  }, isOpen);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-start justify-center pt-[10vh] px-4 animate-fade-in">
      <div 
        className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-4 border-b border-border gap-3">
          <Search className="w-6 h-6 text-text-secondary" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 text-lg outline-none bg-transparent text-text placeholder-text-secondary"
            placeholder={t('search_placeholder', 'Cauta pagini, clienți, curse...')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {isLoading && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          )}
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-xl text-text-secondary">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              {t('no_results', 'Nu am găsit niciun rezultat.')}
            </div>
          ) : (
            <div className="p-2">
              {results.map((res, index) => (
                <div
                  key={res.id}
                  role="option"
                  aria-selected={selectedIndex === index}
                  data-kb-active={selectedIndex === index ? 'true' : undefined}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => {
                    navigate(res.url);
                    onClose();
                  }}
                  className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${
                    selectedIndex === index ? 'bg-primary/10 text-primary' : 'hover:bg-surface text-text'
                  }`}
                >
                  <div className={`p-2 rounded-lg border ${selectedIndex === index ? 'bg-primary/20 border-transparent' : 'bg-surface border-border'}`}>
                    {res.icon}
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span className="font-semibold capitalize">{res.title}</span>
                    {res.subtitle && <span className="text-xs text-text-secondary">{res.subtitle}</span>}
                  </div>
                  <div className="text-xs font-mono px-2 py-1 bg-black/5 rounded text-text-secondary capitalize">
                    {res.type}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
