import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const env = loadEnv(process.env);

  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix('api/v1', { exclude: ['health', 'ready'] });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(cookieParser());

  app.enableCors({
    origin: [env.WEB_PUBLIC_URL],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const logger = pino({
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    base: { service: 'hapcargo-api', env: env.NODE_ENV },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'password', 'token', 'secret'],
      censor: '[REDACTED]',
    },
  });
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => {
        const header = req.headers['x-request-id'];
        return (Array.isArray(header) ? header[0] : header) ?? `req_${Date.now()}`;
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swagger = new DocumentBuilder()
    .setTitle('HAP CARGO TMS API')
    .setDescription('Transport Management System — REST API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);

  const port = env.PORT ?? 4000;
  await app.listen(port);
  Logger.log(`HAP CARGO API listening on ${env.API_PUBLIC_URL} (port ${port})`);
  Logger.log(`Swagger UI at ${env.API_PUBLIC_URL}/docs`);
}

void bootstrap();
