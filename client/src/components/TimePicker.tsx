import TimeField from './TimeField';

interface TimePickerProps {
  value: string; // "HH:mm" format
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

/** Backwards-compatible wrapper around the shared premium time field. */
export function TimePicker({ value, onChange, label, className = '', placeholder = '--:--' }: TimePickerProps) {
  return (
    <TimeField
      value={value}
      onChange={onChange}
      label={label}
      className={className}
      placeholder={placeholder}
    />
  );
}
