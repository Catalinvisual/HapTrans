import type { ComponentType, ReactNode } from 'react';

type IconType = ComponentType<{ className?: string }>;

interface PanelCardProps {
  title: string;
  subtitle?: string;
  icon: IconType;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export default function PanelCard({
  title, subtitle, icon: Icon, action, children, className = '', bodyClassName = '',
}: PanelCardProps) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-[0.08em] text-text">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs font-medium text-text-secondary">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
