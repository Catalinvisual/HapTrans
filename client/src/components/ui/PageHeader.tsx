import { ReactNode, ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';

export interface PageAction {
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  onClick?: () => void;
}

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  breadcrumb?: string[];
  actions?: ReactNode | PageAction[];
}

const ACTION_CLASSES: Record<string, string> = {
  primary: 'btn-primary py-2 px-4 text-sm font-semibold shadow-md shadow-primary/20',
  secondary: 'btn-secondary py-2 px-4 text-sm font-semibold',
  danger: 'btn-danger py-2 px-4 text-sm font-semibold',
  ghost: 'py-2 px-3 text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors',
};

export default function PageHeader({ title, subtitle, breadcrumb, actions }: PageHeaderProps) {
  const renderedActions = () => {
    if (Array.isArray(actions)) {
      return actions.map((a, i) => {
        const Icon = a.icon;
        return (
          <button key={i} onClick={a.onClick} className={`inline-flex items-center gap-2 ${ACTION_CLASSES[a.variant || 'secondary']}`}>
            {Icon && <Icon className="w-4 h-4" />}
            {a.label}
          </button>
        );
      });
    }
    return actions;
  };

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
            {breadcrumb.map((b, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 opacity-50" />}
                <span className="capitalize">{b}</span>
              </span>
            ))}
          </div>
        )}
        <h1 className="text-2xl font-black text-text-primary tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{renderedActions()}</div>}
    </div>
  );
}
