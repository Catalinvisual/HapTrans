import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Idempotent order-linked draft invoices. Nullable + partial unique index keeps
 * every existing invoice valid while guaranteeing one draft per completed
 * order under duplicate events and concurrent retries.
 */
export class AutoDraftInvoiceOrder20261107190000 implements MigrationInterface {
  name = 'AutoDraftInvoiceOrder20261107190000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "orderId" uuid`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_invoices_order_unique" ON "invoices" ("orderId") WHERE "orderId" IS NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_invoices_order_unique"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "orderId"`);
  }
}