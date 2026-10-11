import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArchivedPdfs20261011100000 implements MigrationInterface {
  name = 'CreateArchivedPdfs20261011100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "archived_pdfs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "sourceType" varchar(50) NOT NULL,
        "sourceId" varchar(255),
        "sourceReference" varchar(255),
        "fileName" varchar(255) NOT NULL UNIQUE,
        "originalFileName" varchar(255),
        "fileUrl" text,
        "publicId" varchar(255),
        "resourceType" varchar(50) NOT NULL DEFAULT 'raw',
        "cloudinaryType" varchar(50) NOT NULL DEFAULT 'authenticated',
        "format" varchar(20) NOT NULL DEFAULT 'pdf',
        "bytes" bigint NOT NULL DEFAULT 0,
        "targetShare" varchar(50) NOT NULL DEFAULT 'HC-PDF',
        "status" varchar(30) NOT NULL DEFAULT 'pending',
        "isRetryable" boolean NOT NULL DEFAULT true,
        "errorMessage" text,
        "tnasDownloaded" boolean NOT NULL DEFAULT false,
        "archivedAt" TIMESTAMP,
        "lastAttemptAt" TIMESTAMP,
        "attemptCount" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_archived_pdfs" PRIMARY KEY ("id")
      );

      CREATE INDEX IF NOT EXISTS "IDX_archived_pdfs_status_targetShare" ON "archived_pdfs" ("status", "targetShare");
      CREATE INDEX IF NOT EXISTS "IDX_archived_pdfs_companyId" ON "archived_pdfs" ("companyId");
      CREATE INDEX IF NOT EXISTS "IDX_archived_pdfs_createdAt" ON "archived_pdfs" ("createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "archived_pdfs";
    `);
  }
}
