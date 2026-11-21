import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Personal agenda with invitations. Each event belongs to one user; invitees
 * live in agenda_participants so accepting/declining never edits the owner's
 * calendar entry.
 */
export class AgendaModule20261121120000 implements MigrationInterface {
  name = 'AgendaModule20261121120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agenda_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "companyId" uuid,
        "title" varchar NOT NULL,
        "description" text,
        "location" varchar,
        "kind" varchar NOT NULL DEFAULT 'event',
        "color" varchar NOT NULL DEFAULT 'orange',
        "startAt" timestamptz NOT NULL,
        "endAt" timestamptz,
        "allDay" boolean NOT NULL DEFAULT false,
        "reminderMinutes" integer NOT NULL DEFAULT 15,
        "status" varchar NOT NULL DEFAULT 'confirmed',
        "reminderSentAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agenda_events" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agenda_events_user_start" ON "agenda_events" ("userId", "startAt")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agenda_events_reminder" ON "agenda_events" ("reminderSentAt", "startAt")`,
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agenda_participants" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "eventId" uuid NOT NULL,
        "userId" uuid NOT NULL,
        "invitedById" uuid NOT NULL,
        "status" varchar NOT NULL DEFAULT 'pending',
        "respondedAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agenda_participants" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_agenda_participants_event_user" ON "agenda_participants" ("eventId", "userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_agenda_participants_user" ON "agenda_participants" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "agenda_participants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agenda_events"`);
  }
}
