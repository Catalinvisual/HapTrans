import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, Container } from 'lucide-react';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const TrucksPage = lazy(() => import('./TrucksPage'));
const TrailersPage = lazy(() => import('./TrailersPage'));

export default function FleetPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const showTrucks = canSection(user, 'trucks', 'fleet');
  const showTrailers = canSection(user, 'trailers', 'fleet');
  const tabs = [
    ...(showTrucks ? [{ id: 'trucks', label: t('trucks'), icon: Truck }] : []),
    ...(showTrailers ? [{ id: 'trailers', label: t('trailers'), icon: Container }] : []),
  ];
  if (tabs.length === 0) return null;

  const requested = searchParams.get('tab');
  const active = tabs.some(x => x.id === requested) ? requested! : tabs[0].id;

  const select = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: false });
  };

  const tabBar = tabs.length > 1 ? (
    <div className="flex items-center gap-0.5 bg-surface/60 border border-border rounded-full p-0.5 shrink-0">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => select(tab.id)}
          className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 ${active === tab.id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text-primary hover:bg-surface'}`}
        >
          <tab.icon className="w-3.5 h-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      <Suspense fallback={null}>
        {active === 'trailers'
          ? <TrailersPage tabBar={tabBar} />
          : <TrucksPage tabBar={tabBar} />}
      </Suspense>
    </div>
  );
}
