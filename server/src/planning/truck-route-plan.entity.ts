import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, Index } from 'typeorm';
import { Company } from '../companies/company.entity';
import { Truck } from '../trucks/truck.entity';
import { Driver } from '../drivers/driver.entity';
import { RoutePlanStop } from './route-plan-stop.entity';
import { Trip } from '../trips/trip.entity';

export enum RouteFeasibilityStatus {
  FEASIBLE = 'feasible',
  WARNING = 'warning',
  CONFLICT = 'conflict',
  NO_SOLUTION = 'no_solution',
}

@Entity('truck_route_plans')
@Index(['truckId', 'planningDate'])
@Index(['tripId', 'version'])
export class TruckRoutePlan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Truck, { onDelete: 'CASCADE' })
  truck: Truck;

  @Column()
  truckId: string;

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  driver: Driver;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @ManyToOne(() => Trip, { nullable: true, onDelete: 'SET NULL' })
  trip: Trip;

  @Column({ type: 'uuid', nullable: true })
  tripId: string | null;

  @Column({ type: 'date' })
  planningDate: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'boolean', default: false })
  isCurrent: boolean;

  @Column({ type: 'boolean', default: false })
  isOptimized: boolean;

  @Column({ type: 'enum', enum: RouteFeasibilityStatus, default: RouteFeasibilityStatus.FEASIBLE })
  feasibilityStatus: RouteFeasibilityStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalDistanceKm: number;

  @Column({ type: 'int', default: 0 })
  totalDrivingTimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalServiceTimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalWaitingTimeMinutes: number;

  @Column({ type: 'int', default: 0 })
  totalDurationMinutes: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  optimizationScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedOperatingCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  emptyKilometers: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  loadedKilometers: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxPallets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxWeightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxLdm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  maxVolumeCbm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  peakPallets: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  peakWeightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  peakLdm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  peakVolumeCbm: number;

  @Column({ type: 'int', default: 0 })
  stopCount: number;

  @Column({ type: 'int', default: 0 })
  pickupCount: number;

  @Column({ type: 'int', default: 0 })
  deliveryCount: number;

  @Column({ type: 'jsonb', nullable: true })
  conflicts: any[];

  @Column({ type: 'jsonb', nullable: true })
  warnings: any[];

  @Column({ type: 'jsonb', nullable: true })
  optimizationMetadata: any;

  @Column({ nullable: true })
  optimizedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  optimizedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => RoutePlanStop, (stop) => stop.routePlan, { cascade: true, eager: true })
  stops: RoutePlanStop[];
}