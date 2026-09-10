import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanningActionAudit20260815131134 implements MigrationInterface {
  name = 'PlanningActionAudit20260815131134';

  // Non-destructive: only ADD COLUMN IF NOT EXISTS.
  // Extends planning_actions with explicit tenant/user/truck/route columns
  // and before/after state so planning actions are fully attributable.
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "planning_actions" ADD COLUMN IF NOT EXISTS "truckId" uuid`);
    await queryRunner.query(`ALTER TABLE "planning_actions" ADD COLUMN IF NOT EXISTS "routePlanId" uuid`);
    await queryRunner.query(`ALTER TABLE "planning_actions" ADD COLUMN IF NOT EXISTS "beforeState" jsonb`);
    await queryRunner.query(`ALTER TABLE "planning_actions" ADD COLUMN IF NOT EXISTS "afterState" jsonb`);

    // FK to trucks / truck_route_plans (optional, SET NULL so existing rows survive)
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planning_actions_truckId')
        THEN
          ALTER TABLE "planning_actions" ADD CONSTRAINT "FK_planning_actions_truckId"
            FOREIGN KEY ("truckId") REFERENCES "trucks" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_planning_actions_routePlanId')
        THEN
          ALTER TABLE "planning_actions" ADD CONSTRAINT "FK_planning_actions_routePlanId"
            FOREIGN KEY ("routePlanId") REFERENCES "truck_route_plans" ("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP CONSTRAINT IF EXISTS "FK_planning_actions_routePlanId"`);
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP CONSTRAINT IF EXISTS "FK_planning_actions_truckId"`);
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP COLUMN IF EXISTS "afterState"`);
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP COLUMN IF EXISTS "beforeState"`);
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP COLUMN IF EXISTS "routePlanId"`);
    await queryRunner.query(`ALTER TABLE "planning_actions" DROP COLUMN IF EXISTS "truckId"`);
  }
}
