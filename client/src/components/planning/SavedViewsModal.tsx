import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, BookmarkPlus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SavedViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, isDefault: boolean) => Promise<void>;
  isLoading?: boolean;
}

export default function SavedViewsModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
}: SavedViewsModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || saving || isLoading) return;

    setSaving(true);
    try {
      await onSave(name.trim(), isDefault);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                {t('save_view_modal_title', 'Save Current View')}
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Save your active date, grouping, filters and settings.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-2">
              View Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('save_view_name_placeholder', 'e.g. Morning Dispatch - Local')}
              className="w-full bg-surface/50 border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-text-primary focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-text-secondary">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="rounded w-4 h-4 text-primary focus:ring-primary/20"
            />
            <span>{t('set_as_default_view', 'Set as default view')}</span>
          </label>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs py-2 px-4 font-bold"
            >
              {t('cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving || isLoading}
              className="btn-primary text-xs py-2 px-5 font-black flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-40"
            >
              {saving || isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <span>{t('jsx_save', 'Save View')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
