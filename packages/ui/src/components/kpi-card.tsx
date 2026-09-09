'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { Card, CardContent } from './card';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
  description?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

function ArrowUp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}
function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function Minus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted',
        className
      )}
    />
  );
}

export function KpiCard({
  title,
  value,
  change,
  icon,
  description,
  variant = 'default',
  size = 'md',
  loading = false,
}: KpiCardProps) {
  const sizeStyles = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const iconSize = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const valueSize = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const variantStyles = {
    default: '',
    primary: 'border-l-4 border-l-primary',
    success: 'border-l-4 border-l-success',
    warning: 'border-l-4 border-l-warning',
    destructive: 'border-l-4 border-l-destructive',
  };

  if (loading) {
    return (
      <Card className={cn(sizeStyles[size], variantStyles[variant])}>
        <CardContent className="pt-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-3/4 mb-2" />
              <Skeleton className={cn(valueSize[size], 'w-1/2')} />
              {description && <Skeleton className="h-3 w-2/3 mt-2" />}
            </div>
            {icon && <Skeleton className={cn(iconSize[size], 'flex-shrink-0')} />}
          </div>
          {change && (
            <Skeleton className="h-4 w-24 mt-3" />
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(sizeStyles[size], variantStyles[variant])}>
      <CardContent className="pt-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className={cn('font-semibold tabular-nums mt-1', valueSize[size])}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{description}</p>
            )}
          </div>
          {icon && (
            <div className={cn(iconSize[size], 'flex-shrink-0 text-muted-foreground/50')}>
              {icon}
            </div>
          )}
        </div>
        {change && (
          <div
            className={cn(
              'flex items-center gap-1 mt-3 text-xs font-medium',
              change.trend === 'up' && 'text-success',
              change.trend === 'down' && 'text-destructive',
              change.trend === 'neutral' && 'text-muted-foreground'
            )}
          >
            {change.trend === 'up' && <ArrowUp className="h-3 w-3" />}
            {change.trend === 'down' && <ArrowDown className="h-3 w-3" />}
            {change.trend === 'neutral' && <Minus className="h-3 w-3" />}
            <span>{change.value >= 0 ? '+' : ''}{change.value.toFixed(1)}%</span>
            {change.label && <span className="text-muted-foreground">{change.label}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}