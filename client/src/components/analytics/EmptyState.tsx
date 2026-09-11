import { ReactNode, ComponentType } from 'react';

interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title?: ReactNode;
  message?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, message, action }: EmptyStateProps) {
  return (
    <div className="p-8 text-center flex flex-col items-center gap-2">
      {Icon && (
        <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mb-1 border border-border">
          <Icon className="w-6 h-6 text-text-secondary" />
        </div>
      )}
      {title && <p className="font-bold text-sm text-text">{title}</p>}
      {message && <p className="text-xs text-text-secondary max-w-sm">{message}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
