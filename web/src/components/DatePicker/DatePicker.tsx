import React, { useState, useRef } from 'react';
import Flatpickr from 'react-flatpickr';
import { Calendar, ChevronDown } from 'lucide-react';
import 'flatpickr/dist/themes/light.css';
import styles from './DatePicker.module.css';
import { useLanguage } from '@/context/LanguageContext';

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
  const { lang } = useLanguage();

  const handleWrapperClick = () => {
    if (fpRef.current && fpRef.current.flatpickr) {
      fpRef.current.flatpickr.open();
    }
  };

  const isPastDate = (val: string) => {
    if (!val) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(val);
    selected.setHours(0, 0, 0, 0);
    return selected < today;
  };

  const pastError = isPastDate(value);

  const getErrorMessage = () => {
    if (lang === 'RO') return 'Data selectată nu poate fi în trecut.';
    if (lang === 'NL') return 'De geselecteerde datum mag niet in het verleden liggen.';
    if (lang === 'DE') return 'Das ausgewählte Datum darf nicht in der Vergangenheit liegen.';
    if (lang === 'FR') return 'La date sélectionnée ne peut pas être dans le passé.';
    if (lang === 'ES') return 'La fecha seleccionada no puede estar en el pasado.';
    return 'Selected date cannot be in the past.';
  };

  return (
    <div className="flex flex-col gap-1 w-full">
      <div 
        className={`${styles.wrapper} ${isFocused ? styles.wrapperFocused : ''} ${className}`}
        onClick={handleWrapperClick}
        style={pastError ? { borderColor: '#ef4444', backgroundColor: 'rgba(254, 226, 226, 0.2)' } : {}}
      >
        <Calendar className={styles.icon} style={pastError ? { color: '#ef4444' } : {}} />
        <Flatpickr
          ref={fpRef}
          value={value}
          onChange={(dates, dateStr) => {
            onChange(dateStr);
          }}
          onOpen={() => setIsFocused(true)}
          onClose={() => setIsFocused(false)}
          className={`${styles.input} ${value ? styles.inputHasValue : ''} ${pastError ? 'text-red-600 font-semibold' : ''}`}
          options={{
            altInput: true,
            altFormat: 'd/m/Y',
            dateFormat: 'Y-m-d',
            allowInput: false,
            minDate: 'today',
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
      {pastError && (
        <span className="text-xs font-semibold pl-1 animate-fade-in" style={{ color: '#dc2626', fontSize: '0.75rem' }}>
          ⚠️ {getErrorMessage()}
        </span>
      )}
    </div>
  );
}
