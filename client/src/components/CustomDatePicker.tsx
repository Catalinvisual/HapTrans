import React from 'react';
import { useTranslation } from 'react-i18next';
import DateField from './dashboard/DateField';
import TimeField from './TimeField';

interface CustomDatePickerProps {
  dateValue: string; // YYYY-MM-DD
  timeValue: string; // HH:mm
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  label?: React.ReactNode;
  /** Booking forms block past dates by default; audit/history forms can opt in. */
  allowPast?: boolean;
  minDate?: string;
  className?: string;
}

export default function CustomDatePicker({
  dateValue,
  timeValue,
  onDateChange,
  onTimeChange,
  label,
  allowPast = false,
  minDate,
  className = '',
}: CustomDatePickerProps) {
  const { i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);

  return (
    <div className={`flex w-full flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
          {label}
        </label>
      )}
      <div className="flex items-start gap-2">
        <DateField
          className="min-w-0 flex-1"
          value={dateValue}
          onChange={onDateChange}
          lang={lang}
          allowPast={allowPast}
          min={minDate}
        />
        <TimeField
          className="w-[112px] shrink-0"
          value={timeValue}
          onChange={onTimeChange}
        />
      </div>
    </div>
  );
}
