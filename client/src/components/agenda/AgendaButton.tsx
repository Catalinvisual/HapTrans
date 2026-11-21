import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarDays } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import AgendaEventForm from './AgendaEventForm';
import AgendaPanel from './AgendaPanel';
import { useAgenda } from './useAgenda';
import type { AgendaEvent, AgendaKind, AgendaView } from './types';
import { LOCALES, dayKey, eventsOn, formatTime, startOfDay } from './agendaUtils';

const DAY = 24 * 60 * 60 * 1000;

export default function AgendaButton() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const lang = (i18n.language || 'ro').slice(0, 2);
  const locale = LOCALES[lang] || 'en-GB';

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<AgendaView>('month');
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [detail, setDetail] = useState<AgendaEvent | null>(null);
  const [form, setForm] = useState<{
    event: AgendaEvent | null;
    date: Date;
    kind: AgendaKind;
  } | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('agendaNotifications') === 'true';
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const today = startOfDay(new Date());

  // Closed: a rolling window good enough for the badge and reminders.
  // Open: the visible month plus one week of margin for the grid.
  const range = open
    ? {
        from: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          1 - 7,
        ).toISOString(),
        to: new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth() + 1,
          15,
        ).toISOString(),
      }
    : {
        from: new Date(today.getTime() - DAY).toISOString(),
        to: new Date(today.getTime() + 30 * DAY).toISOString(),
      };

  const { events, people, invites, loading, error, reload } = useAgenda(
    range.from,
    range.to,
  );

  const todayEvents = eventsOn(events, today).filter(
    (event) => event.kind === 'event' && event.status !== 'cancelled',
  );
  const pendingInvites = invites.filter(
    (event) => new Date(event.startAt).getTime() >= today.getTime(),
  );
  const badgeCount = new Set(
    [...todayEvents, ...pendingInvites].map((event) => event.id),
  ).size;

  useEffect(() => {
    if (!events.length) return;
    const now = Date.now();

    for (const event of events) {
      if (
        event.kind !== 'event' ||
        event.status === 'cancelled' ||
        !event.reminderMinutes
      ) {
        continue;
      }
      const start = new Date(event.startAt).getTime();
      if (Number.isNaN(start)) continue;
      const dueAt = start - event.reminderMinutes * 60000;
      // Fire only inside the reminder window, with a one-minute grace period.
      if (now < dueAt || now > start + 60000) continue;

      const storageKey = `agenda_notified_${user?.id || 'me'}_${event.id}_${event.startAt}`;
      try {
        if (localStorage.getItem(storageKey)) continue;
        localStorage.setItem(storageKey, '1');
      } catch {
        // Storage can be unavailable; showing the toast once per poll is fine.
      }

      const body = t('agenda_reminder_body', {
        title: event.title,
        time: formatTime(event.startAt, locale),
      });
      toast(`${t('agenda_reminder_toast')}: ${body}`, { icon: '⏰', duration: 8000 });

      if (
        notificationsEnabled &&
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted'
      ) {
        try {
          new Notification(t('agenda_reminder_toast'), {
            body,
            tag: `agenda-${event.id}`,
          });
        } catch {
          // The browser can refuse while the page is not focused; the toast stays.
        }
      }
    }
  }, [events, notificationsEnabled, locale, t, user?.id]);

  useEffect(() => {
    setDetail((current) =>
      current
        ? events.find((event) => event.id === current.id) ||
          invites.find((event) => event.id === current.id) ||
          null
        : current,
    );
  }, [events, invites]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (pointerEvent: PointerEvent) => {
      // The editor is a sibling modal; its own backdrop handles closing it.
      if (form) return;
      const target = pointerEvent.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
      setDetail(null);
      setForm(null);
    };
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key !== 'Escape' || form) return;
      if (detail) {
        setDetail(null);
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, detail, form]);

  const closePanel = () => {
    setOpen(false);
    setDetail(null);
    setForm(null);
  };

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if (!('Notification' in window)) {
        toast.error(t('agenda_bell_denied'));
        return;
      }
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        toast.error(t('agenda_bell_denied'));
        return;
      }
      setNotificationsEnabled(true);
      localStorage.setItem('agendaNotifications', 'true');
      toast.success(t('agenda_bell_on'));
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('agendaNotifications', 'false');
      toast.success(t('agenda_bell_off'));
    }
  };

  const respondToInvite = async (
    event: AgendaEvent,
    status: 'accepted' | 'declined',
  ) => {
    const invite = event.participants.find(
      (participant) => participant.userId === user?.id,
    );
    if (!invite) return;
    try {
      const { data } = await api.patch<AgendaEvent>(`/agenda/invites/${invite.id}`, {
        status,
      });
      setDetail((current) =>
        current && current.id === event.id ? data : current,
      );
      toast.success(t('agenda_responded'));
      reload();
    } catch {
      toast.error(t('agenda_error_save'));
    }
  };

  const deleteEvent = async (event: AgendaEvent) => {
    try {
      await api.delete(`/agenda/events/${event.id}`);
      setDetail(null);
      toast.success(t('agenda_deleted'));
      reload();
    } catch {
      toast.error(t('agenda_error_save'));
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (open) closePanel();
          else setOpen(true);
        }}
        title={t('agenda_open')}
        aria-label={t('agenda_open')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-secondary transition-all hover:border-primary/40 hover:bg-surface"
      >
        <CalendarDays className="h-4 w-4" />
        {badgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold leading-none text-white shadow-sm">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[1180] bg-black/20 backdrop-blur-[1px] md:hidden"
            onClick={closePanel}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="false"
            aria-label={t('agenda_title')}
            className="fixed inset-x-2 bottom-2 top-[76px] z-[1200] flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in md:inset-auto md:right-5 md:top-[84px] md:h-[min(720px,calc(100vh-104px))] md:w-[470px]"
          >
            <AgendaPanel
              events={events}
              invites={pendingInvites}
              loading={loading}
              error={error}
              view={view}
              onViewChange={setView}
              selectedDate={selectedDate}
              onSelectDate={(date) => setSelectedDate(startOfDay(date))}
              currentUserId={user?.id}
              onClose={closePanel}
              onCreate={(kind) => {
                setDetail(null);
                setForm({ event: null, date: startOfDay(selectedDate), kind });
              }}
              onOpenEvent={setDetail}
              detail={detail}
              onCloseDetail={() => setDetail(null)}
              onEdit={(event) => {
                setDetail(null);
                setForm({
                  event,
                  date: startOfDay(new Date(event.startAt)),
                  kind: event.kind,
                });
              }}
              onDelete={deleteEvent}
              onRespond={respondToInvite}
              notificationsEnabled={notificationsEnabled}
              onToggleNotifications={toggleNotifications}
              onRetry={reload}
            />
          </div>
        </>
      )}

      {form && (
        <AgendaEventForm
          key={`${form.event?.id || 'new'}-${dayKey(form.date)}-${form.kind}`}
          event={form.event}
          defaultDate={form.date}
          defaultKind={form.kind}
          people={people}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
    </>
  );
}
