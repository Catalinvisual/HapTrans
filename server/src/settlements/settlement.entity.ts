import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Driver } from '../drivers/driver.entity';

export enum SettlementStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  PAID = 'paid',
}

@Entity('settlements')
export class Settlement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Driver, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'driverId' })
  driver: Driver;

  @Column()
  driverName: string;

  @Column()
  month: number;

  @Column()
  year: number;

  @Column({ type: 'varchar', default: 'per_km' })
  payMode: string; // per_km | percent

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  payRate: number;

  @Column({ type: 'int', default: 0 })
  tripCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDistance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  grossPay: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  advances: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  deductions: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  netPay: number;

  @Column({ type: 'enum', enum: SettlementStatus, default: SettlementStatus.DRAFT })
  status: SettlementStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'simple-json', nullable: true })
  trips: any[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
