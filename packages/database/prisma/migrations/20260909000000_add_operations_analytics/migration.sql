-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'PLANNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'DISPATCHED', 'PICKUP', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_TRANSIT', 'IN_MAINTENANCE', 'OFF_ROAD', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'CASH', 'SEPA_DIRECT_DEBIT', 'OTHER');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "registration_plate" TEXT NOT NULL,
    "vehicle_type_id" UUID,
    "trailer_type_id" UUID,
    "manufacturer" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "fuel_type" VARCHAR(20),
    "fuel_consumption_l100km" DECIMAL(6,2),
    "odometer_km" DECIMAL(12,2),
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_city" TEXT,
    "current_country" VARCHAR(2),
    "payload_kg" DECIMAL(12,3),
    "volume_m3" DECIMAL(12,3),
    "is_adr_certified" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "license_number" TEXT,
    "license_expiry" TIMESTAMPTZ(3),
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "rating" DECIMAL(3,2),
    "total_trips" INTEGER NOT NULL DEFAULT 0,
    "total_km" DECIMAL(12,2) DEFAULT 0,
    "on_time_rate" DECIMAL(5,2),
    "hired_at" TIMESTAMPTZ(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "branch_id" UUID,
    "customer_id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "service_type_id" UUID,
    "cargo_type_id" UUID,
    "transport_mode_id" UUID,
    "origin_city" TEXT NOT NULL,
    "origin_country" VARCHAR(2) NOT NULL,
    "destination_city" TEXT NOT NULL,
    "destination_country" VARCHAR(2) NOT NULL,
    "goods_description" TEXT,
    "weight_kg" DECIMAL(12,3),
    "volume_m3" DECIMAL(12,3),
    "pallets" INTEGER,
    "loading_meters" DECIMAL(6,2),
    "is_adr" BOOLEAN NOT NULL DEFAULT false,
    "is_temperature_controlled" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "requested_pickup_at" TIMESTAMPTZ(3),
    "requested_delivery_at" TIMESTAMPTZ(3),
    "promised_delivery_at" TIMESTAMPTZ(3),
    "actual_pickup_at" TIMESTAMPTZ(3),
    "actual_delivery_at" TIMESTAMPTZ(3),
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "trip_number" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "driver_id" UUID,
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "planned_start_at" TIMESTAMPTZ(3),
    "planned_end_at" TIMESTAMPTZ(3),
    "actual_start_at" TIMESTAMPTZ(3),
    "actual_end_at" TIMESTAMPTZ(3),
    "distance_km" DECIMAL(10,2) NOT NULL,
    "actual_distance_km" DECIMAL(10,2),
    "revenue_amount" DECIMAL(18,2) NOT NULL,
    "cost_amount" DECIMAL(18,2) NOT NULL,
    "margin_amount" DECIMAL(18,2) NOT NULL,
    "margin_rate" DECIMAL(6,2) NOT NULL,
    "fuel_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "tolls_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "driver_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "maintenance_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "other_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "is_on_time" BOOLEAN NOT NULL DEFAULT true,
    "late_minutes" INTEGER NOT NULL DEFAULT 0,
    "waiting_minutes" INTEGER NOT NULL DEFAULT 0,
    "start_city" TEXT,
    "end_city" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "subtotal_amount" DECIMAL(18,2) NOT NULL,
    "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "issue_date" TIMESTAMPTZ(3),
    "due_date" TIMESTAMPTZ(3),
    "paid_at" TIMESTAMPTZ(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "company_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
    "reference" TEXT,
    "received_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_company_id_status_idx" ON "vehicles"("company_id", "status");

-- CreateIndex
CREATE INDEX "vehicles_company_id_vehicle_type_id_idx" ON "vehicles"("company_id", "vehicle_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_company_id_code_key" ON "vehicles"("company_id", "code");

-- CreateIndex
CREATE INDEX "drivers_company_id_status_idx" ON "drivers"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_company_id_code_key" ON "drivers"("company_id", "code");

-- CreateIndex
CREATE INDEX "orders_company_id_created_at_idx" ON "orders"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "orders_company_id_status_idx" ON "orders"("company_id", "status");

-- CreateIndex
CREATE INDEX "orders_company_id_customer_id_idx" ON "orders"("company_id", "customer_id");

-- CreateIndex
CREATE INDEX "orders_company_id_destination_country_idx" ON "orders"("company_id", "destination_country");

-- CreateIndex
CREATE UNIQUE INDEX "orders_company_id_order_number_key" ON "orders"("company_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "trips_order_id_key" ON "trips"("order_id");

-- CreateIndex
CREATE INDEX "trips_company_id_created_at_idx" ON "trips"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "trips_company_id_status_idx" ON "trips"("company_id", "status");

-- CreateIndex
CREATE INDEX "trips_company_id_vehicle_id_idx" ON "trips"("company_id", "vehicle_id");

-- CreateIndex
CREATE INDEX "trips_company_id_driver_id_idx" ON "trips"("company_id", "driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "trips_company_id_trip_number_key" ON "trips"("company_id", "trip_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_created_at_idx" ON "invoices"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_company_id_status_idx" ON "invoices"("company_id", "status");

-- CreateIndex
CREATE INDEX "invoices_company_id_customer_id_idx" ON "invoices"("company_id", "customer_id");

-- CreateIndex
CREATE INDEX "invoices_company_id_due_date_idx" ON "invoices"("company_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_invoice_number_key" ON "invoices"("company_id", "invoice_number");

-- CreateIndex
CREATE INDEX "payments_company_id_received_at_idx" ON "payments"("company_id", "received_at");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_vehicle_type_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_trailer_type_id_fkey" FOREIGN KEY ("trailer_type_id") REFERENCES "trailer_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_service_type_id_fkey" FOREIGN KEY ("service_type_id") REFERENCES "service_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_cargo_type_id_fkey" FOREIGN KEY ("cargo_type_id") REFERENCES "cargo_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_transport_mode_id_fkey" FOREIGN KEY ("transport_mode_id") REFERENCES "transport_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

