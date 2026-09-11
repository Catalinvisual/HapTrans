import { fmtMoney, fmtNumber, fmtPercent } from '../../lib/format';

export interface ReportKpiView {
  key: string;
  label: string;
  value: number | string | null;
  unit: string;
  trend?: number | null;
}

function kpiValue(k: ReportKpiView): string {
  if (k.value === null || k.value === undefined) return '—';
  switch (k.unit) {
    case 'EUR': return fmtMoney(k.value);
    case 'EUR/km':
    case 'EUR/order':
    case 'EUR/trip': return `${fmtMoney(k.value)}/${k.unit.slice(4).toLowerCase()}`;
    case 'km': return `${fmtNumber(k.value, 0)} km`;
    case '%': return fmtPercent(k.value, 1);
    case 'days': return `${fmtNumber(k.value)} d`;
    case 'min': return `${fmtNumber(k.value)} min`;
    case 'EUR/month': return `${fmtMoney(k.value)}/mo`;
    default: return k.value instanceof Date ? k.value.toLocaleDateString() : String(k.value);
  }
}

export default function KpiSummary({ kpis }: { kpis: ReportKpiView[] }) {
  if (!kpis.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
      {kpis.map((k) => (
        <div key={k.key} className="bg-card border border-border rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-text-secondary truncate">{k.label}</div>
          <div className="text-lg font-black text-text mt-0.5">{kpiValue(k)}</div>
          {k.trend != null && (
            <div className="text-[11px] font-semibold mt-0.5">
              <span className={k.trend >= 0 ? 'text-success' : 'text-error'}>
                {k.trend >= 0 ? '▲' : '▼'} {Math.abs(k.trend).toFixed(1)}{k.unit === '%' ? 'pp' : '%'} vs prev
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}