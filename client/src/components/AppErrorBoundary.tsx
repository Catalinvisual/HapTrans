import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const HEAL_KEY = 'hapcargo:boundary-heal';

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /Loading chunk|failed to fetch dynamically imported module|Unexpected token|failed to load module script|\.js'.*failed/i.test(msg);
}

async function clearServiceWorkerAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } finally {
    window.location.reload();
  }
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App crashed:', error, info);
    if (isChunkLoadError(error) && !sessionStorage.getItem(HEAL_KEY)) {
      sessionStorage.setItem(HEAL_KEY, '1');
      setTimeout(() => {
        void clearServiceWorkerAndReload();
      }, 1500);
    }
  }

  private handleClearAndReload = () => {
    if (sessionStorage.getItem(HEAL_KEY)) {
      window.location.reload();
      return;
    }
    sessionStorage.setItem(HEAL_KEY, '1');
    void clearServiceWorkerAndReload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="card max-w-md w-full p-8 flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center">
            <Trash2 className="w-8 h-8 text-error" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-black text-text">Something went wrong</h1>
            <p className="text-sm text-text-secondary">
              The app hit an unexpected error. Reloading usually fixes it.
            </p>
          </div>
          <div className="flex flex-col w-full gap-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-primary text-white py-2.5 rounded-xl font-semibold hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reload app
            </button>
            <button
              onClick={this.handleClearAndReload}
              className="w-full bg-surface text-text-secondary border border-border py-2.5 rounded-xl font-semibold hover:bg-surface-hover transition-colors"
            >
              Clear app cache &amp; reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}