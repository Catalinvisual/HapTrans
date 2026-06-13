import { NestFactory } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hapcargo.ro',
      'https://www.hapcargo.ro',
      'https://haptrans-production.up.railway.app',
      'https://joyfull-exploration-production.up.railway.app',
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

  // General rate limit for all other routes
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Serve uploaded files statically at /uploads prefix
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  // Seed admin user on first run
  const authService = app.get(AuthService);
  await authService.seedAdmin();
  console.log(`🚀 HapCargo Server running on http://localhost:${port}/api`);
}
bootstrap();
