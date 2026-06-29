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

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = '',
}: PaginationProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    { value: 10, label: '10 / pag' },
    { value: 25, label: '25 / pag' },
    { value: 50, label: '50 / pag' },
    { value: 100, label: '100 / pag' },
    { value: 999999, label: 'All' },
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
    <div className={`flex flex-wrap items-center justify-between gap-4 p-4 bg-white border-t border-border rounded-b-2xl ${className}`}>
      {/* Left side: Items per page dropdown */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold text-text-secondary uppercase">
          {t('show') || 'Afișează'}:
        </span>
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface/80 text-text font-bold text-xs rounded-xl border border-border transition-all shadow-sm"
          >
            <span>{currentOption.label}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute left-0 bottom-full mb-1 z-[50] w-28 bg-white border border-border rounded-xl shadow-xl overflow-hidden py-1 animate-fade-in">
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
                      ? 'bg-primary/10 text-primary border-l-2 border-primary'
                      : 'text-text hover:bg-surface border-l-2 border-transparent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="text-xs font-medium text-text-secondary hidden sm:inline">
          ({totalItems} {t('total') || 'total'})
        </span>
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
            currentPage === 1
              ? 'border-border/50 text-border bg-surface/30 cursor-not-allowed'
              : 'border-border bg-white text-text-secondary hover:bg-surface hover:text-primary shadow-sm'
          }`}
          title={t('previous') || 'Pagina anterioară'}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((pg, idx) => (
          <React.Fragment key={idx}>
            {typeof pg === 'string' ? (
              <span className="px-1 text-text-secondary font-bold text-xs">{pg}</span>
            ) : (
              <button
                type="button"
                onClick={() => onPageChange(pg)}
                className={`min-w-[28px] h-[28px] px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                  currentPage === pg
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white border border-border text-text-secondary hover:bg-surface hover:text-text shadow-sm'
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
          className={`p-1.5 rounded-xl border transition-all flex items-center justify-center ${
            currentPage === totalPages
              ? 'border-border/50 text-border bg-surface/30 cursor-not-allowed'
              : 'border-border bg-white text-text-secondary hover:bg-surface hover:text-primary shadow-sm'
          }`}
          title={t('next') || 'Pagina următoare'}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
