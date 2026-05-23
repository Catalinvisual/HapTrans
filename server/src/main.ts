import { NestFactory } from '@nestjs/core';
import { AuthService } from './auth/auth.service';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  app.useWebSocketAdapter(new IoAdapter(app));
  
  // Serve uploaded files statically at /uploads prefix
  app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  // Seed admin user on first run
  const authService = app.get(AuthService);
  await authService.seedAdmin();
  console.log(`🚀 HapTrans Server running on http://localhost:${port}/api`);
}
bootstrap();
