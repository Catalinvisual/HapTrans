import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Client } from '../clients/client.entity';
import { Trip } from '../trips/trip.entity';
import { Invoice } from '../invoices/invoice.entity';
import { Document } from '../documents/document.entity';
import { User } from '../users/user.entity';

export enum OrderStatus {
  UNASSIGNED = 'unassigned',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  DELIVERED = 'delivered',
  INVOICED = 'invoiced',
  CANCELLED = 'cancelled',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true, unique: true })
  referenceNumber: string;

  @ManyToOne(() => Client, (client) => client.orders, { eager: true })
  client: Client;

  @ManyToOne(() => Trip, (trip) => trip.orders, { nullable: true, onDelete: 'SET NULL' })
  trip: Trip;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.UNASSIGNED })
  status: OrderStatus;

  // Cargo details
  @Column({ nullable: true, type: 'integer' })
  pallets: number;

  @Column({ nullable: true })
  palletType: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  weightKg: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  volumeCbm: number;

  // Address Details for this Order
  @Column()
  pickupAddress: string;

  @Column({ nullable: true })
  pickupCompanyName: string;

  @Column({ nullable: true })
  pickupCountry: string;

  @Column({ type: 'timestamp', nullable: true })
  pickupDateFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupDateTo: Date;

  @Column()
  dropoffAddress: string;

  @Column({ nullable: true })
  dropoffCompanyName: string;

  @Column({ nullable: true })
  dropoffCountry: string;

  @Column({ type: 'timestamp', nullable: true })
  dropoffDateFrom: Date;

  @Column({ type: 'timestamp', nullable: true })
  dropoffDateTo: Date;

  // References
  @Column({ nullable: true })
  loadingReference: string;

  @Column({ nullable: true })
  unloadingReference: string;

  @Column({ nullable: true })
  cmrReference: string;

  // Financials
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  price: number;

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
