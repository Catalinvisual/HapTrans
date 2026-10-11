import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTargetFilenameToArchivedPdfs20261011160000 implements MigrationInterface {
  name = 'AddTargetFilenameToArchivedPdfs20261011160000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "archived_pdfs" ADD COLUMN IF NOT EXISTS "targetFilename" varchar(255);
      UPDATE "archived_pdfs" SET "targetFilename" = COALESCE("committedFileName", "fileName") WHERE "targetFilename" IS NULL;
      CREATE INDEX IF NOT EXISTS "IDX_archived_pdfs_targetFilename" ON "archived_pdfs" ("targetFilename");
      CREATE INDEX IF NOT EXISTS "IDX_archived_pdfs_sourceType_sourceId" ON "archived_pdfs" ("sourceType", "sourceId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_archived_pdfs_sourceType_sourceId";
      DROP INDEX IF EXISTS "IDX_archived_pdfs_targetFilename";
      ALTER TABLE "archived_pdfs" DROP COLUMN IF EXISTS "targetFilename";
    `);
  }
}
