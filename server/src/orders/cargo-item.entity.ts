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

  @Column({ nullable: true })
  technicalName: string; // e.g. "contains ethanol" (SP 274)

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adrPoints: number; // calculated points under 1.1.3.6

  @Column({ type: 'int', nullable: true })
  adrFactor: number; // multiplier factor: 50, 20, 3, 1, 0

  @Column({ nullable: true })
  adrExemptionType: string; // 'none' | '1.1.3.6' | 'lq' | 'eq' | 'sp188' | 'empty_uncleaned' | 'special_provision'

  @Column({ nullable: true, type: 'text' })
  adrExemptionDetails: string;

  @Column({ nullable: true, default: 'needs_review' })
  adrStatus: string; // 'needs_review' | 'confirmed' | 'exempt_1136' | 'limited_quantity' | 'excepted_quantity' | 'ineligible'

  @Column({ nullable: true })
  adrClassificationCode: string;

  @Column({ nullable: true })
  adrDangerLabels: string;

  @Column({ nullable: true, type: 'text' })
  adrSpecialProvisions: string;

  @Column({ nullable: true })
  adrPackagingCode: string; // e.g. "4G", "1A1", "IBC02"

  @Column({ nullable: true })
  adrPackagingDescription: string; // e.g. "Fibreboard boxes", "Steel drums"

  @Column({ type: 'int', nullable: true })
  adrPackagingCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adrNetMassKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adrGrossMassKg: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  adrVolumeLiters: number;

  @Column({ type: 'varchar', default: 'packages' })
  adrTransportType: string; // 'packages' | 'bulk' | 'tank'

  @Column({ nullable: true, type: 'text' })
  adrBatteryDetails: string; // JSON: chemistry, condition, Wh, gramsLi, equipmentPackaging

  @Column({ default: false })
  adrWaste: boolean; // True for hazardous waste (ADR 5.4.1.1.3)

  @Column({ default: false })
  adrEmptyUncleaned: boolean; // Empty uncleaned packagings / tanks (ADR 5.4.1.1.6)

  @Column({ default: false })
  adrRequiresVerification: boolean;

  @Column({ nullable: true, type: 'text' })
  adrVerificationReason: string;

  @Column({ nullable: true, type: 'text' })
  adrDeclarationText: string; // Official ADR 5.4 transport doc line

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
