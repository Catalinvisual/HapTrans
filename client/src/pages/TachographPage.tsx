import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  RefreshCw,
  Coffee,
  LayoutGrid,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { fmtNumber } from '../lib/format';
import { matchesSearch } from '../lib/search';
import CustomSelect, { type SelectOption } from '../components/CustomSelect';
import DataTable from '../components/ui/DataTable';
import type { Column } from '../components/ui/DataTable';

const MAX_DAILY_DRIVE = 9 * 3600;
const MAX_WEEKLY_DRIVE = 56 * 3600;
const MIN_DAILY_REST = 11 * 3600;

function MicroMetric({ label, value, pct, barColor, hint }: { label: string; value: string; pct: number; barColor: string; hint?: string }) {
  return (
    <div title={hint} className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-text-secondary truncate">{label}</span>
        <span className="text-[11px] font-black text-text-primary whitespace-nowrap">{value}</span>
      </div>
      <div className="mt-1 w-full bg-surface h-[3px] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

export default function TachographPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [tachographList, setTachographList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [view, setView] = useState<'cards' | 'table'>('cards');

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
    const matchSearch = matchesSearch(search, item.plateNumber, item.driverName);
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
      <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide uppercase border ${colors[act] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
        {actLabelMap[act] || act}
      </span>
    );
  };

  const activityOptions: SelectOption[] = [
    { value: 'ALL', label: t('filter_all_activities', 'Toate Activitățile') },
    { value: 'DRIVING', label: t('act_driving', 'Driving'), color: 'bg-emerald-500' },
    { value: 'BREAK', label: t('act_break', 'Break'), color: 'bg-amber-500' },
    { value: 'REST', label: t('act_rest', 'Rest'), color: 'bg-indigo-500' },
    { value: 'WORKING', label: t('act_working', 'Work'), color: 'bg-blue-500' },
    { value: 'LOADING', label: t('act_loading', 'Loading'), color: 'bg-purple-500' },
    { value: 'UNLOADING', label: t('act_unloading', 'Unloading'), color: 'bg-fuchsia-500' },
    { value: 'AVAILABILITY', label: t('act_availability', 'Availability'), color: 'bg-slate-500' },
  ];

  const metrics = (item: any) => {
    const breakSeconds =
      item.compliance?.breakRequiredIn ??
      item.compliance?.breakRequiredInSeconds ??
      item.breakRequiredIn ??
      item.breakRequiredInSeconds ??
      9000;
    const breakMins = Math.round(breakSeconds / 60);
    const drivingTodaySeconds = item.compliance?.drivingTimeToday ?? item.drivingTimeToday ?? item.drivingTimeTodaySeconds ?? 7200;
    const weeklyDrivingSeconds = item.compliance?.weeklyDrivingTime ?? item.weeklyDrivingTime ?? item.weeklyDrivingSeconds ?? 90000;
    const dailyRestSeconds = item.compliance?.dailyRestRemaining ?? item.dailyRestRemaining ?? item.dailyRestRemainingSeconds ?? 39600;

    const driveH = drivingTodaySeconds / 3600;
    const weekH = weeklyDrivingSeconds / 3600;
    const restH = dailyRestSeconds / 3600;

    return {
      breakMins,
      drivingTodaySeconds,
      weeklyDrivingSeconds,
      dailyRestSeconds,
      driveColor: driveH >= 8.5 ? 'bg-red-500' : driveH >= 7 ? 'bg-amber-500' : 'bg-emerald-500',
      drivePct: (drivingTodaySeconds / MAX_DAILY_DRIVE) * 100,
      breakColor: breakMins <= 15 ? 'bg-red-500 animate-pulse' : breakMins <= 60 ? 'bg-amber-500' : 'bg-emerald-500',
      breakPct: Math.min(100, (breakMins / 60) * 100),
      weekColor: weekH >= 49 ? 'bg-red-500' : weekH >= 42 ? 'bg-amber-500' : 'bg-emerald-500',
      weekPct: (weeklyDrivingSeconds / MAX_WEEKLY_DRIVE) * 100,
      restColor: restH >= 11 ? 'bg-emerald-500' : restH >= 9 ? 'bg-amber-500' : 'bg-red-500',
      restPct: Math.min(100, (dailyRestSeconds / MIN_DAILY_REST) * 100),
    };
  };

  const columns: Column<any>[] = [
    {
      key: 'vehicle', label: t('vehicle', 'Vehicul'), width: '130px',
      render: (item) => <span className="font-bold text-[13px] text-text-primary">{item.plateNumber}</span>,
    },
    {
      key: 'driver', label: t('driver', 'Șofer'),
      render: (item) => <span className="text-xs font-semibold text-text-primary">{item.driverName}</span>,
    },
    { key: 'status', label: t('status', 'Status'), render: (item) => getActivityBadge(item.currentActivity) },
    {
      key: 'today', label: t('tacho_driving_today', 'Conducere Azi'), align: 'right',
      render: (item) => {
        const m = metrics(item);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <div className="w-10 bg-surface h-[3px] rounded-full overflow-hidden"><div className={`h-full ${m.driveColor}`} style={{ width: `${Math.min(100, m.drivePct)}%` }} /></div>
            <span className="text-[11px] font-semibold text-text-primary">{formatHoursMins(m.drivingTodaySeconds)} / 9h</span>
          </div>
        );
      },
    },
    {
      key: 'break', label: t('tacho_break_required_in', 'Pauză În'), align: 'right',
      render: (item) => {
        const m = metrics(item);
        return <span className={`text-[11px] font-black whitespace-nowrap ${m.breakMins <= 15 ? 'text-red-600' : m.breakMins <= 60 ? 'text-amber-600' : 'text-slate-700'}`}>{m.breakMins > 0 ? `${m.breakMins} min` : t('act_break', 'Break')}</span>;
      },
    },
    {
      key: 'weekly', label: t('tacho_weekly_driving', 'Conducere Săpt.'), align: 'right',
      render: (item) => {
        const m = metrics(item);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <div className="w-10 bg-surface h-[3px] rounded-full overflow-hidden"><div className={`h-full ${m.weekColor}`} style={{ width: `${Math.min(100, m.weekPct)}%` }} /></div>
            <span className="text-[11px] font-semibold text-text-primary">{formatHoursMins(m.weeklyDrivingSeconds)} / 56h</span>
          </div>
        );
      },
    },
    {
      key: 'rest', label: t('tacho_daily_rest', 'Odihnă'), align: 'right',
      render: (item) => {
        const m = metrics(item);
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <div className="w-10 bg-surface h-[3px] rounded-full overflow-hidden"><div className={`h-full ${m.restColor}`} style={{ width: `${m.restPct}%` }} /></div>
            <span className="text-[11px] font-semibold text-text-primary">{formatHoursMins(m.dailyRestSeconds)} / 11h</span>
          </div>
        );
      },
    },
    {
      key: 'eta', label: t('col_eta_km', 'ETA / KM'), align: 'right',
      render: (item) => (
        <div className="text-right leading-tight whitespace-nowrap">
          {item.eta ? <div className="text-[11px] font-bold text-indigo-600">{new Date(item.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div> : null}
          <div className="text-[11px] text-text-secondary">{fmtNumber(Math.round(item.odometer || 0))} km</div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 space-y-3 animate-fade-in max-w-[1600px] mx-auto pb-10">
      {/* Single control row */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-[260px]">
          <div className="relative w-[220px] shrink-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('search_telematics_placeholder', 'Caută placă sau șofer…')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8 pr-3 py-1.5 text-xs w-full"
            />
          </div>
          <div className="w-[170px] shrink-0">
            <CustomSelect size="sm" value={activityFilter} onChange={(val) => setActivityFilter(val)} options={activityOptions} />
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{filtered.length} {t('results', 'results')}</span>
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView('cards')}
              className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 transition-colors ${view === 'cards' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> {t('tacho_view_cards', 'Carduri')}
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-2 py-1 text-[11px] font-bold flex items-center gap-1 transition-colors ${view === 'table' ? 'bg-primary text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <List className="w-3.5 h-3.5" /> {t('tacho_view_table', 'Tabel Dens')}
            </button>
          </div>
          <button
            onClick={loadData}
            title={t('refresh', 'Refresh')}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((item) => {
            const m = metrics(item);
            const restLabel = t('tacho_daily_rest', 'Odihnă');
            return (
              <div
                key={item.truckId}
                className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 min-w-0 text-[13px] font-bold text-slate-900 leading-tight">
                    <span className="truncate">🚛 {item.plateNumber}</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate text-slate-700">👤 {item.driverName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {getActivityBadge(item.currentActivity)}
                    <span className="text-[11px] font-black text-slate-800">{Math.round(item.speed || 0)} km/h</span>
                  </div>
                </div>

                {/* 2x2 micro-progress grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <MicroMetric
                    label={t('tacho_driving_today', 'Conducere Azi')}
                    value={`${formatHoursMins(m.drivingTodaySeconds)} / 9h`}
                    pct={m.drivePct}
                    barColor={m.driveColor}
                    hint={t('tacho_driving_today_hint', 'Timp de conducere continuă/zi. Limite legale: 9h (extensibil la 10h de 2x/săptămână).')}
                  />
                  <MicroMetric
                    label={t('tacho_break_required_in', 'Pauză În')}
                    value={m.breakMins > 0 ? `${m.breakMins} min` : t('act_break', 'Break')}
                    pct={m.breakPct}
                    barColor={m.breakColor}
                    hint={t('tacho_break_hint', 'Timp rămas până la pauza obligatorie de 45 min. Sub 15 min devine critic.')}
                  />
                  <MicroMetric
                    label={t('tacho_weekly_driving', 'Conducere Săpt.')}
                    value={`${formatHoursMins(m.weeklyDrivingSeconds)} / 56h`}
                    pct={m.weekPct}
                    barColor={m.weekColor}
                    hint={t('tacho_weekly_hint', 'Timp total de conducere în săptămâna curentă. Limita legală: 56h.')}
                  />
                  <MicroMetric
                    label={restLabel}
                    value={`${formatHoursMins(m.dailyRestSeconds)} / 11h`}
                    pct={m.restPct}
                    barColor={m.restColor}
                    hint={t('tacho_rest_hint', 'Odihnă zilnică acumulată. Minim legal: 11h (redus la 9h de 3x/săptămână).')}
                  />
                </div>

                {/* Footer */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div>{t('odometer', 'Odometru')}: <span className="font-bold text-slate-700">{fmtNumber(Math.round(item.odometer || 0))} km</span></div>
                  {item.eta && (
                    <div>ETA: <span className="font-bold text-indigo-600">{new Date(item.eta).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  )}
                </div>
              </div>
            );
          })}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full p-12 text-center text-sm text-slate-400 font-medium">
              {t('no_tacho_data', 'Nicio dată tahograf disponibilă.')}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(item) => item.truckId}
            minWidth="1000px"
            dense
            loading={loading}
            emptyState={<div className="p-12 text-center text-sm text-slate-400 font-medium">{t('no_tacho_data', 'Nicio dată tahograf disponibilă.')}</div>}
          />
        </div>
      )}
    </div>
  );
}
