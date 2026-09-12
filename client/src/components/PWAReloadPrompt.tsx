import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';

export default function PWAReloadPrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {
      // no-op (saves noisy console output); the update banner handles UX
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col gap-4 animate-fade-in max-w-sm">
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-text text-lg">
          {t('pwa_update_available', 'New version available')}
        </h3>
        <p className="text-text-secondary text-sm">
          {t('pwa_update_desc', 'A new version of HAP Cargo is available. Click to update and restart the app.')}
        </p>
      </div>
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={() => updateServiceWorker(true)}
          className="flex-1 bg-primary text-white py-2 rounded-xl font-medium hover:bg-primary-hover transition-colors"
        >
          {t('pwa_update_btn', 'Update / Restart App')}
        </button>
        <button
          onClick={close}
          className="px-4 py-2 bg-surface text-text-secondary border border-border rounded-xl font-medium hover:bg-surface-hover transition-colors"
        >
          {t('cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
