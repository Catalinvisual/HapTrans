import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  AlertTriangle, ClipboardCheck, FileWarning, RefreshCw, ScanSearch, ShieldAlert, ShieldCheck,
} from 'lucide-react';
import emissionsApi from '../../lib/emissionsApi';
import type { RegulatorySource } from '../../lib/emissionsApi';
import { EmissionBadge, Panel, SectionHeading, StateBlock, formatEmission, formatNumber } from './EmissionBits';

export default function ComplianceTab() {
  const { t } = useTranslation();
  const [integrity, setIntegrity] = useState<any>(null);
  const [due, setDue] = useState<RegulatorySource[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reproducing, setReproducing] = useState<string | null>(null);
  const [reproduction, setReproduction] = useState<any>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      emissionsApi.integrity(),
      emissionsApi.regulatoryDue(),
      emissionsApi.auditRuns({ limit: 25 }),
      emissionsApi.profiles(),
    ])
      .then(([i, d, r, p]) => {
        setIntegrity(i);
        setDue(d);
        setRuns(r);
        setProfiles(p);
      })
      .catch((err) => setError(err?.response?.data?.message || t('emissions_error')))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const reproduce = async (id: string) => {
    setReproducing(id);
    try {
      const data = await emissionsApi.reproduce(id);
      setReproduction(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t('emissions_error'));
    } finally {
      setReproducing(null);
    }
  };

  const profilesNeedingReview = profiles.filter((row) => {
    const status = row.profile?.verificationStatus;
    return !status || status === 'missing_data' || status === 'unverified' || status === 'requires_review' || status === 'expired';
  });
  const expiredDocs = profiles.flatMap((row) =>
    (row.profile?.documents || []).filter((doc: any) => doc.expired).map((doc: any) => ({ ...doc, truck: row.truck })),
  );

  return (
    <div className="space-y-3">
      <SectionHeading title={t('emissions_compliance_title')} hint={t('emissions_compliance_hint')} />

      <StateBlock loading={loading} error={error} onRetry={load}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1.5">
          <ComplianceCard icon={ShieldCheck} label={t('emissions_compliance_checked')} value={formatNumber(integrity?.checked)} tone="neutral" />
          <ComplianceCard icon={FileWarning} label={t('emissions_compliance_missing')} value={formatNumber(integrity?.missingFigures)} tone={integrity?.missingFigures ? 'warn' : 'ok'} />
          <ComplianceCard icon={AlertTriangle} label={t('emissions_compliance_not_reconciled')} value={formatNumber(integrity?.notReconciled)} tone={integrity?.notReconciled ? 'bad' : 'ok'} />
          <ComplianceCard icon={ScanSearch} label={t('emissions_compliance_estimated')} value={formatNumber(integrity?.estimated)} tone="warn" />
          <ComplianceCard icon={ShieldAlert} label={t('emissions_compliance_missing_wtt')} value={formatNumber(integrity?.missingWtt)} tone={integrity?.missingWtt ? 'warn' : 'ok'} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 mt-3">
          <Panel title={t('emissions_compliance_review_queue')} icon={ClipboardCheck}>
            <div className="text-[11px] text-text-secondary mb-2">
              {t('emissions_compliance_verified_profiles')}: <b className="text-text">{profiles.length - profilesNeedingReview.length}</b> /
              {' '}{profiles.length} · {t('emissions_compliance_expired_docs')}: <b className="text-text">{expiredDocs.length}</b>
            </div>
            <ul className="divide-y divide-border max-h-64 overflow-auto">
              {profilesNeedingReview.slice(0, 40).map((row) => (
                <li key={row.truck.id} className="py-1.5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-text truncate">{row.truck.plateNumber}</div>
                    <div className="text-[10px] text-text-secondary truncate">
                      {row.profile?.fuelType || row.truck.fuelType || '—'} · {row.profile?.co2Class || t('emissions_registry_no_profile')}
                    </div>
                  </div>
                  <EmissionBadge status={row.profile?.verificationStatus || 'missing_data'} />
                </li>
              ))}
              {!profilesNeedingReview.length && <li className="py-4 text-center text-xs text-text-secondary">{t('emissions_empty')}</li>}
            </ul>
          </Panel>

          <Panel title={t('emissions_compliance_regulatory_due')} icon={AlertTriangle}>
            {due.length ? (
              <ul className="divide-y divide-border">
                {due.map((source) => (
                  <li key={source.id} className="py-2 text-xs">
                    <div className="font-semibold text-text">{source.name}</div>
                    <div className="text-[10px] text-text-secondary">
                      {source.jurisdiction} · {t('emissions_countries_next_review')}: {source.nextReviewAt || '—'} · {source.version}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center text-xs text-text-secondary">{t('emissions_compliance_no_due')}</div>
            )}
            <div className="text-[10px] text-text-secondary mt-2">{t('emissions_compliance_alerts_note')}</div>
          </Panel>
        </div>

        <Panel title={t('emissions_compliance_audit')} icon={ShieldCheck} className="mt-3">
          {runs.length ? (
            <div className="overflow-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-[9px] uppercase tracking-wider text-text-secondary border-b border-border">
                    <th className="text-left py-1.5">{t('emissions_compliance_date')}</th>
                    <th className="text-left py-1.5">{t('emissions_compliance_trigger')}</th>
                    <th className="text-left py-1.5">{t('emissions_reports_engine')}</th>
                    <th className="text-left py-1.5">Hash</th>
                    <th className="text-right py-1.5">TTW</th>
                    <th className="text-right py-1.5">WTW</th>
                    <th className="text-left py-1.5">{t('emissions_status')}</th>
                    <th className="text-right py-1.5">{t('emissions_compliance_reproduce')}</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b border-border/50">
                      <td className="py-1.5 whitespace-nowrap">{new Date(run.createdAt).toLocaleString()}</td>
                      <td className="py-1.5">{run.trigger}</td>
                      <td className="py-1.5">{run.engineVersion}</td>
                      <td className="py-1.5 font-mono text-[9px]">{run.inputHash?.slice(0, 12) || '—'}</td>
                      <td className="py-1.5 text-right">{formatEmission(run.resultSnapshot?.ttwKgCo2e)}</td>
                      <td className="py-1.5 text-right font-semibold">{formatEmission(run.resultSnapshot?.wtwKgCo2e)}</td>
                      <td className="py-1.5"><EmissionBadge status={run.status} /></td>
                      <td className="py-1.5 text-right">
                        <button
                          className="text-primary hover:underline inline-flex items-center gap-1 font-semibold disabled:opacity-40"
                          onClick={() => reproduce(run.id)}
                          disabled={reproducing === run.id}
                        >
                          <RefreshCw className={`w-3 h-3 ${reproducing === run.id ? 'animate-spin' : ''}`} />{t('emissions_compliance_reproduce')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className="py-4 text-center text-xs text-text-secondary">{t('emissions_empty')}</div>}

          {reproduction && (
            <div className={`mt-2 rounded-lg border px-3 py-2 text-[11px] ${reproduction.match ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'}`}>
              <div className="font-bold">{reproduction.match ? t('emissions_compliance_reproduce_ok') : t('emissions_compliance_reproduce_mismatch')}</div>
              <div className="text-text-secondary mt-0.5">
                {t('emissions_compliance_stored')}: {formatEmission(reproduction.stored?.wtwKgCo2e)} ·
                {' '}{t('emissions_compliance_recomputed')}: {formatEmission(reproduction.recomputed?.wtwKgCo2e)}
              </div>
              {reproduction.differences?.length > 0 && (
                <div className="text-text-secondary">{reproduction.differences.join(' · ')}</div>
              )}
            </div>
          )}
        </Panel>

        {expiredDocs.length > 0 && (
          <Panel title={t('emissions_compliance_expired_docs')} icon={FileWarning} className="mt-3">
            <ul className="divide-y divide-border">
              {expiredDocs.map((doc: any) => (
                <li key={doc.id} className="py-1.5 flex items-center justify-between text-xs">
                  <span>{doc.truck.plateNumber} · {doc.documentType} {doc.documentNumber ? `· ${doc.documentNumber}` : ''}</span>
                  <span className="text-rose-600 font-semibold">{doc.expiresAt}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </StateBlock>
    </div>
  );
}

function ComplianceCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: 'neutral' | 'ok' | 'warn' | 'bad' }) {
  const toneClass = tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-rose-600' : 'text-text';
  return (
    <div className="bg-card border border-border rounded-lg px-2.5 py-2 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold uppercase tracking-wider text-text-secondary truncate">{label}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${toneClass}`} />
      </div>
      <div className={`text-[15px] font-black ${toneClass}`}>{value}</div>
    </div>
  );
}
