import React, { useState } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (dateStr: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function DatePicker({ value, onChange, placeholder = 'DD/MM/YYYY', className = '', required = false }: DatePickerProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div 
      className={`
        w-full transition-all duration-150 rounded-lg bg-white
        ${isFocused ? 'ring-2 ring-[#FF5A00]/20' : ''}
      `}
    >
      <Flatpickr
        value={value}
        onChange={(dates, dateStr) => {
          onChange(dateStr);
        }}
        onOpen={() => setIsFocused(true)}
        onClose={() => setIsFocused(false)}
        className={`
          w-full px-3 py-2.5 rounded-lg border outline-none text-sm transition-colors
          ${isFocused ? 'border-[#FF5A00]' : 'border-gray-300 hover:border-[#FF5A00]/50'}
          ${value ? 'text-gray-900 font-medium' : 'text-gray-400'}
          ${className}
        `}
        options={{
          altInput: true,
          altFormat: 'd/m/Y',
          dateFormat: 'Y-m-d',
          allowInput: true,
        }}
        placeholder={placeholder}
        required={required}
      />
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
