import { MigrationInterface, QueryRunner } from 'typeorm';

/** Additive dispatcher review fields to the persistent per-order StopTask allocation. */
export class CargoAllocationReview20261107210000 implements MigrationInterface {
  name = 'CargoAllocationReview20261107210000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "allocationReviewStatus" character varying(32)`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "allocationReviewedByUserId" uuid`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "allocationReviewedAt" timestamp`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "allocationReviewNote" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "allocationReviewNote"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "allocationReviewedAt"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "allocationReviewedByUserId"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "allocationReviewStatus"`);
  }
}