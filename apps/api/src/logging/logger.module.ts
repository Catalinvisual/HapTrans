import { Module } from '@nestjs/common';
import { pinoHttp } from 'pino-http';
import pino from 'pino';

export const LOGGER = 'LOGGER';

/**
 * Structured logging (architecture §18/§29).
 * - pino structured JSON logs with timestamp, level, service, environment.
 * - Redacts passwords, tokens, secrets and other sensitive fields.
 * - Request ID is propagated (x-request-id).
 * - Sensitive information is never logged (redaction + limited serializers).
 */
export const loggerProvider = {
  provide: LOGGER,
  useFactory: () =>
    pino({
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      base: {
        service: 'hapcargo-api',
        env: process.env.NODE_ENV ?? 'development',
      },
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          'passwordHash',
          'token',
          'accessToken',
          'refreshToken',
          'secret',
          'apiKey',
          '*.password',
          '*.token',
          '*.secret',
          '*.apiKey',
        ],
        censor: '[REDACTED]',
      },
    }),
};

export const httpLoggerProvider = {
  provide: 'HTTP_LOGGER',
  inject: [LOGGER],
  useFactory: (logger: ReturnType<typeof pino>) =>
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
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
      autoLogging: true,
    }),
};

@Module({
  providers: [loggerProvider, httpLoggerProvider],
  exports: [LOGGER, 'HTTP_LOGGER'],
})
export class LoggerModule {}
