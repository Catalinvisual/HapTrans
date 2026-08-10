import { ReactNode, ComponentType } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface BulkAction {
  label: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  variant?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
}

interface BulkBarProps {
  count: number;
  onClear: () => void;
  actions?: BulkAction[];
  children?: ReactNode;
}

const BULK_CLASSES: Record<string, string> = {
  primary: 'bg-white/90 text-gray-900 hover:bg-white',
  secondary: 'bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
};

export default function BulkBar({ count, onClear, actions, children }: BulkBarProps) {
  const { t } = useTranslation();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] animate-fade-in">
      <div className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-2xl">
        <span className="text-sm font-semibold whitespace-nowrap">{t('bulk_selected', '{{count}} selected')}</span>
        <div className="w-px h-5 bg-white/20" />
        <div className="flex items-center gap-1.5">
          {actions && actions.length > 0
            ? actions.map((a, i) => {
                const Icon = a.icon;
                return (
                  <button key={i} onClick={a.onClick} className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${BULK_CLASSES[a.variant || 'secondary']}`}>
                    {Icon && <Icon className="w-3.5 h-3.5" />}
                    {a.label}
                  </button>
                );
              })
            : children}
        </div>
        <button onClick={onClear} className="p-1 rounded-md hover:bg-white/15 transition-colors" title={t('bulk_clear', 'Clear selection')}>
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
