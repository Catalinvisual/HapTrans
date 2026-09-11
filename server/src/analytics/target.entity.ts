import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Management targets used by the Target vs Actual layer of the dashboard and
 * financial pages. Targets are company-scoped, stored in the database and
 * editable only by admins (enforced by RoesGuard on PUT /api/analytics/targets).
 */
@Entity('analytics_targets')
export class AnalyticsTarget {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  /** Stable identifier used by the KPI layer, e.g. 'otif', 'revenue', 'margin'. */
  @Column()
  key: string;

  /** Human label (i18n key resolved on the client). */
  @Column({ type: 'varchar', nullable: true })
  label: string | null;

  /** KPI group: 'service' | 'operations' | 'fleet' | 'financial'. */
  @Column({ type: 'varchar', nullable: true })
  section: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 })
  value: number;

  /** Unit: '%' | 'EUR' | 'EUR/km' | 'count' */
  @Column({ default: '%' })
  unit: string;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}