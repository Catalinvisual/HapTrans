import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../companies/company.entity';

export enum TrailerType {
  MEGA = 'mega',
  FRIGO = 'frigo',
  STANDARD = 'standard',
  WALKING_FLOOR = 'walking_floor',
  CONTAINER = 'container',
  FLATBED = 'flatbed',
  OTHER = 'other',
}

export enum TrailerStatus {
  ACTIVE = 'active',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

@Entity('trailers')
export class Trailer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ unique: true })
  plateNumber: string;

  @Column({ type: 'enum', enum: TrailerType, default: TrailerType.STANDARD })
  type: TrailerType;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  payloadCapacityWeight: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maxLdm: number; // e.g. 13.6

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maxVolumeCbm: number;

  @Column({ nullable: true, type: 'int' })
  payloadCapacityPallets: number;

  @Column({ type: 'enum', enum: TrailerStatus, default: TrailerStatus.ACTIVE })
  status: TrailerStatus;

  @Column({ type: 'date', nullable: true })
  apkExpiry: Date;

  // Drop & Hook tracking
  @Column({ type: 'boolean', default: false })
  isDropped: boolean;

  @Column({ nullable: true })
  dropLocation: string | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  dropLat: number | null;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  dropLng: number | null;

  @Column({ type: 'timestamp', nullable: true })
  droppedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  currentTripId: string | null;

  @Column({ type: 'uuid', nullable: true })
  currentTruckId: string | null;

  @Column('simple-array', { nullable: true })
  features: string[] | null; // e.g. ['ADR', 'Tail-lift', 'Curtainside']

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
