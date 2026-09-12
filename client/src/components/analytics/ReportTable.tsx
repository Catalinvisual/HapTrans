import { fmtMoney, fmtNumber, fmtPercent } from '../../lib/format';
import { appLocale } from '../../lib/format';

export type ReportColumnType = 'currency' | 'percent' | 'number' | 'date' | 'text';

export interface ReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  type?: ReportColumnType;
  width?: string;
}

interface ReportTableProps {
  columns: ReportColumn[];
  rows: any[];
  maxHeight?: number;
  totalRow?: string[];
}

function cellValue(v: any, type?: ReportColumnType): string {
  if (v === null || v === undefined || v === '' || v === '—') return '—';
  switch (type) {
    case 'currency': return fmtMoney(v);
    case 'percent': return fmtPercent(v, 1);
    case 'number': return fmtNumber(v, Number(v) % 1 !== 0 ? 1 : 0);
    case 'date':
      return new Date(v).toLocaleDateString(appLocale());
    default: {
      if (v instanceof Date) return v.toLocaleDateString(appLocale());
      return String(v);
    }
  }
}

export default function ReportTable({ columns, rows, maxHeight, totalRow }: ReportTableProps) {
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse" style={{ minWidth: '720px' }}>
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface/80 backdrop-blur border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className="table-header px-3.5 py-2.5 font-medium text-[11px] text-text-secondary uppercase tracking-wider whitespace-nowrap"
                style={{ width: c.width, textAlign: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left' }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r, i) => (
            <tr key={i} className={`${i % 2 === 1 ? 'bg-surface/25' : ''} hover:bg-primary/[0.04] transition-colors`}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  className="px-3.5 py-2.5 text-[13px] text-text"
                  style={{ textAlign: c.align === 'right' ? 'right' : c.align === 'center' ? 'center' : 'left' }}
                >
                  {cellValue(r ? (r as any)[c.key] : undefined, c.type)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totalRow && rows.length > 0 && (
          <tfoot>
            <tr className="bg-surface/60 border-t border-border">
              {columns.map((c, i) => (
                <td key={c.key} className="px-3.5 py-2.5 text-[13px] font-black text-text">
                  {i < totalRow.length ? totalRow[i] : cellValue((totalRow as any)[c.key], c.type)}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
      {rows.length === 0 && (
        <div className="p-8 text-center text-sm text-text-secondary">—</div>
      )}
    </div>
  );
}