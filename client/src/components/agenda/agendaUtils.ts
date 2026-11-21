import type { AgendaEvent } from './types';

export const LOCALES: Record<string, string> = {
  ro: 'ro-RO',
  en: 'en-GB',
  nl: 'nl-NL',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  pl: 'pl-PL',
};

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseDayKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}

export function hhmm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function weekStart(date: Date): Date {
  const start = startOfDay(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

/** True when the event is visible on that local calendar day (inclusive). */
export function occursOn(event: AgendaEvent, date: Date): boolean {
  const day = startOfDay(date).getTime();
  const start = startOfDay(new Date(event.startAt)).getTime();
  const end = startOfDay(new Date(event.endAt || event.startAt)).getTime();
  return start <= day && day <= end;
}

export function sortEvents(a: AgendaEvent, b: AgendaEvent): number {
  if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
  return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
}

export function eventsOn(events: AgendaEvent[], date: Date): AgendaEvent[] {
  return events.filter((event) => occursOn(event, date)).sort(sortEvents);
}

export function formatMonth(date: Date, locale: string): string {
  const text = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatLongDate(date: Date, locale: string): string {
  const text = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(iso),
  );
}

export function formatEventWhen(event: AgendaEvent, locale: string): string {
  const start = new Date(event.startAt);
  const shortDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
  }).format(start);
  if (event.kind === 'note' || event.allDay) return shortDate;
  const time = formatTime(event.startAt, locale);
  const end = event.endAt ? formatTime(event.endAt, locale) : '';
  return `${shortDate} · ${time}${end ? `–${end}` : ''}`;
}

export function formatEventRange(event: AgendaEvent, locale: string): string {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : null;
  const dateFmt = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const startDate = dateFmt.format(start);

  if (event.kind === 'note') return startDate;
  if (event.allDay) {
    if (!end || dayKey(end) === dayKey(start)) return startDate;
    return `${startDate} – ${dateFmt.format(end)}`;
  }

  const timeFmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  let range = `${startDate}, ${timeFmt.format(start)}`;
  if (end) {
    range += ` – ${
      dayKey(end) === dayKey(start)
        ? timeFmt.format(end)
        : `${dateFmt.format(end)}, ${timeFmt.format(end)}`
    }`;
  }
  return range;
}
