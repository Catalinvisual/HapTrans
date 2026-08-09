import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

export interface TabDef {
  key: string;
  label: ReactNode;
  content: ReactNode;
  badge?: number;
}

interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  headerRight?: ReactNode;
  tabs?: TabDef[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  footer?: ReactNode;
  width?: string;
  children?: ReactNode;
}

export default function DetailDrawer({
  open, onClose, title, subtitle, headerRight, tabs, activeTab, onTabChange, footer, width = '560px', children,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] animate-fade-in" onClick={onClose} />
      <aside className={`absolute inset-y-0 right-0 bg-card shadow-2xl flex flex-col animate-slide-in-right`} style={{ width, maxWidth: '100vw' }}>
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-surface/30">
          <div className="min-w-0">
            <h3 className="font-bold text-base text-text-primary truncate">{title}</h3>
            {subtitle && <div className="text-xs text-text-secondary mt-0.5">{subtitle}</div>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button onClick={onClose} className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface transition-colors" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex items-center gap-1 px-3 pt-2 border-b border-border overflow-x-auto custom-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => onTabChange?.(tab.key)}
                className={`px-3.5 py-2 text-[13px] font-semibold rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
              >
                {tab.label}
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">{tab.badge}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {children ?? tabs?.find(t => t.key === activeTab)?.content}
        </div>

        {footer && <div className="px-5 py-3 border-t border-border bg-surface/30 flex items-center gap-2 justify-end">{footer}</div>}
      </aside>
    </div>
  );
}
