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

export default function KpiStrip({ items, dense = false }: { items: KpiItem[]; dense?: boolean }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 ${dense ? 'gap-1.5' : 'gap-2'}`}>
      {items.map(it => {
        const Icon = it.icon;
        const color = it.color || 'text-primary';
        return (
          <button
            key={it.key}
            onClick={it.onClick}
            disabled={!it.onClick}
            className={`text-left bg-card border rounded-lg transition-all ${dense ? 'px-3 py-1.5' : 'p-2.5'} ${it.onClick ? 'hover:shadow-md hover:border-primary/40 cursor-pointer' : ''} ${it.active ? 'border-primary ring-2 ring-primary/20' : 'border-border'} shadow-sm`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`${dense ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-wider text-text-secondary truncate`}>{it.label}</span>
              {Icon && <span className={`${dense ? 'w-5 h-5' : 'w-6 h-6'} rounded-md flex items-center justify-center ${it.active ? 'bg-primary/15' : 'bg-surface'} ${color}`}><Icon className={`${dense ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} /></span>}
            </div>
            <div className={`${dense ? 'text-[15px] mt-0.5' : 'text-base'} font-black leading-tight ${color}`}>{it.value}</div>
            {it.sub && <div className={`${dense ? 'text-[9px]' : 'text-[10px]'} text-text-secondary mt-0.5 truncate`}>{it.sub}</div>}
          </button>
        );
      })}
    </div>
  );
}
