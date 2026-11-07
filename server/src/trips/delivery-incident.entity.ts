import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * A reported delivery problem. The row is immutable evidence: dispatcher
 * decisions are added to resolution fields while the driver's original report,
 * quantities and photo ids are retained.
 */
@Entity('delivery_incidents')
@Index(['tripId', 'clientRequestId'], { unique: true })
export class DeliveryIncident {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid' })
  tripId: string;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'uuid', nullable: true })
  stopId: string | null;

  @Column({ type: 'uuid', nullable: true })
  driverUserId: string | null;

  @Column({ type: 'varchar', length: 64 })
  reasonCode: string;

  @Column({ type: 'varchar', length: 40 })
  outcome: string;

  @Column({ type: 'int', nullable: true })
  affectedPallets: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 3, nullable: true })
  affectedQuantity: number | null;

  @Column({ type: 'varchar', length: 24, nullable: true })
  quantityUnit: string | null;

  @Column({ type: 'text' })
  description: string;

  /** Optional additional driver notes, kept separate from the refusal reason. */
  @Column({ type: 'text', nullable: true })
  driverNotes: string | null;

  @Column({ type: 'text', nullable: true })
  customerExplanation: string | null;

  @Column({ nullable: true })
  customerName: string | null;

  @Column({ type: 'boolean', default: false })
  signatureRefused: boolean;

  @Column({ type: 'simple-json', nullable: true })
  photoIds: string[] | null;

  /** Client-generated id makes a retried submission idempotent. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  clientRequestId: string | null;

  @Column({ type: 'varchar', length: 24, default: 'OPEN' })
  status: string; // OPEN | RESOLVED

  @Column({ type: 'varchar', length: 64, nullable: true })
  resolutionCode: string | null;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedByUserId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
