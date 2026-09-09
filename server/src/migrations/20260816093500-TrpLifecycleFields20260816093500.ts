import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrpLifecycleFields20260816093500 implements MigrationInterface {
  name = 'TrpLifecycleFields20260816093500';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Non-destructive: add lifecycle, validation, and dispatch columns to "trips" table
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "validationStatus" character varying(50) DEFAULT 'not_validated'`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "validationIssues" jsonb`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "validationOutdated" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "confirmedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "confirmedById" uuid`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dispatchVersion" integer DEFAULT 1`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dispatchedById" uuid`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dispatchPayload" jsonb`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "driverAcknowledgedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "driverAcceptedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "trackingActivated" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "locked" boolean DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "lockedById" uuid`);

    // Add Foreign Key Constraints safely
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_trips_confirmedById') THEN
          ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_confirmedById"
            FOREIGN KEY ("confirmedById") REFERENCES "users" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_trips_dispatchedById') THEN
          ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_dispatchedById"
            FOREIGN KEY ("dispatchedById") REFERENCES "users" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_trips_lockedById') THEN
          ALTER TABLE "trips" ADD CONSTRAINT "FK_trips_lockedById"
            FOREIGN KEY ("lockedById") REFERENCES "users" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_lockedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_dispatchedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT IF EXISTS "FK_trips_confirmedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "lockedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "locked"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "trackingActivated"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "driverAcceptedAt"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "driverAcknowledgedAt"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "dispatchPayload"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "dispatchedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "dispatchedAt"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "dispatchVersion"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "confirmedById"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "confirmedAt"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "validationOutdated"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "validationIssues"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "validationStatus"`);
  }
}
