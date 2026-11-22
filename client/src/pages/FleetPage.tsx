import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Container, Leaf, Truck } from 'lucide-react';
import { canSection } from '../lib/navPermissions';
import { useAuthStore } from '../store/authStore';

const TrucksPage = lazy(() => import('./TrucksPage'));
const TrailersPage = lazy(() => import('./TrailersPage'));
const EmissionsPage = lazy(() => import('./EmissionsPage'));

// Section switching (Trucks / Trailers / CO2) is mirrored in the topbar
// (Layout.tsx) and in the in-page strip below; both use ?tab= so browser
// history, refresh and deep links land on the same section.
export default function FleetPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const showTrucks = canSection(user, 'trucks', 'fleet');
  const showTrailers = canSection(user, 'trailers', 'fleet');
  const showCo2 = canSection(user, 'co2', 'fleet');
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

  const selectTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'trucks') next.delete('tab'); else next.set('tab', id);
    setSearchParams(next, { replace: false });
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-3 animate-fade-in">
      {tabs.length > 1 && (
        <div className="flex items-center gap-1 bg-surface/70 border border-border rounded-full p-1 w-fit shadow-sm overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => selectTab(tab.id)}
              aria-current={active === tab.id ? 'page' : undefined}
              className={`px-3 py-1.5 rounded-full text-[11.5px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                active === tab.id ? 'bg-primary text-white shadow-sm' : 'text-text-secondary hover:text-text hover:bg-surface/70'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <Suspense fallback={null}>
        {active === 'co2' ? <EmissionsPage /> : active === 'trailers' ? <TrailersPage /> : <TrucksPage />}
      </Suspense>
    </div>
  );
}
