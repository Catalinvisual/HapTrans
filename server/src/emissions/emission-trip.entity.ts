import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { Order } from '../orders/order.entity';
import { Truck } from '../trucks/truck.entity';
import { numericTransformer } from './emission-geo.entity';

/**
 * One maintained CO2 record per trip. `inputHash` plus the calculation-run log
 * make event processing idempotent, and `isFinalized` prevents a recalculation
 * from silently overwriting a figure that has been reported.
 */
@Entity('trip_emission_records')
export class TripEmissionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  tripId: string;

  @ManyToOne(() => Trip, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tripId' })
  trip: Trip;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid', nullable: true })
  truckId: string | null;

  @Column({ type: 'uuid', nullable: true })
  driverId: string | null;

  @Column({ type: 'uuid', nullable: true })
  trailerId: string | null;

  /** own_fleet | subcontractor | charter */
  @Column({ type: 'varchar', length: 20, default: 'own_fleet' })
  fleetType: string;

  @Index()
  @Column({ type: 'varchar', length: 30, default: 'pending_data' })
  lifecycle: string;

  @Column({ type: 'varchar', length: 40, default: 'secondary_estimation_factor' })
  methodology: string;

  @Column({ type: 'varchar', length: 20, default: 'missing' })
  dataQuality: string;

  @Column({ type: 'varchar', length: 30, default: 'unavailable' })
  energySource: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  fuelType: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  energyUnit: string | null;

  /** Trip execution date used for all period filters. */
  @Index()
  @Column({ type: 'date', nullable: true })
  executionDate: string | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  distanceKm: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  loadedKm: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  emptyKm: number;

  @Column({ type: 'numeric', precision: 16, scale: 6, nullable: true, transformer: numericTransformer })
  energyQuantity: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  ttwKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wttKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wtwKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  co2Kg: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  gPerKm: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  gPerTonneKm: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericTransformer })
  payloadTonnes: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 3, nullable: true, transformer: numericTransformer })
  tonneKm: number | null;

  /** Sum of country segment distances, reconciled against distanceKm. */
  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericTransformer })
  segmentDistanceKm: number | null;

  @Column({ type: 'jsonb', nullable: true })
  reconciliation: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  energyBreakdown: Record<string, unknown> | null;

  @Column({ type: 'simple-array', nullable: true })
  qualityFlags: string[] | null;

  @Column({ type: 'varchar', length: 20, default: '1.0.0' })
  engineVersion: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  inputHash: string | null;

  @Column({ type: 'int', default: 0 })
  calculationCount: number;

  @Index()
  @Column({ type: 'boolean', default: false })
  isFinalized: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  finalizedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  finalizedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  correctedFromId: string | null;

  @Index()
  @Column({ type: 'timestamptz', default: () => 'now()' })
  calculatedAt: Date;

  @OneToMany(() => TripEmissionSegment, (segment) => segment.record, { cascade: true })
  segments: TripEmissionSegment[];

  @OneToMany(() => TripEmissionAllocation, (allocation) => allocation.record, { cascade: true })
  allocations: TripEmissionAllocation[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('trip_emission_segments')
@Index(['recordId', 'countryCode'])
export class TripEmissionSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recordId: string;

  @ManyToOne(() => TripEmissionRecord, (record) => record.segments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordId' })
  record: TripEmissionRecord;

  @Column({ type: 'int', default: 1 })
  sequence: number;

  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 30, default: 'stop_sequence' })
  method: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  distanceKm: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  loadedKm: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, default: 0, transformer: numericTransformer })
  emptyKm: number;

  @Column({ type: 'numeric', precision: 16, scale: 6, nullable: true, transformer: numericTransformer })
  energyQuantity: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  ttwKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wttKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wtwKgCo2e: number | null;

  @Column({ type: 'varchar', length: 20, default: 'estimated' })
  dataQuality: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** Customer/order allocation. Shares always sum to 100% and emissions to the record total. */
@Entity('trip_emission_allocations')
@Index(['recordId', 'clientId'])
export class TripEmissionAllocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  recordId: string;

  @ManyToOne(() => TripEmissionRecord, (record) => record.allocations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recordId' })
  record: TripEmissionRecord;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Order | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  clientId: string | null;

  @Column({ type: 'varchar', nullable: true })
  clientName: string | null;

  @Column({ type: 'varchar', length: 20, default: 'tonne_km' })
  basis: string;

  @Column({ type: 'numeric', precision: 8, scale: 4, default: 0, transformer: numericTransformer })
  sharePercent: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericTransformer })
  distanceKm: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericTransformer })
  payloadTonnes: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 3, nullable: true, transformer: numericTransformer })
  tonneKm: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  ttwKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wttKgCo2e: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 6, nullable: true, transformer: numericTransformer })
  wtwKgCo2e: number | null;

  @Column({ type: 'varchar', length: 20, default: 'estimated' })
  dataQuality: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** Imported fuel purchases, used for reconciliation — a purchase is not consumption. */
@Entity('fuel_transactions')
@Index(['truckId', 'occurredAt'])
export class FuelTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  truckId: string | null;

  @ManyToOne(() => Truck, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'truckId' })
  truck: Truck | null;

  @Column({ type: 'uuid', nullable: true })
  tripId: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  occurredAt: Date;

  @Column({ type: 'varchar', length: 40, default: 'DIESEL' })
  fuelType: string;

  @Column({ type: 'varchar', length: 10, default: 'L' })
  unit: string;

  @Column({ type: 'numeric', precision: 14, scale: 3, transformer: numericTransformer })
  quantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 2, nullable: true, transformer: numericTransformer })
  amount: number | null;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'varchar', length: 2, nullable: true })
  countryCode: string | null;

  @Column({ type: 'varchar', length: 2, nullable: true })
  registrationCountry: string | null;

  @Column({ type: 'varchar', nullable: true })
  plateNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalId: string | null;

  /** fuel_card | telematics | manual | telematics_charge */
  @Column({ type: 'varchar', length: 30, default: 'manual' })
  sourceType: string;

  @Column({ type: 'numeric', precision: 14, scale: 1, nullable: true, transformer: numericTransformer })
  odometerKm: number | null;

  @Index()
  @Column({ type: 'varchar', length: 20, default: 'imported' })
  status: string;

  @Column({ type: 'simple-array', nullable: true })
  anomalyFlags: string[] | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  importedByUserId: string | null;

  @Column({ type: 'uuid', nullable: true })
  correctedByUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  correctedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  correctionReason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * ECU, telematics, tank-balance or charging energy records. These sit above
 * derived consumption in the fuel hierarchy and are never created by guessing.
 */
@Entity('vehicle_energy_consumption')
@Index(['truckId', 'periodStart'])
export class VehicleEnergyConsumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @Column({ type: 'uuid' })
  truckId: string;

  @Column({ type: 'uuid', nullable: true })
  tripId: string | null;

  @Index()
  @Column({ type: 'timestamptz' })
  periodStart: Date;

  @Column({ type: 'timestamptz', nullable: true })
  periodEnd: Date | null;

  /** ecu | telematics | tank_balance | charging */
  @Column({ type: 'varchar', length: 30 })
  sourceType: string;

  @Column({ type: 'varchar', length: 40, default: 'DIESEL' })
  fuelType: string;

  @Column({ type: 'varchar', length: 10, default: 'L' })
  unit: string;

  @Column({ type: 'numeric', precision: 16, scale: 3, transformer: numericTransformer })
  energyQuantity: number;

  @Column({ type: 'numeric', precision: 14, scale: 3, nullable: true, transformer: numericTransformer })
  distanceKm: number | null;

  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'varchar', nullable: true })
  provider: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** Immutable calculation history: what was known, used and produced. */
@Entity('emission_calculation_runs')
@Index(['tripId', 'createdAt'])
export class EmissionCalculationRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  recordId: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  tripId: string | null;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  /** trip_created | trip_updated | route_changed | truck_changed | fuel_imported | manual | scheduler | report_finalize */
  @Column({ type: 'varchar', length: 40 })
  trigger: string;

  @Column({ type: 'varchar', length: 20 })
  engineVersion: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  inputHash: string | null;

  @Column({ type: 'jsonb', nullable: true })
  inputSnapshot: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  factorSnapshot: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  resultSnapshot: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  previousResultSnapshot: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  /** applied | skipped_idempotent | skipped_finalized | failed */
  @Column({ type: 'varchar', length: 30, default: 'applied' })
  status: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  countryRulesVersion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

/** Company-level configuration. Never rewrites historical results. */
@Entity('emission_settings')
export class EmissionSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  companyId: string;

  @Column({ type: 'varchar', length: 60, default: 'en_iso_14083_wtw' })
  defaultMethodology: string;

  @Column({ type: 'varchar', default: 'DEFRA_2026' })
  defaultDataset: string;

  @Column({ type: 'varchar', length: 10, default: 'kg' })
  reportingUnit: string;

  @Column({ type: 'varchar', length: 30, default: 'operational_control' })
  consolidationApproach: string;

  @Column({ type: 'boolean', default: true })
  includeSubcontractors: boolean;

  @Column({ type: 'boolean', default: true })
  autoCalculateTrips: boolean;

  /** Documented default only. Null means "no default": no emissions invented. */
  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, transformer: numericTransformer })
  defaultConsumptionPer100Km: number | null;

  @Column({ type: 'varchar', length: 30, default: 'distance' })
  emptyRunAllocation: string;

  @Column({ type: 'jsonb', nullable: true })
  dataQualityRules: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  reportSchedule: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  updatedByUserId: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
