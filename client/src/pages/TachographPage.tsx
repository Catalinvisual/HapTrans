import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Timer,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Truck,
  User,
  Coffee,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

export default function TachographPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tachographList, setTachographList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL');

  const loadData = async () => {
    try {
      const res = await api.get('/telematics/tachograph/fleet');
      setTachographList(res.data || []);
    } catch (e) {
      console.error(e);
      toast.error('Eroare la încărcarea datelor tahograf');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const formatHoursMins = (seconds: number) => {
    const s = Math.max(0, seconds || 0);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
  };

  const filtered = tachographList.filter((item) => {
    const matchSearch =
      item.plateNumber?.toLowerCase().includes(search.toLowerCase()) ||
      item.driverName?.toLowerCase().includes(search.toLowerCase());
    const matchAct = activityFilter === 'ALL' || item.currentActivity === activityFilter;
    return matchSearch && matchAct;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {t('tachograph_monitoring_title', 'Monitorizare Tahograf & Timpi de Conducere (CE 561/2006)')}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {t('tachograph_monitoring_subtitle', 'Supraveghere în timp real a orelor de conducere, pauzelor obligatorii și odihnei zilnice')}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh', 'Actualizare')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Caută după număr camion sau șofer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white font-medium text-slate-700 w-full sm:w-auto"
        >
          <option value="ALL">Toate Activitățile</option>
          <option value="DRIVING">DRIVING (Conducere)</option>
          <option value="BREAK">BREAK (Pauză)</option>
          <option value="REST">REST (Odihnă)</option>
          <option value="WORKING">WORKING (Muncă)</option>
          <option value="LOADING">LOADING (Încărcare)</option>
          <option value="UNLOADING">UNLOADING (Descărcare)</option>
        </select>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((tacho) => {
          const breakMins = Math.round(tacho.breakRequiredInSeconds / 60);
          const isBreakSoon = tacho.isBreakRequiredSoon;
          const isBreakOverdue = tacho.breakRequiredInSeconds === 0 && tacho.currentActivity === 'DRIVING';

          return (
            <div
              key={tacho.truckId}
              className={`rounded-3xl border p-5 bg-white shadow-sm transition-all hover:shadow-md ${
                isBreakOverdue
                  ? 'border-rose-300 ring-2 ring-rose-500/20'
                  : isBreakSoon
                  ? 'border-amber-300 ring-2 ring-amber-500/20'
                  : 'border-slate-200/80'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-700 text-sm">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">{tacho.plateNumber}</h3>
                    <div className="text-xs text-slate-500 font-bold flex items-center gap-1">
                      <User className="w-3 h-3" /> {tacho.driverName}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide border ${
                      tacho.currentActivity === 'DRIVING'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : tacho.currentActivity === 'BREAK'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {tacho.currentActivity}
                  </span>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">{Math.round(tacho.speed)} km/h</div>
                </div>
              </div>

              {/* Warning Banner */}
              {tacho.warning && (
                <div
                  className={`mt-3 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                    isBreakOverdue
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{tacho.warning}</span>
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Conducere Astăzi</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatHoursMins(tacho.drivingTimeTodaySeconds)}
                  </div>
                  <div className="text-[10px] text-slate-500">din max 9h legal</div>
                </div>

                <div className={`p-3 rounded-2xl border ${isBreakSoon ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Pauză Obligatorie În</div>
                  <div className={`text-lg font-black mt-0.5 ${isBreakSoon ? 'text-amber-700 animate-pulse' : 'text-slate-900'}`}>
                    {breakMins > 0 ? `${breakMins} min` : '0 min (Pauză)'}
                  </div>
                  <div className="text-[10px] text-slate-500">Pauză necesară: 45 min</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Conducere Săptămânală</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatHoursMins(tacho.weeklyDrivingSeconds)}
                  </div>
                  <div className="text-[10px] text-slate-500">din max 56h legal</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Odihnă Zilnică</div>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatHoursMins(tacho.dailyRestRemainingSeconds)}
                  </div>
                  <div className="text-[10px] text-slate-500">minim 11h repaus</div>
                </div>
              </div>

              {/* Footer ETA info */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Odometer: <strong className="text-slate-700">{Math.round(tacho.odometer).toLocaleString()} km</strong></span>
                <span>ETA: <strong className="text-emerald-700">{tacho.eta ? new Date(tacho.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
