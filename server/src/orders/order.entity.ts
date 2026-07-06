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
  CONFIRMED = 'confirmed',
  PLANNED = 'planned',
  PARTIALLY_ASSIGNED = 'partially_assigned',
  ASSIGNED = 'assigned',
  LOADING = 'loading',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CLOSED = 'closed',
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

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ type: 'enum', enum: TransportType, default: TransportType.FTL })
  transportType: TransportType;

  @Column({ type: 'enum', enum: OrderPriority, default: OrderPriority.NORMAL })
  priority: OrderPriority;

  // Replaced static cargo fields with dynamic CargoItems relation
  @OneToMany(() => CargoItem, (cargo) => cargo.order, { cascade: true })
  cargoItems: CargoItem[];

  // Replaced static pickup/dropoff with dynamic OrderStops relation
  @OneToMany(() => OrderStop, (stop) => stop.order, { cascade: true })
  stops: OrderStop[];

  // Financials
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  price: number;

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
