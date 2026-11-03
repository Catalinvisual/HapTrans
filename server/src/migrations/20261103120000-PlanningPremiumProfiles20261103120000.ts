import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanningPremiumProfiles20261103120000 implements MigrationInterface {
  name = 'PlanningPremiumProfiles20261103120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const truckColumns: Array<[string, string]> = [
      ['heightCm', 'numeric(10,2)'],
      ['widthCm', 'numeric(10,2)'],
      ['lengthCm', 'numeric(10,2)'],
      ['axleCount', 'integer'],
      ['fuelType', 'character varying'],
      ['fuelPricePerLiter', 'numeric(10,3)'],
      ['maintenanceCostPerKm', 'numeric(10,2)'],
      ['fixedCostPerDay', 'numeric(10,2)'],
    ];
    for (const [column, type] of truckColumns) {
      await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    }

    const trailerColumns: Array<[string, string]> = [
      ['heightCm', 'numeric(10,2)'],
      ['widthCm', 'numeric(10,2)'],
      ['lengthCm', 'numeric(10,2)'],
      ['axleCount', 'integer'],
    ];
    for (const [column, type] of trailerColumns) {
      await queryRunner.query(`ALTER TABLE "trailers" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    }

    const driverColumns: Array<[string, string]> = [
      ['costPerDay', 'numeric(10,2)'],
      ['costPerHour', 'numeric(10,2)'],
    ];
    for (const [column, type] of driverColumns) {
      await queryRunner.query(`ALTER TABLE "drivers" ADD COLUMN IF NOT EXISTS "${column}" ${type}`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const truckColumns = ['heightCm', 'widthCm', 'lengthCm', 'axleCount', 'fuelType', 'fuelPricePerLiter', 'maintenanceCostPerKm', 'fixedCostPerDay'];
    for (const column of truckColumns) {
      await queryRunner.query(`ALTER TABLE "trucks" DROP COLUMN IF EXISTS "${column}"`);
    }

    const trailerColumns = ['heightCm', 'widthCm', 'lengthCm', 'axleCount'];
    for (const column of trailerColumns) {
      await queryRunner.query(`ALTER TABLE "trailers" DROP COLUMN IF EXISTS "${column}"`);
    }

    const driverColumns = ['costPerDay', 'costPerHour'];
    for (const column of driverColumns) {
      await queryRunner.query(`ALTER TABLE "drivers" DROP COLUMN IF EXISTS "${column}"`);
    }
  }
}
