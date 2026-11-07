import { MigrationInterface, QueryRunner } from 'typeorm';

export class PartialCargoQuantities20261107191000 implements MigrationInterface {
  name = 'PartialCargoQuantities20261107191000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "loadedQuantity" decimal(10,2)`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "deliveredQuantity" decimal(10,2)`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectedQuantity" decimal(10,2)`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectionReason" text`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "rejectionPhotoUrls" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "rejectionPhotoUrls"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "rejectionReason"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "rejectedQuantity"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "deliveredQuantity"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "loadedQuantity"`);
  }
}