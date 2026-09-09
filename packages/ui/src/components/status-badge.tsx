'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  variant?: 'default' | 'outline' | 'subtle';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  planned: { bg: 'bg-status-planned-muted', text: 'text-status-planned', border: 'border-status-planned' },
  assigned: { bg: 'bg-status-assigned-muted', text: 'text-status-assigned', border: 'border-status-assigned' },
  confirmed: { bg: 'bg-status-confirmed-muted', text: 'text-status-confirmed', border: 'border-status-confirmed' },
  dispatched: { bg: 'bg-status-dispatched-muted', text: 'text-status-dispatched', border: 'border-status-dispatched' },
  active: { bg: 'bg-status-active-muted', text: 'text-status-active', border: 'border-status-active' },
  'on-time': { bg: 'bg-status-on-time-muted', text: 'text-status-on-time', border: 'border-status-on-time' },
  'at-risk': { bg: 'bg-status-at-risk-muted', text: 'text-status-at-risk', border: 'border-status-at-risk' },
  delayed: { bg: 'bg-status-delayed-muted', text: 'text-status-delayed', border: 'border-status-delayed' },
  completed: { bg: 'bg-status-completed-muted', text: 'text-status-completed', border: 'border-status-completed' },
  cancelled: { bg: 'bg-status-cancelled-muted', text: 'text-status-cancelled', border: 'border-status-cancelled' },
  offline: { bg: 'bg-status-offline-muted', text: 'text-status-offline', border: 'border-status-offline' },
  available: { bg: 'bg-status-available-muted', text: 'text-status-available', border: 'border-status-available' },
  exception: { bg: 'bg-status-exception-muted', text: 'text-status-exception', border: 'border-status-exception' },
  pending: { bg: 'bg-status-pending-muted', text: 'text-status-pending', border: 'border-status-pending' },
  approved: { bg: 'bg-status-approved-muted', text: 'text-status-approved', border: 'border-status-approved' },
  rejected: { bg: 'bg-status-rejected-muted', text: 'text-status-rejected', border: 'border-status-rejected' },
  success: { bg: 'bg-success-muted', text: 'text-success', border: 'border-success' },
  warning: { bg: 'bg-warning-muted', text: 'text-warning', border: 'border-warning' },
  info: { bg: 'bg-info-muted', text: 'text-info', border: 'border-info' },
  destructive: { bg: 'bg-destructive-muted', text: 'text-destructive', border: 'border-destructive' },
  default: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

const iconMap: Record<string, React.ReactNode> = {
  planned: <Clock className="h-3 w-3" />,
  assigned: <UserCheck className="h-3 w-3" />,
  confirmed: <CheckCircle2 className="h-3 w-3" />,
  dispatched: <Truck className="h-3 w-3" />,
  active: <Activity className="h-3 w-3" />,
  'on-time': <CheckCircle2 className="h-3 w-3" />,
  'at-risk': <AlertTriangle className="h-3 w-3" />,
  delayed: <ClockAlert className="h-3 w-3" />,
  completed: <CheckCircle className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  offline: <WifiOff className="h-3 w-3" />,
  available: <CheckCircle className="h-3 w-3" />,
  exception: <AlertOctagon className="h-3 w-3" />,
  pending: <Clock className="h-3 w-3" />,
  approved: <CheckCircle className="h-3 w-3" />,
  rejected: <XCircle className="h-3 w-3" />,
  success: <CheckCircle className="h-3 w-3" />,
  warning: <AlertTriangle className="h-3 w-3" />,
  info: <Info className="h-3 w-3" />,
  destructive: <AlertCircle className="h-3 w-3" />,
};

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function UserCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <polyline points="17 11 19 13 23 9" />
    </svg>
  );
}
function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 12 20 16 10 22" />
    </svg>
  );
}
function Truck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14" />
      <path d="M5 12a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5" />
      <circle cx="12" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
function Activity({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 12 20 16 10 22" />
    </svg>
  );
}
function XCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function WifiOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 1.42l21.16 21.16" />
    </svg>
  );
}
function AlertOctagon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function ClockAlert({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function Info({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function AlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, variant = 'default', showIcon = true, size = 'md', ...props }, ref) => {
    const styleEntry = statusStyles[status] ?? statusStyles.default;
    const styles = styleEntry as { bg: string; text: string; border: string };
    const Icon = iconMap[status];

    const baseClasses = 'inline-flex items-center gap-1.5 font-medium rounded-full border';
    const variantClasses = {
      default: `${styles.bg} ${styles.text}`,
      outline: `${styles.text} ${styles.border} bg-transparent`,
      subtle: `${styles.bg} ${styles.text}`,
    };

    return (
      <span
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeStyles[size], className)}
        {...props}
      >
        {showIcon && Icon && <span aria-hidden="true">{Icon}</span>}
        <span>{status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ')}</span>
      </span>
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

export { StatusBadge };