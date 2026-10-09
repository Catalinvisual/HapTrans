import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, RefreshCw, Globe, Truck as TruckIcon, Route, Gauge, Download, Calendar } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/light.css';
import { matchesSearch } from '../lib/search';
import { countryIso, countryName, countryNames } from '../lib/countries';
import { fmtNumber, fmtPercent, fmtKm } from '../lib/format';
import KpiStrip from '../components/ui/KpiStrip';
import ExportModal from '../components/ExportModal';

const BAR_COLORS = ['#f97316', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#6366f1'];

function flagEmoji(iso: string): string {
  if (!/^[A-Z]{2}$/.test(iso)) return '🌍';
  return String.fromCodePoint(...iso.split('').map(c => 127397 + c.charCodeAt(0)));
}

function formatCountry(raw: string, lang: string): { iso: string; label: string; flag: string } {
  const iso = countryIso(raw) || String(raw).slice(0, 2).toUpperCase();
  const indexed = countryNames as Record<string, Record<string, string>>;
  if (indexed[iso]) {
    return { iso, flag: flagEmoji(iso), label: `${iso} (${countryName(iso, (lang || 'ro') as any)})` };
  }
  return { iso, flag: flagEmoji(iso), label: String(raw) };
}

export default function IftaReportPage() {
  const { t, i18n } = useTranslation();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const load = async (silent = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/trips/ifta-report?${params.toString()}`);
      setReport(res.data);
    } catch {
      if (!silent) toast.error(t('ifta_loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [from, to]);

  const filteredCountries = (report?.byCountry || []).filter((c: any) => matchesSearch(search, c.country, c.km));
  const filteredTrucks = (report?.byTruck || []).filter((tr: any) => matchesSearch(search, tr.truck, (tr.countries || []).map((c: any) => c.country).join(' ')));

  const totalKm = report?.totalKm || 0;
  const totalTrips = (report?.byCountry || []).reduce((s: number, c: any) => s + Number(c.trips || 0), 0);

  const kpis = [
    { key: 'km', label: t('ifta_totalKm'), value: fmtKm(totalKm), icon: Gauge },
    { key: 'countries', label: t('ifta_countries', 'Țări tranzitate'), value: fmtNumber((report?.byCountry || []).length), icon: Globe },
    { key: 'trucks', label: t('ifta_trucks', 'Camioane active'), value: fmtNumber((report?.byTruck || []).length), icon: TruckIcon },
    { key: 'trips', label: t('ifta_trips', 'Total curse'), value: fmtNumber(totalTrips), icon: Route },
  ];

  const exportRows = (report?.byCountry || []).map((c: any) => {
    const f = formatCountry(c.country, i18n.language);
    return {
      country: f.label,
      km: c.km,
      percent: totalKm > 0 ? (c.km / totalKm) * 100 : 0,
      trips: c.trips,
    };
  });

  return <div className="space-y-5 animate-fade-in">
    <KpiStrip items={kpis} dense />

    <div className="card flex items-center gap-2 px-3 py-2 flex-wrap">
      <div className="relative flex-1 min-w-[170px] max-w-[210px] shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
        <input className="input !pl-8 !py-1.5 !text-xs h-8 w-full" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="flex items-center gap-2 bg-surface/60 border border-border rounded-lg px-1.5 py-1 shrink-0">
        <Filter className="w-3.5 h-3.5 text-text-secondary ml-1" />
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <Flatpickr value={from} onChange={(_, dateStr) => setFrom(dateStr)} className="input !pl-8 !py-1 !text-xs w-32 cursor-pointer hover:border-primary/50 transition-colors" options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false }} placeholder={t('from', 'From')} />
        </div>
        <span className="text-text-secondary text-[11px]">–</span>
        <div className="relative">
          <Calendar className="w-3.5 h-3.5 text-primary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
          <Flatpickr value={to} onChange={(_, dateStr) => setTo(dateStr)} className="input !pl-8 !py-1 !text-xs w-32 cursor-pointer hover:border-primary/50 transition-colors" options={{ altInput: true, altFormat: 'd/m/Y', dateFormat: 'Y-m-d', allowInput: false }} placeholder={t('to', 'To')} />
        </div>
      </div>

      <div className="flex-1" />

      <button onClick={() => load()} className="btn-secondary !py-1.5 !px-3 text-xs font-semibold flex items-center gap-1.5 shrink-0">
        <RefreshCw className="w-3.5 h-3.5" /> {t('refresh')}
      </button>
      <button onClick={() => setExportOpen(true)} className="btn-primary !py-1.5 !px-3 text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-md shadow-primary/20">
        <Download className="w-4 h-4" /> {t('ifta_export', 'Export Declarație IFTA')}
      </button>
    </div>

    {loading ? (
      <div className="p-10 text-center text-text-secondary">{t('loading')}...</div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-black text-text uppercase tracking-wide">{t('ifta_byCountry')}</h3>
          </div>
          <div className="flex items-center gap-3 px-3 pb-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary border-b border-border/60">
            <span className="w-[180px] shrink-0">{t('ifta_country')}</span>
            <span className="flex-1 text-right">PONDERE & KM</span>
            <span className="w-[64px] shrink-0 text-right">PROCENT</span>
            <span className="w-[52px] shrink-0 text-right">CURSE</span>
          </div>
          <div className="mt-1">
            {filteredCountries.map((c: any, i: number) => {
              const f = formatCountry(c.country, i18n.language);
              const pct = totalKm > 0 ? (Number(c.km) / totalKm) * 100 : 0;
              return (
                <div key={c.country} className="flex items-center gap-3 px-3 py-[7px] rounded-lg hover:bg-surface/60 transition-colors">
                  <div className="w-[180px] shrink-0 flex items-center gap-2 min-w-0">
                    <span className="text-sm leading-none">{f.flag}</span>
                    <span className="font-bold text-[12px] text-text truncate">{f.label}</span>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-surface-hover rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
                    </div>
                    <span className="text-[11px] font-bold text-text whitespace-nowrap w-16 text-right">{fmtNumber(c.km)} km</span>
                  </div>
                  <span className="w-[64px] shrink-0 text-right text-[11px] font-semibold text-text-secondary">{fmtPercent(pct)}</span>
                  <span className="w-[52px] shrink-0 text-right text-[11px] font-bold text-text">{c.trips}</span>
                </div>
              );
            })}
            {filteredCountries.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">{t('ifta_noData')}</div>}
          </div>
        </div>

        <div className="card !p-4">
          <div className="flex items-center gap-2 mb-3">
            <TruckIcon className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-black text-text uppercase tracking-wide">{t('ifta_byTruck')}</h3>
          </div>
          <div className="flex items-center gap-3 px-3 pb-2 text-[9px] font-bold uppercase tracking-wider text-text-secondary border-b border-border/60">
            <span className="w-[110px] shrink-0">{t('truck')}</span>
            <span className="flex-1">REPARTIZARE PE ȚĂRI</span>
            <span className="w-[80px] shrink-0 text-right">TOTAL KM</span>
          </div>
          <div className="mt-1">
            {filteredTrucks.map((tr: any) => (
              <div key={tr.truck} className="flex items-start gap-3 px-3 py-[7px] rounded-lg hover:bg-surface/60 transition-colors">
                <span className="w-[110px] shrink-0 font-bold text-[12px] text-text truncate pt-0.5">{tr.truck}</span>
                <div className="flex-1 flex flex-wrap gap-1">
                  {tr.countries.map((c: any) => {
                    const f = formatCountry(c.country, i18n.language);
                    return (
                      <span key={c.country} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-surface border border-border px-1.5 py-0.5 rounded-md">
                        <span>{f.flag}</span> {f.iso}: <b>{fmtNumber(c.km)} km</b>
                      </span>
                    );
                  })}
                </div>
                <span className="w-[80px] shrink-0 text-right font-bold text-[13px] text-text pt-0.5">{fmtNumber(tr.totalKm)} km</span>
              </div>
            ))}
            {filteredTrucks.length === 0 && <div className="p-8 text-center text-sm text-text-secondary">{t('ifta_noData')}</div>}
          </div>
        </div>
      </div>
    )}

    <ExportModal
      isOpen={exportOpen}
      onClose={() => setExportOpen(false)}
      data={exportRows}
      filename={`Declaratie_IFTA_${from || 'period'}_${to || 'now'}`}
      sheetName="IFTA"
      title="Declarație IFTA"
      headers={[
        { key: 'country', label: t('ifta_country') },
        { key: 'km', label: t('ifta_km'), transform: (v: any) => `${fmtNumber(v)} km` },
        { key: 'percent', label: 'Pondere %', transform: (v: any) => fmtPercent(v) },
        { key: 'trips', label: t('ifta_trips'), transform: (v: any) => String(v) },
      ]}
      getDateField={() => null}
    />
  </div>;
}