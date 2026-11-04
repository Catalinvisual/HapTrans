import { MigrationInterface, QueryRunner } from 'typeorm';

export class TruckCurrentPositionAt20261104130000 implements MigrationInterface {
  name = 'TruckCurrentPositionAt20261104130000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "currentPositionAt" timestamp with time zone`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trucks" DROP COLUMN IF EXISTS "currentPositionAt"`);
  }
}
