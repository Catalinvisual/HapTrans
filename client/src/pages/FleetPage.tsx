import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Truck, Container } from 'lucide-react';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const TrucksPage = lazy(() => import('./TrucksPage'));
const TrailersPage = lazy(() => import('./TrailersPage'));

// Module tab switching (Trucks / Trailers) is handled in the topbar (Layout.tsx).
export default function FleetPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const showTrucks = canSection(user, 'trucks', 'fleet');
  const showTrailers = canSection(user, 'trailers', 'fleet');
  const tabs = [
    ...(showTrucks ? [{ id: 'trucks' }] : []),
    ...(showTrailers ? [{ id: 'trailers' }] : []),
  ];
  if (tabs.length === 0) return null;

  const requested = searchParams.get('tab');
  const active = tabs.some(x => x.id === requested) ? requested! : tabs[0].id;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      <Suspense fallback={null}>
        {active === 'trailers' ? <TrailersPage /> : <TrucksPage />}
      </Suspense>
    </div>
  );
}
