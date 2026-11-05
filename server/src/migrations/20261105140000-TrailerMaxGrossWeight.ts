import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds the trailer maximum gross weight used by HGV routing. Height, width,
 * length and axle count already exist from PlanningPremiumProfiles.
 */
export class TrailerMaxGrossWeight20261105140000 implements MigrationInterface {
  name = 'TrailerMaxGrossWeight20261105140000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trailers" ADD COLUMN IF NOT EXISTS "maxWeightKg" numeric(10,2)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trailers" DROP COLUMN IF EXISTS "maxWeightKg"`);
  }
}
