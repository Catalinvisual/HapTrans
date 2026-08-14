import type { ReactNode } from 'react';
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (row: T) => ReactNode;
  className?: string;
  hideBelow?: 'lg' | 'md' | 'sm';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: Set<string>;
  onSelectionChange?: (sel: Set<string>) => void;
  sortKey?: string;
  sortDir?: 'asc' | 'desc';
  onSortChange?: (key: string, dir: 'asc' | 'desc') => void;
  footer?: ReactNode;
  loading?: boolean;
  emptyState?: ReactNode;
  minWidth?: string;
  highlightRow?: (row: T) => string | undefined;
}

export default function DataTable<T>({
  columns, data, rowKey, onRowClick, selectable, selected, onSelectionChange,
  sortKey, sortDir, onSortChange, footer, loading, emptyState, minWidth = '900px', highlightRow,
}: DataTableProps<T>) {
  const allSelected = data.length > 0 && (selected?.size || 0) === data.length;
  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selected || []);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange(next);
  };
  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(data.map(rowKey)));
  };
  const handleSort = (key: string) => {
    if (!onSortChange) return;
    const dir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc';
    onSortChange(key, dir);
  };

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse" style={{ minWidth }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface/80 backdrop-blur border-b border-border">
            {selectable && (
              <th className="table-header px-3 py-3 w-10">
                <input type="checkbox" className="w-4 h-4 accent-orange-500 cursor-pointer" checked={allSelected} onChange={toggleAll} />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                className={`table-header px-3.5 py-2.5 font-medium text-[11px] text-text-secondary uppercase tracking-wider whitespace-nowrap select-none text-left ${col.sortable ? 'cursor-pointer hover:text-primary' : ''} ${col.hideBelow ? `hidden ${col.hideBelow === 'lg' ? 'lg:table-cell' : col.hideBelow === 'md' ? 'md:table-cell' : 'sm:table-cell'}` : ''}`}
                style={{ width: col.width }}
              >
                <span className="inline-flex items-center gap-1 font-medium text-[11px] text-text-secondary">
                  {col.label}
                  {col.sortable && (sortKey === col.key ? (sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-primary" /> : <ArrowDown className="w-3 h-3 text-primary" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        {data.length > 0 && (
          <tbody className="divide-y divide-border/60">
            {data.map((row, ri) => {
              const id = rowKey(row);
              const isSelected = selected?.has(id);
              const highlight = highlightRow?.(row);
              return (
                <tr
                  key={id}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`${onRowClick ? 'cursor-pointer' : ''} ${ri % 2 === 1 ? 'bg-surface/25' : ''} ${isSelected ? 'bg-primary/5' : ''} ${highlight || ''} hover:bg-primary/[0.06] transition-colors`}
                >
                  {selectable && (
                    <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 accent-orange-500 cursor-pointer" checked={!!isSelected} onChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={`px-3.5 py-3 text-[13px] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.hideBelow ? `hidden ${col.hideBelow === 'lg' ? 'lg:table-cell' : col.hideBelow === 'md' ? 'md:table-cell' : 'sm:table-cell'}` : ''}`}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        )}
        {footer && <tfoot><tr className="bg-surface/60 border-t border-border/80">{footer}</tr></tfoot>}
      </table>
      {loading && <div className="flex justify-center p-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}
      {!loading && data.length === 0 && (emptyState || (
        <div className="p-12 text-center text-sm text-text-secondary">
          <div className="w-14 h-14 bg-surface rounded-full flex items-center justify-center mx-auto mb-3">
            <ChevronsUpDown className="w-6 h-6 text-text-muted" />
          </div>
          <p className="font-medium text-text-primary mb-1">No data</p>
          <p className="text-xs">Adjust filters or add new records to get started.</p>
        </div>
      ))}
    </div>
  );
}
