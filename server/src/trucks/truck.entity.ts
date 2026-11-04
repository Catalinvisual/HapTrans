import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { TruckDocument } from './truck-document.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { Driver } from '../drivers/driver.entity';
import { Trailer } from './trailer.entity';
import { LoadingAccess, LoadingRule } from '../planning/planning-profile.entity';

import { Company } from '../companies/company.entity';
import { TruckFuelType, fuelTypeTransformer } from './fuel-type';

export enum TruckStatus {
  ACTIVE = 'active',
  IN_TRIP = 'in_trip',
  MAINTENANCE = 'maintenance',
  INACTIVE = 'inactive',
}

@Entity('trucks')
export class Truck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @Column({ unique: true })
  plateNumber: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true, length: 17 })
  vin: string | null;

  @Column({ nullable: true, length: 2 })
  registrationCountry: string | null;

  @Column({ nullable: true })
  truckType: string; // e.g. Tautliner, Frigo, Box, Mega

  @Column({ nullable: true })
  euronorm: string; // e.g. Euro 5, Euro 6

  @Column('simple-array', { nullable: true })
  features: string[]; // e.g. ['ADR', 'Lift', 'Frigo']

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  payloadCapacity: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maxWeightKg: number; // e.g. 24000

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maxLdm: number; // e.g. 13.6 Loading Meters

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maxVolumeCbm: number; // e.g. 90

  @Column({ nullable: true, type: 'int' })
  maxPallets: number; // e.g. 33

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  heightCm: number; // external height, for bridge/tunnel routing

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  widthCm: number; // external width, for width-restricted routing

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  lengthCm: number; // total combination length in cm

  @Column({ nullable: true, type: 'int' })
  axleCount: number; // used by toll and truck routing profiles

  @Column({ nullable: true, type: 'varchar', transformer: fuelTypeTransformer })
  fuelType: TruckFuelType | null; // canonical energy type; null for legacy records

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 3 })
  fuelPricePerLiter: number; // optional company-negotiated price, EUR/l

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  maintenanceCostPerKm: number; // EUR/km

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  fixedCostPerDay: number; // leasing/insurance/road tax, EUR/day

  @Column({ type: 'enum', enum: LoadingAccess, nullable: true })
  loadingAccess: LoadingAccess; // how the trailer is loaded/unloaded (rear, side, …)

  @Column({ type: 'enum', enum: LoadingRule, nullable: true })
  loadingRule: LoadingRule; // LIFO/FIFO rule for the loading sequence

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  costPerKm: number; // For profit margin calculation

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  fuelConsumption: number;

  @Column({ type: 'enum', enum: TruckStatus, default: TruckStatus.ACTIVE })
  status: TruckStatus;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  currentLat: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 6 })
  currentLng: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalMileage: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2, default: 50000 })
  nextMaintenanceMileage: number;

  @OneToMany(() => Trip, (trip) => trip.truck)
  trips: Trip[];

  @ManyToOne(() => Driver, { nullable: true, onDelete: 'SET NULL' })
  driver: Driver;

  @ManyToOne(() => Trailer, { nullable: true, onDelete: 'SET NULL' })
  trailer: Trailer;

  @OneToMany(() => TruckDocument, (doc) => doc.truck)
  documents: TruckDocument[];

  @OneToMany(() => Maintenance, (m) => m.truck)
  maintenances: Maintenance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
