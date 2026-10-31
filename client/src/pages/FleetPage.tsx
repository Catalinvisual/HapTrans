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

  return (
    <div className="max-w-[1600px] mx-auto space-y-1 animate-fade-in">
      <div className="flex items-center gap-1 bg-surface/70 border border-border rounded-xl p-1 w-fit max-w-full overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => select(tab.id)}
            className={`px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${active === tab.id ? 'bg-primary text-white border border-primary/20' : 'text-text-secondary hover:text-text hover:bg-surface/50'}`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>
      <h2 className="text-lg font-bold text-text-primary">{t('fleet', 'Fleet')}</h2>

      <Suspense fallback={null}>
        {active === 'trailers' ? <TrailersPage /> : <TrucksPage />}
      </Suspense>
    </div>
  );
}