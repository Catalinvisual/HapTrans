import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Globe2, Landmark, ScrollText, ShieldQuestion } from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { EmissionCountry, EmissionFactorRecord, RegulatorySource } from '../../lib/emissionsApi';
import { EmissionBadge, Panel, SectionHeading, StateBlock, TextInput, formatNumber } from './EmissionBits';

const BASIS_LABEL: Record<string, string> = {
  distance: 'emissions_countries_basis_distance',
  time: 'emissions_countries_basis_time',
  distance_time: 'emissions_countries_basis_distance_time',
  network_concession: 'emissions_countries_basis_concession',
  none: 'emissions_countries_basis_none',
  unknown: 'emissions_countries_basis_unknown',
};

export default function CountriesTab() {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').slice(0, 2);
  const [countries, setCountries] = useState<EmissionCountry[]>([]);
  const [sources, setSources] = useState<RegulatorySource[]>([]);
  const [factors, setFactors] = useState<EmissionFactorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<EmissionCountry | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      emissionsApi.countries(lang),
      emissionsApi.regulatorySources(),
      emissionsApi.factors(),
    ])
      .then(([c, s, f]) => {
        setCountries(c);
        setSources(s);
        setFactors(f);
      })
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [lang]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return countries;
    return countries.filter((c) =>
      c.code.toLowerCase().includes(needle) ||
      Object.values(c.names || {}).some((name) => String(name).toLowerCase().includes(needle)),
    );
  }, [countries, search]);

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_countries_title')} hint={t('emissions_countries_hint')} />

      <StateBlock loading={loading} error={error} onRetry={load}>
        <div className="flex flex-wrap items-center gap-2">
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('emissions_countries_filter')} className="max-w-xs" />
          <span className="text-xs text-text-secondary">{filtered.length} / {countries.length}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mt-3">
          <div className="xl:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur z-10">
                  <tr className="text-[10px] uppercase tracking-wider text-text-secondary">
                    <th className="text-left px-3 py-2">{t('emissions_countries_name')}</th>
                    <th className="text-left px-3 py-2">{t('emissions_countries_system')}</th>
                    <th className="text-left px-3 py-2">{t('emissions_countries_co2_class')}</th>
                    <th className="text-left px-3 py-2">{t('emissions_countries_verification')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((country) => (
                    <tr
                      key={country.id}
                      onClick={() => setSelected(country)}
                      className={`border-t border-border cursor-pointer hover:bg-orange-50/60 dark:hover:bg-primary/5 ${selected?.code === country.code ? 'bg-orange-50/80 dark:bg-primary/10' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <div className="font-semibold text-text">{country.name}</div>
                        <div className="text-[10px] text-text-secondary">{country.code} · {country.currency}{country.euMember ? ' · EU' : ''}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-text">{country.roadChargingSystem || '—'}</div>
                        <div className="text-[10px] text-text-secondary">{t(BASIS_LABEL[country.roadChargingBasis] || 'emissions_countries_basis_unknown')}</div>
                      </td>
                      <td className="px-3 py-2">
                        {country.co2ClassStatus === 'applicable'
                          ? <span className="text-emerald-700 dark:text-emerald-300 font-semibold">{t('emissions_countries_applicable')}</span>
                          : country.co2ClassStatus === 'not_applicable'
                            ? <span className="text-text-secondary">{t('emissions_countries_not_applicable')}</span>
                            : <span className="text-amber-700 dark:text-amber-300 inline-flex items-center gap-1"><ShieldQuestion className="w-3 h-3" />{t('emissions_countries_not_verified')}</span>}
                      </td>
                      <td className="px-3 py-2"><EmissionBadge status={country.verificationStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            {selected ? (
              <Panel title={`${selected.name} (${selected.code})`} icon={Globe2}>
                <div className="space-y-2 text-xs">
                  <Row label={t('emissions_countries_currency')} value={selected.currency} />
                  <Row label={t('emissions_countries_eu')} value={selected.euMember ? '✓' : '—'} />
                  <Row label={t('emissions_countries_system')} value={selected.roadChargingSystem || '—'} />
                  <Row label={t('emissions_countries_basis')} value={t(BASIS_LABEL[selected.roadChargingBasis] || 'emissions_countries_basis_unknown')} />
                  <Row label={t('emissions_countries_co2_class')} value={
                    selected.co2ClassStatus === 'applicable' ? t('emissions_countries_applicable')
                      : selected.co2ClassStatus === 'not_applicable' ? t('emissions_countries_not_applicable')
                        : t('emissions_countries_not_verified')
                  } />
                  <Row label={t('emissions_countries_verification')} value={selected.verificationStatus === 'verified' ? t('emissions_countries_applicable') : t('emissions_countries_not_verified')} />
                  <Row label={t('emissions_countries_last_verified')} value={selected.lastVerifiedAt || '—'} />
                  <Row label={t('emissions_countries_effective')} value={selected.effectiveFrom || '—'} />
                  {selected.chargingOperator && <Row label="Operator" value={selected.chargingOperator} />}
                </div>
                {selected.chargingNotes && (
                  <p className="mt-2 text-[11px] text-text-secondary leading-relaxed border-t border-border pt-2">{selected.chargingNotes}</p>
                )}
                <div className="mt-2 text-[10px] text-amber-700 dark:text-amber-300">{t('emissions_countries_tariff_unavailable')}</div>
                <div className="mt-1 text-[10px] text-text-secondary">{t('emissions_countries_co2_note')}</div>
              </Panel>
            ) : (
              <Panel title={t('emissions_countries_road_rules')} icon={Landmark}>
                <p className="text-xs text-text-secondary">{t('emissions_countries_hint')}</p>
              </Panel>
            )}
          </div>
        </div>

        <Panel title={t('emissions_countries_regulatory')} subtitle={t('emissions_countries_regulatory_hint')} icon={ScrollText}>
          <ul className="divide-y divide-border">
            {sources.map((source) => (
              <li key={source.id} className="py-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-text">{source.name}</div>
                    <div className="text-[10px] text-text-secondary mt-0.5">
                      {source.jurisdiction} · {source.version}
                      {source.effectiveDate ? ` · ${t('emissions_countries_effective')}: ${source.effectiveDate}` : ''}
                      {source.applicationDate ? ` · ${t('emissions_countries_application')}: ${source.applicationDate}` : ''}
                      {source.nextReviewAt ? ` · ${t('emissions_countries_next_review')}: ${source.nextReviewAt}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EmissionBadge status={source.verificationStatus} />
                    <a
                      href={source.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 text-[11px] font-semibold"
                    >
                      <ExternalLink className="w-3 h-3" />{t('emissions_countries_open_source')}
                    </a>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{source.requirements}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(source.reportingScopes || []).map((scope) => (
                    <span key={scope} className="px-1.5 py-0.5 rounded bg-surface border border-border text-[9px] font-semibold text-text-secondary">{scope}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Emission factor provenance" subtitle="Every factor carries its dataset, source and version. A missing factor is never replaced by a guess." icon={Landmark}>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-text-secondary border-b border-border">
                  <th className="text-left px-2 py-2">Factor</th>
                  <th className="text-left px-2 py-2">Fuel</th>
                  <th className="text-right px-2 py-2">TTW / unit</th>
                  <th className="text-right px-2 py-2">WTT / unit</th>
                  <th className="text-left px-2 py-2">Scope</th>
                  <th className="text-left px-2 py-2">Source</th>
                  <th className="text-left px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((factor) => (
                  <tr key={factor.id} className="border-b border-border/60">
                    <td className="px-2 py-1.5 font-mono text-[10px] text-text">{factor.code}</td>
                    <td className="px-2 py-1.5">{factor.fuelType}</td>
                    <td className="px-2 py-1.5 text-right">{factor.ttwKgCo2ePerUnit != null ? formatNumber(factor.ttwKgCo2ePerUnit, 5) : '—'}</td>
                    <td className="px-2 py-1.5 text-right">{factor.wttKgCo2ePerUnit != null ? formatNumber(factor.wttKgCo2ePerUnit, 5) : '—'}</td>
                    <td className="px-2 py-1.5">{factor.geographicScope} / {factor.energyUnit}</td>
                    <td className="px-2 py-1.5">
                      {factor.sourceUrl ? (
                        <a href={factor.sourceUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">{factor.datasetVersion}</a>
                      ) : factor.datasetVersion}
                    </td>
                    <td className="px-2 py-1.5"><EmissionBadge status={factor.verificationStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </StateBlock>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-border/50 pb-1">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text text-right">{value}</span>
    </div>
  );
}
