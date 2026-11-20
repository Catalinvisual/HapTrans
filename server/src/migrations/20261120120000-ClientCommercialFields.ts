import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Commercial terms the client detail screen already edits and displays.
 * Without these columns the credit limit and default currency were only kept in
 * the browser form: they were sent on save, dropped by the database and shown
 * again as 0 / EUR the next time the client was opened.
 */
export class ClientCommercialFields20261120120000 implements MigrationInterface {
  name = 'ClientCommercialFields20261120120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "creditLimit" numeric(12,2) NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "currency" varchar NOT NULL DEFAULT 'EUR'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "currency"`);
    await queryRunner.query(`ALTER TABLE "clients" DROP COLUMN IF EXISTS "creditLimit"`);
  }
}