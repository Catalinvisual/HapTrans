import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * An invoice must keep the transport data it was issued for. Storing the
 * snapshot on the invoice also makes old drafts printable after the trip or
 * order changes.
 */
export class InvoiceTransportDetails20261112120000 implements MigrationInterface {
  name = 'InvoiceTransportDetails20261112120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "transportDetails" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "transportDetails"`);
  }
}