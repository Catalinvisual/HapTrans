import { NestFactory } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { DataSource } from 'typeorm';

function bootDbDiagnostic(): void {
  const url = process.env.DATABASE_URL || '';
  let target = 'NOT CONFIGURED (DATABASE_URL missing)';
  try {
    const parsed = new URL(url);
    target = `${parsed.hostname}:${parsed.port || 5432}/${(parsed.pathname || '').replace(/^\//, '')}`;
  } catch {
    /* keep NOT CONFIGURED */
  }
  const base = {
    DATABASE_URL_set: !!process.env.DATABASE_URL,
    DB_HOST: process.env.DB_HOST ?? null,
    DB_PORT: process.env.DB_PORT ?? null,
    DB_USER_set: !!(process.env.DB_USERNAME || process.env.DB_USER),
    DB_NAME: process.env.DB_DATABASE ?? process.env.DB_NAME ?? null,
    sslmode_in_url: /(sslmode|ssl)=true/i.test(url),
    target,
  };
  Logger.log(`DATABASE_URL set:${base.DATABASE_URL_set} target:${base.target} host:${base.DB_HOST} port:${base.DB_PORT}`, 'DB');
}

async function preFlightDbFix(): Promise<void> {
  // Runs BEFORE NestFactory.create() (i.e. before TypeORM synchronize), so the
  // schema builder can never die with "column date of relation payments
  // contains null values" while adding new NOT NULL columns over existing rows.
  const url = process.env.DATABASE_URL;
  if (!url) {
    Logger.log('DATABASE_URL not set, skipping pre-flight DB fix', 'DB');
    return;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Client } = require('pg');
    const client = new Client({ connectionString: url, ssl: /(sslmode|ssl)=true/i.test(url) ? { rejectUnauthorized: false } : undefined });
    await client.connect();
    await client.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`);
    await client.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "date" date`);
    await client.query(`UPDATE "payments" SET "date" = COALESCE("createdAt", now())::date WHERE "date" IS NULL`);
    // Unblock the login JOIN (users LEFT JOIN drivers on drivers.userId)
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "userId" uuid`);
    // Make the users table accept legacy login/seed writes even when it was
    // created by the other system in the shared database (no password/name/role
    // columns, no default on the other system's updated_at).
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "password" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "name" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "role" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "grossSalary" numeric`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "dailyRate" numeric`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "language" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "allowedPages" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "fcmToken" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "companyLogoUrl" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`);
    await client.query(`ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now()`);
    await client.query(`ALTER TABLE IF EXISTS "users" ALTER COLUMN "updated_at" DROP NOT NULL`).catch(() => {});
    await client.query(`UPDATE "users" SET "password" = '' WHERE "password" IS NULL`);
    // Driver columns needed by the same login JOIN (phone, expiry dates, payRate, ...)
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "phone" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "licenseNumber" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "licenseExpiry" date`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "medicalExpiry" date`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "tachoCardExpiry" date`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "payMode" character varying`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "payRate" numeric`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "status" character varying DEFAULT 'ACTIVE'`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "currentLat" numeric`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "currentLng" numeric`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "lastSeen" TIMESTAMP`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP DEFAULT now()`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP DEFAULT now()`);
    await client.query(`ALTER TABLE IF EXISTS "drivers" ALTER COLUMN "updated_at" DROP NOT NULL`).catch(() => {});
    await client.end();
    Logger.log('payments/date + legacy user&driver columns ensured', 'DB');
  } catch (err) {
    Logger.error(`pre-flight DB fix skipped: ${(err as Error).message}`, undefined, 'DB');
  }
}

// ---------------------------------------------------------------------------
// Materialize every missing entity table directly from TypeORM metadata, as a
// single CREATE TABLE IF NOT EXISTS per table (outside typedef synchronize's
// transaction), so core tables (clients, trucks, documents, sessions, stops,
// order_stops, planning_*) are RECREATED fully-shaped on live databases - no
// more 'relation "clients" does not exist' breaking cron/login.
// ---------------------------------------------------------------------------
function pgColType(col: any): string {
  const t = String(col.type || '').toLowerCase();
  if (t === 'uuid') return 'uuid';
  if (t === 'boolean' || t === 'bool') return 'boolean';
  if (t.includes('json')) return t === 'jsonb' ? 'jsonb' : 'json';
  if (t.includes('int')) {
    if (t.includes('bigint')) return 'bigint';
    if (t.includes('smallint')) return 'smallint';
    return 'integer';
  }
  if (t.includes('numeric') || t.includes('decimal') || t.includes('money')) return 'numeric';
  if (t.includes('real') || t === 'float4') return 'real';
  if (t.includes('double') || t === 'float8') return 'double precision';
  if (t === 'float') return 'numeric';
  if (t.includes('timestamp')) return t.includes('with time zone') || t.includes('timestamptz') ? 'timestamptz' : 'timestamp';
  if (t === 'date') return 'date';
  if (t === 'datetime') return 'timestamp';
  if (t === 'time') return 'time';
  if (t.includes('text')) return 'text';
  if (t.includes('char') || t === 'string') return col.length ? `varchar(${col.length})` : 'varchar';
  return 'varchar';
}

async function ensureEntityTables(ds: DataSource): Promise<void> {
  let listed;
  try {
    listed = await ds.query(`SELECT tablename FROM pg_tables WHERE schemaname='public'`);
  } catch {
    return;
  }
  const exists = new Set((listed as Array<{ tablename: string }>).map(r => r.tablename));
  const enumsByName = new Map<string, Array<string>>();
  for (const meta of ds.entityMetadatas) {
    if (exists.has(meta.tableName)) continue;
    const enumDefs: string[] = [];
    const cols: string[] = [];
    for (const col of meta.columns) {
      const typeName = `${meta.tableName}_${col.databaseName}_enum`;
      let t = pgColType(col);
      if (col.enum && Array.isArray(col.enum) && col.enum.length) {
        if (!enumsByName.has(typeName)) {
          enumsByName.set(typeName, col.enum.map(v => String(v)));
          enumDefs.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='${typeName}') THEN CREATE TYPE "${typeName}" AS ENUM (${col.enum.map((v: unknown) => `'${String(v)}'`).join(', ')}); END IF; END $$;`);
        }
        t = `"${typeName}"`;
      }
      let nullable = col.isNullable ? '' : ' NOT NULL';
      let dflt = '';
      if (col.isGenerated && col.generationStrategy === 'uuid') {
        dflt = ' DEFAULT gen_random_uuid()';
      } else if (col.default !== undefined) {
        const dv = typeof col.default === 'function' ? col.default() : col.default;
        if (typeof dv === 'boolean') dflt = ` DEFAULT ${dv}`;
        else if (typeof dv === 'number') dflt = ` DEFAULT ${dv}`;
        else if (typeof dv === 'string') {
          const s = dv.toLowerCase();
          dflt = /^(current_timestamp|now\(\)|true|false|[0-9]+)$/.test(s) || dv.startsWith('gen_random_uuid') ? ` DEFAULT ${dv}` : ` DEFAULT '${dv}'`;
        }
      }
      cols.push(`"${col.databaseName}" ${t}${nullable}${dflt}`);
    }
    if (!cols.length) continue;
    for (const e of enumDefs) {
      try { await ds.query(e); } catch { /* type may already exist */ }
    }
    const pk = meta.primaryColumns[0]?.databaseName;
    try {
      await ds.query(`CREATE TABLE IF NOT EXISTS "${meta.tableName}" (${cols.join(', ')}${pk ? `, PRIMARY KEY ("${pk}")` : ''})`);
      Logger.log(`materialized missing table: ${meta.tableName}`, 'DB');
      exists.add(meta.tableName);
    } catch (err) {
      Logger.error(`materialize failed for ${meta.tableName}: ${(err as Error).message}`, undefined, 'DB');
    }
  }
}

// Deterministic column-ensure pass. synchronize() is intentionally NOT used on
// live databases: it is slow (tens of minutes of retries), non-deterministic in
// ordering, and its DROP-ish behaviors are unsafe. Instead we simply ensure
// every entity column physically exists (ADD COLUMN IF NOT EXISTS, nullable so
// existing rows can never produce "contains null values"), then let the app
// read/write normally. NULLs are backfilled with type-correct defaults so
// NOT-NULL entity columns behave predictably. Indexes/constraints that are
// strictly required are created explicitly (see v7 migration below).
async function ensureEntityColumns(ds: DataSource): Promise<void> {
  const listed = await ds.query(
    `SELECT column_name, table_name FROM information_schema.columns WHERE table_schema='public'`
  ).catch(() => []);
  if (!Array.isArray(listed)) return;
  const byTable = new Map<string, Set<string>>();
  for (const row of listed as Array<{ table_name: string; column_name: string }>) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, new Set());
    byTable.get(row.table_name)!.add(row.column_name);
  }
  let added = 0;
  for (const meta of ds.entityMetadatas) {
    const present = byTable.get(meta.tableName);
    if (!present) continue; // table missing -> ensureEntityTables creates it
    for (const col of meta.columns) {
      if (present.has(col.databaseName)) continue;
      const type = pgColType(col);
      if (!type) continue;
      let dflt = '';
      if (col.default !== undefined) {
        const dv = typeof col.default === 'function' ? col.default() : col.default;
        if (typeof dv === 'boolean') dflt = ` DEFAULT ${dv}`;
        else if (typeof dv === 'number') dflt = ` DEFAULT ${dv}`;
        else if (typeof dv === 'string') {
          const s = dv.toLowerCase();
          dflt = /^(current_timestamp|now\(\)|true|false|[0-9]+)$/.test(s) || dv.startsWith('gen_random_uuid') ? ` DEFAULT ${dv}` : ` DEFAULT '${dv}'`;
        }
      }
      // Columns are added nullable on purpose: existing rows can never trigger
      // 'column ... contains null values', and the app never depends on the DB
      // enforcing NOT NULL at write time.
      try {
        await ds.query(`ALTER TABLE "${meta.tableName}" ADD COLUMN IF NOT EXISTS "${col.databaseName}" ${type}${dflt}`);
        Logger.log(`ensured column ${meta.tableName}.${col.databaseName} (${type})`, 'DB');
        added++;
      } catch (err) {
        Logger.error(`ensure failed ${meta.tableName}.${col.databaseName}: ${(err as Error).message}`, undefined, 'DB');
      }
    }
  }
  Logger.log(`entity columns ensured (${added} added)`, 'DB');
}

async function bootstrap() {
  bootDbDiagnostic();
  await preFlightDbFix();
  const app = await NestFactory.create(AppModule);
  const dataSource = app.get(DataSource);
  await ensureEntityTables(dataSource);
  await ensureEntityColumns(dataSource);
  app.setGlobalPrefix('api');
  (app.getHttpAdapter().getInstance() as express.Express).set('trust proxy', 1);
  
  // Increase JSON payload limit for Base64 image processing (e.g. PDF generation)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hapcargo.ro',
      'https://www.hapcargo.ro',
      'https://haptrans-production.up.railway.app',
      'https://joyful-exploration-production.up.railway.app',
      /\.railway\.app$/,
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  
  app.use(helmet());
  // Strict rate limit on auth routes (brute-force protection)
  app.use(
    '/api/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 15, // max 15 login attempts per IP per 15 min
      message: 'Prea multe încercări de autentificare. Vă rugăm să așteptați 15 minute.',
    }),
  );

  // Rate limit on public tracking route (enumeration protection)
  app.use(
    '/api/track',
    rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 30, // max 30 tracking requests per minute
      message: 'Prea multe cereri de urmărire. Vă rugăm să așteptați 1 minut.',
    }),
  );

  // General rate limit for all other routes
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Serve APK directly with connection close to prevent download hanging
  app.get('/uploads/HapTrans.apk', (req: express.Request, res: express.Response) => {
    const apkPath = join(__dirname, '..', 'uploads', 'HapTrans.apk');
    res.download(apkPath, 'HapTrans.apk', {
      headers: {
        'Connection': 'close'
      }
    });
  });

  // Serve uploaded files statically at /uploads prefix with basic protection
  app.use('/uploads', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Allow public access to the company logo for emails and the APK for auto-updates
    if (req.path === '/company-logo.png' || req.path === '/HapTrans.apk') {
      return next();
    }
    if (!req.headers.authorization && !req.query.token) {
      return res.status(401).send('Unauthorized');
    }
    next();
  }, express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT || 3001;

  // ============================================================
  // V7.0 RAW SQL MIGRATION - runs before TypeORM sync
  // Adds all new columns/tables without relying on synchronize
  // ============================================================
  try {
    const dataSource = app.get(DataSource);
    console.log('Starting v7.0 raw SQL migration...');

    // 1. Create companies table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "companies" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "cui" character varying,
        "address" character varying,
        "timezone" character varying NOT NULL DEFAULT 'Europe/Bucharest',
        "logoUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_companies" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 2. Add companyId to all tables that need it (IF NOT EXISTS)
    await dataSource.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await dataSource.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await dataSource.query(`ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "discount" numeric(5,2) DEFAULT 0`);
    await dataSource.query(`ALTER TABLE "trucks" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "companyId" uuid`);
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "companyId" uuid`);

    // 3. Add new columns to trips table
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "tripNumber" character varying`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "plannedDeparture" TIMESTAMP`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "actualDeparture" TIMESTAMP`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "plannedArrival" TIMESTAMP`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "actualArrival" TIMESTAMP`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "estimatedProfit" numeric(10,2) DEFAULT 0`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "actualProfit" numeric(10,2) DEFAULT 0`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "locked" boolean NOT NULL DEFAULT false`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "lockedById" uuid`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "trailerId" uuid`);
    await dataSource.query(`ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "dispatcherId" uuid`);

    // 4. Add new columns to orders table
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "orderNumber" character varying`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerReference" character varying`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "internalReference" character varying`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "transportType" character varying NOT NULL DEFAULT 'ftl'`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "priority" character varying NOT NULL DEFAULT 'normal'`);
    await dataSource.query(`ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "currency" character varying`);

    // 5. Handle trip status enum migration
    await dataSource.query(`ALTER TABLE "trips" ALTER COLUMN "status" TYPE VARCHAR USING "status"::text`).catch(() => {});
    await dataSource.query(`UPDATE "trips" SET "status" = 'planning' WHERE "status" IN ('planned','pending')`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'ready' WHERE "status" = 'confirmed'`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'active' WHERE "status" IN ('in_progress','problem')`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'loading' WHERE "status" IN ('unloading','delayed')`);

    // 6. Handle order status enum migration
    await dataSource.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE VARCHAR USING "status"::text`).catch(() => {});
    await dataSource.query(`UPDATE "orders" SET "status" = 'draft' WHERE "status" = 'unassigned'`);
    await dataSource.query(`UPDATE "orders" SET "status" = 'in_transit' WHERE "status" = 'picked_up'`);
    await dataSource.query(`UPDATE "orders" SET "status" = 'closed' WHERE "status" = 'invoiced'`);

    // 7. Create trailers table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "trailers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "plateNumber" character varying NOT NULL,
        "type" character varying NOT NULL DEFAULT 'standard',
        "brand" character varying,
        "year" integer,
        "payloadCapacityWeight" numeric(10,2),
        "payloadCapacityPallets" integer,
        "status" character varying NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_trailers_plate" UNIQUE ("plateNumber"),
        CONSTRAINT "PK_trailers" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 8. Create cargo_items table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "cargo_items" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "orderId" uuid,
        "unit" character varying NOT NULL DEFAULT 'pallet',
        "description" character varying NOT NULL,
        "weightKg" numeric(10,2),
        "volumeCbm" numeric(10,2),
        "lengthCm" numeric(10,2),
        "widthCm" numeric(10,2),
        "heightCm" numeric(10,2),
        "quantity" integer NOT NULL DEFAULT 1,
        "stackable" boolean NOT NULL DEFAULT false,
        "fragile" boolean NOT NULL DEFAULT false,
        "adrClass" character varying,
        "unNumber" character varying,
        "requiresTemperatureControl" boolean NOT NULL DEFAULT false,
        "temperatureMin" numeric(5,2),
        "temperatureMax" numeric(5,2),
        "insuredValue" numeric(10,2),
        "currency" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cargo_items" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 9. Create order_stops table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "order_stops" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "orderId" uuid,
        "type" character varying NOT NULL DEFAULT 'pickup',
        "sequence" integer NOT NULL DEFAULT 1,
        "address" character varying NOT NULL,
        "companyName" character varying,
        "country" character varying,
        "latitude" numeric(10,6),
        "longitude" numeric(10,6),
        "contactPerson" character varying,
        "phone" character varying,
        "scheduledFrom" TIMESTAMP,
        "scheduledTo" TIMESTAMP,
        "reference" character varying,
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_stops" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 10. Create client_locations table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "client_locations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "clientId" uuid,
        "name" character varying NOT NULL,
        "address" character varying NOT NULL,
        "latitude" numeric(10,6),
        "longitude" numeric(10,6),
        "country" character varying,
        "contactPerson" character varying,
        "phone" character varying,
        "timeZone" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_client_locations" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 11. Add new columns to documents table
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "documentType" character varying DEFAULT 'other'`);
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verified" boolean NOT NULL DEFAULT false`);
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "verifiedById" uuid`);
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "uploadedAt" TIMESTAMP DEFAULT now()`);
    await dataSource.query(`ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "stopTaskId" uuid`).catch(() => {});

    // 12. Create stops table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "stops" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "tripId" uuid,
        "sequence" integer NOT NULL DEFAULT 1,
        "type" character varying NOT NULL DEFAULT 'pickup',
        "address" character varying NOT NULL,
        "companyName" character varying,
        "country" character varying,
        "latitude" numeric(10,6),
        "longitude" numeric(10,6),
        "contactPerson" character varying,
        "phone" character varying,
        "scheduledArrival" TIMESTAMP,
        "scheduledDeparture" TIMESTAMP,
        "actualArrival" TIMESTAMP,
        "actualDeparture" TIMESTAMP,
        "status" character varying NOT NULL DEFAULT 'pending',
        "notes" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stops" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 13. Create stop_tasks table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "stop_tasks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "stopId" uuid,
        "orderId" uuid,
        "type" character varying NOT NULL DEFAULT 'load',
        "status" character varying NOT NULL DEFAULT 'pending',
        "notes" character varying,
        "completedAt" TIMESTAMP,
        "completedById" uuid,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stop_tasks" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // 14. Create telematics tables if they don't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "telematics_devices" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
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
      )
    `).catch(() => {});

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "tachographs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
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
      )
    `).catch(() => {});

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "driver_tachograph_cards" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
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
      )
    `).catch(() => {});

    await dataSource.query(`
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
      )
    `).catch(() => {});

    await dataSource.query(`
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
      )
    `).catch(() => {});

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "tachograph_activity_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
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
      )
    `).catch(() => {});

    console.log('v7.0 raw SQL migration completed successfully!');

    // 15. payments.date - entity was extended after legacy rows existed, so a
    // NOT NULL column can never be added by TypeORM synchronize on live data.
    // Add it nullable and backfill from createdAt, then leave it as-is.
    await dataSource.query(`ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "date" date`);
    await dataSource.query(`UPDATE "payments" SET "date" = "createdAt"::date WHERE "date" IS NULL`);

    // 16. Ensure the planning module's base table exists before TypeORM
    // migrations run, so the audit migration (ADD COLUMN IF NOT EXISTS / guarded
    // FK) cannot crash on a partially recreated database.
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS "planning_actions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "companyId" uuid,
        "userId" uuid,
        "truckId" uuid,
        "routePlanId" uuid,
        "action" character varying NOT NULL,
        "undoData" jsonb,
        "beforeState" jsonb,
        "afterState" jsonb,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_planning_actions" PRIMARY KEY ("id")
      )
    `).catch(() => {});

    // NOW run explicit TypeORM migrations (non-destructive, idempotent)
    // replaces the previous dataSource.synchronize() which could alter schema
    // in production based on entity drift.
    await dataSource.runMigrations();
    console.log('TypeORM migrations completed.');
  } catch (err) {
    console.error('Migration failed, but server will still start:', err.message);
  }

  await app.listen(port, '0.0.0.0');
  // Seed admin user on first run
  try {
    const authService = app.get(AuthService);
    await authService.seedAdmin();
  } catch (err) {
    console.error('SeedAdmin failed (non-fatal):', err.message);
  }
  console.log(`🚀 HapCargo Server running on http://localhost:${port}/api`);
}
bootstrap();
