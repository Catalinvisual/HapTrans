import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Postgres returns numeric/decimal columns as strings. The whole emissions
 * module needs real numbers for arithmetic, so every numeric column uses this
 * transformer and null stays null (a missing factor is never coerced to 0).
 */
export const numericTransformer = {
  to: (value: number | null | undefined): number | null =>
    value === null || value === undefined || Number.isNaN(Number(value)) ? null : Number(value),
  from: (value: string | number | null): number | null =>
    value === null || value === undefined || value === '' ? null : Number(value),
};

@Entity('emission_countries')
export class EmissionCountry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 2 })
  code: string;

  @Column({ type: 'varchar', length: 3 })
  iso3: string;

  /** Localised names: ro, en, nl, de, fr, es, pl. */
  @Column({ type: 'jsonb' })
  names: Record<string, string>;

  @Column({ type: 'varchar', length: 3, default: 'EUR' })
  currency: string;

  @Column({ type: 'boolean', default: false })
  euMember: boolean;

  @Column({ type: 'varchar', length: 20, default: 'europe' })
  region: string;

  @Column({ type: 'varchar', length: 10, default: 'km' })
  distanceUnit: string;

  @Column({ type: 'varchar', length: 10, default: 'kg' })
  weightUnit: string;

  /** Name of the national road-charging scheme, or null when none recorded. */
  @Column({ type: 'varchar', nullable: true })
  roadChargingSystem: string | null;

  /** distance | time | distance_time | network_concession | none | unknown */
  @Column({ type: 'varchar', length: 30, default: 'unknown' })
  roadChargingBasis: string;

  /** applicable | not_applicable | unverified */
  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  co2ClassStatus: string;

  @Column({ type: 'boolean', nullable: true })
  euroClassBasis: boolean | null;

  @Column({ type: 'varchar', nullable: true })
  chargingOperator: string | null;

  @Column({ type: 'text', nullable: true })
  chargingNotes: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'date', nullable: true })
  lastVerifiedAt: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Emission factor registry. Every row must be traceable to a published source;
 * the factor value alone is never sufficient evidence.
 */
@Entity('emission_factors')
@Index(['fuelType', 'geographicScope', 'activityType'])
export class EmissionFactor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  code: string;

  /** fuel | distance */
  @Column({ type: 'varchar', length: 20, default: 'fuel' })
  activityType: string;

  @Column({ type: 'varchar', length: 40 })
  fuelType: string;

  /** L | kg | kWh | km */
  @Column({ type: 'varchar', length: 10 })
  energyUnit: string;

  /** ISO country code, EU, or GLOBAL. */
  @Column({ type: 'varchar', length: 10, default: 'GLOBAL' })
  geographicScope: string;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true, transformer: numericTransformer })
  ttwKgCo2ePerUnit: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true, transformer: numericTransformer })
  wttKgCo2ePerUnit: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true, transformer: numericTransformer })
  co2KgPerUnit: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true, transformer: numericTransformer })
  ch4KgPerUnit: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 8, nullable: true, transformer: numericTransformer })
  n2oKgPerUnit: number | null;

  @Column({ type: 'varchar', default: 'DEFRA 2026' })
  datasetVersion: string;

  @Column({ type: 'varchar' })
  source: string;

  @Column({ type: 'text', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'varchar', default: 'tank_to_wheel_and_well_to_tank' })
  methodology: string;

  @Column({ type: 'varchar', length: 20, default: 'verified' })
  verificationStatus: string;

  @Column({ type: 'text', nullable: true })
  applicabilityNote: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** Country-specific emission accounting characteristics (not tolling). */
@Entity('country_emission_rules')
export class CountryEmissionRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar', length: 40, default: 'heavy_goods_vehicle' })
  vehicleCategory: string;

  @Column({ type: 'boolean', default: false })
  co2ClassApplicable: boolean;

  @Column({ type: 'boolean', nullable: true })
  euroClassApplicable: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  axleWeightRules: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  alternativeFuelRules: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', nullable: true })
  sourceUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Road charging rules — deliberately separate from emission factors and from
 * country emission rules. A toll class is not an emission result.
 */
@Entity('country_road_charging_rules')
@Index(['countryCode', 'effectiveFrom'])
export class CountryRoadChargingRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 2 })
  countryCode: string;

  @Column({ type: 'varchar' })
  systemName: string;

  @Column({ type: 'varchar', length: 30 })
  chargingBasis: string;

  @Column({ type: 'simple-array', nullable: true })
  vehicleCategories: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  co2Classes: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  euroClasses: string[] | null;

  @Column({ type: 'boolean', nullable: true })
  co2ClassApplicable: boolean | null;

  /** Tariff values are only stored when transcribed from an official source. */
  @Column({ type: 'jsonb', nullable: true })
  tariff: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true })
  operatorName: string | null;

  @Column({ type: 'text', nullable: true })
  officialUrl: string | null;

  @Column({ type: 'text', nullable: true })
  requirements: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: string | null;

  @Column({ type: 'date', nullable: true })
  effectiveTo: string | null;

  @Column({ type: 'date', nullable: true })
  lastVerifiedAt: string | null;

  @Column({ type: 'date', nullable: true })
  nextReviewAt: string | null;

  @Column({ type: 'varchar', length: 20, default: 'unverified' })
  verificationStatus: string;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

/** Legal and methodological source registry. */
@Entity('emission_regulatory_sources')
export class EmissionRegulatorySource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'varchar' })
  jurisdiction: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'text' })
  officialUrl: string;

  @Column({ type: 'simple-array', nullable: true })
  vehicleCategories: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  fuelTypes: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  reportingScopes: string[] | null;

  @Column({ type: 'date', nullable: true })
  effectiveDate: string | null;

  @Column({ type: 'date', nullable: true })
  applicationDate: string | null;

  @Column({ type: 'date', nullable: true })
  replacementDate: string | null;

  @Column({ type: 'date', nullable: true })
  lastVerifiedAt: string | null;

  @Column({ type: 'date', nullable: true })
  nextReviewAt: string | null;

  @Column({ type: 'varchar', default: '1.0' })
  version: string;

  @Column({ type: 'text' })
  requirements: string;

  @Column({ type: 'varchar', length: 20, default: 'needs_review' })
  verificationStatus: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
