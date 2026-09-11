import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
} from 'typeorm';

/** Every generated report is recorded here for auditability and re-download. */
@Entity('report_history')
export class ReportHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  reportKey: string;

  @Column()
  reportName: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  /** 'xlsx' | 'pdf' */
  @Column()
  format: string;

  /** 'generated' | 'failed' */
  @Column({ default: 'generated' })
  status: string;

  /** Relative path of the generated file (under uploads/reports/). */
  @Column({ nullable: true })
  filePath: string | null;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ default: 'en' })
  locale: string;

  @Column({ nullable: true })
  fileName: string | null;

  @CreateDateColumn()
  generatedAt: Date;
}