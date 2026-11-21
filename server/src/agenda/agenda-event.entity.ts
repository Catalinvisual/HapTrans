import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AgendaParticipant } from './agenda-participant.entity';

export const AGENDA_KINDS = ['event', 'note'] as const;
export const AGENDA_COLORS = ['orange', 'amber', 'green', 'blue', 'violet', 'rose', 'slate'] as const;
export const AGENDA_REMINDER_MINUTES = [0, 5, 10, 15, 30, 60, 120, 1440] as const;
export const AGENDA_STATUSES = ['confirmed', 'tentative', 'cancelled'] as const;

export type AgendaKind = (typeof AGENDA_KINDS)[number];
export type AgendaStatus = (typeof AGENDA_STATUSES)[number];

/**
 * A personal calendar entry. Every row belongs to exactly one user; invitations
 * are separate participant rows so two people can never edit the same copy of
 * an event by accident.
 */
@Entity('agenda_events')
@Index('IDX_agenda_events_user_start', ['userId', 'startAt'])
export class AgendaEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Owner. Only this user may edit or delete the event. */
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  location: string | null;

  /** 'event' = calendar entry with a period, 'note' = dated personal note. */
  @Column({ type: 'varchar', default: 'event' })
  kind: AgendaKind;

  @Column({ type: 'varchar', default: 'orange' })
  color: string;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endAt: Date | null;

  @Column({ type: 'boolean', default: false })
  allDay: boolean;

  /** Minutes before startAt to notify. 0 disables the reminder. */
  @Column({ type: 'int', default: 15 })
  reminderMinutes: number;

  @Column({ type: 'varchar', default: 'confirmed' })
  status: AgendaStatus;

  /** Set by the reminder cron so the same reminder is never emailed twice. */
  @Column({ type: 'timestamptz', nullable: true })
  reminderSentAt: Date | null;

  @OneToMany(() => AgendaParticipant, (participant) => participant.event)
  participants: AgendaParticipant[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
