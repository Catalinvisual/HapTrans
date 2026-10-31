import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Banknote, Wallet } from 'lucide-react';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const PayrollPage = lazy(() => import('./PayrollPage'));
const SettlementPage = lazy(() => import('./SettlementPage'));

export default function PayrollHubPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const showPayroll = canSection(user, 'payroll', 'payroll');
  const showSettlements = canSection(user, 'settlements', 'payroll');
  const tabs = [
    ...(showPayroll ? [{ id: 'payroll', label: t('payroll'), icon: Banknote }] : []),
    ...(showSettlements ? [{ id: 'settlements', label: t('settlements'), icon: Wallet }] : []),
  ];
  if (tabs.length === 0) return null;

  const requested = searchParams.get('tab');
  const active = tabs.some(x => x.id === requested) ? requested! : tabs[0].id;

  const select = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: false });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-text-primary shrink-0">{t('payroll', 'Payroll')}</h2>
        {tabs.length > 1 && (
          <div className="flex items-center gap-1 bg-surface/60 border border-border rounded-full p-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => select(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${active === tab.id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {active === 'settlements' ? <SettlementPage /> : <PayrollPage />}
      </Suspense>
    </div>
  );
}
