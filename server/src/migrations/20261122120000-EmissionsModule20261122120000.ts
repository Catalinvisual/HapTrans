import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * CO2 & Environmental Management schema.
 *
 * All tables are additive; no existing table is altered. Emission data is kept
 * in its own namespace so Fleet, Trips and Portal behaviour is unchanged.
 */
export class EmissionsModule20261122120000 implements MigrationInterface {
  name = 'EmissionsModule20261122120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_countries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar(2) NOT NULL,
        "iso3" varchar(3) NOT NULL,
        "names" jsonb NOT NULL,
        "currency" varchar(3) NOT NULL DEFAULT 'EUR',
        "euMember" boolean NOT NULL DEFAULT false,
        "region" varchar(20) NOT NULL DEFAULT 'europe',
        "distanceUnit" varchar(10) NOT NULL DEFAULT 'km',
        "weightUnit" varchar(10) NOT NULL DEFAULT 'kg',
        "roadChargingSystem" varchar,
        "roadChargingBasis" varchar(30) NOT NULL DEFAULT 'unknown',
        "co2ClassStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "euroClassBasis" boolean,
        "chargingOperator" varchar,
        "chargingNotes" text,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "lastVerifiedAt" date,
        "effectiveFrom" date,
        "effectiveTo" date,
        "version" varchar(20) NOT NULL DEFAULT '1.0',
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_countries" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_emission_countries_code" ON "emission_countries" ("code")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_factors" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL,
        "activityType" varchar(20) NOT NULL DEFAULT 'fuel',
        "fuelType" varchar(40) NOT NULL,
        "energyUnit" varchar(10) NOT NULL,
        "geographicScope" varchar(10) NOT NULL DEFAULT 'GLOBAL',
        "ttwKgCo2ePerUnit" numeric(18,8),
        "wttKgCo2ePerUnit" numeric(18,8),
        "co2KgPerUnit" numeric(18,8),
        "ch4KgPerUnit" numeric(18,8),
        "n2oKgPerUnit" numeric(18,8),
        "datasetVersion" varchar NOT NULL DEFAULT 'DEFRA 2026',
        "source" varchar NOT NULL,
        "sourceUrl" text,
        "effectiveFrom" date,
        "effectiveTo" date,
        "methodology" varchar NOT NULL DEFAULT 'tank_to_wheel_and_well_to_tank',
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'verified',
        "applicabilityNote" text,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_factors" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_emission_factors_code" ON "emission_factors" ("code")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emission_factors_lookup" ON "emission_factors" ("fuelType", "geographicScope", "activityType")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "country_emission_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "countryCode" varchar(2) NOT NULL,
        "vehicleCategory" varchar(40) NOT NULL DEFAULT 'heavy_goods_vehicle',
        "co2ClassApplicable" boolean NOT NULL DEFAULT false,
        "euroClassApplicable" boolean,
        "axleWeightRules" jsonb,
        "alternativeFuelRules" jsonb,
        "notes" text,
        "sourceUrl" varchar,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "effectiveFrom" date,
        "effectiveTo" date,
        "version" varchar(20) NOT NULL DEFAULT '1.0',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_country_emission_rules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_country_emission_rules_country" ON "country_emission_rules" ("countryCode")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "country_road_charging_rules" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "countryCode" varchar(2) NOT NULL,
        "systemName" varchar NOT NULL,
        "chargingBasis" varchar(30) NOT NULL,
        "vehicleCategories" text,
        "co2Classes" text,
        "euroClasses" text,
        "co2ClassApplicable" boolean,
        "tariff" jsonb,
        "operatorName" varchar,
        "officialUrl" text,
        "requirements" text,
        "effectiveFrom" date,
        "effectiveTo" date,
        "lastVerifiedAt" date,
        "nextReviewAt" date,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "version" varchar(20) NOT NULL DEFAULT '1.0',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_country_road_charging_rules" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_road_charging_country_effective" ON "country_road_charging_rules" ("countryCode", "effectiveFrom")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_regulatory_sources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL,
        "jurisdiction" varchar NOT NULL,
        "name" varchar NOT NULL,
        "officialUrl" text NOT NULL,
        "vehicleCategories" text,
        "fuelTypes" text,
        "reportingScopes" text,
        "effectiveDate" date,
        "applicationDate" date,
        "replacementDate" date,
        "lastVerifiedAt" date,
        "nextReviewAt" date,
        "version" varchar NOT NULL DEFAULT '1.0',
        "requirements" text NOT NULL,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'needs_review',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_regulatory_sources" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_emission_regulatory_sources_code" ON "emission_regulatory_sources" ("code")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "truck_emission_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "truckId" uuid NOT NULL,
        "companyId" uuid,
        "vehicleCategory" varchar(20),
        "fuelType" varchar(40),
        "euroClass" varchar(20),
        "co2Class" varchar(10),
        "co2ClassApplicable" boolean NOT NULL DEFAULT false,
        "vectoVehicleSubgroup" varchar(60),
        "vectoMissionProfile" varchar(60),
        "technicalConfiguration" varchar(60),
        "officialCo2GKm" numeric(10,3),
        "officialEnergyConsumption" numeric(10,3),
        "officialEnergyUnit" varchar(20),
        "grossVehicleWeightKg" numeric(10,2),
        "payloadKg" numeric(10,2),
        "axleCount" integer,
        "declaredConsumptionPer100Km" numeric(10,3),
        "firstRegistrationDate" date,
        "dataSource" varchar,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'missing_data',
        "verifiedAt" date,
        "verifiedByUserId" uuid,
        "validFrom" date,
        "validTo" date,
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_truck_emission_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_truck_emission_profiles_truck" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_truck_emission_profiles_truck" ON "truck_emission_profiles" ("truckId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "truck_emission_profile_versions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profileId" uuid NOT NULL,
        "truckId" uuid,
        "previousValues" jsonb NOT NULL,
        "newValues" jsonb,
        "changedByUserId" uuid,
        "reason" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_truck_emission_profile_versions" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_profile_versions_profile_created" ON "truck_emission_profile_versions" ("profileId", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "truck_emission_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "profileId" uuid NOT NULL,
        "documentType" varchar(40) NOT NULL,
        "documentNumber" varchar,
        "issuedAt" date,
        "expiresAt" date,
        "fileUrl" text,
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "verifiedAt" date,
        "uploadedByUserId" uuid,
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_truck_emission_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_truck_emission_documents_profile" FOREIGN KEY ("profileId") REFERENCES "truck_emission_profiles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_truck_emission_documents_profile" ON "truck_emission_documents" ("profileId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_emission_records" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tripId" uuid NOT NULL,
        "companyId" uuid,
        "truckId" uuid,
        "driverId" uuid,
        "trailerId" uuid,
        "fleetType" varchar(20) NOT NULL DEFAULT 'own_fleet',
        "lifecycle" varchar(30) NOT NULL DEFAULT 'pending_data',
        "methodology" varchar(40) NOT NULL DEFAULT 'secondary_estimation_factor',
        "dataQuality" varchar(20) NOT NULL DEFAULT 'missing',
        "energySource" varchar(30) NOT NULL DEFAULT 'unavailable',
        "fuelType" varchar(40),
        "energyUnit" varchar(10),
        "executionDate" date,
        "distanceKm" numeric(14,3) NOT NULL DEFAULT 0,
        "loadedKm" numeric(14,3) NOT NULL DEFAULT 0,
        "emptyKm" numeric(14,3) NOT NULL DEFAULT 0,
        "energyQuantity" numeric(16,6),
        "ttwKgCo2e" numeric(18,6),
        "wttKgCo2e" numeric(18,6),
        "wtwKgCo2e" numeric(18,6),
        "co2Kg" numeric(18,6),
        "gPerKm" numeric(18,6),
        "gPerTonneKm" numeric(18,6),
        "payloadTonnes" numeric(14,3),
        "tonneKm" numeric(18,3),
        "segmentDistanceKm" numeric(14,3),
        "reconciliation" jsonb,
        "energyBreakdown" jsonb,
        "qualityFlags" text,
        "engineVersion" varchar(20) NOT NULL DEFAULT '1.0.0',
        "inputHash" varchar(40),
        "calculationCount" integer NOT NULL DEFAULT 0,
        "isFinalized" boolean NOT NULL DEFAULT false,
        "finalizedAt" timestamptz,
        "finalizedByUserId" uuid,
        "verifiedAt" timestamptz,
        "correctedFromId" uuid,
        "calculatedAt" timestamptz NOT NULL DEFAULT now(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_emission_records" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_emission_records_trip" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_trip_emission_records_trip" ON "trip_emission_records" ("tripId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_records_company_date" ON "trip_emission_records" ("companyId", "executionDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_records_lifecycle" ON "trip_emission_records" ("lifecycle")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_records_finalized" ON "trip_emission_records" ("isFinalized")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_emission_segments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recordId" uuid NOT NULL,
        "sequence" integer NOT NULL DEFAULT 1,
        "countryCode" varchar(2) NOT NULL,
        "method" varchar(30) NOT NULL DEFAULT 'stop_sequence',
        "distanceKm" numeric(14,3) NOT NULL DEFAULT 0,
        "loadedKm" numeric(14,3) NOT NULL DEFAULT 0,
        "emptyKm" numeric(14,3) NOT NULL DEFAULT 0,
        "energyQuantity" numeric(16,6),
        "ttwKgCo2e" numeric(18,6),
        "wttKgCo2e" numeric(18,6),
        "wtwKgCo2e" numeric(18,6),
        "dataQuality" varchar(20) NOT NULL DEFAULT 'estimated',
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_emission_segments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_emission_segments_record" FOREIGN KEY ("recordId") REFERENCES "trip_emission_records"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_segments_record_country" ON "trip_emission_segments" ("recordId", "countryCode")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trip_emission_allocations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recordId" uuid NOT NULL,
        "orderId" uuid,
        "clientId" uuid,
        "clientName" varchar,
        "basis" varchar(20) NOT NULL DEFAULT 'tonne_km',
        "sharePercent" numeric(8,4) NOT NULL DEFAULT 0,
        "distanceKm" numeric(14,3),
        "payloadTonnes" numeric(14,3),
        "tonneKm" numeric(18,3),
        "ttwKgCo2e" numeric(18,6),
        "wttKgCo2e" numeric(18,6),
        "wtwKgCo2e" numeric(18,6),
        "dataQuality" varchar(20) NOT NULL DEFAULT 'estimated',
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trip_emission_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trip_emission_allocations_record" FOREIGN KEY ("recordId") REFERENCES "trip_emission_records"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_trip_emission_allocations_order" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_allocations_record_client" ON "trip_emission_allocations" ("recordId", "clientId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_emission_allocations_client" ON "trip_emission_allocations" ("clientId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "fuel_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "truckId" uuid,
        "tripId" uuid,
        "occurredAt" timestamptz NOT NULL,
        "fuelType" varchar(40) NOT NULL DEFAULT 'DIESEL',
        "unit" varchar(10) NOT NULL DEFAULT 'L',
        "quantity" numeric(14,3) NOT NULL,
        "amount" numeric(14,2),
        "currency" varchar(3) NOT NULL DEFAULT 'EUR',
        "countryCode" varchar(2),
        "registrationCountry" varchar(2),
        "plateNumber" varchar,
        "provider" varchar,
        "externalId" varchar,
        "sourceType" varchar(30) NOT NULL DEFAULT 'manual',
        "odometerKm" numeric(14,1),
        "status" varchar(20) NOT NULL DEFAULT 'imported',
        "anomalyFlags" text,
        "notes" text,
        "importedByUserId" uuid,
        "correctedByUserId" uuid,
        "correctedAt" timestamptz,
        "correctionReason" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_fuel_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_fuel_transactions_truck" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fuel_transactions_truck_date" ON "fuel_transactions" ("truckId", "occurredAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fuel_transactions_status" ON "fuel_transactions" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fuel_transactions_provider_external" ON "fuel_transactions" ("provider", "externalId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_fuel_transactions_trip" ON "fuel_transactions" ("tripId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicle_energy_consumption" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "truckId" uuid NOT NULL,
        "tripId" uuid,
        "periodStart" timestamptz NOT NULL,
        "periodEnd" timestamptz,
        "sourceType" varchar(30) NOT NULL,
        "fuelType" varchar(40) NOT NULL DEFAULT 'DIESEL',
        "unit" varchar(10) NOT NULL DEFAULT 'L',
        "energyQuantity" numeric(16,3) NOT NULL,
        "distanceKm" numeric(14,3),
        "verificationStatus" varchar(20) NOT NULL DEFAULT 'unverified',
        "provider" varchar,
        "notes" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_energy_consumption" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_vehicle_energy_truck_period" ON "vehicle_energy_consumption" ("truckId", "periodStart")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_calculation_runs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "recordId" uuid,
        "tripId" uuid,
        "companyId" uuid,
        "trigger" varchar(40) NOT NULL,
        "engineVersion" varchar(20) NOT NULL,
        "inputHash" varchar(40),
        "inputSnapshot" jsonb,
        "factorSnapshot" jsonb,
        "resultSnapshot" jsonb,
        "previousResultSnapshot" jsonb,
        "userId" uuid,
        "reason" text,
        "status" varchar(30) NOT NULL DEFAULT 'applied',
        "countryRulesVersion" varchar(30),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_calculation_runs" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emission_runs_trip_created" ON "emission_calculation_runs" ("tripId", "createdAt")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid NOT NULL,
        "defaultMethodology" varchar(60) NOT NULL DEFAULT 'en_iso_14083_wtw',
        "defaultDataset" varchar NOT NULL DEFAULT 'DEFRA_2026',
        "reportingUnit" varchar(10) NOT NULL DEFAULT 'kg',
        "consolidationApproach" varchar(30) NOT NULL DEFAULT 'operational_control',
        "includeSubcontractors" boolean NOT NULL DEFAULT true,
        "autoCalculateTrips" boolean NOT NULL DEFAULT true,
        "defaultConsumptionPer100Km" numeric(10,3),
        "emptyRunAllocation" varchar(30) NOT NULL DEFAULT 'distance',
        "dataQualityRules" jsonb,
        "reportSchedule" jsonb,
        "updatedByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_settings" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_emission_settings_company" ON "emission_settings" ("companyId")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "reportNumber" varchar NOT NULL,
        "kind" varchar(40) NOT NULL,
        "title" varchar NOT NULL,
        "periodStart" date NOT NULL,
        "periodEnd" date NOT NULL,
        "filters" jsonb,
        "status" varchar(20) NOT NULL DEFAULT 'draft',
        "engineVersion" varchar(20) NOT NULL DEFAULT '1.0.0',
        "methodology" varchar(60) NOT NULL DEFAULT 'en_iso_14083_wtw',
        "unit" varchar(20) NOT NULL DEFAULT 'kg',
        "snapshot" jsonb,
        "totals" jsonb,
        "totalWtwKgCo2e" numeric(18,6),
        "checksum" varchar,
        "createdByUserId" uuid,
        "finalizedAt" timestamptz,
        "finalizedByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_reports" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "UQ_emission_reports_number" ON "emission_reports" ("reportNumber")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emission_reports_company" ON "emission_reports" ("companyId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emission_reports_status" ON "emission_reports" ("status")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "emission_simulations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "name" varchar NOT NULL,
        "input" jsonb NOT NULL,
        "result" jsonb NOT NULL,
        "engineVersion" varchar(20) NOT NULL DEFAULT '1.0.0',
        "createdByUserId" uuid,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_emission_simulations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_emission_simulations_company" ON "emission_simulations" ("companyId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_simulations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_settings"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_calculation_runs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_energy_consumption"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "fuel_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_emission_allocations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_emission_segments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trip_emission_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "truck_emission_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "truck_emission_profile_versions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "truck_emission_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_regulatory_sources"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "country_road_charging_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "country_emission_rules"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_factors"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "emission_countries"`);
  }
}
