import { AlertTriangle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4">
          <div className="flex justify-between items-start mb-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <button 
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-surface"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <h2 className="text-lg font-bold text-text-primary mb-1.5">
            {title || t('global_delete_title', 'Confirm Deletion')}
          </h2>
          <p className="text-sm text-text-secondary">
            {message || t('global_delete_message', 'Are you sure you want to delete this item? This action cannot be undone.')}
          </p>
        </div>

        <div className="px-6 py-4 bg-surface/50 border-t border-border flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 font-semibold text-text-secondary bg-surface border border-border rounded-xl hover:bg-surface-hover hover:text-text-primary transition-colors"
          >
            {t('global_cancel', 'Cancel')}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm hover:shadow transition-all"
          >
            {t('global_delete', 'Delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
