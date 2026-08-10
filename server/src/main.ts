import { NestFactory } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { join } from 'path';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
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
  
  // Serve uploaded files statically at /uploads prefix with basic protection
  app.use('/uploads', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Allow public access to the company logo for emails
    if (req.path === '/company-logo.png') {
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

    console.log('v7.0 raw SQL migration completed successfully!');

    // NOW run TypeORM synchronize to handle any remaining differences
    await dataSource.synchronize();
    console.log('TypeORM synchronization completed.');
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
