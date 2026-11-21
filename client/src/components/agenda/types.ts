export type AgendaView = 'month' | 'week' | 'notes';
export type AgendaKind = 'event' | 'note';
export type AgendaParticipantStatus = 'pending' | 'accepted' | 'declined';

export interface AgendaPerson {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface AgendaParticipant {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: AgendaParticipantStatus;
}

export interface AgendaEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  kind: AgendaKind;
  color: string;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  reminderMinutes: number;
  status: 'confirmed' | 'tentative' | 'cancelled';
  ownerId: string;
  ownerName: string;
  canEdit: boolean;
  myStatus: 'owner' | 'none' | AgendaParticipantStatus;
  participants: AgendaParticipant[];
}

export interface AgendaResponse {
  events: AgendaEvent[];
  people: AgendaPerson[];
  invites: AgendaEvent[];
}

export interface AgendaDraft {
  title: string;
  kind: AgendaKind;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  description: string;
  location: string;
  color: string;
  reminderMinutes: number;
  invitees: string[];
}

export const AGENDA_COLORS = ['orange', 'amber', 'green', 'blue', 'violet', 'rose', 'slate'] as const;

export const AGENDA_COLOR_HEX: Record<string, string> = {
  orange: '#FF5A00',
  amber: '#D97706',
  green: '#16A34A',
  blue: '#2563EB',
  violet: '#7C3AED',
  rose: '#E11D48',
  slate: '#475569',
};

export const AGENDA_REMINDER_OPTIONS = [0, 5, 10, 15, 30, 60, 120, 1440];

export const AGENDA_REMINDER_KEYS: Record<number, string> = {
  0: 'agenda_reminder_none',
  5: 'agenda_reminder_5',
  10: 'agenda_reminder_10',
  15: 'agenda_reminder_15',
  30: 'agenda_reminder_30',
  60: 'agenda_reminder_60',
  120: 'agenda_reminder_120',
  1440: 'agenda_reminder_1440',
};
