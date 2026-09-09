-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('PROSPECT', 'ACTIVE', 'ON_HOLD', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CustomerContactRole" AS ENUM ('GENERAL', 'OPERATIONS', 'PLANNING', 'DISPATCH', 'BILLING', 'ACCOUNTS_PAYABLE', 'ACCOUNTS_RECEIVABLE', 'CLAIMS', 'MANAGEMENT');

-- CreateEnum
CREATE TYPE "CustomerLocationRole" AS ENUM ('BILLING', 'HEADQUARTERS', 'PICKUP', 'DELIVERY', 'OPERATIONAL');

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "customer_id" UUID;

-- CreateTable
CREATE TABLE "customer_categories" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "color" VARCHAR(20),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tags" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "color" VARCHAR(20),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_tag_assignments" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "role" "CustomerContactRole" NOT NULL DEFAULT 'GENERAL',
    "first_name" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "preferred_language" VARCHAR(10),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_locations" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "role" "CustomerLocationRole" NOT NULL DEFAULT 'OPERATIONAL',
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customer_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trading_name" TEXT,
    "short_name" TEXT,
    "registration_number" TEXT,
    "vat_number" TEXT,
    "tax_number" TEXT,
    "legal_form" TEXT,
    "country" VARCHAR(2) NOT NULL DEFAULT 'RO',
    "default_language" VARCHAR(10) NOT NULL DEFAULT 'en',
    "default_currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "timezone" VARCHAR(100),
    "main_email" TEXT,
    "billing_email" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "website" TEXT,
    "payment_terms" TEXT,
    "credit_limit" DECIMAL(18,2),
    "category_id" UUID,
    "sales_owner_id" UUID,
    "account_manager_id" UUID,
    "commercial_status" VARCHAR(50),
    "default_service_type_id" UUID,
    "preferred_transport_mode_id" UUID,
    "operational_instructions" TEXT,
    "special_handling_requirements" TEXT,
    "is_adr_relevant" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "status" "CustomerStatus" NOT NULL DEFAULT 'PROSPECT',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "archived_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_categories_company_id_idx" ON "customer_categories"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_company_id_code_key" ON "customer_categories"("company_id", "code");

-- CreateIndex
CREATE INDEX "customer_tags_company_id_idx" ON "customer_tags"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tags_company_id_name_key" ON "customer_tags"("company_id", "name");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_customer_id_idx" ON "customer_tag_assignments"("customer_id");

-- CreateIndex
CREATE INDEX "customer_tag_assignments_tag_id_idx" ON "customer_tag_assignments"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_tag_assignments_customer_id_tag_id_key" ON "customer_tag_assignments"("customer_id", "tag_id");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_idx" ON "customer_contacts"("customer_id");

-- CreateIndex
CREATE INDEX "customer_locations_customer_id_idx" ON "customer_locations"("customer_id");

-- CreateIndex
CREATE INDEX "customer_locations_location_id_idx" ON "customer_locations"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "customer_locations_customer_id_location_id_role_key" ON "customer_locations"("customer_id", "location_id", "role");

-- CreateIndex
CREATE INDEX "customers_company_id_idx" ON "customers"("company_id");

-- CreateIndex
CREATE INDEX "customers_company_id_status_idx" ON "customers"("company_id", "status");

-- CreateIndex
CREATE INDEX "customers_company_id_commercial_status_idx" ON "customers"("company_id", "commercial_status");

-- CreateIndex
CREATE INDEX "customers_company_id_vat_number_idx" ON "customers"("company_id", "vat_number");

-- CreateIndex
CREATE INDEX "customers_company_id_registration_number_idx" ON "customers"("company_id", "registration_number");

-- CreateIndex
CREATE INDEX "customers_company_id_main_email_idx" ON "customers"("company_id", "main_email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_company_id_code_key" ON "customers"("company_id", "code");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_categories" ADD CONSTRAINT "customer_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tags" ADD CONSTRAINT "customer_tags_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_tag_assignments" ADD CONSTRAINT "customer_tag_assignments_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "customer_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_sales_owner_id_fkey" FOREIGN KEY ("sales_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_account_manager_id_fkey" FOREIGN KEY ("account_manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_default_service_type_id_fkey" FOREIGN KEY ("default_service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_preferred_transport_mode_id_fkey" FOREIGN KEY ("preferred_transport_mode_id") REFERENCES "transport_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
