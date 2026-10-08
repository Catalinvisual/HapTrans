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
  adrClass: string; // e.g. "1", "2.1", "3", "4.1", "5.1", "6.1", "7", "8", "9"

  @Column({ nullable: true })
  unNumber: string; // e.g. "UN 1203"

  @Column({ nullable: true })
  properShippingName: string; // e.g. "GASOLINE"

  @Column({ nullable: true })
  packingGroup: string; // "I", "II", "III"

  @Column({ nullable: true })
  tunnelRestrictionCode: string; // "B", "C", "D", "E", "B/D", "C/E"

  @Column({ type: 'int', nullable: true })
  transportCategory: number; // 0, 1, 2, 3, 4

  @Column({ default: false })
  limitedQuantity: boolean; // LQ (exemptions apply under threshold)

  @Column({ default: false })
  exceptedQuantity: boolean; // EQ

  @Column({ default: false })
  environmentalHazard: boolean;

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
