import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { Order } from './order.entity';
import { Company } from '../companies/company.entity';

export enum CargoUnit {
  PALLET = 'pallet',
  PACKAGE = 'package',
  BOX = 'box',
  CRATE = 'crate',
  ROLL = 'roll',
  MACHINE = 'machine',
  COIL = 'coil',
  CONTAINER = 'container',
  OTHER = 'other',
}

@Entity('cargo_items')
export class CargoItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  company: Company;

  @ManyToOne(() => Order, (order) => order.cargoItems, { onDelete: 'CASCADE' })
  order: Order;

  @Column({ type: 'enum', enum: CargoUnit, default: CargoUnit.PALLET })
  unit: CargoUnit;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  volumeCbm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  ldm: number; // Loading Meters (Metri Podea) — required for LTL groupage

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  lengthCm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  widthCm: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  heightCm: number;

  @Column({ type: 'int', default: 1 })
  quantity: number; // Replaces packages/pallets depending on unit

  @Column({ default: false })
  stackable: boolean;

  @Column({ default: false })
  fragile: boolean;

  @Column({ nullable: true })
  adrClass: string; // e.g. "3", "8" - null if not ADR

  @Column({ nullable: true })
  unNumber: string;

  @Column({ default: false })
  requiresTemperatureControl: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMin: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  temperatureMax: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  insuredValue: number;

  @Column({ nullable: true })
  currency: string;

  @Column({ nullable: true })
  stopRef: string; // pickup, dropoff, or extra-0, extra-1, etc.

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
