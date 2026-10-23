import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdrCatalogAndCargoFields20261023210000 implements MigrationInterface {
  name = 'AdrCatalogAndCargoFields20261023210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Catalog Version Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "adr_catalog_versions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "edition" character varying NOT NULL UNIQUE,
        "versionNumber" character varying,
        "effectiveDate" date,
        "sourceDocument" character varying DEFAULT 'UNECE Dangerous Goods List (Table A Chapter 3.2)',
        "sourceUrl" character varying,
        "sourceFile" character varying,
        "fileHash" character varying,
        "totalEntries" integer DEFAULT 0,
        "rejectedEntries" integer DEFAULT 0,
        "importNotes" text,
        "isActive" boolean DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );
    `);

    // 2. Catalog Items Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "adr_catalog_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "versionId" uuid REFERENCES "adr_catalog_versions"("id") ON DELETE CASCADE,
        "unNumber" character varying NOT NULL,
        "unNumberNumeric" integer NOT NULL,
        "properShippingNameEn" character varying(500) NOT NULL,
        "properShippingNameRo" character varying(500) NOT NULL,
        "properShippingNameDe" character varying(500),
        "properShippingNameFr" character varying(500),
        "properShippingNameNl" character varying(500),
        "properShippingNameEs" character varying(500),
        "properShippingNamePl" character varying(500),
        "adrClass" character varying(20) NOT NULL,
        "classificationCode" character varying(20),
        "packingGroup" character varying(10),
        "dangerLabels" character varying(50),
        "specialProvisions" text,
        "limitedQuantity" character varying(50) DEFAULT '0',
        "limitedQuantityGramsOrMl" integer DEFAULT 0,
        "exceptedQuantity" character varying(10) DEFAULT 'E0',
        "packingInstructions" character varying(100),
        "specialPackingProvisions" character varying(100),
        "mixedPacking" character varying(50),
        "portableTanksInstructions" character varying(50),
        "portableTanksSpecialProvisions" character varying(100),
        "adrTankCode" character varying(50),
        "adrTankSpecialProvisions" character varying(100),
        "vehicleForTankCarriage" character varying(50),
        "transportCategory" integer DEFAULT 3,
        "tunnelRestrictionCode" character varying(20),
        "specialProvisionsPackages" character varying(50),
        "specialProvisionsBulk" character varying(50),
        "specialProvisionsHandling" character varying(100),
        "specialProvisionsOperation" character varying(50),
        "hazardIdentificationNumber" character varying(20),
        "technicalNameRequired" boolean DEFAULT false,
        "batteryCategory" character varying,
        "temperatureControlRequired" boolean DEFAULT false,
        "controlTemperature" numeric(5,2),
        "emergencyTemperature" numeric(5,2),
        "createdAt" TIMESTAMP DEFAULT now(),
        "updatedAt" TIMESTAMP DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "IDX_adr_catalog_items_unNumber" ON "adr_catalog_items"("unNumber");
      CREATE INDEX IF NOT EXISTS "IDX_adr_catalog_items_unNumberNumeric" ON "adr_catalog_items"("unNumberNumeric");
      CREATE INDEX IF NOT EXISTS "IDX_adr_catalog_items_adrClass" ON "adr_catalog_items"("adrClass");
      CREATE INDEX IF NOT EXISTS "IDX_adr_catalog_items_versionId" ON "adr_catalog_items"("versionId");
    `);

    // 3. Cargo Items Columns
    await queryRunner.query(`
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "technicalName" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrPoints" numeric(10,2);
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrFactor" integer;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrExemptionType" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrExemptionDetails" text;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrStatus" character varying DEFAULT 'needs_review';
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrClassificationCode" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrDangerLabels" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrSpecialProvisions" text;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrPackagingCode" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrPackagingDescription" character varying;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrPackagingCount" integer;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrNetMassKg" numeric(10,2);
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrGrossMassKg" numeric(10,2);
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrVolumeLiters" numeric(10,2);
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrTransportType" character varying DEFAULT 'packages';
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrBatteryDetails" text;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrWaste" boolean DEFAULT false;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrEmptyUncleaned" boolean DEFAULT false;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrRequiresVerification" boolean DEFAULT false;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrVerificationReason" text;
      ALTER TABLE "cargo_items" ADD COLUMN IF NOT EXISTS "adrDeclarationText" text;
    `);

    // 4. Orders Columns
    await queryRunner.query(`
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isAdr" boolean DEFAULT false;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adrStatus" character varying DEFAULT 'none';
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adrTotalPoints" numeric(10,2) DEFAULT 0;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adr1136Eligible" boolean DEFAULT true;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adrExemptionApplied" character varying;
      ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "adrSummary" text;
    `);

    // 5. Drivers & Driver Documents Columns
    await queryRunner.query(`
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "hasAdrCertificate" boolean DEFAULT false;
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adrCertificateNumber" character varying;
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adrExpiryDate" date;
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adrSpecializations" text;
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adrVerified" boolean DEFAULT false;
      ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "adrVerifiedBy" character varying;

      ALTER TABLE "driver_documents" ADD COLUMN IF NOT EXISTS "notes" text;
      ALTER TABLE "driver_documents" ADD COLUMN IF NOT EXISTS "specializations" character varying;
      ALTER TABLE "driver_documents" ADD COLUMN IF NOT EXISTS "verified" boolean DEFAULT false;
      ALTER TABLE "driver_documents" ADD COLUMN IF NOT EXISTS "verifiedBy" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "adr_catalog_items";
      DROP TABLE IF EXISTS "adr_catalog_versions";
    `);
  }
}
