import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Calculator, GitCompareArrows, Plus, Save, Trash2, TriangleAlert } from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { ProfileListItem } from '../../lib/emissionsApi';
import { countryName } from '../../lib/countries';
import CustomSelect from '../CustomSelect';
import {
  EmissionBadge, Field, Panel, SectionHeading, StateBlock, TextInput, formatEmission, formatNumber,
} from './EmissionBits';

const FUELS = ['DIESEL', 'HVO', 'BIODIESEL', 'CNG', 'LNG', 'LPG', 'ELECTRIC', 'HYDROGEN_FCEV', 'HYDROGEN_ICE', 'HYBRID_DIESEL', 'HYBRID_GASOLINE'];

interface SegmentRow { countryCode: string; distanceKm: string }

export default function CalculatorTab() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const [trucks, setTrucks] = useState<ProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleMode, setVehicleMode] = useState<'fleet' | 'external'>('fleet');
  const [truckId, setTruckId] = useState('');
  const [externalFuel, setExternalFuel] = useState('DIESEL');
  const [externalConsumption, setExternalConsumption] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [consumption, setConsumption] = useState('');
  const [fuelQuantity, setFuelQuantity] = useState('');
  const [cargoWeightKg, setCargoWeightKg] = useState('');
  const [customers, setCustomers] = useState('1');
  const [reeferEnergy, setReeferEnergy] = useState('');
  const [reeferFuel, setReeferFuel] = useState('DIESEL');
  const [segments, setSegments] = useState<SegmentRow[]>([{ countryCode: 'NL', distanceKm: '' }]);
  const [result, setResult] = useState<any>(null);
  const [comparing, setComparing] = useState<any[] | null>(null);
  const [altFuel, setAltFuel] = useState('HVO');
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    emissionsApi.profiles()
      .then((rows) => {
        setTrucks(rows);
        const first = rows[0];
        if (first) {
          setTruckId(first.truck.id);
          setFuelType(first.profile?.fuelType || first.truck.fuelType || 'DIESEL');
          const declared = first.profile?.declaredConsumptionPer100Km ?? first.truck.fuelConsumption;
          if (declared) setConsumption(String(declared));
        }
      })
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  }, []);

  const selectedTruck = useMemo(() => trucks.find((x) => x.truck.id === truckId), [trucks, truckId]);

  const onTruckChange = (id: string) => {
    setTruckId(id);
    const truck = trucks.find((x) => x.truck.id === id);
    setFuelType(truck?.profile?.fuelType || truck?.truck.fuelType || 'DIESEL');
    const declared = truck?.profile?.declaredConsumptionPer100Km ?? truck?.truck.fuelConsumption;
    setConsumption(declared ? String(declared) : '');
  };

  const segmentTotal = segments.reduce((a, s) => a + (Number(s.distanceKm) || 0), 0);
  const segmentMismatch = distanceKm && Math.abs(Number(distanceKm) - segmentTotal) > Math.max(1, Number(distanceKm) * 0.005);

  const buildInput = (fuelOverride?: string) => ({
    truckId: vehicleMode === 'fleet' ? truckId || null : null,
    externalVehicle: vehicleMode === 'external'
      ? { label: t('emissions_calc_external'), fuelType: externalFuel, consumptionPer100Km: externalConsumption ? Number(externalConsumption) : null }
      : null,
    fuelType: vehicleMode === 'fleet' ? (fuelOverride || fuelType || null) : externalFuel,
    distanceKm: distanceKm ? Number(distanceKm) : null,
    consumptionPer100Km: consumption ? Number(consumption) : null,
    fuelQuantity: fuelQuantity ? Number(fuelQuantity) : null,
    cargoWeightKg: cargoWeightKg ? Number(cargoWeightKg) : null,
    customers: Number(customers) || 1,
    segments: segments.filter((s) => s.countryCode && Number(s.distanceKm) > 0),
    reefer: reeferEnergy ? { energyQuantity: Number(reeferEnergy), fuelType: reeferFuel, unit: reeferFuel === 'ELECTRIC' ? 'kWh' : 'L' } : null,
    countryCode: segments[0]?.countryCode || null,
  });

  const calculate = async () => {
    setCalculating(true);
    setResult(null);
    setComparing(null);
    try {
      const data = await emissionsApi.calculate(buildInput());
      setResult(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_reports_error'));
    } finally {
      setCalculating(false);
    }
  };

  const compare = async () => {
    setCalculating(true);
    setResult(null);
    try {
      const rows = await emissionsApi.compare([
        { ...buildInput(), name: `${vehicleMode === 'fleet' ? selectedTruck?.truck.plateNumber || 'Fleet' : 'External'} · ${vehicleMode === 'fleet' ? fuelType : externalFuel}` },
        { ...buildInput(altFuel), name: `${vehicleMode === 'fleet' ? selectedTruck?.truck.plateNumber || 'Fleet' : 'External'} · ${altFuel}` },
      ]);
      setComparing(rows);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_reports_error'));
    } finally {
      setCalculating(false);
    }
  };

  const save = async () => {
    if (!result) return;
    try {
      await emissionsApi.saveSimulation(buildInput(), result);
      toast.success(t('emissions_calc_saved'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    }
  };

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_calc_title')} hint={t('emissions_calc_hint')} />

      <StateBlock loading={loading} error={error} onRetry={() => setError(null)}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <div className="xl:col-span-2 space-y-3">
            <Panel title={t('emissions_calc_vehicle')} icon={Calculator}>
              <div className="inline-flex rounded-lg border border-border overflow-hidden mb-3">
                {(['fleet', 'external'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setVehicleMode(mode)}
                    className={`px-3 py-1.5 text-xs font-semibold ${vehicleMode === mode ? 'bg-primary text-white' : 'bg-card text-text-secondary hover:text-text'}`}
                  >
                    {mode === 'fleet' ? t('emissions_truck') : t('emissions_calc_external')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {vehicleMode === 'fleet' ? (
                  <>
                    <Field label={t('emissions_calc_select_truck')}>
                      <CustomSelect
                        value={truckId}
                        onChange={onTruckChange}
                        options={trucks.map((row) => ({
                          value: row.truck.id,
                          label: `${row.truck.plateNumber} · ${row.truck.brand} ${row.truck.model}`,
                        }))}
                      />
                    </Field>
                    <Field label={t('emissions_calc_fuel')}>
                      <CustomSelect value={fuelType} onChange={setFuelType} options={FUELS.map((f) => ({ value: f, label: f }))} />
                    </Field>
                    <Field label={t('emissions_calc_consumption')} hint={t('emissions_calc_actual_qty_note')}>
                      <TextInput type="number" step="0.1" value={consumption} onChange={(e) => setConsumption(e.target.value)} />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field label={t('emissions_calc_external_fuel')}>
                      <CustomSelect value={externalFuel} onChange={setExternalFuel} options={FUELS.map((f) => ({ value: f, label: f }))} />
                    </Field>
                    <Field label={t('emissions_calc_external_consumption')}>
                      <TextInput type="number" step="0.1" value={externalConsumption} onChange={(e) => setExternalConsumption(e.target.value)} />
                    </Field>
                    <Field label={t('emissions_calc_distance')}>
                      <TextInput type="number" step="1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                    </Field>
                  </>
                )}
                <Field label={t('emissions_calc_distance')}>
                  <TextInput type="number" step="1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} />
                </Field>
                <Field label={t('emissions_calc_fuel_qty')}>
                  <TextInput type="number" step="0.1" value={fuelQuantity} onChange={(e) => setFuelQuantity(e.target.value)} />
                </Field>
                <Field label={t('emissions_calc_cargo')}>
                  <TextInput type="number" step="10" value={cargoWeightKg} onChange={(e) => setCargoWeightKg(e.target.value)} />
                </Field>
                <Field label={t('emissions_calc_customers')}>
                  <TextInput type="number" min="1" value={customers} onChange={(e) => setCustomers(e.target.value)} />
                </Field>
                <Field label={t('emissions_calc_reefer')}>
                  <CustomSelect value={reeferFuel} onChange={setReeferFuel} options={FUELS.map((f) => ({ value: f, label: f }))} />
                </Field>
                <Field label={t('emissions_calc_reefer_energy')}>
                  <TextInput type="number" step="0.1" value={reeferEnergy} onChange={(e) => setReeferEnergy(e.target.value)} />
                </Field>
              </div>
            </Panel>

            <Panel
              title={t('emissions_calc_segments')}
              actions={
                <button
                  className="btn-secondary py-1 px-2 text-xs inline-flex items-center gap-1"
                  onClick={() => setSegments((prev) => [...prev, { countryCode: 'DE', distanceKm: '' }])}
                >
                  <Plus className="w-3.5 h-3.5" />{t('emissions_calc_add_country')}
                </button>
              }
            >
              <div className="space-y-1.5">
                {segments.map((segment, index) => (
                  <div key={index} className="flex items-end gap-1.5">
                    <div className="min-w-[150px]">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_country')}</span>
                      <CustomSelect
                        size="sm"
                        value={segment.countryCode}
                        onChange={(v) => setSegments((prev) => prev.map((s, i) => i === index ? { ...s, countryCode: v } : s))}
                        options={[
                          'NL', 'BE', 'DE', 'FR', 'PL', 'CZ', 'AT', 'SK', 'HU', 'RO', 'BG', 'IT', 'ES', 'PT',
                          'DK', 'SE', 'FI', 'LT', 'LV', 'EE', 'SI', 'HR', 'GR', 'LU', 'IE', 'NO', 'CH', 'GB', 'TR',
                        ].map((code) => ({ value: code, label: `${countryName(code, lang as any) || code} (${code})` }))}
                      />
                    </div>
                    <div className="w-32">
                      <span className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-0.5">{t('emissions_distance_km')}</span>
                      <TextInput
                        type="number"
                        step="1"
                        value={segment.distanceKm}
                        onChange={(e) => setSegments((prev) => prev.map((s, i) => i === index ? { ...s, distanceKm: e.target.value } : s))}
                      />
                    </div>
                    {segments.length > 1 && (
                      <button className="p-1.5 text-text-secondary hover:text-rose-600" onClick={() => setSegments((prev) => prev.filter((_, i) => i !== index))}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className={`mt-2 text-[11px] ${segmentMismatch ? 'text-rose-600' : 'text-text-secondary'}`}>
                {t('emissions_calc_country_total')}: <b>{formatNumber(segmentTotal)} km</b>
                {distanceKm ? ` · ${t('emissions_distance')}: ${formatNumber(Number(distanceKm))} km` : ''}
              </div>
            </Panel>

            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-primary py-2 px-4 text-sm inline-flex items-center gap-1.5" onClick={calculate} disabled={calculating}>
                <Calculator className="w-4 h-4" />{calculating ? '…' : t('emissions_calc_calculate')}
              </button>
              <button className="btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={compare} disabled={calculating}>
                <GitCompareArrows className="w-4 h-4" />{t('emissions_calc_compare')}
              </button>
              <CustomSelect
                size="sm"
                value={altFuel}
                onChange={setAltFuel}
                options={FUELS.map((f) => ({ value: f, label: `${t('emissions_calc_scenario')}: ${f}` }))}
              />
              {result && (
                <button className="btn-secondary py-2 px-3 text-sm inline-flex items-center gap-1.5" onClick={save}>
                  <Save className="w-4 h-4" />{t('emissions_calc_save')}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result && <ResultCard result={result} title={t('emissions_calc_results')} />}
            {comparing && comparing.map((row) => (
              <ResultCard key={row.vehicle?.label + row.methodology + row.ttwKgCo2e} result={row} title={row.vehicle?.label} compact />
            ))}
            {!result && !comparing && (
              <Panel title={t('emissions_calc_results')} icon={Calculator}>
                <p className="text-xs text-text-secondary">{t('emissions_calc_simulation_note')}</p>
              </Panel>
            )}
            {result?.note && (
              <div className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 inline-flex items-start gap-1.5">
                <TriangleAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />{result.note}
              </div>
            )}
          </div>
        </div>
      </StateBlock>
    </div>
  );
}

function ResultCard({ result, title, compact = false }: { result: any; title?: string; compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <Panel title={title || t('emissions_calc_results')} icon={Calculator}>
      <div className="grid grid-cols-2 gap-2">
        <Metric label="TTW" value={formatEmission(result.ttwKgCo2e)} />
        <Metric label="WTT" value={formatEmission(result.wttKgCo2e)} />
        <Metric label="WTW" value={formatEmission(result.wtwKgCo2e)} strong />
        <Metric label={t('emissions_unit_g_km')} value={result.co2ePerKm != null ? formatNumber(result.co2ePerKm, 1) : '—'} />
        <Metric label={t('emissions_unit_g_tkm')} value={result.co2ePerTonneKm != null ? formatNumber(result.co2ePerTonneKm, 1) : '—'} />
        <Metric label={t('emissions_calc_per_customer')} value={formatEmission(result.perCustomer)} />
      </div>
      {result.differenceVsFirstPercent != null && (
        <div className={`mt-2 text-xs font-bold ${result.differenceVsFirstPercent <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {result.differenceVsFirstPercent > 0 ? '+' : ''}{formatNumber(result.differenceVsFirstPercent, 1)}% vs baseline
        </div>
      )}
      <div className="mt-2 text-[10px] text-text-secondary">
        {t('emissions_calc_basis')}: {result.methodology} · {formatNumber(result.distanceKm)} km · {formatNumber(result.energyQuantity, 1)} {result.vehicle?.unit || ''}
      </div>
      {!compact && result.segments?.length > 0 && (
        <table className="w-full text-[11px] mt-2">
          <thead>
            <tr className="text-[9px] uppercase text-text-secondary border-b border-border">
              <th className="text-left py-1">{t('emissions_country')}</th>
              <th className="text-right py-1">{t('emissions_distance_km')}</th>
              <th className="text-right py-1">TTW</th>
              <th className="text-right py-1">WTW</th>
            </tr>
          </thead>
          <tbody>
            {result.segments.map((segment: any) => (
              <tr key={segment.countryCode} className="border-b border-border/50">
                <td className="py-1">{countryName(segment.countryCode, 'en') || segment.countryCode}</td>
                <td className="py-1 text-right">{formatNumber(segment.distanceKm)}</td>
                <td className="py-1 text-right">{formatEmission(segment.ttwKgCo2e)}</td>
                <td className="py-1 text-right">{formatEmission(segment.wtwKgCo2e)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {result.missing?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {result.missing.map((flag: string) => <EmissionBadge key={flag} status="missing_data" label={flag} />)}
        </div>
      )}
      {result.reefer && (
        <div className="mt-2 text-[11px] text-text-secondary border-t border-border pt-1.5">
          {t('emissions_calc_reefer')}: {formatEmission(result.reefer.wtwKgCo2e ?? result.reefer.ttwKgCo2e)}
        </div>
      )}
    </Panel>
  );
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="bg-surface rounded-lg px-2 py-1.5">
      <div className="text-[9px] font-bold uppercase tracking-wider text-text-secondary">{label}</div>
      <div className={`${strong ? 'text-base' : 'text-sm'} font-black ${strong ? 'text-primary' : 'text-text'}`}>{value}</div>
    </div>
  );
}
