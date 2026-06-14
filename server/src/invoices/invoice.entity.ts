import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Client } from '../clients/client.entity';
import { InvoiceItem } from './invoice-item.entity';

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  invoiceNumber: string;

  @ManyToOne(() => Trip, (trip) => trip.invoices, { onDelete: 'CASCADE' })
  trip: Trip;

  @ManyToOne(() => Client, (client) => client.invoices, { eager: true })
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
  total: number;

  @OneToMany(() => InvoiceItem, item => item.invoice, { cascade: true, eager: true })
  items: InvoiceItem[];

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

  @Column({ default: 0 })
  draftReminderLevel: number; // 0 = none, 1 = 3 days notified, 2 = 7 days notified & emailed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
