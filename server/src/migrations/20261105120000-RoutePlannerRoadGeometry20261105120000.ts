import { MigrationInterface, QueryRunner } from 'typeorm';

export class RoutePlannerRoadGeometry20261105120000 implements MigrationInterface {
  name = 'RoutePlannerRoadGeometry20261105120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const planColumns: Array<[string, string]> = [
      ['routeGeometry', 'jsonb'],
      ['routeProvider', 'character varying'],
      ['routeStatus', 'character varying'],
      ['routeCalculatedAt', 'timestamp'],
      ['routeWarnings', 'jsonb'],
    ];
    for (const [column, type] of planColumns) {
      await queryRunner.query(`ALTER TABLE "truck_route_plans" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    }

    const stopColumns: Array<[string, string]> = [
      ['distanceFromPreviousKm', 'numeric(10,2)'],
      ['durationFromPreviousMin', 'integer'],
      ['plannedEta', 'timestamp'],
      ['calculatedEta', 'timestamp'],
    ];
    for (const [column, type] of stopColumns) {
      await queryRunner.query(`ALTER TABLE "route_plan_stops" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const column of ['routeGeometry', 'routeProvider', 'routeStatus', 'routeCalculatedAt', 'routeWarnings']) {
      await queryRunner.query(`ALTER TABLE "truck_route_plans" DROP COLUMN IF EXISTS "${column}"`);
    }
    for (const column of ['distanceFromPreviousKm', 'durationFromPreviousMin', 'plannedEta', 'calculatedEta']) {
      await queryRunner.query(`ALTER TABLE "route_plan_stops" DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}