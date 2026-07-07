import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:mm
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  label?: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function CustomDatePicker({ dateValue, timeValue, onDateChange, onTimeChange, label }: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (dateValue) {
      const d = new Date(dateValue);
      if (!isNaN(d.getTime())) setCurrentMonth(d);
    }
  }, [dateValue]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // Also check if click is inside the portal
        const popup = document.getElementById('custom-datepicker-popup');
        if (popup && popup.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openPopup = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopupPos({ top: rect.bottom + 8, left: rect.left, width: 320 });
    }
    setIsOpen(true);
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

      let className = "w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ";
      
      if (isPast) {
        className += "text-text-muted cursor-not-allowed line-through opacity-50";
      } else if (isSelected) {
        className += "bg-primary text-white font-bold shadow-md shadow-primary/30";
      } else if (isToday) {
        className += "border border-primary text-primary font-bold cursor-pointer hover:bg-primary/10";
      } else {
        className += "text-text-primary cursor-pointer hover:bg-surface";
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

  const formatDisplayDate = () => {
    if (!dateValue) return 'Select Date';
    const d = new Date(dateValue);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-text-secondary mb-1.5 flex items-center gap-1">
          <CalendarIcon className="w-3 h-3" /> {label}
        </label>
      )}
      <div className="flex gap-2">
        {/* Date Input */}
        <div 
          onClick={openPopup}
          className="input flex-1 bg-white dark:bg-card text-sm flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors"
        >
          <span className={dateValue ? 'text-text-primary' : 'text-text-muted'}>
            {formatDisplayDate()}
          </span>
          <CalendarIcon className="w-4 h-4 text-text-secondary" />
        </div>
        
        {/* Time Input */}
        <div className="relative w-28">
          <input
            type="time"
            value={timeValue}
            onChange={e => onTimeChange(e.target.value)}
            className="input w-full bg-white dark:bg-card text-sm pl-8"
            style={{ colorScheme: 'light' }}
          />
          <Clock className="w-4 h-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          id="custom-datepicker-popup"
          className="fixed z-[9999] bg-card border border-border rounded-xl shadow-2xl p-4 w-[280px]"
          style={{ top: popupPos.top, left: popupPos.left, animation: 'fadeUp 0.15s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-surface rounded-lg transition-colors text-text-secondary">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="font-bold text-sm text-text-primary">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-surface rounded-lg transition-colors text-text-secondary">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(day => (
              <div key={day} className="text-center text-[10px] font-bold text-text-muted uppercase">
                {day}
              </div>
            ))}
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
