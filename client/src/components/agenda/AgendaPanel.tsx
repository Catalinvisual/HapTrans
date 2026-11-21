import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  StickyNote,
  Sun,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  AGENDA_COLOR_HEX,
  AGENDA_REMINDER_KEYS,
  type AgendaEvent,
  type AgendaKind,
  type AgendaView,
} from './types';
import {
  LOCALES,
  dayKey,
  eventsOn,
  formatEventRange,
  formatEventWhen,
  formatLongDate,
  formatMonth,
  formatTime,
  startOfDay,
  weekStart,
} from './agendaUtils';

interface AgendaPanelProps {
  events: AgendaEvent[];
  invites: AgendaEvent[];
  loading: boolean;
  error: boolean;
  view: AgendaView;
  onViewChange: (view: AgendaView) => void;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  currentUserId?: string;
  onClose: () => void;
  onCreate: (kind: AgendaKind) => void;
  onOpenEvent: (event: AgendaEvent) => void;
  detail: AgendaEvent | null;
  onCloseDetail: () => void;
  onEdit: (event: AgendaEvent) => void;
  onDelete: (event: AgendaEvent) => void;
  onRespond: (event: AgendaEvent, status: 'accepted' | 'declined') => void;
  notificationsEnabled: boolean;
  onToggleNotifications: () => void;
  onRetry: () => void;
}

const PARTICIPANT_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  accepted: 'bg-success/10 text-success',
  declined: 'bg-error/10 text-error',
};

const iconButtonClass =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-primary/40 hover:bg-surface hover:text-primary';

function EmptyState({
  icon: Icon,
  text,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-text-secondary">
        <Icon className="h-4 w-4" />
      </span>
      <p className="text-[11px] text-text-secondary">{text}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-1 flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20"
        >
          <Plus className="h-3 w-3" />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function EventRow({
  event,
  locale,
  onClick,
  compact,
}: {
  event: AgendaEvent;
  locale: string;
  onClick: () => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const hex = AGENDA_COLOR_HEX[event.color] || AGENDA_COLOR_HEX.orange;
  const accepted = event.participants.filter(
    (participant) => participant.status === 'accepted',
  ).length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-stretch gap-2 rounded-xl border border-border bg-card p-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        compact ? '' : 'shadow-sm'
      }`}
    >
      <span
        className="w-1 shrink-0 rounded-full"
        style={{ backgroundColor: hex }}
        aria-hidden="true"
      />
      <span className="flex w-10 shrink-0 items-start pt-0.5 text-[10px] font-bold tabular-nums text-text-secondary">
        {event.kind === 'note' ? (
          <StickyNote className="h-3.5 w-3.5" />
        ) : event.allDay ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          formatTime(event.startAt, locale)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-text">{event.title}</span>
        <span className="mt-0.5 flex items-center gap-1.5 overflow-hidden text-[10px] text-text-secondary">
          {event.location && (
            <span className="flex min-w-0 items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </span>
          )}
          {event.participants.length > 0 && (
            <span className="flex shrink-0 items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {accepted}/{event.participants.length}
            </span>
          )}
          {event.myStatus === 'pending' && (
            <span className="shrink-0 font-bold text-amber-600">{t('agenda_pending')}</span>
          )}
          {event.status === 'cancelled' && (
            <span className="shrink-0 font-bold text-error">{t('agenda_status_cancelled')}</span>
          )}
        </span>
      </span>
    </button>
  );
}

export default function AgendaPanel({
  events,
  invites,
  loading,
  error,
  view,
  onViewChange,
  selectedDate,
  onSelectDate,
  currentUserId,
  onClose,
  onCreate,
  onOpenEvent,
  detail,
  onCloseDetail,
  onEdit,
  onDelete,
  onRespond,
  notificationsEnabled,
  onToggleNotifications,
  onRetry,
}: AgendaPanelProps) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'ro').slice(0, 2);
  const locale = LOCALES[lang] || 'en-GB';
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [detail?.id]);

  const reminderLabel = (minutes: number) =>
    t(AGENDA_REMINDER_KEYS[minutes] || 'agenda_reminder_none');

  const today = startOfDay(new Date());
  const todayEvents = eventsOn(events, today).filter(
    (event) => event.kind === 'event' && event.status !== 'cancelled',
  );
  const pendingInvites = [...invites].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  const selectedEvents = eventsOn(events, selectedDate);

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const offset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });

  const weekDayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(new Date(2024, 0, 1 + index))
      .replace('.', '')
      .slice(0, 2),
  );

  const weekDays = (() => {
    const start = weekStart(selectedDate);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  })();

  const notes = events
    .filter((event) => event.kind === 'note')
    .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

  const goMonth = (delta: number) => {
    onSelectDate(new Date(year, month + delta, 1));
  };

  const detailHex = detail
    ? AGENDA_COLOR_HEX[detail.color] || AGENDA_COLOR_HEX.orange
    : AGENDA_COLOR_HEX.orange;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <CalendarDays className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight text-text">
            {t('agenda_title')}
          </p>
          <p className="truncate text-[10px] text-text-secondary">
            {todayEvents.length === 1
              ? t('agenda_subtitle_one')
              : t('agenda_subtitle', { count: todayEvents.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleNotifications}
          title={
            notificationsEnabled ? t('agenda_bell_disable') : t('agenda_bell_enable')
          }
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            notificationsEnabled
              ? 'border-primary/30 bg-primary/10 text-primary'
              : 'border-border text-text-secondary hover:bg-surface hover:text-primary'
          }`}
        >
          {notificationsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => onCreate(view === 'notes' ? 'note' : 'event')}
          title={view === 'notes' ? t('agenda_new_note') : t('agenda_new_event')}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-primary-dark"
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title={t('agenda_close')}
          className={iconButtonClass}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className={iconButtonClass}
            title="‹"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSelectDate(new Date())}
            className="rounded-lg border border-border px-2 py-1 text-[10px] font-bold text-text-secondary transition-colors hover:border-primary/40 hover:text-primary"
          >
            {t('agenda_today')}
          </button>
          <p className="min-w-0 flex-1 truncate text-center text-xs font-bold capitalize text-text">
            {formatMonth(selectedDate, locale)}
          </p>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className={iconButtonClass}
            title="›"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
          {(
            [
              ['month', t('agenda_month')],
              ['week', t('agenda_week')],
              ['notes', t('agenda_notes')],
            ] as Array<[AgendaView, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={`rounded-lg px-1 py-1.5 text-[10px] font-bold transition-colors ${
                view === id
                  ? 'bg-card text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="border-b border-border bg-primary/5 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-primary">
            <Users className="h-3.5 w-3.5" />
            {pendingInvites.length === 1
              ? t('agenda_invites_pending_one')
              : t('agenda_invites_pending', { count: pendingInvites.length })}
          </div>
          <div className="max-h-36 space-y-1.5 overflow-y-auto">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-2 rounded-xl border border-primary/20 bg-card p-2"
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor: AGENDA_COLOR_HEX[invite.color] || AGENDA_COLOR_HEX.orange,
                  }}
                />
                <button
                  type="button"
                  onClick={() => onOpenEvent(invite)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-xs font-semibold text-text">{invite.title}</p>
                  <p className="truncate text-[10px] text-text-secondary">
                    {formatEventWhen(invite, locale)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(invite, 'accepted')}
                  title={t('agenda_accept')}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success transition-colors hover:bg-success/20"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(invite, 'declined')}
                  title={t('agenda_decline')}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-error/10 text-error transition-colors hover:bg-error/20"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && events.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-text-secondary">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-[11px]">{t('agenda_loading')}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-14 text-center">
            <p className="text-[11px] text-text-secondary">{t('agenda_error')}</p>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-primary/10 px-3 py-1.5 text-[10px] font-bold text-primary hover:bg-primary/20"
            >
              {t('agenda_retry')}
            </button>
          </div>
        ) : view === 'month' ? (
          <div className="p-3">
            <div className="grid grid-cols-7 gap-0.5">
              {weekDayLabels.map((label, index) => (
                <div
                  key={`${label}-${index}`}
                  className="pb-1 text-center text-[9px] font-black uppercase tracking-wide text-text-secondary/70"
                >
                  {label}
                </div>
              ))}
              {cells.map((date) => {
                const inMonth = date.getMonth() === month;
                const isToday = dayKey(date) === dayKey(today);
                const isSelected = dayKey(date) === dayKey(selectedDate);
                const dayEvents = eventsOn(events, date);
                return (
                  <button
                    key={dayKey(date)}
                    type="button"
                    onClick={() => onSelectDate(startOfDay(date))}
                    className={`relative flex h-9 flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-colors ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : isToday
                          ? 'bg-primary/10 text-primary'
                          : inMonth
                            ? 'text-text hover:bg-surface'
                            : 'text-text-secondary/40 hover:bg-surface/60'
                    }`}
                  >
                    <span className="leading-none">{date.getDate()}</span>
                    <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="h-1 w-1 rounded-full"
                          style={{
                            backgroundColor: isSelected
                              ? '#ffffff'
                              : AGENDA_COLOR_HEX[event.color] || AGENDA_COLOR_HEX.orange,
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span
                          className={`text-[7px] font-black ${
                            isSelected ? 'text-white' : 'text-text-secondary'
                          }`}
                        >
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-[10px] font-black uppercase tracking-wide text-text-secondary">
                  {formatLongDate(selectedDate, locale)}
                </p>
                <button
                  type="button"
                  onClick={() => onCreate('event')}
                  className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  {t('agenda_add')}
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {selectedEvents.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    text={t('agenda_no_events_day')}
                    actionLabel={t('agenda_add')}
                    onAction={() => onCreate('event')}
                  />
                ) : (
                  selectedEvents.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      locale={locale}
                      onClick={() => onOpenEvent(event)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        ) : view === 'week' ? (
          <div className="space-y-2 p-3">
            {weekDays.map((date) => {
              const dayEvents = eventsOn(events, date);
              const isToday = dayKey(date) === dayKey(today);
              return (
                <div
                  key={dayKey(date)}
                  className={`overflow-hidden rounded-xl border ${
                    isToday ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectDate(startOfDay(date))}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5"
                  >
                    <span className="truncate text-[10px] font-black uppercase tracking-wide text-text-secondary">
                      {new Intl.DateTimeFormat(locale, {
                        weekday: 'short',
                        day: '2-digit',
                        month: 'short',
                      }).format(date)}
                    </span>
                    {isToday && (
                      <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase text-white">
                        {t('agenda_today')}
                      </span>
                    )}
                  </button>
                  <div className="space-y-1 px-1.5 pb-1.5">
                    {dayEvents.length === 0 ? (
                      <p className="px-2 pb-1 text-[10px] text-text-secondary/50">—</p>
                    ) : (
                      dayEvents.map((event) => (
                        <EventRow
                          key={event.id}
                          event={event}
                          locale={locale}
                          compact
                          onClick={() => onOpenEvent(event)}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {notes.length === 0 ? (
              <EmptyState
                icon={StickyNote}
                text={t('agenda_no_notes')}
                actionLabel={t('agenda_new_note')}
                onAction={() => onCreate('note')}
              />
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => onOpenEvent(note)}
                  className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-text-secondary">
                    <StickyNote className="h-3 w-3" />
                    {formatEventWhen(note, locale)}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-text">{note.title}</p>
                  {note.description && (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-[11px] leading-relaxed text-text-secondary">
                      {note.description}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {detail && (
        <div className="absolute inset-0 z-20 flex min-h-0 flex-col bg-card">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <button
              type="button"
              onClick={onCloseDetail}
              className={iconButtonClass}
              title={t('agenda_close')}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-text">
              {detail.title}
            </p>
            {detail.canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => onEdit(detail)}
                  className={iconButtonClass}
                  title={t('agenda_edit')}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-error/40 hover:bg-error/5 hover:text-error"
                  title={t('agenda_delete')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wide"
                style={{
                  backgroundColor: `${detailHex}1A`,
                  color: detailHex,
                }}
              >
                {detail.kind === 'note' ? (
                  <StickyNote className="h-3 w-3" />
                ) : (
                  <CalendarDays className="h-3 w-3" />
                )}
                {detail.kind === 'note' ? t('agenda_kind_note') : t('agenda_kind_event')}
              </span>
              {detail.status === 'cancelled' && (
                <span className="rounded-full bg-error/10 px-2 py-0.5 text-[9px] font-bold uppercase text-error">
                  {t('agenda_status_cancelled')}
                </span>
              )}
              {detail.myStatus === 'pending' && (
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase text-amber-600">
                  {t('agenda_pending')}
                </span>
              )}
              {detail.myStatus === 'accepted' && (
                <span className="rounded-full bg-success/10 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                  {t('agenda_accepted')}
                </span>
              )}
              {detail.myStatus === 'declined' && (
                <span className="rounded-full bg-error/10 px-2 py-0.5 text-[9px] font-bold uppercase text-error">
                  {t('agenda_declined')}
                </span>
              )}
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-surface/60 p-3 text-xs text-text">
              <div className="flex items-start gap-2">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {formatEventRange(detail, locale)}
                  {detail.kind === 'event' && detail.allDay
                    ? ` · ${t('agenda_all_day')}`
                    : ''}
                </span>
              </div>
              {detail.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{detail.location}</span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Users className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  {t('agenda_owner')}: {detail.canEdit ? t('agenda_you') : detail.ownerName}
                </span>
              </div>
              {detail.kind === 'event' && detail.reminderMinutes > 0 && (
                <div className="flex items-start gap-2">
                  <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{reminderLabel(detail.reminderMinutes)}</span>
                </div>
              )}
              {detail.kind === 'note' && (
                <div className="flex items-start gap-2 text-text-secondary">
                  <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{t('agenda_personal')}</span>
                </div>
              )}
            </div>

            {detail.description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">
                  {t('agenda_description')}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                  {detail.description}
                </p>
              </div>
            )}

            {detail.participants.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-text-secondary">
                  {t('agenda_participants')}
                </p>
                <div className="mt-2 space-y-1.5">
                  {detail.participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        {participant.name?.[0]?.toUpperCase() || '?'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-text">
                          {participant.name}
                          {participant.userId === currentUserId
                            ? ` · ${t('agenda_you')}`
                            : ''}
                        </p>
                        <p className="truncate text-[10px] text-text-secondary">
                          {participant.email}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                          PARTICIPANT_STATUS_CLASS[participant.status] || ''
                        }`}
                      >
                        {t(`agenda_${participant.status}`)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!detail.canEdit && detail.myStatus !== 'none' && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onRespond(detail, 'accepted')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-dark"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t('agenda_accept')}
                </button>
                <button
                  type="button"
                  onClick={() => onRespond(detail, 'declined')}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold text-text transition-colors hover:bg-surface/70"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('agenda_decline')}
                </button>
              </div>
            )}

            {confirmDelete && (
              <div className="rounded-xl border border-error/30 bg-error/5 p-3">
                <p className="text-xs font-semibold text-error">
                  {t('agenda_delete_confirm')}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(detail)}
                    className="rounded-lg bg-error px-3 py-1.5 text-[10px] font-bold text-white hover:bg-error/90"
                  >
                    {t('agenda_delete_confirm_yes')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-border bg-card px-3 py-1.5 text-[10px] font-bold text-text hover:bg-surface"
                  >
                    {t('agenda_cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
