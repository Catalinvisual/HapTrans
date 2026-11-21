import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import type { AgendaEvent, AgendaPerson, AgendaResponse } from './types';

/**
 * Loads the personal agenda for one visible window and refreshes it every
 * minute, so invitations and reminders arrive without a manual reload.
 */
export function useAgenda(from: string, to: string) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [people, setPeople] = useState<AgendaPerson[]>([]);
  const [invites, setInvites] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      const requestId = ++requestRef.current;
      if (quiet) setRefreshing(true);
      else setLoading(true);
      try {
        const { data } = await api.get<AgendaResponse>('/agenda', { params: { from, to } });
        if (requestId !== requestRef.current) return;
        setEvents(Array.isArray(data?.events) ? data.events : []);
        setPeople(Array.isArray(data?.people) ? data.people : []);
        setInvites(Array.isArray(data?.invites) ? data.invites : []);
        setError(false);
      } catch {
        if (requestId === requestRef.current) setError(true);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [from, to],
  );

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 60000);
    const onFocus = () => load(true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  return {
    events,
    people,
    invites,
    loading,
    refreshing,
    error,
    reload: useCallback(() => load(true), [load]),
  };
}
