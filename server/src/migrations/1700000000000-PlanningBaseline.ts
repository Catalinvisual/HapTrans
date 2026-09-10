import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlanningBaseline1700000000000 implements MigrationInterface {
  name = 'PlanningBaseline1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================================
    // Idempotent baseline for the Planning module (tables + trucks
    // planning columns). Non-destructive on existing databases:
    // CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
    // guarded enum + index + FK creation.
    // Constraint/index names match TypeORM entity metadata exactly
    // so the schema never diverges from what synchronize would build.
    // ============================================================

    // ---- Enum types (guarded: PG has no CREATE TYPE IF NOT EXISTS) ----
    const enums: Array<[string, string[]]> = [
      ['planning_profiles_type_enum', ['standard_transport', 'cheapest_route', 'fastest_delivery', 'maximum_utilization', 'customer_priority', 'emergency_planning']],
      ['planning_profiles_defaultloadingaccess_enum', ['rear_only', 'side_only', 'rear_and_side', 'full_access']],
      ['planning_profiles_defaultloadingrule_enum', ['lifo', 'fifo', 'flexible', 'manual']],
      ['planning_profiles_firstsolutionstrategy_enum', ['0', '15', '3', '4', '5', '10', '11', '13', '6', '7', '8', '14', '9', '16', '1', '2', '12']],
      ['planning_profiles_localsearchmetaheuristic_enum', ['0', '2']],
      ['trucks_loadingaccess_enum', ['rear_only', 'side_only', 'rear_and_side', 'full_access']],
      ['trucks_loadingrule_enum', ['lifo', 'fifo', 'flexible', 'manual']],
      ['truck_route_plans_feasibilitystatus_enum', ['feasible', 'warning', 'conflict', 'no_solution']],
      ['route_plan_stops_type_enum', ['pickup', 'delivery']],
      ['route_plan_stops_status_enum', ['pending', 'arrived', 'completed', 'skipped']],
      ['shipments_status_enum', ['planned', 'assigned', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled']],
    ];
    for (const [name, values] of enums) {
      const labels = values.map((v) => `'${v}'`).join(', ');
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN
            CREATE TYPE "${name}" AS ENUM (${labels});
          END IF;
        END $$;
      `);
    }

    // ---- trucks: planning columns (non-destructive) ----
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "truckType" character varying`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "euronorm" character varying`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "features" text`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "maxWeightKg" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "maxLdm" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "maxVolumeCbm" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "maxPallets" integer`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "costPerKm" numeric(10,2)`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "driverId" uuid`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "trailerId" uuid`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "loadingAccess" "trucks_loadingaccess_enum"`);
    await queryRunner.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "loadingRule" "trucks_loadingrule_enum"`);

    // ---- planning_profiles ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planning_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" character varying,
        "type" "planning_profiles_type_enum" NOT NULL DEFAULT 'standard_transport',
        "isDefault" boolean NOT NULL DEFAULT true,
        "isActive" boolean NOT NULL DEFAULT true,
        "weightHardConstraints" integer NOT NULL DEFAULT '100',
        "weightDeliveryWindows" integer NOT NULL DEFAULT '95',
        "weightPickupWindows" integer NOT NULL DEFAULT '90',
        "weightVehicleCapacity" integer NOT NULL DEFAULT '95',
        "weightDriverAvailability" integer NOT NULL DEFAULT '85',
        "weightTotalDistance" integer NOT NULL DEFAULT '70',
        "weightDrivingTime" integer NOT NULL DEFAULT '65',
        "weightWaitingTime" integer NOT NULL DEFAULT '60',
        "weightEmptyKilometers" integer NOT NULL DEFAULT '55',
        "weightTruckUtilization" integer NOT NULL DEFAULT '50',
        "weightHandlingTime" integer NOT NULL DEFAULT '45',
        "defaultLoadingAccess" "planning_profiles_defaultloadingaccess_enum" NOT NULL DEFAULT 'rear_only',
        "defaultLoadingRule" "planning_profiles_defaultloadingrule_enum" NOT NULL DEFAULT 'lifo',
        "optimizationTimeoutSeconds" integer NOT NULL DEFAULT '30',
        "firstSolutionStrategy" "planning_profiles_firstsolutionstrategy_enum" NOT NULL DEFAULT '15',
        "localSearchMetaheuristic" "planning_profiles_localsearchmetaheuristic_enum" NOT NULL DEFAULT '2',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        CONSTRAINT "UQ_2bf0df41a6a01bd4bfc963cdd04" UNIQUE ("name"),
        CONSTRAINT "PK_8e9b3b6b0e10a632ec9922e3bb8" PRIMARY KEY ("id")
      )
    `);

    // ---- planning_views ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planning_views" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "data" jsonb,
        "isDefault" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        "userId" uuid,
        CONSTRAINT "PK_8820e23fd04c3aef5f27e1cb39f" PRIMARY KEY ("id")
      )
    `);

    // ---- route_plan_stops ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "route_plan_stops" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "routePlanId" uuid NOT NULL,
        "orderId" uuid,
        "shipmentId" character varying,
        "type" "route_plan_stops_type_enum" NOT NULL,
        "sequence" integer NOT NULL,
        "locationId" character varying,
        "address" character varying,
        "companyName" character varying,
        "city" character varying,
        "country" character varying,
        "postalCode" character varying,
        "latitude" numeric(10,6),
        "longitude" numeric(10,6),
        "scheduledDate" date,
        "timeWindowStart" TIMESTAMP,
        "timeWindowEnd" TIMESTAMP,
        "timeWindowSoft" boolean NOT NULL DEFAULT false,
        "eta" TIMESTAMP,
        "etd" TIMESTAMP,
        "serviceDurationMinutes" integer NOT NULL DEFAULT '0',
        "pallets" numeric(10,2) NOT NULL DEFAULT '0',
        "weightKg" numeric(10,2) NOT NULL DEFAULT '0',
        "loadingMeters" numeric(10,2) NOT NULL DEFAULT '0',
        "volumeCbm" numeric(10,2) NOT NULL DEFAULT '0',
        "status" "route_plan_stops_status_enum" NOT NULL DEFAULT 'pending',
        "locked" boolean NOT NULL DEFAULT false,
        "lockedSequence" boolean NOT NULL DEFAULT false,
        "specialRequirements" character varying,
        "warnings" jsonb,
        "errors" jsonb,
        "cumulativePallets" numeric(10,2) NOT NULL DEFAULT '0',
        "cumulativeWeightKg" numeric(10,2) NOT NULL DEFAULT '0',
        "cumulativeLdm" numeric(10,2) NOT NULL DEFAULT '0',
        "cumulativeVolumeCbm" numeric(10,2) NOT NULL DEFAULT '0',
        "loadingSequence" integer,
        "loadingZone" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        CONSTRAINT "PK_7f5759602dc9b98f8152007723d" PRIMARY KEY ("id")
      )
    `);

    // ---- truck_route_plans ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "truck_route_plans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "truckId" uuid NOT NULL,
        "driverId" uuid,
        "tripId" uuid,
        "planningDate" date NOT NULL,
        "version" integer NOT NULL DEFAULT '1',
        "isCurrent" boolean NOT NULL DEFAULT false,
        "isOptimized" boolean NOT NULL DEFAULT false,
        "feasibilityStatus" "truck_route_plans_feasibilitystatus_enum" NOT NULL DEFAULT 'feasible',
        "totalDistanceKm" numeric(10,2) NOT NULL DEFAULT '0',
        "totalDrivingTimeMinutes" integer NOT NULL DEFAULT '0',
        "totalServiceTimeMinutes" integer NOT NULL DEFAULT '0',
        "totalWaitingTimeMinutes" integer NOT NULL DEFAULT '0',
        "totalDurationMinutes" integer NOT NULL DEFAULT '0',
        "optimizationScore" numeric(10,2) NOT NULL DEFAULT '0',
        "estimatedOperatingCost" numeric(10,2),
        "emptyKilometers" numeric(10,2),
        "loadedKilometers" numeric(10,2),
        "maxPallets" numeric(10,2) NOT NULL DEFAULT '0',
        "maxWeightKg" numeric(10,2) NOT NULL DEFAULT '0',
        "maxLdm" numeric(10,2) NOT NULL DEFAULT '0',
        "maxVolumeCbm" numeric(10,2) NOT NULL DEFAULT '0',
        "peakPallets" numeric(10,2) NOT NULL DEFAULT '0',
        "peakWeightKg" numeric(10,2) NOT NULL DEFAULT '0',
        "peakLdm" numeric(10,2) NOT NULL DEFAULT '0',
        "peakVolumeCbm" numeric(10,2) NOT NULL DEFAULT '0',
        "stopCount" integer NOT NULL DEFAULT '0',
        "pickupCount" integer NOT NULL DEFAULT '0',
        "deliveryCount" integer NOT NULL DEFAULT '0',
        "conflicts" jsonb,
        "warnings" jsonb,
        "optimizationMetadata" jsonb,
        "optimizedBy" character varying,
        "optimizedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        CONSTRAINT "PK_f94ea4211b3eba6151ae4488800" PRIMARY KEY ("id")
      )
    `);

    // ---- shipments ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "shipments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "orderId" character varying NOT NULL,
        "clientId" uuid,
        "truckRoutePlanId" uuid,
        "status" "shipments_status_enum" NOT NULL DEFAULT 'planned',
        "priority" integer NOT NULL DEFAULT '0',
        "pickupLocationId" character varying,
        "pickupAddress" character varying,
        "pickupCompanyName" character varying,
        "pickupCity" character varying,
        "pickupCountry" character varying,
        "pickupLatitude" numeric(10,6),
        "pickupLongitude" numeric(10,6),
        "pickupDate" date,
        "pickupTimeWindowStart" TIMESTAMP,
        "pickupTimeWindowEnd" TIMESTAMP,
        "pickupTimeWindowSoft" boolean NOT NULL DEFAULT false,
        "pickupDurationMinutes" integer NOT NULL DEFAULT '30',
        "deliveryLocationId" character varying,
        "deliveryAddress" character varying,
        "deliveryCompanyName" character varying,
        "deliveryCity" character varying,
        "deliveryCountry" character varying,
        "deliveryLatitude" numeric(10,6),
        "deliveryLongitude" numeric(10,6),
        "deliveryDate" date,
        "deliveryTimeWindowStart" TIMESTAMP,
        "deliveryTimeWindowEnd" TIMESTAMP,
        "deliveryTimeWindowSoft" boolean NOT NULL DEFAULT false,
        "deliveryDurationMinutes" integer NOT NULL DEFAULT '30',
        "pallets" numeric(10,2) NOT NULL DEFAULT '0',
        "weightKg" numeric(10,2) NOT NULL DEFAULT '0',
        "loadingMeters" numeric(10,2) NOT NULL DEFAULT '0',
        "volumeCbm" numeric(10,2) NOT NULL DEFAULT '0',
        "stackable" boolean NOT NULL DEFAULT true,
        "loadingRule" character varying,
        "unloadingRule" character varying,
        "specialHandling" character varying,
        "vehicleRequirements" jsonb,
        "driverRequirements" jsonb,
        "locked" boolean NOT NULL DEFAULT false,
        "reference" character varying,
        "notes" text,
        "pickupStopId" character varying,
        "deliveryStopId" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        CONSTRAINT "UQ_13ba957bcb616719a0dc3fca82f" UNIQUE ("orderId"),
        CONSTRAINT "PK_6deda4532ac542a93eab214b564" PRIMARY KEY ("id")
      )
    `);

    // ---- planning_actions ----
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "planning_actions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying NOT NULL,
        "undoData" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "companyId" uuid,
        "userId" uuid,
        CONSTRAINT "PK_966eb9b2bcc5e99c10a2a5a9fff" PRIMARY KEY ("id")
      )
    `);

    // ---- Indexes (idempotent, TypeORM-generated names) ----
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_337209f1644438c07fcc7ca788" ON "planning_views" ("name")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_582d79645698dd3667f1c97344" ON "route_plan_stops" ("shipmentId", "type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_8d9ddb7619805c9b8eef26bf44" ON "route_plan_stops" ("routePlanId", "sequence")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_9c5cbb5f138394272f141e0d01" ON "truck_route_plans" ("tripId", "version")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_a49b1e66638edb34d1357083f5" ON "truck_route_plans" ("truckId", "planningDate")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6a19baf6dd62cac42fbb40a518" ON "shipments" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_d81a7f476034e40eb3965ccf35" ON "shipments" ("truckRoutePlanId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_13ba957bcb616719a0dc3fca82" ON "shipments" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_0ed80dd583355c3667e025d28b" ON "planning_actions" ("action")`);

    // ---- Foreign keys (guarded, TypeORM-generated names) ----
    const fks: Array<[string, string, string, string, string, string]> = [
      ['planning_profiles', 'FK_89eae1673731a7df020ec7b50d5', 'companyId', 'companies', 'id', 'CASCADE'],
      ['planning_views', 'FK_494f4dc8a98769f241f18edc9a4', 'companyId', 'companies', 'id', 'CASCADE'],
      ['planning_views', 'FK_69ccf97327abcce56d854cd3af2', 'userId', 'users', 'id', 'CASCADE'],
      ['route_plan_stops', 'FK_058e120811a931b803c26521f06', 'companyId', 'companies', 'id', 'CASCADE'],
      ['route_plan_stops', 'FK_b3de9b963a4ccdbac7c3fb9a1bb', 'routePlanId', 'truck_route_plans', 'id', 'CASCADE'],
      ['route_plan_stops', 'FK_c1423c657b7dbdabfa89007f841', 'orderId', 'orders', 'id', 'SET NULL'],
      ['truck_route_plans', 'FK_af94429708fd1664ca3d651d95c', 'companyId', 'companies', 'id', 'CASCADE'],
      ['truck_route_plans', 'FK_866dfcc95d70b85db7751d2a585', 'truckId', 'trucks', 'id', 'CASCADE'],
      ['truck_route_plans', 'FK_7f4d79602aef9b574fc12e53e25', 'driverId', 'drivers', 'id', 'SET NULL'],
      ['truck_route_plans', 'FK_b71cf8caf6f6417a92de935d82b', 'tripId', 'trips', 'id', 'SET NULL'],
      ['shipments', 'FK_869de30ad520437528f5c46fc6c', 'companyId', 'companies', 'id', 'CASCADE'],
      ['shipments', 'FK_ac32e989bba954a3ab561f2467e', 'clientId', 'clients', 'id', 'SET NULL'],
      ['shipments', 'FK_d81a7f476034e40eb3965ccf35b', 'truckRoutePlanId', 'truck_route_plans', 'id', 'SET NULL'],
      ['planning_actions', 'FK_574e98ca20ce96c7485437e4cb3', 'companyId', 'companies', 'id', 'CASCADE'],
      ['planning_actions', 'FK_a3b2c3b39a1a26dbcb983e436a9', 'userId', 'users', 'id', 'CASCADE'],
    ];
    for (const [table, conName, col, refTable, refCol, onDelete] of fks) {
      await queryRunner.query(`
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${conName}')
             AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${refTable}') THEN
            ALTER TABLE "${table}" ADD CONSTRAINT "${conName}"
              FOREIGN KEY ("${col}") REFERENCES "${refTable}"("${refCol}") ON DELETE ${onDelete};
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "planning_views"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "planning_actions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "planning_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "shipments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "route_plan_stops"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "truck_route_plans"`);
  }
}
