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
  
    // PRE-SYNC MIGRATION TO PREVENT ENUM CAST CRASHES
  try {
    const dataSource = app.get(DataSource);
    
    // Cast enum columns to VARCHAR first to bypass Postgres enum constraints during updates
    await dataSource.query(`ALTER TABLE "orders" ALTER COLUMN "status" TYPE VARCHAR USING "status"::text`).catch(() => {});
    await dataSource.query(`ALTER TABLE "trips" ALTER COLUMN "status" TYPE VARCHAR USING "status"::text`).catch(() => {});
    await dataSource.query(`ALTER TABLE "stop_tasks" ALTER COLUMN "type" TYPE VARCHAR USING "type"::text`).catch(() => {});
    
    // Convert old OrderStatus to new OrderStatus
    await dataSource.query(`UPDATE "orders" SET "status" = 'draft' WHERE "status" = 'unassigned'`);
    await dataSource.query(`UPDATE "orders" SET "status" = 'in_transit' WHERE "status" = 'picked_up'`);
    await dataSource.query(`UPDATE "orders" SET "status" = 'closed' WHERE "status" = 'invoiced'`);
    
    // Convert old TripStatus to new TripStatus
    await dataSource.query(`UPDATE "trips" SET "status" = 'planning' WHERE "status" = 'planned' OR "status" = 'pending'`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'ready' WHERE "status" = 'confirmed'`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'driving' WHERE "status" = 'in_progress' OR "status" = 'problem' OR "status" = 'delayed'`);
    await dataSource.query(`UPDATE "trips" SET "status" = 'loading' WHERE "status" = 'unloading'`);

    // If there is any TaskType in stop_tasks with old values, update them too
    await dataSource.query(`UPDATE "stop_tasks" SET "type" = 'load' WHERE "type" = 'pickup'`).catch(() => {});
    await dataSource.query(`UPDATE "stop_tasks" SET "type" = 'unload' WHERE "type" = 'delivery'`).catch(() => {});

    // NOW run synchronize safely
    console.log('Running safe TypeORM synchronization...');
    await dataSource.synchronize();
    console.log('TypeORM synchronization completed successfully.');
  } catch (err) {
    console.error('Migration/Sync failed!', err);
  }

  await app.listen(port, '0.0.0.0');
  // Seed admin user on first run
  const authService = app.get(AuthService);
  await authService.seedAdmin();
  console.log(`🚀 HapCargo Server running on http://localhost:${port}/api`);
}
bootstrap();
