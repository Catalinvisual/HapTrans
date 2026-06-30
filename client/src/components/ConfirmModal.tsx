import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Info, CheckCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useShortcuts } from '../hooks/useShortcuts';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onCancel,
  onConfirm, 
  title, 
  message,
  confirmText,
  cancelText,
  type = 'danger'
}: ConfirmModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleClose = () => {
    if (onCancel) onCancel();
    if (onClose) onClose();
  };

  useShortcuts({
    'escape': handleClose
  }, isOpen);

  const getIcon = () => {
    switch (type) {
      case 'danger': return <Trash2 className="w-6 h-6 text-error" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-success" />;
      case 'info':
      default: return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'danger': return 'bg-error/10';
      case 'warning': return 'bg-warning/10';
      case 'success': return 'bg-success/10';
      case 'info':
      default: return 'bg-primary/10';
    }
  };

  const getConfirmBtnClass = () => {
    switch (type) {
      case 'danger': return 'bg-error hover:bg-error/90 text-white shadow-error/20';
      case 'warning': return 'bg-warning hover:bg-warning/90 text-white shadow-warning/20';
      case 'success': return 'bg-success hover:bg-success/90 text-white shadow-success/20';
      case 'info':
      default: return 'bg-primary hover:bg-primary/90 text-white shadow-primary/20';
    }
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col items-center text-center">
        <div className={`w-12 h-12 rounded-full ${getIconBg()} flex items-center justify-center mb-4`}>
          {getIcon()}
        </div>
        <h3 className="text-lg font-bold text-text mb-2">{title || t('confirm')}</h3>
        <p className="text-text-secondary text-sm mb-6">
          {message || t('confirmDelete') || 'Ești sigur că vrei să continui?'}
        </p>
        <div className="flex gap-3 w-full">
          <button onClick={handleClose} className="btn-secondary flex-1 py-2.5 font-semibold capitalize">
            {cancelText || t('cancel')}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              handleClose();
            }} 
            className={`flex-1 py-2.5 font-semibold rounded-xl transition-all shadow-md capitalize ${getConfirmBtnClass()}`}
          >
            {confirmText || (type === 'danger' ? t('delete') : t('confirm'))}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
