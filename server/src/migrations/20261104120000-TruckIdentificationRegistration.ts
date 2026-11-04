import { MigrationInterface, QueryRunner } from 'typeorm';

export class TruckIdentificationRegistration20261104120000 implements MigrationInterface {
  name = 'TruckIdentificationRegistration20261104120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "vin" character varying(17)`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "registrationCountry" character varying(2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "trucks" DROP COLUMN IF EXISTS "registrationCountry"`);
    await queryRunner.query(`ALTER TABLE "trucks" DROP COLUMN IF EXISTS "vin"`);
  }
}
