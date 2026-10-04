import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateWebsiteCms20261004105600 implements MigrationInterface {
    name = 'CreateWebsiteCms20261004105600';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "website_cms" (
                "key" character varying NOT NULL,
                "value" text,
                CONSTRAINT "PK_website_cms" PRIMARY KEY ("key")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "website_cms"`);
    }
}
