import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Filter, RefreshCw, Globe, Truck as TruckIcon, FileBarChart } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function IftaReportPage() {
  const { t } = useTranslation();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');

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

  const filteredCountries = (report?.byCountry || []).filter((c: any) => {
    const q = search.toLowerCase();
    return !q || (c.country || '').toLowerCase().includes(q) || String(c.km).includes(q);
  });

  return <div className="space-y-5 animate-fade-in">
    <div className="card p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-sm">
      <div className="p-4 border-b border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input className="input pl-9 py-2 text-sm" placeholder={t('search')} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs font-bold text-text-secondary uppercase bg-surface px-3 py-2 rounded-lg shrink-0 border border-border/50">
            {t('ifta_totalKm')}: {report ? Number(report.totalKm || 0).toFixed(0) : 0} km
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-surface/50 border border-border rounded-xl p-1.5 shrink-0">
            <Filter className="w-4 h-4 text-text-secondary" />
            <input type="date" className="input py-1.5 text-sm w-40" value={from} onChange={e => setFrom(e.target.value)} />
            <span className="text-text-secondary">–</span>
            <input type="date" className="input py-1.5 text-sm w-40" value={to} onChange={e => setTo(e.target.value)} />
          </div>
          <button onClick={() => load()} className="btn-secondary py-2 px-4 text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> {t('refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-text-secondary">{t('loading')}...</div>
      ) : (
        <div className="p-5 space-y-6">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-primary">{t('ifta_byCountry')}</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface border-b border-border">
                <th className="table-header">{t('ifta_country')}</th>
                <th className="table-header text-right">{t('ifta_km')}</th>
                <th className="table-header text-center">{t('ifta_trips')}</th>
              </tr></thead>
              <tbody>
                {filteredCountries.map((c: any) => (
                  <tr key={c.country} className="border-b border-border hover:bg-surface/60">
                    <td className="p-3 font-semibold">{c.country}</td>
                    <td className="p-3 text-right font-bold">{Number(c.km).toFixed(0)} km</td>
                    <td className="p-3 text-center">{c.trips}</td>
                  </tr>
                ))}
                {filteredCountries.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-text-secondary">{t('ifta_noData')}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2">
            <TruckIcon className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg text-primary">{t('ifta_byTruck')}</h3>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface border-b border-border">
                <th className="table-header">{t('truck')}</th>
                <th className="table-header">{t('ifta_country')}</th>
                <th className="table-header text-right">{t('ifta_km')}</th>
              </tr></thead>
              <tbody>
                {(report?.byTruck || []).map((tr: any) => (
                  <tr key={tr.truck} className="border-b border-border hover:bg-surface/60">
                    <td className="p-3 font-semibold align-top">{tr.truck}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {tr.countries.map((c: any) => (
                          <span key={c.country} className="text-xs bg-surface border border-border px-2 py-0.5 rounded-full">
                            {c.country}: <b>{Number(c.km).toFixed(0)} km</b>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold align-top">{Number(tr.totalKm).toFixed(0)} km</td>
                  </tr>
                ))}
                {(report?.byTruck || []).length === 0 && <tr><td colSpan={3} className="p-6 text-center text-text-secondary">{t('ifta_noData')}</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  </div>;
}
