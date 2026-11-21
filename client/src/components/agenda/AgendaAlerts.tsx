import { useTranslation } from 'react-i18next';
import {
  AlarmClock,
  CalendarDays,
  Check,
  Clock3,
  Loader2,
  Users,
  X,
} from 'lucide-react';
import { AGENDA_COLOR_HEX } from './types';
import { formatEventWhen } from './agendaUtils';
import type { AgendaAlert } from './useAgendaAlerts';

interface AgendaAlertsProps {
  alert: AgendaAlert;
  index: number;
  total: number;
  locale: string;
  now: number;
  panelOpen: boolean;
  responding: boolean;
  onSnooze: (minutes: number) => void;
  onIgnore: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onClose: () => void;
}

function timeUntil(startAt: string, now: number, locale: string) {
  const diff = new Date(startAt).getTime() - now;
  if (!Number.isFinite(diff)) return '';
  if (diff <= 0) return '';
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(diff) < 60 * 60 * 1000) return formatter.format(minutes, 'minute');
  if (Math.abs(diff) < 24 * 60 * 60 * 1000) {
    return formatter.format(Math.round(diff / 3_600_000), 'hour');
  }
  return formatter.format(Math.round(diff / 86_400_000), 'day');
}

/**
 * A persistent agenda alert in the top-right corner. It deliberately has no
 * auto-dismiss timer: reminders and invitations stay until the user acts.
 */
export default function AgendaAlerts({
  alert,
  index,
  total,
  locale,
  now,
  panelOpen,
  responding,
  onSnooze,
  onIgnore,
  onAccept,
  onDecline,
  onClose,
}: AgendaAlertsProps) {
  const { t } = useTranslation();
  const event = alert.event;
  const isReminder = alert.kind === 'reminder';
  const accent = AGENDA_COLOR_HEX[event.color] || AGENDA_COLOR_HEX.orange;
  const relative = isReminder && !event.allDay ? timeUntil(event.startAt, now, locale) : '';
  const started =
    isReminder && !event.allDay && new Date(event.startAt).getTime() <= now;

  return (
    <div
      className={`fixed z-[1500] w-[360px] max-w-[calc(100vw-1.5rem)] transition-all duration-200 ${
        panelOpen
          ? 'right-3 top-[140px] lg:right-[500px] lg:top-[84px]'
          : 'right-3 top-[76px] sm:right-5'
      }`}
    >
      <div
        role="alert"
        aria-live="assertive"
        className="overflow-hidden rounded-2xl border border-primary/25 bg-card shadow-[0_26px_70px_-24px_rgba(255,90,0,0.55)] ring-1 ring-black/5 animate-slide-in dark:ring-white/10"
      >
        <div className="h-1 w-full bg-gradient-to-r from-primary via-orange-400 to-primary/25" />

        <div className="p-3.5">
          <div className="flex items-start gap-3">
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
              {isReminder ? <AlarmClock className="h-5 w-5" /> : <Users className="h-5 w-5" />}
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card" />
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-primary">
                  {isReminder
                    ? t('agenda_reminder_toast')
                    : t('agenda_alert_invite_title')}
                </p>
                {total > 1 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-bold leading-none text-primary">
                    {index + 1} / {total}
                  </span>
                )}
              </div>

              <div className="mt-0.5 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: accent }}
                />
                <p className="truncate text-[13px] font-bold leading-tight text-text">
                  {event.title}
                </p>
              </div>

              <p className="mt-1 flex items-center gap-1 text-[10px] text-text-secondary">
                <CalendarDays className="h-3 w-3 shrink-0 text-primary/70" />
                <span className="truncate">{formatEventWhen(event, locale)}</span>
                {relative && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {relative}
                  </span>
                )}
                {started && (
                  <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                    {t('agenda_alert_started')}
                  </span>
                )}
              </p>

              {isReminder ? (
                event.location && (
                  <p className="mt-0.5 truncate text-[10px] text-text-secondary/80">
                    {event.location}
                  </p>
                )
              ) : (
                <p className="mt-0.5 truncate text-[10px] font-medium text-primary/85">
                  {t('agenda_shared_by', { name: event.ownerName })}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
              title={t('agenda_close')}
              aria-label={t('agenda_close')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-primary/10 pt-2.5">
            {isReminder ? (
              <>
                <button
                  type="button"
                  onClick={() => onSnooze(5)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-primary/25 transition-colors hover:bg-primary-dark"
                >
                  <Clock3 className="h-3 w-3" />
                  {t('agenda_snooze_5')}
                </button>
                <button
                  type="button"
                  onClick={() => onSnooze(15)}
                  className="rounded-lg border border-primary/25 bg-primary/5 px-2.5 py-1.5 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10"
                >
                  {t('agenda_snooze_15')}
                </button>
                <button
                  type="button"
                  onClick={onIgnore}
                  className="ml-auto rounded-lg px-2 py-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:bg-surface hover:text-text"
                >
                  {t('agenda_ignore')}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onAccept}
                  disabled={responding}
                  className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[10px] font-bold text-white shadow-sm shadow-primary/25 transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {responding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="h-3 w-3" />
                  )}
                  {t('agenda_accept')}
                </button>
                <button
                  type="button"
                  onClick={onDecline}
                  disabled={responding}
                  className="flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[10px] font-bold text-text-secondary transition-colors hover:border-error/30 hover:text-error disabled:opacity-60"
                >
                  <X className="h-3 w-3" />
                  {t('agenda_decline')}
                </button>
                {total > 1 && (
                  <span className="ml-auto text-[9px] font-medium text-text-secondary">
                    {index + 1} / {total}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
