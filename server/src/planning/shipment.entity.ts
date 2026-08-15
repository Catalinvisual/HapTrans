import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, Index } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Order } from '../orders/order.entity';
import { Client } from '../clients/client.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { TruckRoutePlan } from './truck-route-plan.entity';

export enum ShipmentStatus {
  PLANNED = 'planned',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('shipments')
@Index(['orderId'])
@Index(['truckRoutePlanId'])
@Index(['status'])
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @OneToOne(() => Order, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ unique: true })
  orderId: string;

  @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
  client: Client;

  @Column({ nullable: true })
  clientId: string;

  @ManyToOne(() => TruckRoutePlan, { nullable: true, onDelete: 'SET NULL' })
  truckRoutePlan: TruckRoutePlan;

  @Column({ nullable: true })
  truckRoutePlanId: string;

  @Column({ type: 'enum', enum: ShipmentStatus, default: ShipmentStatus.PLANNED })
  status: ShipmentStatus;

  @Column({ type: 'int', default: 0 })
  priority: number;

  // Pickup details (snapshot from OrderStop)
  @Column({ nullable: true })
  pickupLocationId: string;

  @Column({ nullable: true })
  pickupAddress: string;

  @Column({ nullable: true })
  pickupCompanyName: string;

  @Column({ nullable: true })
  pickupCity: string;

  @Column({ nullable: true })
  pickupCountry: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  pickupLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  pickupLongitude: number;

  @Column({ type: 'date', nullable: true })
  pickupDate: string;

  @Column({ type: 'timestamp', nullable: true })
  pickupTimeWindowStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  pickupTimeWindowEnd: Date;

  @Column({ type: 'boolean', default: false })
  pickupTimeWindowSoft: boolean;

  @Column({ type: 'int', default: 30 })
  pickupDurationMinutes: number;

  // Delivery details (snapshot from OrderStop)
  @Column({ nullable: true })
  deliveryLocationId: string;

  @Column({ nullable: true })
  deliveryAddress: string;

  @Column({ nullable: true })
  deliveryCompanyName: string;

  @Column({ nullable: true })
  deliveryCity: string;

  @Column({ nullable: true })
  deliveryCountry: string;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  deliveryLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
  deliveryLongitude: number;

  @Column({ type: 'date', nullable: true })
  deliveryDate: string;

  @Column({ type: 'timestamp', nullable: true })
  deliveryTimeWindowStart: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveryTimeWindowEnd: Date;

  @Column({ type: 'boolean', default: false })
  deliveryTimeWindowSoft: boolean;

  @Column({ type: 'int', default: 30 })
  deliveryDurationMinutes: number;

  // Cargo details
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  pallets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  weightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loadingMeters: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  volumeCbm: number;

  @Column({ type: 'boolean', default: true })
  stackable: boolean;

  @Column({ nullable: true })
  loadingRule: string;

  @Column({ nullable: true })
  unloadingRule: string;

  @Column({ nullable: true })
  specialHandling: string;

  @Column({ type: 'jsonb', nullable: true })
  vehicleRequirements: string[];

  @Column({ type: 'jsonb', nullable: true })
  driverRequirements: string[];

  @Column({ type: 'boolean', default: false })
  locked: boolean;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  // References to route plan stops
  @OneToOne(() => RoutePlanStop, { nullable: true })
  pickupStop: RoutePlanStop;

  @Column({ nullable: true })
  pickupStopId: string;

  @OneToOne(() => RoutePlanStop, { nullable: true })
  deliveryStop: RoutePlanStop;

  @Column({ nullable: true })
  deliveryStopId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}