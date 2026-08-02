import React, { createContext, useContext, useState, ReactNode } from 'react';
import ConfirmModal from './ConfirmModal';
import { useTranslation } from 'react-i18next';

interface SaveConfirmContextType {
  confirmSave: () => Promise<boolean>;
}

const SaveConfirmContext = createContext<SaveConfirmContextType | undefined>(undefined);

export const useSaveConfirm = () => {
  const context = useContext(SaveConfirmContext);
  if (!context) {
    throw new Error('useSaveConfirm must be used within a SaveConfirmProvider');
  }
  return context.confirmSave;
};

export const SaveConfirmProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [resolver, setResolver] = useState<(value: boolean) => void>();

  const confirmSave = (): Promise<boolean> => {
    return new Promise((resolve) => {
      setResolver(() => resolve);
      setIsOpen(true);
    });
  };

  const handleConfirm = () => {
    if (resolver) resolver(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolver) resolver(false);
    setIsOpen(false);
  };

  return (
    <SaveConfirmContext.Provider value={{ confirmSave }}>
      {children}
      <ConfirmModal
        isOpen={isOpen}
        onClose={handleCancel}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        title={t('confirmSaveTitle')}
        message={t('confirmSaveMsg')}
        confirmText={t('save')}
        cancelText={t('cancel')}
        type="info"
      />
    </SaveConfirmContext.Provider>
  );
};
