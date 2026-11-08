import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from 'react-i18next';

declare const __HAPCARGO_BUILD__: string | undefined;

const RUNNING_BUILD = typeof __HAPCARGO_BUILD__ !== 'undefined' ? __HAPCARGO_BUILD__ : 'unknown';
const BUILD_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const SW_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Reads the build id of the HTML the host is currently serving. This is the
 * authoritative "what should be running" value: a new deployment always
 * carries a new id, whether or not the service worker noticed the change.
 */
async function fetchServedBuild(): Promise<string | null> {
  try {
    const res = await fetch(`/index.html?_hb=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/name="hapcargo-build"\s+content="([^"]+)"/);
    return match ? match[1] : null;
  } catch {
    // Offline or blocked: keep the current app, retry on the next tick.
    return null;
  }
}

export default function PWAReloadPrompt() {
  const { t } = useTranslation();
  const [staleBuild, setStaleBuild] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const updateServiceWorkerRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      updateServiceWorkerRef.current = updateServiceWorker;

      const poll = () => {
        if (!navigator.onLine) return;
        registration.update().catch(() => undefined);
      };
      // A long-lived dispatcher tab must still discover new releases.
      window.setInterval(poll, SW_UPDATE_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') poll();
      });
      window.addEventListener('online', poll);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const checkBuild = useCallback(async () => {
    if (document.visibilityState !== 'visible' || !navigator.onLine) return;
    const served = await fetchServedBuild();
    if (!served || RUNNING_BUILD === 'unknown') return;
    const changed = served !== RUNNING_BUILD;
    setStaleBuild(changed ? served : null);
    if (changed && navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      registrations.forEach((registration) => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }));
    }
  }, []);

  useEffect(() => {
    void checkBuild();
    const interval = window.setInterval(() => void checkBuild(), BUILD_CHECK_INTERVAL_MS);
    const onVisible = () => void checkBuild();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onVisible);
    };
  }, [checkBuild]);

  const applyUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      if (updateServiceWorkerRef.current) {
        await updateServiceWorkerRef.current(true);
      }
    } catch {
      // Fall through to the plain reload below.
    }
    window.location.reload();
  };

  const dismiss = () => {
    setNeedRefresh(false);
    setStaleBuild(null);
  };

  if (!needRefresh && !staleBuild) return null;

  const short = (value: string | null) => (value ? value.slice(0, 7) : '—');

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-card border border-border shadow-2xl p-6 rounded-2xl flex flex-col gap-4 animate-fade-in max-w-sm">
      <div className="flex flex-col gap-1">
        <h3 className="font-bold text-text text-lg">
          {t('pwa_update_available', 'New version available')}
        </h3>
        <p className="text-text-secondary text-sm">
          {t('pwa_update_desc', 'A new version of HAP Cargo is available. Click to update and restart the app.')}
        </p>
        <p className="text-text-muted text-[11px] font-mono">
          {short(RUNNING_BUILD)} → {short(staleBuild)}
        </p>
      </div>
      <div className="flex items-center gap-3 w-full">
        <button
          onClick={applyUpdate}
          disabled={updating}
          className="flex-1 bg-primary text-white py-2 rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-60"
        >
          {updating ? t('loading', 'Loading…') : t('pwa_update_btn', 'Update / Restart App')}
        </button>
        <button
          onClick={dismiss}
          className="px-4 py-2 bg-surface text-text-secondary border border-border rounded-xl font-medium hover:bg-surface-hover transition-colors"
        >
          {t('cancel', 'Cancel')}
        </button>
      </div>
    </div>
  );
}
