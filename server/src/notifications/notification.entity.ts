import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: string; // 'document', 'trip', 'chat', 'alert'

  @Column()
  title: string;

  @Column({ nullable: true })
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  relatedId: string; // ID of the trip or document

  /**
   * Deterministic event key. The unique index is the last line of defence
   * against duplicate notifications from retries or concurrent consumers.
   */
  @Index('IDX_notifications_event_unique', { unique: true })
  @Column({ nullable: true })
  eventId: string;

  /** DRIVER_APP | TMS_DISPATCH | SYSTEM */
  @Column({ default: 'SYSTEM' })
  origin: string;

  /** 'tms' rows appear in the dispatcher feed; 'driver' rows are delivery ledger entries. */
  @Column({ default: 'tms' })
  audience: string;

  @CreateDateColumn()
  createdAt: Date;
}
