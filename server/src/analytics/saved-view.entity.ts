import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * User-specific saved dashboard / financial filter views.
 * { id, name, page, filters(jsonb) } — `filters` mirrors the query params of
 * GET /api/analytics/executive so a view can be reapplied exactly.
 */
@Entity('saved_views')
export class SavedView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column()
  name: string;

  /** 'dashboard' | 'financial' */
  @Column({ default: 'dashboard' })
  page: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: any;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}