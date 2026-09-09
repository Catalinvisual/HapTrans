-- AlterTable
ALTER TABLE "branches" ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "contact_phone" TEXT,
ADD COLUMN     "country" VARCHAR(2),
ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DECIMAL(10,8),
ADD COLUMN     "longitude" DECIMAL(11,8),
ADD COLUMN     "opening_hours" JSONB,
ADD COLUMN     "type" VARCHAR(50) NOT NULL DEFAULT 'HQ';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "address" JSONB,
ADD COLUMN     "country" VARCHAR(2) NOT NULL DEFAULT 'RO',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "legal_form" TEXT,
ADD COLUMN     "legal_name" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "registration_number" TEXT,
ADD COLUMN     "tax_id" TEXT,
ADD COLUMN     "trading_name" TEXT,
ADD COLUMN     "vat_number" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "currency" SET DATA TYPE VARCHAR(3);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" VARCHAR(50),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "countries" (
    "id" UUID NOT NULL,
    "code_alpha2" VARCHAR(2) NOT NULL,
    "code_alpha3" VARCHAR(3) NOT NULL,
    "numeric_code" VARCHAR(3),
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "is_eu_member" BOOLEAN NOT NULL DEFAULT false,
    "is_schengen" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "countries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" UUID NOT NULL,
    "country_id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timezones" (
    "id" UUID NOT NULL,
    "identifier" VARCHAR(100) NOT NULL,
    "display_name" TEXT,
    "offset" VARCHAR(10),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timezones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "id" UUID NOT NULL,
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" VARCHAR(10) NOT NULL,
    "decimal_places" INTEGER NOT NULL DEFAULT 2,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uoms" (
    "id" UUID NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "category" VARCHAR(50) NOT NULL,
    "base_unit_id" UUID,
    "conversion_factor" DECIMAL(18,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "uoms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_modes" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "transport_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "transport_mode_id" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "service_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cargo_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "is_adr" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "cargo_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload_kg" DECIMAL(12,3),
    "volume_m3" DECIMAL(12,3),
    "length_m" DECIMAL(12,3),
    "width_m" DECIMAL(12,3),
    "height_m" DECIMAL(12,3),
    "loading_meters" DECIMAL(12,3),
    "pallet_capacity" INTEGER,
    "axle_configuration" VARCHAR(50),
    "is_adr_capable" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailer_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "payload_kg" DECIMAL(12,3),
    "volume_m3" DECIMAL(12,3),
    "length_m" DECIMAL(12,3),
    "loading_meters" DECIMAL(12,3),
    "is_adr_capable" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trailer_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "status_definitions" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "entity_type" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "description" TEXT,
    "color" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_terminal" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "status_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "localized_names" JSONB,
    "category" VARCHAR(100),
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "numbering_configs" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "entity_type" VARCHAR(100) NOT NULL,
    "prefix" VARCHAR(20),
    "suffix" VARCHAR(20),
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "min_digits" INTEGER NOT NULL DEFAULT 6,
    "reset_policy" VARCHAR(20),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "numbering_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "country_id" UUID,
    "region_id" UUID,
    "postal_code" TEXT,
    "city" TEXT,
    "address" JSONB,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "timezone" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "departments_company_id_idx" ON "departments"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_company_id_code_key" ON "departments"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_alpha2_key" ON "countries"("code_alpha2");

-- CreateIndex
CREATE UNIQUE INDEX "countries_code_alpha3_key" ON "countries"("code_alpha3");

-- CreateIndex
CREATE UNIQUE INDEX "countries_numeric_code_key" ON "countries"("numeric_code");

-- CreateIndex
CREATE INDEX "regions_country_id_idx" ON "regions"("country_id");

-- CreateIndex
CREATE UNIQUE INDEX "regions_country_id_code_key" ON "regions"("country_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "timezones_identifier_key" ON "timezones"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uoms_code_key" ON "uoms"("code");

-- CreateIndex
CREATE INDEX "uoms_category_idx" ON "uoms"("category");

-- CreateIndex
CREATE UNIQUE INDEX "transport_modes_code_key" ON "transport_modes"("code");

-- CreateIndex
CREATE INDEX "service_types_company_id_idx" ON "service_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "service_types_company_id_code_key" ON "service_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "cargo_types_company_id_idx" ON "cargo_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "cargo_types_company_id_code_key" ON "cargo_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "vehicle_types_company_id_idx" ON "vehicle_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_types_company_id_code_key" ON "vehicle_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "trailer_types_company_id_idx" ON "trailer_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "trailer_types_company_id_code_key" ON "trailer_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "status_definitions_company_id_entity_type_idx" ON "status_definitions"("company_id", "entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "status_definitions_company_id_entity_type_code_key" ON "status_definitions"("company_id", "entity_type", "code");

-- CreateIndex
CREATE INDEX "document_types_company_id_idx" ON "document_types"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_company_id_code_key" ON "document_types"("company_id", "code");

-- CreateIndex
CREATE INDEX "numbering_configs_company_id_idx" ON "numbering_configs"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "numbering_configs_company_id_branch_id_entity_type_key" ON "numbering_configs"("company_id", "branch_id", "entity_type");

-- CreateIndex
CREATE INDEX "locations_company_id_idx" ON "locations"("company_id");

-- CreateIndex
CREATE INDEX "locations_branch_id_idx" ON "locations"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_company_id_branch_id_code_key" ON "locations"("company_id", "branch_id", "code");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uoms" ADD CONSTRAINT "uoms_base_unit_id_fkey" FOREIGN KEY ("base_unit_id") REFERENCES "uoms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_types" ADD CONSTRAINT "service_types_transport_mode_id_fkey" FOREIGN KEY ("transport_mode_id") REFERENCES "transport_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cargo_types" ADD CONSTRAINT "cargo_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_types" ADD CONSTRAINT "vehicle_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailer_types" ADD CONSTRAINT "trailer_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_definitions" ADD CONSTRAINT "status_definitions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "numbering_configs" ADD CONSTRAINT "numbering_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

