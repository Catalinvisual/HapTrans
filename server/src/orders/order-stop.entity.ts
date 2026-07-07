import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Order } from './order.entity';
import { Company } from '../companies/company.entity';
import { ClientLocation } from '../clients/client-location.entity';

export enum OrderStopType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
  WAREHOUSE = 'warehouse',
  CUSTOMS = 'customs',
  TERMINAL = 'terminal',
}

@Entity('order_stops')
export class OrderStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Order, (order) => order.stops, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'varchar', default: 'pickup' })
  type: string;

  @Column({ type: 'int', default: 1 })
  sequence: number; // 1, 2, 3... Determines order of execution

  // Optional link to master location, but data is snapshot below
  @ManyToOne(() => ClientLocation, { nullable: true, onDelete: 'SET NULL' })
  clientLocation: ClientLocation;

  // --- Snapshot Data ---
  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  latitude: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  longitude: number;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  contactPerson: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  timeZone: string;

  // --- Time Requirements ---
  @Column({ type: 'date', nullable: true })
  dateFrom: string;

  @Column({ type: 'date', nullable: true })
  dateTo: string;

  @Column({ nullable: true })
  timeFrom: string; // HH:mm format

  @Column({ nullable: true })
  timeUntil: string; // HH:mm format

  @Column({ nullable: true })
  reference: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
