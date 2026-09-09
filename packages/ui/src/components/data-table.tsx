'use client';

import * as React from 'react';
import { cn } from '../lib/cn';

export interface DataTableColumn<TData = unknown> {
  id: string;
  header: string;
  accessorKey?: string;
  cell?: (row: TData) => React.ReactNode;
}

export interface DataTableProps<TData = unknown> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  isLoading?: boolean;
  error?: Error | null;
  rowCount?: number;
  pagination?: {
    pageIndex: number;
    pageSize: number;
    onPaginationChange: (pageIndex: number, pageSize: number) => void;
  };
  density?: 'compact' | 'standard' | 'comfortable';
  onDensityChange?: (density: 'compact' | 'standard' | 'comfortable') => void;
  selectable?: boolean;
  enableExport?: boolean;
  onExport?: () => void;
  onRowClick?: (row: TData) => void;
  emptyMessage?: string;
  emptyDescription?: string;
  children?: React.ReactNode;
}

const rowDensity = {
  compact: 'px-3 py-1.5 text-sm',
  standard: 'px-4 py-3 text-sm',
  comfortable: 'px-4 py-4 text-base',
};

const headerDensity = {
  compact: 'px-3 py-2',
  standard: 'px-4 py-3',
  comfortable: 'px-4 py-4',
};

function SkeletonCell({ className }: { className?: string }) {
  return <div className={cn('h-4 w-full bg-muted animate-pulse rounded', className)} />;
}

export function DataTable<TData = unknown>({
  columns,
  data,
  isLoading = false,
  error = null,
  pagination,
  density = 'standard',
  onDensityChange,
  selectable = false,
  enableExport = false,
  onExport,
  onRowClick,
  emptyMessage,
  emptyDescription,
}: DataTableProps<TData>) {
  const cell = (row: TData, column: DataTableColumn<TData>) => {
    if (column.cell) return column.cell(row);
    if (column.accessorKey) {
      const value = (row as Record<string, unknown>)[column.accessorKey];
      return value == null ? '' : String(value);
    }
    return '';
  };

  const colWidth = columns.length ? `grid-cols-[${selectable ? '2.5rem, ' : ''}repeat(${columns.length}, minmax(150px, auto))]` : '';

  return (
    <div className="rounded-md border overflow-hidden" role="region" aria-label="Data table">
      <div className="flex items-center justify-between border-b bg-muted/50 p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-accent"
            aria-label="Columns"
          >
            Columns
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm font-medium hover:bg-accent"
            aria-label="Density"
            onClick={() =>
              onDensityChange?.(
                density === 'compact'
                  ? 'standard'
                  : density === 'standard'
                    ? 'comfortable'
                    : 'compact'
              )
            }
          >
            Density: {density}
          </button>
        </div>
        {enableExport && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onExport}
          >
            <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid gap-4" style={{ gridTemplateColumns: colWidth }}>
              {selectable && <SkeletonCell />}
              {columns.map((c) => (
                <SkeletonCell key={c.id} />
              ))}
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-center">
          <p className="mb-2 text-destructive font-medium">Error loading data</p>
          <p className="mb-4 text-muted-foreground text-sm">{error.message}</p>
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className="p-10 text-center">
          <p className="font-medium text-muted-foreground">{emptyMessage ?? 'No data available'}</p>
          {emptyDescription && (
            <p className="mt-1 text-sm text-muted-foreground/70">{emptyDescription}</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="border-b">
              <tr className="text-left">
                {selectable && (
                  <th className={cn(headerDensity[density], 'w-10')}>
                    <span className="sr-only">Select</span>
                  </th>
                )}
                {columns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={cn(
                      headerDensity[density],
                      'whitespace-nowrap font-medium text-muted-foreground'
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={cn(
                    'transition-colors hover:bg-accent/50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className={cn(rowDensity[density], 'w-10')}>
                      <span className="sr-only">Select row</span>
                    </td>
                  )}
                  {columns.map((column) => (
                    <td key={column.id} className={cn(rowDensity[density], 'whitespace-nowrap')}>
                      {cell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination && (
        <div className="flex items-center justify-between border-t bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">
            Page {pagination.pageIndex + 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pagination.pageIndex === 0}
              onClick={() =>
                pagination.onPaginationChange(pagination.pageIndex - 1, pagination.pageSize)
              }
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                pagination.onPaginationChange(pagination.pageIndex + 1, pagination.pageSize)
              }
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Button({
  type,
  size,
  variant,
  disabled,
  onClick,
  className,
  children,
}: {
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'default';
  variant?: 'outline' | 'default';
  disabled?: boolean;
  onClick?: (() => void) | undefined;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type={type ?? 'button'}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-sm' : 'h-9 px-4 text-sm',
        variant === 'outline'
          ? 'border bg-background hover:bg-accent'
          : 'bg-primary text-primary-foreground hover:bg-primary/90',
        className
      )}
    >
      {children}
    </button>
  );
}
Button.displayName = 'Button';

