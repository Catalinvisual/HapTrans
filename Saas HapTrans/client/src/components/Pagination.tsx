import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  className?: string;
}

const translations: Record<string, Record<string, string>> = {
  ro: {
    show: 'Afișează',
    total: 'total',
    previous: 'Pagina anterioară',
    next: 'Pagina următoare',
    pag: 'pag',
    all: 'Toate',
  },
  en: {
    show: 'Show',
    total: 'total',
    previous: 'Previous page',
    next: 'Next page',
    pag: 'page',
    all: 'All',
  },
  nl: {
    show: 'Toon',
    total: 'totaal',
    previous: 'Vorige pagina',
    next: 'Volgende pagina',
    pag: 'pag',
    all: 'Alles',
  },
  de: {
    show: 'Anzeigen',
    total: 'Gesamt',
    previous: 'Vorherige Seite',
    next: 'Nächste Seite',
    pag: 'Seite',
    all: 'Alle',
  },
  fr: {
    show: 'Afficher',
    total: 'total',
    previous: 'Page précédente',
    next: 'Page suivante',
    pag: 'page',
    all: 'Tout',
  },
  es: {
    show: 'Mostrar',
    total: 'total',
    previous: 'Página anterior',
    next: 'Página siguiente',
    pag: 'pág',
    all: 'Todos',
  },
  pl: {
    show: 'Pokaż',
    total: 'razem',
    previous: 'Poprzednia strona',
    next: 'Następna strona',
    pag: 'str',
    all: 'Wszystkie',
  },
};

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
}: PaginationProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = i18n?.language?.substring(0, 2).toLowerCase() || 'ro';
  const tLocal = (key: string) => translations[currentLang]?.[key] || translations['en'][key] || key;

  const totalPages = itemsPerPage === 999999 ? 1 : Math.ceil(totalItems / itemsPerPage) || 1;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: 10, label: '10' },
    { value: 25, label: '25' },
    { value: 50, label: '50' },
    { value: 100, label: '100' },
    { value: 999999, label: tLocal('all') },
  ];

  const currentOption = options.find(o => o.value === itemsPerPage) || options[0];

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-center gap-4 py-1.5 px-4 bg-surface/80 border border-border rounded-xl max-w-fit mx-auto my-3 shadow-sm ${className}`}>
      {/* Left side: Items per page dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold text-text-secondary uppercase tracking-wider select-none">
          {tLocal('show')}:
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-2 py-0.5 bg-card hover:bg-surface text-text font-extrabold text-xs rounded-lg border border-border transition-all shadow-sm"
          >
            <span>{currentOption.label}</span>
            <ChevronDown className={`w-4 h-4 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 bottom-full mb-1 z-[50] w-28 bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1 animate-fade-in">
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onItemsPerPageChange(opt.value);
                    setIsOpen(false);
                    onPageChange(1); // Reset to page 1 on limit change
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors flex items-center justify-between ${
                    itemsPerPage === opt.value
                      ? 'bg-primary/15 text-primary border-l-4 border-primary font-extrabold'
                      : 'text-text-secondary hover:bg-surface border-l-4 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-bold text-text-secondary hidden sm:inline select-none">
          ({totalItems} {tLocal('total')})
        </span>
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center ${
            currentPage === 1
              ? 'border-border text-text-secondary bg-surface cursor-not-allowed'
              : 'border-border bg-card text-text hover:bg-primary hover:text-white hover:border-primary shadow-sm'
          }`}
          title={tLocal('previous')}
        >
          <ChevronLeft className="w-4 h-4 stroke-[3]" />
        </button>

        {getPageNumbers().map((pg, idx) => (
          <React.Fragment key={idx}>
            {typeof pg === 'string' ? (
              <span className="px-1.5 text-text-light font-extrabold text-xs select-none">{pg}</span>
            ) : (
              <button
                type="button"
                onClick={() => onPageChange(pg)}
                className={`min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center justify-center ${
                  currentPage === pg
                    ? 'bg-primary text-white shadow-sm border border-primary'
                    : 'bg-card text-text hover:bg-surface border border-border hover:border-border'
                }`}
              >
                {pg}
              </button>
            )}
          </React.Fragment>
        ))}

        <button
          type="button"
          onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`w-7 h-7 rounded-lg border transition-all flex items-center justify-center ${
            currentPage === totalPages
              ? 'border-border text-text-secondary bg-surface cursor-not-allowed'
              : 'border-border bg-card text-text hover:bg-primary hover:text-white hover:border-primary shadow-sm'
          }`}
          title={tLocal('next')}
        >
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}

