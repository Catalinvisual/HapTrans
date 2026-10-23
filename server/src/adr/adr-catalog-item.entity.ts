import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { AdrCatalogVersion } from './adr-catalog-version.entity';

@Entity('adr_catalog_items')
@Index(['unNumber', 'packingGroup'])
@Index(['unNumberNumeric'])
@Index(['adrClass'])
export class AdrCatalogItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdrCatalogVersion, (version) => version.items, { onDelete: 'CASCADE' })
  version: AdrCatalogVersion;

  @Column()
  unNumber: string; // e.g. "UN 1203"

  @Column({ type: 'int' })
  unNumberNumeric: number; // e.g. 1203

  @Column({ type: 'varchar', length: 500 })
  properShippingNameEn: string; // "MOTOR SPIRIT or GASOLINE or PETROL"

  @Column({ type: 'varchar', length: 500 })
  properShippingNameRo: string; // "BENZINĂ PENTRU MOTOARE sau BENZINĂ"

  @Column({ type: 'varchar', length: 500, nullable: true })
  properShippingNameDe: string; // "MOTORBENZIN oder BENZIN"

  @Column({ type: 'varchar', length: 500, nullable: true })
  properShippingNameFr: string; // "ESSENCE POUR MOTEURS ou CARBURANT AUTO"

  @Column({ type: 'varchar', length: 500, nullable: true })
  properShippingNameNl: string; // "MOTORBENZINE of BENZINE"

  @Column({ type: 'varchar', length: 500, nullable: true })
  properShippingNameEs: string; // "GASOLINA o COMBUSTIBLE PARA MOTORES"

  @Column({ type: 'varchar', length: 500, nullable: true })
  properShippingNamePl: string; // "PALIWO DO SILNIKÓW lub BENZYNA"

  @Column({ length: 20 })
  adrClass: string; // "3", "2.1", "1.1D", "8", etc.

  @Column({ length: 20, nullable: true })
  classificationCode: string; // "F1", "5F", "1.1D", "M6"

  @Column({ length: 10, nullable: true })
  packingGroup: string; // "I", "II", "III", or null

  @Column({ length: 50, nullable: true })
  dangerLabels: string; // "3", "2.1", "6.1+8"

  @Column({ type: 'text', nullable: true })
  specialProvisions: string; // "188, 230, 310, 348, 376, 377, 384, 387, 390"

  @Column({ length: 50, default: '0' })
  limitedQuantity: string; // "1 L", "5 L", "0", "500 ml"

  @Column({ type: 'int', default: 0 })
  limitedQuantityGramsOrMl: number; // numeric limit for automatic validation (ml or grams)

  @Column({ length: 10, default: 'E0' })
  exceptedQuantity: string; // "E0", "E1", "E2", "E3", "E4", "E5"

  @Column({ length: 100, nullable: true })
  packingInstructions: string; // "P001, IBC02, R001"

  @Column({ length: 100, nullable: true })
  specialPackingProvisions: string; // "PP1, BB2"

  @Column({ length: 50, nullable: true })
  mixedPacking: string; // "MP19"

  @Column({ length: 50, nullable: true })
  portableTanksInstructions: string; // "T4"

  @Column({ length: 100, nullable: true })
  portableTanksSpecialProvisions: string; // "TP1, TP29"

  @Column({ length: 50, nullable: true })
  adrTankCode: string; // "LGBF", "L4BN"

  @Column({ length: 100, nullable: true })
  adrTankSpecialProvisions: string; // "TU9, TC2, TE14"

  @Column({ length: 50, nullable: true })
  vehicleForTankCarriage: string; // "FL", "AT", "EX/II", "EX/III"

  @Column({ type: 'int', default: 3 })
  transportCategory: number; // 0, 1, 2, 3, 4

  @Column({ length: 20, nullable: true })
  tunnelRestrictionCode: string; // "(D/E)", "(E)", "(B/D)"

  @Column({ length: 50, nullable: true })
  specialProvisionsPackages: string; // "V12"

  @Column({ length: 50, nullable: true })
  specialProvisionsBulk: string; // "VC1, VC2, AP1"

  @Column({ length: 100, nullable: true })
  specialProvisionsHandling: string; // "CW13, CW28, CW31"

  @Column({ length: 50, nullable: true })
  specialProvisionsOperation: string; // "S2, S20"

  @Column({ length: 20, nullable: true })
  hazardIdentificationNumber: string; // Kemler code e.g. "33", "30", "X88"

  @Column({ default: false })
  technicalNameRequired: boolean; // True if SP 274 applies

  @Column({ nullable: true })
  batteryCategory: string; // 'lithium_ion' | 'lithium_metal' | 'sodium_ion' | 'lead_acid' | null

  @Column({ default: false })
  temperatureControlRequired: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  controlTemperature: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  emergencyTemperature: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
