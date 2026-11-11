import { useTranslation } from 'react-i18next';
import { Filter, RotateCcw } from 'lucide-react';
import type { OverviewFilterOptions } from './types';
import { countryName, flagFor } from './types';

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

const SELECT_CLASS =
  'min-w-0 flex-1 appearance-none rounded-xl border border-border/70 bg-card px-3 py-2 text-[11px] font-bold text-text outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/15';

export default function FilterBar({ options, value, lang, onChange }: FilterBarProps) {
  const { t } = useTranslation();
  const active = Object.values(value).some(Boolean);

  const set = (key: keyof DashboardFilterValue, next: string) => onChange({ ...value, [key]: next });

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card p-3 shadow-card sm:flex-row sm:items-center">
      <span className="flex shrink-0 items-center gap-1.5 px-1 text-[10px] font-black uppercase tracking-[0.12em] text-text-secondary">
        <Filter className="h-3.5 w-3.5 text-primary" />
        {t('dbd_filter_active')}
      </span>
      <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
        <select
          value={value.truckId}
          onChange={(event) => set('truckId', event.target.value)}
          className={SELECT_CLASS}
          aria-label={t('dbd_filter_truck')}
        >
          <option value="">{t('dbd_filter_truck')} · {t('dbd_filter_all')}</option>
          {options.trucks.map((truck) => (
            <option key={truck.id} value={truck.id}>{truck.name}</option>
          ))}
        </select>
        <select
          value={value.driverId}
          onChange={(event) => set('driverId', event.target.value)}
          className={SELECT_CLASS}
          aria-label={t('dbd_filter_driver')}
        >
          <option value="">{t('dbd_filter_driver')} · {t('dbd_filter_all')}</option>
          {options.drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>{driver.name}</option>
          ))}
        </select>
        <select
          value={value.clientId}
          onChange={(event) => set('clientId', event.target.value)}
          className={SELECT_CLASS}
          aria-label={t('dbd_filter_client')}
        >
          <option value="">{t('dbd_filter_client')} · {t('dbd_filter_all')}</option>
          {options.clients.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
        <select
          value={value.country}
          onChange={(event) => set('country', event.target.value)}
          className={SELECT_CLASS}
          aria-label={t('dbd_filter_country')}
        >
          <option value="">{t('dbd_filter_country')} · {t('dbd_filter_all')}</option>
          {options.countries.map((code) => (
            <option key={code} value={code}>{flagFor(code)} {countryName(code, lang)}</option>
          ))}
        </select>
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
