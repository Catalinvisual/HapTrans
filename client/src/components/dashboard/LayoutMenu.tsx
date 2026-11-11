import { ArrowDown, ArrowUp, Eye, EyeOff, RotateCcw, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface DashboardSection {
  id: string;
  visible: boolean;
}

interface LayoutMenuProps {
  sections: DashboardSection[];
  labels: Record<string, string>;
  onChange: (sections: DashboardSection[]) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function LayoutMenu({ sections, labels, onChange, onReset, onClose }: LayoutMenuProps) {
  const { t } = useTranslation();

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-[280px] rounded-2xl border border-border/70 bg-card p-3 shadow-2xl">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-text">
            <SlidersHorizontal className="h-3.5 w-3.5 text-primary" /> {t('dbd_layout_title')}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-text-secondary">{t('dbd_layout_sub')}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-light hover:bg-surface hover:text-text">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="space-y-1">
        {sections.map((section, index) => (
          <div key={section.id} className={`flex items-center gap-1 rounded-lg px-1.5 py-1.5 ${section.visible ? 'bg-surface/50' : 'opacity-55'}`}>
            <button
              type="button"
              onClick={() => {
                const next = sections.map((item) => item.id === section.id ? { ...item, visible: !item.visible } : item);
                onChange(next);
              }}
              title={section.visible ? t('dbd_layout_hide') : t('dbd_layout_show')}
              className="rounded-md p-1 text-text-secondary hover:bg-card hover:text-primary"
            >
              {section.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-text">
              {labels[section.id] || section.id}
            </span>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title={t('dbd_layout_up')} className="rounded-md p-1 text-text-light hover:bg-card hover:text-primary disabled:opacity-30">
              <ArrowUp className="h-3 w-3" />
            </button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} title={t('dbd_layout_down')} className="rounded-md p-1 text-text-light hover:bg-card hover:text-primary disabled:opacity-30">
              <ArrowDown className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={onReset} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border/70 py-1.5 text-[9px] font-black uppercase tracking-wide text-text-secondary hover:border-primary/40 hover:text-primary">
        <RotateCcw className="h-3 w-3" /> {t('dbd_layout_reset')}
      </button>
    </div>
  );
}
