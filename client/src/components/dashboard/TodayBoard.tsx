import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, Clock, MapPin, Navigation, Package, Truck,
} from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';
import { statusAccent } from '../../lib/statusColors';
import type { OverviewData, OverviewTrip } from './types';
import { formatDayShort, formatTime, humanizeStatus, routeText } from './types';

type BoardTab = 'active' | 'departures' | 'arrivals' | 'delayed';

interface TodayBoardProps {
  today: OverviewData['today'];
  lang: string;
}

export function TripRow({ trip, kind, lang }: { trip: OverviewTrip; kind: BoardTab | 'upcoming'; lang: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const label = t(`status_${trip.status}`, humanizeStatus(trip.status));
  const time = kind === 'departures' || kind === 'upcoming'
    ? formatTime(trip.plannedDeparture, lang)
    : kind === 'arrivals'
      ? formatTime(trip.plannedArrival, lang)
      : formatTime(trip.plannedArrival || trip.plannedDeparture, lang);
  const late = trip.delayMinutes > 0 && trip.status !== 'completed' && trip.status !== 'closed';
  const accent = statusAccent(trip.status);

  return (
    <div
      role="button"
      tabIndex={0}
      title={t('dbd_open_trip')}
      onClick={() => navigate(`/trips?tripId=${trip.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') navigate(`/trips?tripId=${trip.id}`);
      }}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/70 bg-surface/40 p-3 transition-all duration-200 hover:border-primary/35 hover:bg-card hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
    >
      <div className="absolute inset-y-2 left-0 w-[3px] rounded-full" style={{ background: accent }} />
      <div className="flex items-start gap-3 pl-1.5">
        <div className="flex w-12 shrink-0 flex-col items-center pt-0.5">
          <span className="text-sm font-black leading-none text-text tabular-nums">{time}</span>
          <span className="mt-1 text-[9px] font-bold uppercase tracking-wider text-text-secondary">
            {kind === 'arrivals' ? t('dbd_eta') : kind === 'active' ? t('dbd_eta') : t('dbd_departures').slice(0, 3)}
          </span>
          {trip.plannedDeparture && (
            <span className="mt-1 text-[9px] text-text-light">{formatDayShort(trip.plannedDeparture, lang)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[13px] font-bold text-text">
              {routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang)}
            </p>
            <StatusBadge status={trip.status} label={label} />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-secondary">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Truck className="h-3 w-3" /> {trip.truckPlate || t('dbd_no_truck')}
            </span>
            <span className="truncate">{trip.driverName || t('dbd_no_driver')}</span>
            <span className="inline-flex items-center gap-1">
              <Package className="h-3 w-3" /> {t('dbd_orders_short', { count: trip.orderCount })}
            </span>
          </div>
        </div>
        {late && (
          <span className="mt-1 shrink-0 rounded-full border border-error/25 bg-error/10 px-2 py-0.5 text-[10px] font-black text-error">
            {t('dbd_late_min', { min: trip.delayMinutes })}
          </span>
        )}
        <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-text-light opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
}

export default function TodayBoard({ today, lang }: TodayBoardProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<BoardTab>('active');

  const tabs: Array<{ id: BoardTab; label: string; count: number; icon: any; color: string }> = [
    { id: 'active', label: t('dbd_active_now'), count: today.counts.active, icon: Navigation, color: '#0EA5E9' },
    { id: 'departures', label: t('dbd_departures'), count: today.counts.departures, icon: ArrowUpRight, color: '#FF5A00' },
    { id: 'arrivals', label: t('dbd_arrivals'), count: today.counts.arrivals, icon: ArrowDownLeft, color: '#10B981' },
    { id: 'delayed', label: t('dbd_delayed'), count: today.counts.delayed, icon: AlertTriangle, color: '#EF4444' },
  ];
  const trips = today[tab] || [];
  const emptyMessage =
    tab === 'departures' ? t('dbd_no_departures')
      : tab === 'arrivals' ? t('dbd_no_arrivals')
        : tab === 'delayed' ? t('dbd_no_delayed')
          : t('dbd_no_active');

  return (
    <section className="relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-border/60 p-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.08em] text-text">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              {t('dbd_board_title')}
            </h2>
            <p className="mt-1 pl-9 text-xs font-medium text-text-secondary">{t('dbd_board_sub')}</p>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border/70 bg-surface px-2.5 py-1 text-[10px] font-bold text-text-secondary sm:inline-flex">
            <Clock className="h-3 w-3" />
            {formatDayShort(today.date, lang)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((item) => {
            const selected = tab === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-all ${
                  selected
                    ? 'border-transparent bg-text text-card shadow-sm'
                    : 'border-border/70 bg-surface/60 text-text-secondary hover:border-primary/30 hover:text-text'
                }`}
              >
                <Icon className="h-3.5 w-3.5" style={{ color: selected ? 'inherit' : item.color }} />
                {item.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[9px] font-black leading-none ${
                    selected ? 'bg-white/20 text-inherit' : 'bg-card text-text-secondary'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 pt-3" style={{ maxHeight: 430 }}>
        {trips.length === 0 ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 bg-surface/30 p-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
              <MapPin className="h-5 w-5 text-text-light" />
            </span>
            <p className="max-w-[240px] text-xs font-semibold text-text-secondary">{emptyMessage}</p>
          </div>
        ) : (
          trips.map((trip) => <TripRow key={trip.id} trip={trip} kind={tab} lang={lang} />)
        )}
      </div>
    </section>
  );
}
