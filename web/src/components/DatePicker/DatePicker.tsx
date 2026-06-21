import React, { useState, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import { Calendar, ChevronDown } from 'lucide-react';
import 'flatpickr/dist/themes/light.css';
import styles from './DatePicker.module.css';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = 'DD/MM/YYYY', className = '', required = false }: DatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);
  const fpRef = useRef<any>(null);

  const handleWrapperClick = () => {
    if (fpRef.current && fpRef.current.flatpickr) {
      fpRef.current.flatpickr.open();
    }
  };

  return (
    <div 
      className={`${styles.wrapper} ${isFocused ? styles.wrapperFocused : ''} ${className}`}
      onClick={handleWrapperClick}
    >
      <Calendar className={styles.icon} />
      <Flatpickr
        ref={fpRef}
        value={value}
        onChange={(dates, dateStr) => {
          onChange(dateStr);
        }}
        onOpen={() => setIsFocused(true)}
        onClose={() => setIsFocused(false)}
        className={`${styles.input} ${value ? styles.inputHasValue : ''}`}
        options={{
          altInput: true,
          altFormat: 'd/m/Y',
          dateFormat: 'Y-m-d',
          allowInput: true,
        }}
        placeholder={placeholder}
        required={required}
      />
      <ChevronDown className={`${styles.chevron} ${isFocused ? styles.chevronOpen : ''}`} />
      <style dangerouslySetInnerHTML={{ __html: `
        /* Overriding flatpickr active day styling to match orange */
        .flatpickr-day.selected, .flatpickr-day.startRange, .flatpickr-day.endRange, .flatpickr-day.selected.inRange, .flatpickr-day.startRange.inRange, .flatpickr-day.endRange.inRange, .flatpickr-day.selected:focus, .flatpickr-day.startRange:focus, .flatpickr-day.endRange:focus, .flatpickr-day.selected:hover, .flatpickr-day.startRange:hover, .flatpickr-day.endRange:hover, .flatpickr-day.selected.prevMonthDay, .flatpickr-day.startRange.prevMonthDay, .flatpickr-day.endRange.prevMonthDay, .flatpickr-day.selected.nextMonthDay, .flatpickr-day.startRange.nextMonthDay, .flatpickr-day.endRange.nextMonthDay {
          background: #FF5A00;
          border-color: #FF5A00;
        }
      `}} />
    </div>
  );
}
