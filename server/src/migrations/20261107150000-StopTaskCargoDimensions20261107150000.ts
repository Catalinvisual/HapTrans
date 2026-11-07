import { MigrationInterface, QueryRunner } from 'typeorm';

export class StopTaskCargoDimensions20261107150000 implements MigrationInterface {
  name = 'StopTaskCargoDimensions20261107150000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "volumeCbm" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" ADD COLUMN IF NOT EXISTS "loadingMeters" numeric(10,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "loadingMeters"`);
    await queryRunner.query(`ALTER TABLE "stop_tasks" DROP COLUMN IF EXISTS "volumeCbm"`);
  }
}
