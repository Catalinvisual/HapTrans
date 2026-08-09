import { ComponentType, ReactNode } from 'react';

export interface KpiItem {
  key: string;
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  color?: string;
  onClick?: () => void;
  active?: boolean;
}

export default function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map(it => {
        const Icon = it.icon;
        const color = it.color || 'text-primary';
        return (
          <button
            key={it.key}
            onClick={it.onClick}
            disabled={!it.onClick}
            className={`text-left bg-card border rounded-xl p-4 transition-all ${it.onClick ? 'hover:shadow-md hover:border-primary/40 cursor-pointer' : ''} ${it.active ? 'border-primary ring-2 ring-primary/20' : 'border-border'} shadow-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary truncate">{it.label}</span>
              {Icon && <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${it.active ? 'bg-primary/15' : 'bg-surface'} ${color}`}><Icon className="w-4 h-4" /></span>}
            </div>
            <div className={`text-xl font-black ${color}`}>{it.value}</div>
            {it.sub && <div className="text-[11px] text-text-secondary mt-0.5">{it.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}
