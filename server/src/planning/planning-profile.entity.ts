import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Company } from '../companies/company.entity';

export enum FirstSolutionStrategy {
  UNSET = 0,
  AUTOMATIC = 15,
  PATH_CHEAPEST_ARC = 3,
  PATH_MOST_CONSTRAINED_ARC = 4,
  EVALUATOR_STRATEGY = 5,
  SAVINGS = 10,
  SWEEP = 11,
  CHRISTOFIDES = 13,
  ALL_UNPERFORMED = 6,
  BEST_INSERTION = 7,
  PARALLEL_CHEAPEST_INSERTION = 8,
  SEQUENTIAL_CHEAPEST_INSERTION = 14,
  LOCAL_CHEAPEST_INSERTION = 9,
  LOCAL_CHEAPEST_COST_INSERTION = 16,
  GLOBAL_CHEAPEST_ARC = 1,
  LOCAL_CHEAPEST_ARC = 2,
  FIRST_UNBOUND_MIN_VALUE = 12,
}

export enum LocalSearchMetaheuristic {
  UNSET = 0,
  GUIDED_LOCAL_SEARCH = 2,
}

export enum LoadingAccess {
  REAR_ONLY = 'rear_only',
  SIDE_ONLY = 'side_only',
  REAR_AND_SIDE = 'rear_and_side',
  FULL_ACCESS = 'full_access',
}

export enum LoadingRule {
  LIFO = 'lifo',
  FIFO = 'fifo',
  FLEXIBLE = 'flexible',
  MANUAL = 'manual',
}

export enum PlanningProfileType {
  STANDARD_TRANSPORT = 'standard_transport',
  CHEAPEST_ROUTE = 'cheapest_route',
  FASTEST_DELIVERY = 'fastest_delivery',
  MAXIMUM_UTILIZATION = 'maximum_utilization',
  CUSTOMER_PRIORITY = 'customer_priority',
  EMERGENCY_PLANNING = 'emergency_planning',
}

@Entity('planning_profiles')
export class PlanningProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'enum', enum: PlanningProfileType, default: PlanningProfileType.STANDARD_TRANSPORT })
  type: PlanningProfileType;

  @Column({ type: 'boolean', default: true })
  isDefault: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Optimization weights (0-100)
  @Column({ type: 'int', default: 100 })
  weightHardConstraints: number;

  @Column({ type: 'int', default: 95 })
  weightDeliveryWindows: number;

  @Column({ type: 'int', default: 90 })
  weightPickupWindows: number;

  @Column({ type: 'int', default: 95 })
  weightVehicleCapacity: number;

  @Column({ type: 'int', default: 85 })
  weightDriverAvailability: number;

  @Column({ type: 'int', default: 70 })
  weightTotalDistance: number;

  @Column({ type: 'int', default: 65 })
  weightDrivingTime: number;

  @Column({ type: 'int', default: 60 })
  weightWaitingTime: number;

  @Column({ type: 'int', default: 55 })
  weightEmptyKilometers: number;

  @Column({ type: 'int', default: 50 })
  weightTruckUtilization: number;

  @Column({ type: 'int', default: 45 })
  weightHandlingTime: number;

  // Loading rules
  @Column({ type: 'enum', enum: LoadingAccess, default: LoadingAccess.REAR_ONLY })
  defaultLoadingAccess: LoadingAccess;

  @Column({ type: 'enum', enum: LoadingRule, default: LoadingRule.LIFO })
  defaultLoadingRule: LoadingRule;

  // Solver settings
  @Column({ type: 'int', default: 30 })
  optimizationTimeoutSeconds: number;

  @Column({ type: 'enum', enum: FirstSolutionStrategy, default: FirstSolutionStrategy.AUTOMATIC })
  firstSolutionStrategy: FirstSolutionStrategy;

  @Column({ type: 'enum', enum: LocalSearchMetaheuristic, default: LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH })
  localSearchMetaheuristic: LocalSearchMetaheuristic;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}