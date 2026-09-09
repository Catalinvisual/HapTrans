import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { Company } from '../companies/company.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';
import { Order } from '../orders/order.entity';

export enum RouteStopType {
  PICKUP = 'pickup',
  DELIVERY = 'delivery',
}

export enum RouteStopStatus {
  PENDING = 'pending',
  ARRIVED = 'arrived',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

@Entity('route_plan_stops')
@Index(['routePlanId', 'sequence'])
@Index(['shipmentId', 'type'])
export class RoutePlanStop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => TruckRoutePlan, (plan) => plan.stops, { onDelete: 'CASCADE' })
  routePlan: TruckRoutePlan;

  @Column()
  routePlanId: string;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  order: Order;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  shipmentId: string;

  @Column({ type: 'enum', enum: RouteStopType })
  type: RouteStopType;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ nullable: true })
  locationId: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  companyName: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  longitude: number;

  @Column({ type: 'date', nullable: true })
  scheduledDate: string;

  @Column({ type: 'timestamp', nullable: true })
  timeWindowStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  timeWindowEnd: Date;

  @Column({ type: 'boolean', default: false })
  timeWindowSoft: boolean;

  @Column({ type: 'timestamp', nullable: true })
  eta: Date;

  @Column({ type: 'timestamp', nullable: true })
  etd: Date;

  @Column({ type: 'int', default: 0 })
  serviceDurationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pallets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  weightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loadingMeters: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  volumeCbm: number;

  @Column({ type: 'enum', enum: RouteStopStatus, default: RouteStopStatus.PENDING })
  status: RouteStopStatus;

  @Column({ type: 'boolean', default: false })
  locked: boolean;

  @Column({ type: 'boolean', default: false })
  lockedSequence: boolean;

  @Column({ nullable: true })
  specialRequirements: string;

  @Column({ type: 'jsonb', nullable: true })
  warnings: any[];

  @Column({ type: 'jsonb', nullable: true })
  errors: any[];

  // Load tracking (cumulative after this stop)
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cumulativePallets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cumulativeWeightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cumulativeLdm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  cumulativeVolumeCbm: number;

  // Loading sequence (for LIFO/FIFO)
  @Column({ type: 'int', nullable: true })
  loadingSequence: number;

  @Column({ nullable: true })
  loadingZone: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}