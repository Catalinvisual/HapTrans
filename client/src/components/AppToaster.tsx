import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ─── Custom Toast Renderer ───
const ToastIcon = ({ type }: { type: string }) => {
  if (type === 'success') return <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />;
  if (type === 'error') return <XCircle className="w-5 h-5 text-white flex-shrink-0" />;
  if (type === 'warning') return <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />;
  return <Info className="w-5 h-5 text-white flex-shrink-0" />;
};

const BG: Record<string, string> = {
  success: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
  error: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
  warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  info: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
};

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      toastOptions={{ duration: 4000 }}
    >
      {(t) => {
        const type = t.type === 'success' ? 'success'
          : t.type === 'error' ? 'error'
          : t.type === 'loading' ? 'info'
          : 'info';

        return (
          <div
            style={{
              background: BG[type],
              opacity: t.visible ? 1 : 0,
              transform: t.visible ? 'translateX(0) scale(1)' : 'translateX(60px) scale(0.95)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className="flex items-start gap-3 px-4 py-3.5 rounded-xl shadow-lg max-w-sm w-full"
          >
            <ToastIcon type={type} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-snug">
                {typeof t.message === 'string' ? t.message : ''}
              </p>
            </div>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="flex-shrink-0 p-0.5 rounded-full hover:bg-card/20 transition-colors ml-1"
            >
              <X className="w-4 h-4 text-white/80" />
            </button>
          </div>
        );
      }}
    </Toaster>
  );
}

// ─── Helper functions ───
export const notify = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  warning: (msg: string) => toast(msg, { icon: '⚠️' }),
  info: (msg: string) => toast(msg, { icon: 'ℹ️' }),
};
