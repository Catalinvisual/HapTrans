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
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
      {items.map(it => {
        const Icon = it.icon;
        const color = it.color || 'text-primary';
        return (
          <button
            key={it.key}
            onClick={it.onClick}
            disabled={!it.onClick}
            className={`text-left bg-card border rounded-lg p-2.5 transition-all ${it.onClick ? 'hover:shadow-md hover:border-primary/40 cursor-pointer' : ''} ${it.active ? 'border-primary ring-2 ring-primary/20' : 'border-border'} shadow-sm`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary truncate">{it.label}</span>
              {Icon && <span className={`w-6 h-6 rounded-md flex items-center justify-center ${it.active ? 'bg-primary/15' : 'bg-surface'} ${color}`}><Icon className="w-3.5 h-3.5" /></span>}
            </div>
            <div className={`text-base font-black leading-tight ${color}`}>{it.value}</div>
            {it.sub && <div className="text-[10px] text-text-secondary mt-0.5 truncate">{it.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}
