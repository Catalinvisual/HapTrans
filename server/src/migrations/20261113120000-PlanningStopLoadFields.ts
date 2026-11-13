import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Per-stop load and handling time.
 *
 * The planning stop grid edits what happens at one stop: how long the truck
 * waits, and how much cargo moves there. Until now those numbers only existed
 * per order, so a multi-stop trip could not describe a partial load at one of
 * its stops. All columns are nullable and additive: existing stops keep their
 * current behaviour and the board falls back to the order totals.
 */
export class PlanningStopLoadFields20261113120000 implements MigrationInterface {
  name = 'PlanningStopLoadFields20261113120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "waitingMinutes" integer`);
    await queryRunner.query(`ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "pallets" integer`);
    await queryRunner.query(`ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "weightKg" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "stops" ADD COLUMN IF NOT EXISTS "ldm" numeric(8,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stops" DROP COLUMN IF EXISTS "ldm"`);
    await queryRunner.query(`ALTER TABLE "stops" DROP COLUMN IF EXISTS "weightKg"`);
    await queryRunner.query(`ALTER TABLE "stops" DROP COLUMN IF EXISTS "pallets"`);
    await queryRunner.query(`ALTER TABLE "stops" DROP COLUMN IF EXISTS "waitingMinutes"`);
  }
}
