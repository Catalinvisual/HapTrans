import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Scheduled report delivery configuration. A cron service picks up due
 * schedules, generates the report from CURRENT database state at execution
 * time and records it in report_history; notifications/emails are sent to the
 * configured recipients when an email provider is configured.
 */
@Entity('scheduled_reports')
export class ScheduledReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  name: string;

  @Column()
  reportKey: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  /** 'xlsx' | 'pdf' */
  @Column({ default: 'xlsx' })
  format: string;

  /** Report language ('ro' | 'en' | 'nl' | 'de'). */
  @Column({ default: 'en' })
  locale: string;

  /** 'daily' | 'weekly' | 'monthly' */
  @Column({ default: 'weekly' })
  frequency: string;

  @Column({ type: 'simple-array', nullable: true })
  recipients: string[];

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  nextRunAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastRunAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastErrorAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}