import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Analytics & Reporting baseline.
 * - New tables: analytics_targets, saved_views, saved_reports, report_history,
 *   scheduled_reports.
 * - Indexes that speed up the dashboard / financial aggregations and the
 *   drill-down queries (created IF NOT EXISTS so they are safe on any DB).
 */
export class AnalyticsAndReportsBaseline20260911 implements MigrationInterface {
  name = 'AnalyticsAndReportsBaseline20260911';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "analytics_targets" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "key" varchar NOT NULL,
        "label" varchar,
        "section" varchar,
        "value" numeric(14,2) NOT NULL DEFAULT 0,
        "unit" varchar NOT NULL DEFAULT '%',
        "active" boolean NOT NULL DEFAULT true,
        "updatedBy" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_analytics_targets" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_analytics_targets_company_key" ON "analytics_targets" ("companyId", "key");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_views" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "name" varchar NOT NULL,
        "page" varchar NOT NULL DEFAULT 'dashboard',
        "filters" jsonb,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_views" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_views_user_page" ON "saved_views" ("userId", "page");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "saved_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "name" varchar NOT NULL,
        "reportKey" varchar NOT NULL,
        "filters" jsonb,
        "format" varchar NOT NULL DEFAULT 'xlsx',
        "locale" varchar NOT NULL DEFAULT 'en',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_saved_reports" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_saved_reports_user" ON "saved_reports" ("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "report_history" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "reportKey" varchar NOT NULL,
        "reportName" varchar NOT NULL,
        "filters" jsonb,
        "format" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT 'generated',
        "filePath" varchar,
        "error" text,
        "locale" varchar NOT NULL DEFAULT 'en',
        "fileName" varchar,
        "generatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_report_history" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_report_history_company" ON "report_history" ("companyId", "generatedAt");
      CREATE INDEX IF NOT EXISTS "IDX_report_history_user" ON "report_history" ("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scheduled_reports" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "name" varchar NOT NULL,
        "reportKey" varchar NOT NULL,
        "filters" jsonb,
        "format" varchar NOT NULL DEFAULT 'xlsx',
        "frequency" varchar NOT NULL DEFAULT 'weekly',
        "recipients" text,
        "active" boolean NOT NULL DEFAULT true,
        "nextRunAt" TIMESTAMP,
        "lastRunAt" TIMESTAMP,
        "lastErrorAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scheduled_reports" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "IDX_scheduled_reports_next_run" ON "scheduled_reports" ("active", "nextRunAt");
    `);

    // --- Analytics query indexes (safe on existing databases) ---
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_created_status" ON "orders" ("createdAt", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_client_created" ON "orders" ("clientId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_trip" ON "orders" ("tripId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trips_created_status" ON "trips" ("createdAt", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trips_truck_driver" ON "trips" ("truckId", "driverId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trips_trailer" ON "trips" ("trailerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_order_stops_order" ON "order_stops" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_trip_costs_trip" ON "trip_costs" ("tripId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_stops_trip" ON "stops" ("tripId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invoices_due_status" ON "invoices" ("dueDate", "status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_invoices_issue" ON "invoices" ("issueDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_expenses_date" ON "expenses" ("date")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_documents_doc_type" ON "documents" ("documentType")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_documents_order" ON "documents" ("orderId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scheduled_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_history"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_reports"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "saved_views"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "analytics_targets"`);
  }
}