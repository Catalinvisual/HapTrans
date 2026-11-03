import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripCostBreakdown20261105120000 implements MigrationInterface {
  name = 'TripCostBreakdown20261105120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Additive only: stores the authoritative CostEngine breakdown and when it was calculated.
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "estimatedCostBreakdown" jsonb`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "costCalculatedAt" timestamp`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "estimatedCostBreakdown"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "costCalculatedAt"`);
  }
}
