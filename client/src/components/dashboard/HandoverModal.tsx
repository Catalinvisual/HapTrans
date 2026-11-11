import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpRight, CheckCircle2, ClipboardList, Clock, Copy, Download, FileText, Package, Truck, WifiOff, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { OverviewData } from './types';
import { formatTime, routeText } from './types';
import { exportHandoverPdf } from '../../lib/dashboardExport';

interface HandoverModalProps {
  data: OverviewData;
  lang: string;
  resolvedIds: Set<string>;
  onResolve: (id: string) => void;
  onReset: () => void;
  onClose: () => void;
}

function minutesLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes || 0));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

export default function HandoverModal({
  data, lang, resolvedIds, onResolve, onReset, onClose,
}: HandoverModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const alerts = useMemo(() => data.alerts.filter((alert) => !resolvedIds.has(alert.id)), [data.alerts, resolvedIds]);
  const incidents = alerts.filter((alert) => alert.type === 'incident');
  const documents = alerts.filter((alert) => alert.type === 'document');
  const driverRows = (data.driverHours || []).filter((row) => row.drivingRemainingMin <= 120 || row.breakInMin <= 30);
  const offline = data.telemetry?.stale || [];

  const copySummary = async () => {
    const lines: string[] = [
      `${t('dbd_handover_title')} · ${data.today.date}`,
      `${t('dbd_delayed')}: ${data.today.counts.delayed}`,
      `${t('dbd_kpi_unassigned')}: ${data.kpis.ordersUnassigned || 0}`,
      `${t('dbd_handover_incidents')}: ${incidents.length}`,
      `${t('dbd_handover_docs')}: ${documents.length}`,
      '',
      `${t('dbd_handover_delayed')}:`,
      ...data.today.delayed.map((trip) => `- ${trip.tripNumber || trip.id.slice(0, 8)} · ${routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang)} · +${trip.delayMinutes} min`),
      '',
      `${t('dbd_handover_unassigned')}:`,
      ...data.unassignedOrders.map((order) => `- ${order.orderNumber || order.id.slice(0, 8)} · ${order.clientName || '—'} · ${routeText(order.originCity, order.originCountry, order.destCity, order.destCountry, lang)}`),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      toast.success(t('dbd_handover_copied'));
    } catch {
      toast.error(t('dbd_export_error'));
    }
  };

  const Section = ({
    title, count, icon: Icon, children, tone = 'default',
  }: {
    title: string;
    count: number;
    icon: any;
    children: React.ReactNode;
    tone?: 'default' | 'danger';
  }) => (
    <section className="rounded-2xl border border-border/70 bg-surface/30 p-3">
      <header className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-text-secondary">
          <Icon className={`h-3.5 w-3.5 ${tone === 'danger' ? 'text-error' : 'text-primary'}`} /> {title}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${count > 0 ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
          {count}
        </span>
      </header>
      {count === 0 ? (
        <p className="rounded-lg bg-card px-2 py-1.5 text-[10px] font-semibold text-text-light">{t('dbd_handover_empty')}</p>
      ) : children}
    </section>
  );

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 md:p-6">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-black text-text">{t('dbd_handover_title')}</h2>
              <p className="text-[11px] font-semibold text-text-secondary">{data.today.date} · {t('dbd_handover_sub')}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={copySummary} className="btn-secondary !px-2.5 !py-2 text-[10px]" title={t('dbd_handover_copy')}>
              <Copy className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t('dbd_handover_copy')}</span>
            </button>
            <button type="button" onClick={() => exportHandoverPdf(data, t, lang, resolvedIds)} className="btn-primary !px-2.5 !py-2 text-[10px]">
              <Download className="h-3.5 w-3.5" /> {t('dbd_handover_print')}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary !p-2" title={t('dbd_close', 'Close')}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5">
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { label: t('dbd_handover_delayed'), value: data.today.counts.delayed, color: '#EF4444' },
              { label: t('dbd_handover_unassigned'), value: data.kpis.ordersUnassigned || 0, color: '#F59E0B' },
              { label: t('dbd_handover_incidents'), value: incidents.length, color: '#DC2626' },
              { label: t('dbd_handover_docs'), value: documents.length, color: '#0EA5E9' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/70 bg-surface/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-wide text-text-secondary">{item.label}</p>
                <p className="mt-1 text-2xl font-black leading-none tabular-nums" style={{ color: item.color }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Section title={t('dbd_handover_delayed')} count={data.today.delayed.length} icon={Clock} tone="danger">
              <div className="space-y-1.5">
                {data.today.delayed.map((trip) => (
                  <button key={trip.id} type="button" onClick={() => { onClose(); navigate(`/trips?tripId=${trip.id}`); }} className="flex w-full items-center gap-2 rounded-lg bg-card px-2.5 py-2 text-left hover:bg-primary/5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-text">{trip.tripNumber || trip.id.slice(0, 8)}</span>
                      <span className="block truncate text-[9px] text-text-secondary">{routeText(trip.originCity, trip.originCountry, trip.destCity, trip.destCountry, lang)}</span>
                    </span>
                    <span className="shrink-0 rounded-md bg-error/10 px-2 py-0.5 text-[9px] font-black text-error">+{trip.delayMinutes} min</span>
                  </button>
                ))}
              </div>
            </Section>

            <Section title={t('dbd_handover_unassigned')} count={data.unassignedOrders.length} icon={Package}>
              <div className="space-y-1.5">
                {data.unassignedOrders.map((order) => (
                  <button key={order.id} type="button" onClick={() => { onClose(); navigate(`/orders?orderId=${order.id}`); }} className="flex w-full items-center gap-2 rounded-lg bg-card px-2.5 py-2 text-left hover:bg-primary/5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-text">{order.orderNumber || order.id.slice(0, 8)}</span>
                      <span className="block truncate text-[9px] text-text-secondary">{order.clientName || '—'} · {routeText(order.originCity, order.originCountry, order.destCity, order.destCountry, lang)}</span>
                    </span>
                    <ArrowUpRight className="h-3 w-3 shrink-0 text-text-light" />
                  </button>
                ))}
              </div>
            </Section>

            <Section title={t('dbd_handover_incidents')} count={incidents.length} icon={AlertTriangle} tone="danger">
              <div className="space-y-1.5">
                {incidents.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2">
                    <button type="button" onClick={() => { onClose(); navigate(alert.link); }} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[11px] font-black text-text">{alert.title}</span>
                      <span className="block truncate text-[9px] text-text-secondary">{alert.subtitle || '—'}</span>
                    </button>
                    <button type="button" onClick={() => onResolve(alert.id)} className="shrink-0 rounded-md bg-success/10 px-2 py-1 text-[9px] font-black text-success hover:bg-success/20">
                      {t('dbd_resolve')}
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t('dbd_handover_docs')} count={documents.length} icon={FileText}>
              <div className="space-y-1.5">
                {documents.map((alert) => (
                  <div key={alert.id} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2">
                    <button type="button" onClick={() => { onClose(); navigate(alert.link); }} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-[11px] font-black text-text">{alert.title}</span>
                      <span className="block text-[9px] text-text-secondary">{alert.value != null ? `${alert.value} ${t('dbd_days')}` : '—'}</span>
                    </button>
                    <button type="button" onClick={() => onResolve(alert.id)} className="shrink-0 rounded-md bg-success/10 px-2 py-1 text-[9px] font-black text-success hover:bg-success/20">
                      {t('dbd_resolve')}
                    </button>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t('dbd_handover_drivers')} count={driverRows.length} icon={Truck} tone="danger">
              <div className="space-y-1.5">
                {driverRows.map((row) => (
                  <div key={`${row.driverId}-${row.truckPlate}`} className="flex items-center gap-2 rounded-lg bg-card px-2.5 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] font-black text-text">{row.driverName}</span>
                      <span className="block text-[9px] text-text-secondary">{row.truckPlate} · {t('dbd_break_in')} {minutesLabel(row.breakInMin)}</span>
                    </span>
                    <span className="shrink-0 rounded-md bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-600">{minutesLabel(row.drivingRemainingMin)}</span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title={t('dbd_handover_offline')} count={offline.length} icon={WifiOff}>
              <div className="space-y-1.5">
                {offline.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-2 rounded-lg bg-card px-2.5 py-2">
                    <span className="text-[11px] font-black text-text">{row.plate}</span>
                    <span className="text-[9px] font-semibold text-text-secondary">{row.lastSeenAt ? formatTime(row.lastSeenAt, lang) : '—'}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          {resolvedIds.size > 0 && (
            <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-success/20 bg-success/5 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t('dbd_handover_ack')}: {resolvedIds.size}
              </span>
              <button type="button" onClick={onReset} className="text-[9px] font-black uppercase tracking-wide text-text-secondary underline underline-offset-2 hover:text-error">
                {t('dbd_handover_reset')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
