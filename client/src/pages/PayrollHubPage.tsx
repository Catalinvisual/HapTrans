import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const PayrollPage = lazy(() => import('./PayrollPage'));
const SettlementPage = lazy(() => import('./SettlementPage'));

// Module tab switching (Payroll / Settlements) is handled in the topbar (Layout.tsx).
export default function PayrollHubPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const showPayroll = canSection(user, 'payroll', 'payroll');
  const showSettlements = canSection(user, 'settlements', 'payroll');
  const tabs = [
    ...(showPayroll ? [{ id: 'payroll' }] : []),
    ...(showSettlements ? [{ id: 'settlements' }] : []),
  ];
  if (tabs.length === 0) return null;

  const requested = searchParams.get('tab');
  const active = tabs.some(x => x.id === requested) ? requested! : tabs[0].id;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      <Suspense fallback={null}>
        {active === 'settlements' ? <SettlementPage /> : <PayrollPage />}
      </Suspense>
    </div>
  );
}
