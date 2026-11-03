import { MigrationInterface, QueryRunner } from 'typeorm';

export class TripLiveEta20261104120000 implements MigrationInterface {
  name = 'TripLiveEta20261104120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "lastLiveEta" timestamp`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "etaStatus" character varying DEFAULT 'unknown'`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "lastEtaAt" timestamp`);
    await queryRunner.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "etaSource" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "lastLiveEta"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "etaStatus"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "lastEtaAt"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP COLUMN IF EXISTS "etaSource"`);
  }
}
