import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, Expand, LogOut, MapPin, Package, RefreshCw, ShieldCheck, Truck,
} from 'lucide-react';
import { fmtNumber } from '../../lib/format';
import type { OverviewData, OverviewTrip } from './types';
import { formatLongDate, formatShortDate, formatTime, humanizeStatus, routeText } from './types';

type KioskTab = 'departures' | 'arrivals' | 'delayed' | 'incidents';

const ROTATION_MS = 12000;
const REFRESH_MS = 30000;

export default function KioskMode({
  data, lang, onClose, onRefresh,
}: {
  data: OverviewData;
  lang: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<KioskTab>('departures');
  const [clock, setClock] = useState(new Date());

  const incidents = useMemo(() => data.alerts.filter((alert) => alert.type === 'incident'), [data.alerts]);

  useEffect(() => {
    const clockTimer = setInterval(() => setClock(new Date()), 1000);
    const rotateTimer = setInterval(() => {
      setTab((current) => {
        const order: KioskTab[] = ['departures', 'arrivals', 'delayed', 'incidents'];
        return order[(order.indexOf(current) + 1) % order.length];
      });
    }, ROTATION_MS);
    const refreshTimer = setInterval(onRefresh, REFRESH_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearInterval(clockTimer);
      clearInterval(rotateTimer);
      clearInterval(refreshTimer);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, onRefresh]);

  const trips: OverviewTrip[] = tab === 'departures'
    ? data.today.departures
    : tab === 'arrivals'
      ? data.today.arrivals
      : tab === 'delayed'
        ? data.today.delayed
        : [];

  const tabs: Array<{ id: KioskTab; label: string; count: number }> = [
    { id: 'departures', label: t('dbd_departures'), count: data.today.counts.departures },
    { id: 'arrivals', label: t('dbd_arrivals'), count: data.today.counts.arrivals },
    { id: 'delayed', label: t('dbd_delayed'), count: data.today.counts.delayed },
    { id: 'incidents', label: t('dbd_kiosk_incidents'), count: incidents.length },
  ];

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col overflow-hidden bg-[#0B1220] text-white">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-52 -left-32 h-[480px] w-[480px] rounded-full bg-sky-500/10 blur-3xl" />

      <header className="relative flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:px-10">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black shadow-lg shadow-primary/30">HC</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-white/50">{t('dbd_kiosk')}</p>
            <h1 className="text-xl font-black tracking-tight lg:text-2xl">{t('dbd_board_title')}</h1>
          </div>
        </div>
        <div className="text-center">
          <p className="font-black leading-none tabular-nums text-3xl lg:text-5xl">
            {clock.toLocaleTimeString(lang === 'en' ? 'en-GB' : lang, { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">
            {formatLongDate(data.today.date, lang)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRefresh} title={t('dbd_refresh')} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button type="button" onClick={enterFullscreen} title={t('dbd_kiosk_fullscreen')} className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/80 hover:bg-white/10">
            <Expand className="h-4 w-4" />
          </button>
          <button type="button" onClick={onClose} title={t('dbd_kiosk_exit')} className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-xs font-black uppercase tracking-wide text-white/80 hover:bg-white/10">
            <LogOut className="h-4 w-4" /> {t('dbd_kiosk_exit')}
          </button>
        </div>
      </header>

      <div className="relative grid grid-cols-2 gap-3 px-6 pt-5 lg:grid-cols-4 lg:px-10">
        {[
          { label: t('dbd_departures'), value: data.today.counts.departures, icon: ArrowUpRight, color: '#FF5A00' },
          { label: t('dbd_arrivals'), value: data.today.counts.arrivals, icon: ArrowDownLeft, color: '#10B981' },
          { label: t('dbd_active_now'), value: data.today.counts.active, icon: Truck, color: '#38BDF8' },
          { label: t('dbd_delayed'), value: data.today.counts.delayed, icon: AlertTriangle, color: '#EF4444' },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${item.color}22`, color: item.color }}>
              <item.icon className="h-6 w-6" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">{item.label}</p>
              <p className="text-4xl font-black leading-none tabular-nums">{fmtNumber(item.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative flex min-h-0 flex-1 gap-5 px-6 py-5 lg:px-10">
        <section className="flex min-w-0 flex-[1.65] flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03]">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
            {tabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                    active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  }`}
                >
                  {item.label}
                  <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? 'bg-white/20' : 'bg-white/10'}`}>{item.count}</span>
                </button>
              );
            })}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {tab === 'incidents' ? (
              incidents.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-white/40">
                  <ShieldCheck className="h-16 w-16 text-emerald-400/70" />
                  <p className="text-sm font-bold">{t('dbd_kiosk_no_incidents')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incidents.map((alert) => (
                    <div key={alert.id} className="flex items-center gap-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 py-4">
                      <AlertTriangle className="h-6 w-6 shrink-0 text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-black">{alert.title}</p>
                        <p className="truncate text-xs font-semibold text-white/55">{alert.subtitle || '—'}</p>
                      </div>
                      {alert.value != null && (
                        <span className="rounded-lg bg-red-500/20 px-2.5 py-1 text-sm font-black text-red-300">{alert.value} min</span>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : trips.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm font-bold text-white/35">
                {t('dbd_no_data_msg')}
              </div>
            ) : (
              <div className="space-y-2">
                {trips.map((trip) => {
                  const time = tab === 'arrivals' ? trip.plannedArrival : trip.plannedDeparture;
                  return (
                    <div key={trip.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5">
                      <div className="w-16 shrink-0">
                        <p className="text-2xl font-black leading-none tabular-nums">{formatTime(time, lang)}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">{t('dbd_eta')}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-black">{routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-white/50">
                          <span className="inline-flex items-center gap-1"><Truck className="h-3 w-3" /> {trip.truckPlate || '—'}</span>
                          <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {trip.orderCount}</span>
                          <span className="truncate">{trip.driverName || '—'}</span>
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-black uppercase tracking-wide text-white/60">{t(`status_${trip.status}`, humanizeStatus(trip.status))}</p>
                        {trip.delayMinutes > 0 && (
                          <p className="mt-1 text-sm font-black text-red-400">+{trip.delayMinutes} {t('dbd_min')}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <aside className="hidden w-[330px] shrink-0 flex-col gap-4 lg:flex">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              <MapPin className="h-3.5 w-3.5 text-primary" /> {t('dbd_kiosk_next')}
            </p>
            <div className="mt-3 space-y-3">
              {data.upcoming.trips.slice(0, 4).map((trip) => (
                <div key={trip.id} className="border-l-2 border-primary/60 pl-3">
                  <p className="text-sm font-black">{formatTime(trip.plannedDeparture, lang)} · {trip.tripNumber || trip.id.slice(0, 6).toUpperCase()}</p>
                  <p className="truncate text-[11px] font-semibold text-white/50">{routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang)}</p>
                  <p className="text-[10px] text-white/35">{formatShortDate(trip.plannedDeparture || data.today.date, lang)} · {trip.truckPlate || t('dbd_no_truck')}</p>
                </div>
              ))}
              {data.upcoming.trips.length === 0 && <p className="text-xs text-white/35">{t('dbd_no_upcoming')}</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              <Clock className="h-3.5 w-3.5 text-emerald-400" /> {t('dbd_updated', { time: formatTime(data.meta.generatedAt, lang) })}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: t('dbd_kpi_fleet'), value: `${data.kpis.fleetAvailable || 0}/${data.kpis.fleetTotal || 0}` },
                { label: t('dbd_kpi_ontime'), value: `${Math.round(data.kpis.onTimeRate || 0)}%` },
                { label: t('dbd_kpi_unassigned'), value: fmtNumber(data.kpis.ordersUnassigned || 0) },
                { label: t('dbd_kpi_incidents'), value: fmtNumber(data.kpis.openIncidents || 0) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white/[0.04] p-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/35">{item.label}</p>
                  <p className="mt-1 text-xl font-black tabular-nums">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-[9px] font-bold uppercase tracking-widest text-white/30">
            <span>{t('dbd_kiosk_rotate')}</span>
            <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> LIVE</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
