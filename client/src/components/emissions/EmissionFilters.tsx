import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, RotateCcw } from 'lucide-react';
import CustomSelect from '../CustomSelect';
import type { EmissionFiltersState } from '../../lib/emissionsApi';
import { countryName } from '../../lib/countries';

export interface FilterOptions {
  trucks?: Array<{ id: string; label: string }>;
  drivers?: Array<{ id: string; label: string }>;
  customers?: Array<{ id: string; label: string }>;
  countries?: string[];
  fuelTypes?: string[];
  dateRange?: { min: string | null; max: string | null };
}

type Preset =
  | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'previous_month'
  | 'this_quarter' | 'this_year' | 'custom';

function iso(date: Date): string {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
}

export function presetRange(preset: Preset): { from?: string; to?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { from: iso(startOfDay), to: iso(startOfDay) };
    case 'yesterday': {
      const d = new Date(startOfDay);
      d.setDate(d.getDate() - 1);
      return { from: iso(d), to: iso(d) };
    }
    case 'this_week': {
      const d = new Date(startOfDay);
      const weekday = (d.getDay() + 6) % 7; // Monday = 0
      d.setDate(d.getDate() - weekday);
      return { from: iso(d), to: iso(startOfDay) };
    }
    case 'this_month':
      return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: iso(startOfDay) };
    case 'previous_month': {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: iso(first), to: iso(last) };
    }
    case 'this_quarter': {
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      return { from: iso(new Date(now.getFullYear(), quarterStart, 1)), to: iso(startOfDay) };
    }
    case 'this_year':
      return { from: iso(new Date(now.getFullYear(), 0, 1)), to: iso(startOfDay) };
    default:
      return {};
  }
}

const ALL = '__all__';

export default function EmissionFilters({
  value, onChange, options, showDates = true, compact = false,
}: {
  value: EmissionFiltersState;
  onChange: (next: EmissionFiltersState) => void;
  options: FilterOptions;
  showDates?: boolean;
  compact?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);

  const activePreset = useMemo<Preset | 'none'>(() => {
    if (!value.from && !value.to) return 'none';
    for (const preset of ['today', 'yesterday', 'this_week', 'this_month', 'previous_month', 'this_quarter', 'this_year'] as Preset[]) {
      const range = presetRange(preset);
      if (range.from === value.from && range.to === value.to) return preset;
    }
    const today = new Date();
    if (value.from === iso(new Date(today.getFullYear(), 0, 1)) && value.to === iso(new Date(today.getFullYear(), today.getMonth(), 1))) {
      return 'this_month';
    }
    return 'custom';
  }, [value.from, value.to]);

  const setPreset = (preset: string) => {
    if (preset === 'custom') return;
    if (preset === 'none') {
      onChange({ ...value, from: undefined, to: undefined });
      return;
    }
    onChange({ ...value, ...presetRange(preset as Preset) });
  };

  const update = (key: keyof EmissionFiltersState, next: string) => {
    onChange({ ...value, [key]: next === ALL ? undefined : next });
  };

  const truckOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...(options.trucks || []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.label || x.id })),
  ];
  const driverOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...(options.drivers || []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.label || x.id })),
  ];
  const customerOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...(options.customers || []).filter((x) => x.id).map((x) => ({ value: x.id, label: x.label || x.id })),
  ];
  const countryOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...(options.countries || []).map((code) => ({
      value: code,
      label: `${countryName(code, lang as any) || code} (${code})`,
    })),
  ];
  const fuelOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...(options.fuelTypes || []).map((fuel) => ({ value: fuel, label: fuel.replace(/_/g, ' ') })),
  ];
  const lifecycleOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    ...['estimated', 'preliminary', 'verified', 'finalized', 'pending_data', 'reconciliation_required'].map((s) => ({
      value: s,
      label: t(`emissions_registry_status_${s}`, s.replace(/_/g, ' ')),
    })),
  ];
  const fleetOptions = [
    { value: ALL, label: t('emissions_all', 'All') },
    { value: 'own_fleet', label: t('fleet_own', 'Own fleet') },
    { value: 'subcontractor', label: t('fleet_subcontractor', 'Subcontractor') },
    { value: 'charter', label: t('fleet_charter', 'Spot charter') },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-2.5 shadow-sm">
      <div className={`flex flex-wrap items-end gap-1.5 ${compact ? '' : 'gap-2'}`}>
        {showDates && (
          <>
            <div className="min-w-[150px]">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_preset_custom', 'Range')}</span>
              <CustomSelect
                size="sm"
                value={activePreset === 'none' ? ALL : activePreset}
                onChange={setPreset}
                options={[
                  { value: ALL, label: t('emissions_all', 'All time') },
                  { value: 'today', label: t('emissions_preset_today') },
                  { value: 'yesterday', label: t('emissions_preset_yesterday') },
                  { value: 'this_week', label: t('emissions_preset_this_week') },
                  { value: 'this_month', label: t('emissions_preset_this_month') },
                  { value: 'previous_month', label: t('emissions_preset_previous_month') },
                  { value: 'this_quarter', label: t('emissions_preset_this_quarter') },
                  { value: 'this_year', label: t('emissions_preset_this_year') },
                  { value: 'custom', label: t('emissions_preset_custom') },
                ]}
              />
            </div>
            <label className="block">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_from')}</span>
              <input
                type="date"
                value={value.from || ''}
                onChange={(e) => onChange({ ...value, from: e.target.value || undefined })}
                className="px-2 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_to')}</span>
              <input
                type="date"
                value={value.to || ''}
                onChange={(e) => onChange({ ...value, to: e.target.value || undefined })}
                className="px-2 py-1.5 bg-card border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary"
              />
            </label>
          </>
        )}

        <div className="min-w-[130px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_country')}</span>
          <CustomSelect size="sm" value={value.country || ALL} onChange={(v) => update('country', v)} options={countryOptions} />
        </div>
        <div className="min-w-[150px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_truck')}</span>
          <CustomSelect size="sm" value={value.truckId || ALL} onChange={(v) => update('truckId', v)} options={truckOptions} />
        </div>
        <div className="min-w-[140px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_driver')}</span>
          <CustomSelect size="sm" value={value.driverId || ALL} onChange={(v) => update('driverId', v)} options={driverOptions} />
        </div>
        <div className="min-w-[150px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_customer')}</span>
          <CustomSelect size="sm" value={value.customerId || ALL} onChange={(v) => update('customerId', v)} options={customerOptions} />
        </div>
        <div className="min-w-[120px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_fuel_type')}</span>
          <CustomSelect size="sm" value={value.fuelType || ALL} onChange={(v) => update('fuelType', v)} options={fuelOptions} />
        </div>
        <div className="min-w-[130px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_status')}</span>
          <CustomSelect size="sm" value={value.lifecycle || ALL} onChange={(v) => update('lifecycle', v)} options={lifecycleOptions} />
        </div>
        <div className="min-w-[130px]">
          <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('fleet', 'Fleet')}</span>
          <CustomSelect size="sm" value={value.fleetType || ALL} onChange={(v) => update('fleetType', v)} options={fleetOptions} />
        </div>
        <button
          type="button"
          onClick={() => onChange({})}
          className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:text-primary border border-border rounded-lg bg-card"
          title={t('emissions_reset')}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('emissions_reset')}
        </button>
      </div>
      {(value.from || value.to) && (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-text-secondary">
          <CalendarRange className="w-3 h-3" />
          {value.from || '…'} → {value.to || '…'}
        </div>
      )}
    </div>
  );
}
