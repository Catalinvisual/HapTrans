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
import CustomSelect, { type SelectOption } from '../components/CustomSelect';

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
      toast.error(t('tacho_load_error', 'Error loading tachograph fleet data'));
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

  const getActivityBadge = (act: string) => {
    const colors: Record<string, string> = {
      DRIVING: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      BREAK: 'bg-amber-50 text-amber-700 border-amber-200',
      REST: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      WORKING: 'bg-blue-50 text-blue-700 border-blue-200',
      AVAILABILITY: 'bg-slate-50 text-slate-700 border-slate-200',
      LOADING: 'bg-purple-50 text-purple-700 border-purple-200',
      UNLOADING: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
    };
    const actLabelMap: Record<string, string> = {
      DRIVING: t('act_driving', 'Driving'),
      BREAK: t('act_break', 'Break'),
      REST: t('act_rest', 'Rest'),
      WORKING: t('act_working', 'Work'),
      AVAILABILITY: t('act_availability', 'Availability'),
      LOADING: t('act_loading', 'Loading'),
      UNLOADING: t('act_unloading', 'Unloading'),
    };
    return (
      <span className={`px-2.5 py-1 rounded-lg text-xs font-black tracking-wide uppercase border ${colors[act] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
        {actLabelMap[act] || act}
      </span>
    );
  };

  const activityOptions: SelectOption[] = [
    { value: 'ALL', label: t('filter_all_activities', 'All Activities') },
    { value: 'DRIVING', label: t('act_driving', 'Driving'), color: 'text-emerald-600' },
    { value: 'BREAK', label: t('act_break', 'Break'), color: 'text-amber-600' },
    { value: 'REST', label: t('act_rest', 'Rest'), color: 'text-indigo-600' },
    { value: 'WORKING', label: t('act_working', 'Work'), color: 'text-blue-600' },
    { value: 'LOADING', label: t('act_loading', 'Loading'), color: 'text-purple-600' },
    { value: 'UNLOADING', label: t('act_unloading', 'Unloading'), color: 'text-fuchsia-600' },
    { value: 'AVAILABILITY', label: t('act_availability', 'Availability'), color: 'text-slate-600' },
  ];

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
              {t('tachograph_monitoring_title', 'Tachograph & Driving Compliance (CE 561/2006)')}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {t('tachograph_monitoring_subtitle', 'Live monitoring of driving hours, mandatory breaks, and daily rest')}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh', 'Refresh')}
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_telematics_placeholder', 'Search by plate or driver name…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="w-full sm:w-56">
          <CustomSelect
            value={activityFilter}
            onChange={(val) => setActivityFilter(val)}
            options={activityOptions}
          />
        </div>
      </div>

      {/* Driver Tachograph Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const breakMins = Math.round((item.compliance?.breakRequiredIn || 0) / 60);
          const isBreakSoon = breakMins <= 18 && breakMins > 0;
          const isBreakOverdue = breakMins <= 0 && item.currentActivity === 'DRIVING';

          return (
            <div
              key={item.truckId}
              className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="font-black text-slate-900 text-base">{item.plateNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <User className="w-3 h-3" />
                    <span className="font-bold text-slate-700">{item.driverName}</span>
                  </div>
                </div>

                <div className="text-right">
                  {getActivityBadge(item.currentActivity)}
                  <div className="text-[11px] font-black text-slate-800 mt-1">
                    {Math.round(item.speed || 0)} km/h
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                    <span>{t('tacho_driving_today', 'Driving Today')}</span>
                    <Clock className="w-3 h-3 text-primary" />
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-1">
                    {formatHoursMins(item.compliance?.drivingTimeToday)}
                  </div>
                  <div className="text-[10px] text-slate-400">{t('tacho_out_of_max_9h', 'of legal max 9h')}</div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    isBreakOverdue
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : isBreakSoon
                      ? 'bg-amber-50 border-amber-200 text-amber-800'
                      : 'bg-slate-50 border-slate-100 text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold uppercase text-[10px]">
                    <span>{t('tacho_break_required_in', 'Mandatory Break In')}</span>
                    <Coffee className="w-3 h-3" />
                  </div>
                  <div className="font-black text-sm mt-1">
                    {breakMins > 0 ? `${breakMins} min` : t('act_break', 'Break')}
                  </div>
                  <div className="text-[10px] opacity-80">{t('tacho_break_duration_hint', 'Required break: 45 min')}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                    <span>{t('tacho_weekly_driving', 'Weekly Driving')}</span>
                    <Activity className="w-3 h-3 text-indigo-500" />
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-1">
                    {formatHoursMins(item.compliance?.weeklyDrivingTime)}
                  </div>
                  <div className="text-[10px] text-slate-400">{t('tacho_out_of_max_56h', 'of legal max 56h')}</div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-400 font-bold uppercase text-[10px]">
                    <span>{t('tacho_daily_rest', 'Daily Rest')}</span>
                    <ShieldAlert className="w-3 h-3 text-emerald-500" />
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-1">
                    {formatHoursMins(item.compliance?.dailyRestRemaining)}
                  </div>
                  <div className="text-[10px] text-slate-400">{t('tacho_min_11h_rest', 'min 11h rest')}</div>
                </div>
              </div>

              {/* Progress & ETA Footer */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  Odometer: <span className="font-black text-slate-700">{Math.round(item.odometer || 0).toLocaleString()} km</span>
                </div>
                {item.eta && (
                  <div>
                    ETA: <span className="font-black text-indigo-600">{new Date(item.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
