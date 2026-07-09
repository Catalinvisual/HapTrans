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
  DISPATCHED = 'dispatched',
  READY = 'ready',
  ACTIVE = 'active', // replaces 'started'
  DRIVING = 'driving',
  LOADING = 'loading',
  WAITING = 'waiting',
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

  @Column({ nullable: true, unique: true })
  trackingToken: string; // e.g. "ORD-G5KQZUKH" — generated on dispatch

  @Column({ type: 'varchar', default: 'planning' })
  status: string;

  // Assignments
  @ManyToOne(() => Truck, (truck) => truck.trips, { eager: true })
  truck: Truck;

  @ManyToOne(() => Trailer, { nullable: true, eager: true })
  trailer: Trailer;

  @ManyToOne(() => Driver, (driver) => driver.trips, { eager: true })
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

  // Financials (Managed by Pricing Engine)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  estimatedProfit: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  actualProfit: number;

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
