import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Repairs only states that are provably not a driver acceptance:
 * operationalStatus ACCEPTED while the trip has no driverAcceptedAt and its
 * legacy status is still a pre-acceptance stage. A genuine driver_accepted /
 * accepted trip is excluded, so real acceptance history is preserved.
 *
 * The canonical stage is re-derived again at read time, so this backfill only
 * removes the stale persisted value; it never invents a new lifecycle stage.
 */
export class RepairFalseTripAcceptance20261107120000 implements MigrationInterface {
  name = 'RepairFalseTripAcceptance20261107120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const preAcceptance = `('planning', 'planned', 'confirmed', 'assigned', 'dispatched', 'driver_received', 'ready')`;

    await queryRunner.query(
      `UPDATE "trips"
          SET "operationalStatus" = 'PLANNING'
        WHERE "operationalStatus" = 'ACCEPTED'
          AND "driverAcceptedAt" IS NULL
          AND LOWER("status") IN ${preAcceptance}`,
    );

    await queryRunner.query(
      `UPDATE "orders" AS o
          SET "operationalStatus" = 'PLANNING'
         FROM "trips" AS t
        WHERE o."tripId" = t.id
          AND o."operationalStatus" = 'ACCEPTED'
          AND t."driverAcceptedAt" IS NULL
          AND LOWER(t."status") IN ${preAcceptance}`,
    );
  }

  public async down(): Promise<void> {
    // Deliberately irreversible: restoring a false acceptance would recreate
    // the defect. Legitimate acceptance times were never modified.
  }
}
