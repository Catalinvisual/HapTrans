import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Container, Leaf, Truck } from 'lucide-react';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const TrucksPage = lazy(() => import('./TrucksPage'));
const TrailersPage = lazy(() => import('./TrailersPage'));
const EmissionsPage = lazy(() => import('./EmissionsPage'));

// Section switching (Trucks / Trailers / CO2) lives in the topbar
// (Layout.tsx module tabs) and reads ?tab= from the URL, so browser history,
// refresh and deep links land on the same section without a duplicate in-page strip.
export default function FleetPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();

  const showTrucks = canSection(user, 'trucks', 'fleet');
  const showTrailers = canSection(user, 'trailers', 'fleet');
  // Existing accounts were granted trucks/trailers before this section existed;
  // any fleet section permission opens the CO2 tab as well.
  const showCo2 = canSection(user, 'co2', 'fleet') || showTrucks || showTrailers;
  const editTruckRequested = !!searchParams.get('editTruck');
  if (editTruckRequested && !showTrucks) {
    return (
      <div role="alert" className="max-w-3xl mx-auto mt-8 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4 text-amber-800 dark:text-amber-300 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-bold">{t('editTruck', 'Edit Truck')}</h2>
          <p className="text-sm mt-1">{t('fleet_truck_edit_denied', 'You do not have permission to open the truck editor.')}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    ...(showTrucks ? [{ id: 'trucks', label: t('trucks', 'Trucks'), icon: Truck }] : []),
    ...(showTrailers ? [{ id: 'trailers', label: t('trailers', 'Trailers'), icon: Container }] : []),
    ...(showCo2 ? [{ id: 'co2', label: t('emissions_tab', 'CO₂ & Environment'), icon: Leaf }] : []),
  ];
  if (tabs.length === 0) return null;

  const requested = searchParams.get('tab');
  const active = tabs.some(x => x.id === requested) ? requested! : tabs[0].id;

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      <Suspense fallback={null}>
        {active === 'co2' ? <EmissionsPage /> : active === 'trailers' ? <TrailersPage /> : <TrucksPage />}
      </Suspense>
    </div>
  );
}
