import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function Spinner({ className, size = 'md', label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size], className)} />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </span>
  );
}
