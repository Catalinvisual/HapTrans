import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { CalendarDays, Check, Search, StickyNote, X } from 'lucide-react';
import api from '../../lib/api';
import {
  AGENDA_COLORS,
  AGENDA_COLOR_HEX,
  AGENDA_REMINDER_KEYS,
  AGENDA_REMINDER_OPTIONS,
  type AgendaDraft,
  type AgendaEvent,
  type AgendaKind,
  type AgendaPerson,
} from './types';
import { dayKey, hhmm, parseDayKey } from './agendaUtils';

interface AgendaEventFormProps {
  event: AgendaEvent | null;
  defaultDate: Date;
  defaultKind: AgendaKind;
  people: AgendaPerson[];
  onClose: () => void;
  onSaved: () => void;
}

function emptyDraft(date: Date, kind: AgendaKind): AgendaDraft {
  const key = dayKey(date);
  return {
    title: '',
    kind,
    date: key,
    endDate: key,
    startTime: '09:00',
    endTime: '10:00',
    allDay: kind === 'note',
    description: '',
    location: '',
    color: 'orange',
    reminderMinutes: kind === 'note' ? 0 : 15,
    invitees: [],
  };
}

function draftFromEvent(event: AgendaEvent): AgendaDraft {
  const start = new Date(event.startAt);
  const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: event.title,
    kind: event.kind,
    date: dayKey(start),
    endDate: dayKey(end),
    startTime: hhmm(start),
    endTime: hhmm(end),
    allDay: event.allDay,
    description: event.description || '',
    location: event.location || '',
    color: event.color || 'orange',
    reminderMinutes: event.reminderMinutes || 0,
    invitees: event.participants.map((participant) => participant.userId),
  };
}

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary';
const labelClass =
  'mb-1 block text-[10px] font-black uppercase tracking-wide text-text-secondary';

export default function AgendaEventForm({
  event,
  defaultDate,
  defaultKind,
  people,
  onClose,
  onSaved,
}: AgendaEventFormProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<AgendaDraft>(() =>
    event ? draftFromEvent(event) : emptyDraft(defaultDate, defaultKind),
  );
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const onKeyDown = (keyboardEvent: KeyboardEvent) => {
      if (keyboardEvent.key === 'Escape' && !saving) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const update = (patch: Partial<AgendaDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    if (formError) setFormError('');
  };

  const setKind = (kind: AgendaKind) => {
    if (kind === 'note') {
      update({ kind, allDay: true, reminderMinutes: 0, invitees: [] });
    } else {
      update({ kind, allDay: false });
    }
  };

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) ||
        person.email.toLowerCase().includes(needle),
    );
  }, [people, query]);

  const toggleInvitee = (id: string) => {
    update({
      invitees: draft.invitees.includes(id)
        ? draft.invitees.filter((value) => value !== id)
        : [...draft.invitees, id],
    });
  };

  const submit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (saving) return;

    const title = draft.title.trim();
    if (!title) {
      setFormError(t('agenda_error_title'));
      return;
    }

    const timed = draft.kind === 'event' && !draft.allDay;
    const startAt = new Date(
      `${draft.date}T${timed ? draft.startTime || '09:00' : '00:00'}:00`,
    );
    const endAt =
      draft.kind === 'event'
        ? new Date(
            `${draft.endDate || draft.date}T${timed ? draft.endTime || '10:00' : '23:59'}:00`,
          )
        : null;

    if (
      Number.isNaN(startAt.getTime()) ||
      (endAt && Number.isNaN(endAt.getTime())) ||
      (endAt && endAt.getTime() < startAt.getTime())
    ) {
      setFormError(t('agenda_error_end'));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        kind: draft.kind,
        startAt: startAt.toISOString(),
        endAt: endAt ? endAt.toISOString() : null,
        allDay: draft.kind === 'note' ? true : draft.allDay,
        description: draft.description.trim(),
        location: draft.location.trim(),
        color: draft.color,
        reminderMinutes: draft.kind === 'note' ? 0 : draft.reminderMinutes,
        invitees: draft.kind === 'event' ? draft.invitees : [],
      };
      if (event) await api.patch(`/agenda/events/${event.id}`, payload);
      else await api.post('/agenda/events', payload);
      toast.success(event ? t('agenda_saved') : t('agenda_created'));
      onSaved();
      onClose();
    } catch {
      toast.error(t('agenda_error_save'));
    } finally {
      setSaving(false);
    }
  };

  const isNote = draft.kind === 'note';

  return (
    <div
      className="fixed inset-0 z-[1400] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onPointerDown={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={submit}
        onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            {isNote ? <StickyNote className="h-4 w-4" /> : <CalendarDays className="h-4 w-4" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">
              {event
                ? t('agenda_edit')
                : isNote
                  ? t('agenda_new_note')
                  : t('agenda_new_event')}
            </p>
            <p className="text-[10px] text-text-secondary">
              {draft.date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(parseDayKey(draft.date)) : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:bg-surface hover:text-text"
            title={t('agenda_close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
            {(['event', 'note'] as AgendaKind[]).map((kind) => {
              const active = draft.kind === kind;
              const Icon = kind === 'note' ? StickyNote : CalendarDays;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKind(kind)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors ${
                    active
                      ? 'bg-card text-primary shadow-sm'
                      : 'text-text-secondary hover:text-text'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {kind === 'note' ? t('agenda_kind_note') : t('agenda_kind_event')}
                </button>
              );
            })}
          </div>

          <div>
            <label className={labelClass} htmlFor="agenda-title">
              {t('agenda_title_label')}
            </label>
            <input
              id="agenda-title"
              autoFocus
              className={inputClass}
              value={draft.title}
              onChange={(changeEvent) => update({ title: changeEvent.target.value })}
              placeholder={t('agenda_title_placeholder')}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass} htmlFor="agenda-date">
                {t('agenda_date')}
              </label>
              <input
                id="agenda-date"
                type="date"
                className={inputClass}
                value={draft.date}
                onChange={(changeEvent) => {
                  const date = changeEvent.target.value;
                  update({
                    date,
                    endDate: !draft.endDate || draft.endDate < date ? date : draft.endDate,
                  });
                }}
              />
            </div>
            {!isNote && (
              <div>
                <label className={labelClass} htmlFor="agenda-end-date">
                  {t('agenda_end_date')}
                </label>
                <input
                  id="agenda-end-date"
                  type="date"
                  className={inputClass}
                  min={draft.date}
                  value={draft.endDate}
                  onChange={(changeEvent) => update({ endDate: changeEvent.target.value })}
                />
              </div>
            )}
          </div>

          {!isNote && (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-text">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(changeEvent) => update({ allDay: changeEvent.target.checked })}
                className="h-3.5 w-3.5 accent-[rgb(var(--color-primary))]"
              />
              {t('agenda_all_day')}
            </label>
          )}

          {!isNote && !draft.allDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass} htmlFor="agenda-start">
                  {t('agenda_start')}
                </label>
                <input
                  id="agenda-start"
                  type="time"
                  className={inputClass}
                  value={draft.startTime}
                  onChange={(changeEvent) => update({ startTime: changeEvent.target.value })}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="agenda-end">
                  {t('agenda_end')}
                </label>
                <input
                  id="agenda-end"
                  type="time"
                  className={inputClass}
                  value={draft.endTime}
                  onChange={(changeEvent) => update({ endTime: changeEvent.target.value })}
                />
              </div>
            </div>
          )}

          {!isNote && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass} htmlFor="agenda-location">
                  {t('agenda_location')}
                </label>
                <input
                  id="agenda-location"
                  className={inputClass}
                  value={draft.location}
                  onChange={(changeEvent) => update({ location: changeEvent.target.value })}
                  placeholder={t('agenda_location_placeholder')}
                  maxLength={300}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="agenda-reminder">
                  {t('agenda_reminder')}
                </label>
                <select
                  id="agenda-reminder"
                  className={inputClass}
                  value={draft.reminderMinutes}
                  onChange={(changeEvent) =>
                    update({ reminderMinutes: Number(changeEvent.target.value) })
                  }
                >
                  {AGENDA_REMINDER_OPTIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {t(AGENDA_REMINDER_KEYS[minutes])}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className={labelClass} htmlFor="agenda-description">
              {t('agenda_description')}
            </label>
            <textarea
              id="agenda-description"
              className={`${inputClass} min-h-[76px] resize-y`}
              value={draft.description}
              onChange={(changeEvent) => update({ description: changeEvent.target.value })}
              placeholder={t('agenda_description_placeholder')}
              maxLength={5000}
            />
          </div>

          <div>
            <p className={labelClass}>{t('agenda_color')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {AGENDA_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => update({ color })}
                  title={color}
                  aria-label={color}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    draft.color === color ? 'ring-2 ring-offset-2 ring-offset-card' : ''
                  }`}
                  style={{
                    backgroundColor: AGENDA_COLOR_HEX[color],
                    boxShadow: draft.color === color ? `0 0 0 2px ${AGENDA_COLOR_HEX[color]}` : undefined,
                  }}
                >
                  {draft.color === color && <Check className="mx-auto h-3.5 w-3.5 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {!isNote && (
            <div>
              <div className="flex items-center justify-between">
                <p className={labelClass}>{t('agenda_participants')}</p>
                {draft.invitees.length > 0 && (
                  <span className="text-[10px] font-bold text-primary">{draft.invitees.length}</span>
                )}
              </div>
              <p className="mb-2 text-[10px] text-text-secondary">{t('agenda_participants_hint')}</p>
              {people.length > 6 && (
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
                  <input
                    className={`${inputClass} pl-8`}
                    value={query}
                    onChange={(changeEvent) => setQuery(changeEvent.target.value)}
                    placeholder={t('agenda_search_people')}
                  />
                </div>
              )}
              <div className="max-h-36 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {filteredPeople.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-text-secondary">
                    {t('agenda_no_people')}
                  </p>
                ) : (
                  filteredPeople.map((person) => {
                    const checked = draft.invitees.includes(person.id);
                    return (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-surface"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInvitee(person.id)}
                          className="h-3.5 w-3.5 accent-[rgb(var(--color-primary))]"
                        />
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
                          {person.name?.[0]?.toUpperCase() || '?'}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-text">
                          {person.name}
                        </span>
                        <span className="hidden max-w-[45%] truncate text-[10px] text-text-secondary sm:block">
                          {person.email}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {formError && (
            <p className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-[11px] font-medium text-error">
              {formError}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface/50 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-text transition-colors hover:bg-surface disabled:opacity-50"
          >
            {t('agenda_cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {saving ? t('agenda_saving') : t('agenda_save')}
          </button>
        </div>
      </form>
    </div>
  );
}
