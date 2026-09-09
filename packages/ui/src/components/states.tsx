'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Skeleton } from './skeleton';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'py-6 px-4',
  md: 'py-10 px-6',
  lg: 'py-16 px-8',
};

const iconSize = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
};

function DefaultEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="9" x2="15" y2="15" />
      <line x1="15" y1="9" x2="9" y2="15" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles[size],
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground/50 mb-4',
          iconSize[size]
        )}
      >
        {icon || <DefaultEmptyIcon className={iconSize[size]} />}
      </div>
      <h3 className={cn('font-semibold', size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg')}>
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
      )}
      {action && (
        <div className="mt-4">{action}</div>
      )}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  retry?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function DefaultErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'Please try again or contact support if the problem persists.',
  icon,
  action,
  retry,
  size = 'md',
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles[size],
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-destructive-muted text-destructive mb-4',
          iconSize[size]
        )}
      >
        {icon || <DefaultErrorIcon className={iconSize[size]} />}
      </div>
      <h3 className={cn('font-semibold', size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg')}>
        {title}
      </h3>
      <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
      <div className="mt-4 flex items-center gap-2">
        {retry && (
          <Button variant="outline" size={size === 'sm' ? 'sm' : 'default'} onClick={retry}>
            Try Again
          </Button>
        )}
        {action}
      </div>
    </div>
  );
}

export interface LoadingStateProps {
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'inline';
  className?: string;
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LoadingState({
  title,
  description,
  size = 'md',
  variant = 'spinner',
  className,
}: LoadingStateProps) {
  const spinnerSize = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  if (variant === 'skeleton') {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <SpinnerIcon className={spinnerSize[size]} />
        {title && <span className="text-sm text-muted-foreground">{title}</span>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeStyles[size],
        className
      )}
    >
      <SpinnerIcon className={cn(spinnerSize[size], 'text-primary')} />
      {title && (
        <h3 className={cn('font-semibold mt-3', size === 'sm' ? 'text-base' : size === 'lg' ? 'text-xl' : 'text-lg')}>
          {title}
        </h3>
      )}
      {description && (
        <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
      )}
    </div>
  );
}