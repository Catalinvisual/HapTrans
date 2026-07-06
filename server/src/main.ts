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
  await app.listen(port, '0.0.0.0');
  // Seed admin user on first run
  const authService = app.get(AuthService);
  await authService.seedAdmin();
  console.log(`🚀 HapCargo Server running on http://localhost:${port}/api`);
}
bootstrap();
