import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CustomDatePickerProps {
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:mm
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  label?: string;
}



export default function CustomDatePicker({ dateValue, timeValue, onDateChange, onTimeChange, label }: CustomDatePickerProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [isTimeOpen, setIsTimeOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (dateValue) {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) setCurrentMonth(d);
    }
  }, [dateValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      
      const datePopup = document.getElementById('custom-datepicker-popup');
      const timePopup = document.getElementById('custom-timepicker-popup');
      
      let clickedInsideDate = containerRef.current?.contains(target) || datePopup?.contains(target);
      let clickedInsideTime = timeRef.current?.contains(target) || timePopup?.contains(target);

      if (!clickedInsideDate && isOpen) setIsOpen(false);
      if (!clickedInsideTime && isTimeOpen) setIsTimeOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, isTimeOpen]);


  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as Node;
      const datePopup = document.getElementById('custom-datepicker-popup');
      const timePopup = document.getElementById('custom-timepicker-popup');
      
      // Ignore scrolls that happen INSIDE the popups
      if (datePopup?.contains(target) || timePopup?.contains(target)) {
        return;
      }

      if (isOpen) setIsOpen(false);
      if (isTimeOpen) setIsTimeOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true); // true for capture phase to catch modal scroll
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen, isTimeOpen]);

  const openPopup = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const popupHeight = 310;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top = rect.bottom + 8;
      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        top = rect.top - popupHeight - 8;
      }
      setPopupPos({ top, left: rect.left, width: 320 });
    }
    setIsOpen(true);
  };

  const toggleTime = () => {
    if (!isTimeOpen && timeRef.current) {
      const rect = timeRef.current.getBoundingClientRect();
      const popupHeight = 192; // h-48 is 192px
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      let top = rect.bottom + 8;
      if (spaceBelow < popupHeight && spaceAbove > spaceBelow) {
        top = rect.top - popupHeight - 8;
      }
      setPopupPos({ top, left: rect.left, width: 140 });
    }
    setIsTimeOpen(!isTimeOpen);
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => {
    let day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Make Monday 0
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />);
    }

    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const isPast = dateObj < today;
      
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isSelected = dateValue === dateStr;
      const isToday = dateObj.getTime() === today.getTime();

      let className = "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-200 ";
      
      if (isPast) {
        className += "text-text-muted/40 cursor-not-allowed opacity-35";
      } else if (isSelected) {
        className += "bg-primary text-white font-bold shadow-lg shadow-primary/35 scale-105 hover:bg-primary-dark";
      } else if (isToday) {
        className += "border-2 border-primary text-primary font-bold cursor-pointer hover:bg-primary/10 hover:scale-105";
      } else {
        className += "text-text-primary cursor-pointer hover:bg-surface hover:text-primary hover:scale-105 font-medium";
      }

      days.push(
        <div
          key={d}
          className={className}
          onClick={() => {
            if (!isPast) {
              onDateChange(dateStr);
              setIsOpen(false);
            }
          }}
        >
          {d}
        </div>
      );
    }
    return days;
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };


  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">{label}</label>}
      <div className="flex items-center gap-2 relative">
        
        {/* Date Input Custom */}
        <div className="relative flex-1" ref={containerRef}>
          <div 
            onClick={openPopup}
            className={`input w-full bg-white dark:bg-card text-sm pl-8 flex items-center cursor-pointer hover:border-primary/50 transition-colors h-[38px] ${isOpen ? 'border-primary ring-2 ring-primary/20' : ''}`}
          >
            <CalendarIcon className="w-4 h-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className={dateValue ? 'text-text-primary' : 'text-text-muted'}>
              {dateValue && !isNaN(new Date(dateValue).getTime()) ? new Date(dateValue).toLocaleDateString(i18n.language || 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : t('selectDate', 'Select Date')}
            </span>
          </div>
        </div>
        
        {/* Time Input Custom */}
        <div className="relative w-28" ref={timeRef}>
          <div
            onClick={toggleTime}
            className="input w-full bg-white dark:bg-card text-sm pl-8 flex relative items-center cursor-pointer hover:border-primary/50 transition-colors h-[38px]"
          >
            <Clock className="w-4 h-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className={timeValue ? 'text-text-primary' : 'text-text-muted'}>
              {timeValue || '--:--'}
            </span>
          </div>
          
          {isTimeOpen && typeof document !== 'undefined' && createPortal(
            <div 
              id="custom-timepicker-popup"
              className="fixed z-[20002] bg-card border border-border rounded-xl shadow-xl p-2 flex gap-1 h-48 w-[140px]"
              style={{ top: popupPos.top, left: popupPos.left, animation: 'fadeUp 0.15s ease-out' }}
            >
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {Array.from({ length: 24 }).map((_, i) => {
                  const h = String(i).padStart(2, '0');
                  const currentH = timeValue?.split(':')[0];
                  return (
                    <div
                      key={`h-${h}`}
                      onClick={() => onTimeChange(`${h}:${timeValue?.split(':')[1] || '00'}`)}
                      className={`py-1.5 px-2 text-center text-sm rounded cursor-pointer mb-1 ${currentH === h ? 'bg-primary text-white font-bold' : 'hover:bg-surface text-text-primary'}`}
                    >
                      {h}
                    </div>
                  );
                })}
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                {['00', '15', '30', '45'].map(m => {
                  const currentM = timeValue?.split(':')[1];
                  return (
                    <div
                      key={`m-${m}`}
                      onClick={() => {
                        onTimeChange(`${timeValue?.split(':')[0] || '00'}:${m}`);
                        setIsTimeOpen(false); // close after full selection
                      }}
                      className={`py-1.5 px-2 text-center text-sm rounded cursor-pointer mb-1 ${currentM === m ? 'bg-primary text-white font-bold' : 'hover:bg-surface text-text-primary'}`}
                    >
                      {m}
                    </div>
                  );
                })}
              </div>
            </div>,
            document.body
          )}
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id="custom-datepicker-popup"
          className="fixed z-[20002] bg-card border border-border rounded-xl shadow-2xl p-4 w-[280px]"
          style={{ top: popupPos.top, left: popupPos.left, animation: 'fadeUp 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface rounded-lg transition-colors text-text-secondary">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-sm text-text-primary capitalize">
              {new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toLocaleString(i18n.language || 'en', { month: 'long' })} {currentMonth.getFullYear()}
            </div>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface rounded-lg transition-colors text-text-secondary">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {Array.from({ length: 7 }).map((_, i) => {
              // 2024-01-01 was a Monday
              const d = new Date(2024, 0, i + 1);
              return (
                <div key={i} className="text-center text-[10px] font-bold text-text-muted uppercase">
                  {d.toLocaleString(i18n.language || 'en', { weekday: 'short' })}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-7 gap-1 place-items-center">
            {renderCalendar()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
