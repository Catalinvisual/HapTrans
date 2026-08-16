import { MigrationInterface, QueryRunner } from 'typeorm';

export class TelematicsAndTachograph20260816110000 implements MigrationInterface {
  name = 'TelematicsAndTachograph20260816110000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. telematics_devices
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "telematics_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "truck_id" varchar,
        "provider" varchar(50) NOT NULL DEFAULT 'test_simulator',
        "provider_device_id" varchar(100),
        "external_vehicle_id" varchar(100),
        "device_type" varchar(50) NOT NULL DEFAULT 'OBD_FMS',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "connection_status" varchar(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
        "credentials_encrypted" text,
        "last_seen_at" TIMESTAMP WITH TIME ZONE,
        "last_latitude" double precision,
        "last_longitude" double precision,
        "last_speed" double precision,
        "last_heading" double precision,
        "last_odometer" double precision,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_telematics_devices" PRIMARY KEY ("id")
      );
    `);

    // 2. tachographs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tachographs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "truck_id" varchar,
        "telematics_device_id" varchar,
        "provider" varchar(50) NOT NULL DEFAULT 'test_simulator',
        "external_id" varchar(100),
        "brand" varchar(50) NOT NULL DEFAULT 'VDO',
        "model" varchar(50) NOT NULL DEFAULT 'DTCO 4.1b',
        "serial_number" varchar(100),
        "firmware_version" varchar(50) NOT NULL DEFAULT 'v4.1.02',
        "generation" varchar(30) NOT NULL DEFAULT 'GEN2_SMART_2',
        "status" varchar(20) NOT NULL DEFAULT 'active',
        "last_sync_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tachographs" PRIMARY KEY ("id")
      );
    `);

    // 3. driver_tachograph_cards
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_tachograph_cards" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "driver_id" varchar,
        "card_number" varchar(50) NOT NULL,
        "card_issuer" varchar(50) NOT NULL DEFAULT 'ARR / RDW',
        "issue_date" date,
        "expiry_date" date,
        "status" varchar(20) NOT NULL DEFAULT 'valid',
        "last_sync_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_driver_tachograph_cards" PRIMARY KEY ("id")
      );
    `);

    // 4. vehicle_live_state
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicle_live_state" (
        "truck_id" varchar NOT NULL,
        "driver_id" varchar,
        "trip_id" varchar,
        "latitude" double precision NOT NULL DEFAULT 51.5074,
        "longitude" double precision NOT NULL DEFAULT 0.1278,
        "speed" double precision NOT NULL DEFAULT 0,
        "heading" double precision NOT NULL DEFAULT 0,
        "odometer" double precision NOT NULL DEFAULT 0,
        "country" varchar(10) NOT NULL DEFAULT 'NL',
        "current_activity" varchar(30) NOT NULL DEFAULT 'REST',
        "connection_status" varchar(30) NOT NULL DEFAULT 'LIVE',
        "last_provider_update" TIMESTAMP WITH TIME ZONE,
        "last_haptrans_update" TIMESTAMP WITH TIME ZONE,
        "eta" TIMESTAMP WITH TIME ZONE,
        "eta_status" varchar(30) NOT NULL DEFAULT 'ON_TIME',
        "route_progress" double precision NOT NULL DEFAULT 0,
        "distance_remaining" double precision NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_vehicle_live_state" PRIMARY KEY ("truck_id")
      );
    `);

    // 5. tachograph_live_state
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tachograph_live_state" (
        "truck_id" varchar NOT NULL,
        "driver_id" varchar,
        "tachograph_id" varchar,
        "current_activity" varchar(30) NOT NULL DEFAULT 'REST',
        "driving_time_today" integer NOT NULL DEFAULT 0,
        "driving_time_remaining" integer NOT NULL DEFAULT 32400,
        "weekly_driving_time" integer NOT NULL DEFAULT 0,
        "weekly_driving_time_remaining" integer NOT NULL DEFAULT 201600,
        "break_time" integer NOT NULL DEFAULT 0,
        "break_required_in" integer NOT NULL DEFAULT 16200,
        "daily_rest_remaining" integer NOT NULL DEFAULT 39600,
        "working_time" integer NOT NULL DEFAULT 0,
        "availability_time" integer NOT NULL DEFAULT 0,
        "rest_time" integer NOT NULL DEFAULT 0,
        "speed" double precision NOT NULL DEFAULT 0,
        "odometer" double precision NOT NULL DEFAULT 0,
        "country" varchar(10) NOT NULL DEFAULT 'NL',
        "source" varchar(50) NOT NULL DEFAULT 'test_simulator',
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tachograph_live_state" PRIMARY KEY ("truck_id")
      );
    `);

    // 6. tachograph_activity_events
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tachograph_activity_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "truck_id" varchar,
        "driver_id" varchar,
        "trip_id" varchar,
        "activity" varchar(30) NOT NULL,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE,
        "duration" integer NOT NULL DEFAULT 0,
        "latitude" double precision,
        "longitude" double precision,
        "source" varchar(50) NOT NULL DEFAULT 'telematics_sync',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tachograph_activity_events" PRIMARY KEY ("id")
      );
    `);

    // Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_telematics_truck" ON "telematics_devices" ("truck_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tachographs_truck" ON "tachographs" ("truck_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_cards_driver" ON "driver_tachograph_cards" ("driver_id");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_tacho_events_truck_driver" ON "tachograph_activity_events" ("truck_id", "driver_id");`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tachograph_activity_events";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tachograph_live_state";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_live_state";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_tachograph_cards";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tachographs";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "telematics_devices";`);
  }
}
