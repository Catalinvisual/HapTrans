'use client';

import * as React from 'react';
import { Button } from './button';
import { useTranslation } from 'react-i18next';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command';

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: string;
  href?: string;
  onClick?: () => void;
}

export function GlobalSearch({
  isOpen,
  onClose,
  results = [],
  onSearch,
  recentSearches = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  results?: SearchResult[];
  onSearch?: (query: string) => void;
  recentSearches?: string[];
}) {
  const { t } = useTranslation();
  const [query, setQuery] = React.useState('');
  const [showRecent, setShowRecent] = React.useState(true);

  const filteredResults = React.useMemo(() => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return results.filter(
      (r) =>
        r.title.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.category.toLowerCase().includes(lowerQuery)
    );
  }, [query, results]);

  const groupedResults = React.useMemo(() => {
    return filteredResults.reduce((acc, result) => {
      if (!acc[result.category]) acc[result.category] = [];
      (acc[result.category] as SearchResult[]).push(result);
      return acc;
    }, {} as Record<string, SearchResult[]>);
  }, [filteredResults]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) window.dispatchEvent(new CustomEvent('open-search'));
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
        setQuery('');
        setShowRecent(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  React.useEffect(() => {
    if (isOpen) {
      setShowRecent(true);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch?.(query);
      if (!recentSearches.includes(query)) {
        // In a real app, this would persist to localStorage
      }
      onClose();
      setQuery('');
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.onClick) result.onClick();
    else if (result.href) window.location.href = result.href;
    onClose();
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-start justify-center pt-16">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <Command className="w-full max-w-2xl">
        <form onSubmit={handleSubmit}>
          <CommandInput
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowRecent(false);
            }}
            autoFocus
            className="text-base"
          />
        </form>
        <CommandList className="max-h-[500px]">
          {query.trim() ? (
            Object.keys(groupedResults).length === 0 ? (
              <CommandEmpty className="py-6 text-center text-muted-foreground">
                {t('search.noResults', { query })}
              </CommandEmpty>
            ) : (
              Object.entries(groupedResults).map(([category, categoryResults]) => (
                <CommandGroup key={category} heading={category}>
                  {categoryResults.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleResultClick(result)}
                      className="px-3 py-2"
                    >
                      <div className="flex items-center gap-3">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          {result.description && (
                            <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                          )}
                        </div>
                        {result.href && (
                          <ExternalLinkIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )
          ) : showRecent && recentSearches.length > 0 ? (
            <CommandGroup heading={t('search.recent')}>
              {recentSearches.slice(0, 5).map((search) => (
                <CommandItem
                  key={search}
                  onSelect={() => {
                    setQuery(search);
                    setShowRecent(false);
                  }}
                  className="px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <ClockIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{search}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Remove from recent
                      }}
                    >
                      <XIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty className="py-6 text-center text-muted-foreground">
              {t('search.noRecent')}
            </CommandEmpty>
          )}
        </CommandList>
      </Command>
    </div>
  );
}