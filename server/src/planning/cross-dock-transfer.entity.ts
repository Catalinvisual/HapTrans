import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Order } from '../orders/order.entity';
import { Trip } from '../trips/trip.entity';

export enum CrossDockStatus {
  PLANNED = 'planned',
  ARRIVED = 'arrived',
  TRANSFERRED = 'transferred',
  DEPARTED = 'departed',
  CANCELLED = 'cancelled',
}

@Entity('cross_dock_transfers')
export class CrossDockTransfer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'uuid', nullable: true })
  inboundTripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  inboundTrip: Trip;

  @Column({ type: 'uuid', nullable: true })
  outboundTripId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  outboundTrip: Trip;

  @Column()
  facilityName: string;

  @Column({ nullable: true })
  facilityAddress: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ nullable: true })
  cargoDescription: string;

  @Column({ nullable: true, type: 'int' })
  pallets: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  volumeCbm: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  ldm: number;

  @Column({ type: 'varchar', default: CrossDockStatus.PLANNED })
  status: CrossDockStatus;

  @Column({ type: 'timestamp', nullable: true })
  inboundEta: Date;

  @Column({ type: 'timestamp', nullable: true })
  outboundEta: Date;

  @Column({ type: 'timestamp', nullable: true })
  transferredAt: Date;

  @Column({ nullable: true })
  responsibleUser: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
