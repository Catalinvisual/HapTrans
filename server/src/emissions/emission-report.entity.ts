import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { numericTransformer } from './emission-geo.entity';

/**
 * A generated report. Finalization stores the complete snapshot, the engine
 * version and a checksum, so a previously finalized report stays reproducible
 * even after factors or vehicle data change.
 */
/** Saved manual-calculator scenario. Explicitly not company emissions. */
@Entity('emission_simulations')
export class EmissionSimulation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'jsonb' })
  input: Record<string, unknown>;

  @Column({ type: 'jsonb' })
  result: Record<string, unknown>;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  engineVersion: string;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('emission_reports')
export class EmissionReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  reportNumber: string;

  /** company | daily | monthly | annual | country | fleet | truck | driver_efficiency | customer | trip | fuel_consumption | empty_running | wtw | data_quality | compliance | subcontractor */
  @Column({ type: 'varchar', length: 40 })
  kind: string;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'date' })
  periodStart: string;

  @Column({ type: 'date' })
  periodEnd: string;

  @Column({ type: 'jsonb', nullable: true })
  filters: Record<string, unknown> | null;

  /** draft | finalized */
  @Index()
  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  engineVersion: string;

  @Column({ type: 'varchar', length: 60, default: 'en_iso_14083_wtw' })
  methodology: string;

  @Column({ type: 'varchar', length: 20, default: 'kg' })
  unit: string;

  @Column({ type: 'jsonb', nullable: true })
  snapshot: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  totals: Record<string, unknown> | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  totalWtwKgCo2e: number | null;

  @Column({ type: 'varchar', nullable: true })
  checksum: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  finalizedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
