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

  @Column({ nullable: true, type: 'int' })
  payloadCapacityPallets: number;

  @Column({ type: 'enum', enum: TrailerStatus, default: TrailerStatus.ACTIVE })
  status: TrailerStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
