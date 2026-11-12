import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Client } from '../clients/client.entity';
import { InvoiceItem } from './invoice-item.entity';
import { Payment } from '../payments/payment.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  SENT = 'sent',
  VIEWED = 'viewed',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum VatType {
  NORMAL = 'NORMAL',
  REVERSE_CHARGE = 'REVERSE_CHARGE',
  EXEMPT = 'EXEMPT',
}

/** Immutable transport snapshot printed on the invoice. */
export interface InvoiceTransportDetails {
  loadingAddress?: string | null;
  unloadingAddress?: string | null;
  loadingDate?: string | null;
  loadingTime?: string | null;
  unloadingDate?: string | null;
  unloadingTime?: string | null;
  loadingReference?: string | null;
  unloadingReference?: string | null;
  pallets?: number | null;
  weightKg?: number | null;
  volumeCbm?: number | null;
  cargoDescription?: string | null;
  vehicle?: string | null;
  driver?: string | null;
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @ManyToOne(() => Trip, (trip) => trip.invoices, { onDelete: 'CASCADE' })
  trip: Trip;

  /**
   * The individual order this invoice was raised for. The unique constraint is
   * the database-level idempotency guarantee: duplicate completion events and
   * mobile/network retries can never create a second draft for one order.
   */
  @Column({ nullable: true, unique: true })
  orderId: string;

  @ManyToOne(() => Client, (client) => client.invoices, { eager: true, onDelete: 'SET NULL' })
  client: Client;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ nullable: true, type: 'decimal', precision: 5, scale: 2, default: 19 })
  vatPercent: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  fuelSurcharge: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  extraCosts: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  tollCosts: number;

  @Column({ type: 'enum', enum: VatType, default: VatType.NORMAL })
  vatType: VatType;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

  @OneToMany(() => Payment, payment => payment.invoice, { cascade: true, eager: true })
  payments: Payment[];

  @Column({ type: 'date', nullable: true })
  issueDate: Date;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status: InvoiceStatus;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  publicId: string;

  @Column({ nullable: true })
  resourceType: string;

  @Column({ nullable: true })
  cloudinaryType: string;

  @Column({ nullable: true })
  format: string;

  @Column({ nullable: true })
  originalFilename: string;

  @Column({ default: false })
  tnasDownloaded: boolean;

  @Column({ nullable: true, type: 'text' })
  pdfData: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  /** Snapshot of the order/trip data shown in the invoice transport card. */
  @Column({ nullable: true, type: 'jsonb' })
  transportDetails: InvoiceTransportDetails | null;

  @Column({ default: 0 })
  draftReminderLevel: number; // 0 = none, 1 = 3 days notified, 2 = 7 days notified & emailed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
