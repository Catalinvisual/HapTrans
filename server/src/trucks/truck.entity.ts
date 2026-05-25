import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Trip } from '../trips/trip.entity';
import { TruckDocument } from './truck-document.entity';
import { Maintenance } from '../maintenance/maintenance.entity';

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

  @Column({ unique: true })
  plateNumber: string;

  @Column()
  brand: string;

  @Column()
  model: string;

  @Column({ nullable: true })
  year: number;

  @Column({ nullable: true, type: 'decimal', precision: 10, scale: 2 })
  payloadCapacity: number;

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

  @OneToMany(() => TruckDocument, (doc) => doc.truck)
  documents: TruckDocument[];

  @OneToMany(() => Maintenance, (m) => m.truck)
  maintenances: Maintenance[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
