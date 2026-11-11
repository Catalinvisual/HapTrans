import { useTranslation } from 'react-i18next';
import { Building2, Filter, Globe2, RotateCcw, Truck, UserRound } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import CountryFlag from './CountryFlag';
import type { OverviewFilterOptions } from './types';
import { canonicalCountryCode, countryName, localeFor } from './types';

export interface DashboardFilterValue {
  truckId: string;
  driverId: string;
  clientId: string;
  country: string;
}

export const EMPTY_FILTERS: DashboardFilterValue = {
  truckId: '',
  driverId: '',
  clientId: '',
  country: '',
};

interface FilterBarProps {
  options: OverviewFilterOptions;
  value: DashboardFilterValue;
  lang: string;
  onChange: (next: DashboardFilterValue) => void;
}

export default function FilterBar({ options, value, lang, onChange }: FilterBarProps) {
  const { t } = useTranslation();
  const active = Object.values(value).some(Boolean);

  const allLabel = (label: string) => `${label} · ${t('dbd_filter_all')}`;
  const set = (key: keyof DashboardFilterValue, next: string) => onChange({ ...value, [key]: next });

  // Stops contain a mix of names (Germany), ISO2 (DE) and ISO3 (DEU).
  // Fold them into one code before rendering so a country appears once.
  const countries = Array.from(new Set(
    options.countries.map(canonicalCountryCode).filter((code): code is string => Boolean(code)),
  )).sort((a, b) => countryName(a, lang).localeCompare(countryName(b, lang), localeFor(lang)));

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-card sm:flex-row sm:items-center">
      <span className="flex shrink-0 items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.12em] text-text-secondary">
        <Filter className="h-3.5 w-3.5 text-primary" />
        {t('dbd_filter_active')}
        {active && (
          <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] text-white">
            {Object.values(value).filter(Boolean).length}
          </span>
        )}
      </span>

      <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
        <CustomSelect
          size="sm"
          icon={Truck}
          value={value.truckId}
          onChange={(next) => set('truckId', next)}
          placeholder={allLabel(t('dbd_filter_truck'))}
          title={t('dbd_filter_truck')}
          className="min-w-0"
          options={[
            { value: '', label: allLabel(t('dbd_filter_truck')) },
            ...options.trucks.map((truck) => ({ value: truck.id, label: truck.name })),
          ]}
        />
        <CustomSelect
          size="sm"
          icon={UserRound}
          value={value.driverId}
          onChange={(next) => set('driverId', next)}
          placeholder={allLabel(t('dbd_filter_driver'))}
          title={t('dbd_filter_driver')}
          className="min-w-0"
          options={[
            { value: '', label: allLabel(t('dbd_filter_driver')) },
            ...options.drivers.map((driver) => ({ value: driver.id, label: driver.name })),
          ]}
        />
        <CustomSelect
          size="sm"
          icon={Building2}
          value={value.clientId}
          onChange={(next) => set('clientId', next)}
          placeholder={allLabel(t('dbd_filter_client'))}
          title={t('dbd_filter_client')}
          className="min-w-0"
          options={[
            { value: '', label: allLabel(t('dbd_filter_client')) },
            ...options.clients.map((client) => ({ value: client.id, label: client.name })),
          ]}
        />
        <CustomSelect
          size="sm"
          icon={Globe2}
          value={value.country}
          onChange={(next) => set('country', next)}
          placeholder={allLabel(t('dbd_filter_country'))}
          title={t('dbd_filter_country')}
          className="min-w-0"
          options={[
            { value: '', label: allLabel(t('dbd_filter_country')) },
            ...countries.map((code) => ({
              value: code,
              label: (
                <span className="flex items-center gap-2">
                  <CountryFlag code={code} lang={lang} />
                  <span>{countryName(code, lang)}</span>
                </span>
              ),
            })),
          ]}
        />
      </div>

      {active && (
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/70 bg-surface px-3 py-2 text-[10px] font-black text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
        >
          <RotateCcw className="h-3 w-3" />
          {t('dbd_filter_clear')}
        </button>
      )}
    </section>
  );
}
