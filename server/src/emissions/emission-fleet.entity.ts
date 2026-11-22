import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Truck } from '../trucks/truck.entity';
import { numericTransformer } from './emission-geo.entity';

/**
 * Environmental profile of a truck. One row per truck; historical values are
 * preserved by `validFrom`/`validTo` and by never overwriting a profile that a
 * finalized calculation used (the calculation stores its own factor and input
 * snapshot, and the registry keeps a new row for a configuration change).
 */
@Entity('truck_emission_profiles')
export class TruckEmissionProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid' })
  truckId: string;

  @ManyToOne(() => Truck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'truckId' })
  truck: Truck;

  @Column({ type: 'uuid', nullable: true })
  companyId: string | null;

  /** N2 | N3 | O3 | O4 | other */
  @Column({ type: 'varchar', length: 20, nullable: true })
  vehicleCategory: string | null;

  /** Canonical energy type from trucks.fuel-type.ts. */
  @Column({ type: 'varchar', length: 40, nullable: true })
  fuelType: string | null;

  /** Euro emission class (registration document). */
  @Column({ type: 'varchar', length: 20, nullable: true })
  euroClass: string | null;

  /**
   * Official CO2 emission class for road-charging purposes. Only filled from an
   * official document; never derived from the Euro class.
   */
  @Column({ type: 'varchar', length: 10, nullable: true })
  co2Class: string | null;

  @Column({ type: 'boolean', default: false })
  co2ClassApplicable: boolean;

  /** VECTO vehicle subgroup, as declared by the manufacturer. */
  @Column({ type: 'varchar', length: 60, nullable: true })
  vectoVehicleSubgroup: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  vectoMissionProfile: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  technicalConfiguration: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, transformer: numericTransformer })
  officialCo2GKm: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, transformer: numericTransformer })
  officialEnergyConsumption: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  officialEnergyUnit: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericTransformer })
  grossVehicleWeightKg: number | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true, transformer: numericTransformer })
  payloadKg: number | null;

  @Column({ type: 'int', nullable: true })
  axleCount: number | null;

  /** Declared consumption used for the hierarchy step 4 (L/kg/kWh per 100 km). */
  @Column({ type: 'numeric', precision: 10, scale: 3, nullable: true, transformer: numericTransformer })
  declaredConsumptionPer100Km: number | null;

  @Column({ type: 'date', nullable: true })
  firstRegistrationDate: string | null;

  @Column({ type: 'varchar', nullable: true })
  dataSource: string | null;

  /** verified | unverified | missing_data | expired | requires_review */
  @Column({ type: 'varchar', length: 20, default: 'missing_data' })
  verificationStatus: string;

  @Column({ type: 'date', nullable: true })
  verifiedAt: string | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedByUserId: string | null;

  @Column({ type: 'date', nullable: true })
  validFrom: string | null;

  @Column({ type: 'date', nullable: true })
  validTo: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => TruckEmissionDocument, (doc) => doc.profile, { cascade: true })
  documents: TruckEmissionDocument[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Immutable history of environmental profile changes. A configuration change
 * never destroys the values that earlier trips were calculated with.
 */
@Entity('truck_emission_profile_versions')
@Index(['profileId', 'createdAt'])
export class TruckEmissionProfileVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  profileId: string;

  @Column({ type: 'uuid', nullable: true })
  truckId: string | null;

  @Column({ type: 'jsonb' })
  previousValues: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  changedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}

@Entity('truck_emission_documents')
export class TruckEmissionDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  profileId: string;

  @ManyToOne(() => TruckEmissionProfile, (profile) => profile.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'profileId' })
  profile: TruckEmissionProfile;

  /** coc | vecto | registration | co2_class | fuel_energy | other */
  @Column({ type: 'varchar', length: 40 })
  documentType: string;

  @Column({ type: 'varchar', nullable: true })
  documentNumber: string | null;

  @Column({ type: 'date', nullable: true })
  issuedAt: string | null;

  @Column({ type: 'date', nullable: true })
  expiresAt: string | null;

  @Column({ type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'date', nullable: true })
  verifiedAt: string | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedByUserId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
