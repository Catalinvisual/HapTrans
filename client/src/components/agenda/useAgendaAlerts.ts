import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgendaEvent } from './types';

export interface AgendaAlert {
  key: string;
  kind: 'reminder' | 'invite';
  event: AgendaEvent;
  dueAt: number;
}

interface UseAgendaAlertsOptions {
  events: AgendaEvent[];
  invites: AgendaEvent[];
  userId?: string;
  enabled: boolean;
}

const TICK_MS = 30_000;
// Keep an overdue reminder around long enough to be useful after a reload.
const SHOW_AFTER_START_MS = 60 * 60 * 1000;

function occurrenceKey(kind: AgendaAlert['kind'], userId: string | undefined, event: AgendaEvent) {
  return `${kind}_${userId || 'me'}_${event.id}_${event.startAt}`;
}

function readFlag(key: string): string | null {
  try {
    return typeof window === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the popup still works for this session.
  }
}

function removeFlag(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clean up when storage is blocked.
  }
}

function desktopKey(alert: AgendaAlert) {
  return `agenda_alert_desktop_${alert.key}`;
}

export function hasAlertDesktopShown(alert: AgendaAlert) {
  return Boolean(readFlag(desktopKey(alert)));
}

export function markAlertDesktopShown(alert: AgendaAlert) {
  writeFlag(desktopKey(alert), '1');
}

/**
 * Turns due reminders and pending invitations into a persistent queue. Nothing
 * auto-hides: an alert stays in the corner until the user ignores, snoozes,
 * accepts, declines or closes it. Snoozes and dismissals survive a reload.
 */
export function useAgendaAlerts({ events, invites, userId, enabled }: UseAgendaAlertsOptions) {
  const [now, setNow] = useState(() => Date.now());
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const onFocus = () => setNow(Date.now());
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const alerts = useMemo(() => {
    if (!enabled) return [] as AgendaAlert[];
    const timestamp = Math.max(now, Date.now());

    const reminders: AgendaAlert[] = [];
    for (const event of events) {
      if (event.kind !== 'event' || event.status === 'cancelled' || !event.reminderMinutes) {
        continue;
      }
      const start = new Date(event.startAt).getTime();
      if (!Number.isFinite(start)) continue;
      const dueAt = start - event.reminderMinutes * 60_000;
      if (dueAt > timestamp || timestamp > start + SHOW_AFTER_START_MS) continue;

      const key = occurrenceKey('reminder', userId, event);
      if (readFlag(`agenda_alert_ignored_${key}`)) continue;
      const snoozeUntil = Number(readFlag(`agenda_alert_snooze_${key}`) || 0);
      if (snoozeUntil > timestamp) continue;

      reminders.push({ key, kind: 'reminder', event, dueAt });
    }
    reminders.sort((a, b) => a.dueAt - b.dueAt);

    const invitations: AgendaAlert[] = [];
    for (const event of invites) {
      if (event.myStatus !== 'pending') continue;
      const key = occurrenceKey('invite', userId, event);
      if (readFlag(`agenda_invite_dismissed_${key}`)) continue;
      const start = new Date(event.startAt).getTime();
      invitations.push({
        key,
        kind: 'invite',
        event,
        dueAt: Number.isFinite(start) ? start : 0,
      });
    }
    invitations.sort((a, b) => a.dueAt - b.dueAt);

    return [...reminders, ...invitations];
    // `revision` makes localStorage writes recompute the queue immediately.
  }, [events, invites, enabled, userId, now, revision]);

  const bump = useCallback(() => {
    setRevision((value) => value + 1);
    setNow(Date.now());
  }, []);

  const ignore = useCallback(
    (alert: AgendaAlert) => {
      if (alert.kind === 'invite') {
        writeFlag(`agenda_invite_dismissed_${alert.key}`, '1');
      } else {
        writeFlag(`agenda_alert_ignored_${alert.key}`, '1');
      }
      removeFlag(desktopKey(alert));
      bump();
    },
    [bump],
  );

  const snooze = useCallback(
    (alert: AgendaAlert, minutes: number) => {
      writeFlag(
        `agenda_alert_snooze_${alert.key}`,
        String(Date.now() + Math.max(1, minutes) * 60_000),
      );
      // Allow a fresh desktop notification when the snooze expires.
      removeFlag(desktopKey(alert));
      bump();
    },
    [bump],
  );

  const dismissInvite = useCallback(
    (event: AgendaEvent) => {
      const key = occurrenceKey('invite', userId, event);
      writeFlag(`agenda_invite_dismissed_${key}`, '1');
      removeFlag(`agenda_alert_desktop_${key}`);
      bump();
    },
    [bump, userId],
  );

  return { alerts, ignore, snooze, dismissInvite, now };
}
