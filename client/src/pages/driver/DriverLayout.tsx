import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { LogOut, Truck } from 'lucide-react';

export default function DriverLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user) navigate('/login', { replace: true });
  }, [user]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">{t('driverApp', 'Aplicație Șofer')}</p>
            <p className="text-xs text-text-secondary">{user?.name}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login', { replace: true }); }}
          className="btn-secondary py-2 px-3 text-xs font-bold flex items-center"
        >
          <LogOut className="w-4 h-4 mr-1" /> {t('logout', 'Ieșire')}
        </button>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-5">
        <Outlet />
      </main>
    </div>
  );
}
