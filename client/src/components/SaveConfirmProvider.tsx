import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmModal from './ConfirmModal';
import { useTranslation } from 'react-i18next';

export interface ConfirmActionOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

interface SaveConfirmContextType {
  confirmSave: () => Promise<boolean>;
  confirmAction: (options: ConfirmActionOptions | string) => Promise<boolean>;
}

const SaveConfirmContext = createContext<SaveConfirmContextType | undefined>(undefined);

export const useSaveConfirm = () => {
  const context = useContext(SaveConfirmContext);
  if (!context) {
    throw new Error('useSaveConfirm must be used within a SaveConfirmProvider');
  }
  return context.confirmSave;
};

export const useConfirm = () => {
  const context = useContext(SaveConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a SaveConfirmProvider');
  }
  return context.confirmAction;
};

export const SaveConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    resolve: (val: boolean) => void;
  } | null>(null);

  const confirmSave = (): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        title: t('confirmSaveTitle', 'Salvare modificări'),
        message: t('confirmSaveMsg', 'Ești sigur că vrei să salvezi modificările?'),
        confirmText: t('save', 'Salvează'),
        cancelText: t('cancel', 'Anulează'),
        type: 'info',
        resolve,
      });
    });
  };

  const confirmAction = (options: ConfirmActionOptions | string): Promise<boolean> => {
    const opts: ConfirmActionOptions = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      setModalConfig({
        isOpen: true,
        title: opts.title || t('confirm', 'Confirmare'),
        message: opts.message,
        confirmText: opts.confirmText || t('confirm', 'Confirmă'),
        cancelText: opts.cancelText || t('cancel', 'Anulează'),
        type: opts.type || 'warning',
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    if (modalConfig) {
      modalConfig.resolve(true);
      setModalConfig(null);
    }
  };

  const handleCancel = () => {
    if (modalConfig) {
      modalConfig.resolve(false);
      setModalConfig(null);
    }
  };

  return (
    <SaveConfirmContext.Provider value={{ confirmSave, confirmAction }}>
      {children}
      {modalConfig && (
        <ConfirmModal
          isOpen={modalConfig.isOpen}
          onClose={handleCancel}
          onCancel={handleCancel}
          onConfirm={handleConfirm}
          title={modalConfig.title}
          message={modalConfig.message}
          confirmText={modalConfig.confirmText}
          cancelText={modalConfig.cancelText}
          type={modalConfig.type}
        />
      )}
    </SaveConfirmContext.Provider>
  );
};
