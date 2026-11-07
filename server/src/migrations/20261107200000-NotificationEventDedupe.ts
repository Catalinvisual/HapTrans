import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persistent delivery-ledger and notification deduplication. Existing rows keep
 * their data and are treated as TMS/system notifications.
 */
export class NotificationEventDedupe20261107200000 implements MigrationInterface {
  name = 'NotificationEventDedupe20261107200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "eventId" character varying`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "origin" character varying NOT NULL DEFAULT 'SYSTEM'`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "audience" character varying NOT NULL DEFAULT 'tms'`);
    await queryRunner.query(`UPDATE "notifications" SET "origin" = 'SYSTEM' WHERE "origin" IS NULL`);
    await queryRunner.query(`UPDATE "notifications" SET "audience" = 'tms' WHERE "audience" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_notifications_event_unique" ON "notifications" ("eventId") WHERE "eventId" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_notifications_event_unique"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "audience"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "origin"`);
    await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN IF EXISTS "eventId"`);
  }
}
