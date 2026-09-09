'use client';

import * as React from 'react';
import { cn } from '../lib/cn';
import { Button } from './button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from './breadcrumb';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from './dropdown-menu';
import { ChevronDown, Columns, Density, Download } from './icons';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  primaryAction,
  secondaryActions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6', className)}>
      <div className="flex-1 min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb className="mb-3" aria-label="Breadcrumb">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.label || index}>
                  {index === breadcrumbs.length - 1 ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : crumb.href ? (
                    <>
                      <BreadcrumbLink asChild>
                        <a href={crumb.href}>{crumb.label}</a>
                      </BreadcrumbLink>
                      <BreadcrumbSeparator />
                    </>
                  ) : (
                    <>
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      <BreadcrumbSeparator />
                    </>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {secondaryActions}
        {primaryAction}
      </div>
    </div>
  );
}

export interface PageToolbarProps {
  search?: {
    placeholder?: string;
    value?: string;
    onChange?: (value: string) => void;
    onSubmit?: (value: string) => void;
  };
  filters?: React.ReactNode;
  savedViews?: {
    currentView?: string;
    views: Array<{ id: string; label: string }>;
    onChange: (viewId: string) => void;
  };
  columns?: {
    columns: Array<{ id: string; label: string; visible: boolean }>;
    onToggle: (columnId: string) => void;
  };
  density?: {
    value: 'compact' | 'standard' | 'comfortable';
    onChange: (value: 'compact' | 'standard' | 'comfortable') => void;
  };
  exportAction?: React.ReactNode;
  className?: string;
}

export function PageToolbar({
  search,
  filters,
  savedViews,
  columns,
  density,
  exportAction,
  className,
}: PageToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        'border-t pt-4',
        className
      )}
    >
      {search && (
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <label htmlFor="toolbar-search" className="sr-only">
            Search
          </label>
          <input
            id="toolbar-search"
            type="search"
            placeholder={search.placeholder || 'Search…'}
            value={search.value || ''}
            onChange={(e) => search.onChange?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search.onSubmit?.(e.currentTarget.value)}
            className="w-full h-9 pl-9 pr-4 text-sm border border-input bg-background rounded-md placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      )}

      {filters && <div className="flex-1">{filters}</div>}

      <div className="flex items-center gap-2 ml-auto flex-wrap">
        {savedViews && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <Columns className="h-4 w-4" />
                <span>{savedViews.currentView || 'Default View'}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Saved Views</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.views.map((view) => (
                <DropdownMenuItem
                  key={view.id}
                  onSelect={() => savedViews.onChange(view.id)}
                  className={savedViews.currentView === view.id ? 'bg-accent' : ''}
                >
                  {view.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {columns && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <Columns className="h-4 w-4" />
                <span>Columns</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-80 overflow-auto">
              <DropdownMenuLabel>Columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.columns.map((col) => (
                <DropdownMenuItem
                  key={col.id}
                  onSelect={() => columns.onToggle(col.id)}
                  className="flex items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={col.visible}
                    onChange={() => columns.onToggle(col.id)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>{col.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {density && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <Density className="h-4 w-4" />
                <span>
                  {density.value === 'compact' ? 'Compact' : density.value === 'comfortable' ? 'Comfortable' : 'Standard'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Row Density</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => density.onChange('compact')}
                className={density.value === 'compact' ? 'bg-accent' : ''}
              >
                Compact
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => density.onChange('standard')}
                className={density.value === 'standard' ? 'bg-accent' : ''}
              >
                Standard
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => density.onChange('comfortable')}
                className={density.value === 'comfortable' ? 'bg-accent' : ''}
              >
                Comfortable
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {exportAction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 h-9">
                <Download className="h-4 w-4" />
                <span>Export</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {exportAction}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  badge,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">{title}</h2>
        {badge}
      </div>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xl">{description}</p>
      )}
      {action && (
        <div className="ml-auto sm:ml-0">{action}</div>
      )}
    </div>
  );
}