import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { TruckDocument } from './truck-document.entity';
import { Maintenance } from '../maintenance/maintenance.entity';
import { Driver } from '../drivers/driver.entity';
import { Trailer } from './trailer.entity';

import { Company } from '../companies/company.entity';

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
