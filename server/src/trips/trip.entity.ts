import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { TripCost } from './trip-cost.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Document } from '../documents/document.entity';
import { Message } from '../chat/message.entity';
import { User } from '../users/user.entity';

export enum TripStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  LOADING = 'loading',
  UNLOADING = 'unloading',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DELAYED = 'delayed',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  referenceNumber: string;

  @ManyToOne(() => Client, (client) => client.trips, { eager: true })
  client: Client;

  @ManyToOne(() => Truck, (truck) => truck.trips, { eager: true })
  truck: Truck;

  @ManyToOne(() => Driver, (driver) => driver.trips, { eager: true })
  driver: Driver;

  @Column()
  pickupAddress: string;

  @Column({ nullable: true })
  pickupCompanyName: string;

  @Column()
  dropoffAddress: string;

  @Column({ nullable: true })
  dropoffCompanyName: string;

  @Column({ nullable: true })
  pickupCountry: string;

  @Column({ nullable: true })
  dropoffCountry: string;

  @Column({ type: 'timestamp' })
  pickupDate: Date;

  @Column({ nullable: true, type: 'timestamp' })
  dropoffDate: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  estimatedCost: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  realCost: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  distanceKm: number;

  @Column({ type: 'enum', enum: TripStatus, default: TripStatus.PENDING })
  status: TripStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ nullable: true, type: 'text' })
  driverNotes: string;

  @Column({ nullable: true, unique: true })
  trackingToken: string;

  @Column({ nullable: true })
  pickupTime: string;

  @Column({ nullable: true })
  dropoffTime: string;

  @Column({ nullable: true, type: 'integer' })
  pallets: number;

  @Column({ nullable: true })
  palletType: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  volumeCbm: number;

  @Column({ nullable: true })
  loadingReference: string;

  @Column({ nullable: true })
  unloadingReference: string;

  @Column({ nullable: true })
  cmrReference: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  dropoffLat: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  dropoffLng: number;

  @Column({ nullable: true, type: 'timestamp' })
  appointmentFrom: Date;

  @Column({ nullable: true, type: 'timestamp' })
  appointmentTo: Date;

  @Column({ nullable: true, type: 'integer' })
  estimatedLoadingMinutes: number;

  @Column({ nullable: true, type: 'timestamp' })
  loadingStartedAt: Date;

  @Column({ nullable: true, type: 'integer', default: 0 })
  manualDelayMinutes: number;

  @Column({ nullable: true, type: 'timestamp' })
  lastLiveEta: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastLiveEtaUpdatedAt: Date;

  @Column({ nullable: true, type: 'timestamp' })
  lastGpsAt: Date;

  @Column({ nullable: true })
  etaConfidence: string;

  @Column({ nullable: true })
  etaStatus: string;

  @Column({ nullable: true })
  etaSource: string;

  @Column({ type: 'boolean', default: false })
  delayedRiskEmailSent: boolean;

  @OneToMany(() => TripCost, (cost) => cost.trip, { eager: true })
  costs: TripCost[];

  @OneToMany(() => Invoice, (inv) => inv.trip)
  invoices: Invoice[];

  @OneToMany(() => Document, (doc) => doc.trip)
  documents: Document[];

  @OneToMany(() => Message, (msg) => msg.trip)
  messages: Message[];

  @ManyToOne(() => User, { nullable: true, eager: true })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
