import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDocumentTypes20261003120000 implements MigrationInterface {
    name = 'AddDocumentTypes20261003120000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums values cannot be created if they already exist, we use a safe block
        await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'aviz') THEN
            ALTER TYPE "documents_documenttype_enum" ADD VALUE 'aviz';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'fuel') THEN
            ALTER TYPE "documents_documenttype_enum" ADD VALUE 'fuel';
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'documents_documenttype_enum' AND e.enumlabel = 'licence') THEN
            ALTER TYPE "documents_documenttype_enum" ADD VALUE 'licence';
          END IF;
        END $$;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
