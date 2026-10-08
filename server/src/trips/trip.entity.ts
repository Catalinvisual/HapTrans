import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Truck } from '../trucks/truck.entity';
import { Trailer } from '../trucks/trailer.entity';
import { Driver } from '../drivers/driver.entity';
import { TripCost } from './trip-cost.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Document } from '../documents/document.entity';
import { Message } from '../chat/message.entity';
import { User } from '../users/user.entity';
import { Order } from '../orders/order.entity';
import { Stop } from './stop.entity';

export enum TripStatus {
  PLANNING = 'planning',
  PLANNED = 'planned',
  DISPATCHED = 'dispatched',
  ASSIGNED = 'assigned',
  DRIVER_ACCEPTED = 'driver_accepted',
  STARTED = 'started',
  LOADING = 'loading',
  DRIVING = 'driving',
  PARTIALLY_DELIVERED = 'partially_delivered',
  COMPLETED = 'completed',
  CLOSED = 'closed',
  CANCELLED = 'cancelled',
}

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ unique: true, nullable: true })
  tripNumber: string; // e.g. TR-2026-000231

  @Column({ unique: true, nullable: true })
  trackingToken: string;

  @Column({ type: 'varchar', default: 'planned' })
  status: string;

  // Fleet Type: Own Fleet vs Subcontractor vs Charter
  @Column({ type: 'varchar', default: 'own_fleet' })
  fleetType: string; // 'own_fleet' | 'subcontractor' | 'charter'

  // Subcontractor & Charter Details
  @Column({ nullable: true })
  carrierName: string;

  @Column({ nullable: true })
  carrierContact: string;

  @Column({ nullable: true })
  carrierPhone: string;

  @Column({ nullable: true })
  carrierEmail: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  carrierRate: number;

  @Column({ nullable: true, default: 'EUR' })
  carrierCurrency: string;

  @Column({ nullable: true })
  carrierReference: string;

  @Column({ nullable: true })
  carrierStatus: string; // 'assigned', 'confirmed', 'in_transit', 'completed', 'cancelled'

  @Column({ nullable: true })
  carrierTruckPlate: string;

  @Column({ nullable: true })
  carrierTrailerPlate: string;

  @Column({ nullable: true })
  carrierDriverName: string;

  @Column({ nullable: true })
  carrierDriverPhone: string;

  @Column({ nullable: true, type: 'text' })
  carrierNotes: string;

  @Column({ type: 'boolean', default: true, nullable: true })
  carrierDocumentsValid: boolean;

  @Column({ type: 'date', nullable: true })
  carrierInsuranceExpiry: Date;

  // Assignments
  @ManyToOne(() => Truck, (truck) => truck.trips, { eager: true, onDelete: 'SET NULL' })
  truck: Truck;

  @ManyToOne(() => Trailer, { nullable: true, eager: true, onDelete: 'SET NULL' })
  trailer: Trailer;

  @ManyToOne(() => Driver, (driver) => driver.trips, { eager: true, onDelete: 'SET NULL' })
  driver: Driver;

  // Timestamps
  @Column({ type: 'timestamp', nullable: true })
  plannedDeparture: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualDeparture: Date;

  @Column({ type: 'timestamp', nullable: true })
  plannedArrival: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualArrival: Date;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  distanceKm: number;

  // Tolls accumulated from real routing / toll providers
  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, default: 0 })
  tollCost: number;

  @Column({ type: 'varchar', default: 'not_calculated' })
  tollStatus: string; // 'not_calculated' | 'calculated' | 'unavailable'

  @Column('simple-array', { nullable: true })
  tollCountries: string[];

  // Live Traffic status & delay
  @Column({ type: 'int', default: 0 })
  trafficDelayMinutes: number;

  @Column({ type: 'varchar', default: 'normal' })
  trafficStatus: string; // 'normal' | 'congested' | 'heavy_delay' | 'unavailable'

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, default: 0 })
  estimatedCost: number;

  // Financials (Managed by Pricing Engine)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  estimatedProfit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  actualProfit: number;

  // Lifecycle & Validation
  @Column({ type: 'varchar', default: 'not_validated' })
  validationStatus: string; // 'not_validated' | 'validating' | 'feasible' | 'warning' | 'not_feasible'

  @Column({ type: 'jsonb', nullable: true })
  validationIssues: any[]; // [{ id, type: 'blocking' | 'warning', code, message, field, details }]

  @Column({ type: 'boolean', default: false })
  validationOutdated: boolean;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  confirmedBy: User | null;

  // Dispatch & Versioning
  @Column({ type: 'int', default: 1 })
  dispatchVersion: number;

  @Column({ type: 'timestamp', nullable: true })
  dispatchedAt: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  dispatchedBy: User | null;

  @Column({ type: 'jsonb', nullable: true })
  dispatchPayload: any;

  @Column({ type: 'timestamp', nullable: true })
  driverAcknowledgedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  driverAcceptedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  trackingActivated: boolean;

  // Pessimistic Locking
  @Column({ type: 'boolean', default: false })
  locked: boolean;

  @ManyToOne(() => User, { nullable: true })
  lockedBy: User;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date;

  // Optimistic Locking
  @Column({ default: 1, nullable: true })
  version: number;

  // Relations
  @OneToMany(() => Order, (order) => order.trip)
  orders: Order[]; // Left for simple reference, but actual routing is through Stops

  @OneToMany(() => Stop, (stop) => stop.trip, { cascade: true })
  stops: Stop[];

  @OneToMany(() => TripCost, (cost) => cost.trip, { eager: true, cascade: true })
  costs: TripCost[];

  @OneToMany(() => Invoice, (inv) => inv.trip)
  invoices: Invoice[];

  @OneToMany(() => Document, (doc) => doc.trip)
  documents: Document[];

  @OneToMany(() => Message, (msg) => msg.trip)
  messages: Message[];

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  dispatcher: User; // Renamed from createdBy to dispatcher for clarity

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
