import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Trip } from '../trips/trip.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';
import { Company } from '../companies/company.entity';
import { CargoItem } from './cargo-item.entity';
import { OrderStop } from './order-stop.entity';

export enum OrderStatus {
  DRAFT = 'draft',
  NEW = 'new',
  PLANNED = 'planned',
  ASSIGNED = 'assigned',
  LOADING = 'loading',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  POD_RECEIVED = 'pod_received',
  READY_FOR_INVOICE = 'ready_for_invoice',
  INVOICED = 'invoiced',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum TransportType {
  FTL = 'ftl',
  GROUPAGE = 'groupage',
  EXPRESS = 'express',
}

export enum OrderPriority {
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ unique: true, nullable: true })
  orderNumber: string; // e.g. ORD-2026-004521

  @Column({ nullable: true })
  customerReference: string;

  @Column({ nullable: true })
  internalReference: string;

  @ManyToOne(() => Client, (client) => client.orders, { eager: true })
  client: Client;

  @ManyToOne(() => Trip, (trip) => trip.orders, { nullable: true, onDelete: 'SET NULL' })
  trip: Trip; // Keep for backward compatibility or simple assignment, but StopTask handles split logic

  @Column({ type: 'varchar', default: 'draft' })
  status: string;

  @Column({ nullable: true, unique: true })
  trackingToken: string; // e.g. HC-A1B2C3D4

  // --- ETA & Tracking ---
  @Column({ type: 'timestamp', nullable: true })
  originalEtaPickup: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentEtaPickup: Date;

  @Column({ type: 'timestamp', nullable: true })
  originalEtaDelivery: Date;

  @Column({ type: 'timestamp', nullable: true })
  currentEtaDelivery: Date;

  @Column({ type: 'int', default: 0 })
  delayMinutes: number; // calculated as (currentEta - originalEta) in minutes

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  distanceKm: number;

  @Column({ type: 'varchar', default: 'ftl' })
  transportType: string;

  @Column({ type: 'varchar', default: 'normal' })
  priority: string;

  @Column({ type: 'simple-array', nullable: true })
  equipmentRequirements: string[]; // ['frigo', 'adr', 'mega', 'tilt']

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  contactPhone: string;

  // Replaced static cargo fields with dynamic CargoItems relation
  @OneToMany(() => CargoItem, (cargo) => cargo.order, { cascade: true })
  cargoItems: CargoItem[];

  // Replaced static pickup/dropoff with dynamic OrderStops relation
  @OneToMany(() => OrderStop, (stop) => stop.order, { cascade: true })
  stops: OrderStop[];

  // Financials
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  price: number; // Revenue

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  estimatedCost: number; // Configurable engine output

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  estimatedProfit: number; // Price - estimatedCost

  @Column({ nullable: true })
  currency: string;

  @ManyToOne(() => Invoice, { nullable: true })
  invoice: Invoice;

  // Others
  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => Document, (doc) => doc.order)
  documents: Document[];

  @ManyToOne(() => User, { nullable: true, eager: true, onDelete: 'SET NULL' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
