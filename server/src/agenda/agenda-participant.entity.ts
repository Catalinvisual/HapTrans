import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AgendaEvent } from './agenda-event.entity';

export const AGENDA_PARTICIPANT_STATUSES = ['pending', 'accepted', 'declined'] as const;
export type AgendaParticipantStatus = (typeof AGENDA_PARTICIPANT_STATUSES)[number];

@Entity('agenda_participants')
@Index('UQ_agenda_participants_event_user', ['eventId', 'userId'], { unique: true })
@Index('IDX_agenda_participants_user', ['userId'])
export class AgendaParticipant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  invitedById: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: AgendaParticipantStatus;

  @Column({ type: 'timestamptz', nullable: true })
  respondedAt: Date | null;

  @ManyToOne(() => AgendaEvent, (event) => event.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: AgendaEvent;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
