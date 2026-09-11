import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/** A user-saved report configuration that can be regenerated / exported. */
@Entity('saved_reports')
export class SavedReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  name: string;

  /** Report key from the report catalogue (e.g. 'customer_profitability'). */
  @Column()
  reportKey: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  /** Default export format: 'xlsx' | 'pdf'. */
  @Column({ default: 'xlsx' })
  format: string;

  @Column({ default: 'en' })
  locale: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}