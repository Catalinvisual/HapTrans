import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, ClipboardCheck, Gauge, Globe2, Leaf, Settings2, Truck, Calculator,
} from 'lucide-react';
import emissionsApi from '../lib/emissionsApi';
import type { EmissionFiltersState } from '../lib/emissionsApi';
import { useAuthStore } from '../store/authStore';
import { canSection } from '../lib/navPermissions';
import { presetRange, type FilterOptions } from '../components/emissions/EmissionFilters';

const OverviewTab = lazy(() => import('../components/emissions/OverviewTab'));
const RegistryTab = lazy(() => import('../components/emissions/RegistryTab'));
const CountriesTab = lazy(() => import('../components/emissions/CountriesTab'));
const CalculatorTab = lazy(() => import('../components/emissions/CalculatorTab'));
const TripsTab = lazy(() => import('../components/emissions/TripsTab'));
const ReportsTab = lazy(() => import('../components/emissions/ReportsTab'));
const ComplianceTab = lazy(() => import('../components/emissions/ComplianceTab'));
const SettingsTab = lazy(() => import('../components/emissions/SettingsTab'));

const TABS = [
  { id: 'overview', icon: Gauge },
  { id: 'registry', icon: Truck },
  { id: 'countries', icon: Globe2 },
  { id: 'calculator', icon: Calculator },
  { id: 'trips', icon: Leaf },
  { id: 'reports', icon: BarChart3 },
  { id: 'compliance', icon: ClipboardCheck },
  { id: 'settings', icon: Settings2 },
];

function defaultFilters(): EmissionFiltersState {
  const range = presetRange('this_month');
  return { from: range.from, to: range.to } as EmissionFiltersState;
}

export default function EmissionsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<EmissionFiltersState>(defaultFilters);
  const [options, setOptions] = useState<FilterOptions>({});
  const requested = searchParams.get('etab');
  const active = TABS.some((tab) => tab.id === requested) ? requested! : 'overview';

  useEffect(() => {
    emissionsApi.filterOptions()
      .then((data) => setOptions(data || {}))
      .catch((error) => {
        console.warn('CO2 filter options could not be loaded', error);
        setOptions({});
      });
  }, []);

  const setTab = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('etab'); else next.set('etab', id);
    setSearchParams(next, { replace: false });
  };

  const tabLabels = useMemo(() => ({
    overview: t('emissions_tab_overview'),
    registry: t('emissions_tab_registry'),
    countries: t('emissions_tab_countries'),
    calculator: t('emissions_tab_calculator'),
    trips: t('emissions_tab_trips'),
    reports: t('emissions_tab_reports'),
    compliance: t('emissions_tab_compliance'),
    settings: t('emissions_tab_settings'),
  }), [t]);

  const allowed = canSection(user, 'co2', 'fleet') || canSection(user, 'trucks', 'fleet') || canSection(user, 'trailers', 'fleet');
  if (!allowed) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-sm text-text-secondary">
        {t('emissions_no_access')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-black text-text inline-flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            {t('emissions_title')}
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 max-w-3xl">{t('emissions_subtitle')}</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-text-secondary">
          <span className="px-2 py-1 rounded-full border border-border bg-surface font-semibold">EN ISO 14083:2023</span>
          <span className="px-2 py-1 rounded-full border border-border bg-surface font-semibold">DEFRA/DESNZ 2026</span>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              role="tab"
              aria-selected={isActive}
              className={`relative px-2.5 py-2 text-[11.5px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 transition-colors ${
                isActive ? 'text-primary' : 'text-text-secondary hover:text-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tabLabels[tab.id as keyof typeof tabLabels]}
              {isActive && <span className="absolute inset-x-1 -bottom-px h-0.5 bg-primary rounded-full" />}
            </button>
          );
        })}
      </div>

      <Suspense fallback={<div className="py-10 text-center text-xs text-text-secondary">{t('loading')}</div>}>
        {active === 'overview' && <OverviewTab filters={filters} onFiltersChange={setFilters} options={options} />}
        {active === 'registry' && <RegistryTab />}
        {active === 'countries' && <CountriesTab />}
        {active === 'calculator' && <CalculatorTab />}
        {active === 'trips' && <TripsTab filters={filters} onFiltersChange={setFilters} options={options} />}
        {active === 'reports' && <ReportsTab filters={filters} onFiltersChange={setFilters} options={options} />}
        {active === 'compliance' && <ComplianceTab />}
        {active === 'settings' && <SettingsTab />}
      </Suspense>

      <div className="text-[10px] text-text-secondary border-t border-border pt-2">
        {t('emissions_methodology_note')}
      </div>
    </div>
  );
}
